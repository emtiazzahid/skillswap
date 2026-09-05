import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { createDb, schema } from '$lib/server/db';
import {
	computeMatches,
	getMatches,
	bumpCommunityVersion,
	pairScore,
	type MatchSkill,
	type MatchPerson
} from '$lib/server/services/matching';
import { createCommunity, joinCommunity, setBanned } from '$lib/server/services/communities';
import { normalizeTitle } from '$lib/server/services/skills';

const mk = (
	o: Partial<MatchSkill> & {
		id: string;
		userId: string;
		kind: 'offer' | 'want';
		title: string;
		categoryId: string;
	}
): MatchSkill => ({
	categoryName: o.categoryId,
	titleNormalized: normalizeTitle(o.title),
	format: 'either',
	createdAt: 1,
	description: '',
	...o
});
const people = new Map<string, MatchPerson>([
	['b', { userId: 'b', name: 'Bee', avatarUrl: null }],
	['c', { userId: 'c', name: 'Cee', avatarUrl: null }],
	['d', { userId: 'd', name: 'Dee', avatarUrl: null }]
]);

describe('computeMatches (pure)', () => {
	const mine = [
		mk({ id: 'm1', userId: 'a', kind: 'offer', title: 'Excel for shops', categoryId: 'tech' }),
		mk({ id: 'm2', userId: 'a', kind: 'want', title: 'Guitar chords', categoryId: 'music' })
	];

	it('exact reciprocal scores highest and comes first', () => {
		const others = [
			mk({ id: 'b1', userId: 'b', kind: 'want', title: 'Excel for shops', categoryId: 'tech' }),
			mk({ id: 'b2', userId: 'b', kind: 'offer', title: 'Guitar chords', categoryId: 'music' }),
			mk({ id: 'c1', userId: 'c', kind: 'want', title: 'Spreadsheets', categoryId: 'tech' }),
			mk({ id: 'c2', userId: 'c', kind: 'offer', title: 'Ukulele', categoryId: 'music' })
		];
		const r = computeMatches('a', mine, others, people);
		expect(r.reciprocal.map((m) => m.person.userId)).toEqual(['b', 'c']);
		expect(r.reciprocal[0].score).toBeGreaterThan(r.reciprocal[1].score);
		expect(r.reciprocal[0].why).toMatch(/Strong match/);
		expect(r.reciprocal[0]).toMatchObject({
			iTeach: { id: 'm1' },
			theyWant: { id: 'b1' },
			theyTeach: { id: 'b2' },
			iWant: { id: 'm2' }
		});
	});

	it('category-only match beats no match; different category with weak title is excluded', () => {
		const others = [
			mk({ id: 'b1', userId: 'b', kind: 'want', title: 'Anything numeric', categoryId: 'tech' }),
			mk({ id: 'b2', userId: 'b', kind: 'offer', title: 'Piano', categoryId: 'music' }),
			mk({ id: 'c1', userId: 'c', kind: 'want', title: 'Knitting', categoryId: 'crafts' }),
			mk({ id: 'c2', userId: 'c', kind: 'offer', title: 'Piano', categoryId: 'music' })
		];
		const r = computeMatches('a', mine, others, people);
		expect(r.reciprocal.map((m) => m.person.userId)).toEqual(['b']);
		expect(r.gifts).toEqual([]);
	});

	it('format incompatibility lowers the score', () => {
		const a = pairScore(
			mk({
				id: 'x',
				userId: 'a',
				kind: 'offer',
				title: 'Excel',
				categoryId: 'tech',
				format: 'online'
			}),
			mk({
				id: 'y',
				userId: 'b',
				kind: 'want',
				title: 'Excel',
				categoryId: 'tech',
				format: 'in_person'
			})
		);
		const b = pairScore(
			mk({
				id: 'x',
				userId: 'a',
				kind: 'offer',
				title: 'Excel',
				categoryId: 'tech',
				format: 'online'
			}),
			mk({
				id: 'y',
				userId: 'b',
				kind: 'want',
				title: 'Excel',
				categoryId: 'tech',
				format: 'either'
			})
		);
		expect(b - a).toBeCloseTo(0.25, 5);
	});

	it('a user with no wants only gets one-way gifts', () => {
		const others = [
			mk({ id: 'b1', userId: 'b', kind: 'want', title: 'Excel', categoryId: 'tech' }),
			mk({ id: 'b2', userId: 'b', kind: 'offer', title: 'Guitar', categoryId: 'music' })
		];
		const r = computeMatches('a', [mine[0]], others, people);
		expect(r.reciprocal).toEqual([]);
		expect(r.gifts.map((g) => g.person.userId)).toEqual(['b']);
	});

	it('excludes my own posts and unknown people; caps at 20; ordering is deterministic', () => {
		const others: MatchSkill[] = [
			mk({ id: 'self', userId: 'a', kind: 'want', title: 'Excel', categoryId: 'tech' })
		];
		const many = new Map(people);
		for (let i = 0; i < 30; i++) {
			many.set(`u${i}`, { userId: `u${i}`, name: `U${i}`, avatarUrl: null });
			others.push(
				mk({
					id: `w${i}`,
					userId: `u${i}`,
					kind: 'want',
					title: 'Excel',
					categoryId: 'tech',
					createdAt: i
				})
			);
		}
		others.push(
			mk({ id: 'ghost', userId: 'ghost', kind: 'want', title: 'Excel', categoryId: 'tech' })
		);
		const r1 = computeMatches('a', mine, others, many);
		const r2 = computeMatches('a', mine, others, many);
		expect(r1.gifts.length).toBe(20);
		expect(r1.gifts.map((g) => g.person.userId)).toEqual(r2.gifts.map((g) => g.person.userId));
		expect(r1.gifts[0].person.userId).toBe('u29');
		expect(r1.gifts.some((g) => g.person.userId === 'a' || g.person.userId === 'ghost')).toBe(
			false
		);
	});
});

