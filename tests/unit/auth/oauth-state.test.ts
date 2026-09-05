import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import {
	beginOAuth,
	consumeOAuthState,
	safeNext,
	availableProviders
} from '$lib/server/auth/oauth';

const baseEnv = { ...env, PUBLIC_ORIGIN: 'https://example.test' } as App.Env;

describe('oauth state', () => {
	it('stores state for the mock provider and the URL carries it', async () => {
		const url = await beginOAuth(
			{ ...baseEnv, E2E_MOCK_OAUTH: '1' },
			env.SESSIONS,
			'mock',
			'/inbox'
		);
		const state = url.searchParams.get('state')!;
		expect(url.pathname).toBe('/auth/mock');
		const record = await consumeOAuthState(env.SESSIONS, state);
		expect(record).toEqual({ provider: 'mock', next: '/inbox' });
	});

	it('state is single use', async () => {
		const url = await beginOAuth({ ...baseEnv, E2E_MOCK_OAUTH: '1' }, env.SESSIONS, 'mock', '/');
		const state = url.searchParams.get('state')!;
		expect(await consumeOAuthState(env.SESSIONS, state)).not.toBeNull();
		expect(await consumeOAuthState(env.SESSIONS, state)).toBeNull();
	});

	it('unknown or missing state is rejected', async () => {
		expect(await consumeOAuthState(env.SESSIONS, 'nope')).toBeNull();
		expect(await consumeOAuthState(env.SESSIONS, null)).toBeNull();
	});

	it('github flow builds an authorize URL with state and no PKCE', async () => {
		const e = { ...baseEnv, GITHUB_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 'secret' } as App.Env;
		const url = await beginOAuth(e, env.SESSIONS, 'github', '/c/x');
		expect(url.hostname).toBe('github.com');
		expect(url.searchParams.get('client_id')).toBe('id');
		expect(url.searchParams.get('redirect_uri')).toBe('https://example.test/auth/callback/github');
		const record = await consumeOAuthState(env.SESSIONS, url.searchParams.get('state'));
		expect(record?.codeVerifier).toBeUndefined();
	});

	it('google flow stores a PKCE verifier and sends the S256 challenge', async () => {
		const e = { ...baseEnv, GOOGLE_CLIENT_ID: 'gid', GOOGLE_CLIENT_SECRET: 'gsecret' } as App.Env;
		const url = await beginOAuth(e, env.SESSIONS, 'google', '/');
		expect(url.searchParams.get('code_challenge_method')).toBe('S256');
		const record = await consumeOAuthState(env.SESSIONS, url.searchParams.get('state'));
		expect(record?.codeVerifier?.length).toBeGreaterThan(20);
	});

	it('only configured providers are offered', () => {
		expect(availableProviders(baseEnv)).toEqual([]);
		expect(
			availableProviders({
				...baseEnv,
				GITHUB_CLIENT_ID: 'a',
				GITHUB_CLIENT_SECRET: 'b',
				E2E_MOCK_OAUTH: '1'
			} as App.Env)
		).toEqual(['github', 'mock']);
	});

	it('safeNext only allows same-site paths outside /auth', () => {
		expect(safeNext('/inbox')).toBe('/inbox');
		expect(safeNext('https://evil.test')).toBe('/');
		expect(safeNext('//evil.test')).toBe('/');
		expect(safeNext('/auth/login')).toBe('/');
		expect(safeNext(null)).toBe('/');
	});
});
