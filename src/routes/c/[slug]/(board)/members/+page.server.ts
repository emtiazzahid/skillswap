import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { loadAccess, requireModerator, requireOwner } from '$lib/server/access';
import {
	CommunityError,
	leaveCommunity,
	listMembers,
	setBanned,
	setModerator
} from '$lib/server/services/communities';
import { publicName } from '$lib/server/services/users';

export const load: PageServerLoad = async (event) => {
	const { db } = ctx(event);
	const access = await loadAccess(db, event, event.params.slug);
	const rows = await listMembers(db, access.community.id);
	return {
		members: rows.map((m) => ({
			...m,
			name: access.canModerate ? m.displayName : publicName(m.displayName),
			notices: Number(m.notices),
			swaps: Number(m.swaps),
			isSelf: m.userId === event.locals.user?.id
		}))
	};
};

async function moderate(
	event: Parameters<Actions[string]>[0],
	fn: (a: Awaited<ReturnType<typeof loadAccess>>, target: string) => Promise<void>
) {
	const { db } = ctx(event);
	const access = await loadAccess(db, event, event.params.slug);
	const form = await event.request.formData();
	const target = String(form.get('userId') ?? '');
	try {
		await fn(access, target);
	} catch (e) {
		if (e instanceof CommunityError) return fail(400, { message: e.message });
		throw e;
	}
	return { ok: true };
}

export const actions: Actions = {
	ban: (event) =>
		moderate(event, async (a, t) => {
			requireModerator(a);
			await setBanned(ctx(event).db, a.community.id, a.role!, t, true);
		}),
	unban: (event) =>
		moderate(event, async (a, t) => {
			requireModerator(a);
			await setBanned(ctx(event).db, a.community.id, a.role!, t, false);
		}),
	promote: (event) =>
		moderate(event, async (a, t) => {
			requireOwner(a);
			await setModerator(ctx(event).db, a.community.id, t, true);
		}),
	demote: (event) =>
		moderate(event, async (a, t) => {
			requireOwner(a);
			await setModerator(ctx(event).db, a.community.id, t, false);
		}),
	leave: async (event) => {
		const { db } = ctx(event);
		const access = await loadAccess(db, event, event.params.slug);
		if (!event.locals.user) return fail(401, { message: 'Sign in first.' });
		try {
			await leaveCommunity(db, access.community.id, event.locals.user.id);
		} catch (e) {
			if (e instanceof CommunityError) return fail(400, { message: e.message });
			throw e;
		}
		return { left: true };
	}
};
