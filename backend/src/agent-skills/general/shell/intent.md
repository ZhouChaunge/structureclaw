---
id: shell
structureType: unknown
zhName: 命令执行
enName: Shell
zhDescription: 在受控沙箱中执行预审批的命令行操作，支持结构分析引擎调用等场景。
enDescription: Execute pre-approved command-line operations in a controlled sandbox, supporting scenarios such as analysis engine invocation.
triggers: []
stages: ["intent"]
autoLoadByDefault: false
domain: general
requires: []
conflicts: []
capabilities: ["shell-exec"]
priority: 10
skillCategory: utility
safetyLevel: restricted-exec
sandboxRules: ["allowed_commands:python,python3,opensees,OpenSees", "allowed_cwd:.runtime/workspace", "max_timeout_ms:300000", "deny_commands:rm,del,format,mkfs,sudo,su,chmod,chown,curl,wget,ssh,nc,ncat", "deny_args:--recursive,--force,-rf", "max_output_bytes:1048576"]
---

## Purpose

The shell skill provides controlled command execution for scenarios that require external process invocation — primarily analysis engine runs (OpenSees, Python scripts) and post-processing tools.

## Capabilities

- **shell-exec**: Run a single command with arguments, capture stdout/stderr, and return the exit code.

## Boundaries

- **Allowed commands (whitelist)**: `python`, `python3`, `opensees`, `OpenSees` only.
- **Working directory**: Locked to `.runtime/workspace/`.
- **Timeout**: Maximum 300 seconds (5 minutes) per execution.
- **Denied commands (blocklist)**: `rm`, `del`, `format`, `mkfs`, `sudo`, `su`, `chmod`, `chown`, `curl`, `wget`, `ssh`, `nc`, `ncat` — blocked unconditionally.
- **Denied arguments**: `--recursive`, `--force`, `-rf` — blocked to prevent destructive operations.
- **Output capture**: Maximum 1 MiB of combined stdout + stderr.
- No background processes; no shell pipes or redirections; no environment variable injection.
- Process runs with the same user as the backend service (no privilege escalation).
