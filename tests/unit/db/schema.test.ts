import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { createDb, schema } from '$lib/server/db';
import { CATEGORIES } from '$lib/server/db/categories';

describe('database schema', () => {
	it('creates every table from the migrations', async () => {
		const rows = await env.DB.prepare(
			"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'd1_%' AND name NOT LIKE '_cf%'"
		).all<{ name: string }>();
		const names = rows.results.map((r: { name: string }) => r.name).sort();
		expect(names).toEqual(
			[
				'categories',
				'communities',
				'contact_methods',
				'flags',
				'invites',
				'memberships',
				'notifications',
				'oauth_accounts',
				'sessions',
				'skills',
				'swap_requests',
				'thanks',
				'users'
			].sort()
		);
	});

	it('seeds exactly the ten categories, in order', async () => {
		const db = createDb(env.DB);
		const rows = await db.select().from(schema.categories).orderBy(schema.categories.sortOrder);
		expect(rows).toHaveLength(10);
		expect(rows.map((r) => r.id)).toEqual(CATEGORIES.map((c) => c.id));
	});

	it('enforces the unique community slug', async () => {
		const db = createDb(env.DB);
		await db.insert(schema.users).values({ id: 'u1', displayName: 'Test' });
		await db
			.insert(schema.communities)
			.values({ id: 'c1', slug: 'mirpur', name: 'Mirpur', ownerId: 'u1' });
		await expect(
			db
				.insert(schema.communities)
				.values({ id: 'c2', slug: 'mirpur', name: 'Again', ownerId: 'u1' })
		).rejects.toThrow(/UNIQUE|Failed query/);
	});

	it('cascades skills when a community is deleted', async () => {
		const db = createDb(env.DB);
		await db.insert(schema.users).values({ id: 'u2', displayName: 'Owner' });
		await db
			.insert(schema.communities)
			.values({ id: 'c3', slug: 'cascade', name: 'Cascade', ownerId: 'u2' });
		await db.insert(schema.skills).values({
			id: 's1',
			communityId: 'c3',
			userId: 'u2',
			kind: 'offer',
			categoryId: 'tech',
			title: 'Excel',
			titleNormalized: 'excel',
			description: 'x',
			expiresAt: new Date(Date.now() + 1000)
		});
		await env.DB.prepare('PRAGMA foreign_keys = ON').run();
		await db
			.delete(schema.communities)
			.where(schema.communities.id === undefined ? undefined : undefined);
		await env.DB.prepare("DELETE FROM communities WHERE id = 'c3'").run();
		const left = await env.DB.prepare(
			"SELECT COUNT(*) AS n FROM skills WHERE community_id = 'c3'"
		).first<{ n: number }>();
		expect(left?.n).toBe(0);
	});
});
