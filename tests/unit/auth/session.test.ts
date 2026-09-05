import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, schema } from '$lib/server/db';
import {
	SESSION_RENEW_BELOW_MS,
	SESSION_TTL_MS,
	createSession,
	invalidateAllUserSessions,
	invalidateSession,
	sessionIdFromToken,
	validateSessionToken
} from '$lib/server/auth/session';

const db = createDb(env.DB);
const kv = env.SESSIONS;
const DAY = 24 * 60 * 60 * 1000;

beforeEach(async () => {
	await db
		.insert(schema.users)
		.values({ id: 'u1', displayName: 'Rina Sultana', onboardedAt: new Date() })
		.onConflictDoNothing();
});

describe('sessions', () => {
	it('create then validate returns the user and mirrors into KV', async () => {
		const { token, id } = await createSession(db, kv, 'u1');
		expect(id).toBe(sessionIdFromToken(token));
		const v = await validateSessionToken(db, kv, token);
		expect(v?.user).toMatchObject({ id: 'u1', displayName: 'Rina Sultana', onboarded: true });
		expect(await kv.get(`sess:${id}`)).not.toBeNull();
		expect(v?.renewed).toBe(false);
	});

	it('the raw token never touches the database', async () => {
		const { token, id } = await createSession(db, kv, 'u1');
		const rows = await env.DB.prepare('SELECT id FROM sessions').all<{ id: string }>();
		expect(rows.results.map((r: { id: string }) => r.id)).toContain(id);
		expect(rows.results.map((r: { id: string }) => r.id)).not.toContain(token);
	});

	it('an expired session returns null and is deleted', async () => {
		const start = Date.now();
		const { token, id } = await createSession(db, kv, 'u1', start);
		const v = await validateSessionToken(db, kv, token, start + SESSION_TTL_MS + 1);
		expect(v).toBeNull();
		expect(await kv.get(`sess:${id}`)).toBeNull();
		const row = await env.DB.prepare('SELECT id FROM sessions WHERE id = ?').bind(id).first();
		expect(row).toBeNull();
	});

	it('falls back to D1 when KV is cold and repopulates it', async () => {
		const { token, id } = await createSession(db, kv, 'u1');
		await kv.delete(`sess:${id}`);
		const v = await validateSessionToken(db, kv, token);
		expect(v?.user.id).toBe('u1');
		expect(await kv.get(`sess:${id}`)).not.toBeNull();
	});

	it('renews when fewer than 15 days remain', async () => {
		const start = Date.now();
		const { token, id } = await createSession(db, kv, 'u1', start);
		const later = start + SESSION_TTL_MS - SESSION_RENEW_BELOW_MS + DAY;
		const v = await validateSessionToken(db, kv, token, later);
		expect(v?.renewed).toBe(true);
		expect(v!.expiresAt.getTime()).toBe(later + SESSION_TTL_MS);
		const row = await env.DB.prepare('SELECT expires_at FROM sessions WHERE id = ?')
			.bind(id)
			.first<{ expires_at: number }>();
		expect(row?.expires_at).toBe(later + SESSION_TTL_MS);
	});

	it('does not renew when plenty of time remains', async () => {
		const start = Date.now();
		const { token } = await createSession(db, kv, 'u1', start);
		const v = await validateSessionToken(db, kv, token, start + DAY);
		expect(v?.renewed).toBe(false);
	});

	it('invalidate removes both KV and D1 rows', async () => {
		const { token, id } = await createSession(db, kv, 'u1');
		await invalidateSession(db, kv, id);
		expect(await validateSessionToken(db, kv, token)).toBeNull();
	});

	it('invalidateAllUserSessions logs out every device', async () => {
		const a = await createSession(db, kv, 'u1');
		const b = await createSession(db, kv, 'u1');
		await invalidateAllUserSessions(db, kv, 'u1');
		expect(await validateSessionToken(db, kv, a.token)).toBeNull();
		expect(await validateSessionToken(db, kv, b.token)).toBeNull();
	});

	it('garbage tokens validate to null', async () => {
		expect(await validateSessionToken(db, kv, 'not-a-real-token')).toBeNull();
	});
});
