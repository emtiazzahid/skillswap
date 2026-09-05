import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { availableProviders, beginOAuth, isProviderName } from '$lib/server/auth/oauth';
import { ctx } from '$lib/server/context';

export const GET: RequestHandler = async (event) => {
	const { env } = ctx(event);
	const provider = event.params.provider;
	if (!isProviderName(provider) || !availableProviders(env).includes(provider))
		error(404, 'Unknown sign-in provider');
	const url = await beginOAuth(
		env,
		env.SESSIONS,
		provider,
		event.url.searchParams.get('next') ?? '/'
	);
	redirect(302, url.toString());
};
