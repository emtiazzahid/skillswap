import { and, count, eq, isNull, ne, sql } from 'drizzle-orm';
import { schema, type Db } from '../db';
import { newId } from '../ids';
import { slugify, validateSlug } from '../slug';

export type Role = 'member' | 'moderator' | 'owner';
export const ROLE_RANK: Record<Role, number> = { member: 0, moderator: 1, owner: 2 };

export class CommunityError extends Error {
	constructor(
		message: string,
		public readonly field?: string
	) {
		super(message);
	}
}

export interface CommunityInput {
	name: string;
	slug?: string;
	tagline?: string;
	description?: string;
	areaLabel?: string;
	visibility: 'public' | 'invite';
}

export function validateCommunityInput(input: CommunityInput): Record<string, string> {
	const errors: Record<string, string> = {};
	const name = input.name.trim();
	if (name.length < 3) errors.name = 'Give the board a name of at least 3 characters.';
	if (name.length > 60) errors.name = 'Board names are at most 60 characters.';
	const slug = (input.slug?.trim() || slugify(name)).toLowerCase();
	const slugErr = validateSlug(slug);
	if (slugErr) errors.slug = slugErr;
	if ((input.tagline ?? '').length > 140) errors.tagline = 'Taglines are at most 140 characters.';
	if ((input.description ?? '').length > 1000)
		errors.description = 'Descriptions are at most 1000 characters.';
	if ((input.areaLabel ?? '').length > 80) errors.areaLabel = 'Keep the area label short.';
	if (input.visibility !== 'public' && input.visibility !== 'invite')
		errors.visibility = 'Pick a visibility.';
	return errors;
}

export async function createCommunity(db: Db, ownerId: string, input: CommunityInput) {
	const errors = validateCommunityInput(input);
	if (Object.keys(errors).length)
		throw new CommunityError(Object.values(errors)[0], Object.keys(errors)[0]);
	const slug = (input.slug?.trim() || slugify(input.name)).toLowerCase();
	const existing = await db.query.communities.findFirst({
		where: eq(schema.communities.slug, slug)
	});
	if (existing) throw new CommunityError('That slug is already taken.', 'slug');
	const id = newId();
	await db.insert(schema.communities).values({
		id,
		slug,
		name: input.name.trim(),
		tagline: input.tagline?.trim() || null,
		description: input.description?.trim() || null,
		areaLabel: input.areaLabel?.trim() || null,
		visibility: input.visibility,
		ownerId
	});
	await db
		.insert(schema.memberships)
		.values({ communityId: id, userId: ownerId, role: 'owner', trustedAt: new Date() });
	return (await db.query.communities.findFirst({ where: eq(schema.communities.id, id) }))!;
}

export async function updateCommunity(
	db: Db,
	communityId: string,
	input: Omit<CommunityInput, 'slug'>
) {
	const errors = validateCommunityInput({ ...input, slug: 'placeholder-slug' });
	delete errors.slug;
	if (Object.keys(errors).length)
		throw new CommunityError(Object.values(errors)[0], Object.keys(errors)[0]);
	await db
		.update(schema.communities)
		.set({
			name: input.name.trim(),
			tagline: input.tagline?.trim() || null,
			description: input.description?.trim() || null,
			areaLabel: input.areaLabel?.trim() || null,
			visibility: input.visibility
		})
		.where(eq(schema.communities.id, communityId));
}

export async function getCommunityBySlug(db: Db, slug: string) {
	return db.query.communities.findFirst({
		where: and(eq(schema.communities.slug, slug), isNull(schema.communities.deletedAt))
	});
}

export async function getMembership(db: Db, communityId: string, userId: string) {
	return db.query.memberships.findFirst({
		where: and(
			eq(schema.memberships.communityId, communityId),
			eq(schema.memberships.userId, userId)
		)
	});
}

export async function joinCommunity(db: Db, communityId: string, userId: string) {
	const existing = await getMembership(db, communityId, userId);
	if (existing?.bannedAt) throw new CommunityError('You have been removed from this board.');
	if (existing) return existing;
	await db.insert(schema.memberships).values({ communityId, userId, role: 'member' });
	return (await getMembership(db, communityId, userId))!;
}

export async function leaveCommunity(db: Db, communityId: string, userId: string) {
	const m = await getMembership(db, communityId, userId);
	if (!m) return;
	if (m.role === 'owner')
		throw new CommunityError(
			'Owners cannot leave. Hand the board to a moderator first, or delete it.'
		);
	await db
		.delete(schema.memberships)
		.where(
			and(eq(schema.memberships.communityId, communityId), eq(schema.memberships.userId, userId))
		);
}

/** Moderators can ban members; owners can ban anyone but themselves. */
export async function setBanned(
	db: Db,
	communityId: string,
	actorRole: Role,
	targetUserId: string,
	banned: boolean
) {
	const target = await getMembership(db, communityId, targetUserId);
	if (!target) throw new CommunityError('Not a member.');
	if (target.role === 'owner') throw new CommunityError('The owner cannot be banned.');
	if (ROLE_RANK[actorRole] <= ROLE_RANK[target.role])
		throw new CommunityError('You cannot moderate someone with your role or above.');
	await db
		.update(schema.memberships)
		.set({ bannedAt: banned ? new Date() : null })
		.where(
			and(
				eq(schema.memberships.communityId, communityId),
				eq(schema.memberships.userId, targetUserId)
			)
		);
	if (banned) {
		await db
			.update(schema.skills)
			.set({ status: 'hidden' })
			.where(
				and(eq(schema.skills.communityId, communityId), eq(schema.skills.userId, targetUserId))
			);
	}
}

