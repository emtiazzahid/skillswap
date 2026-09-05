import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { Db } from './db';
import type { Community, Membership } from './db/schema';
import { getCommunityBySlug, getMembership, ROLE_RANK, type Role } from './services/communities';

export interface Access {
	community: Community;
	membership: Membership | null;
	role: Role | null;
	isMember: boolean;
	canModerate: boolean;
	isOwner: boolean;
}

/**
 * Resolve a community for the current visitor.
 * Invite-only boards look like 404 to outsiders (no existence leak). Banned members get 403.
 */
export async function loadAccess(
	db: Db,
	event: Pick<RequestEvent, 'locals'>,
	slug: string
): Promise<Access> {
	const community = await getCommunityBySlug(db, slug);
	if (!community) error(404, 'No board here.');
	const user = event.locals.user;
	const membership = user ? ((await getMembership(db, community.id, user.id)) ?? null) : null;
	if (membership?.bannedAt) error(403, 'You have been removed from this board.');
	if (community.visibility === 'invite' && !membership) error(404, 'No board here.');
	const role = membership?.role ?? null;
	return {
		community,
		membership,
		role,
		isMember: !!membership,
		canModerate: role !== null && ROLE_RANK[role] >= ROLE_RANK.moderator,
		isOwner: role === 'owner'
	};
}

export function requireMember(
	access: Access,
	event: Pick<RequestEvent, 'locals' | 'url'>
): Membership {
	if (!event.locals.user)
		redirect(303, `/auth/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	if (!access.membership)
		redirect(
			303,
			`/c/${access.community.slug}/join?next=${encodeURIComponent(event.url.pathname + event.url.search)}`
		);
	return access.membership;
}

export function requireModerator(access: Access): Membership {
	if (!access.canModerate) error(403, 'Moderators only.');
	return access.membership!;
}

export function requireOwner(access: Access): Membership {
	if (!access.isOwner) error(403, 'Only the board owner can do that.');
	return access.membership!;
}
