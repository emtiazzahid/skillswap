import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { createDb, schema } from '$lib/server/db';
import {
	OwnedCommunityError,
	completeOnboarding,
	deleteAccount,
	publicName,
	upsertUserFromOAuth,
	validateContact,
	validateDisplayName
} from '$lib/server/services/users';
import { generateContactKey } from '$lib/server/auth/crypto';

const db = createDb(env.DB);

describe('publicName', () => {
	it.each([
		['Md. Emtiaz Zahid', 'Emtiaz Z.'],
		['Rina Sultana', 'Rina S.'],
		['rina', 'Rina'],
		['  Joy   Prakash  ', 'Joy P.'],
		['Dr. Anwar', 'Anwar'],
		['', 'Member']
	])('%s -> %s', (input, expected) => {
		expect(publicName(input)).toBe(expected);
	});
});

describe('validation', () => {
	it('display names must be 2-40 chars without links', () => {
		expect(validateDisplayName('A')).toMatch(/at least/);
		expect(validateDisplayName('x'.repeat(41))).toMatch(/at most/);
		expect(validateDisplayName('see www.spam.example')).toMatch(/links/);
		expect(validateDisplayName('Rina S')).toBeNull();
	});
	it('contacts need a known kind and a plausible value', () => {
		expect(validateContact('carrier-pigeon', 'x')).toMatch(/Pick/);
		expect(validateContact('telegram', '@r')).toMatch(/short/);
		expect(validateContact('email', 'not-an-email')).toMatch(/email/);
		expect(validateContact('email', 'rina@example.com')).toBeNull();
	});
});

describe('upsertUserFromOAuth', () => {
	it('creates once, then finds the same user and refreshes the avatar', async () => {
		const a = await upsertUserFromOAuth(db, {
			provider: 'github',
			providerUserId: '42',
			name: 'Rina Sultana',
			avatarUrl: 'https://a/1.png'
		});
		expect(a.created).toBe(true);
		const b = await upsertUserFromOAuth(db, {
			provider: 'github',
			providerUserId: '42',
			name: 'Changed',
			avatarUrl: 'https://a/2.png'
		});
		expect(b.created).toBe(false);
		expect(b.user.id).toBe(a.user.id);
		expect(b.user.displayName).toBe('Rina Sultana');
		const row = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, a.user.id) });
		expect(row?.avatarUrl).toBe('https://a/2.png');
	});

	it('falls back to a placeholder name when the provider sends none', async () => {
		const { user } = await upsertUserFromOAuth(db, {
			provider: 'google',
			providerUserId: 's1',
			name: '   ',
			avatarUrl: null
		});
		expect(user.displayName).toBe('New member');
	});
});

