/** Sørensen–Dice coefficient over character bigrams of normalized titles. 0..1. */
export function bigrams(s: string): Map<string, number> {
	const out = new Map<string, number>();
	const t = s.replace(/\s+/g, ' ').trim();
	for (let i = 0; i < t.length - 1; i++) {
		const g = t.slice(i, i + 2);
		if (g === ' ') continue;
		out.set(g, (out.get(g) ?? 0) + 1);
	}
	return out;
}

export function dice(a: string, b: string): number {
	if (!a || !b) return 0;
	if (a === b) return 1;
	const A = bigrams(a);
	const B = bigrams(b);
	let overlap = 0;
	let sizeA = 0;
	let sizeB = 0;
	for (const n of A.values()) sizeA += n;
	for (const n of B.values()) sizeB += n;
	for (const [g, n] of A) overlap += Math.min(n, B.get(g) ?? 0);
	if (sizeA + sizeB === 0) return 0;
	return (2 * overlap) / (sizeA + sizeB);
}
