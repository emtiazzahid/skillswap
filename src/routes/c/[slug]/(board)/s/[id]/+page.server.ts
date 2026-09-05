import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq, count, or } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { loadAccess } from '$lib/server/access';
import { getSkill, listUserSkills, FORMAT_LABELS, LEVEL_LABELS } from '$lib/server/services/skills';
import {
	FLAG_LABELS,
	FLAG_REASONS,
	ModerationError,
	flagTarget,
	type FlagReason
} from '$lib/server/services/moderation';
import { publicName } from '$lib/server/services/users';
import { schema } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
	const { db } = ctx(event);
	const access = await loadAccess(db, event, event.params.slug);
	const skill = await getSkill(db, event.params.id);
	if (!skill || skill.communityId !== access.community.id)
		error(404, 'That notice fell off the board.');
	const viewer = event.locals.user?.id ?? null;
	const isMine = viewer === skill.userId;
	const visible =
		skill.status === 'active' || isMine || (access.canModerate && skill.status !== 'expired');
	if (!visible) error(404, 'That notice fell off the board.');
	const [others, [{ swaps }], membership] = await Promise.all([
		listUserSkills(db, access.community.id, skill.userId),
		db
			.select({ swaps: count() })
			.from(schema.swapRequests)
			.where(
				and(
					eq(schema.swapRequests.status, 'completed'),
					or(
						eq(schema.swapRequests.fromUserId, skill.userId),
						eq(schema.swapRequests.toUserId, skill.userId)
					)
				)
			),
		db.query.memberships.findFirst({
			where: and(
				eq(schema.memberships.communityId, access.community.id),
				eq(schema.memberships.userId, skill.userId)
			)
		})
	]);
	return {
		skill: {
			id: skill.id,
			kind: skill.kind,
			categoryName: skill.category.name,
			title: skill.title,
			description: skill.description,
			level: LEVEL_LABELS[skill.level],
			format: FORMAT_LABELS[skill.format],
			availability: skill.availability,
			status: skill.status,
			createdAt: skill.createdAt,
			expiresAt: skill.expiresAt,
			userId: skill.userId
		},
		owner: {
			id: skill.userId,
			name: publicName(skill.user.displayName),
			avatarUrl: skill.user.avatarUrl,
			since: membership?.joinedAt ?? skill.user.createdAt,
			swaps
		},
		others: others
			.filter((s) => s.id !== skill.id)
			.map((s) => ({
				id: s.id,
				kind: s.kind,
				categoryName: s.category.name,
				title: s.title,
				availability: s.availability,
				format: s.format
			})),
		isMine,
		flagReasons: FLAG_REASONS.map((r) => ({ id: r, label: FLAG_LABELS[r] }))
	};
};

export const actions: Actions = {
	flag: async (event) => {
		const { db } = ctx(event);
		const access = await loadAccess(db, event, event.params.slug);
		if (!event.locals.user)
			redirect(303, `/auth/login?next=${encodeURIComponent(event.url.pathname)}`);
		if (!access.isMember)
			return fail(403, {
				flag: { error: 'Join the board to flag notices.', done: false, autoHidden: false }
			});
		const form = await event.request.formData();
		const reason = String(form.get('reason') ?? 'other') as FlagReason;
		if (!FLAG_REASONS.includes(reason))
			return fail(400, { flag: { error: 'Pick a reason.', done: false, autoHidden: false } });
		try {
			const r = await flagTarget(
				db,
				access.community.id,
				event.locals.user.id,
				'skill',
				event.params.id,
				reason,
				String(form.get('detail') ?? '')
			);
			// A hidden notice 404s for the reporter, so send them back to the board with a note.
			if (r.autoHidden) redirect(303, `/c/${access.community.slug}?flagged=hidden`);
			return { flag: { done: true, autoHidden: false, error: null } };
		} catch (e) {
			if (e instanceof ModerationError)
				return fail(400, { flag: { error: e.message, done: false, autoHidden: false } });
			throw e;
		}
	}
};
