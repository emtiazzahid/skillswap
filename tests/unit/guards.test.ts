import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { createDb, schema } from '$lib/server/db';
import { loadAccess, requireMember, requireModerator, requireOwner } from '$lib/server/access';
import {
	createCommunity,
	joinCommunity,
	setBanned,
	setModerator
} from '$lib/server/services/communities';

const db = createDb(env.DB);
const ev = (userId: string | null) => ({
	locals: {
		user: userId ? { id: userId, displayName: 'x', avatarUrl: null, onboarded: true } : null,
		sessionId: null
	},
	url: new URL('http://localhost/c/x/post')
});

beforeAll(async () => {
	await db
		.insert(schema.users)
		.values([
			{ id: 'own', displayName: 'Owner' },
			{ id: 'mod', displayName: 'Mod' },
			{ id: 'mem', displayName: 'Mem' },
			{ id: 'out', displayName: 'Outsider' },
			{ id: 'ban', displayName: 'Banned' }
		])
		.onConflictDoNothing();
	const pub = await createCommunity(db, 'own', {
		name: 'Guard Public',
		slug: 'guard-public',
		visibility: 'public'
	});
	const inv = await createCommunity(db, 'own', {
		name: 'Guard Invite',
		slug: 'guard-invite',
		visibility: 'invite'
	});
	for (const c of [pub, inv]) {
		await joinCommunity(db, c.id, 'mod');
		await joinCommunity(db, c.id, 'mem');
		await joinCommunity(db, c.id, 'ban');
		await setModerator(db, c.id, 'mod', true);
		await setBanned(db, c.id, 'owner', 'ban', true);
	}
});

const status = async (p: Promise<unknown>) => {
	try {
		await p;
		return 200;
	} catch (e) {
		return (e as { status?: number }).status ?? 500;
	}
};

describe('access', () => {
	it('unknown or deleted boards are 404', async () => {
		expect(await status(loadAccess(db, ev(null), 'nope'))).toBe(404);
	});

	it('public boards are visible to visitors and outsiders', async () => {
		const a = await loadAccess(db, ev(null), 'guard-public');
		expect(a.isMember).toBe(false);
		const b = await loadAccess(db, ev('out'), 'guard-public');
		expect(b.isMember).toBe(false);
	});

	it('invite-only boards are 404 to outsiders, visible to members', async () => {
		expect(await status(loadAccess(db, ev(null), 'guard-invite'))).toBe(404);
		expect(await status(loadAccess(db, ev('out'), 'guard-invite'))).toBe(404);
		const a = await loadAccess(db, ev('mem'), 'guard-invite');
		expect(a.isMember).toBe(true);
	});

	it('banned members get 403 on either kind of board', async () => {
		expect(await status(loadAccess(db, ev('ban'), 'guard-public'))).toBe(403);
		expect(await status(loadAccess(db, ev('ban'), 'guard-invite'))).toBe(403);
	});

	it('roles map to capabilities', async () => {
		expect(await loadAccess(db, ev('own'), 'guard-public')).toMatchObject({
			isOwner: true,
			canModerate: true
		});
		expect(await loadAccess(db, ev('mod'), 'guard-public')).toMatchObject({
			isOwner: false,
			canModerate: true
		});
		expect(await loadAccess(db, ev('mem'), 'guard-public')).toMatchObject({
			isOwner: false,
			canModerate: false,
			isMember: true
		});
	});

	it('requireMember redirects visitors to login and outsiders to join', async () => {
		const a = await loadAccess(db, ev(null), 'guard-public');
		expect(await status(Promise.resolve().then(() => requireMember(a, ev(null))))).toBe(303);
		const b = await loadAccess(db, ev('out'), 'guard-public');
		try {
			requireMember(b, ev('out'));
		} catch (e) {
			expect((e as { location: string }).location).toContain('/c/guard-public/join?next=');
		}
	});

	it('requireModerator and requireOwner return 403 below rank', async () => {
		const mem = await loadAccess(db, ev('mem'), 'guard-public');
		const mod = await loadAccess(db, ev('mod'), 'guard-public');
		expect(await status(Promise.resolve().then(() => requireModerator(mem)))).toBe(403);
		expect(await status(Promise.resolve().then(() => requireModerator(mod)))).toBe(200);
		expect(await status(Promise.resolve().then(() => requireOwner(mod)))).toBe(403);
	});
});
