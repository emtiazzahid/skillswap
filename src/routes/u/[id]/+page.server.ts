import { error } from '@sveltejs/kit';
import { and, desc, eq, inArray, isNull, or, count } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { schema } from '$lib/server/db';
import { publicName } from '$lib/server/services/users';

export const load: PageServerLoad = async (event) => {
	const { db } = ctx(event);
	const user = await db.query.users.findFirst({
		where: and(eq(schema.users.id, event.params.id), isNull(schema.users.deletedAt))
	});
	if (!user) error(404, 'No one by that name on the board.');
	const viewerId = event.locals.user?.id ?? null;
	const isSelf = viewerId === user.id;

	// Boards visible to the viewer: public ones, plus invite-only ones they belong to.
	const memberships = await db.query.memberships.findMany({
		where: and(eq(schema.memberships.userId, user.id), isNull(schema.memberships.bannedAt)),
		with: { community: true }
	});
	const viewerBoards = viewerId
		? new Set(
				(
					await db.query.memberships.findMany({
						where: and(eq(schema.memberships.userId, viewerId), isNull(schema.memberships.bannedAt))
					})
				).map((m) => m.communityId)
			)
		: new Set<string>();
	const boards = memberships
		.filter(
			(m) =>
				!m.community.deletedAt &&
				(m.community.visibility === 'public' || viewerBoards.has(m.communityId))
		)
		.map((m) => m.community);

	const [[{ swaps }], thanks, skills] = await Promise.all([
		db
			.select({ swaps: count() })
			.from(schema.swapRequests)
			.where(
				and(
					eq(schema.swapRequests.status, 'completed'),
					or(eq(schema.swapRequests.fromUserId, user.id), eq(schema.swapRequests.toUserId, user.id))
				)
			),
		db.query.thanks.findMany({
			where: eq(schema.thanks.toUserId, user.id),
			orderBy: desc(schema.thanks.createdAt),
			limit: 12
		}),
		boards.length
			? db.query.skills.findMany({
					where: and(
						eq(schema.skills.userId, user.id),
						eq(schema.skills.status, 'active'),
						inArray(
							schema.skills.communityId,
							boards.map((b) => b.id)
						)
					),
					with: { category: true, community: true },
					orderBy: desc(schema.skills.createdAt)
				})
			: Promise.resolve([])
	]);
	const taught = await db
		.select({ n: count() })
		.from(schema.swapRequests)
		.where(
			and(eq(schema.swapRequests.status, 'completed'), eq(schema.swapRequests.toUserId, user.id))
		);

	return {
		profile: {
			id: user.id,
			name: isSelf ? user.displayName : publicName(user.displayName),
			avatarUrl: user.avatarUrl,
			bio: user.bio,
			since: user.createdAt,
			swaps,
			taught: taught[0].n
		},
		boards: boards.map((b) => ({ slug: b.slug, name: b.name })),
		thanks: thanks.map((t) => ({
			id: t.id,
			text: t.text,
			from: t.fromUserId ? publicName(t.fromName) : 'former member'
		})),
		skills: skills.map((s) => ({
			id: s.id,
			kind: s.kind,
			title: s.title,
			categoryName: s.category.name,
			availability: s.availability,
			format: s.format,
			slug: s.community.slug
		})),
		isSelf
	};
};
