import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { eq } from 'drizzle-orm';
import type { KVNamespace } from '@cloudflare/workers-types';
import type { Cookies } from '@sveltejs/kit';
import { schema, type Db } from '../db';
import type { SessionUser } from './types';

export const SESSION_COOKIE = 'ss_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_RENEW_BELOW_MS = 15 * 24 * 60 * 60 * 1000;

type KvSession = { userId: string; expiresAt: number };

export function generateSessionToken(): string {
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	return encodeBase32LowerCaseNoPadding(bytes);
}

export function sessionIdFromToken(token: string): string {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export async function createSession(db: Db, kv: KVNamespace, userId: string, now = Date.now()) {
	const token = generateSessionToken();
	const id = sessionIdFromToken(token);
	const expiresAt = new Date(now + SESSION_TTL_MS);
	await db.insert(schema.sessions).values({ id, userId, expiresAt });
	await kv.put(
		`sess:${id}`,
		JSON.stringify({ userId, expiresAt: expiresAt.getTime() } satisfies KvSession),
		{
			expirationTtl: Math.ceil(SESSION_TTL_MS / 1000)
		}
	);
	return { token, id, expiresAt };
}

export interface ValidatedSession {
	sessionId: string;
	user: SessionUser;
	expiresAt: Date;
	renewed: boolean;
}

export async function validateSessionToken(
	db: Db,
	kv: KVNamespace,
	token: string,
	now = Date.now()
): Promise<ValidatedSession | null> {
	const id = sessionIdFromToken(token);
	let userId: string;
	let expiresAt: number;

	const cached = await kv.get<KvSession>(`sess:${id}`, 'json');
	if (cached) {
		userId = cached.userId;
		expiresAt = cached.expiresAt;
	} else {
		const row = await db.query.sessions.findFirst({ where: eq(schema.sessions.id, id) });
		if (!row) return null;
		userId = row.userId;
		expiresAt = row.expiresAt.getTime();
	}

	if (expiresAt <= now) {
		await invalidateSession(db, kv, id);
		return null;
	}

	const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
	if (!user || user.deletedAt) {
		await invalidateSession(db, kv, id);
		return null;
	}

	let renewed = false;
	if (expiresAt - now < SESSION_RENEW_BELOW_MS) {
		expiresAt = now + SESSION_TTL_MS;
		await db
			.update(schema.sessions)
			.set({ expiresAt: new Date(expiresAt) })
			.where(eq(schema.sessions.id, id));
		renewed = true;
	}
	if (!cached || renewed) {
		await kv.put(`sess:${id}`, JSON.stringify({ userId, expiresAt } satisfies KvSession), {
			expirationTtl: Math.max(60, Math.ceil((expiresAt - now) / 1000))
		});
	}

	return {
		sessionId: id,
		expiresAt: new Date(expiresAt),
		renewed,
		user: {
			id: user.id,
			displayName: user.displayName,
			avatarUrl: user.avatarUrl,
			onboarded: user.onboardedAt !== null
		}
	};
}

export async function invalidateSession(db: Db, kv: KVNamespace, sessionId: string) {
	await Promise.all([
		db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId)),
		kv.delete(`sess:${sessionId}`)
	]);
}

export async function invalidateAllUserSessions(db: Db, kv: KVNamespace, userId: string) {
	const rows = await db
		.select({ id: schema.sessions.id })
		.from(schema.sessions)
		.where(eq(schema.sessions.userId, userId));
	await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
	await Promise.all(rows.map((r) => kv.delete(`sess:${r.id}`)));
}

export function setSessionCookie(
	cookies: Cookies,
	token: string,
	expiresAt: Date,
	secure: boolean
) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		expires: expiresAt
	});
}

export function clearSessionCookie(cookies: Cookies, secure: boolean) {
	cookies.set(SESSION_COOKIE, '', {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: 0
	});
}
