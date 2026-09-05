import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { schema } from '$lib/server/db';
import { safeNext } from '$lib/server/auth/oauth';
import {
	CONTACT_KINDS,
	CONTACT_LABELS,
	completeOnboarding,
	validateContact,
	validateDisplayName,
	type ContactKind
} from '$lib/server/services/users';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	const next = safeNext(event.url.searchParams.get('next'));
	if (!user) redirect(303, `/auth/login?next=${encodeURIComponent(`/onboarding?next=${next}`)}`);
	if (user.onboarded) redirect(303, next);
	const { db } = ctx(event);
	const row = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) });
	return {
		displayName: row?.displayName ?? '',
		next,
		kinds: CONTACT_KINDS.map((k) => ({ id: k, label: CONTACT_LABELS[k] }))
	};
};

export const actions: Actions = {
	default: async (event) => {
		const user = event.locals.user;
		if (!user) redirect(303, '/auth/login');
		const { db, env } = ctx(event);
		if (!env.CONTACT_KEY) return fail(500, { message: 'This instance is missing CONTACT_KEY.' });
		const form = await event.request.formData();
		const displayName = String(form.get('displayName') ?? '');
		const contactKind = String(form.get('contactKind') ?? '');
		const contactValue = String(form.get('contactValue') ?? '');
		const bio = String(form.get('bio') ?? '').slice(0, 280);
		const next = safeNext(String(form.get('next') ?? '/'));

		const errors: Record<string, string> = {};
		const nameErr = validateDisplayName(displayName);
		if (nameErr) errors.displayName = nameErr;
		const contactErr = validateContact(contactKind, contactValue);
		if (contactErr) errors.contact = contactErr;
		if (Object.keys(errors).length) return fail(400, { errors, displayName, contactKind, bio });

		await completeOnboarding(db, env.CONTACT_KEY, user.id, {
			displayName,
			contactKind: contactKind as ContactKind,
			contactValue,
			bio
		});
		redirect(303, next);
	}
};
