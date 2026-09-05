import { describe, it, expect } from 'vitest';
import { handle } from '../../../src/hooks.server';

function fakeEvent() {
	return {
		locals: {} as App.Locals,
		request: new Request('http://localhost/'),
		url: new URL('http://localhost/'),
		cookies: { get: () => undefined, set: () => {} },
		platform: undefined
	} as unknown as Parameters<typeof handle>[0]['event'];
}

describe('security headers', () => {
	it('adds nosniff, frame deny, referrer and permissions policy to every response', async () => {
		const res = await handle({ event: fakeEvent(), resolve: async () => new Response('ok') });
		expect(res.headers.get('x-content-type-options')).toBe('nosniff');
		expect(res.headers.get('x-frame-options')).toBe('DENY');
		expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
		expect(res.headers.get('permissions-policy')).toContain('camera=()');
	});

	it('does not override a header the route already set', async () => {
		const res = await handle({
			event: fakeEvent(),
			resolve: async () => new Response('ok', { headers: { 'x-frame-options': 'SAMEORIGIN' } })
		});
		expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
	});

	it('sets an anonymous user on locals until sessions exist', async () => {
		const event = fakeEvent();
		await handle({ event, resolve: async () => new Response('ok') });
		expect(event.locals.user).toBeNull();
	});
});
