import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { consumeOAuthState, fetchProfile, isProviderName } from '$lib/server/auth/oauth';
import { createSession, setSessionCookie } from '$lib/server/auth/session';
import { upsertUserFromOAuth } from '$lib/server/services/users';
import { ctx } from '$lib/server/context';

export const GET: RequestHandler = async (event) => {
	const { db, env } = ctx(event);
	const provider = event.params.provider;
	if (!isProviderName(provider) || provider === 'mock') error(404, 'Unknown sign-in provider');

	const code = event.url.searchParams.get('code');
	const state = await consumeOAuthState(env.SESSIONS, event.url.searchParams.get('state'));
	if (!code || !state || state.provider !== provider)
		error(400, 'Sign-in link expired or was already used. Try again.');

	let profile;
	try {
		profile = await fetchProfile(env, provider, code, state.codeVerifier);
	} catch (e) {
		console.error('oauth callback failed', e);
		error(502, 'The sign-in provider did not answer. Try again in a minute.');
	}

	const { user } = await upsertUserFromOAuth(db, profile);
	const session = await createSession(db, env.SESSIONS, user.id);
	setSessionCookie(
		event.cookies,
		session.token,
		session.expiresAt,
		event.url.protocol === 'https:'
	);
	redirect(
		303,
		user.onboardedAt ? state.next : `/onboarding?next=${encodeURIComponent(state.next)}`
	);
};
