import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { loadAccess, requireMember } from '$lib/server/access';
import { CATEGORIES } from '$lib/server/db/categories';
import {
	QUOTA_PER_KIND,
	SkillError,
	createSkill,
	validateSkillInput,
	type SkillInput
} from '$lib/server/services/skills';
import { parseSkillForm } from '$lib/server/skill-form';
import { publicName } from '$lib/server/services/users';
import { schema } from '$lib/server/db';
import { and, eq, inArray, count } from 'drizzle-orm';

async function quota(db: ReturnType<typeof ctx>['db'], communityId: string, userId: string) {
	const rows = await db
		.select({ kind: schema.skills.kind, n: count() })
		.from(schema.skills)
		.where(
			and(
				eq(schema.skills.communityId, communityId),
				eq(schema.skills.userId, userId),
				inArray(schema.skills.status, ['active', 'pending', 'paused'])
			)
		)
		.groupBy(schema.skills.kind);
	return {
		offer: rows.find((r) => r.kind === 'offer')?.n ?? 0,
		want: rows.find((r) => r.kind === 'want')?.n ?? 0,
		max: QUOTA_PER_KIND
	};
}

export const load: PageServerLoad = async (event) => {
	const { db } = ctx(event);
	const access = await loadAccess(db, event, event.params.slug);
	const m = requireMember(access, event);
	const kind: SkillInput['kind'] = event.url.searchParams.get('kind') === 'want' ? 'want' : 'offer';
	const values: SkillInput = {
		kind,
		categoryId: 'tech',
		title: '',
		description: '',
		level: 'beginner',
		format: 'either',
		availability: ''
	};
	return {
		values,
		categories: CATEGORIES.map((c) => ({ id: c.id, name: c.name })),
		authorName: publicName(event.locals.user!.displayName),
		quota: await quota(db, access.community.id, m.userId),
		trusted: m.trustedAt !== null
	};
};

export const actions: Actions = {
	default: async (event) => {
		const { db } = ctx(event);
		const access = await loadAccess(db, event, event.params.slug);
		const m = requireMember(access, event);
		const input = parseSkillForm(await event.request.formData());
		const errors = validateSkillInput(input);
		if (Object.keys(errors).length) return fail(400, { errors, values: input });
		try {
			const skill = await createSkill(
				db,
				access.community.id,
				m.userId,
				m.trustedAt !== null,
				input
			);
			redirect(303, `/c/${access.community.slug}/s/${skill.id}`);
		} catch (e) {
			if (e instanceof SkillError) {
				const errors: Record<string, string> = { [e.field ?? 'title']: e.message };
				return fail(400, { errors, values: input });
			}
			throw e;
		}
	}
};
