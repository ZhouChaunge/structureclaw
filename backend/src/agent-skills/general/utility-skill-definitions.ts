/**
 * Utility skill type definitions, safety boundary constants,
 * and composition helpers for general-purpose (non-domain) skills.
 */

import type { SkillStage } from '../../agent-runtime/types.js';

// ---------------------------------------------------------------------------
// Safety levels
// ---------------------------------------------------------------------------

/**
 * Safety classification for utility skills.
 * Each level defines a boundary on what the skill is allowed to do.
 */
export type UtilitySkillSafetyLevel =
  | 'read-only'          // No writes, no side effects
  | 'read-write-local'   // Writes to session-scoped or sandbox-scoped storage
  | 'restricted-exec';   // External process execution within whitelist

// ---------------------------------------------------------------------------
// Sandbox rule definitions
// ---------------------------------------------------------------------------

export interface FileSandboxRules {
  /** Allowed root directories relative to project root. */
  allowedRoots: string[];
  /** Glob patterns that are always denied. */
  denyPatterns: string[];
  /** Maximum file size in bytes for a single operation. */
  maxFileSizeBytes: number;
}

export interface ShellSandboxRules {
  /** Whitelisted executable names (basename only, no paths). */
  allowedCommands: string[];
  /** Blocked commands (unconditional deny). */
  denyCommands: string[];
  /** Blocked argument patterns. */
  denyArgs: string[];
  /** Working directory (relative to project root). */
  allowedCwd: string;
  /** Maximum execution time in milliseconds. */
  maxTimeoutMs: number;
  /** Maximum combined stdout + stderr in bytes. */
  maxOutputBytes: number;
}

export interface MemorySandboxRules {
  /** Maximum entries per session. */
  maxEntries: number;
  /** Maximum size per entry in bytes. */
  maxEntrySizeBytes: number;
  /** Whether entries are session-scoped only. */
  sessionScopedOnly: boolean;
}

export interface PlanningSandboxRules {
  /** Whether the skill may have side effects. */
  noSideEffects: boolean;
  /** Maximum nesting depth of a plan. */
  maxPlanDepth: number;
  /** Maximum steps in a single plan. */
  maxStepsPerPlan: number;
}

// ---------------------------------------------------------------------------
// Default sandbox configurations
// ---------------------------------------------------------------------------

export const DEFAULT_FILE_SANDBOX: FileSandboxRules = {
  allowedRoots: ['.runtime/workspace', '.runtime/uploads'],
  denyPatterns: ['**/.env', '**/*.key', '**/*.pem', '**/secrets/**'],
  maxFileSizeBytes: 2 * 1024 * 1024, // 2 MiB
};

export const DEFAULT_WRITE_FILE_SANDBOX: FileSandboxRules = {
  allowedRoots: ['.runtime/workspace'],
  denyPatterns: ['**/.env', '**/*.key', '**/*.pem', '**/secrets/**'],
  maxFileSizeBytes: 2 * 1024 * 1024,
};

export const DEFAULT_SHELL_SANDBOX: ShellSandboxRules = {
  allowedCommands: ['python', 'python3', 'opensees', 'OpenSees'],
  denyCommands: ['rm', 'del', 'mv', 'cp', 'ln', 'format', 'mkfs', 'sudo', 'su', 'chmod', 'chown', 'curl', 'wget', 'ssh', 'nc', 'ncat'],
  denyArgs: ['--recursive', '--force', '-rf'],
  allowedCwd: '.runtime/workspace',
  maxTimeoutMs: 300_000, // 5 minutes
  maxOutputBytes: 1024 * 1024, // 1 MiB
};

export const DEFAULT_MEMORY_SANDBOX: MemorySandboxRules = {
  maxEntries: 200,
  maxEntrySizeBytes: 8192,
  sessionScopedOnly: true,
};

export const DEFAULT_PLANNING_SANDBOX: PlanningSandboxRules = {
  noSideEffects: true,
  maxPlanDepth: 10,
  maxStepsPerPlan: 50,
};

// ---------------------------------------------------------------------------
// Utility skill descriptor
// ---------------------------------------------------------------------------

export interface UtilitySkillDescriptor {
  id: string;
  safetyLevel: UtilitySkillSafetyLevel;
  capabilities: string[];
  requires: string[];
  /** Pipeline stages where this skill may be invoked. */
  reusableInStages: SkillStage[];
}

/**
 * Registry of all utility skills, their safety levels, dependencies,
 * and the pipeline stages where they can be reused.
 */
export const UTILITY_SKILL_DESCRIPTORS: UtilitySkillDescriptor[] = [
  {
    id: 'memory',
    safetyLevel: 'read-write-local',
    capabilities: ['context-store', 'context-retrieve', 'context-clear'],
    requires: [],
    reusableInStages: ['intent', 'draft', 'analysis', 'design'],
  },
  {
    id: 'planning',
    safetyLevel: 'read-only',
    capabilities: ['task-decompose', 'step-sequence', 'condition-gate'],
    requires: [],
    reusableInStages: ['intent', 'draft'],
  },
  {
    id: 'read-file',
    safetyLevel: 'read-only',
    capabilities: ['file-read-text', 'file-read-json', 'file-list-dir'],
    requires: [],
    reusableInStages: ['intent', 'draft', 'analysis'],
  },
  {
    id: 'write-file',
    safetyLevel: 'read-write-local',
    capabilities: ['file-write-text', 'file-write-json'],
    requires: [],
    reusableInStages: ['analysis'],
  },
  {
    id: 'replace',
    safetyLevel: 'read-write-local',
    capabilities: ['text-replace', 'json-patch'],
    requires: ['read-file', 'write-file'],
    reusableInStages: ['draft', 'analysis'],
  },
  {
    id: 'shell',
    safetyLevel: 'restricted-exec',
    capabilities: ['shell-exec'],
    requires: [],
    reusableInStages: ['analysis'],
  },
];

// ---------------------------------------------------------------------------
// Composition helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when a utility skill is allowed in the given pipeline stage.
 */
export function isUtilitySkillAllowedInStage(skillId: string, stage: SkillStage): boolean {
  const descriptor = UTILITY_SKILL_DESCRIPTORS.find((d) => d.id === skillId);
  if (!descriptor) {
    return false;
  }
  return descriptor.reusableInStages.includes(stage);
}

/**
 * Returns the list of utility skills that may be invoked during a given stage.
 */
export function listUtilitySkillsForStage(stage: SkillStage): UtilitySkillDescriptor[] {
  return UTILITY_SKILL_DESCRIPTORS.filter((d) => d.reusableInStages.includes(stage));
}
