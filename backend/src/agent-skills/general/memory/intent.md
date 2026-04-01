---
id: memory
structureType: unknown
zhName: 记忆
enName: Memory
zhDescription: 在会话内管理上下文记忆，支持存储、检索和清除对话历史与中间状态。
enDescription: Manage in-session context memory — store, retrieve, and clear conversation history and intermediate state.
triggers: []
stages: ["intent", "draft", "analysis", "design"]
autoLoadByDefault: false
domain: general
requires: []
conflicts: []
capabilities: ["context-store", "context-retrieve", "context-clear"]
priority: 10
skillCategory: utility
safetyLevel: read-write-local
sandboxRules: ["max_entries:200", "max_entry_size_bytes:8192", "session_scoped_only:true"]
---

## Purpose

The memory skill provides structured context management within a single agent session.
It allows the orchestrator and domain skills to persist intermediate values (e.g., extracted parameters, user preferences, partial model state) and retrieve them across multiple pipeline stages.

## Capabilities

- **context-store**: Write a key-value pair to session-scoped memory.
- **context-retrieve**: Read a value by key from session-scoped memory.
- **context-clear**: Remove one or all entries from session-scoped memory.

## Boundaries

- Memory is session-scoped: entries do not persist beyond the current conversation (30-minute TTL).
- Maximum 200 entries per session; each entry capped at 8 KiB.
- No cross-session access; no filesystem or database writes.
- Memory contents are never sent to external services; they remain within the runtime process.
