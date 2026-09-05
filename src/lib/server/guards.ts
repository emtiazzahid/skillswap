import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { SessionUser } from './auth/types';

/** Redirect anonymous visitors to login, remembering where they were going. */
export function requireUser(event: Pick<RequestEvent, 'locals' | 'url'>): SessionUser {
	const user = event.locals.user;
	if (!user) {
		const next = event.url.pathname + event.url.search;
		redirect(303, `/auth/login?next=${encodeURIComponent(next)}`);
	}
	if (!user.onboarded && !event.url.pathname.startsWith('/onboarding')) {
		redirect(303, `/onboarding?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}
	return user;
}
