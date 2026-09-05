import { and, desc, eq, isNull, count, sql } from 'drizzle-orm';
import { schema, type Db } from '../db';
import { newId } from '../ids';

export type NotificationKind =
	| 'skill_approved'
	| 'skill_hidden'
	| 'skill_expiring'
	| 'skill_expired'
	| 'mod_pending'
	| 'mod_flag'
	| 'swap_requested'
	| 'swap_accepted'
	| 'swap_declined'
	| 'swap_completed'
	| 'swap_cancelled'
	| 'thanks_received';

export async function notify(
	db: Db,
	userId: string,
	kind: NotificationKind,
	payload: Record<string, unknown>
) {
	await db.insert(schema.notifications).values({ id: newId(), userId, kind, payload });
}

export async function notifyMany(
	db: Db,
	userIds: string[],
	kind: NotificationKind,
	payload: Record<string, unknown>
) {
	const unique = [...new Set(userIds)];
	if (!unique.length) return;
	await db
		.insert(schema.notifications)
		.values(unique.map((userId) => ({ id: newId(), userId, kind, payload })));
}

export async function unreadCount(db: Db, userId: string) {
	const [row] = await db
		.select({ n: count() })
		.from(schema.notifications)
		.where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));
	return row.n;
}

export async function listNotifications(db: Db, userId: string, limit = 50) {
	return db.query.notifications.findMany({
		where: eq(schema.notifications.userId, userId),
		orderBy: [desc(schema.notifications.createdAt), desc(sql`rowid`)],
		limit
	});
}

export async function markAllRead(db: Db, userId: string) {
	await db
		.update(schema.notifications)
		.set({ readAt: new Date() })
		.where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));
}

export async function moderatorIds(db: Db, communityId: string) {
	const rows = await db
		.select({ userId: schema.memberships.userId })
		.from(schema.memberships)
		.where(
			and(eq(schema.memberships.communityId, communityId), isNull(schema.memberships.bannedAt))
		);
	const mods = await db.query.memberships.findMany({
		where: and(eq(schema.memberships.communityId, communityId), isNull(schema.memberships.bannedAt))
	});
	void rows;
	return mods.filter((m) => m.role === 'moderator' || m.role === 'owner').map((m) => m.userId);
}
