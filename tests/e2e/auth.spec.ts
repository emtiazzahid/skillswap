import { test, expect } from '@playwright/test';
import { hydrated, signIn, uid } from './helpers';

test.describe('auth', () => {
	test('login → onboarding → /me shows the name; logout clears the session', async ({ page }) => {
		const id = `u-${uid()}`;
		await page.goto('/auth/login');
		await hydrated(page);
		await expect(page.getByRole('heading', { name: "Sign the visitors' book" })).toBeVisible();
		await page.getByRole('link', { name: 'Continue with test account' }).click();
		await hydrated(page);
		await page.getByLabel('Provider user id').fill(id);
		await page.getByLabel('Name').fill('Rina Sultana');
		await page.getByRole('button', { name: 'Sign in' }).click();

		await expect(page).toHaveURL(/\/onboarding/);
		await hydrated(page);
		await page.getByLabel('Contact method').selectOption('telegram');
		await page.getByLabel('Contact detail').fill('@rina_plays');
		await page.getByRole('button', { name: 'Pin my name tag' }).click();
		await expect(page).toHaveURL(/\/$/);

		await page.goto('/me');
		await expect(page.getByLabel('Display name')).toHaveValue('Rina Sultana');
		await expect(page.getByText('neighbors see you as “Rina S.”')).toBeVisible();

		await page.getByRole('button', { name: 'Sign out' }).click();
		await expect(page).toHaveURL(/\/$/);
		await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
		await page.goto('/me');
		await expect(page).toHaveURL(/\/auth\/login\?next=%2Fme/);
	});

	test('visiting a protected page logged out redirects with next, and returns there after login', async ({
		page
	}) => {
		await page.goto('/me');
		await expect(page).toHaveURL(/\/auth\/login\?next=%2Fme/);
		await signIn(page, { id: `n-${uid()}`, name: 'Tanvir Ahmed', next: '/me' });
		await expect(page).toHaveURL(/\/me$/);
	});

	test('a returning user skips onboarding', async ({ page, context }) => {
		const id = `r-${uid()}`;
		await signIn(page, { id, name: 'Maya Khan' });
		await context.clearCookies();
		await signIn(page, { id, name: 'Maya Khan', next: '/me', onboard: false });
		await expect(page).toHaveURL(/\/me$/);
	});

	test('mock provider is 404 when not enabled is covered by unit tests; state reuse is rejected', async ({
		page
	}) => {
		await page.goto('/auth/login');
		await hydrated(page);
		await page.getByRole('link', { name: 'Continue with test account' }).click();
		await hydrated(page);
		const url = page.url();
		await page.getByLabel('Provider user id').fill(`s-${uid()}`);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await page.goto(url);
		await hydrated(page);
		await page.getByLabel('Provider user id').fill(`s2-${uid()}`);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await expect(page.getByText('state expired')).toBeVisible();
	});
});

test('the top bar shows the avatar the provider gave us', async ({ page }) => {
	const id = `av-${uid()}`;
	await page.goto(`/auth/login?next=${encodeURIComponent('/')}`);
	await hydrated(page);
	await page.getByRole('link', { name: 'Continue with test account' }).click();
	await hydrated(page);
	await page.getByLabel('Provider user id').fill(id);
	await page.getByLabel('Name').fill('Avatar Haver');
	await page.getByLabel('Avatar URL').fill('https://avatars.githubusercontent.com/u/1?v=4');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await hydrated(page);
	await page.getByLabel('Contact method').selectOption('telegram');
	await page.getByLabel('Contact detail').fill(`@${id.replace(/[^a-z0-9]/gi, '')}`);
	await page.getByRole('button', { name: 'Pin my name tag' }).click();
	await expect(page.locator('.topbar img.avatar')).toHaveAttribute(
		'src',
		'https://avatars.githubusercontent.com/u/1?v=4'
	);
});
