import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { createDb, schema } from '$lib/server/db';
import {
	listNotifications,
	markAllRead,
	notify,
	notifyMany,
	unreadCount
} from '$lib/server/services/notifications';

const db = createDb(env.DB);
beforeAll(async () => {
	await db
		.insert(schema.users)
		.values([
			{ id: 'a', displayName: 'A' },
			{ id: 'b', displayName: 'B' }
		])
		.onConflictDoNothing();
});

describe('notifications', () => {
	it('counts unread, lists newest first, marks all read', async () => {
		await notify(db, 'a', 'skill_approved', { skillId: '1' });
		await notify(db, 'a', 'skill_hidden', { skillId: '2' });
		expect(await unreadCount(db, 'a')).toBe(2);
		const list = await listNotifications(db, 'a');
		expect(list[0].kind).toBe('skill_hidden');
		await markAllRead(db, 'a');
		expect(await unreadCount(db, 'a')).toBe(0);
	});
	it('notifyMany dedupes recipients', async () => {
		await notifyMany(db, ['b', 'b', 'a'], 'mod_pending', { x: 1 });
		expect(await unreadCount(db, 'b')).toBe(1);
	});
});
