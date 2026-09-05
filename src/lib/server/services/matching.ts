import { and, eq, ne, isNull } from 'drizzle-orm';
import type { KVNamespace } from '@cloudflare/workers-types';
import { schema, type Db } from '../db';
import { dice } from './similarity';
import { publicName } from './users';

export interface MatchSkill {
	id: string;
	userId: string;
	kind: 'offer' | 'want';
	categoryId: string;
	categoryName: string;
	title: string;
	titleNormalized: string;
	format: 'in_person' | 'online' | 'either';
	createdAt: number;
	description: string;
}

export interface MatchPerson {
	userId: string;
	name: string;
	avatarUrl: string | null;
}

export interface ReciprocalMatch {
	person: MatchPerson;
	score: number;
	iTeach: MatchSkill; // my offer
	theyWant: MatchSkill; // their want that my offer satisfies
	theyTeach: MatchSkill; // their offer
	iWant: MatchSkill; // my want that their offer satisfies
	why: string;
}

export interface OneWayMatch {
	person: MatchPerson;
	score: number;
	iTeach: MatchSkill;
	theyWant: MatchSkill;
}

export interface MatchResult {
	reciprocal: ReciprocalMatch[];
	gifts: OneWayMatch[];
	computedAt: number;
}

export const MATCH_LIMIT = 20;
export const MATCH_CACHE_TTL_S = 600;

export function formatsCompatible(a: MatchSkill['format'], b: MatchSkill['format']) {
	return a === 'either' || b === 'either' || a === b;
}

/** Score an (offer, want) pair: same category 1.0, title similarity 0..1, compatible formats +0.25. */
export function pairScore(offer: MatchSkill, want: MatchSkill): number {
	let s = 0;
	if (offer.categoryId === want.categoryId) s += 1;
	s += dice(offer.titleNormalized, want.titleNormalized);
	if (formatsCompatible(offer.format, want.format)) s += 0.25;
	return s;
}

const MIN_PAIR = 1; // require at least a category match or a strong title overlap

/** Pure matching over in-memory rows. Deterministic ordering: score desc, then newest counterpart post. */
export function computeMatches(
	me: string,
	mine: MatchSkill[],
	others: MatchSkill[],
	people: Map<string, MatchPerson>
): MatchResult {
	const myOffers = mine.filter((s) => s.kind === 'offer');
	const myWants = mine.filter((s) => s.kind === 'want');
	const byUser = new Map<string, MatchSkill[]>();
	for (const s of others) {
		if (s.userId === me) continue;
		const list = byUser.get(s.userId) ?? [];
		list.push(s);
		byUser.set(s.userId, list);
	}

	const reciprocal: ReciprocalMatch[] = [];
	const gifts: OneWayMatch[] = [];

	for (const [userId, theirs] of byUser) {
		const person = people.get(userId);
		if (!person) continue;
		const theirWants = theirs.filter((s) => s.kind === 'want');
		const theirOffers = theirs.filter((s) => s.kind === 'offer');

		let bestGive: { score: number; iTeach: MatchSkill; theyWant: MatchSkill } | null = null;
		for (const o of myOffers)
			for (const w of theirWants) {
				const sc = pairScore(o, w);
				if (sc >= MIN_PAIR && (!bestGive || sc > bestGive.score))
					bestGive = { score: sc, iTeach: o, theyWant: w };
			}
		let bestGet: { score: number; theyTeach: MatchSkill; iWant: MatchSkill } | null = null;
		for (const o of theirOffers)
			for (const w of myWants) {
				const sc = pairScore(o, w);
				if (sc >= MIN_PAIR && (!bestGet || sc > bestGet.score))
					bestGet = { score: sc, theyTeach: o, iWant: w };
			}

		if (bestGive && bestGet) {
			const score = bestGive.score * bestGet.score;
			const why: string[] = [];
			if (
				bestGive.iTeach.categoryId === bestGive.theyWant.categoryId &&
				bestGet.theyTeach.categoryId === bestGet.iWant.categoryId
			)
				why.push('same category both ways');
			if (
				formatsCompatible(bestGive.iTeach.format, bestGive.theyWant.format) &&
				formatsCompatible(bestGet.theyTeach.format, bestGet.iWant.format)
			)
				why.push('formats line up');
			else why.push('check formats');
			reciprocal.push({
				person,
				iTeach: bestGive.iTeach,
				theyWant: bestGive.theyWant,
				theyTeach: bestGet.theyTeach,
				iWant: bestGet.iWant,
				score,
				why: (score >= 3 ? 'Strong match' : 'Good match') + ' · ' + why.join(' · ')
			});
		} else if (bestGive) {
			gifts.push({
				person,
				score: bestGive.score,
				iTeach: bestGive.iTeach,
				theyWant: bestGive.theyWant
			});
		}
	}

	const newest = (m: { theyWant: MatchSkill; theyTeach?: MatchSkill }) =>
		Math.max(m.theyWant.createdAt, m.theyTeach?.createdAt ?? 0);
	reciprocal.sort(
		(a, b) =>
			b.score - a.score || newest(b) - newest(a) || a.person.userId.localeCompare(b.person.userId)
	);
	gifts.sort(
		(a, b) =>
			b.score - a.score || newest(b) - newest(a) || a.person.userId.localeCompare(b.person.userId)
	);
	return {
		reciprocal: reciprocal.slice(0, MATCH_LIMIT),
		gifts: gifts.slice(0, MATCH_LIMIT),
		computedAt: Date.now()
	};
}

