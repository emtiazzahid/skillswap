import type { PageServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { listPublicCommunities, listUserCommunities } from '$lib/server/services/communities';

export const load: PageServerLoad = async (event) => {
	const { db } = ctx(event);
	const [publicBoards, mine] = await Promise.all([
		listPublicCommunities(db),
		event.locals.user ? listUserCommunities(db, event.locals.user.id) : Promise.resolve([])
	]);
	const mineIds = new Set(mine.map((c) => c.id));
	return { mine, publicBoards: publicBoards.filter((c) => !mineIds.has(c.id)) };
};
