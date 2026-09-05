// Entry used by wrangler. Wraps the SvelteKit worker and adds the cron handler.
// The SvelteKit build output must exist (pnpm build) before wrangler dev/deploy and before svelte-check.
import type {
	ExecutionContext,
	ExportedHandler,
	ScheduledController
} from '@cloudflare/workers-types';
import kit from '../.svelte-kit/cloudflare/_worker.js';
import { runDailyJobsWithEnv } from './lib/server/jobs/daily';

const handler: ExportedHandler<App.Env> = {
	// SvelteKit's worker is typed against lib.dom Request; the runtime objects are the same.
	fetch: kit.fetch as unknown as ExportedHandler<App.Env>['fetch'],
	async scheduled(_controller: ScheduledController, env: App.Env, ctx: ExecutionContext) {
		ctx.waitUntil(runDailyJobsWithEnv(env));
	}
};

export default handler;
