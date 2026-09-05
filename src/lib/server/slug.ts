export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;
export const SLUG_MIN = 3;
export const SLUG_MAX = 32;
const RESERVED = new Set([
	'new',
	'join',
	'settings',
	'admin',
	'api',
	'auth',
	'me',
	'inbox',
	'about',
	'c',
	'u'
]);

export function slugify(input: string): string {
	return input
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/-{2,}/g, '-')
		.slice(0, SLUG_MAX)
		.replace(/-+$/g, '');
}

export function validateSlug(slug: string): string | null {
	if (slug.length < SLUG_MIN) return `Slug needs at least ${SLUG_MIN} characters.`;
	if (slug.length > SLUG_MAX) return `Slug can be at most ${SLUG_MAX} characters.`;
	if (!SLUG_RE.test(slug) || slug.includes('--'))
		return 'Slug can only use lowercase letters, numbers and single hyphens.';
	if (RESERVED.has(slug)) return 'That slug is reserved.';
	return null;
}
