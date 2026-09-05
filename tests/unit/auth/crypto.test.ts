import { describe, it, expect } from 'vitest';
import { decryptContact, encryptContact, generateContactKey } from '$lib/server/auth/crypto';

describe('contact encryption', () => {
	const key = generateContactKey();

	it('round-trips unicode text', async () => {
		const c = await encryptContact(key, 'টেলিগ্রাম @rina_plays');
		expect(await decryptContact(key, c)).toBe('টেলিগ্রাম @rina_plays');
	});

	it('uses a fresh IV per call so equal inputs differ', async () => {
		const a = await encryptContact(key, 'same');
		const b = await encryptContact(key, 'same');
		expect(a).not.toBe(b);
	});

	it('rejects tampered ciphertext', async () => {
		const c = await encryptContact(key, 'secret');
		const bytes = Uint8Array.from(atob(c), (ch) => ch.charCodeAt(0));
		bytes[bytes.length - 1] ^= 0x01;
		const tampered = btoa(String.fromCharCode(...bytes));
		await expect(decryptContact(key, tampered)).rejects.toThrow();
	});

	it('rejects the wrong key', async () => {
		const c = await encryptContact(key, 'secret');
		await expect(decryptContact(generateContactKey(), c)).rejects.toThrow();
	});

	it('refuses keys that are not 32 bytes', async () => {
		await expect(encryptContact(btoa('short'), 'x')).rejects.toThrow(/32 bytes/);
	});
});
