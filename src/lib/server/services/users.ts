import { and, eq, ne, sql } from 'drizzle-orm';
import { schema, type Db } from '../db';
import { newId } from '../ids';
import type { OAuthProfile } from '../auth/oauth';
import { encryptContact } from '../auth/crypto';

const HONORIFIC = /^(mr|mrs|ms|md|dr|prof|sk|sheikh|syed)\.?$/i;

/** "Md. Emtiaz Zahid" -> "Emtiaz Z."; "Rina" -> "Rina"; "rina sultana" -> "Rina S." */
export function publicName(displayName: string): string {
	const tokens = displayName.trim().split(/\s+/).filter(Boolean);
	while (tokens.length > 1 && HONORIFIC.test(tokens[0])) tokens.shift();
	if (tokens.length === 0) return 'Member';
	const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
	const first = cap(tokens[0]);
	if (tokens.length === 1) return first;
	return `${first} ${tokens[tokens.length - 1].charAt(0).toUpperCase()}.`;
}

export function normalizeDisplayName(raw: string): string {
	return raw.replace(/\s+/g, ' ').trim();
}

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 40;

export function validateDisplayName(raw: string): string | null {
	const name = normalizeDisplayName(raw);
	if (name.length < DISPLAY_NAME_MIN) return `Name needs at least ${DISPLAY_NAME_MIN} characters.`;
	if (name.length > DISPLAY_NAME_MAX) return `Name can be at most ${DISPLAY_NAME_MAX} characters.`;
	if (/https?:\/\/|www\./i.test(name)) return 'Names cannot contain links.';
	return null;
}

/** Find the user for an OAuth identity, or create one. Returns the user and whether it was just created. */
export async function upsertUserFromOAuth(db: Db, profile: OAuthProfile) {
	const existing = await db.query.oauthAccounts.findFirst({
		where: and(
			eq(schema.oauthAccounts.provider, profile.provider),
			eq(schema.oauthAccounts.providerUserId, profile.providerUserId)
		),
		with: { user: true }
	});
	if (existing?.user && !existing.user.deletedAt) {
		if (profile.avatarUrl && profile.avatarUrl !== existing.user.avatarUrl) {
			await db
				.update(schema.users)
				.set({ avatarUrl: profile.avatarUrl })
				.where(eq(schema.users.id, existing.user.id));
		}
		return { user: existing.user, created: false };
	}
	const id = newId();
	const displayName = normalizeDisplayName(profile.name).slice(0, DISPLAY_NAME_MAX) || 'New member';
	await db.insert(schema.users).values({ id, displayName, avatarUrl: profile.avatarUrl });
	await db
		.insert(schema.oauthAccounts)
		.values({ provider: profile.provider, providerUserId: profile.providerUserId, userId: id })
		.onConflictDoUpdate({
			target: [schema.oauthAccounts.provider, schema.oauthAccounts.providerUserId],
			set: { userId: id }
		});
	const user = (await db.query.users.findFirst({ where: eq(schema.users.id, id) }))!;
	return { user, created: true };
}

export const CONTACT_KINDS = [
	'email',
	'telegram',
	'whatsapp',
	'signal',
	'discord',
	'other'
] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];
export const CONTACT_LABELS: Record<ContactKind, string> = {
	email: 'Email',
	telegram: 'Telegram',
	whatsapp: 'WhatsApp',
	signal: 'Signal',
	discord: 'Discord',
	other: 'Other'
};

export function validateContact(kind: string, value: string): string | null {
	if (!(CONTACT_KINDS as readonly string[]).includes(kind)) return 'Pick a contact method.';
	const v = value.trim();
	if (v.length < 3) return 'That contact looks too short.';
	if (v.length > 120) return 'That contact looks too long.';
	if (kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
		return 'That email does not look right.';
	return null;
}

export async function completeOnboarding(
	db: Db,
	contactKey: string,
	userId: string,
	input: { displayName: string; contactKind: ContactKind; contactValue: string; bio?: string }
) {
	const valueEncrypted = await encryptContact(contactKey, input.contactValue.trim());
	await db
		.update(schema.users)
		.set({
			displayName: normalizeDisplayName(input.displayName),
			bio: input.bio?.trim() || null,
			onboardedAt: new Date()
		})
		.where(eq(schema.users.id, userId));
	await db
		.insert(schema.contactMethods)
		.values({
			userId,
			kind: input.contactKind,
			valueEncrypted,
			label: CONTACT_LABELS[input.contactKind],
			updatedAt: new Date()
		})
		.onConflictDoUpdate({
			target: schema.contactMethods.userId,
			set: {
				kind: input.contactKind,
				valueEncrypted,
				label: CONTACT_LABELS[input.contactKind],
				updatedAt: new Date()
			}
		});
}

export class OwnedCommunityError extends Error {
	constructor(public readonly slugs: string[]) {
		super(`Transfer ownership of: ${slugs.join(', ')}`);
	}
}

/**
 * Hard delete. Thanks notes survive with from_user_id nulled (schema ON DELETE SET NULL) and keep from_name.
 * Communities the user owns: hand to another moderator if one exists, delete if the user is the only member,
 * otherwise refuse so the user can transfer ownership explicitly.
 */
export async function deleteAccount(db: Db, userId: string) {
	const owned = await db.query.communities.findMany({
		where: and(eq(schema.communities.ownerId, userId))
	});
	const blocked: string[] = [];
	for (const c of owned) {
		const mod = await db.query.memberships.findFirst({
			where: and(
				eq(schema.memberships.communityId, c.id),
				eq(schema.memberships.role, 'moderator'),
				ne(schema.memberships.userId, userId)
			)
		});
		if (mod) {
			await db
				.update(schema.communities)
				.set({ ownerId: mod.userId })
				.where(eq(schema.communities.id, c.id));
			await db
				.update(schema.memberships)
				.set({ role: 'owner' })
				.where(
					and(eq(schema.memberships.communityId, c.id), eq(schema.memberships.userId, mod.userId))
				);
			continue;
		}
		const [{ n }] = await db
			.select({ n: sql<number>`count(*)` })
			.from(schema.memberships)
			.where(and(eq(schema.memberships.communityId, c.id), ne(schema.memberships.userId, userId)));
		if (Number(n) === 0) {
			await db.delete(schema.communities).where(eq(schema.communities.id, c.id));
		} else {
			blocked.push(c.slug);
		}
	}
	if (blocked.length) throw new OwnedCommunityError(blocked);
	await db.delete(schema.users).where(eq(schema.users.id, userId));
}
