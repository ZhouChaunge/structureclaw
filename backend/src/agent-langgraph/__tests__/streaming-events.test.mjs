import { describe, expect, test } from '@jest/globals';
import { AIMessage, ToolMessage } from '@langchain/core/messages';

describe('streaming: token events from "messages" mode', () => {
  test('emits a token chunk for text content in AIMessageChunk', async () => {
    const { langGraphEventToChunks } = await import('../../../dist/agent-langgraph/streaming.js');

    // Simulate LangGraph messages-mode event: [chunk, metadata]
    const { AIMessageChunk } = await import('@langchain/core/messages');
    const chunk = new AIMessageChunk({ content: 'Hello, world' });
    const chunks = langGraphEventToChunks([chunk, {}], 'messages');

    expect(chunks).toEqual([{ type: 'token', content: 'Hello, world' }]);
  });

  test('does not emit token chunks for empty AI message chunks', async () => {
    const { langGraphEventToChunks } = await import('../../../dist/agent-langgraph/streaming.js');
    const { AIMessageChunk } = await import('@langchain/core/messages');

    const emptyChunk = new AIMessageChunk({ content: '' });
    const chunks = langGraphEventToChunks([emptyChunk, {}], 'messages');
    expect(chunks).toEqual([]);
  });

  test('does not emit token chunks for AI message chunks with tool calls', async () => {
    const { langGraphEventToChunks } = await import('../../../dist/agent-langgraph/streaming.js');
    const { AIMessageChunk } = await import('@langchain/core/messages');

    const chunkWithToolCall = new AIMessageChunk({
      content: '',
      tool_calls: [{ id: 'tc1', name: 'build_model', args: {}, type: 'tool_call' }],
    });
    const chunks = langGraphEventToChunks([chunkWithToolCall, {}], 'messages');
    expect(chunks).toEqual([]);
  });

  test('handles bare message (not array) in messages mode', async () => {
    const { langGraphEventToChunks } = await import('../../../dist/agent-langgraph/streaming.js');
    const { AIMessageChunk } = await import('@langchain/core/messages');

    const chunk = new AIMessageChunk({ content: 'direct chunk' });
    const chunks = langGraphEventToChunks(chunk, 'messages');
    expect(chunks).toEqual([{ type: 'token', content: 'direct chunk' }]);
  });

  test('handles array content blocks in AI message chunk', async () => {
    const { langGraphEventToChunks } = await import('../../../dist/agent-langgraph/streaming.js');
    const { AIMessageChunk } = await import('@langchain/core/messages');

    const chunk = new AIMessageChunk({
      content: [{ type: 'text', text: 'block text' }],
    });
    const chunks = langGraphEventToChunks([chunk, {}], 'messages');
    expect(chunks).toEqual([{ type: 'token', content: 'block text' }]);
  });
});

describe('streaming: step_upsert events from "updates" mode', () => {
  test('emits step_upsert running when agent node returns tool calls', async () => {
    const { langGraphEventToChunks } = await import('../../../dist/agent-langgraph/streaming.js');

    const aiMsg = new AIMessage({
      content: '',
      tool_calls: [{ id: 'call-build', name: 'build_model', args: {}, type: 'tool_call' }],
    });
    const chunks = langGraphEventToChunks({ agent: { messages: [aiMsg] } }, 'updates');

    const stepChunk = chunks.find((c) => c.type === 'step_upsert');
    expect(stepChunk).toBeDefined();
    expect(stepChunk.step.status).toBe('running');
    expect(stepChunk.step.tool).toBe('build_model');
  });

  test('emits step_upsert done when tools node returns ToolMessage', async () => {
    const { langGraphEventToChunks } = await import('../../../dist/agent-langgraph/streaming.js');

    const toolMsg = new ToolMessage({
      content: JSON.stringify({ success: true }),
      tool_call_id: 'call-validate',
      name: 'validate_model',
    });
    const chunks = langGraphEventToChunks({ tools: { messages: [toolMsg] } }, 'updates');

    const stepChunk = chunks.find((c) => c.type === 'step_upsert');
    expect(stepChunk).toBeDefined();
    expect(stepChunk.step.status).toBe('done');
    expect(stepChunk.step.tool).toBe('validate_model');
  });

  test('emits result chunk when agent produces a final text response', async () => {
    const { langGraphEventToChunks } = await import('../../../dist/agent-langgraph/streaming.js');

    const aiMsg = new AIMessage('The analysis is complete.');
    const chunks = langGraphEventToChunks({ agent: { messages: [aiMsg] } }, 'updates');

    const resultChunk = chunks.find((c) => c.type === 'result');
    expect(resultChunk).toBeDefined();
    expect(resultChunk.content.response).toBe('The analysis is complete.');
    expect(resultChunk.content.mode).toBe('conversation');
  });

  test('emits step_upsert for multiple tool calls in one agent turn', async () => {
    const { langGraphEventToChunks } = await import('../../../dist/agent-langgraph/streaming.js');

    const aiMsg = new AIMessage({
      content: '',
      tool_calls: [
        { id: 'c1', name: 'detect_structure_type', args: {}, type: 'tool_call' },
        { id: 'c2', name: 'extract_draft_params', args: {}, type: 'tool_call' },
        { id: 'c3', name: 'run_analysis', args: {}, type: 'tool_call' },
      ],
    });
    const chunks = langGraphEventToChunks({ agent: { messages: [aiMsg] } }, 'updates');

    const stepChunks = chunks.filter((c) => c.type === 'step_upsert');
    expect(stepChunks).toHaveLength(3);
    expect(stepChunks.map((c) => c.step.tool)).toEqual([
      'detect_structure_type', 'extract_draft_params', 'run_analysis',
    ]);
  });
});

