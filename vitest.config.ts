import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Bindings are declared here rather than read from wrangler.jsonc so that unit tests
// do not depend on a prior `pnpm build` (wrangler's `main` points at build output).
export default defineConfig(async () => {
	const migrations = await readD1Migrations(path.join(import.meta.dirname, 'migrations'));
	const tokensCss = await readFile(path.join(import.meta.dirname, 'design/tokens.css'), 'utf8');
	return {
		plugins: [
			cloudflareTest({
				miniflare: {
					compatibilityDate: '2026-08-22',
					compatibilityFlags: ['nodejs_compat'],
					d1Databases: ['DB'],
					kvNamespaces: ['SESSIONS'],
					bindings: {
						APP_NAME: 'SkillSwap',
						PUBLIC_ORIGIN: 'http://localhost',
						TEST_MIGRATIONS: migrations,
						TOKENS_CSS: tokensCss
					}
				}
			})
		],
		resolve: { alias: { $lib: path.resolve(import.meta.dirname, 'src/lib') } },
		test: {
			include: ['tests/unit/**/*.test.ts'],
			setupFiles: ['tests/unit/setup.ts']
		}
	};
});
