/** Deterministic tilt for a card: FNV-1a hash of the id mapped to -2..2 degrees. Same on server and client. */
export function fnv1a(input: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h >>> 0;
}

export function rotationFor(id: string): string {
	const deg = (fnv1a(id) % 5) - 2;
	return `${deg}deg`;
}

const PINS = ['', 'pin--blue', 'pin--green', 'pin--yellow'];
export function pinFor(id: string): string {
	return PINS[fnv1a(id + ':pin') % PINS.length];
}