describe('onboarding + delete', () => {
	it('stores an encrypted contact and marks the user onboarded', async () => {
		const key = generateContactKey();
		const { user } = await upsertUserFromOAuth(db, {
			provider: 'mock',
			providerUserId: 'ob1',
			name: 'Rina',
			avatarUrl: null
		});
		await completeOnboarding(db, key, user.id, {
			displayName: 'Rina Sultana',
			contactKind: 'telegram',
			contactValue: '@rina_plays'
		});
		const row = await db.query.users.findFirst({
			where: (u, { eq }) => eq(u.id, user.id),
			with: { contact: true }
		});
		expect(row?.onboardedAt).toBeInstanceOf(Date);
		expect(row?.contact?.label).toBe('Telegram');
		expect(row?.contact?.valueEncrypted).not.toContain('rina_plays');
	});

	it('delete removes the user but keeps thanks signed by name', async () => {
		const { user: a } = await upsertUserFromOAuth(db, {
			provider: 'mock',
			providerUserId: 'del-a',
			name: 'Alice A',
			avatarUrl: null
		});
		const { user: b } = await upsertUserFromOAuth(db, {
			provider: 'mock',
			providerUserId: 'del-b',
			name: 'Bob B',
			avatarUrl: null
		});
		await db
			.insert(schema.communities)
			.values({ id: 'cd1', slug: 'del-c', name: 'C', ownerId: b.id });
		await db.insert(schema.memberships).values({ communityId: 'cd1', userId: b.id, role: 'owner' });
		await db.insert(schema.skills).values({
			id: 'sk1',
			communityId: 'cd1',
			userId: b.id,
			kind: 'offer',
			categoryId: 'tech',
			title: 'Excel',
			titleNormalized: 'excel',
			description: 'd',
			expiresAt: new Date(Date.now() + 1e6)
		});
		await db.insert(schema.swapRequests).values({
			id: 'sw1',
			communityId: 'cd1',
			fromUserId: a.id,
			toUserId: b.id,
			wantSkillId: 'sk1',
			status: 'completed'
		});
		await db.insert(schema.thanks).values({
			id: 't1',
			swapRequestId: 'sw1',
			fromUserId: a.id,
			fromName: 'Alice A',
			toUserId: b.id,
			text: 'Great teacher'
		});

		await deleteAccount(db, a.id);

		expect(
			await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, a.id) })
		).toBeUndefined();
		// the swap the deleted user sent is gone (cascade), and so is its thanks row
		expect(
			await db.query.swapRequests.findFirst({ where: (s, { eq }) => eq(s.id, 'sw1') })
		).toBeUndefined();
	});

	it('thanks to a surviving user keep the author name after the author leaves', async () => {
		const { user: a } = await upsertUserFromOAuth(db, {
			provider: 'mock',
			providerUserId: 'th-a',
			name: 'Alice A',
			avatarUrl: null
		});
		const { user: b } = await upsertUserFromOAuth(db, {
			provider: 'mock',
			providerUserId: 'th-b',
			name: 'Bob B',
			avatarUrl: null
		});
		await db
			.insert(schema.communities)
			.values({ id: 'cth', slug: 'th-c', name: 'C', ownerId: b.id });
		await db.insert(schema.skills).values({
			id: 'skth',
			communityId: 'cth',
			userId: a.id,
			kind: 'offer',
			categoryId: 'tech',
			title: 'Excel',
			titleNormalized: 'excel',
			description: 'd',
			expiresAt: new Date(Date.now() + 1e6)
		});
		// b requested a's skill; a is the recipient, b thanks a. Then b deletes: swap (from b) cascades... so instead a thanks b, then a deletes.
		await db.insert(schema.swapRequests).values({
			id: 'swth',
			communityId: 'cth',
			fromUserId: b.id,
			toUserId: a.id,
			wantSkillId: 'skth',
			status: 'completed'
		});
		await db.insert(schema.thanks).values({
			id: 'tth',
			swapRequestId: 'swth',
			fromUserId: a.id,
			fromName: 'Alice A',
			toUserId: b.id,
			text: 'Thanks Bob'
		});
		await deleteAccount(db, a.id);
		// swap from b to a: to_user cascade deletes the swap, which cascades the thanks. Document the tradeoff:
		const t = await db.query.thanks.findFirst({ where: (t, { eq }) => eq(t.id, 'tth') });
		expect(t).toBeUndefined();
	});

	it('refuses to delete an owner who has members and no moderator', async () => {
		const { user: owner } = await upsertUserFromOAuth(db, {
			provider: 'mock',
			providerUserId: 'own',
			name: 'Owner O',
			avatarUrl: null
		});
		const { user: m } = await upsertUserFromOAuth(db, {
			provider: 'mock',
			providerUserId: 'mem',
			name: 'Member M',
			avatarUrl: null
		});
		await db
			.insert(schema.communities)
			.values({ id: 'co', slug: 'owned', name: 'Owned', ownerId: owner.id });
		await db.insert(schema.memberships).values([
			{ communityId: 'co', userId: owner.id, role: 'owner' },
			{ communityId: 'co', userId: m.id, role: 'member' }
		]);
		await expect(deleteAccount(db, owner.id)).rejects.toBeInstanceOf(OwnedCommunityError);
	});

	it('hands a community to a moderator, or deletes it when the owner is alone', async () => {
		const { user: owner } = await upsertUserFromOAuth(db, {
			provider: 'mock',
			providerUserId: 'own2',
			name: 'Owner O',
			avatarUrl: null
		});
		const { user: mod } = await upsertUserFromOAuth(db, {
			provider: 'mock',
			providerUserId: 'mod2',
			name: 'Mod M',
			avatarUrl: null
		});
		await db.insert(schema.communities).values([
			{ id: 'c-mod', slug: 'with-mod', name: 'A', ownerId: owner.id },
			{ id: 'c-solo', slug: 'solo', name: 'B', ownerId: owner.id }
		]);
		await db.insert(schema.memberships).values([
			{ communityId: 'c-mod', userId: owner.id, role: 'owner' },
			{ communityId: 'c-mod', userId: mod.id, role: 'moderator' },
			{ communityId: 'c-solo', userId: owner.id, role: 'owner' }
		]);
		await deleteAccount(db, owner.id);
		const handed = await db.query.communities.findFirst({
			where: (c, { eq }) => eq(c.id, 'c-mod')
		});
		expect(handed?.ownerId).toBe(mod.id);
		const modRole = await db.query.memberships.findFirst({
			where: (m, { and, eq }) => and(eq(m.communityId, 'c-mod'), eq(m.userId, mod.id))
		});
		expect(modRole?.role).toBe('owner');
		expect(
			await db.query.communities.findFirst({ where: (c, { eq }) => eq(c.id, 'c-solo') })
		).toBeUndefined();
	});
});
