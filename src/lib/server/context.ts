import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { createDb, type Db } from './db';

export interface Ctx {
	db: Db;
	env: App.Env;
}

/** Bindings for a request. Fails loudly if the platform is missing (e.g. `vite dev` without wrangler). */
export function ctx(event: Pick<RequestEvent, 'platform'>): Ctx {
	const env = event.platform?.env;
	if (!env) error(500, 'Cloudflare bindings unavailable. Run through wrangler (pnpm dev uses it).');
	return { db: createDb(env.DB), env };
}
