import type { Handle } from '@sveltejs/kit';

// Content-Security-Policy is emitted by SvelteKit itself (csp config in vite.config.ts) so that
// its inline hydration script gets a nonce/hash. The rest is added here.
const SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

export const handle: Handle = async ({ event, resolve }) => {
	// Session loading lands in M2; until then every visitor is anonymous.
	event.locals.user = null;
	event.locals.sessionId = null;

	const response = await resolve(event);
	for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
		if (!response.headers.has(k)) response.headers.set(k, v);
	}
	return response;
};
