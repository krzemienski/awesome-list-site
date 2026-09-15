/**
 * Credential + model precedence for every AI call path.
 *
 * Guards the fail-closed rules of server/ai/anthropicConfig.ts and the
 * per-run subprocess env built by server/ai/agentRuntime.ts:
 *  - router (ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN) wins over the managed
 *    integration and over a direct key
 *  - a base URL without any credential is "none", never a silent fall-through
 *  - the Agent SDK env never carries platform credentials to a custom endpoint
 *  - a token-only admin override still targets the configured router
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  describeAnthropicConfig,
  resolveAnthropicCredentials,
  resolveFlowModel,
  resolvePrimaryModel,
  resolveTierModel,
} from '../../server/ai/anthropicConfig';
import { buildAgentEnv } from '../../server/ai/agentRuntime';
import { encryptAuthToken } from '../../server/ai/configCrypto';

const CRED_KEYS = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'AI_INTEGRATIONS_ANTHROPIC_API_KEY',
  'AI_INTEGRATIONS_ANTHROPIC_BASE_URL',
  'CLAUDE_CODE_OAUTH_TOKEN',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_FABLE_MODEL',
  'CONFIG_ENCRYPTION_KEY',
] as const;

const ROUTER = 'https://router.example.test';
const MANAGED = 'https://managed.example.test/v1';

describe('resolveAnthropicCredentials precedence', () => {
  const cases: Array<{ name: string; env: Record<string, string>; kind: string; baseURL?: string; bearer: boolean; apiKey?: string }> = [
    { name: 'router bearer token beats managed + direct', env: { ANTHROPIC_BASE_URL: ROUTER, ANTHROPIC_AUTH_TOKEN: 'sk-tok-111', ANTHROPIC_API_KEY: 'sk-direct-000', AI_INTEGRATIONS_ANTHROPIC_API_KEY: 'sk-mk-222', AI_INTEGRATIONS_ANTHROPIC_BASE_URL: MANAGED }, kind: 'router', baseURL: ROUTER, bearer: true },
    { name: 'router with api key (no bearer) is allowed explicitly', env: { ANTHROPIC_BASE_URL: `${ROUTER}/`, ANTHROPIC_API_KEY: 'sk-k-333' }, kind: 'router', baseURL: ROUTER, bearer: false, apiKey: 'sk-k-333' },
    { name: 'base URL with no credential fails closed (never falls through)', env: { ANTHROPIC_BASE_URL: ROUTER, AI_INTEGRATIONS_ANTHROPIC_API_KEY: 'sk-mk-222', AI_INTEGRATIONS_ANTHROPIC_BASE_URL: MANAGED }, kind: 'none', bearer: false },
    { name: 'managed integration when no router', env: { AI_INTEGRATIONS_ANTHROPIC_API_KEY: 'sk-mk-222', AI_INTEGRATIONS_ANTHROPIC_BASE_URL: MANAGED, ANTHROPIC_API_KEY: 'sk-direct-000' }, kind: 'managed', baseURL: MANAGED, bearer: false, apiKey: 'sk-mk-222' },
    { name: 'direct key last', env: { ANTHROPIC_API_KEY: 'sk-direct-000' }, kind: 'direct', bearer: false, apiKey: 'sk-direct-000' },
    { name: 'nothing configured', env: {}, kind: 'none', bearer: false },
    { name: 'bearer token alone (no base URL) is not a router', env: { ANTHROPIC_AUTH_TOKEN: 'sk-tok-111' }, kind: 'none', bearer: false },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const creds = resolveAnthropicCredentials(c.env);
      expect(creds.kind).toBe(c.kind);
      expect(creds.baseURL).toBe(c.baseURL);
      expect(!!creds.authToken).toBe(c.bearer);
      expect(creds.apiKey).toBe(c.apiKey);
      // A resolved credential set never carries BOTH secrets.
      expect(creds.authToken && creds.apiKey).toBeFalsy();
      // Labels are secret-free.
      for (const s of ['sk-tok-111', 'sk-direct-000', 'sk-mk-222', 'sk-k-333']) expect(creds.label).not.toMatch(new RegExp(`\\b${s}\\b`));
    });
  }

  it('describeAnthropicConfig exposes endpoint + models but no secrets', () => {
    const env = { ANTHROPIC_BASE_URL: 'https://user:pw@router.example.test/', ANTHROPIC_AUTH_TOKEN: 'sk-secret' };
    const d = describeAnthropicConfig(env);
    expect(d.endpoint).toBe('router');
    expect(d.baseUrlHost).toBe('router.example.test');
    expect(d.baseUrl).toBe('https://router.example.test');
    const json = JSON.stringify(d);
    expect(json).not.toContain('sk-secret');
    expect(json).not.toContain('user:pw');
  });
});

describe('model resolution', () => {
  const env = {
    ANTHROPIC_MODEL: 'cc/claude-opus-5',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: 'cc/haiku',
    ANTHROPIC_DEFAULT_SONNET_MODEL: 'cc/sonnet',
    ANTHROPIC_DEFAULT_OPUS_MODEL: 'cc/opus',
  };
  it('tier env vars override first-party ids', () => {
    expect(resolveTierModel('haiku', env)).toBe('cc/haiku');
    expect(resolveTierModel('sonnet', env)).toBe('cc/sonnet');
    expect(resolveTierModel('haiku', {})).toMatch(/^claude-/);
  });
  it('ANTHROPIC_MODEL drives the orchestrator; flows follow their tier', () => {
    expect(resolvePrimaryModel(env)).toBe('cc/claude-opus-5');
    expect(resolveFlowModel('researchOrchestrator', env)).toBe('cc/claude-opus-5');
    expect(resolveFlowModel('researchScout', env)).toBe('cc/haiku');
    expect(resolveFlowModel('enrichment', env)).toBe('cc/haiku');
    expect(resolveFlowModel('journeySeeding', env)).toBe('cc/sonnet');
    expect(resolvePrimaryModel({ ANTHROPIC_DEFAULT_SONNET_MODEL: 'cc/sonnet' })).toBe('cc/sonnet');
  });
});

describe('buildAgentEnv (Claude Agent SDK subprocess env)', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of CRED_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
    process.env.CONFIG_ENCRYPTION_KEY = 'unit-test-encryption-key-0123456789';
  });
  afterEach(() => {
    for (const k of CRED_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  const credKeysOf = (env: Record<string, string>) => Object.fromEntries(CRED_KEYS.filter((k) => k in env).map((k) => [k, env[k]]));

  it('default run: router URL + bearer only, no platform or direct creds', () => {
    Object.assign(process.env, { ANTHROPIC_BASE_URL: ROUTER, ANTHROPIC_AUTH_TOKEN: 'sk-tok-111', ANTHROPIC_API_KEY: 'sk-direct-000', AI_INTEGRATIONS_ANTHROPIC_API_KEY: 'sk-mk-222', AI_INTEGRATIONS_ANTHROPIC_BASE_URL: MANAGED, CLAUDE_CODE_OAUTH_TOKEN: 'oauth' });
    const env = buildAgentEnv({});
    expect(credKeysOf(env)).toEqual({ ANTHROPIC_BASE_URL: ROUTER, ANTHROPIC_AUTH_TOKEN: 'sk-tok-111', CONFIG_ENCRYPTION_KEY: process.env.CONFIG_ENCRYPTION_KEY });
    expect(env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).toBe('1');
  });

  it('custom base URL + token: platform creds never travel to the custom host', () => {
    Object.assign(process.env, { ANTHROPIC_BASE_URL: ROUTER, ANTHROPIC_AUTH_TOKEN: 'sk-tok-111', AI_INTEGRATIONS_ANTHROPIC_API_KEY: 'sk-mk-222', AI_INTEGRATIONS_ANTHROPIC_BASE_URL: MANAGED });
    const enc = encryptAuthToken('admin-token').encrypted;
    const env = buildAgentEnv({ baseUrl: 'https://other.example.test', authTokenEncrypted: enc });
    expect(env.ANTHROPIC_BASE_URL).toBe('https://other.example.test');
    expect(env.ANTHROPIC_AUTH_TOKEN).toBe('admin-token');
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(env.AI_INTEGRATIONS_ANTHROPIC_API_KEY).toBeUndefined();
  });

  it('token-only override still targets the configured router (never api.anthropic.com)', () => {
    Object.assign(process.env, { ANTHROPIC_BASE_URL: ROUTER, ANTHROPIC_AUTH_TOKEN: 'sk-tok-111' });
    const enc = encryptAuthToken('admin-token').encrypted;
    const env = buildAgentEnv({ authTokenEncrypted: enc });
    expect(env.ANTHROPIC_BASE_URL).toBe(ROUTER);
    expect(env.ANTHROPIC_AUTH_TOKEN).toBe('admin-token');
  });

  it('token-only override with a managed integration goes direct (managed key withheld)', () => {
    Object.assign(process.env, { AI_INTEGRATIONS_ANTHROPIC_API_KEY: 'sk-mk-222', AI_INTEGRATIONS_ANTHROPIC_BASE_URL: MANAGED });
    const enc = encryptAuthToken('admin-token').encrypted;
    const env = buildAgentEnv({ authTokenEncrypted: enc });
    expect(env.ANTHROPIC_BASE_URL).toBeUndefined();
    expect(env.ANTHROPIC_AUTH_TOKEN).toBe('admin-token');
    expect(env.AI_INTEGRATIONS_ANTHROPIC_API_KEY).toBeUndefined();
  });

  it('legacy token-less custom URL row gets no credential at all', () => {
    Object.assign(process.env, { ANTHROPIC_BASE_URL: ROUTER, ANTHROPIC_AUTH_TOKEN: 'sk-tok-111' });
    const env = buildAgentEnv({ baseUrl: 'https://other.example.test' });
    expect(env.ANTHROPIC_BASE_URL).toBe('https://other.example.test');
    expect(env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
  });
});
