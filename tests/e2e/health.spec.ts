import { test, expect } from '@playwright/test';

test('health endpoint reports a live database', async ({ request }) => {
	const res = await request.get('/api/health');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body).toMatchObject({ ok: true, db: true });
	expect(res.headers()['cache-control']).toContain('no-store');
});
