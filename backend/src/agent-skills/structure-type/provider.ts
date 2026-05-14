import type { ManifestBackedSkillProvider, SkillProviderSource } from '../../skill-shared/provider.js';
import type { SkillPackageMetadata } from '../../skill-shared/package.js';
import type { AgentSkillPlugin, SkillHandler, SkillManifest } from '../../agent-runtime/types.js';

export interface StructureModelingProvider extends ManifestBackedSkillProvider<'structure-type', SkillManifest> {
  handler: SkillHandler;
  plugin: AgentSkillPlugin;
}

export interface StructureModelingProviderModule {
  manifest: SkillManifest;
  handler: SkillHandler;
}

export function toStructureModelingProviderFromModule(
  pkg: SkillPackageMetadata,
  module: StructureModelingProviderModule,
): StructureModelingProvider {
  const manifest: SkillManifest = {
    ...module.manifest,
  };
  const plugin: AgentSkillPlugin = {
    ...manifest,
    markdownByStage: {},
    manifest,
    handler: module.handler,
  };

  return {
    id: plugin.id,
    domain: 'structure-type',
    source: pkg.source,
    priority: pkg.priority ?? manifest.priority,
    manifest,
    handler: module.handler,
    plugin,
  };
}

export function toStructureModelingProvider(
  plugin: AgentSkillPlugin,
  options?: {
    source?: SkillProviderSource;
    priority?: number;
  },
): StructureModelingProvider {
  return {
    id: plugin.id,
    domain: 'structure-type',
    source: options?.source ?? 'builtin',
    priority: options?.priority ?? plugin.manifest.priority,
    manifest: plugin.manifest,
    handler: plugin.handler,
    plugin,
  };
}
