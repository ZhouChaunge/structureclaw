---
id: replace
structureType: unknown
zhName: 替换
enName: Replace
zhDescription: 在沙箱范围内对文件内容执行精确文本替换操作。
enDescription: Perform exact text replacement operations on file contents within the sandbox scope.
triggers: []
stages: ["intent"]
autoLoadByDefault: false
domain: general
requires: ["read-file", "write-file"]
conflicts: []
capabilities: ["text-replace", "json-patch"]
priority: 10
skillCategory: utility
safetyLevel: read-write-local
sandboxRules: ["allowed_roots:.runtime/workspace", "max_file_size_bytes:2097152", "max_replacements_per_call:50", "deny_patterns:**/.env,**/*.key,**/*.pem,**/secrets/**"]
---

## Purpose

The replace skill provides targeted content modification for workspace files.
It combines read-file and write-file capabilities into an atomic read-modify-write operation, ensuring the file is not left in an inconsistent state.

## Capabilities

- **text-replace**: Find and replace exact text occurrences in a file.
- **json-patch**: Apply a JSON merge-patch (RFC 7396) to a JSON file.

## Boundaries

- Inherits the same sandbox restrictions as read-file and write-file.
- Maximum 50 replacement operations per call.
- All replacements are exact-match (no regex) to avoid unintended mutations.
- The original file is read, modified in memory, and written back atomically.
- Requires both `read-file` and `write-file` skills to be loaded.
