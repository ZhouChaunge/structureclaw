---
id: read-file
structureType: unknown
zhName: 读文件
enName: Read File
zhDescription: 在沙箱范围内读取指定文件的内容，支持文本和结构化格式。
enDescription: Read file contents within the sandbox scope, supporting text and structured formats.
triggers: []
stages: ["intent", "draft", "analysis"]
autoLoadByDefault: false
domain: general
requires: []
conflicts: []
capabilities: ["file-read-text", "file-read-json", "file-list-dir"]
priority: 10
skillCategory: utility
safetyLevel: read-only
sandboxRules: ["allowed_roots:.runtime/workspace,.runtime/uploads", "max_file_size_bytes:2097152", "deny_patterns:**/.env,**/*.key,**/*.pem,**/secrets/**"]
---

## Purpose

The read-file skill provides controlled read access to workspace files.
Domain skills and the orchestrator use it to load user-uploaded models, configuration files, or intermediate outputs produced by earlier pipeline stages.

## Capabilities

- **file-read-text**: Read a file as UTF-8 text.
- **file-read-json**: Read and parse a JSON file, returning the parsed object.
- **file-list-dir**: List entries in a directory (names and types only, no recursion by default).

## Boundaries

- Access is restricted to `.runtime/workspace/` and `.runtime/uploads/` directories.
- Maximum file size: 2 MiB per read operation.
- Denied patterns: `.env`, `*.key`, `*.pem`, `secrets/` — these are never readable.
- No writes, no deletions, no permission changes.
- Symbolic links are not followed.
