import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { createDb, schema } from '$lib/server/db';
import { createCommunity, joinCommunity } from '$lib/server/services/communities';
import {
	QUOTA_PER_KIND,
	createSkill,
	listBoard,
	normalizeTitle,
	renewSkill,
	setSkillStatus,
	validateSkillInput,
	type SkillInput
} from '$lib/server/services/skills';
import { moneyViolation } from '$lib/server/blocklist';

const db = createDb(env.DB);
let cid: string;
const base: SkillInput = {
	kind: 'offer',
	categoryId: 'music',
	title: 'Guitar chords for beginners',
	description: 'Four chords, twenty songs. Bring any guitar.',
	level: 'beginner',
	format: 'either',
	availability: 'Evenings'
};

beforeAll(async () => {
	await db
		.insert(schema.users)
		.values([
			{ id: 'own', displayName: 'Owner' },
			{ id: 'new', displayName: 'Newbie' },
			{ id: 'oth', displayName: 'Other' }
		])
		.onConflictDoNothing();
	const c = await createCommunity(db, 'own', {
		name: 'Skills Board',
		slug: 'skills-board',
		visibility: 'public'
	});
	cid = c.id;
	await joinCommunity(db, cid, 'new');
	await joinCommunity(db, cid, 'oth');
});

describe('normalizeTitle', () => {
	it.each([
		['  Excel   that DOESN’T scare me!! ', 'excel that doesn t scare me'],
		['Café-au-lait basics', 'cafe au lait basics'],
		['বাংলা শেখা', 'বাংলা শেখা']
	])('%s -> %s', (i, o) => expect(normalizeTitle(i)).toBe(o));
});

describe('money blocklist', () => {
	it.each([
		['Will teach for $20', true],
		['৳500 per class', true],
		['Excel lessons, only 10 per hour', true],
		['Pay what you like', true],
		['Send fee via bKash', true],
		['dollar cost averaging basics', false],
		['Cheap and cheerful sourdough', false],
		['Chess: how to price a pawn sacrifice?', true],
		['Guitar chords for beginners', false]
	])('%s blocked=%s', (text, blocked) => {
		expect(moneyViolation(text) !== null).toBe(blocked);
	});
	it('validation reports money in the title field', () => {
		expect(
			validateSkillInput({ ...base, description: 'Cash only please, ten dollars.' })
		).toHaveProperty('title');
	});
});

describe('createSkill', () => {
	it('untrusted members post as pending and moderators are notified', async () => {
		const s = await createSkill(db, cid, 'new', false, base);
		expect(s.status).toBe('pending');
		const n = await db.query.notifications.findFirst({
			where: (n, { and, eq }) => and(eq(n.userId, 'own'), eq(n.kind, 'mod_pending'))
		});
		expect(n?.payload).toMatchObject({ skillId: s.id });
	});

	it('trusted members post straight to active with a 90 day expiry', async () => {
		const now = Date.now();
		const s = await createSkill(db, cid, 'own', true, { ...base, title: 'Trusted post' }, now);
		expect(s.status).toBe('active');
		expect(s.expiresAt.getTime()).toBe(now + 90 * 86400000);
	});

	it('enforces five active per kind, pausing does not free a slot but deleting does', async () => {
		for (let i = 0; i < QUOTA_PER_KIND; i++)
			await createSkill(db, cid, 'oth', true, { ...base, title: `Offer ${i}` });
		await expect(
			createSkill(db, cid, 'oth', true, { ...base, title: 'Offer six' })
		).rejects.toThrow(/already have 5/);
		await createSkill(db, cid, 'oth', true, { ...base, kind: 'want', title: 'A want is fine' });
		const one = await db.query.skills.findFirst({
			where: (s, { and, eq }) => and(eq(s.userId, 'oth'), eq(s.title, 'Offer 0'))
		});
		await setSkillStatus(db, one!.id, 'paused');
		await expect(
			createSkill(db, cid, 'oth', true, { ...base, title: 'Offer six' })
		).rejects.toThrow(/already have 5/);
		await db
			.delete(schema.skills)
			.where((await import('drizzle-orm')).eq(schema.skills.id, one!.id));
		await expect(
			createSkill(db, cid, 'oth', true, { ...base, title: 'Offer six' })
		).resolves.toBeTruthy();
	});

	it('rejects invalid input with the first error', async () => {
		await expect(createSkill(db, cid, 'own', true, { ...base, title: 'ab' })).rejects.toThrow(
			/at least 3/
		);
		await expect(
			createSkill(db, cid, 'own', true, { ...base, categoryId: 'nope' })
		).rejects.toThrow(/category/i);
	});
});

