import type { LayoutServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { unreadCount } from '$lib/server/services/notifications';
import { schema } from '$lib/server/db';
import { and, eq, count } from 'drizzle-orm';

export const load: LayoutServerLoad = async (event) => {
	const user = event.locals.user;
	let inbox = 0;
	if (user && event.platform) {
		const { db } = ctx(event);
		const [notes, [{ pending }]] = await Promise.all([
			unreadCount(db, user.id),
			db
				.select({ pending: count() })
				.from(schema.swapRequests)
				.where(
					and(eq(schema.swapRequests.toUserId, user.id), eq(schema.swapRequests.status, 'pending'))
				)
		]);
		inbox = notes + pending;
	}
	return { user, inbox, origin: event.platform?.env.PUBLIC_ORIGIN ?? event.url.origin };
};
