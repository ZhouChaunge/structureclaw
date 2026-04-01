# Utility Skill Definitions

## 1. Overview

Utility skills are general-purpose, domain-agnostic helpers that support the agent's orchestration pipeline. Unlike domain skills (structure-type, analysis, code-check, etc.), utility skills do not participate in domain-specific routing; instead, they provide foundational capabilities such as memory, planning, file I/O, content replacement, and shell execution.

All utility skills live under `backend/src/agent-skills/general/`. Each skill has an `intent.md` declaring its metadata, safety level, and capability boundaries, following the same front-matter convention used by analysis and structure-type skills.

Type definitions, sandbox defaults, and composition helpers are centralized in `backend/src/agent-skills/general/utility-skill-definitions.ts`.

## 2. Baseline Skill Set

| Skill ID | Safety Level | Capabilities | Dependencies |
|----------|-------------|-------------|-------------|
| `memory` | read-write-local | context-store, context-retrieve, context-clear | — |
| `planning` | read-only | task-decompose, step-sequence, condition-gate | — |
| `read-file` | read-only | file-read-text, file-read-json, file-list-dir | — |
| `write-file` | read-write-local | file-write-text, file-write-json | — |
| `replace` | read-write-local | text-replace, json-patch | read-file, write-file |
| `shell` | restricted-exec | shell-exec | — |

### 2.1 memory

Stores, retrieves, and clears key-value context entries scoped to a single agent session. Useful for carrying intermediate results between pipeline stages.

- **Session-scoped only**: entries do not persist beyond the current session.
- **Limits**: ≤ 200 entries, ≤ 8 KiB per entry.

### 2.2 planning

Decomposes user intent into ordered step sequences and conditional gates. Read-only — no side effects, no writes.

- **Maximum depth**: 10 levels of nested sub-plans.
- **Maximum steps**: 50 steps per plan.

### 2.3 read-file

Reads text and JSON files or lists directories within the sandboxed workspace.

- **Allowed roots**: `.runtime/workspace`, `.runtime/uploads`.
- **Denied patterns**: `.env`, `*.key`, `*.pem`, `secrets/**`.
- **Max file size**: 2 MiB per read.

### 2.4 write-file

Writes text or JSON files into the sandboxed workspace.

- **Allowed root**: `.runtime/workspace` only (no uploads).
- **Denied patterns**: same as read-file.
- **Max file size**: 2 MiB per write.
- **Max files per call**: 10.

### 2.5 replace

Performs text replacements or JSON patches on existing files. Depends on read-file and write-file for the underlying I/O.

- **Max replacements per call**: 50.
- **Match mode**: exact match only (no regex).

### 2.6 shell

Executes external commands in a restricted sandbox. Designed for structural analysis engine invocations.

- **Whitelisted commands**: `python`, `python3`, `opensees`, `OpenSees`.
- **Blocked commands**: `rm`, `del`, `mv`, `cp`, `ln`, `format`, `mkfs`, `sudo`, `su`, `chmod`, `chown`, `curl`, `wget`, `ssh`, `nc`, `ncat`.
- **Blocked arguments**: `--recursive`, `--force`, `-rf`.
- **Working directory**: locked to `.runtime/workspace`.
- **Timeout**: 5 minutes.
- **Output cap**: 1 MiB combined stdout + stderr.

## 3. Safety Boundaries

### 3.1 Safety Levels

Utility skills are classified into three safety levels:

| Level | Description | Allowed Operations |
|-------|------------|-------------------|
| `read-only` | No writes, no side effects | Read files, list directories, decompose plans |
| `read-write-local` | Writes to session or sandbox storage | Write files, store/clear memory entries |
| `restricted-exec` | External process execution | Invoke whitelisted executables only |

Safety level escalation is not permitted. A `read-only` skill cannot acquire write capabilities at runtime.

### 3.2 Sandbox Rules

Each skill type has a corresponding sandbox rule interface and a set of compiled defaults:

| Sandbox | Interface | Default Constant |
|---------|-----------|-----------------|
| File read | `FileSandboxRules` | `DEFAULT_FILE_SANDBOX` |
| File write | `FileSandboxRules` | `DEFAULT_WRITE_FILE_SANDBOX` |
| Shell execution | `ShellSandboxRules` | `DEFAULT_SHELL_SANDBOX` |
| Memory | `MemorySandboxRules` | `DEFAULT_MEMORY_SANDBOX` |
| Planning | `PlanningSandboxRules` | `DEFAULT_PLANNING_SANDBOX` |

**Invariant**: sandbox defaults may be tightened in future releases but must never be loosened without a corresponding security review.

### 3.3 Enforcement Points

Sandbox rules are enforced at the skill invocation boundary, before the skill handler executes. Violations are rejected with structured error payloads containing the skill ID, attempted operation, and violated rule.

## 4. Composition with Domain Skills

### 4.1 Stage-Based Reusability

Utility skills are available in specific pipeline stages. They are invoked by domain skills or by the orchestrator, not by the user directly.

The pipeline stages referenced in the composition model:

| Stage | Description |
|-------|------------|
| `intent` | User intent parsing and disambiguation |
| `draft` | Initial structural model generation |
| `analysis` | Engine-based structural analysis |
| `design` | Design optimization and detailing |

### 4.2 Stage Mapping

| Skill | intent | draft | analysis | design |
|-------|--------|-------|----------|--------|
| memory | ✓ | ✓ | ✓ | ✓ |
| planning | ✓ | ✓ | — | — |
| read-file | ✓ | ✓ | ✓ | — |
| write-file | — | — | ✓ | — |
| replace | — | ✓ | ✓ | — |
| shell | — | — | ✓ | — |

Key observations:

- **memory** is the only skill available across all stages, since context carriage is universally needed.
- **planning** is restricted to early stages (intent, draft) where decomposition matters.
- **shell** is restricted to the analysis stage, since only analysis engines require external process execution.
- **write-file** is restricted to the analysis stage to prevent unintended side effects in other stages.

### 4.3 Composition Helpers

Two helper functions are exported from `utility-skill-definitions.ts`:

```typescript
// Check if a specific utility skill is allowed in a given stage
isUtilitySkillAllowedInStage(skillId: string, stage: string): boolean

// List all utility skills available at a given stage
listUtilitySkillsForStage(stage: string): UtilitySkillDescriptor[]
```

Domain skills and the orchestrator use these helpers to determine which utility skills are available before invoking them.

### 4.4 Dependency Resolution

The standard `requires` / `conflicts` mechanism from `SkillPackageMetadata` applies to utility skills as well.

Currently, only `replace` declares dependencies (`requires: ['read-file', 'write-file']`). If either dependency is missing or disabled, the replace skill cannot load.

## 5. Related Docs

- Skill loading mechanism: `docs/schema/skill-loading.md`
- Skill loading mechanism (Chinese): `docs/schema/skill-loading_CN.md`
- Utility skills (Chinese): `docs/schema/utility-skills_CN.md`
- Protocol reference: `docs/reference.md`
