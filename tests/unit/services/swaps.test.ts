import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { createDb, schema } from '$lib/server/db';
import { createCommunity, joinCommunity } from '$lib/server/services/communities';
import {
	acceptSwap,
	cancelSwap,
	canTransition,
	completeSwap,
	declineSwap,
	hasAcceptedBefore,
	listInbox,
	requestSwap,
	revealContacts
} from '$lib/server/services/swaps';
import { leaveThanks } from '$lib/server/services/thanks';
import { normalizeTitle } from '$lib/server/services/skills';

const db = createDb(env.DB);
let cid: string;
const row = (id: string, userId: string, kind: 'offer' | 'want', title: string) => ({
	id,
	communityId: cid,
	userId,
	kind,
	categoryId: 'tech',
	title,
	titleNormalized: normalizeTitle(title),
	description: 'd'.repeat(12),
	status: 'active' as const,
	expiresAt: new Date(Date.now() + 1e7)
});

beforeAll(async () => {
	await db
		.insert(schema.users)
		.values([
			{ id: 'a', displayName: 'Alice A' },
			{ id: 'b', displayName: 'Bob B' },
			{ id: 'c', displayName: 'Cara C' }
		])
		.onConflictDoNothing();
	const c = await createCommunity(db, 'a', {
		name: 'Swap Board',
		slug: 'swap-board',
		visibility: 'public'
	});
	cid = c.id;
	await joinCommunity(db, cid, 'b');
	await joinCommunity(db, cid, 'c');
	await db
		.insert(schema.skills)
		.values([
			row('a-o', 'a', 'offer', 'Excel'),
			row('b-o', 'b', 'offer', 'Guitar'),
			row('b-w', 'b', 'want', 'Spreadsheets'),
			row('c-o', 'c', 'offer', 'Chess')
		]);
	await db.insert(schema.contactMethods).values([
		{ userId: 'a', kind: 'telegram', valueEncrypted: 'enc-a', label: 'Telegram' },
		{ userId: 'b', kind: 'email', valueEncrypted: 'enc-b', label: 'Email' }
	]);
});

describe('state machine', () => {
	it('only legal transitions', () => {
		expect(canTransition('pending', 'accepted')).toBe(true);
		expect(canTransition('pending', 'completed')).toBe(false);
		expect(canTransition('accepted', 'completed')).toBe(true);
		expect(canTransition('declined', 'accepted')).toBe(false);
		expect(canTransition('completed', 'cancelled')).toBe(false);
	});
});

describe('requestSwap', () => {
	it('creates a pending request and notifies the recipient', async () => {
		const id = await requestSwap(db, cid, 'a', 'b-o', 'a-o', 'Hi Bob');
		const s = await db.query.swapRequests.findFirst({ where: (s, { eq }) => eq(s.id, id) });
		expect(s).toMatchObject({
			status: 'pending',
			fromUserId: 'a',
			toUserId: 'b',
			wantSkillId: 'b-o',
			offerSkillId: 'a-o',
			note: 'Hi Bob'
		});
		const n = await db.query.notifications.findFirst({
			where: (n, { and, eq }) => and(eq(n.userId, 'b'), eq(n.kind, 'swap_requested'))
		});
		expect(n?.payload).toMatchObject({ swapId: id });
	});

	it('rejects duplicates, self-requests, foreign offers, and inactive targets', async () => {
		await expect(requestSwap(db, cid, 'a', 'b-o', null, '')).rejects.toThrow(
			/already have an open request/
		);
		await expect(requestSwap(db, cid, 'b', 'b-o', null, '')).rejects.toThrow(/yourself/);
		await expect(requestSwap(db, cid, 'c', 'b-o', 'a-o', '')).rejects.toThrow(
			/your own active offers/
		);
		await expect(requestSwap(db, cid, 'c', 'b-w', 'c-o', '')).resolves.toBeTruthy();
		await db
			.update(schema.skills)
			.set({ status: 'paused' })
			.where((await import('drizzle-orm')).eq(schema.skills.id, 'c-o'));
		await expect(requestSwap(db, cid, 'a', 'c-o', null, '')).rejects.toThrow(
			/no longer on the board/
		);
	});
});

