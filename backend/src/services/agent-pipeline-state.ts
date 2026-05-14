import type {
  AgentExecutionPolicy,
  ConversationPipelineState,
} from '../agent-runtime/types.js';

export function createEmptyConversationPipelineState(
  policy: AgentExecutionPolicy = {},
): ConversationPipelineState {
  return {
    policy,
    bindings: {},
    artifacts: {},
    updatedAt: Date.now(),
  };
}
