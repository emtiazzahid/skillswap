import { describe, it, expect } from 'vitest';
import { fnv1a, pinFor, rotationFor } from '$lib/utils/rotation';

describe('rotation', () => {
	it('is deterministic', () => {
		expect(rotationFor('abc')).toBe(rotationFor('abc'));
		expect(fnv1a('abc')).toBe(fnv1a('abc'));
	});
	it('stays within -2..2 degrees', () => {
		for (let i = 0; i < 500; i++) {
			const deg = Number(rotationFor(`id-${i}`).replace('deg', ''));
			expect(deg).toBeGreaterThanOrEqual(-2);
			expect(deg).toBeLessThanOrEqual(2);
		}
	});
	it('spreads across all five tilts and four pin colours', () => {
		const tilts = new Set<string>();
		const pins = new Set<string>();
		for (let i = 0; i < 200; i++) {
			tilts.add(rotationFor(`x${i}`));
			pins.add(pinFor(`x${i}`));
		}
		expect(tilts.size).toBe(5);
		expect(pins.size).toBe(4);
	});
});
