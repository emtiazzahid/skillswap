import { and, desc, eq, inArray, or, count } from 'drizzle-orm';
import { schema, type Db } from '../db';
import { newId } from '../ids';
import { notify } from './notifications';
import { publicName } from './users';

export class SwapError extends Error {}

export type SwapStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

const TRANSITIONS: Record<string, SwapStatus[]> = {
	pending: ['accepted', 'declined', 'cancelled'],
	accepted: ['completed', 'cancelled'],
	declined: [],
	completed: [],
	cancelled: []
};

export function canTransition(from: SwapStatus, to: SwapStatus) {
	return TRANSITIONS[from]?.includes(to) ?? false;
}

export const NOTE_MAX = 300;

/**
 * Ask the owner of `targetSkillId` for a swap. The target can be their offer (I want to learn it)
 * or their want (I can teach it). `offerSkillId` is the requester's own active offer, or null for "just asking".
 */
export async function requestSwap(
	db: Db,
	communityId: string,
	fromUserId: string,
	targetSkillId: string,
	offerSkillId: string | null,
	note: string
) {
	const target = await db.query.skills.findFirst({ where: eq(schema.skills.id, targetSkillId) });
	if (!target || target.communityId !== communityId || target.status !== 'active')
		throw new SwapError('That notice is no longer on the board.');
	if (target.userId === fromUserId) throw new SwapError('You cannot request a swap with yourself.');
	if (note.trim().length > NOTE_MAX)
		throw new SwapError(`Notes are at most ${NOTE_MAX} characters.`);
	if (offerSkillId) {
		const mine = await db.query.skills.findFirst({ where: eq(schema.skills.id, offerSkillId) });
		if (
			!mine ||
			mine.userId !== fromUserId ||
			mine.communityId !== communityId ||
			mine.kind !== 'offer' ||
			mine.status !== 'active'
		)
			throw new SwapError('Pick one of your own active offers, or ask for nothing.');
	}
	const dup = await db.query.swapRequests.findFirst({
		where: and(
			eq(schema.swapRequests.fromUserId, fromUserId),
			eq(schema.swapRequests.toUserId, target.userId),
			eq(schema.swapRequests.wantSkillId, targetSkillId),
			inArray(schema.swapRequests.status, ['pending', 'accepted'])
		)
	});
	if (dup) throw new SwapError('You already have an open request for this notice.');
	const id = newId();
	await db.insert(schema.swapRequests).values({
		id,
		communityId,
		fromUserId,
		toUserId: target.userId,
		offerSkillId,
		wantSkillId: targetSkillId,
		note: note.trim() || null
	});
	await notify(db, target.userId, 'swap_requested', {
		swapId: id,
		communityId,
		skillId: targetSkillId,
		title: target.title,
		fromUserId
	});
	return id;
}

async function load(db: Db, swapId: string) {
	const s = await db.query.swapRequests.findFirst({ where: eq(schema.swapRequests.id, swapId) });
	if (!s) throw new SwapError('Swap not found.');
	return s;
}

async function transition(
	db: Db,
	swapId: string,
	actorId: string,
	to: SwapStatus,
	allowed: (s: typeof schema.swapRequests.$inferSelect) => boolean,
	extra: Partial<typeof schema.swapRequests.$inferInsert> = {}
) {
	const s = await load(db, swapId);
	if (!allowed(s)) throw new SwapError('You cannot do that on this swap.');
	if (!canTransition(s.status as SwapStatus, to))
		throw new SwapError(`A ${s.status} swap cannot be ${to}.`);
	await db
		.update(schema.swapRequests)
		.set({ status: to, ...extra })
		.where(eq(schema.swapRequests.id, swapId));
	const other = s.fromUserId === actorId ? s.toUserId : s.fromUserId;
	const kind = (
		{
			accepted: 'swap_accepted',
			declined: 'swap_declined',
			completed: 'swap_completed',
			cancelled: 'swap_cancelled'
		} as const
	)[to as Exclude<SwapStatus, 'pending'>];
	await notify(db, other, kind, { swapId, communityId: s.communityId, actorId });
	return s;
}

export const acceptSwap = (db: Db, swapId: string, actorId: string) =>
	transition(db, swapId, actorId, 'accepted', (s) => s.toUserId === actorId, {
		respondedAt: new Date()
	});
export const declineSwap = (db: Db, swapId: string, actorId: string, reason?: string) =>
	transition(db, swapId, actorId, 'declined', (s) => s.toUserId === actorId, {
		respondedAt: new Date(),
		declineReason: reason?.trim().slice(0, 200) || null
	});
export const cancelSwap = (db: Db, swapId: string, actorId: string) =>
	transition(db, swapId, actorId, 'cancelled', (s) =>
		s.status === 'pending'
			? s.fromUserId === actorId
			: s.fromUserId === actorId || s.toUserId === actorId
	);
