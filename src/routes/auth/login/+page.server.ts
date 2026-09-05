import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { availableProviders, safeNext } from '$lib/server/auth/oauth';
import { ctx } from '$lib/server/context';

export const load: PageServerLoad = async (event) => {
	const next = safeNext(event.url.searchParams.get('next'));
	if (event.locals.user)
		redirect(
			303,
			event.locals.user.onboarded ? next : `/onboarding?next=${encodeURIComponent(next)}`
		);
	const { env } = ctx(event);
	return { providers: availableProviders(env), next };
};