describe('streaming: interrupt events from "updates" mode', () => {
  test('emits interaction_update for __interrupt__ with question', async () => {
    const { langGraphEventToChunks } = await import('../../../dist/agent-langgraph/streaming.js');

    const event = {
      __interrupt__: [{ value: { question: 'What is the beam span?' } }],
    };
    const chunks = langGraphEventToChunks(event, 'updates');

    expect(chunks).toHaveLength(1);
    expect(chunks[0].type).toBe('interaction_update');
    expect(chunks[0].content.resumeRequired).toBe(true);
    expect(chunks[0].content.questions[0].question).toBe('What is the beam span?');
  });

  test('emits interaction_update for single (non-array) __interrupt__', async () => {
    const { langGraphEventToChunks } = await import('../../../dist/agent-langgraph/streaming.js');

    const event = {
      __interrupt__: { value: { question: '请输入截面尺寸？' } },
    };
    const chunks = langGraphEventToChunks(event, 'updates');

    expect(chunks).toHaveLength(1);
    expect(chunks[0].type).toBe('interaction_update');
    expect(chunks[0].content.questions[0].question).toBe('请输入截面尺寸？');
  });
});

describe('streaming: custom event passthrough', () => {
  test('passes through structured custom events as-is', async () => {
    const { langGraphEventToChunks } = await import('../../../dist/agent-langgraph/streaming.js');

    const customEvent = { type: 'phase_upsert', phaseId: 'phase-analysis', phase: { status: 'running' } };
    const chunks = langGraphEventToChunks(customEvent, 'custom');

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual(customEvent);
  });

  test('converts string custom events to summary_replace', async () => {
    const { langGraphEventToChunks } = await import('../../../dist/agent-langgraph/streaming.js');

    const chunks = langGraphEventToChunks('分析进行中…', 'custom');

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual({ type: 'summary_replace', summaryText: '分析进行中…' });
  });

  test('ignores non-string, non-object custom events', async () => {
    const { langGraphEventToChunks } = await import('../../../dist/agent-langgraph/streaming.js');

    expect(langGraphEventToChunks(null, 'custom')).toEqual([]);
    expect(langGraphEventToChunks(42, 'custom')).toEqual([]);
  });
});

describe('streaming: step_upsert for at least 5 tool types', () => {
  const toolNames = [
    'detect_structure_type',
    'extract_draft_params',
    'build_model',
    'validate_model',
    'run_analysis',
    'run_code_check',
    'generate_report',
  ];

  for (const toolName of toolNames) {
    test(`emits step_upsert for tool: ${toolName}`, async () => {
      const { langGraphEventToChunks } = await import('../../../dist/agent-langgraph/streaming.js');

      const toolMsg = new ToolMessage({
        content: JSON.stringify({ success: true }),
        tool_call_id: `call-${toolName}`,
        name: toolName,
      });
      const chunks = langGraphEventToChunks({ tools: { messages: [toolMsg] } }, 'updates');

      const stepChunk = chunks.find((c) => c.type === 'step_upsert');
      expect(stepChunk).toBeDefined();
      expect(stepChunk.step.tool).toBe(toolName);
      expect(stepChunk.step.status).toBe('done');
    });
  }
});
