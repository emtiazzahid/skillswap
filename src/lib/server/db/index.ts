import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import * as tables from './schema';
import * as rels from './relations';

const schema = { ...tables, ...rels };

export type Db = DrizzleD1Database<typeof schema>;

export function createDb(d1: D1Database): Db {
	return drizzle(d1, { schema });
}

export { schema };
