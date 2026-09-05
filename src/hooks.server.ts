import type { Handle } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import {
	SESSION_COOKIE,
	clearSessionCookie,
	setSessionCookie,
	validateSessionToken
} from '$lib/server/auth/session';

// Content-Security-Policy is emitted by SvelteKit itself (csp config in vite.config.ts) so that
// its inline hydration script gets a nonce/hash. The rest is added here.
const SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.sessionId = null;

	const token = event.cookies.get(SESSION_COOKIE);
	const env = event.platform?.env;
	if (token && env) {
		const secure = event.url.protocol === 'https:';
		const session = await validateSessionToken(createDb(env.DB), env.SESSIONS, token);
		if (session) {
			event.locals.user = session.user;
			event.locals.sessionId = session.sessionId;
			if (session.renewed) setSessionCookie(event.cookies, token, session.expiresAt, secure);
		} else {
			clearSessionCookie(event.cookies, secure);
		}
	}

	const response = await resolve(event);
	for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
		if (!response.headers.has(k)) response.headers.set(k, v);
	}
	return response;
};