export const completeSwap = (db: Db, swapId: string, actorId: string) =>
	transition(
		db,
		swapId,
		actorId,
		'completed',
		(s) => s.fromUserId === actorId || s.toUserId === actorId,
		{ completedAt: new Date() }
	);

/** True once the user has accepted at least one swap; used to show the safety interstitial only the first time. */
export async function hasAcceptedBefore(db: Db, userId: string) {
	const [{ n }] = await db
		.select({ n: count() })
		.from(schema.swapRequests)
		.where(
			and(
				eq(schema.swapRequests.toUserId, userId),
				inArray(schema.swapRequests.status, ['accepted', 'completed'])
			)
		);
	return n > 0;
}

export interface InboxItem {
	id: string;
	status: SwapStatus;
	direction: 'received' | 'sent';
	createdAt: Date;
	respondedAt: Date | null;
	completedAt: Date | null;
	note: string | null;
	declineReason: string | null;
	community: { slug: string; name: string };
	other: { id: string; name: string; avatarUrl: string | null };
	target: { id: string; title: string; kind: 'offer' | 'want' } | null;
	offer: { id: string; title: string } | null;
	myThanks: boolean;
}

export async function listInbox(db: Db, userId: string): Promise<InboxItem[]> {
	const rows = await db.query.swapRequests.findMany({
		where: or(eq(schema.swapRequests.fromUserId, userId), eq(schema.swapRequests.toUserId, userId)),
		orderBy: desc(schema.swapRequests.createdAt),
		limit: 100
	});
	if (!rows.length) return [];
	const userIds = [...new Set(rows.flatMap((r) => [r.fromUserId, r.toUserId]))];
	const skillIds = [
		...new Set(rows.flatMap((r) => [r.wantSkillId, r.offerSkillId]).filter((x): x is string => !!x))
	];
	const communityIds = [...new Set(rows.map((r) => r.communityId))];
	const [users, skills, communities, thanks] = await Promise.all([
		db.query.users.findMany({ where: inArray(schema.users.id, userIds) }),
		skillIds.length
			? db.query.skills.findMany({ where: inArray(schema.skills.id, skillIds) })
			: Promise.resolve([]),
		db.query.communities.findMany({ where: inArray(schema.communities.id, communityIds) }),
		db.query.thanks.findMany({
			where: and(
				eq(schema.thanks.fromUserId, userId),
				inArray(
					schema.thanks.swapRequestId,
					rows.map((r) => r.id)
				)
			)
		})
	]);
	const u = new Map(users.map((x) => [x.id, x]));
	const sk = new Map(skills.map((x) => [x.id, x]));
	const c = new Map(communities.map((x) => [x.id, x]));
	const thanked = new Set(thanks.map((t) => t.swapRequestId));
	return rows.map((r) => {
		const otherId = r.fromUserId === userId ? r.toUserId : r.fromUserId;
		const other = u.get(otherId);
		const target = sk.get(r.wantSkillId);
		const offer = r.offerSkillId ? sk.get(r.offerSkillId) : undefined;
		const comm = c.get(r.communityId);
		return {
			id: r.id,
			status: r.status as SwapStatus,
			direction: r.fromUserId === userId ? 'sent' : 'received',
			createdAt: r.createdAt,
			respondedAt: r.respondedAt,
			completedAt: r.completedAt,
			note: r.note,
			declineReason: r.declineReason,
			community: { slug: comm?.slug ?? '', name: comm?.name ?? 'a board' },
			other: {
				id: otherId,
				name: other ? publicName(other.displayName) : 'former member',
				avatarUrl: other?.avatarUrl ?? null
			},
			target: target ? { id: target.id, title: target.title, kind: target.kind } : null,
			offer: offer ? { id: offer.id, title: offer.title } : null,
			myThanks: thanked.has(r.id)
		};
	});
}

/** Contact methods for both parties of an accepted or completed swap the caller is part of. */
export async function revealContacts(db: Db, swapId: string, userId: string) {
	const s = await load(db, swapId);
	if (s.fromUserId !== userId && s.toUserId !== userId) throw new SwapError('Not your swap.');
	if (s.status !== 'accepted' && s.status !== 'completed')
		throw new SwapError('Contact details unlock once the swap is accepted.');
	const otherId = s.fromUserId === userId ? s.toUserId : s.fromUserId;
	const [mine, theirs] = await Promise.all([
		db.query.contactMethods.findFirst({ where: eq(schema.contactMethods.userId, userId) }),
		db.query.contactMethods.findFirst({ where: eq(schema.contactMethods.userId, otherId) })
	]);
	return { mine, theirs, otherId };
}
