import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { hydrated, signIn, uid } from './helpers';

async function axe(page: Page, label: string) {
	const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
	const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
	expect(
		serious,
		`${label}: ${serious.map((v) => `${v.id} (${v.nodes.length})`).join(', ')}`
	).toEqual([]);
}

test.describe('accessibility sweep', () => {
	test('every route passes axe with data on the board', async ({ page }) => {
		await signIn(page, { id: `ax-${uid()}`, name: 'Axe Runner' });
		await page.goto('/communities/new');
		await hydrated(page);
		await page.getByLabel('Board name').fill(`Axe ${uid()}`);
		await page.getByLabel('Tagline').fill('A board for testing the board');
		await page.getByRole('button', { name: 'Pin the board up' }).click();
		const slug = page.url().split('/c/')[1];
		await page.goto(`/c/${slug}/post`);
		await hydrated(page);
		await page.getByLabel('Title').fill('Sourdough from scratch');
		await page
			.getByLabel("What you'll actually do")
			.fill('Starter, shaping, scoring, one bake together.');
		await page.getByRole('button', { name: 'Pin it' }).click();
		const skill = page.url();

		for (const [path, label] of [
			['/', 'landing'],
			['/about', 'about'],
			['/privacy', 'privacy'],
			['/terms', 'terms'],
			['/auth/login', 'login'],
			['/me', 'settings'],
			['/inbox', 'inbox'],
			['/communities/new', 'new community'],
			[`/c/${slug}`, 'board'],
			[`/c/${slug}?kind=want`, 'board wants'],
			[`/c/${slug}/post`, 'post form'],
			[skill, 'notice'],
			[`${skill}/edit`, 'edit notice'],
			[`/c/${slug}/matches`, 'matches'],
			[`/c/${slug}/members`, 'members'],
			[`/c/${slug}/mod`, 'moderation'],
			[`/c/${slug}/settings`, 'community settings'],
			['/does-not-exist', '404']
		]) {
			await page.goto(path);
			await axe(page, label);
		}
	});

	test('keyboard-only path: post a notice, request a swap, accept it', async ({ browser }) => {
		const A = await browser.newContext();
		const a = await A.newPage();
		await signIn(a, { id: `ka-${uid()}`, name: 'Kay Board' });
		await a.goto('/communities/new');
		await hydrated(a);
		await a.getByLabel('Board name').fill(`Keys ${uid()}`);
		await a.getByRole('button', { name: 'Pin the board up' }).click();
		const slug = a.url().split('/c/')[1];
		await a.goto(`/c/${slug}/post`);
		await hydrated(a);
		await a.getByLabel('Title').focus();
		await a.keyboard.type('Chess openings');
		await a.getByLabel("What you'll actually do").focus();
		await a.keyboard.type(
			'Two openings for white, one for black, and how to not lose in ten moves.'
		);
		await a.getByRole('button', { name: 'Pin it' }).focus();
		await a.keyboard.press('Enter');
		await expect(a).toHaveURL(new RegExp(`/c/${slug}/s/`));
		const skill = a.url();

		const B = await browser.newContext();
		const b = await B.newPage();
		await signIn(b, { id: `kb-${uid()}`, name: 'Tab Stop' });
		await b.goto(`/c/${slug}/join`);
		await b.getByRole('button', { name: 'Join the board' }).focus();
		await b.keyboard.press('Enter');
		await expect(b).toHaveURL(new RegExp(`/c/${slug}$`));
		await b.goto(skill);
		await hydrated(b);
		await b.getByRole('link', { name: 'Request swap' }).focus();
		await b.keyboard.press('Enter');
		await hydrated(b);
		await b.getByLabel('A short note').focus();
		await b.keyboard.type('Keyboard only, still keen.');
		await b.getByRole('button', { name: 'Send request' }).focus();
		await b.keyboard.press('Enter');
		await expect(b).toHaveURL(/\/inbox/);

		await a.goto('/inbox');
		await hydrated(a);
		await a.getByRole('button', { name: 'Accept' }).focus();
		await a.keyboard.press('Enter');
		await a.getByRole('button', { name: 'Yes, accept' }).focus();
		await a.keyboard.press('Enter');
		await expect(a.getByText("Tab's contact")).toBeVisible();
		await A.close();
		await B.close();
	});
});
