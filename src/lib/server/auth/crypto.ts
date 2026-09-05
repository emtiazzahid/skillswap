import { decodeBase64, encodeBase64 } from '@oslojs/encoding';

/**
 * AES-256-GCM for contact details. CONTACT_KEY is 32 random bytes, base64.
 * Ciphertext layout: base64(iv[12] || ciphertext+tag).
 */
async function importKey(keyB64: string): Promise<CryptoKey> {
	const raw = new Uint8Array(decodeBase64(keyB64));
	if (raw.byteLength !== 32) throw new Error('CONTACT_KEY must decode to 32 bytes');
	return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptContact(keyB64: string, plaintext: string): Promise<string> {
	const key = await importKey(keyB64);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const data = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		new TextEncoder().encode(plaintext)
	);
	const out = new Uint8Array(12 + data.byteLength);
	out.set(iv, 0);
	out.set(new Uint8Array(data), 12);
	return encodeBase64(out);
}

export async function decryptContact(keyB64: string, payloadB64: string): Promise<string> {
	const key = await importKey(keyB64);
	const bytes = new Uint8Array(decodeBase64(payloadB64));
	if (bytes.byteLength < 13) throw new Error('ciphertext too short');
	const iv = bytes.slice(0, 12);
	const data = bytes.slice(12);
	const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
	return new TextDecoder().decode(plain);
}

export function generateContactKey(): string {
	return encodeBase64(crypto.getRandomValues(new Uint8Array(32)));
}
