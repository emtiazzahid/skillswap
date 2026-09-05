import type { KVNamespace } from '@cloudflare/workers-types';

/**
 * Fixed-window counter in KV. Good enough for "3 per day" style limits on a hobby app.
 * Returns whether the action is allowed and how many remain in this window.
 */
export async function checkRateLimit(
	kv: KVNamespace,
	key: string,
	limit: number,
	windowSeconds: number,
	now = Date.now()
) {
	const window = Math.floor(now / 1000 / windowSeconds);
	const k = `rl:${key}:${window}`;
	const current = Number((await kv.get(k)) ?? 0);
	if (current >= limit) return { allowed: false, remaining: 0 };
	await kv.put(k, String(current + 1), { expirationTtl: windowSeconds + 60 });
	return { allowed: true, remaining: limit - current - 1 };
}
