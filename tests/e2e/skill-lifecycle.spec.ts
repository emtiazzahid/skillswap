import { test, expect } from '@playwright/test';
import { hydrated, signIn, uid } from './helpers';

test.describe('notice lifecycle', () => {
	test('edit → pause → resume → renew → delete; deleted returns 404; profile shows active notices', async ({
		page
	}) => {
		await signIn(page, { id: `lc-${uid()}`, name: 'Kamal Hossain' });
		await page.goto('/communities/new');
		await hydrated(page);
		await page.getByLabel('Board name').fill(`Life ${uid()}`);
		await page.getByRole('button', { name: 'Pin the board up' }).click();
		const slug = page.url().split('/c/')[1];

		await page.goto(`/c/${slug}/post`);
		await hydrated(page);
		await page.getByLabel('Title').fill('Fix a leaky tap');
		await page
			.getByLabel("What you'll actually do")
			.fill('Washers, seats, and when to call a plumber.');
		await page.getByRole('button', { name: 'Pin it' }).click();
		const id = page.url().split('/s/')[1];

		await page.getByRole('link', { name: 'Edit, pause or renew' }).click();
		await hydrated(page);
		await page.getByLabel('Title').fill('Fix a leaky tap yourself');
		await page.getByRole('button', { name: 'Save changes' }).click();
		await expect(page.getByRole('heading', { name: 'Fix a leaky tap yourself' })).toBeVisible();

		await page.goto(`/c/${slug}/s/${id}/edit`);
		await page.getByRole('button', { name: 'Pause' }).click();
		await expect(page.getByText('Status: paused')).toBeVisible();
		await page.goto(`/c/${slug}`);
		await expect(page.getByRole('link', { name: /Fix a leaky tap/ })).toHaveCount(0);

		await page.goto(`/c/${slug}/s/${id}/edit`);
		await page.getByRole('button', { name: 'Resume' }).click();
		await expect(page.getByText('Status: active')).toBeVisible();
		await page.getByRole('button', { name: 'Renew 90 days' }).click();
		await expect(page.getByText('renewed for 90 days')).toBeVisible();

		await page.goto('/me');
		await page.getByRole('link', { name: 'View public profile' }).click();
		await expect(page.getByRole('link', { name: /Fix a leaky tap yourself/ })).toBeVisible();

		await page.goto(`/c/${slug}/s/${id}/edit`);
		await page.getByRole('button', { name: 'Delete' }).click();
		await expect(page).toHaveURL(new RegExp(`/c/${slug}\\?kind=offer`));
		const res = await page.goto(`/c/${slug}/s/${id}`);
		expect(res?.status()).toBe(404);
	});

	test('a member can flag someone else’s notice; three flags hide it', async ({ browser }) => {
		const author = await browser.newContext();
		const ap = await author.newPage();
		await signIn(ap, { id: `fa-${uid()}`, name: 'Author A' });
		await ap.goto('/communities/new');
		await hydrated(ap);
		await ap.getByLabel('Board name').fill(`Flag ${uid()}`);
		await ap.getByRole('button', { name: 'Pin the board up' }).click();
		const slug = ap.url().split('/c/')[1];
		await ap.goto(`/c/${slug}/post`);
		await hydrated(ap);
		await ap.getByLabel('Title').fill('Spoken English classes');
		await ap.getByLabel("What you'll actually do").fill('Evenings at my place, bring a notebook.');
		await ap.getByRole('button', { name: 'Pin it' }).click();
		const url = ap.url();

		for (let i = 0; i < 3; i++) {
			const ctx = await browser.newContext();
			const p = await ctx.newPage();
			await signIn(p, { id: `fr${i}-${uid()}`, name: `Reporter ${i}` });
			await p.goto(`/c/${slug}/join`);
			await p.getByRole('button', { name: 'Join the board' }).click();
			await p.goto(url);
			await hydrated(p);
			await p.getByRole('button', { name: 'Flag it' }).click();
			await p.getByLabel('Asking for money').check();
			await p.getByRole('button', { name: 'Send flag' }).click();
			if (i === 2)
				await expect(
					p.getByText('That notice has been hidden until a moderator looks at it.')
				).toBeVisible();
			else await expect(p.getByText('A moderator will take a look.')).toBeVisible();
			await ctx.close();
		}
		await ap.goto(`/c/${slug}/mod`);
		await expect(ap.getByText('3 flags')).toBeVisible();
		await expect(ap.getByText('auto-hidden')).toBeVisible();
		await ap.getByRole('button', { name: 'Restore' }).click();
		await expect(ap.getByText('No open flags.')).toBeVisible();
		await author.close();
	});
});
