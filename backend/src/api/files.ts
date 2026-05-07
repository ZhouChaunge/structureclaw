import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { config, runtimeBaseDir } from '../config/index.js';

const RUNTIME_DIR = path.resolve(config.reportsDir, '..');

const UPLOAD_DIR = path.join(runtimeBaseDir, '.uploads');

const SERVE_MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

/** Allowed MIME types for upload (whitelist). */
const UPLOAD_MIME_WHITELIST = new Set([
  'application/pdf',
  'text/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'application/octet-stream', // DXF / generic binary
  'image/vnd.dxf',
  'application/dxf',
]);

/** Allowed file extensions for upload (whitelist). */
const UPLOAD_EXT_WHITELIST = new Set([
  '.pdf', '.csv', '.txt',
  '.xls', '.xlsx',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp',
  '.dxf',
]);

const UPLOAD_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export interface UploadedFileMetadata {
  fileId: string;
  originalName: string;
  storedPath: string;
  relPath: string;
  size: number;
  mimeType: string;
  sha256: string;
  conversationId: string;
  uploadedAt: string;
}

/** Validate path is inside UPLOAD_DIR to prevent traversal. */
function safeUploadResolve(conversationId: string, filename: string): string {
  // Sanitize: strip any path separators and keep only the base name
  const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._\-\u4e00-\u9fa5]/g, '_');
  const resolved = path.resolve(UPLOAD_DIR, conversationId, safeName);
  const prefix = path.resolve(UPLOAD_DIR);
  if (!resolved.startsWith(prefix + path.sep) && resolved !== prefix) {
    throw new Error('Path traversal blocked');
  }
  return resolved;
}

export async function fileRoutes(fastify: FastifyInstance) {
  // ── GET /serve — serve a stored file by path ──────────────────────────────
  fastify.get('/serve', async (req: FastifyRequest, reply: FastifyReply) => {
    const rawPath = (req.query as Record<string, string>).path;
    if (!rawPath || typeof rawPath !== 'string') {
      return reply.status(400).send({ error: 'Missing path query parameter' });
    }

    const resolved = path.resolve(rawPath);
    if (!resolved.startsWith(RUNTIME_DIR)) {
      return reply.status(403).send({ error: 'Access denied: path outside runtime directory' });
    }

    if (!fs.existsSync(resolved)) {
      return reply.status(404).send({ error: 'File not found' });
    }

    const ext = path.extname(resolved).toLowerCase();
    const mime = SERVE_MIME_MAP[ext];
    if (!mime) {
      return reply.status(415).send({ error: `Unsupported file type: ${ext}` });
    }

    const stat = fs.statSync(resolved);
    reply.header('Content-Type', mime);
    reply.header('Content-Length', stat.size);
    reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(path.basename(resolved))}"`);

    const stream = fs.createReadStream(resolved);
    return reply.send(stream);
  });

  // ── POST /upload — multipart file upload ──────────────────────────────────
  fastify.post('/upload', async (req: FastifyRequest, reply: FastifyReply) => {
    const conversationId = (req.query as Record<string, string>).conversationId;
    if (!conversationId || typeof conversationId !== 'string' || !/^[a-zA-Z0-9\-_]{1,128}$/.test(conversationId)) {
      return reply.status(400).send({ error: 'Invalid or missing conversationId query parameter' });
    }

    // @fastify/multipart must be registered on the fastify instance
    if (typeof (req as any).parts !== 'function') {
      return reply.status(500).send({ error: 'Multipart plugin not registered' });
    }

    const uploadedFiles: UploadedFileMetadata[] = [];
    const errors: Array<{ name: string; error: string }> = [];

    const conversationUploadDir = path.join(UPLOAD_DIR, conversationId);
    await fsp.mkdir(conversationUploadDir, { recursive: true });

    const parts = (req as any).parts({ limits: { fileSize: UPLOAD_MAX_BYTES } });

    for await (const part of parts) {
      if (part.type !== 'file') continue;

      const originalName = part.filename || 'upload';
      const ext = path.extname(originalName).toLowerCase();

      if (!UPLOAD_EXT_WHITELIST.has(ext)) {
        // Drain the stream to prevent hang
        for await (const _chunk of part.file) { /* drain */ }
        errors.push({ name: originalName, error: `File extension not allowed: ${ext}` });
        continue;
      }

      const mimeType: string = part.mimetype || 'application/octet-stream';
      const fileId = crypto.randomUUID();
      const storedName = `${fileId}${ext}`;
      const storedPath = path.join(conversationUploadDir, storedName);
      const relPath = path.join('.uploads', conversationId, storedName).replace(/\\/g, '/');

      const chunks: Buffer[] = [];
      let totalSize = 0;
      let sizeExceeded = false;

      try {
        for await (const chunk of part.file) {
          totalSize += (chunk as Buffer).length;
          if (totalSize > UPLOAD_MAX_BYTES) {
            sizeExceeded = true;
            // Drain remaining
            for await (const _rest of part.file) { /* drain */ }
            break;
          }
          chunks.push(chunk as Buffer);
        }

        if (sizeExceeded) {
          errors.push({ name: originalName, error: 'File exceeds 50 MB limit' });
          continue;
        }

        const buffer = Buffer.concat(chunks);
        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

        await fsp.writeFile(storedPath, buffer);

        uploadedFiles.push({
          fileId,
          originalName,
          storedPath,
          relPath,
          size: totalSize,
          mimeType,
          sha256,
          conversationId,
          uploadedAt: new Date().toISOString(),
        });
      } catch (err) {
        errors.push({ name: originalName, error: String(err) });
      }
    }

    if (uploadedFiles.length === 0 && errors.length > 0) {
      return reply.status(400).send({ success: false, errors });
    }

    return reply.send({
      success: true,
      files: uploadedFiles.map((f) => ({
        fileId: f.fileId,
        originalName: f.originalName,
        relPath: f.relPath,
        size: f.size,
        mimeType: f.mimeType,
        sha256: f.sha256,
        uploadedAt: f.uploadedAt,
      })),
      errors: errors.length > 0 ? errors : undefined,
    });
  });
}
