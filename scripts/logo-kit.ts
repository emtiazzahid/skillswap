// Render the SkillSwap logo set to a target folder: pnpm logo:kit [outDir]
// Wordmark, lockup, mark, banner and avatar, on transparent, paper and cork.
import { chromium, type Page } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const root = path.resolve(import.meta.dirname, '..');
const out = path.resolve(process.argv[2] ?? path.join(os.homedir(), 'Downloads/skillswap-logo'));
await mkdir(out, { recursive: true });

const src = pathToFileURL(path.join(root, 'design/mockups/_logo.html')).href;
const browser = await chromium.launch();

type Piece = 'wordmark' | 'lockup' | 'mark' | 'banner' | 'avatar';
async function render(
	name: string,
	piece: Piece,
	opts: { bg?: 'cork' | 'paper'; reverse?: boolean; scale?: number; plate?: boolean } = {}
) {
	const page: Page = await browser.newPage({
		viewport: { width: 1600, height: 1100 },
		deviceScaleFactor: opts.scale ?? 2
	});
	await page.goto(src, { waitUntil: 'networkidle' });
	await page.evaluate(
		({ piece, bg, reverse, plate }) => {
			document.body.dataset.piece = piece;
			if (bg) document.body.dataset.bg = bg;
			if (reverse) document.body.dataset.reverse = '1';
			if (plate) document.querySelector('.p-mark .mark')?.classList.add('mark--plate');
		},
		{ piece, bg: opts.bg, reverse: opts.reverse, plate: opts.plate }
	);
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(150);
	const el = page.locator(`.p-${piece} > *`).first();
	await el.screenshot({
		path: path.join(out, `${name}.png`),
		omitBackground: !opts.bg,
		scale: 'device'
	});
	await page.close();
}

await render('skillswap-wordmark-ink', 'wordmark');
await render('skillswap-wordmark-reverse', 'wordmark', { reverse: true });
await render('skillswap-wordmark-on-paper', 'wordmark', { bg: 'paper' });
await render('skillswap-wordmark-on-cork', 'wordmark', { bg: 'cork', reverse: true });
await render('skillswap-lockup-ink', 'lockup');
await render('skillswap-lockup-reverse', 'lockup', { reverse: true });
await render('skillswap-lockup-on-cork', 'lockup', { bg: 'cork', reverse: true });
await render('skillswap-mark', 'mark');
await render('skillswap-mark-plate', 'mark', { plate: true });
await render('skillswap-banner-1500x500', 'banner', { scale: 1 });
await render('skillswap-avatar-1000', 'avatar', { scale: 1 });

// Vector version of the mark, no font needed.
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="SkillSwap">
	<g transform="rotate(-4 256 279)">
		<rect x="78" y="126" width="356" height="306" rx="10" fill="#fbf7ee"/>
		<rect x="138" y="236" width="232" height="26" rx="5" fill="#1f1a15" opacity=".85"/>
		<rect x="148" y="300" width="150" height="26" rx="5" fill="#1f1a15" opacity=".5"/>
		<rect x="148" y="356" width="96" height="22" rx="5" fill="#8a2620" opacity=".9"/>
	</g>
	<circle cx="256" cy="132" r="48" fill="#c7382f"/>
	<circle cx="275" cy="121" r="11" fill="#ffffff" opacity=".55"/>
</svg>
`;
await writeFile(path.join(out, 'skillswap-mark.svg'), markSvg);
await writeFile(
	path.join(out, 'skillswap-mark-plate.svg'),
	markSvg.replace(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="SkillSwap">',
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="SkillSwap">\n\t<rect width="512" height="512" rx="96" fill="#98643d"/>'
	)
);
await writeFile(
	path.join(out, 'README.txt'),
	`SkillSwap logo set
==================

Wordmark type: Fraunces (700, "Swap" in italic 600). Hand annotation: Caveat.
Colours: ink #1f1a15, brick red #8a2620, pin red #c7382f, paper #fbf7ee,
cork #98643d, sticky yellow #fff3a3.

Files (PNG at 2x unless noted, transparent where no background is named):
  skillswap-wordmark-ink          wordmark for light backgrounds
  skillswap-wordmark-reverse      wordmark for dark backgrounds
  skillswap-wordmark-on-paper     wordmark on the paper cream
  skillswap-wordmark-on-cork      wordmark on cork
  skillswap-lockup-*              mark + wordmark + tagline
  skillswap-mark                  pinned-notice mark, transparent
  skillswap-mark-plate            mark on a rounded cork plate (app icon)
  skillswap-mark.svg              vector mark, scales to any size
  skillswap-mark-plate.svg        vector mark on cork plate
  skillswap-banner-1500x500       social header (X / LinkedIn cover)
  skillswap-avatar-1000           square profile picture

Clear space: keep at least the height of the "S" free on every side.
Don't recolour the pin, stretch the lockup, or set the wordmark in another face.
`
);

await browser.close();
console.log(`logo set written to ${out}`);
