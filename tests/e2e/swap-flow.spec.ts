import { test, expect, type Page } from '@playwright/test';
import { hydrated, signIn, uid } from './helpers';

async function post(
	page: Page,
	slug: string,
	kind: 'offer' | 'want',
	title: string,
	category: string
) {
	await page.goto(`/c/${slug}/post?kind=${kind}`);
	await hydrated(page);
	await page.getByLabel('Title').fill(title);
	await page
		.getByLabel(/What you'll actually do|What you're hoping to learn/)
		.fill(`${title}. Long enough description for validation.`);
	await page.getByLabel('Category').selectOption(category);
	await page.getByRole('button', { name: 'Pin it' }).click();
	await expect(page).toHaveURL(new RegExp(`/c/${slug}/s/`));
	return page.url().split('/s/')[1];
}

test('two neighbours match, request, accept with safety note, see contacts, complete, and thank each other', async ({
	browser
}) => {
	const A = await browser.newContext();
	const a = await A.newPage();
	await signIn(a, { id: `swa-${uid()}`, name: 'Rina Sultana' });
	await a.goto('/communities/new');
	await hydrated(a);
	await a.getByLabel('Board name').fill(`Swap ${uid()}`);
	await a.getByRole('button', { name: 'Pin the board up' }).click();
	const slug = a.url().split('/c/')[1];
	await post(a, slug, 'offer', 'Guitar chords for beginners', 'music');
	await post(a, slug, 'want', 'Excel that does not scare me', 'tech');

	const B = await browser.newContext();
	const b = await B.newPage();
	await signIn(b, { id: `swb-${uid()}`, name: 'Tanvir Ahmed' });
	await b.goto(`/c/${slug}/join`);
	await b.getByRole('button', { name: 'Join the board' }).click();
	// B's first post is pending until A approves; approve it so matching sees it.
	await post(b, slug, 'offer', 'Excel for small shops', 'tech');
	await a.goto(`/c/${slug}/mod`);
	await a.getByRole('button', { name: 'Approve & trust' }).click();
	await post(b, slug, 'want', 'Learn guitar, finally', 'music');

	await a.goto(`/c/${slug}/matches`);
	await expect(a.getByText('Tanvir A.', { exact: true })).toBeVisible();
	await expect(a.getByText('1 person wants what you know, and know what you want')).toBeVisible();
	await a.getByRole('link', { name: 'Request swap' }).click();
	await hydrated(a);
	await expect(a.getByRole('heading', { name: 'Ask Tanvir for a swap' })).toBeVisible();
	await expect(a.getByRole('radio', { name: /Guitar chords for beginners/ })).toBeChecked();
	await a
		.getByLabel('A short note')
		.fill('I have had a guitar for two years and can play zero songs.');
	await a.getByRole('button', { name: 'Send request' }).click();
	await expect(a).toHaveURL(/\/inbox\?sent=1/);
	await expect(a.getByText('Your request is on its way.')).toBeVisible();

	await b.goto('/inbox');
	await hydrated(b);
	await expect(b.getByRole('link', { name: /Inbox/ }).locator('.inbox-count')).toHaveText('3');
	await expect(
		b.getByRole('heading', { name: 'Wants to swap for Excel for small shops' })
	).toBeVisible();
	await expect(b.getByText('I have had a guitar for two years')).toBeVisible();
	await b.getByRole('button', { name: 'Accept' }).click();
	await expect(b.getByText('Before you accept')).toBeVisible();
	await b.getByRole('button', { name: 'Yes, accept' }).click();
	await expect(b.getByText("Rina's contact")).toBeVisible();
	await expect(b.getByText(/Telegram · @swa/)).toBeVisible();

	await a.goto('/inbox');
	await hydrated(a);
	await a.getByRole('tab', { name: /Sent/ }).click();
	await expect(a.getByText("Tanvir's contact")).toBeVisible();
	await expect(a.getByText(/Telegram · @swb/)).toBeVisible();
	await a.getByRole('button', { name: 'Mark as done' }).click();
	await a.getByRole('tab', { name: 'Done' }).click();
	await a
		.getByLabel('Leave Tanvir a thank-you note')
		.fill('Two sessions and I can play Wonderwall. Thank you!');
	await a.getByRole('button', { name: 'Pin note' }).click();
	await a.getByRole('tab', { name: 'Done' }).click();
	await expect(a.getByText('note pinned ✓')).toBeVisible();

	await b.goto('/inbox');
	await hydrated(b);
	await b.getByRole('tab', { name: 'Done' }).click();
	await b.getByLabel('Leave Rina a thank-you note').fill('Patient, funny, brought a spare guitar.');
	await b.getByRole('button', { name: 'Pin note' }).click();

	await b.goto('/me');
	await b.getByRole('link', { name: 'View public profile' }).click();
	await expect(b.getByText('Two sessions and I can play Wonderwall. Thank you!')).toBeVisible();
	await expect(b.getByText('— Rina S.')).toBeVisible();
	await A.close();
	await B.close();
});
