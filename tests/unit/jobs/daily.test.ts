import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { createDb, schema } from '$lib/server/db';
import { runDailyJobs } from '$lib/server/jobs/daily';

const db = createDb(env.DB);
const DAY = 86400000;

beforeAll(async () => {
	await db.insert(schema.users).values({ id: 'u', displayName: 'U' }).onConflictDoNothing();
	await db
		.insert(schema.communities)
		.values({ id: 'c', slug: 'cron-board', name: 'Cron', ownerId: 'u' });
});

function skill(id: string, expiresInDays: number, status: 'active' | 'paused' = 'active') {
	return {
		id,
		communityId: 'c',
		userId: 'u',
		kind: 'offer' as const,
		categoryId: 'tech',
		title: id,
		titleNormalized: id,
		description: 'd'.repeat(12),
		status,
		expiresAt: new Date(Date.now() + expiresInDays * DAY)
	};
}

describe('daily job', () => {
	it('expires past-due active notices only, and reminds once at 10 days', async () => {
		await db
			.insert(schema.skills)
			.values([
				skill('past', -1),
				skill('past-paused', -1, 'paused'),
				skill('soon', 5),
				skill('far', 40)
			]);
		const r1 = await runDailyJobs(db);
		expect(r1).toEqual({ expired: 1, reminded: 1 });
		expect(
			(await db.query.skills.findFirst({ where: (s, { eq }) => eq(s.id, 'past') }))?.status
		).toBe('expired');
		expect(
			(await db.query.skills.findFirst({ where: (s, { eq }) => eq(s.id, 'past-paused') }))?.status
		).toBe('paused');
		expect(
			(await db.query.skills.findFirst({ where: (s, { eq }) => eq(s.id, 'far') }))?.status
		).toBe('active');

		const r2 = await runDailyJobs(db);
		expect(r2).toEqual({ expired: 0, reminded: 0 });
		const notes = await db.query.notifications.findMany({
			where: (n, { eq }) => eq(n.userId, 'u')
		});
		expect(notes.filter((n) => n.kind === 'skill_expiring').length).toBe(1);
		expect(notes.filter((n) => n.kind === 'skill_expired').length).toBe(1);
	});

	it('purges expired sessions', async () => {
		await db.insert(schema.sessions).values([
			{ id: 'dead', userId: 'u', expiresAt: new Date(Date.now() - 1000) },
			{ id: 'alive', userId: 'u', expiresAt: new Date(Date.now() + 1e6) }
		]);
		await runDailyJobs(db);
		const rows = await db.query.sessions.findMany();
		expect(rows.map((r) => r.id)).toEqual(['alive']);
	});
});
