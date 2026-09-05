import { test, expect } from '@playwright/test';
import { hydrated, signIn, uid } from './helpers';

test.describe('onboarding', () => {
	test('validation errors render inline and the contact value never appears in page source', async ({
		page
	}) => {
		const id = `o-${uid()}`;
		await signIn(page, { id, name: 'Joy Prakash', onboard: false });
		await expect(page).toHaveURL(/\/onboarding/);
		await hydrated(page);

		await page.getByLabel('What should neighbors call you?').fill('J');
		await page.getByLabel('Contact method').selectOption('email');
		await page.getByLabel('Contact detail').fill('not-an-email');
		await page.getByRole('button', { name: 'Pin my name tag' }).click();
		await expect(page.getByText('Name needs at least 2 characters.')).toBeVisible();
		await expect(page.getByText('That email does not look right.')).toBeVisible();

		await page.getByLabel('What should neighbors call you?').fill('Joy Prakash');
		await page.getByLabel('Contact detail').fill('joy.secret@example.com');
		await page.getByRole('button', { name: 'Pin my name tag' }).click();
		await expect(page).toHaveURL(/\/$/);

		await page.goto('/me');
		const html = await page.content();
		expect(html).not.toContain('joy.secret@example.com');
		await expect(page.getByText('Currently: Email')).toBeVisible();
	});

	test('delete account requires typing delete, then signs out for good', async ({ page }) => {
		await signIn(page, { id: `d-${uid()}`, name: 'Kamal Hossain', next: '/me' });
		await hydrated(page);
		await page.getByRole('button', { name: 'Delete my account' }).click();
		await expect(page.getByText('Type delete to confirm.')).toBeVisible();
		await page.getByLabel('Type delete to confirm').fill('delete');
		await page.getByRole('button', { name: 'Delete my account' }).click();
		await expect(page).toHaveURL(/\/\?deleted=1/);
		await page.goto('/me');
		await expect(page).toHaveURL(/\/auth\/login/);
	});
});
