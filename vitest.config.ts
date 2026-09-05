import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

export default defineConfig(async () => {
	const migrations = await readD1Migrations(path.join(import.meta.dirname, 'migrations'));
	const tokensCss = await readFile(path.join(import.meta.dirname, 'design/tokens.css'), 'utf8');
	return {
		plugins: [
			cloudflareTest({
				wrangler: { configPath: './wrangler.jsonc' },
				miniflare: { bindings: { TEST_MIGRATIONS: migrations, TOKENS_CSS: tokensCss } }
			})
		],
		resolve: { alias: { $lib: path.resolve(import.meta.dirname, 'src/lib') } },
		test: {
			include: ['tests/unit/**/*.test.ts'],
			setupFiles: ['tests/unit/setup.ts']
		}
	};
});
