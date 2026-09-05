import { and, eq, isNull, lt, gt, inArray } from 'drizzle-orm';
import { createDb, schema, type Db } from '../db';
import { notify } from '../services/notifications';

const DAY = 24 * 60 * 60 * 1000;
export const EXPIRY_REMINDER_DAYS = 10;

/** Expire past-due notices, remind owners 10 days ahead (once), purge dead sessions and invites. */
export async function runDailyJobs(db: Db, now = Date.now()) {
	const nowDate = new Date(now);

	const due = await db.query.skills.findMany({
		where: and(eq(schema.skills.status, 'active'), lt(schema.skills.expiresAt, nowDate))
	});
	for (const s of due) {
		await db
			.update(schema.skills)
			.set({ status: 'expired', updatedAt: nowDate })
			.where(eq(schema.skills.id, s.id));
		await notify(db, s.userId, 'skill_expired', {
			skillId: s.id,
			communityId: s.communityId,
			title: s.title
		});
	}

	const soon = await db.query.skills.findMany({
		where: and(
			eq(schema.skills.status, 'active'),
			isNull(schema.skills.expiryNotifiedAt),
			gt(schema.skills.expiresAt, nowDate),
			lt(schema.skills.expiresAt, new Date(now + EXPIRY_REMINDER_DAYS * DAY))
		)
	});
	for (const s of soon) {
		await db
			.update(schema.skills)
			.set({ expiryNotifiedAt: nowDate })
			.where(eq(schema.skills.id, s.id));
		await notify(db, s.userId, 'skill_expiring', {
			skillId: s.id,
			communityId: s.communityId,
			title: s.title,
			expiresAt: s.expiresAt.getTime()
		});
	}

	await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, nowDate));
	await db.delete(schema.invites).where(lt(schema.invites.expiresAt, new Date(now - 30 * DAY)));
	await db
		.delete(schema.notifications)
		.where(
			and(
				lt(schema.notifications.createdAt, new Date(now - 90 * DAY)),
				inArray(schema.notifications.kind, ['skill_expiring', 'skill_expired', 'mod_pending'])
			)
		);

	return { expired: due.length, reminded: soon.length };
}

export async function runDailyJobsWithEnv(env: App.Env) {
	return runDailyJobs(createDb(env.DB));
}
