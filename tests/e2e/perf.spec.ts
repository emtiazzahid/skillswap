import { test, expect } from '@playwright/test';
import { gzipSync } from 'node:zlib';
import { hydrated, signIn, uid } from './helpers';

// Svelte runtime + SvelteKit client alone are ~31 KB gzipped; the board page itself adds ~5 KB.
const BUDGET = 48 * 1024;

test('board page loads at most 48 KB of gzipped JavaScript', async ({ page }) => {
	await signIn(page, { id: `pf-${uid()}`, name: 'Perf Probe' });
	await page.goto('/communities/new');
	await hydrated(page);
	await page.getByLabel('Board name').fill(`Perf ${uid()}`);
	await page.getByRole('button', { name: 'Pin the board up' }).click();
	const slug = page.url().split('/c/')[1];

	const sizes = new Map<string, number>();
	page.on('response', async (r) => {
		const url = r.url();
		if (!/\.js(\?|$)/.test(url) || !url.includes('/_app/')) return;
		try {
			sizes.set(url, gzipSync(await r.body()).length);
		} catch {
			/* body not available (cached) */
		}
	});
	await page.goto(`/c/${slug}`, { waitUntil: 'networkidle' });
	await hydrated(page);
	const total = [...sizes.values()].reduce((a, b) => a + b, 0);
	const report = [...sizes]
		.map(([u, n]) => `${(n / 1024).toFixed(1)} KB  ${u.split('/_app/')[1]}`)
		.join('\n');
	expect(
		total,
		`board JS (gzip):\n${report}\ntotal ${(total / 1024).toFixed(1)} KB`
	).toBeLessThanOrEqual(BUDGET);
	expect(sizes.size).toBeGreaterThan(0);
});
