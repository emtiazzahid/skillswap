import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { hydrated, signIn, uid } from './helpers';

async function post(
	page: Page,
	slug: string,
	title: string,
	kind: 'offer' | 'want',
	category: string,
	format: string
) {
	await page.goto(`/c/${slug}/post?kind=${kind}`);
	await hydrated(page);
	await page.getByLabel('Title').fill(title);
	await page
		.getByLabel(/What you'll actually do|What you're hoping to learn/)
		.fill(`${title}. A longer description so validation passes.`);
	await page.getByLabel('Category').selectOption(category);
	await page.getByLabel(format, { exact: true }).check();
	await page.getByRole('button', { name: 'Pin it' }).click();
	await expect(page).toHaveURL(new RegExp(`/c/${slug}/s/`));
}

test.describe('board', () => {
	test('filters, search, tabs and axe', async ({ page }, info) => {
		await signIn(page, { id: `bd-${uid()}`, name: 'Rina Sultana' });
		await page.goto('/communities/new');
		await hydrated(page);
		await page.getByLabel('Board name').fill(`Board ${uid()}`);
		await page.getByRole('button', { name: 'Pin the board up' }).click();
		const slug = page.url().split('/c/')[1];

		await post(page, slug, 'Guitar chords', 'offer', 'music', 'In person');
		await post(page, slug, 'Excel for shops', 'offer', 'tech', 'Online');
		await post(page, slug, 'Learn Korean', 'want', 'languages', 'Either');

		await page.goto(`/c/${slug}`);
		await expect(page.getByText('2 offers pinned')).toBeVisible();
		await expect(page.getByRole('link', { name: /Guitar chords/ })).toBeVisible();
		await expect(page.getByRole('link', { name: /Learn Korean/ })).toHaveCount(0);

		await page.getByRole('tab', { name: 'Wants' }).click();
		await expect(page.getByText('1 want pinned')).toBeVisible();
		await expect(page.getByRole('link', { name: /Learn Korean/ })).toBeVisible();

		await page.goto(`/c/${slug}?kind=offer&cat=music`);
		await expect(page.getByRole('link', { name: /Guitar chords/ })).toBeVisible();
		await expect(page.getByRole('link', { name: /Excel for shops/ })).toHaveCount(0);

		await page.goto(`/c/${slug}?kind=offer&format=online`);
		await expect(page.getByRole('link', { name: /Excel for shops/ })).toBeVisible();
		await expect(page.getByRole('link', { name: /Guitar chords/ })).toHaveCount(0);

		await page.goto(`/c/${slug}`);
		await page.getByLabel('Search notices').fill('gui');
		await page.getByLabel('Search notices').press('Enter');
		await expect(page.getByText('1 offer pinned')).toBeVisible();
		await expect(page.getByRole('link', { name: /Guitar chords/ })).toBeVisible();

		await page.goto(`/c/${slug}?q=zzzz`);
		await expect(page.getByText('Nothing matches those filters.')).toBeVisible();

		await page.goto(`/c/${slug}`);
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
		);
		expect(overflow, `overflow on ${info.project.name}`).toBe(false);
		const results = await new AxeBuilder({ page }).analyze();
		expect(
			results.violations
				.filter((v) => v.impact === 'serious' || v.impact === 'critical')
				.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)
		).toEqual([]);
	});
});