describe('getMatches (db + KV cache)', () => {
	const db = createDb(env.DB);
	let cid: string;
	beforeAll(async () => {
		await db
			.insert(schema.users)
			.values([
				{ id: 'a', displayName: 'Alice A' },
				{ id: 'b', displayName: 'Bob B' },
				{ id: 'z', displayName: 'Zed Z' }
			])
			.onConflictDoNothing();
		const c = await createCommunity(db, 'a', {
			name: 'Match Board',
			slug: 'match-board',
			visibility: 'public'
		});
		cid = c.id;
		await joinCommunity(db, cid, 'b');
		await joinCommunity(db, cid, 'z');
		const row = (
			id: string,
			userId: string,
			kind: 'offer' | 'want',
			title: string,
			categoryId: string,
			status = 'active'
		) => ({
			id,
			communityId: cid,
			userId,
			kind,
			categoryId,
			title,
			titleNormalized: normalizeTitle(title),
			description: 'd'.repeat(12),
			status: status as 'active',
			expiresAt: new Date(Date.now() + 1e7)
		});
		await db
			.insert(schema.skills)
			.values([
				row('a-o', 'a', 'offer', 'Excel for shops', 'tech'),
				row('a-w', 'a', 'want', 'Guitar chords', 'music'),
				row('b-w', 'b', 'want', 'Excel that does not scare me', 'tech'),
				row('b-o', 'b', 'offer', 'Guitar chords for beginners', 'music'),
				row('b-paused', 'b', 'offer', 'Guitar advanced', 'music', 'paused'),
				row('z-w', 'z', 'want', 'Excel', 'tech'),
				row('z-o', 'z', 'offer', 'Guitar', 'music')
			]);
		await setBanned(db, cid, 'owner', 'z', true);
	});

	it('finds the reciprocal match, ignores paused notices and banned members, and caches by community version', async () => {
		const r = await getMatches(db, env.SESSIONS, cid, 'a');
		expect(r.reciprocal.map((m) => m.person.userId)).toEqual(['b']);
		expect(r.reciprocal[0].person.name).toBe('Bob B.');
		expect(r.reciprocal[0].theyTeach.id).toBe('b-o');
		const again = await getMatches(db, env.SESSIONS, cid, 'a');
		expect(again.computedAt).toBe(r.computedAt);
		await bumpCommunityVersion(env.SESSIONS, cid);
		await new Promise((r) => setTimeout(r, 2));
		const fresh = await getMatches(db, env.SESSIONS, cid, 'a');
		expect(fresh.computedAt).toBeGreaterThanOrEqual(r.computedAt);
	});
});
