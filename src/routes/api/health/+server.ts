import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const db = await platform?.env.DB.prepare('SELECT 1 AS ok')
		.first<{ ok: number }>()
		.then((row) => row?.ok === 1)
		.catch(() => false);
	return json(
		{ ok: true, db, app: platform?.env.APP_NAME ?? 'SkillSwap' },
		{ headers: { 'cache-control': 'no-store' } }
	);
};
