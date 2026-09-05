import type { LayoutServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { loadAccess } from '$lib/server/access';
import { communityCounts } from '$lib/server/services/communities';

export const load: LayoutServerLoad = async (event) => {
	const { db } = ctx(event);
	const access = await loadAccess(db, event, event.params.slug);
	const counts = await communityCounts(db, access.community.id);
	return {
		community: access.community,
		counts,
		role: access.role,
		isMember: access.isMember,
		canModerate: access.canModerate,
		isOwner: access.isOwner
	};
};
