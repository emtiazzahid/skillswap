import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';

const tokensCss = env.TOKENS_CSS;

function parseTokens(css: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const m of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi))
		out[m[1]] = m[2].toLowerCase();
	return out;
}
function luminance(hex: string): number {
	const c = [1, 3, 5]
		.map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
		.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
	return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a: string, b: string): number {
	const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (l1 + 0.05) / (l2 + 0.05);
}

// text token, background token, minimum ratio (7 = body AAA target, 4.5 = meta/small AA, 3 = large text)
const PAIRS: [string, string, number][] = [
	['ink', 'paper', 7],
	['ink', 'index', 7],
	['ink', 'kraft', 7],
	['ink', 'sticky', 7],
	['ink', 'sticky-2', 7],
	['ink-soft', 'paper', 7],
	['ink-soft', 'lined', 7],
	['pencil', 'paper', 4.5],
	['pencil', 'index', 4.5],
	['blue-pen', 'lined', 4.5],
	['blue-pen', 'paper', 4.5],
	['red-pen', 'paper', 4.5],
	['red-pen', 'index', 4.5],
	['green-pen', 'paper', 4.5],
	['paper', 'ink', 7],
	['paper', 'red-pen', 4.5],
	['paper', 'green-pen', 4.5],
	['paper', 'cork', 4.5],
	['ink', 'sticker-green', 4.5],
	['ink', 'sticker-yellow', 4.5],
	['ink', 'sticker-red', 4.5],
	['red-ink', 'kraft', 4.5],
	['ink-soft', 'kraft', 4.5]
];

describe('design tokens contrast', () => {
	const tokens = parseTokens(tokensCss);

	it('parses the palette', () => {
		expect(Object.keys(tokens).length).toBeGreaterThan(20);
	});

	it.each(PAIRS)('%s on %s ≥ %s:1', (fg, bg, min) => {
		expect(tokens[fg], `missing token ${fg}`).toBeDefined();
		expect(tokens[bg], `missing token ${bg}`).toBeDefined();
		expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(min);
	});

	it('white on cork passes AA for body text', () => {
		expect(contrast('#ffffff', tokens.cork)).toBeGreaterThanOrEqual(4.5);
	});
});