async function loadRows(db: Db, communityId: string, me: string) {
	const rows = await db
		.select({
			skill: schema.skills,
			categoryName: schema.categories.name,
			displayName: schema.users.displayName,
			avatarUrl: schema.users.avatarUrl,
			bannedAt: schema.memberships.bannedAt
		})
		.from(schema.skills)
		.innerJoin(schema.categories, eq(schema.skills.categoryId, schema.categories.id))
		.innerJoin(schema.users, eq(schema.skills.userId, schema.users.id))
		.innerJoin(
			schema.memberships,
			and(
				eq(schema.memberships.communityId, schema.skills.communityId),
				eq(schema.memberships.userId, schema.skills.userId)
			)
		)
		.where(
			and(
				eq(schema.skills.communityId, communityId),
				eq(schema.skills.status, 'active'),
				isNull(schema.memberships.bannedAt),
				ne(schema.users.id, '')
			)
		);
	const people = new Map<string, MatchPerson>();
	const mine: MatchSkill[] = [];
	const others: MatchSkill[] = [];
	for (const r of rows) {
		const s: MatchSkill = {
			id: r.skill.id,
			userId: r.skill.userId,
			kind: r.skill.kind,
			categoryId: r.skill.categoryId,
			categoryName: r.categoryName,
			title: r.skill.title,
			titleNormalized: r.skill.titleNormalized,
			format: r.skill.format,
			createdAt: r.skill.createdAt.getTime(),
			description: r.skill.description
		};
		if (s.userId === me) mine.push(s);
		else {
			others.push(s);
			if (!people.has(s.userId))
				people.set(s.userId, {
					userId: s.userId,
					name: publicName(r.displayName),
					avatarUrl: r.avatarUrl
				});
		}
	}
	return { mine, others, people };
}

export async function communityVersion(kv: KVNamespace, communityId: string) {
	return (await kv.get(`cv:${communityId}`)) ?? '0';
}

/** Call after any notice changes in a community so cached match lists go stale. */
export async function bumpCommunityVersion(kv: KVNamespace, communityId: string) {
	await kv.put(`cv:${communityId}`, String(Date.now()));
}

export async function getMatches(
	db: Db,
	kv: KVNamespace,
	communityId: string,
	me: string
): Promise<MatchResult> {
	const version = await communityVersion(kv, communityId);
	const key = `match:${communityId}:${me}:${version}`;
	const cached = await kv.get<MatchResult>(key, 'json');
	if (cached) return cached;
	const { mine, others, people } = await loadRows(db, communityId, me);
	const result = computeMatches(me, mine, others, people);
	await kv.put(key, JSON.stringify(result), { expirationTtl: MATCH_CACHE_TTL_S });
	return result;
}
