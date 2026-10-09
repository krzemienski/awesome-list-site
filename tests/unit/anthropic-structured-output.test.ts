import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  createStructuredMessage,
  getAnthropicClient,
  resetAnthropicClientForTests,
} from '../../server/ai/anthropicConfig';

const schema = z.object({ recommendations: z.array(z.object({ resourceId: z.string(), score: z.number() })) });
const data = { recommendations: [{ resourceId: 'https://ffmpeg.org', score: 0.9 }] };
const params = {
  model: 'cc/claude-haiku-4-5-20251001',
  system: 'Recommend video resources.',
  user: 'Recommend a video encoding tool.',
  maxTokens: 2500,
};
const toolOutput = (input: unknown = data) => ({
  type: 'tool_use', id: 'toolu_response', name: 'structured_response', input,
});
const response = (content: unknown[], stopReason = 'tool_use') => ({
  id: 'msg_response',
  type: 'message',
  role: 'assistant',
  model: 'claude-haiku-4-5-20251001',
  content,
  stop_reason: stopReason,
  stop_sequence: null,
  usage: { input_tokens: 100, output_tokens: 200, cache_read_input_tokens: 10, cache_creation_input_tokens: 20 },
});

describe('structured output through an Anthropic-compatible router', () => {
  let create: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_BASE_URL', 'https://router.example.test');
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', 'test-token');
    resetAnthropicClientForTests();
    create = vi.spyOn(getAnthropicClient()!.messages, 'create');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetAnthropicClientForTests();
  });

  it('forces only a strict response tool instead of relying on ignored output_config', async () => {
    create.mockResolvedValue(response([toolOutput()]));
    const signal = new AbortController().signal;
    const result = await createStructuredMessage(schema, { ...params, timeoutMs: 25000, signal });
    const [request, options] = create.mock.calls[0];
    expect(request.output_config).toBeUndefined();
    expect(request.tools).toHaveLength(1);
    expect(request.tools[0]).toMatchObject({
      name: 'structured_response',
      strict: true,
      input_schema: { type: 'object', required: ['recommendations'], additionalProperties: false },
    });
    expect(request.tool_choice).toEqual({ type: 'tool', name: 'structured_response', disable_parallel_tool_use: true });
    expect(options).toEqual({ timeout: 25000, signal });
    expect(result).toEqual({
      data,
      model: 'claude-haiku-4-5-20251001',
      usage: { inputTokens: 100, outputTokens: 200, cacheReadInputTokens: 10, cacheCreationInputTokens: 20 },
    });
  });

  it('does not JSON.parse skill-result text blocks ahead of a valid response tool', async () => {
    create.mockResolvedValue(response([
      { type: 'text', text: '[Skill result: memory_save]\n{"success":true}' },
      toolOutput(),
    ]));
    expect((await createStructuredMessage(schema, params)).data).toEqual(data);
  });

  it('fails explicitly when a router returns only skill-result text', async () => {
    create.mockResolvedValue(response([{ type: 'text', text: '[Skill result: memory_save]\n{"success":true}' }], 'end_turn'));
    await expect(createStructuredMessage(schema, params)).rejects.toMatchObject({ name: 'StructuredOutputError', reason: 'empty' });
  });

  it('validates the returned tool input rather than trusting the router', async () => {
    create.mockResolvedValue(response([toolOutput({ recommendations: [{ resourceId: 'private-user-data', score: 'bad' }] })]));
    await expect(createStructuredMessage(schema, params)).rejects.toMatchObject({
      name: 'StructuredOutputError', reason: 'invalid', message: 'Structured output failed schema validation at: recommendations.0.score',
    });
  });

  for (const stopReason of ['max_tokens', 'refusal']) {
    it(`reports ${stopReason} before attempting to validate incomplete output`, async () => {
      create.mockResolvedValue(response([toolOutput({})], stopReason));
      await expect(createStructuredMessage(schema, params)).rejects.toMatchObject({
        name: 'StructuredOutputError', reason: stopReason, stopReason,
      });
    });
  }

  it('rejects multiple response envelopes instead of picking an arbitrary one', async () => {
    create.mockResolvedValue(response([toolOutput(), toolOutput()]));
    await expect(createStructuredMessage(schema, params)).rejects.toMatchObject({ reason: 'invalid' });
  });

  it('rejects an output envelope without a completed tool_use stop reason', async () => {
    create.mockResolvedValue(response([toolOutput()], 'pause_turn'));
    await expect(createStructuredMessage(schema, params)).rejects.toMatchObject({ reason: 'invalid', stopReason: 'pause_turn' });
  });

  it('does not accept an unexpected tool name', async () => {
    create.mockResolvedValue(response([{ ...toolOutput(), name: 'memory_save' }]));
    await expect(createStructuredMessage(schema, params)).rejects.toMatchObject({ reason: 'empty' });
  });
});
