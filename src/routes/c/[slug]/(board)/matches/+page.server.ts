import type { PageServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { loadAccess, requireMember } from '$lib/server/access';
import { getMatches } from '$lib/server/services/matching';

export const load: PageServerLoad = async (event) => {
	const { db, env } = ctx(event);
	const access = await loadAccess(db, event, event.params.slug);
	const m = requireMember(access, event);
	const result = await getMatches(db, env.SESSIONS, access.community.id, m.userId);
	return { matches: result.reciprocal, gifts: result.gifts, computedAt: result.computedAt };
};
