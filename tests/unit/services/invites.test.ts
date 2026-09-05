import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { createDb, schema } from '$lib/server/db';
import { createCommunity, setBanned } from '$lib/server/services/communities';
import {
	INVITE_TTL_MS,
	consumeInvite,
	createInvite,
	hashInviteToken,
	listActiveInvites,
	revokeInvite
} from '$lib/server/services/invites';

const db = createDb(env.DB);
let communityId: string;

beforeAll(async () => {
	await db
		.insert(schema.users)
		.values([
			{ id: 'own', displayName: 'Owner' },
			{ id: 'g1', displayName: 'Guest 1' },
			{ id: 'g2', displayName: 'Guest 2' },
			{ id: 'g3', displayName: 'Guest 3' }
		])
		.onConflictDoNothing();
	const c = await createCommunity(db, 'own', {
		name: 'Invite Board',
		slug: 'invite-board',
		visibility: 'invite'
	});
	communityId = c.id;
});

describe('invites', () => {
	it('stores only a hash of the token', async () => {
		const { token } = await createInvite(db, communityId, 'own');
		const rows = await db.query.invites.findMany();
		expect(rows.some((r) => r.tokenHash === hashInviteToken(token))).toBe(true);
		expect(rows.some((r) => r.tokenHash === token)).toBe(false);
	});

	it('consuming increments uses and stops at max', async () => {
		const { token } = await createInvite(db, communityId, 'own', 2);
		await consumeInvite(db, communityId, 'g1', token);
		await consumeInvite(db, communityId, 'g2', token);
		await expect(consumeInvite(db, communityId, 'g3', token)).rejects.toThrow(/used up/);
	});

	it('an existing member consuming again does not burn a use', async () => {
		const { token, id } = await createInvite(db, communityId, 'own', 5);
		await consumeInvite(db, communityId, 'g1', token);
		const row = await db.query.invites.findFirst({ where: (i, { eq }) => eq(i.id, id) });
		expect(row?.usedCount).toBe(0);
	});

	it('expired and revoked invites are rejected', async () => {
		const start = Date.now();
		const { token } = await createInvite(db, communityId, 'own', 5, start);
		await expect(
			consumeInvite(db, communityId, 'g3', token, start + INVITE_TTL_MS + 1)
		).rejects.toThrow(/expired/);
		const second = await createInvite(db, communityId, 'own', 5);
		await revokeInvite(db, communityId, second.id);
		await expect(consumeInvite(db, communityId, 'g3', second.token)).rejects.toThrow(/revoked/);
	});

	it('an invite for another board does not work here', async () => {
		const other = await createCommunity(db, 'own', {
			name: 'Other',
			slug: 'other-board',
			visibility: 'invite'
		});
		const { token } = await createInvite(db, other.id, 'own');
		await expect(consumeInvite(db, communityId, 'g3', token)).rejects.toThrow(/not valid/);
	});

	it('banned users cannot use an invite to sneak back', async () => {
		const { token } = await createInvite(db, communityId, 'own', 5);
		await consumeInvite(db, communityId, 'g3', token);
		await setBanned(db, communityId, 'owner', 'g3', true);
		await expect(consumeInvite(db, communityId, 'g3', token)).rejects.toThrow(/removed/);
	});

	it('active list hides revoked, expired and exhausted invites', async () => {
		const c = await createCommunity(db, 'own', {
			name: 'List',
			slug: 'list-board',
			visibility: 'invite'
		});
		const a = await createInvite(db, c.id, 'own', 1);
		const b = await createInvite(db, c.id, 'own', 5);
		await revokeInvite(db, c.id, b.id);
		await consumeInvite(db, c.id, 'g1', a.token);
		await createInvite(db, c.id, 'own', 5);
		expect((await listActiveInvites(db, c.id)).length).toBe(1);
	});
});
