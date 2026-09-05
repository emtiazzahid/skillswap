import { encodeBase32LowerCaseNoPadding } from '@oslojs/encoding';

/** 20 random bytes as base32: URL-safe, sortable enough, 32 chars. */
export function newId(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	return encodeBase32LowerCaseNoPadding(bytes);
}
