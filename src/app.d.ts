import type { D1Database, KVNamespace, Fetcher, ExecutionContext } from '@cloudflare/workers-types';
import type { SessionUser } from '$lib/server/auth/types';

declare global {
	namespace App {
		interface Env {
			DB: D1Database;
			SESSIONS: KVNamespace;
			ASSETS: Fetcher;
			APP_NAME: string;
			PUBLIC_ORIGIN: string;
			GITHUB_CLIENT_ID?: string;
			GITHUB_CLIENT_SECRET?: string;
			GOOGLE_CLIENT_ID?: string;
			GOOGLE_CLIENT_SECRET?: string;
			CONTACT_KEY?: string;
			SITE_ADMIN_IDS?: string;
			E2E_MOCK_OAUTH?: string;
		}
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
		}
		interface Locals {
			user: SessionUser | null;
			sessionId: string | null;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
