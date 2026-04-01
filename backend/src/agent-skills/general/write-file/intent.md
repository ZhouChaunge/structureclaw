---
id: write-file
structureType: unknown
zhName: 写文件
enName: Write File
zhDescription: 在沙箱范围内创建或覆写指定文件，支持文本和 JSON 输出。
enDescription: Create or overwrite files within the sandbox scope, supporting text and JSON output.
triggers: []
stages: ["analysis"]
autoLoadByDefault: false
domain: general
requires: []
conflicts: []
capabilities: ["file-write-text", "file-write-json"]
priority: 10
skillCategory: utility
safetyLevel: read-write-local
sandboxRules: ["allowed_roots:.runtime/workspace", "max_file_size_bytes:2097152", "max_files_per_call:10", "deny_patterns:**/.env,**/*.key,**/*.pem,**/secrets/**"]
---

## Purpose

The write-file skill provides controlled write access to workspace files.
It is used to persist pipeline outputs such as converted models, analysis results, or exported reports to disk.

## Capabilities

- **file-write-text**: Write a UTF-8 string to a file (create or overwrite).
- **file-write-json**: Serialize an object to JSON and write to a file.

## Boundaries

- Write access is restricted to `.runtime/workspace/` only (uploads directory is read-only).
- Maximum file size: 2 MiB per write operation; maximum 10 files per call.
- Denied patterns: `.env`, `*.key`, `*.pem`, `secrets/` — these paths are never writable.
- Cannot delete files, create symbolic links, or change permissions.
- Parent directories are created automatically if they do not exist.
