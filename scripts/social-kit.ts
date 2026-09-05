// Social kit: screenshots + a short screen recording of the seeded demo board.
// Builds, migrates + seeds the local D1, starts wrangler dev with the mock sign-in, then drives it.
// Output: design/social/*.png and design/social/walkthrough.webm
import { chromium, devices, type Page } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';

import { mkdir, readdir, rename } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'design/social');
const PORT = 8799;
const base = `http://127.0.0.1:${PORT}`;
const run = (cmd: string, args: string[]) => {
	const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' });
	if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed`);
};

await mkdir(out, { recursive: true });
if (!process.argv.includes('--no-build')) run('pnpm', ['build']);
run('pnpm', ['db:migrate:local']);
run('pnpm', ['exec', 'tsx', 'scripts/seed.ts']);

const server = spawn(
	'pnpm',
	[
		'exec',
		'wrangler',
		'dev',
		'--port',
		String(PORT),
		'--ip',
		'127.0.0.1',
		'--var',
		'E2E_MOCK_OAUTH:1',
		'--var',
		`PUBLIC_ORIGIN:${base}`,
		'--var',
		'CONTACT_KEY:c29jaWFsLWtpdC1kZW1vLWtleS0wMDAwMDAwMDAwMDA='
	],
	{ cwd: root, stdio: ['ignore', 'pipe', 'inherit'] }
);
await new Promise<void>((resolve, reject) => {
	const t = setTimeout(() => reject(new Error('wrangler dev did not start')), 60_000);
	const tick = async () => {
		try {
			const r = await fetch(`${base}/api/health`);
			if (r.ok) {
				clearTimeout(t);
				resolve();
				return;
			}
		} catch {
			/* not up yet */
		}
		setTimeout(tick, 500);
	};
	tick();
});

async function signIn(page: Page, id: string, name: string) {
	await page.goto(`${base}/auth/login?next=/`);
	await page.getByRole('link', { name: 'Continue with test account' }).click();
	await page.getByLabel('Provider user id').fill(id);
	await page.getByLabel('Name').fill(name);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await page.waitForURL(`${base}/`);
	// Seed rows cannot carry encrypted contacts, so set one through the settings form.
	await page.goto(`${base}/me`);
	await page.getByLabel('Contact method').selectOption('telegram');
	await page.getByLabel('Contact detail').fill(`@${id.replace('seed-', '')}_lane`);
	await page.getByRole('button', { name: 'Save contact' }).click();
	await page.waitForLoadState('networkidle');
}
const settle = async (page: Page) => {
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(250);
};
const shot = async (page: Page, name: string, full = false) => {
	await settle(page);
	await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: full });
};

const browser = await chromium.launch();
try {
	// Stills, desktop
	const ctx = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2
	});
	const p = await ctx.newPage();
	await signIn(p, 'seed-rina', 'Rina Sultana');
	await p.goto(`${base}/`);
	await shot(p, '01-landing');
	await p.goto(`${base}/c/mirpur-lane`);
	await shot(p, '02-board');
	await p.goto(`${base}/c/mirpur-lane/matches`);
	await shot(p, '03-matches');
	await p.goto(`${base}/c/mirpur-lane/s/seed-s3`);
	await shot(p, '04-notice');
	await p.goto(`${base}/inbox`);
	await shot(p, '05-inbox');
	await p.goto(`${base}/u/seed-maya`);
	await shot(p, '06-profile');
	await p.goto(`${base}/c/mirpur-lane/mod`);
	await shot(p, '07-moderation');
	await ctx.close();

	// Stills, mobile
	const m = await browser.newContext({ ...devices['Pixel 7'] });
	const mp = await m.newPage();
	await signIn(mp, 'seed-tanvir', 'Tanvir Ahmed');
	await mp.goto(`${base}/c/mirpur-lane`);
	await shot(mp, '08-mobile-board');
	await mp.goto(`${base}/inbox`);
	await shot(mp, '09-mobile-inbox');
	await m.close();

	// Walkthrough video, ~20 s
	const v = await browser.newContext({
		viewport: { width: 1280, height: 800 },
		recordVideo: { dir: out, size: { width: 1280, height: 800 } }
	});
	const vp = await v.newPage();
	await signIn(vp, 'seed-rina', 'Rina Sultana');
	const pause = (ms: number) => vp.waitForTimeout(ms);
	await vp.goto(`${base}/`);
	await settle(vp);
	await pause(2500);
	await vp.mouse.wheel(0, 500);
	await pause(1500);
	await vp.goto(`${base}/c/mirpur-lane`);
	await settle(vp);
	await pause(2000);
	await vp
		.getByRole('link', { name: /Wants/ })
		.first()
		.click()
		.catch(() => {});
	await pause(1500);
	await vp.goto(`${base}/c/mirpur-lane/matches`);
	await settle(vp);
	await pause(3000);
	await vp.getByRole('link', { name: 'Request swap' }).first().click();
	await settle(vp);
	await pause(2000);
	await vp.getByLabel('A short note').fill('Saw we match both ways. Tuesday evening?');
	await pause(1500);
	await vp.goto(`${base}/inbox`);
	await settle(vp);
	await pause(2500);
	await vp.goto(`${base}/u/seed-maya`);
	await settle(vp);
	await pause(2500);
	await v.close();
	for (const f of await readdir(out))
		if (f.endsWith('.webm') && f !== 'walkthrough.webm')
			await rename(path.join(out, f), path.join(out, 'walkthrough.webm'));
	console.log('social kit written to design/social/');
} finally {
	await browser.close();
	server.kill('SIGTERM');
}
