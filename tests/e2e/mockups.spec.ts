import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.resolve('design/mockups');
const files = readdirSync(dir).filter((f) => f.endsWith('.html') && !f.startsWith('_'));

for (const file of files) {
	test(`mockup ${file} renders cleanly`, async ({ page }, info) => {
		test.skip(info.project.name === 'desktop' && file.includes('mobile'), 'mobile-only mockup');
		const errors: string[] = [];
		page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
		await page.goto(pathToFileURL(path.join(dir, file)).href);
		await page.evaluate(() => document.fonts.ready);
		const overflow = await page.evaluate(() => {
			const w = document.documentElement.clientWidth;
			return [...document.querySelectorAll('body *')]
				.filter((el) => !el.closest('.tape, .pin, .sticker--corner, [data-overhang]'))
				.filter((el) => el.getBoundingClientRect().right > w + 1)
				.map((el) => el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]);
		});
		expect(overflow, 'elements overflowing viewport').toEqual([]);
		expect(errors.filter((e) => !e.includes('fonts.g'))).toEqual([]);
		const results = await new AxeBuilder({ page }).disableRules(['region']).analyze();
		const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
		expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
	});
}
