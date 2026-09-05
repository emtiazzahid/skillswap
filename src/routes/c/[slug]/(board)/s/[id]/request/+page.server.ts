import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { loadAccess, requireMember } from '$lib/server/access';
import { getSkill, listUserSkills } from '$lib/server/services/skills';
import { NOTE_MAX, SwapError, requestSwap } from '$lib/server/services/swaps';
import { publicName } from '$lib/server/services/users';
import { checkRateLimit } from '$lib/server/ratelimit';

async function setup(event: Parameters<PageServerLoad>[0] | Parameters<Actions[string]>[0]) {
	const { db, env } = ctx(event);
	const access = await loadAccess(db, event, event.params.slug);
	const m = requireMember(access, event);
	const target = await getSkill(db, event.params.id);
	if (!target || target.communityId !== access.community.id || target.status !== 'active')
		error(404, 'That notice fell off the board.');
	if (target.userId === m.userId) redirect(303, `/c/${access.community.slug}/s/${target.id}`);
	return { db, env, access, m, target };
}

export const load: PageServerLoad = async (event) => {
	const { db, access, m, target } = await setup(event);
	const [myOffers, theirWants] = await Promise.all([
		(await listUserSkills(db, access.community.id, m.userId)).filter((s) => s.kind === 'offer'),
		(await listUserSkills(db, access.community.id, target.userId)).filter((s) => s.kind === 'want')
	]);
	const preselect = event.url.searchParams.get('offer');
	return {
		target: {
			id: target.id,
			title: target.title,
			kind: target.kind,
			categoryName: target.category.name
		},
		owner: {
			id: target.userId,
			name: publicName(target.user.displayName),
			first: publicName(target.user.displayName).split(' ')[0]
		},
		theirWants: theirWants.map((w) => ({ id: w.id, title: w.title, categoryId: w.categoryId })),
		myOffers: myOffers.map((o) => ({
			id: o.id,
			title: o.title,
			categoryId: o.categoryId,
			matchesWant: theirWants.some((w) => w.categoryId === o.categoryId)
		})),
		preselect: myOffers.some((o) => o.id === preselect) ? preselect : null,
		noteMax: NOTE_MAX
	};
};

export const actions: Actions = {
	default: async (event) => {
		const { db, env, access, m, target } = await setup(event);
		const form = await event.request.formData();
		const offer = String(form.get('offer') ?? '');
		const note = String(form.get('note') ?? '');
		const rl = await checkRateLimit(
			env.SESSIONS,
			`swapreq:${m.userId}:${access.community.id}`,
			10,
			24 * 60 * 60
		);
		if (!rl.allowed)
			return fail(429, {
				error: 'Ten requests a day on one board is plenty. Try again tomorrow.',
				note
			});
		try {
			await requestSwap(
				db,
				access.community.id,
				m.userId,
				target.id,
				offer === 'none' || !offer ? null : offer,
				note
			);
		} catch (e) {
			if (e instanceof SwapError) return fail(400, { error: e.message, note });
			throw e;
		}
		redirect(303, `/inbox?sent=1`);
	}
};
