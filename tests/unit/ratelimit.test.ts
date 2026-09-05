import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '$lib/server/ratelimit';

describe('rate limit', () => {
	it('allows up to the limit in a window, then refuses, then resets next window', async () => {
		const t0 = 1_700_000_000_000;
		expect((await checkRateLimit(env.SESSIONS, 'k', 2, 60, t0)).allowed).toBe(true);
		expect((await checkRateLimit(env.SESSIONS, 'k', 2, 60, t0 + 1000)).allowed).toBe(true);
		expect(await checkRateLimit(env.SESSIONS, 'k', 2, 60, t0 + 2000)).toEqual({
			allowed: false,
			remaining: 0
		});
		expect((await checkRateLimit(env.SESSIONS, 'k', 2, 60, t0 + 61_000)).allowed).toBe(true);
	});
});
