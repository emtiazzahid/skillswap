import { test, expect, type Page } from '@playwright/test';
import { hydrated, signIn, uid } from './helpers';

async function newBoard(page: Page) {
	await page.goto('/communities/new');
	await hydrated(page);
	await page.getByLabel('Board name').fill(`Post ${uid()}`);
	await page.getByRole('button', { name: 'Pin the board up' }).click();
	await expect(page).toHaveURL(/\/c\/[a-z0-9-]+$/);
	return page.url().split('/c/')[1];
}

async function fillNotice(
	page: Page,
	title: string,
	description = 'Four chords, twenty songs. Bring any guitar, I have a spare.'
) {
	await page.getByLabel('Title').fill(title);
	await page.getByLabel(/What you'll actually do|What you're hoping to learn/).fill(description);
}

test.describe('posting notices', () => {
	test('untrusted member posts → pending (visible only to them) → moderator approves → visible; blocked word; quota', async ({
		browser
	}) => {
		const owner = await browser.newContext();
		const op = await owner.newPage();
		await signIn(op, { id: `po-${uid()}`, name: 'Rina Sultana' });
		const slug = await newBoard(op);

		const member = await browser.newContext();
		const mp = await member.newPage();
		await signIn(mp, { id: `pm-${uid()}`, name: 'Tanvir Ahmed' });
		await mp.goto(`/c/${slug}/join`);
		await mp.getByRole('button', { name: 'Join the board' }).click();

		await mp.goto(`/c/${slug}/post`);
		await hydrated(mp);
		await expect(mp.getByText('Your first notice here waits for a moderator.')).toBeVisible();
		await fillNotice(mp, 'Guitar for beginners');
		await mp.getByRole('button', { name: 'Pin it' }).click();
		await expect(mp).toHaveURL(new RegExp(`/c/${slug}/s/`));
		await expect(mp.getByText('pending', { exact: true })).toBeVisible();

		await mp.goto(`/c/${slug}`);
		await expect(mp.getByText('is waiting for a moderator')).toBeVisible();
		await expect(mp.getByRole('link', { name: /Guitar for beginners/ })).toBeVisible();

		await op.goto(`/c/${slug}`);
		await expect(op.getByRole('link', { name: /Guitar for beginners/ })).toHaveCount(0);

		await op.goto(`/c/${slug}/mod`);
		await expect(op.getByRole('link', { name: 'Guitar for beginners' })).toBeVisible();
		await op.getByRole('button', { name: 'Approve & trust' }).click();
		await expect(op.getByText("Nothing waiting. Kettle's on.")).toBeVisible();
		await op.goto(`/c/${slug}`);
		await expect(op.getByRole('link', { name: /Guitar for beginners/ })).toBeVisible();

		await mp.goto(`/c/${slug}/post`);
		await hydrated(mp);
		await expect(mp.getByText('Your first notice here waits for a moderator.')).toHaveCount(0);
		await fillNotice(mp, 'Excel lessons, only $10 per hour');
		await mp.getByRole('button', { name: 'Pin it' }).click();
		await expect(mp.getByText('No money on this board, that is the whole point.')).toBeVisible();

		for (let i = 2; i <= 5; i++) {
			await mp.goto(`/c/${slug}/post`);
			await hydrated(mp);
			await fillNotice(mp, `Offer number ${i}`);
			await mp.getByRole('button', { name: 'Pin it' }).click();
			await expect(mp).toHaveURL(new RegExp(`/c/${slug}/s/`));
		}
		await mp.goto(`/c/${slug}/post`);
		await hydrated(mp);
		await expect(mp.getByText('5 of 5 offers used on this board')).toBeVisible();
		await fillNotice(mp, 'Offer number six');
		await mp.getByRole('button', { name: 'Pin it' }).click();
		await expect(mp.getByText('You already have 5 offers on this board.')).toBeVisible();

		await owner.close();
		await member.close();
	});

	test('live preview mirrors the title as you type', async ({ page }) => {
		await signIn(page, { id: `pv-${uid()}`, name: 'Maya Khan' });
		const slug = await newBoard(page);
		await page.goto(`/c/${slug}/post`);
		await hydrated(page);
		await page.getByLabel('Title').fill('Sourdough from scratch');
		await expect(page.getByLabel('Live preview').getByText('Sourdough from scratch')).toBeVisible();
		await page.getByText("Want — I'd like to learn").click();
		await expect(page.getByLabel('Live preview').locator('.card--want')).toBeVisible();
	});
});
