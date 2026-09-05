import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { and, eq, isNull } from 'drizzle-orm';
import { schema, type Db } from '../db';
import { newId } from '../ids';
import { CommunityError, joinCommunity } from './communities';

export const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const INVITE_DEFAULT_USES = 25;

export function hashInviteToken(token: string) {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export async function createInvite(
	db: Db,
	communityId: string,
	createdBy: string,
	maxUses = INVITE_DEFAULT_USES,
	now = Date.now()
) {
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	const token = encodeBase32LowerCaseNoPadding(bytes);
	const id = newId();
	await db.insert(schema.invites).values({
		id,
		communityId,
		tokenHash: hashInviteToken(token),
		createdBy,
		maxUses: Math.min(Math.max(1, maxUses), 500),
		expiresAt: new Date(now + INVITE_TTL_MS)
	});
	return { id, token };
}

export async function revokeInvite(db: Db, communityId: string, inviteId: string) {
	await db
		.update(schema.invites)
		.set({ revokedAt: new Date() })
		.where(and(eq(schema.invites.id, inviteId), eq(schema.invites.communityId, communityId)));
}

export async function listActiveInvites(db: Db, communityId: string, now = Date.now()) {
	const rows = await db.query.invites.findMany({
		where: and(eq(schema.invites.communityId, communityId), isNull(schema.invites.revokedAt))
	});
	return rows.filter((i) => i.expiresAt.getTime() > now && i.usedCount < i.maxUses);
}

/** Validate a token for a community and consume one use by joining. Returns the membership. */
export async function consumeInvite(
	db: Db,
	communityId: string,
	userId: string,
	token: string,
	now = Date.now()
) {
	const invite = await db.query.invites.findFirst({
		where: eq(schema.invites.tokenHash, hashInviteToken(token))
	});
	if (!invite || invite.communityId !== communityId)
		throw new CommunityError('That invite link is not valid.');
	if (invite.revokedAt) throw new CommunityError('That invite link was revoked.');
	if (invite.expiresAt.getTime() <= now) throw new CommunityError('That invite link has expired.');
	if (invite.usedCount >= invite.maxUses)
		throw new CommunityError('That invite link has been used up.');
	const existing = await db.query.memberships.findFirst({
		where: and(
			eq(schema.memberships.communityId, communityId),
			eq(schema.memberships.userId, userId)
		)
	});
	if (existing && !existing.bannedAt) return existing;
	const membership = await joinCommunity(db, communityId, userId);
	await db
		.update(schema.invites)
		.set({ usedCount: invite.usedCount + 1 })
		.where(eq(schema.invites.id, invite.id));
	return membership;
}
