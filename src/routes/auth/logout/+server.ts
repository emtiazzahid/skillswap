import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearSessionCookie, invalidateSession } from '$lib/server/auth/session';
import { ctx } from '$lib/server/context';

export const POST: RequestHandler = async (event) => {
	const { db, env } = ctx(event);
	if (event.locals.sessionId) await invalidateSession(db, env.SESSIONS, event.locals.sessionId);
	clearSessionCookie(event.cookies, event.url.protocol === 'https:');
	redirect(303, '/');
};
