import { GitHub, Google, generateCodeVerifier, generateState } from 'arctic';
import type { KVNamespace } from '@cloudflare/workers-types';

export type ProviderName = 'github' | 'google' | 'mock';
export const OAUTH_STATE_TTL_S = 600;

export interface OAuthProfile {
	provider: ProviderName;
	providerUserId: string;
	name: string;
	avatarUrl: string | null;
}

export interface OAuthState {
	provider: ProviderName;
	codeVerifier?: string;
	next: string;
}

export function availableProviders(env: App.Env): ProviderName[] {
	const out: ProviderName[] = [];
	if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) out.push('github');
	if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) out.push('google');
	if (env.E2E_MOCK_OAUTH === '1') out.push('mock');
	return out;
}

export function isProviderName(v: string): v is ProviderName {
	return v === 'github' || v === 'google' || v === 'mock';
}

function callbackUrl(env: App.Env, provider: ProviderName) {
	return `${env.PUBLIC_ORIGIN}/auth/callback/${provider}`;
}

export function safeNext(next: string | null | undefined): string {
	if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/auth/'))
		return '/';
	return next;
}

/** Begin an OAuth flow: store state (+ PKCE verifier) in KV, return the provider URL. */
export async function beginOAuth(
	env: App.Env,
	kv: KVNamespace,
	provider: ProviderName,
	next: string
): Promise<URL> {
	const state = generateState();
	const record: OAuthState = { provider, next: safeNext(next) };
	let url: URL;
	if (provider === 'github') {
		const gh = new GitHub(
			env.GITHUB_CLIENT_ID!,
			env.GITHUB_CLIENT_SECRET!,
			callbackUrl(env, 'github')
		);
		url = gh.createAuthorizationURL(state, ['read:user']);
	} else if (provider === 'google') {
		const verifier = generateCodeVerifier();
		record.codeVerifier = verifier;
		const g = new Google(
			env.GOOGLE_CLIENT_ID!,
			env.GOOGLE_CLIENT_SECRET!,
			callbackUrl(env, 'google')
		);
		url = g.createAuthorizationURL(state, verifier, ['openid', 'profile']);
	} else {
		url = new URL(`${env.PUBLIC_ORIGIN}/auth/mock`);
		url.searchParams.set('state', state);
	}
	await kv.put(`oauth:${state}`, JSON.stringify(record), { expirationTtl: OAUTH_STATE_TTL_S });
	return url;
}

/** Consume a state token. Single use: returns null if unknown or already used. */
export async function consumeOAuthState(
	kv: KVNamespace,
	state: string | null
): Promise<OAuthState | null> {
	if (!state) return null;
	const record = await kv.get<OAuthState>(`oauth:${state}`, 'json');
	if (!record) return null;
	await kv.delete(`oauth:${state}`);
	return record;
}

export async function fetchProfile(
	env: App.Env,
	provider: ProviderName,
	code: string,
	codeVerifier?: string
): Promise<OAuthProfile> {
	if (provider === 'github') {
		const gh = new GitHub(
			env.GITHUB_CLIENT_ID!,
			env.GITHUB_CLIENT_SECRET!,
			callbackUrl(env, 'github')
		);
		const tokens = await gh.validateAuthorizationCode(code);
		const res = await fetch('https://api.github.com/user', {
			headers: {
				Authorization: `Bearer ${tokens.accessToken()}`,
				'User-Agent': 'skillswap',
				Accept: 'application/vnd.github+json'
			}
		});
		if (!res.ok) throw new Error(`github profile ${res.status}`);
		const u = (await res.json()) as {
			id: number;
			login: string;
			name: string | null;
			avatar_url: string | null;
		};
		return {
			provider,
			providerUserId: String(u.id),
			name: u.name?.trim() || u.login,
			avatarUrl: u.avatar_url
		};
	}
	if (provider === 'google') {
		if (!codeVerifier) throw new Error('missing code verifier');
		const g = new Google(
			env.GOOGLE_CLIENT_ID!,
			env.GOOGLE_CLIENT_SECRET!,
			callbackUrl(env, 'google')
		);
		const tokens = await g.validateAuthorizationCode(code, codeVerifier);
		const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
			headers: { Authorization: `Bearer ${tokens.accessToken()}` }
		});
		if (!res.ok) throw new Error(`google profile ${res.status}`);
		const u = (await res.json()) as { sub: string; name?: string; picture?: string };
		return {
			provider,
			providerUserId: u.sub,
			name: u.name?.trim() || 'New member',
			avatarUrl: u.picture ?? null
		};
	}
	throw new Error('mock provider does not exchange codes');
}
