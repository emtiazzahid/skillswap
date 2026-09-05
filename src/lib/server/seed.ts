/**
 * Demo data for local development and screenshots. Every statement is INSERT OR IGNORE with
 * fixed ids, so running it twice is a no-op. Not used in production.
 * Seed people sign in through the mock provider (E2E_MOCK_OAUTH=1) with their id, e.g. "seed-rina".
 */
import { normalizeTitle } from './services/skills';

const q = (v: string | null | number) =>
	v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${v.replace(/'/g, "''")}'`;
const DAY = 86_400_000;
const ago = (days: number) => `(unixepoch('subsec') * 1000 - ${Math.round(days * DAY)})`;
const ahead = (days: number) => `(unixepoch('subsec') * 1000 + ${Math.round(days * DAY)})`;

export const SEED_COMMUNITY = {
	id: 'seed-c1',
	slug: 'mirpur-lane',
	name: 'Mirpur Lane',
	tagline: 'Twelve buildings, one tea stall, a lot of hidden talent.',
	area: 'Mirpur, Dhaka'
};

export const SEED_USERS = [
	{
		id: 'seed-rina',
		name: 'Rina Sultana',
		bio: 'Guitar in the evenings, spreadsheets by day. Sadly not the other way round.'
	},
	{
		id: 'seed-tanvir',
		name: 'Tanvir Ahmed',
		bio: 'Runs the corner pharmacy. Wants to stop fearing Excel.'
	},
	{
		id: 'seed-maya',
		name: 'Maya Khan',
		bio: 'Bakes on Fridays. Will trade bread for almost anything.'
	},
	{ id: 'seed-joy', name: 'Joy Prakash', bio: 'Chess club dropout, still plays every day.' },
	{ id: 'seed-farah', name: 'Farah Hossain', bio: 'Speaks four languages, badly in two of them.' },
	{ id: 'seed-omar', name: 'Omar Rahman', bio: 'Fixes bikes on the roof. Bring your own chain.' }
] as const;

type Kind = 'offer' | 'want';
const S = (
	id: string,
	user: string,
	kind: Kind,
	cat: string,
	title: string,
	desc: string,
	opts: { level?: string; format?: string; avail?: string; days?: number; status?: string } = {}
) => ({
	id,
	user,
	kind,
	cat,
	title,
	desc,
	level: opts.level ?? 'beginner',
	format: opts.format ?? 'either',
	avail: opts.avail ?? null,
	days: opts.days ?? 3,
	status: opts.status ?? 'active'
});

export const SEED_SKILLS = [
	S(
		'seed-s1',
		'seed-rina',
		'offer',
		'music',
		'Guitar chords for beginners',
		'Three chords, one song, first session. I have a spare guitar.',
		{ format: 'in_person', avail: 'Weekday evenings', days: 2 }
	),
	S(
		'seed-s2',
		'seed-rina',
		'want',
		'tech',
		"Excel that doesn't scare me",
		'I can add up a column. I cannot do anything else. Pivot tables sound like a threat.',
		{ days: 2 }
	),
	S(
		'seed-s3',
		'seed-tanvir',
		'offer',
		'tech',
		'Excel for small shops',
		'Stock sheets, simple formulas, a monthly summary that makes sense. Twelve years of doing this for my own shop.',
		{ level: 'intermediate', format: 'online', days: 5 }
	),
	S(
		'seed-s4',
		'seed-tanvir',
		'want',
		'music',
		'Learn guitar, finally',
		"Forty-one and never learned. Would like to play one song at my daughter's birthday.",
		{ format: 'in_person', days: 5 }
	),
	S(
		'seed-s5',
		'seed-maya',
		'offer',
		'cooking',
		'Sourdough from scratch',
		'Starter, shaping, scoring, one bake together at my place. You leave with a loaf and a jar of starter.',
		{ level: 'advanced', format: 'in_person', avail: 'Friday mornings', days: 1 }
	),
	S(
		'seed-s6',
		'seed-maya',
		'want',
		'languages',
		'Conversational Spanish',
		'Trip to Madrid next spring. Ordering food and not embarrassing myself is the goal.',
		{ days: 1 }
	),
	S(
		'seed-s7',
		'seed-joy',
		'offer',
		'academic',
		'Chess openings',
		'Two openings for white, one for black, and how to not lose in ten moves.',
		{ level: 'intermediate', days: 8 }
	),
	S(
		'seed-s8',
		'seed-joy',
		'want',
		'cooking',
		'Bread that rises',
		'Mine comes out like a brick. Any bread. Please.',
		{ days: 8 }
	),
	S(
		'seed-s9',
		'seed-farah',
		'offer',
		'languages',
		'Spanish for travellers',
		'Grew up in Barcelona. Ten sessions gets you through a menu, a pharmacy and a lost bag.',
		{ level: 'advanced', format: 'online', days: 12 }
	),
	S(
		'seed-s10',
		'seed-farah',
		'want',
		'crafts',
		'Sewing machine basics',
		'I own one. It has been in a box for three years.',
		{ days: 12 }
	),
	S(
		'seed-s11',
		'seed-omar',
		'offer',
		'home-repair',
		'Bicycle repair on the roof',
		'Punctures, brakes, gears. Bring your bike Saturday morning, leave with it working.',
		{ level: 'intermediate', format: 'in_person', avail: 'Saturdays 8-11', days: 20 }
	),
	S(
		'seed-s12',
		'seed-omar',
		'want',
		'academic',
		'Chess, beyond moving pieces',
		'I know how the horse moves. That is the extent of it.',
		{ days: 20 }
	),
	S(
		'seed-s13',
		'seed-rina',
		'offer',
		'crafts',
		'Hand-sewing and simple repairs',
		'Buttons, hems, patches. Machine optional.',
		{ days: 30 }
	),
	S(
		'seed-s14',
		'seed-tanvir',
		'offer',
		'fitness',
		'Morning walks that turn into runs',
		'Couch to 5k, but with tea afterwards.',
		{ format: 'in_person', days: 40, status: 'paused' }
	),
	S(
		'seed-s15',
		'seed-maya',
		'offer',
		'arts',
		'Watercolour postcards',
		'One afternoon, six postcards, no talent required.',
		{ days: 85 }
	)
];

export function seedStatements(): string[] {
	const out: string[] = [];
	for (const u of SEED_USERS) {
		out.push(
			`INSERT OR IGNORE INTO users (id, display_name, bio, onboarded_at, created_at) VALUES (${q(u.id)}, ${q(u.name)}, ${q(u.bio)}, ${ago(60)}, ${ago(60)});`
		);
		out.push(
			`INSERT OR IGNORE INTO oauth_accounts (provider, provider_user_id, user_id) VALUES ('mock', ${q(u.id)}, ${q(u.id)});`
		);
	}
	const c = SEED_COMMUNITY;
	out.push(
		`INSERT OR IGNORE INTO communities (id, slug, name, tagline, description, visibility, area_label, owner_id, created_at) VALUES (${q(c.id)}, ${q(c.slug)}, ${q(c.name)}, ${q(c.tagline)}, ${q('Anyone who lives on the lane or has ever queued at the tea stall. Be kind, show up, no money.')}, 'public', ${q(c.area)}, 'seed-rina', ${ago(50)});`
	);
	for (const [i, u] of SEED_USERS.entries()) {
		out.push(
			`INSERT OR IGNORE INTO memberships (community_id, user_id, role, trusted_at, joined_at) VALUES (${q(c.id)}, ${q(u.id)}, ${q(i === 0 ? 'owner' : i === 1 ? 'moderator' : 'member')}, ${ago(45 - i)}, ${ago(50 - i)});`
		);
	}
	for (const s of SEED_SKILLS) {
		out.push(
			`INSERT OR IGNORE INTO skills (id, community_id, user_id, kind, category_id, title, title_normalized, description, level, format, availability, status, created_at, updated_at, expires_at) VALUES (${q(s.id)}, ${q(c.id)}, ${q(s.user)}, ${q(s.kind)}, ${q(s.cat)}, ${q(s.title)}, ${q(normalizeTitle(s.title))}, ${q(s.desc)}, ${q(s.level)}, ${q(s.format)}, ${q(s.avail)}, ${q(s.status)}, ${ago(s.days)}, ${ago(s.days)}, ${ahead(90 - s.days)});`
		);
	}
	// One completed swap with thanks both ways, one accepted, one pending.
	out.push(
		`INSERT OR IGNORE INTO swap_requests (id, community_id, from_user_id, to_user_id, offer_skill_id, want_skill_id, note, status, created_at, responded_at, completed_at) VALUES ('seed-sw1', ${q(c.id)}, 'seed-joy', 'seed-maya', 'seed-s7', 'seed-s5', ${q('I will bring the board, you bring the flour?')}, 'completed', ${ago(14)}, ${ago(13)}, ${ago(6)});`
	);
	out.push(
		`INSERT OR IGNORE INTO thanks (id, swap_request_id, from_user_id, from_name, to_user_id, text, created_at) VALUES ('seed-t1', 'seed-sw1', 'seed-joy', 'Joy Prakash', 'seed-maya', ${q('Two Fridays and my bread finally rises. Maya is patient and brings snacks.')}, ${ago(6)});`
	);
	out.push(
		`INSERT OR IGNORE INTO thanks (id, swap_request_id, from_user_id, from_name, to_user_id, text, created_at) VALUES ('seed-t2', 'seed-sw1', 'seed-maya', 'Maya Khan', 'seed-joy', ${q('I beat my brother at chess for the first time in twenty years.')}, ${ago(5)});`
	);
	out.push(
		`INSERT OR IGNORE INTO swap_requests (id, community_id, from_user_id, to_user_id, offer_skill_id, want_skill_id, note, status, created_at, responded_at) VALUES ('seed-sw2', ${q(c.id)}, 'seed-tanvir', 'seed-rina', 'seed-s3', 'seed-s1', ${q('Saw we match both ways. Evenings after 7 work for me.')}, 'accepted', ${ago(2)}, ${ago(1)});`
	);
	out.push(
		`INSERT OR IGNORE INTO swap_requests (id, community_id, from_user_id, to_user_id, offer_skill_id, want_skill_id, note, status, created_at) VALUES ('seed-sw3', ${q(c.id)}, 'seed-omar', 'seed-joy', 'seed-s11', 'seed-s7', ${q('My bike works, my chess does not. Trade?')}, 'pending', ${ago(0.3)});`
	);
	out.push(
		`INSERT OR IGNORE INTO notifications (id, user_id, kind, payload, created_at) VALUES ('seed-n1', 'seed-joy', 'swap_requested', ${q(JSON.stringify({ swapId: 'seed-sw3', communityId: c.id, skillId: 'seed-s7', title: 'Chess openings', fromUserId: 'seed-omar' }))}, ${ago(0.3)});`
	);
	out.push(
		`INSERT OR IGNORE INTO notifications (id, user_id, kind, payload, created_at) VALUES ('seed-n2', 'seed-tanvir', 'swap_accepted', ${q(JSON.stringify({ swapId: 'seed-sw2', communityId: c.id, actorId: 'seed-rina' }))}, ${ago(1)});`
	);
	return out;
}
