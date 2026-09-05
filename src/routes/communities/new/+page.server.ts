import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { requireUser } from '$lib/server/guards';
import { checkRateLimit } from '$lib/server/ratelimit';
import {
	CommunityError,
	createCommunity,
	validateCommunityInput
} from '$lib/server/services/communities';
import { slugify } from '$lib/server/slug';

export const load: PageServerLoad = async (event) => {
	requireUser(event);
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const user = requireUser(event);
		const { db, env } = ctx(event);
		const form = await event.request.formData();
		const input = {
			name: String(form.get('name') ?? ''),
			slug: String(form.get('slug') ?? '') || slugify(String(form.get('name') ?? '')),
			tagline: String(form.get('tagline') ?? ''),
			description: String(form.get('description') ?? ''),
			areaLabel: String(form.get('areaLabel') ?? ''),
			visibility: (String(form.get('visibility') ?? 'public') === 'invite'
				? 'invite'
				: 'public') as 'public' | 'invite'
		};
		const errors = validateCommunityInput(input);
		if (Object.keys(errors).length) return fail(400, { errors, values: input });
		const rl = await checkRateLimit(env.SESSIONS, `community:${user.id}`, 3, 24 * 60 * 60);
		if (!rl.allowed) {
			const errors: Record<string, string> = {
				name: 'Three boards a day is plenty. Try again tomorrow.'
			};
			return fail(429, { errors, values: input });
		}
		try {
			const c = await createCommunity(db, user.id, input);
			redirect(303, `/c/${c.slug}`);
		} catch (e) {
			if (e instanceof CommunityError) {
				const errors: Record<string, string> = { [e.field ?? 'name']: e.message };
				return fail(400, { errors, values: input });
			}
			throw e;
		}
	}
};
