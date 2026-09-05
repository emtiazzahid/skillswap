import { and, eq, isNull, count, desc } from 'drizzle-orm';
import { schema, type Db } from '../db';
import { newId } from '../ids';
import { moderatorIds, notify, notifyMany } from './notifications';

export const AUTO_HIDE_FLAGS = 3;
export const FLAG_REASONS = ['spam', 'money', 'harassment', 'unsafe', 'other'] as const;
export type FlagReason = (typeof FLAG_REASONS)[number];
export const FLAG_LABELS: Record<FlagReason, string> = {
	spam: 'Spam',
	money: 'Asking for money',
	harassment: 'Harassment',
	unsafe: 'Unsafe',
	other: 'Something else'
};

export class ModerationError extends Error {}

/** Approve a pending notice and trust the author on this board. */
export async function approveSkill(db: Db, skillId: string) {
	const skill = await db.query.skills.findFirst({ where: eq(schema.skills.id, skillId) });
	if (!skill) throw new ModerationError('Notice not found.');
	await db
		.update(schema.skills)
		.set({ status: 'active', updatedAt: new Date() })
		.where(eq(schema.skills.id, skillId));
	await db
		.update(schema.memberships)
		.set({ trustedAt: new Date() })
		.where(
			and(
				eq(schema.memberships.communityId, skill.communityId),
				eq(schema.memberships.userId, skill.userId),
				isNull(schema.memberships.trustedAt)
			)
		);
	await notify(db, skill.userId, 'skill_approved', {
		skillId,
		communityId: skill.communityId,
		title: skill.title
	});
}

export async function hideSkill(db: Db, skillId: string, reason?: string) {
	const skill = await db.query.skills.findFirst({ where: eq(schema.skills.id, skillId) });
	if (!skill) throw new ModerationError('Notice not found.');
	await db
		.update(schema.skills)
		.set({ status: 'hidden', updatedAt: new Date() })
		.where(eq(schema.skills.id, skillId));
	await notify(db, skill.userId, 'skill_hidden', {
		skillId,
		communityId: skill.communityId,
		title: skill.title,
		reason: reason ?? null
	});
}

export async function restoreSkill(db: Db, skillId: string) {
	await db
		.update(schema.skills)
		.set({ status: 'active', updatedAt: new Date() })
		.where(eq(schema.skills.id, skillId));
	await db
		.update(schema.flags)
		.set({ resolvedAt: new Date(), resolution: 'dismissed' })
		.where(
			and(
				eq(schema.flags.targetType, 'skill'),
				eq(schema.flags.targetId, skillId),
				isNull(schema.flags.resolvedAt)
			)
		);
}

/** Record a flag. Three distinct reporters on a notice hide it and page the moderators. */
export async function flagTarget(
	db: Db,
	communityId: string,
	reporterId: string,
	targetType: 'skill' | 'user',
	targetId: string,
	reason: FlagReason,
	detail?: string
) {
	if (targetType === 'skill') {
		const s = await db.query.skills.findFirst({ where: eq(schema.skills.id, targetId) });
		if (!s || s.communityId !== communityId) throw new ModerationError('Notice not found.');
		if (s.userId === reporterId) throw new ModerationError('You cannot flag your own notice.');
	}
	if (targetType === 'user' && targetId === reporterId)
		throw new ModerationError('You cannot flag yourself.');
	await db
		.insert(schema.flags)
		.values({
			id: newId(),
			communityId,
			targetType,
			targetId,
			reporterId,
			reason,
			detail: detail?.trim().slice(0, 300) || null
		})
		.onConflictDoNothing();
	const [{ n }] = await db
		.select({ n: count() })
		.from(schema.flags)
		.where(
			and(
				eq(schema.flags.targetType, targetType),
				eq(schema.flags.targetId, targetId),
				eq(schema.flags.communityId, communityId),
				isNull(schema.flags.resolvedAt)
			)
		);
	const mods = await moderatorIds(db, communityId);
	let autoHidden = false;
	if (targetType === 'skill' && n >= AUTO_HIDE_FLAGS) {
		const s = (await db.query.skills.findFirst({ where: eq(schema.skills.id, targetId) }))!;
		if (s.status === 'active' || s.status === 'pending') {
			await db
				.update(schema.skills)
				.set({ status: 'hidden', updatedAt: new Date() })
				.where(eq(schema.skills.id, targetId));
			autoHidden = true;
		}
	}
	if (autoHidden || targetType === 'user' || n === 1) {
		await notifyMany(db, mods, 'mod_flag', {
			targetType,
			targetId,
			communityId,
			reason,
			count: n,
			autoHidden
		});
	}
	return { count: n, autoHidden };
}

export async function resolveFlags(
	db: Db,
	communityId: string,
	targetType: 'skill' | 'user',
	targetId: string,
	resolvedBy: string,
	resolution: 'dismissed' | 'hidden' | 'banned'
) {
	await db
		.update(schema.flags)
		.set({ resolvedAt: new Date(), resolvedBy, resolution })
		.where(
			and(
				eq(schema.flags.communityId, communityId),
				eq(schema.flags.targetType, targetType),
				eq(schema.flags.targetId, targetId),
				isNull(schema.flags.resolvedAt)
			)
		);
}

export interface OpenFlagGroup {
	targetType: 'skill' | 'user';
	targetId: string;
	count: number;
	reasons: FlagReason[];
	details: string[];
	title: string;
	authorId: string | null;
	authorName: string | null;
	autoHidden: boolean;
	latestAt: Date;
}

async function describeTarget(db: Db, targetType: 'skill' | 'user', targetId: string) {
	if (targetType === 'skill') {
		const s = await db.query.skills.findFirst({
			where: eq(schema.skills.id, targetId),
			with: { user: true }
		});
		return {
			title: s?.title ?? '(deleted notice)',
			authorId: s?.userId ?? null,
			authorName: s?.user.displayName ?? null,
			autoHidden: s?.status === 'hidden'
		};
	}
	const u = await db.query.users.findFirst({ where: eq(schema.users.id, targetId) });
	return {
		title: `Profile: ${u?.displayName ?? '(deleted user)'}`,
		authorId: targetId,
		authorName: u?.displayName ?? null,
		autoHidden: false
	};
}

export async function openFlags(db: Db, communityId: string): Promise<OpenFlagGroup[]> {
	const rows = await db.query.flags.findMany({
		where: and(eq(schema.flags.communityId, communityId), isNull(schema.flags.resolvedAt)),
		orderBy: desc(schema.flags.createdAt)
	});
	const groups = new Map<string, OpenFlagGroup>();
	for (const f of rows) {
		const key = `${f.targetType}:${f.targetId}`;
		let g = groups.get(key);
		if (!g) {
			g = {
				targetType: f.targetType,
				targetId: f.targetId,
				count: 0,
				reasons: [],
				details: [],
				latestAt: f.createdAt,
				...(await describeTarget(db, f.targetType, f.targetId))
			};
			groups.set(key, g);
		}
		g.count++;
		if (!g.reasons.includes(f.reason)) g.reasons.push(f.reason);
		if (f.detail) g.details.push(f.detail);
	}
	return [...groups.values()];
}

export async function resolvedThisMonth(db: Db, communityId: string, now = new Date()) {
	const start = new Date(now.getFullYear(), now.getMonth(), 1);
	const rows = await db.query.flags.findMany({
		where: and(eq(schema.flags.communityId, communityId))
	});
	return rows.filter((f) => f.resolvedAt && f.resolvedAt >= start).length;
}
