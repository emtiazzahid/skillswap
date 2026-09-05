import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: false,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: { baseURL: 'http://127.0.0.1:8788', trace: 'on-first-retry' },
	webServer: {
		command:
			'pnpm build && pnpm db:migrate:local && pnpm exec wrangler dev --port 8788 --ip 127.0.0.1',
		url: 'http://127.0.0.1:8788/api/health',
		reuseExistingServer: !process.env.CI,
		timeout: 180_000
	},
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{
			name: 'mobile',
			use: { ...devices['Pixel 7'] },
			testMatch: /(landing|board|mockups)\.spec\.ts/
		}
	]
});
