import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { createDb, schema } from '$lib/server/db';
import { seedStatements, SEED_SKILLS, SEED_USERS } from '$lib/server/seed';
import { getMatches } from '$lib/server/services/matching';
import { listInbox } from '$lib/server/services/swaps';
import { count } from 'drizzle-orm';

describe('seed', () => {
	it('is idempotent and produces a board with matches and an inbox', async () => {
		const db = createDb(env.DB);
		const run = async () => {
			for (const sql of seedStatements()) await env.DB.prepare(sql).run();
		};
		await run();
		await run();
		const [{ n: users }] = await db.select({ n: count() }).from(schema.users);
		const [{ n: skills }] = await db.select({ n: count() }).from(schema.skills);
		expect(users).toBeGreaterThanOrEqual(SEED_USERS.length);
		expect(skills).toBe(SEED_SKILLS.length);
		const m = await getMatches(db, env.SESSIONS, 'seed-c1', 'seed-rina');
		expect(m.reciprocal[0]?.person.userId).toBe('seed-tanvir');
		const inbox = await listInbox(db, 'seed-joy');
		expect(inbox.map((i) => i.status).sort()).toEqual(['completed', 'pending']);
		expect(inbox.find((i) => i.status === 'completed')?.myThanks).toBe(true);
	});
});
