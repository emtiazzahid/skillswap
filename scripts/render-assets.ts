// Render static/og.png (1200x630) and PWA icons from design/mockups/_og.html and _icon.html.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const mock = (f: string) => pathToFileURL(path.join(root, 'design/mockups', f)).href;
const browser = await chromium.launch();

const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await og.goto(mock('_og.html'), { waitUntil: 'networkidle' });
await og.evaluate(() => document.fonts.ready);
await og.screenshot({ path: path.join(root, 'static/og.png') });

for (const [file, size] of [
	['icon-512.png', 512],
	['icon-192.png', 192],
	['apple-touch-icon.png', 180]
] as const) {
	const p = await browser.newPage({
		viewport: { width: 512, height: 512 },
		deviceScaleFactor: size / 512
	});
	await p.goto(mock('_icon.html'));
	await p.screenshot({ path: path.join(root, 'static/icons', file) });
}
await browser.close();
console.log('rendered static/og.png and static/icons/*');
