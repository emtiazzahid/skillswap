import { test, expect } from '@playwright/test';
import { hydrated, signIn, uid } from './helpers';

test.describe('community settings', () => {
	test('rename, toggle visibility, promote a mod, hand over, delete with slug confirm', async ({
		browser
	}) => {
		const owner = await browser.newContext();
		const op = await owner.newPage();
		await signIn(op, { id: `so-${uid()}`, name: 'Owner One' });
		await op.goto('/communities/new');
		await hydrated(op);
		const name = `Settings ${uid()}`;
		await op.getByLabel('Board name').fill(name);
		await op.getByRole('button', { name: 'Pin the board up' }).click();
		const slug = op.url().split('/c/')[1];

		const member = await browser.newContext();
		const mp = await member.newPage();
		await signIn(mp, { id: `sm-${uid()}`, name: 'Mod Two' });
		await mp.goto(`/c/${slug}/join`);
		await mp.getByRole('button', { name: 'Join the board' }).click();

		await op.goto(`/c/${slug}/settings`);
		await hydrated(op);
		await op.getByLabel('Name').fill(`${name} Renamed`);
		await op.getByLabel('Invite only').check();
		await op.getByRole('button', { name: 'Save' }).click();
		await expect(op.getByText('saved ✓')).toBeVisible();
		await expect(op.getByRole('heading', { level: 1, name: `${name} Renamed` })).toBeVisible();
		await expect(op.locator('.chip', { hasText: 'Invite only' })).toBeVisible();

		await op.goto(`/c/${slug}/members`);
		await op
			.getByRole('row', { name: /Mod Two/ })
			.getByRole('button', { name: 'Make mod' })
			.click();
		await expect(op.getByRole('row', { name: /Mod Two/ }).getByText('Moderator')).toBeVisible();

		await op.goto(`/c/${slug}/settings`);
		await hydrated(op);
		const wrongDelete = op.getByLabel('Type the slug to confirm');
		await wrongDelete.fill('nope');
		await op.getByRole('button', { name: 'Delete board' }).click();
		await expect(op.getByText('Type the board slug to confirm.')).toBeVisible();

		await op.getByRole('button', { name: 'Make them owner' }).click();
		await expect(op).toHaveURL(new RegExp(`/c/${slug}$`));
		await expect(op.getByRole('link', { name: 'Settings' })).toHaveCount(0);
		await expect(op.getByRole('link', { name: 'Moderation' })).toBeVisible();

		await mp.goto(`/c/${slug}/settings`);
		await hydrated(mp);
		await mp.getByLabel('Type the slug to confirm').fill(slug);
		await mp.getByRole('button', { name: 'Delete board' }).click();
		await expect(mp).toHaveURL(/boardDeleted=1/);
		const res = await mp.goto(`/c/${slug}`);
		expect(res?.status()).toBe(404);
		await owner.close();
		await member.close();
	});
});