export async function setModerator(
	db: Db,
	communityId: string,
	targetUserId: string,
	moderator: boolean
) {
	const target = await getMembership(db, communityId, targetUserId);
	if (!target) throw new CommunityError('Not a member.');
	if (target.role === 'owner') throw new CommunityError('The owner is already above moderator.');
	if (target.bannedAt) throw new CommunityError('Unban them first.');
	await db
		.update(schema.memberships)
		.set({
			role: moderator ? 'moderator' : 'member',
			trustedAt: moderator ? new Date() : target.trustedAt
		})
		.where(
			and(
				eq(schema.memberships.communityId, communityId),
				eq(schema.memberships.userId, targetUserId)
			)
		);
}

export async function transferOwnership(
	db: Db,
	communityId: string,
	currentOwnerId: string,
	newOwnerId: string
) {
	const target = await getMembership(db, communityId, newOwnerId);
	if (!target || target.bannedAt) throw new CommunityError('Pick an active member.');
	if (target.role !== 'moderator')
		throw new CommunityError('Make them a moderator first, then hand over.');
	await db
		.update(schema.communities)
		.set({ ownerId: newOwnerId })
		.where(eq(schema.communities.id, communityId));
	await db
		.update(schema.memberships)
		.set({ role: 'owner' })
		.where(
			and(
				eq(schema.memberships.communityId, communityId),
				eq(schema.memberships.userId, newOwnerId)
			)
		);
	await db
		.update(schema.memberships)
		.set({ role: 'moderator' })
		.where(
			and(
				eq(schema.memberships.communityId, communityId),
				eq(schema.memberships.userId, currentOwnerId)
			)
		);
}

export async function softDeleteCommunity(db: Db, communityId: string) {
	await db
		.update(schema.communities)
		.set({ deletedAt: new Date() })
		.where(eq(schema.communities.id, communityId));
}

export interface CommunityCard {
	id: string;
	slug: string;
	name: string;
	tagline: string | null;
	areaLabel: string | null;
	members: number;
	notices: number;
}

export async function listPublicCommunities(db: Db, limit = 24): Promise<CommunityCard[]> {
	const rows = await db
		.select({
			id: schema.communities.id,
			slug: schema.communities.slug,
			name: schema.communities.name,
			tagline: schema.communities.tagline,
			areaLabel: schema.communities.areaLabel,
			members: sql<number>`(select count(*) from memberships m where m.community_id = ${schema.communities.id} and m.banned_at is null)`,
			notices: sql<number>`(select count(*) from skills s where s.community_id = ${schema.communities.id} and s.status = 'active')`
		})
		.from(schema.communities)
		.where(and(eq(schema.communities.visibility, 'public'), isNull(schema.communities.deletedAt)))
		.orderBy(sql`4 desc`, schema.communities.createdAt)
		.limit(limit);
	return rows.map((r) => ({ ...r, members: Number(r.members), notices: Number(r.notices) }));
}

export async function listUserCommunities(db: Db, userId: string): Promise<CommunityCard[]> {
	const rows = await db
		.select({
			id: schema.communities.id,
			slug: schema.communities.slug,
			name: schema.communities.name,
			tagline: schema.communities.tagline,
			areaLabel: schema.communities.areaLabel,
			members: sql<number>`(select count(*) from memberships m where m.community_id = ${schema.communities.id} and m.banned_at is null)`,
			notices: sql<number>`(select count(*) from skills s where s.community_id = ${schema.communities.id} and s.status = 'active')`
		})
		.from(schema.memberships)
		.innerJoin(schema.communities, eq(schema.memberships.communityId, schema.communities.id))
		.where(
			and(
				eq(schema.memberships.userId, userId),
				isNull(schema.memberships.bannedAt),
				isNull(schema.communities.deletedAt)
			)
		)
		.orderBy(schema.memberships.joinedAt);
	return rows.map((r) => ({ ...r, members: Number(r.members), notices: Number(r.notices) }));
}

export async function communityCounts(db: Db, communityId: string) {
	const [m] = await db
		.select({ n: count() })
		.from(schema.memberships)
		.where(
			and(eq(schema.memberships.communityId, communityId), isNull(schema.memberships.bannedAt))
		);
	const [s] = await db
		.select({ n: count() })
		.from(schema.skills)
		.where(and(eq(schema.skills.communityId, communityId), eq(schema.skills.status, 'active')));
	return { members: m.n, notices: s.n };
}

export async function listMembers(db: Db, communityId: string) {
	return db
		.select({
			userId: schema.memberships.userId,
			role: schema.memberships.role,
			joinedAt: schema.memberships.joinedAt,
			bannedAt: schema.memberships.bannedAt,
			trustedAt: schema.memberships.trustedAt,
			displayName: schema.users.displayName,
			avatarUrl: schema.users.avatarUrl,
			notices: sql<number>`(select count(*) from skills s where s.community_id = ${communityId} and s.user_id = ${schema.memberships.userId} and s.status in ('active','pending'))`,
			swaps: sql<number>`(select count(*) from swap_requests r where r.community_id = ${communityId} and r.status = 'completed' and (r.from_user_id = ${schema.memberships.userId} or r.to_user_id = ${schema.memberships.userId}))`
		})
		.from(schema.memberships)
		.innerJoin(schema.users, eq(schema.memberships.userId, schema.users.id))
		.where(and(eq(schema.memberships.communityId, communityId), ne(schema.users.id, '')))
		.orderBy(
			sql`case ${schema.memberships.role} when 'owner' then 0 when 'moderator' then 1 else 2 end`,
			schema.memberships.joinedAt
		);
}
