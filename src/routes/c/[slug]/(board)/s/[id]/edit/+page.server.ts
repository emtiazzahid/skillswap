import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { loadAccess, requireMember } from '$lib/server/access';
import { CATEGORIES } from '$lib/server/db/categories';
import {
	QUOTA_PER_KIND,
	SkillError,
	deleteSkill,
	getSkill,
	renewSkill,
	setSkillStatus,
	updateSkill,
	validateSkillInput
} from '$lib/server/services/skills';
import { parseSkillForm } from '$lib/server/skill-form';
import { publicName } from '$lib/server/services/users';

async function own(event: Parameters<PageServerLoad>[0] | Parameters<Actions[string]>[0]) {
	const { db } = ctx(event);
	const access = await loadAccess(db, event, event.params.slug);
	const m = requireMember(access, event);
	const skill = await getSkill(db, event.params.id);
	if (!skill || skill.communityId !== access.community.id)
		error(404, 'That notice fell off the board.');
	if (skill.userId !== m.userId) error(403, 'Only the author can edit this notice.');
	return { db, access, skill };
}

export const load: PageServerLoad = async (event) => {
	const { skill } = await own(event);
	return {
		skill: { id: skill.id, status: skill.status, expiresAt: skill.expiresAt, title: skill.title },
		values: {
			kind: skill.kind,
			categoryId: skill.categoryId,
			title: skill.title,
			description: skill.description,
			level: skill.level,
			format: skill.format,
			availability: skill.availability ?? ''
		},
		categories: CATEGORIES.map((c) => ({ id: c.id, name: c.name })),
		authorName: publicName(event.locals.user!.displayName),
		quota: { offer: 0, want: 0, max: QUOTA_PER_KIND }
	};
};

export const actions: Actions = {
	update: async (event) => {
		const { db, access, skill } = await own(event);
		const input = parseSkillForm(await event.request.formData());
		const errors = validateSkillInput(input);
		if (Object.keys(errors).length) return fail(400, { errors, values: input });
		try {
			await updateSkill(db, skill.id, input);
		} catch (e) {
			if (e instanceof SkillError)
				return fail(400, {
					errors: { [e.field ?? 'title']: e.message } as Record<string, string>,
					values: input
				});
			throw e;
		}
		redirect(303, `/c/${access.community.slug}/s/${skill.id}`);
	},
	pause: async (event) => {
		const { db, skill } = await own(event);
		if (skill.status === 'active') await setSkillStatus(db, skill.id, 'paused');
		return { status: 'paused' };
	},
	resume: async (event) => {
		const { db, skill } = await own(event);
		if (skill.status === 'paused') await setSkillStatus(db, skill.id, 'active');
		return { status: 'active' };
	},
	renew: async (event) => {
		const { db, skill } = await own(event);
		await renewSkill(db, skill.id);
		return { renewed: true };
	},
	delete: async (event) => {
		const { db, access, skill } = await own(event);
		await deleteSkill(db, skill.id);
		redirect(303, `/c/${access.community.slug}?kind=${skill.kind}`);
	}
};
