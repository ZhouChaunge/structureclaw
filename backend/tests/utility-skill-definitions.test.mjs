import { describe, expect, test } from '@jest/globals';
import {
  UTILITY_SKILL_DESCRIPTORS,
  DEFAULT_FILE_SANDBOX,
  DEFAULT_WRITE_FILE_SANDBOX,
  DEFAULT_SHELL_SANDBOX,
  DEFAULT_MEMORY_SANDBOX,
  DEFAULT_PLANNING_SANDBOX,
  isUtilitySkillAllowedInStage,
  listUtilitySkillsForStage,
} from '../dist/agent-skills/general/utility-skill-definitions.js';

describe('utility skill definitions', () => {
  const EXPECTED_SKILL_IDS = ['memory', 'planning', 'read-file', 'write-file', 'replace', 'shell'];

  test('should define all six baseline utility skills', () => {
    const ids = UTILITY_SKILL_DESCRIPTORS.map((d) => d.id);
    expect(ids).toEqual(EXPECTED_SKILL_IDS);
  });

  test('every descriptor must have id, safetyLevel, capabilities, requires, and reusableInStages', () => {
    for (const descriptor of UTILITY_SKILL_DESCRIPTORS) {
      expect(typeof descriptor.id).toBe('string');
      expect(descriptor.id.length).toBeGreaterThan(0);
      expect(['read-only', 'read-write-local', 'restricted-exec']).toContain(descriptor.safetyLevel);
      expect(Array.isArray(descriptor.capabilities)).toBe(true);
      expect(descriptor.capabilities.length).toBeGreaterThan(0);
      expect(Array.isArray(descriptor.requires)).toBe(true);
      expect(Array.isArray(descriptor.reusableInStages)).toBe(true);
      expect(descriptor.reusableInStages.length).toBeGreaterThan(0);
    }
  });

  test('no duplicate skill IDs', () => {
    const ids = UTILITY_SKILL_DESCRIPTORS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('replace skill must depend on read-file and write-file', () => {
    const replace = UTILITY_SKILL_DESCRIPTORS.find((d) => d.id === 'replace');
    expect(replace).toBeDefined();
    expect(replace.requires).toContain('read-file');
    expect(replace.requires).toContain('write-file');
  });

  test('shell skill must be restricted-exec', () => {
    const shell = UTILITY_SKILL_DESCRIPTORS.find((d) => d.id === 'shell');
    expect(shell).toBeDefined();
    expect(shell.safetyLevel).toBe('restricted-exec');
  });

  test('read-only skills must not have write capabilities', () => {
    const readOnlySkills = UTILITY_SKILL_DESCRIPTORS.filter((d) => d.safetyLevel === 'read-only');
    for (const skill of readOnlySkills) {
      for (const cap of skill.capabilities) {
        expect(cap).not.toMatch(/write|store|clear|exec|replace|patch/);
      }
    }
  });
});

describe('sandbox default constants', () => {
  test('DEFAULT_FILE_SANDBOX allows workspace and uploads', () => {
    expect(DEFAULT_FILE_SANDBOX.allowedRoots).toContain('.runtime/workspace');
    expect(DEFAULT_FILE_SANDBOX.allowedRoots).toContain('.runtime/uploads');
    expect(DEFAULT_FILE_SANDBOX.denyPatterns.length).toBeGreaterThan(0);
    expect(DEFAULT_FILE_SANDBOX.maxFileSizeBytes).toBe(2 * 1024 * 1024);
  });

  test('DEFAULT_WRITE_FILE_SANDBOX allows only workspace', () => {
    expect(DEFAULT_WRITE_FILE_SANDBOX.allowedRoots).toEqual(['.runtime/workspace']);
    expect(DEFAULT_WRITE_FILE_SANDBOX.allowedRoots).not.toContain('.runtime/uploads');
  });

  test('DEFAULT_SHELL_SANDBOX blocks dangerous commands', () => {
    for (const cmd of ['rm', 'del', 'sudo', 'curl', 'wget', 'ssh']) {
      expect(DEFAULT_SHELL_SANDBOX.denyCommands).toContain(cmd);
    }
    expect(DEFAULT_SHELL_SANDBOX.allowedCwd).toBe('.runtime/workspace');
    expect(DEFAULT_SHELL_SANDBOX.maxTimeoutMs).toBe(300_000);
  });

  test('DEFAULT_MEMORY_SANDBOX is session-scoped', () => {
    expect(DEFAULT_MEMORY_SANDBOX.sessionScopedOnly).toBe(true);
    expect(DEFAULT_MEMORY_SANDBOX.maxEntries).toBe(200);
    expect(DEFAULT_MEMORY_SANDBOX.maxEntrySizeBytes).toBe(8192);
  });

  test('DEFAULT_PLANNING_SANDBOX has no side effects', () => {
    expect(DEFAULT_PLANNING_SANDBOX.noSideEffects).toBe(true);
    expect(DEFAULT_PLANNING_SANDBOX.maxPlanDepth).toBe(10);
    expect(DEFAULT_PLANNING_SANDBOX.maxStepsPerPlan).toBe(50);
  });
});

describe('isUtilitySkillAllowedInStage', () => {
  test('memory is allowed in all stages', () => {
    for (const stage of ['intent', 'draft', 'analysis', 'design', 'report']) {
      expect(isUtilitySkillAllowedInStage('memory', stage)).toBe(true);
    }
  });

  test('shell is only allowed in analysis', () => {
    expect(isUtilitySkillAllowedInStage('shell', 'analysis')).toBe(true);
    expect(isUtilitySkillAllowedInStage('shell', 'intent')).toBe(false);
    expect(isUtilitySkillAllowedInStage('shell', 'draft')).toBe(false);
    expect(isUtilitySkillAllowedInStage('shell', 'design')).toBe(false);
    expect(isUtilitySkillAllowedInStage('shell', 'report')).toBe(false);
  });

  test('returns false for unknown skill IDs', () => {
    expect(isUtilitySkillAllowedInStage('nonexistent', 'intent')).toBe(false);
  });

  test('returns false for unknown stage names', () => {
    expect(isUtilitySkillAllowedInStage('memory', 'nonexistent-stage')).toBe(false);
  });
});

describe('listUtilitySkillsForStage', () => {
  test('intent stage includes memory, planning, read-file', () => {
    const skills = listUtilitySkillsForStage('intent');
    const ids = skills.map((s) => s.id);
    expect(ids).toContain('memory');
    expect(ids).toContain('planning');
    expect(ids).toContain('read-file');
    expect(ids).not.toContain('write-file');
    expect(ids).not.toContain('shell');
  });

  test('analysis stage includes memory, read-file, write-file, replace, shell', () => {
    const skills = listUtilitySkillsForStage('analysis');
    const ids = skills.map((s) => s.id);
    expect(ids).toContain('memory');
    expect(ids).toContain('read-file');
    expect(ids).toContain('write-file');
    expect(ids).toContain('replace');
    expect(ids).toContain('shell');
    expect(ids).not.toContain('planning');
  });

  test('returns empty for unknown stage', () => {
    const skills = listUtilitySkillsForStage('nonexistent-stage');
    expect(skills).toEqual([]);
  });
});