describe('transitions and permissions', () => {
	it('only the recipient can accept or decline; only the sender can cancel while pending', async () => {
		const id = await requestSwap(db, cid, 'c', 'a-o', null, 'please');
		await expect(acceptSwap(db, id, 'c')).rejects.toThrow(/cannot do that/);
		await expect(cancelSwap(db, id, 'a')).rejects.toThrow(/cannot do that/);
		await expect(revealContacts(db, id, 'a')).rejects.toThrow(/unlock once/);
		await acceptSwap(db, id, 'a');
		const r = await revealContacts(db, id, 'a');
		expect(r.mine?.label).toBe('Telegram');
		expect(r.theirs).toBeUndefined();
		await expect(revealContacts(db, id, 'b')).rejects.toThrow(/Not your swap/);
		await expect(hasAcceptedBefore(db, 'a')).resolves.toBe(true);
		await expect(hasAcceptedBefore(db, 'c')).resolves.toBe(false);
		await expect(acceptSwap(db, id, 'a')).rejects.toThrow(/accepted swap cannot be accepted/);
		await cancelSwap(db, id, 'c');
		const n = await db.query.notifications.findMany({
			where: (n, { and, eq }) => and(eq(n.userId, 'a'), eq(n.kind, 'swap_cancelled'))
		});
		expect(n.length).toBe(1);
	});

	it('decline stores a reason and notifies the sender', async () => {
		const id = await requestSwap(db, cid, 'b', 'a-o', 'b-o', '');
		await declineSwap(db, id, 'a', 'Booked up');
		const s = await db.query.swapRequests.findFirst({ where: (s, { eq }) => eq(s.id, id) });
		expect(s?.declineReason).toBe('Booked up');
		const n = await db.query.notifications.findFirst({
			where: (n, { and, eq }) => and(eq(n.userId, 'b'), eq(n.kind, 'swap_declined'))
		});
		expect(n).toBeTruthy();
	});

	it('complete then thanks: one note per person, only after completion, notifies the other party', async () => {
		const id = await requestSwap(db, cid, 'b', 'a-o', null, '');
		await expect(leaveThanks(db, id, 'b', 'Great')).rejects.toThrow(/marked done/);
		await acceptSwap(db, id, 'a');
		await completeSwap(db, id, 'b');
		await leaveThanks(db, id, 'b', 'Alice is a patient teacher.');
		await expect(leaveThanks(db, id, 'b', 'Again')).rejects.toThrow(/already left/);
		await expect(leaveThanks(db, id, 'c', 'Not mine')).rejects.toThrow(/Not your swap/);
		await leaveThanks(db, id, 'a', 'Bob showed up on time.');
		const rows = await db.query.thanks.findMany({ where: (t, { eq }) => eq(t.swapRequestId, id) });
		expect(rows.map((r) => r.toUserId).sort()).toEqual(['a', 'b']);
		const n = await db.query.notifications.findFirst({
			where: (n, { and, eq }) => and(eq(n.userId, 'a'), eq(n.kind, 'thanks_received'))
		});
		expect(n).toBeTruthy();
		await expect(leaveThanks(db, id, 'a', 'x'.repeat(201))).rejects.toThrow(/under 200/);
	});
});

describe('listInbox', () => {
	it('splits received and sent with names, titles and thanks state', async () => {
		const items = await listInbox(db, 'a');
		expect(items.length).toBeGreaterThan(0);
		const received = items.filter((i) => i.direction === 'received');
		expect(received.every((i) => ['Bob B.', 'Cara C.'].includes(i.other.name))).toBe(true);
		const done = items.find((i) => i.status === 'completed');
		expect(done?.myThanks).toBe(true);
		expect(done?.target?.title).toBe('Excel');
	});
});
