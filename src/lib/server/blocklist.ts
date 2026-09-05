/**
 * No money on the board. Matches whole tokens (not substrings) so "dollar cost averaging" passes
 * while "$20", "500 taka" and "fee" do not.
 */
const MONEY_TOKENS = new Set([
	'pay',
	'paid',
	'payment',
	'payments',
	'fee',
	'fees',
	'sell',
	'selling',
	'buy',
	'buying',
	'price',
	'priced',
	'pricing',
	'cash',
	'taka',
	'tk',
	'bdt',
	'usd',
	'eur',
	'gbp',
	'inr',
	'rs',
	'hire',
	'hiring',
	'salary',
	'invoice',
	'paypal',
	'bkash',
	'nagad',
	'rocket',
	'venmo'
]);
const MONEY_PATTERNS = [
	/[$€£¥₹৳]\s?\d/u,
	/\d\s?[$€£¥₹৳]/u,
	/\b\d+\s*(tk|taka|bdt|usd|dollars?|bucks|euros?|rupees?)\b/i,
	/\bper\s+(hour|hr|session|class|lesson)\b/i,
	/\b(only|just)\s+\d+\b/i
];

export function moneyViolation(text: string): string | null {
	for (const re of MONEY_PATTERNS) if (re.test(text)) return re.source;
	const tokens = text
		.toLowerCase()
		.split(/[^a-z0-9$€£¥₹৳]+/u)
		.filter(Boolean);
	for (const t of tokens) if (MONEY_TOKENS.has(t)) return t;
	if (/[$€£¥₹৳]/u.test(text)) return 'currency symbol';
	return null;
}
