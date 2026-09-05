import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { schema } from '$lib/server/db';
import { requireUser } from '$lib/server/guards';
import { clearSessionCookie, invalidateAllUserSessions } from '$lib/server/auth/session';
import { encryptContact } from '$lib/server/auth/crypto';
import {
	CONTACT_KINDS,
	CONTACT_LABELS,
	OwnedCommunityError,
	deleteAccount,
	publicName,
	validateContact,
	validateDisplayName,
	normalizeDisplayName,
	type ContactKind
} from '$lib/server/services/users';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const { db } = ctx(event);
	const row = await db.query.users.findFirst({
		where: eq(schema.users.id, user.id),
		with: { contact: true }
	});
	return {
		displayName: row?.displayName ?? '',
		bio: row?.bio ?? '',
		publicName: publicName(row?.displayName ?? ''),
		contactKind: row?.contact?.kind ?? 'telegram',
		contactLabel: row?.contact?.label ?? null,
		kinds: CONTACT_KINDS.map((k) => ({ id: k, label: CONTACT_LABELS[k] }))
	};
};

export const actions: Actions = {
	profile: async (event) => {
		const user = requireUser(event);
		const { db } = ctx(event);
		const form = await event.request.formData();
		const displayName = String(form.get('displayName') ?? '');
		const bio = String(form.get('bio') ?? '')
			.trim()
			.slice(0, 280);
		const err = validateDisplayName(displayName);
		if (err) return fail(400, { profile: { error: err, saved: false } });
		await db
			.update(schema.users)
			.set({ displayName: normalizeDisplayName(displayName), bio: bio || null })
			.where(eq(schema.users.id, user.id));
		return { profile: { error: null, saved: true } };
	},
	contact: async (event) => {
		const user = requireUser(event);
		const { db, env } = ctx(event);
		if (!env.CONTACT_KEY)
			return fail(500, { contact: { error: 'Missing CONTACT_KEY', saved: false } });
		const form = await event.request.formData();
		const kind = String(form.get('contactKind') ?? '');
		const value = String(form.get('contactValue') ?? '');
		const err = validateContact(kind, value);
		if (err) return fail(400, { contact: { error: err, saved: false } });
		const valueEncrypted = await encryptContact(env.CONTACT_KEY, value.trim());
		await db
			.insert(schema.contactMethods)
			.values({
				userId: user.id,
				kind: kind as ContactKind,
				valueEncrypted,
				label: CONTACT_LABELS[kind as ContactKind],
				updatedAt: new Date()
			})
			.onConflictDoUpdate({
				target: schema.contactMethods.userId,
				set: {
					kind: kind as ContactKind,
					valueEncrypted,
					label: CONTACT_LABELS[kind as ContactKind],
					updatedAt: new Date()
				}
			});
		return { contact: { error: null, saved: true } };
	},
	delete: async (event) => {
		const user = requireUser(event);
		const { db, env } = ctx(event);
		const form = await event.request.formData();
		if (String(form.get('confirm') ?? '') !== 'delete')
			return fail(400, { del: { error: 'Type delete to confirm.' } });
		try {
			await invalidateAllUserSessions(db, env.SESSIONS, user.id);
			await deleteAccount(db, user.id);
		} catch (e) {
			if (e instanceof OwnedCommunityError)
				return fail(400, {
					del: { error: `You still own ${e.slugs.join(', ')}. Hand it to a moderator first.` }
				});
			throw e;
		}
		clearSessionCookie(event.cookies, event.url.protocol === 'https:');
		redirect(303, '/?deleted=1');
	}
};
