import type { Page } from '@playwright/test';

/** Wait until SvelteKit has hydrated, so typed input is not reset. */
export async function hydrated(page: Page) {
	await page.waitForFunction(() => document.documentElement.dataset.hydrated === 'true');
}

/** Sign in through the mock provider (E2E_MOCK_OAUTH=1) and finish onboarding. */
export async function signIn(
	page: Page,
	opts: { id: string; name: string; next?: string; onboard?: boolean }
) {
	await page.goto(`/auth/login?next=${encodeURIComponent(opts.next ?? '/')}`);
	await hydrated(page);
	await page.getByRole('link', { name: 'Continue with test account' }).click();
	await hydrated(page);
	await page.getByLabel('Provider user id').fill(opts.id);
	await page.getByLabel('Name').fill(opts.name);
	await page.getByRole('button', { name: 'Sign in' }).click();
	if (opts.onboard !== false && page.url().includes('/onboarding')) {
		await hydrated(page);
		await page.getByLabel('Contact method').selectOption('telegram');
		await page.getByLabel('Contact detail').fill(`@${opts.id.replace(/[^a-z0-9]/gi, '')}`);
		await page.getByRole('button', { name: 'Pin my name tag' }).click();
	}
}

export const uid = () => Math.random().toString(36).slice(2, 10);
