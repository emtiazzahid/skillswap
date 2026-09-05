import { test, expect, type Page } from '@playwright/test';
import { hydrated, signIn, uid } from './helpers';

async function post(page: Page, slug: string, title: string) {
	await page.goto(`/c/${slug}/post`);
	await hydrated(page);
	await page.getByLabel('Title').fill(title);
	await page
		.getByLabel("What you'll actually do")
		.fill(`${title}. Long enough description for validation.`);
	await page.getByRole('button', { name: 'Pin it' }).click();
	return page.url();
}

test('decline hides contact; cancel removes the envelope; unread badge clears after visiting', async ({
	browser
}) => {
	const A = await browser.newContext();
	const a = await A.newPage();
	await signIn(a, { id: `ina-${uid()}`, name: 'Maya Khan' });
	await a.goto('/communities/new');
	await hydrated(a);
	await a.getByLabel('Board name').fill(`Inbox ${uid()}`);
	await a.getByRole('button', { name: 'Pin the board up' }).click();
	const slug = a.url().split('/c/')[1];
	const skillUrl = await post(a, slug, 'Sourdough from scratch');

	const B = await browser.newContext();
	const b = await B.newPage();
	await signIn(b, { id: `inb-${uid()}`, name: 'Joy Prakash' });
	await b.goto(`/c/${slug}/join`);
	await b.getByRole('button', { name: 'Join the board' }).click();

	// request 1: declined
	await b.goto(skillUrl + '/request');
	await hydrated(b);
	await b.getByRole('button', { name: 'Send request' }).click();
	await a.goto('/inbox');
	await hydrated(a);
	await a.getByLabel('Decline reason').fill('Booked up this month');
	await a.getByRole('button', { name: 'Decline' }).click();
	await a.getByRole('tab', { name: 'Done' }).click();
	await expect(a.getByText('Declined: “Booked up this month”')).toBeVisible();
	await expect(a.getByText("Joy's contact")).toHaveCount(0);

	// request 2: cancelled by sender
	await b.goto(skillUrl + '/request');
	await hydrated(b);
	await b.getByRole('button', { name: 'Send request' }).click();
	await expect(b).toHaveURL(/\/inbox/);
	await hydrated(b);
	await b.getByRole('tab', { name: /Sent/ }).click();
	await b.getByRole('button', { name: 'Cancel request' }).click();
	await b.getByRole('tab', { name: /Sent/ }).click();
	await expect(b.getByText('Nothing here yet.')).toBeVisible();

	// A got notifications; badge shows, then clears after visiting the inbox
	await a.goto('/');
	await expect(a.getByRole('link', { name: /Inbox/ }).locator('.inbox-count')).toBeVisible();
	await a.goto('/inbox');
	await a.goto('/');
	await expect(a.getByRole('link', { name: /Inbox/ }).locator('.inbox-count')).toHaveCount(0);
	await A.close();
	await B.close();
});
