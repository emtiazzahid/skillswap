import type { PageServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { loadAccess } from '$lib/server/access';
import { listBoard } from '$lib/server/services/skills';
import { CATEGORIES } from '$lib/server/db/categories';

export const load: PageServerLoad = async (event) => {
	const { db } = ctx(event);
	const access = await loadAccess(db, event, event.params.slug);
	const p = event.url.searchParams;
	const kind = p.get('kind') === 'want' ? 'want' : 'offer';
	const categories = p.getAll('cat').filter((c) => CATEGORIES.some((k) => k.id === c));
	const fmt = p.get('format');
	const format = fmt === 'in_person' || fmt === 'online' ? fmt : undefined;
	const q = p.get('q') ?? '';
	const cursor = p.get('after');
	const result = await listBoard(db, access.community.id, {
		kind,
		categories,
		format,
		q,
		cursor,
		viewerId: event.locals.user?.id ?? null,
		canModerate: access.canModerate
	});
	const pendingMine = result.cards.filter((c) => c.isMine && c.status === 'pending');
	return {
		flagged: p.get('flagged') === 'hidden',
		kind,
		selectedCategories: categories,
		format: format ?? 'any',
		q,
		categories: CATEGORIES.map((c) => ({ id: c.id, name: c.name })),
		cards: result.cards,
		total: result.total,
		nextCursor: result.nextCursor,
		pendingMine: pendingMine.map((c) => c.title)
	};
};
