import { describe, it, expect } from 'vitest';
import { dice } from '$lib/server/services/similarity';

describe('dice bigram similarity', () => {
	it('identical strings score 1', () => expect(dice('guitar basics', 'guitar basics')).toBe(1));
	it('disjoint strings score 0', () => expect(dice('abc', 'xyz')).toBe(0));
	it('reordered words still score high', () =>
		expect(dice('guitar basics', 'basic guitar')).toBeGreaterThan(0.5));
	it('empty input scores 0', () => expect(dice('', 'guitar')).toBe(0));
	it('is symmetric', () =>
		expect(dice('excel formulas', 'formulas in excel')).toBeCloseTo(
			dice('formulas in excel', 'excel formulas'),
			10
		));
});
