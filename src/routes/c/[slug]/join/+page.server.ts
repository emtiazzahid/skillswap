import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import {
	getCommunityBySlug,
	getMembership,
	joinCommunity,
	CommunityError
} from '$lib/server/services/communities';
import { consumeInvite } from '$lib/server/services/invites';
import { safeNext } from '$lib/server/auth/oauth';
import { error } from '@sveltejs/kit';

type Ev = { params: { slug: string }; url: URL; platform: Readonly<App.Platform> | undefined };

async function resolve(event: Ev) {
	const { db } = ctx(event);
	const community = await getCommunityBySlug(db, event.params.slug);
	const token = event.url.searchParams.get('t');
	if (!community || (community.visibility === 'invite' && !token)) error(404, 'No board here.');
	return { db, community, token };
}

export const load: PageServerLoad = async (event) => {
	const { db, community, token } = await resolve(event);
	const next =
		safeNext(event.url.searchParams.get('next')) === '/'
			? `/c/${community.slug}`
			: safeNext(event.url.searchParams.get('next'));
	if (!event.locals.user)
		redirect(303, `/auth/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	if (!event.locals.user.onboarded)
		redirect(303, `/onboarding?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	const m = await getMembership(db, community.id, event.locals.user.id);
	if (m && !m.bannedAt) redirect(303, next);
	if (m?.bannedAt) error(403, 'You have been removed from this board.');
	return {
		community: {
			name: community.name,
			slug: community.slug,
			tagline: community.tagline,
			visibility: community.visibility
		},
		token,
		next
	};
};

export const actions: Actions = {
	default: async (event) => {
		const { db, community, token } = await resolve(event);
		const user = event.locals.user;
		if (!user) redirect(303, '/auth/login');
		const form = await event.request.formData();
		const next =
			safeNext(String(form.get('next') ?? '')) === '/'
				? `/c/${community.slug}`
				: safeNext(String(form.get('next') ?? ''));
		try {
			if (community.visibility === 'invite') await consumeInvite(db, community.id, user.id, token!);
			else await joinCommunity(db, community.id, user.id);
		} catch (e) {
			if (e instanceof CommunityError) return fail(400, { message: e.message });
			throw e;
		}
		redirect(303, next);
	}
};
