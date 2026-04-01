# General Skills

Purpose:
- Memory and planning helpers
- File read/write and replace utilities
- Basic shell command capabilities

## Skill Inventory

| Skill | Safety Level | Capabilities | Depends On |
|-------|-------------|-------------|------------|
| memory | read-write-local | context-store, context-retrieve, context-clear | — |
| planning | read-only | task-decompose, step-sequence, condition-gate | — |
| read-file | read-only | file-read-text, file-read-json, file-list-dir | — |
| write-file | read-write-local | file-write-text, file-write-json | — |
| replace | read-write-local | text-replace, json-patch | read-file, write-file |
| shell | restricted-exec | shell-exec | — |

## Safety Levels

- **read-only**: No writes, no side effects.
- **read-write-local**: Writes to session-scoped or sandbox-scoped storage only.
- **restricted-exec**: External process execution within a strict whitelist.

## Composition with Domain Skills

Utility skills are stage-agnostic helpers that domain skills may invoke during orchestration.
See `docs/schema/utility-skills.md` for the full specification.
