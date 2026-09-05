import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('landing', () => {
	test('renders hero, sign-in and how-it-works without console errors', async ({ page }) => {
		const errors: string[] = [];
		page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
		await page.goto('/');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Teach me guitar');
		await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
		expect(errors).toEqual([]);
	});

	test('has no horizontal overflow', async ({ page }) => {
		await page.goto('/');
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
		);
		expect(overflow).toBe(false);
	});

	test('passes axe with no serious or critical violations', async ({ page }) => {
		await page.goto('/');
		const results = await new AxeBuilder({ page }).analyze();
		const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
		expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
	});

	test('security headers are present', async ({ request }) => {
		const res = await request.get('/');
		expect(res.headers()['x-frame-options']).toBe('DENY');
		expect(res.headers()['content-security-policy']).toContain("default-src 'self'");
		expect(res.headers()['content-security-policy']).toMatch(/script-src 'self' '(nonce|sha256)-/);
	});
});
