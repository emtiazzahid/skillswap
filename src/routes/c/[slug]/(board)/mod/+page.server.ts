import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { bumpCommunityVersion } from '$lib/server/services/matching';
import { loadAccess, requireModerator } from '$lib/server/access';
import { pendingSkills } from '$lib/server/services/skills';
import {
	FLAG_LABELS,
	ModerationError,
	approveSkill,
	hideSkill,
	openFlags,
	resolveFlags,
	resolvedThisMonth,
	restoreSkill
} from '$lib/server/services/moderation';
import { CommunityError, setBanned } from '$lib/server/services/communities';
import { schema } from '$lib/server/db';
import { and, eq, count } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const { db } = ctx(event);
	const access = await loadAccess(db, event, event.params.slug);
	requireModerator(access);
	const [pending, flags, resolved] = await Promise.all([
		pendingSkills(db, access.community.id),
		openFlags(db, access.community.id),
		resolvedThisMonth(db, access.community.id)
	]);
	const withCounts = await Promise.all(
		pending.map(async (s) => {
			const [{ n }] = await db
				.select({ n: count() })
				.from(schema.skills)
				.where(
					and(
						eq(schema.skills.communityId, access.community.id),
						eq(schema.skills.userId, s.userId),
						eq(schema.skills.status, 'active')
					)
				);
			const m = await db.query.memberships.findFirst({
				where: and(
					eq(schema.memberships.communityId, access.community.id),
					eq(schema.memberships.userId, s.userId)
				)
			});
			return {
				id: s.id,
				kind: s.kind,
				categoryName: s.category.name,
				title: s.title,
				description: s.description,
				authorId: s.userId,
				authorName: s.user.displayName,
				previous: n,
				joinedAt: m?.joinedAt ?? s.createdAt
			};
		})
	);
	return {
		pending: withCounts,
		flags: flags.map((f) => ({ ...f, reasonLabels: f.reasons.map((r) => FLAG_LABELS[r]) })),
		resolved
	};
};

async function mod(
	event: Parameters<Actions[string]>[0],
	fn: (
		db: ReturnType<typeof ctx>['db'],
		a: Awaited<ReturnType<typeof loadAccess>>,
		form: FormData
	) => Promise<void>
) {
	const { db } = ctx(event);
	const access = await loadAccess(db, event, event.params.slug);
	requireModerator(access);
	try {
		await fn(db, access, await event.request.formData());
		await bumpCommunityVersion(ctx(event).env.SESSIONS, access.community.id);
	} catch (e) {
		if (e instanceof ModerationError || e instanceof CommunityError)
			return fail(400, { message: e.message });
		throw e;
	}
	return { ok: true };
}

export const actions: Actions = {
	approve: (e) =>
		mod(e, async (db, _a, f) => {
			await approveSkill(db, String(f.get('skillId')));
		}),
	hide: (e) =>
		mod(e, async (db, a, f) => {
			const id = String(f.get('skillId'));
			await hideSkill(db, id, 'Hidden by a moderator');
			await resolveFlags(db, a.community.id, 'skill', id, a.membership!.userId, 'hidden');
		}),
	hideban: (e) =>
		mod(e, async (db, a, f) => {
			const id = String(f.get('skillId'));
			const userId = String(f.get('userId'));
			await hideSkill(db, id, 'Hidden by a moderator');
			await setBanned(db, a.community.id, a.role!, userId, true);
			await resolveFlags(db, a.community.id, 'skill', id, a.membership!.userId, 'banned');
		}),
	restore: (e) =>
		mod(e, async (db, _a, f) => {
			await restoreSkill(db, String(f.get('skillId')));
		}),
	dismiss: (e) =>
		mod(e, async (db, a, f) => {
			await resolveFlags(
				db,
				a.community.id,
				String(f.get('targetType')) as 'skill' | 'user',
				String(f.get('targetId')),
				a.membership!.userId,
				'dismissed'
			);
		}),
	ban: (e) =>
		mod(e, async (db, a, f) => {
			const userId = String(f.get('userId'));
			await setBanned(db, a.community.id, a.role!, userId, true);
			await resolveFlags(
				db,
				a.community.id,
				String(f.get('targetType')) as 'skill' | 'user',
				String(f.get('targetId')),
				a.membership!.userId,
				'banned'
			);
		})
};