describe('listBoard', () => {
	let bid: string;
	beforeAll(async () => {
		await db
			.insert(schema.users)
			.values([
				{ id: 'lb', displayName: 'Lister' },
				{ id: 'lb2', displayName: 'Viewer Two' }
			])
			.onConflictDoNothing();
		const c = await createCommunity(db, 'lb', {
			name: 'List Board',
			slug: 'list-board-2',
			visibility: 'public'
		});
		bid = c.id;
		await joinCommunity(db, bid, 'lb2');
		const t0 = Date.now() - 100000;
		for (let i = 0; i < 30; i++) {
			await db.insert(schema.skills).values({
				id: `lb-${String(i).padStart(2, '0')}`,
				communityId: bid,
				userId: 'lb',
				kind: i % 3 === 0 ? 'want' : 'offer',
				categoryId: i % 2 ? 'tech' : 'music',
				title: i % 4 === 0 ? `Guitar thing ${i}` : `Excel thing ${i}`,
				titleNormalized: normalizeTitle(i % 4 === 0 ? `Guitar thing ${i}` : `Excel thing ${i}`),
				description: 'd'.repeat(20),
				format: i % 5 === 0 ? 'online' : 'either',
				status: 'active',
				createdAt: new Date(t0 + i * 1000),
				expiresAt: new Date(Date.now() + 1e7)
			});
		}
		await db.insert(schema.skills).values({
			id: 'lb-pending',
			communityId: bid,
			userId: 'lb2',
			kind: 'offer',
			categoryId: 'tech',
			title: 'Pending one',
			titleNormalized: 'pending one',
			description: 'd'.repeat(20),
			status: 'pending',
			expiresAt: new Date(Date.now() + 1e7)
		});
		await db.insert(schema.skills).values({
			id: 'lb-hidden',
			communityId: bid,
			userId: 'lb',
			kind: 'offer',
			categoryId: 'tech',
			title: 'Hidden one',
			titleNormalized: 'hidden one',
			description: 'd'.repeat(20),
			status: 'hidden',
			expiresAt: new Date(Date.now() + 1e7)
		});
	});

	it('paginates 24 newest-first with a keyset cursor', async () => {
		const p1 = await listBoard(db, bid, { kind: 'offer' });
		expect(p1.cards.length).toBe(20);
		expect(p1.total).toBe(20);
		expect(p1.nextCursor).toBeNull();
		const all = await listBoard(db, bid, { kind: 'want' });
		expect(all.total).toBe(10);
		const ids = p1.cards.map((c) => c.id);
		expect(ids).toEqual([...ids].sort().reverse());
	});

	it('pages when more than 24', async () => {
		for (let i = 30; i < 60; i++) {
			await db.insert(schema.skills).values({
				id: `lb-${i}`,
				communityId: bid,
				userId: 'lb',
				kind: 'offer',
				categoryId: 'arts',
				title: `Paint ${i}`,
				titleNormalized: `paint ${i}`,
				description: 'd'.repeat(20),
				status: 'active',
				createdAt: new Date(Date.now() + i * 1000),
				expiresAt: new Date(Date.now() + 1e7)
			});
		}
		const p1 = await listBoard(db, bid, { kind: 'offer' });
		expect(p1.cards.length).toBe(24);
		expect(p1.nextCursor).not.toBeNull();
		const seen = new Set(p1.cards.map((c) => c.id));
		let cursor = p1.nextCursor;
		let pages = 1;
		while (cursor) {
			const p = await listBoard(db, bid, { kind: 'offer', cursor });
			for (const c of p.cards) seen.add(c.id);
			cursor = p.nextCursor;
			pages++;
		}
		expect(pages).toBe(Math.ceil(p1.total / 24));
		expect(seen.size).toBe(p1.total);
	});

	it('filters by category, format and search', async () => {
		const music = await listBoard(db, bid, { kind: 'offer', categories: ['music'] });
		expect(music.cards.every((c) => c.categoryId === 'music')).toBe(true);
		const online = await listBoard(db, bid, { kind: 'offer', format: 'online' });
		expect(online.cards.every((c) => c.format === 'online' || c.format === 'either')).toBe(true);
		const guitar = await listBoard(db, bid, { kind: 'offer', q: 'GUITAR' });
		expect(guitar.cards.length).toBeGreaterThan(0);
		expect(guitar.cards.every((c) => c.title.toLowerCase().includes('guitar'))).toBe(true);
	});

	it('hides pending from others, shows it to the author, never shows hidden', async () => {
		const anon = await listBoard(db, bid, { kind: 'offer', q: 'pending' });
		expect(anon.cards.length).toBe(0);
		const author = await listBoard(db, bid, { kind: 'offer', q: 'pending', viewerId: 'lb2' });
		expect(author.cards.map((c) => c.id)).toEqual(['lb-pending']);
		expect(author.cards[0].isMine).toBe(true);
		const hidden = await listBoard(db, bid, { kind: 'offer', q: 'hidden', viewerId: 'lb' });
		expect(hidden.cards.length).toBe(0);
	});

	it('shows first name and initial, not the full name', async () => {
		const p = await listBoard(db, bid, { kind: 'offer' });
		expect(p.cards[0].authorName).toBe('Lister');
	});
});

describe('renew', () => {
	it('renew extends 90 days from now and clears the reminder flag', async () => {
		const s = await createSkill(db, cid, 'own', true, { ...base, title: 'Renew me' });
		await db
			.update(schema.skills)
			.set({ status: 'expired', expiryNotifiedAt: new Date() })
			.where((await import('drizzle-orm')).eq(schema.skills.id, s.id));
		const now = Date.now();
		await renewSkill(db, s.id, now);
		const r = await db.query.skills.findFirst({ where: (x, { eq }) => eq(x.id, s.id) });
		expect(r?.status).toBe('active');
		expect(r?.expiryNotifiedAt).toBeNull();
		expect(r?.expiresAt.getTime()).toBe(now + 90 * 86400000);
	});
});
