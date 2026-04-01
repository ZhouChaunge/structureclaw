---
id: planning
structureType: unknown
zhName: 规划
enName: Planning
zhDescription: 将复杂任务分解为有序子步骤，并对执行顺序和条件进行编排。
enDescription: Decompose complex tasks into ordered sub-steps and orchestrate execution sequence and conditions.
triggers: []
stages: ["intent", "draft"]
autoLoadByDefault: false
domain: general
requires: []
conflicts: []
capabilities: ["task-decompose", "step-sequence", "condition-gate"]
priority: 10
skillCategory: utility
safetyLevel: read-only
sandboxRules: ["no_side_effects:true", "max_plan_depth:10", "max_steps_per_plan:50"]
---

## Purpose

The planning skill decomposes a high-level user goal into a sequence of executable sub-steps.
It does not execute actions itself — it produces a plan object that the orchestrator consumes to drive tool calls.

## Capabilities

- **task-decompose**: Break a complex request into atomic sub-goals.
- **step-sequence**: Order sub-steps respecting data dependencies and prerequisites.
- **condition-gate**: Attach preconditions to steps (e.g., "run code-check only if analysis succeeded").

## Boundaries

- Planning is pure computation with no side effects.
- Plans are advisory: the orchestrator may skip, reorder, or override steps.
- Maximum plan depth: 10 levels of nesting; maximum 50 steps per plan.
- Planning does not access the filesystem, network, or database.
