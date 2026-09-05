import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { consumeOAuthState } from '$lib/server/auth/oauth';
import { createSession, setSessionCookie } from '$lib/server/auth/session';
import { upsertUserFromOAuth } from '$lib/server/services/users';
import { ctx } from '$lib/server/context';

/** Test-only sign-in. Exists only when E2E_MOCK_OAUTH=1 (never on production). */
function assertEnabled(env: App.Env) {
	if (env.E2E_MOCK_OAUTH !== '1') error(404, 'Not found');
}

export const load: PageServerLoad = async (event) => {
	const { env } = ctx(event);
	assertEnabled(env);
	return { state: event.url.searchParams.get('state') ?? '' };
};

export const actions: Actions = {
	default: async (event) => {
		const { db, env } = ctx(event);
		assertEnabled(env);
		const form = await event.request.formData();
		const state = await consumeOAuthState(env.SESSIONS, String(form.get('state') ?? ''));
		if (!state || state.provider !== 'mock') return fail(400, { message: 'state expired' });
		const id = String(form.get('id') ?? '').trim();
		const name = String(form.get('name') ?? '').trim();
		if (!id || !name) return fail(400, { message: 'id and name required' });
		const { user } = await upsertUserFromOAuth(db, {
			provider: 'mock',
			providerUserId: id,
			name,
			avatarUrl: null
		});
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
	}
};
