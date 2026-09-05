import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { createDb, schema } from '$lib/server/db';
import {
	CommunityError,
	createCommunity,
	joinCommunity,
	leaveCommunity,
	listPublicCommunities,
	setBanned,
	setModerator,
	transferOwnership,
	validateCommunityInput
} from '$lib/server/services/communities';
import { slugify, validateSlug } from '$lib/server/slug';

const db = createDb(env.DB);

beforeAll(async () => {
	await db
		.insert(schema.users)
		.values([
			{ id: 'own', displayName: 'Owner' },
			{ id: 'mod', displayName: 'Mod' },
			{ id: 'mem', displayName: 'Member' },
			{ id: 'mem2', displayName: 'Member Two' }
		])
		.onConflictDoNothing();
});

describe('slugify', () => {
	it.each([
		['Mirpur Neighbours', 'mirpur-neighbours'],
		['  Late--night   Devs!! ', 'late-night-devs'],
		['Café São Paulo', 'cafe-sao-paulo'],
		['a'.repeat(50), 'a'.repeat(32)]
	])('%s -> %s', (i, o) => expect(slugify(i)).toBe(o));

	it('rejects short, long, malformed and reserved slugs', () => {
		expect(validateSlug('ab')).toMatch(/at least/);
		expect(validateSlug('a'.repeat(33))).toMatch(/at most/);
		expect(validateSlug('bad--slug')).toMatch(/single hyphens/);
		expect(validateSlug('-lead')).toMatch(/single hyphens/);
		expect(validateSlug('settings')).toMatch(/reserved/);
		expect(validateSlug('mirpur-1')).toBeNull();
	});
});

describe('communities', () => {
	it('validates input', () => {
		expect(validateCommunityInput({ name: 'ab', visibility: 'public' })).toHaveProperty('name');
		expect(
			validateCommunityInput({ name: 'Fine Board', visibility: 'public', tagline: 'x'.repeat(141) })
		).toHaveProperty('tagline');
		expect(validateCommunityInput({ name: 'Fine Board', visibility: 'public' })).toEqual({});
	});

	it('creates a board with the creator as trusted owner', async () => {
		const c = await createCommunity(db, 'own', {
			name: 'Mirpur Neighbours',
			visibility: 'public',
			areaLabel: 'Mirpur'
		});
		expect(c.slug).toBe('mirpur-neighbours');
		const m = await db.query.memberships.findFirst({
			where: (m, { and, eq }) => and(eq(m.communityId, c.id), eq(m.userId, 'own'))
		});
		expect(m?.role).toBe('owner');
		expect(m?.trustedAt).toBeInstanceOf(Date);
	});

	it('refuses a duplicate slug', async () => {
		await createCommunity(db, 'own', { name: 'Dup', slug: 'dup-board', visibility: 'public' });
		await expect(
			createCommunity(db, 'own', { name: 'Dup 2', slug: 'dup-board', visibility: 'public' })
		).rejects.toThrow(/taken/);
	});

	it('join is idempotent and banned users cannot rejoin', async () => {
		const c = await createCommunity(db, 'own', { name: 'Join Test', visibility: 'public' });
		const a = await joinCommunity(db, c.id, 'mem');
		const b = await joinCommunity(db, c.id, 'mem');
		expect(a.joinedAt.getTime()).toBe(b.joinedAt.getTime());
		await setBanned(db, c.id, 'owner', 'mem', true);
		await expect(joinCommunity(db, c.id, 'mem')).rejects.toThrow(/removed/);
	});

	it('owner cannot leave; members can', async () => {
		const c = await createCommunity(db, 'own', { name: 'Leave Test', visibility: 'public' });
		await joinCommunity(db, c.id, 'mem');
		await expect(leaveCommunity(db, c.id, 'own')).rejects.toBeInstanceOf(CommunityError);
		await leaveCommunity(db, c.id, 'mem');
		expect(
			await db.query.memberships.findFirst({
				where: (m, { and, eq }) => and(eq(m.communityId, c.id), eq(m.userId, 'mem'))
			})
		).toBeUndefined();
	});

	it('moderators can ban members but not other moderators or the owner', async () => {
		const c = await createCommunity(db, 'own', { name: 'Ban Test', visibility: 'public' });
		await joinCommunity(db, c.id, 'mod');
		await joinCommunity(db, c.id, 'mem');
		await joinCommunity(db, c.id, 'mem2');
		await setModerator(db, c.id, 'mod', true);
		await setModerator(db, c.id, 'mem2', true);
		await setBanned(db, c.id, 'moderator', 'mem', true);
		await expect(setBanned(db, c.id, 'moderator', 'mem2', true)).rejects.toThrow(/role or above/);
		await expect(setBanned(db, c.id, 'owner', 'own', true)).rejects.toThrow(/owner/i);
		await setBanned(db, c.id, 'owner', 'mem2', true);
		const banned = await db.query.memberships.findFirst({
			where: (m, { and, eq }) => and(eq(m.communityId, c.id), eq(m.userId, 'mem2'))
		});
		expect(banned?.bannedAt).toBeInstanceOf(Date);
	});

	it('banning hides the member’s notices', async () => {
		const c = await createCommunity(db, 'own', { name: 'Hide Test', visibility: 'public' });
		await joinCommunity(db, c.id, 'mem');
		await db.insert(schema.skills).values({
			id: 'hs1',
			communityId: c.id,
			userId: 'mem',
			kind: 'offer',
			categoryId: 'tech',
			title: 'X',
			titleNormalized: 'x',
			description: 'd',
			expiresAt: new Date(Date.now() + 1e6)
		});
		await setBanned(db, c.id, 'owner', 'mem', true);
		const s = await db.query.skills.findFirst({ where: (s, { eq }) => eq(s.id, 'hs1') });
		expect(s?.status).toBe('hidden');
	});

	it('transfer requires a moderator and swaps roles', async () => {
		const c = await createCommunity(db, 'own', { name: 'Transfer Test', visibility: 'public' });
		await joinCommunity(db, c.id, 'mem');
		await expect(transferOwnership(db, c.id, 'own', 'mem')).rejects.toThrow(/moderator first/);
		await setModerator(db, c.id, 'mem', true);
		await transferOwnership(db, c.id, 'own', 'mem');
		const row = await db.query.communities.findFirst({ where: (x, { eq }) => eq(x.id, c.id) });
		expect(row?.ownerId).toBe('mem');
		const old = await db.query.memberships.findFirst({
			where: (m, { and, eq }) => and(eq(m.communityId, c.id), eq(m.userId, 'own'))
		});
		expect(old?.role).toBe('moderator');
	});

	it('public listing excludes invite-only and deleted boards and counts members', async () => {
		await createCommunity(db, 'own', {
			name: 'Public Listed',
			slug: 'public-listed',
			visibility: 'public'
		});
		await createCommunity(db, 'own', {
			name: 'Secret',
			slug: 'secret-board',
			visibility: 'invite'
		});
		const gone = await createCommunity(db, 'own', {
			name: 'Gone',
			slug: 'gone-board',
			visibility: 'public'
		});
		await db
			.update(schema.communities)
			.set({ deletedAt: new Date() })
			.where((await import('drizzle-orm')).eq(schema.communities.id, gone.id));
		const list = await listPublicCommunities(db);
		const slugs = list.map((c) => c.slug);
		expect(slugs).toContain('public-listed');
		expect(slugs).not.toContain('secret-board');
		expect(slugs).not.toContain('gone-board');
		expect(list.find((c) => c.slug === 'public-listed')?.members).toBe(1);
	});
});
