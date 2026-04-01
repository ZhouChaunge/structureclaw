# 通用工具技能定义

## 1. 概述

通用工具技能是领域无关的辅助能力，用于支撑 Agent 编排流水线的运行。与领域技能（如 structure-type、analysis、code-check 等）不同，工具技能不参与领域路由，而是提供基础功能：内存管理、任务规划、文件读写、内容替换和受限命令执行。

所有工具技能位于 `backend/src/agent-skills/general/` 目录下。每个技能都有一个 `intent.md` 文件声明元数据、安全等级和能力边界，遵循与分析技能和结构类型技能相同的 front-matter 约定。

类型定义、沙箱默认值和组合辅助函数集中在 `backend/src/agent-skills/general/utility-skill-definitions.ts` 中。

## 2. 基线技能集

| 技能 ID | 安全等级 | 能力 | 依赖 |
|---------|---------|------|------|
| `memory` | read-write-local | context-store, context-retrieve, context-clear | — |
| `planning` | read-only | task-decompose, step-sequence, condition-gate | — |
| `read-file` | read-only | file-read-text, file-read-json, file-list-dir | — |
| `write-file` | read-write-local | file-write-text, file-write-json | — |
| `replace` | read-write-local | text-replace, json-patch | read-file, write-file |
| `shell` | restricted-exec | shell-exec | — |

### 2.1 memory（内存）

在单次 Agent 会话范围内存储、检索和清除键值对上下文。用于在流水线各阶段之间传递中间结果。

- **仅限会话范围**：会话结束后条目不会持久化。
- **限制**：≤ 200 条目，单条 ≤ 8 KiB。

### 2.2 planning（规划）

将用户意图分解为有序步骤序列和条件门控。只读 — 无副作用，无写入操作。

- **最大嵌套深度**：10 层。
- **最大步骤数**：每个计划 50 步。

### 2.3 read-file（文件读取）

在沙箱化工作区中读取文本和 JSON 文件或列出目录内容。

- **允许的根目录**：`.runtime/workspace`、`.runtime/uploads`。
- **拒绝的模式**：`.env`、`*.key`、`*.pem`、`secrets/**`。
- **单次最大文件大小**：2 MiB。

### 2.4 write-file（文件写入）

向沙箱化工作区写入文本或 JSON 文件。

- **允许的根目录**：仅 `.runtime/workspace`（不允许 uploads）。
- **拒绝的模式**：与 read-file 相同。
- **单次最大文件大小**：2 MiB。
- **单次最大写入文件数**：10 个。

### 2.5 replace（内容替换）

对现有文件执行文本替换或 JSON 补丁操作。依赖 read-file 和 write-file 提供底层 I/O。

- **单次最大替换数**：50 次。
- **匹配模式**：仅精确匹配（不支持正则表达式）。

### 2.6 shell（命令执行）

在受限沙箱中执行外部命令。专为结构分析引擎调用而设计。

- **白名单命令**：`python`、`python3`、`opensees`、`OpenSees`。
- **黑名单命令**：`rm`、`del`、`mv`、`cp`、`ln`、`format`、`mkfs`、`sudo`、`su`、`chmod`、`chown`、`curl`、`wget`、`ssh`、`nc`、`ncat`。
- **禁止的参数**：`--recursive`、`--force`、`-rf`。
- **工作目录**：锁定为 `.runtime/workspace`。
- **超时**：5 分钟。
- **输出上限**：stdout + stderr 合计 1 MiB。

## 3. 安全边界

### 3.1 安全等级

工具技能分为三个安全等级：

| 等级 | 说明 | 允许的操作 |
|------|------|-----------|
| `read-only` | 无写入，无副作用 | 读取文件、列出目录、分解计划 |
| `read-write-local` | 写入会话级或沙箱级存储 | 写入文件、存储/清除内存条目 |
| `restricted-exec` | 外部进程执行 | 仅调用白名单中的可执行程序 |

安全等级不支持升级。`read-only` 技能不允许在运行时获取写入能力。

### 3.2 沙箱规则

每种技能类型都有对应的沙箱规则接口和一组编译时默认值：

| 沙箱 | 接口 | 默认常量 |
|------|------|---------|
| 文件读取 | `FileSandboxRules` | `DEFAULT_FILE_SANDBOX` |
| 文件写入 | `FileSandboxRules` | `DEFAULT_WRITE_FILE_SANDBOX` |
| 命令执行 | `ShellSandboxRules` | `DEFAULT_SHELL_SANDBOX` |
| 内存 | `MemorySandboxRules` | `DEFAULT_MEMORY_SANDBOX` |
| 规划 | `PlanningSandboxRules` | `DEFAULT_PLANNING_SANDBOX` |

**不变量**：沙箱默认值在未来版本中只能收紧，不能在未经安全审查的情况下放宽。

### 3.3 执行点

沙箱规则在技能调用边界处、技能处理器执行之前进行检查。违规操作将被拒绝，并返回包含技能 ID、尝试的操作和被违反规则的结构化错误信息。

## 4. 与领域技能的组合

### 4.1 基于阶段的复用

工具技能在特定的流水线阶段可用。它们由领域技能或编排器调用，而非由用户直接触发。

组合模型中引用的流水线阶段：

| 阶段 | 说明 |
|------|------|
| `intent` | 用户意图解析与消歧 |
| `draft` | 结构模型初始生成 |
| `analysis` | 基于引擎的结构分析 |
| `design` | 设计优化与详细设计 |

### 4.2 阶段映射

| 技能 | intent | draft | analysis | design |
|------|--------|-------|----------|--------|
| memory | ✓ | ✓ | ✓ | ✓ |
| planning | ✓ | ✓ | — | — |
| read-file | ✓ | ✓ | ✓ | — |
| write-file | — | — | ✓ | — |
| replace | — | ✓ | ✓ | — |
| shell | — | — | ✓ | — |

关键特征：

- **memory** 是唯一在所有阶段都可用的技能，因为上下文传递在各阶段普遍需要。
- **planning** 仅限于早期阶段（intent、draft），即需要执行意图分解的位置。
- **shell** 仅限于 analysis 阶段，因为只有分析引擎需要外部进程执行。
- **write-file** 仅限于 analysis 阶段，以避免其他阶段产生意外副作用。

### 4.3 组合辅助函数

`utility-skill-definitions.ts` 导出两个辅助函数：

```typescript
// 检查特定工具技能是否允许在给定阶段使用
isUtilitySkillAllowedInStage(skillId: string, stage: string): boolean

// 列出给定阶段可用的所有工具技能
listUtilitySkillsForStage(stage: string): UtilitySkillDescriptor[]
```

领域技能和编排器使用这些辅助函数在调用前确认哪些工具技能可用。

### 4.4 依赖解析

标准的 `requires` / `conflicts` 机制（源自 `SkillPackageMetadata`）同样适用于工具技能。

目前只有 `replace` 声明了依赖（`requires: ['read-file', 'write-file']`）。如果任一依赖缺失或被禁用，replace 技能将无法加载。

## 5. 相关文档

- 技能加载机制：`docs/schema/skill-loading_CN.md`
- 技能加载机制（英文）：`docs/schema/skill-loading.md`
- 工具技能定义（英文）：`docs/schema/utility-skills.md`
- 协议参考：`docs/reference_CN.md`
