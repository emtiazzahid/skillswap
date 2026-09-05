import { test, expect, type Page } from '@playwright/test';
import { hydrated, signIn, uid } from './helpers';

async function createBoard(page: Page, name: string, visibility: 'public' | 'invite' = 'public') {
	await page.goto('/communities/new');
	await hydrated(page);
	await page.getByLabel('Board name').fill(name);
	await page.getByLabel('Tagline').fill('Weekend swaps at the hall.');
	await page.getByLabel('Area label').fill('Mirpur, Dhaka');
	await page
		.getByLabel(visibility === 'invite' ? 'Invite link only' : 'Public, anyone can join')
		.check();
	await page.getByRole('button', { name: 'Pin the board up' }).click();
	await expect(page).toHaveURL(/\/c\/[a-z0-9-]+$/);
	return page.url().split('/c/')[1];
}

test.describe('communities', () => {
	test('create a board → header banner, owner nav, listed on landing; second user joins; owner bans them', async ({
		browser
	}) => {
		const owner = await browser.newContext();
		const op = await owner.newPage();
		await signIn(op, { id: `own-${uid()}`, name: 'Rina Sultana' });
		const name = `Mirpur ${uid()}`;
		const slug = await createBoard(op, name);
		await expect(op.getByRole('heading', { level: 1, name })).toBeVisible();
		await expect(op.getByText('Mirpur, Dhaka')).toBeVisible();
		await expect(op.getByRole('link', { name: 'Settings' })).toBeVisible();
		await expect(op.getByText('1 members · 0 notices')).toBeVisible();

		await op.goto('/');
		await expect(op.getByRole('link', { name: new RegExp(name) })).toBeVisible();

		const guest = await browser.newContext();
		const gp = await guest.newPage();
		await signIn(gp, { id: `gst-${uid()}`, name: 'Tanvir Ahmed' });
		await gp.goto(`/c/${slug}`);
		await expect(gp.getByRole('link', { name: 'Join this board' })).toBeVisible();
		await gp.getByRole('link', { name: 'Join this board' }).click();
		await gp.getByRole('button', { name: 'Join the board' }).click();
		await expect(gp).toHaveURL(new RegExp(`/c/${slug}$`));
		await expect(gp.getByText('2 members · 0 notices')).toBeVisible();

		await op.goto(`/c/${slug}/members`);
		await expect(op.getByText('Tanvir Ahmed')).toBeVisible();
		await op
			.getByRole('row', { name: /Tanvir Ahmed/ })
			.getByRole('button', { name: 'Ban' })
			.click();
		await expect(op.getByRole('row', { name: /Tanvir Ahmed/ }).getByText('Removed')).toBeVisible();

		await gp.goto(`/c/${slug}`);
		await expect(gp.getByText('You have been removed from this board.')).toBeVisible();
		await owner.close();
		await guest.close();
	});

	test('invite-only board is 404 to outsiders and joinable through an invite link', async ({
		browser
	}) => {
		const owner = await browser.newContext();
		const op = await owner.newPage();
		await signIn(op, { id: `own2-${uid()}`, name: 'Maya Khan' });
		const slug = await createBoard(op, `Secret ${uid()}`, 'invite');

		const guest = await browser.newContext();
		const gp = await guest.newPage();
		await signIn(gp, { id: `gst2-${uid()}`, name: 'Joy Prakash' });
		const res = await gp.goto(`/c/${slug}`);
		expect(res?.status()).toBe(404);

		await op.goto(`/c/${slug}/settings`);
		await hydrated(op);
		await op.getByRole('button', { name: 'Make invite link' }).click();
		const url = (await op.getByTestId('invite-url').textContent())!.trim();
		expect(url).toContain(`/c/${slug}/join?t=`);

		await gp.goto(url.replace(/^https?:\/\/[^/]+/, ''));
		await gp.getByRole('button', { name: 'Join the board' }).click();
		await expect(gp).toHaveURL(new RegExp(`/c/${slug}$`));
		await expect(gp.getByRole('heading', { level: 1 })).toBeVisible();

		await op.goto(`/c/${slug}/settings`);
		await expect(op.getByText('1/25 used')).toBeVisible();
		await owner.close();
		await guest.close();
	});
});
