import { and, desc, eq, inArray, like, lt, or, sql, count } from 'drizzle-orm';
import { schema, type Db } from '../db';
import { newId } from '../ids';
import { moneyViolation } from '../blocklist';
import { CATEGORIES } from '../db/categories';
import { moderatorIds, notifyMany } from './notifications';
import { publicName } from './users';

export const SKILL_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const QUOTA_PER_KIND = 5;
export const PAGE_SIZE = 24;
export const KINDS = ['offer', 'want'] as const;
export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const FORMATS = ['in_person', 'online', 'either'] as const;
export const FORMAT_LABELS: Record<(typeof FORMATS)[number], string> = {
	in_person: 'In person',
	online: 'Online',
	either: 'Either'
};
export const LEVEL_LABELS: Record<(typeof LEVELS)[number], string> = {
	beginner: 'Beginner',
	intermediate: 'Intermediate',
	advanced: 'Advanced'
};

export class SkillError extends Error {
	constructor(
		message: string,
		public readonly field?: string
	) {
		super(message);
	}
}

export interface SkillInput {
	kind: 'offer' | 'want';
	categoryId: string;
	title: string;
	description: string;
	level: 'beginner' | 'intermediate' | 'advanced';
	format: 'in_person' | 'online' | 'either';
	availability?: string;
}

export function normalizeTitle(title: string): string {
	return title
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
		.trim()
		.replace(/\s+/g, ' ');
}

export function validateSkillInput(input: SkillInput): Record<string, string> {
	const errors: Record<string, string> = {};
	const title = input.title.trim();
	if (title.length < 3) errors.title = 'Give it a title of at least 3 characters.';
	if (title.length > 80) errors.title = 'Titles are at most 80 characters.';
	const description = input.description.trim();
	if (description.length < 10) errors.description = 'Say a little more, at least 10 characters.';
	if (description.length > 600) errors.description = 'Descriptions are at most 600 characters.';
	if (!(KINDS as readonly string[]).includes(input.kind)) errors.kind = 'Offer or want?';
	if (!CATEGORIES.some((c) => c.id === input.categoryId)) errors.categoryId = 'Pick a category.';
	if (!(LEVELS as readonly string[]).includes(input.level)) errors.level = 'Pick a level.';
	if (!(FORMATS as readonly string[]).includes(input.format)) errors.format = 'Pick a format.';
	if ((input.availability ?? '').length > 140)
		errors.availability = 'Keep availability under 140 characters.';
	const money = moneyViolation(`${title} ${description} ${input.availability ?? ''}`);
	if (money) errors.title = errors.title ?? 'No money on this board, that is the whole point.';
	return errors;
}

async function activeCount(db: Db, communityId: string, userId: string, kind: 'offer' | 'want') {
	const [row] = await db
		.select({ n: count() })
		.from(schema.skills)
		.where(
			and(
				eq(schema.skills.communityId, communityId),
				eq(schema.skills.userId, userId),
				eq(schema.skills.kind, kind),
				inArray(schema.skills.status, ['active', 'pending', 'paused'])
			)
		);
	return row.n;
}

/** Create a notice. First notice from an untrusted member is held for moderation. */
export async function createSkill(
	db: Db,
	communityId: string,
	userId: string,
	trusted: boolean,
	input: SkillInput,
	now = Date.now()
) {
	const errors = validateSkillInput(input);
	if (Object.keys(errors).length)
		throw new SkillError(Object.values(errors)[0], Object.keys(errors)[0]);
	if ((await activeCount(db, communityId, userId, input.kind)) >= QUOTA_PER_KIND) {
		throw new SkillError(
			`You already have ${QUOTA_PER_KIND} ${input.kind}s on this board. Pause or delete one first.`,
			'title'
		);
	}
	const id = newId();
	const status = trusted ? 'active' : 'pending';
	await db.insert(schema.skills).values({
		id,
		communityId,
		userId,
		kind: input.kind,
		categoryId: input.categoryId,
		title: input.title.trim(),
		titleNormalized: normalizeTitle(input.title),
		description: input.description.trim(),
		level: input.level,
		format: input.format,
		availability: input.availability?.trim() || null,
		status,
		expiresAt: new Date(now + SKILL_TTL_MS)
	});
	if (status === 'pending') {
		const mods = await moderatorIds(db, communityId);
		await notifyMany(db, mods, 'mod_pending', {
			skillId: id,
			communityId,
			title: input.title.trim()
		});
	}
	return (await db.query.skills.findFirst({ where: eq(schema.skills.id, id) }))!;
}

export async function updateSkill(db: Db, skillId: string, input: SkillInput) {
	const errors = validateSkillInput(input);
	if (Object.keys(errors).length)
		throw new SkillError(Object.values(errors)[0], Object.keys(errors)[0]);
	await db
		.update(schema.skills)
		.set({
			kind: input.kind,
			categoryId: input.categoryId,
			title: input.title.trim(),
			titleNormalized: normalizeTitle(input.title),
			description: input.description.trim(),
			level: input.level,
			format: input.format,
			availability: input.availability?.trim() || null,
			updatedAt: new Date()
		})
		.where(eq(schema.skills.id, skillId));
}

export async function setSkillStatus(
	db: Db,
	skillId: string,
	status: 'active' | 'paused' | 'hidden'
) {
	await db
		.update(schema.skills)
		.set({ status, updatedAt: new Date() })
		.where(eq(schema.skills.id, skillId));
}

export async function renewSkill(db: Db, skillId: string, now = Date.now()) {
	await db
		.update(schema.skills)
		.set({
			expiresAt: new Date(now + SKILL_TTL_MS),
			expiryNotifiedAt: null,
			status: 'active',
			updatedAt: new Date()
		})
		.where(
			and(
				eq(schema.skills.id, skillId),
				inArray(schema.skills.status, ['active', 'expired', 'paused'])
			)
		);
}

export async function deleteSkill(db: Db, skillId: string) {
	await db.delete(schema.skills).where(eq(schema.skills.id, skillId));
}

export interface BoardQuery {
	kind: 'offer' | 'want';
	categories?: string[];
	format?: 'in_person' | 'online' | 'either';
	q?: string;
	cursor?: string | null; // `${createdAtMs}:${id}`
	viewerId?: string | null;
	canModerate?: boolean;
}

export interface BoardCard {
	id: string;
	kind: 'offer' | 'want';
	categoryId: string;
	categoryName: string;
	title: string;
	description: string;
	level: string;
	format: string;
	status: string;
	availability: string | null;
	createdAt: Date;
	expiresAt: Date;
	userId: string;
	authorName: string;
	authorAvatar: string | null;
	isMine: boolean;
}

export function encodeCursor(row: { createdAt: Date; id: string }) {
	return `${row.createdAt.getTime()}:${row.id}`;
}

function decodeCursor(cursor: string | null | undefined) {
	if (!cursor) return null;
	const [ts, id] = cursor.split(':');
	const n = Number(ts);
	if (!Number.isFinite(n) || !id) return null;
	return { createdAt: new Date(n), id };
}

/** Board listing: active notices for everyone, plus the viewer's own pending ones. Keyset paginated. */
export async function listBoard(
	db: Db,
	communityId: string,
	query: BoardQuery
): Promise<{ cards: BoardCard[]; nextCursor: string | null; total: number }> {
	const conds = [eq(schema.skills.communityId, communityId), eq(schema.skills.kind, query.kind)];
	const visible = query.viewerId
		? or(
				eq(schema.skills.status, 'active'),
				and(eq(schema.skills.status, 'pending'), eq(schema.skills.userId, query.viewerId))
			)!
		: eq(schema.skills.status, 'active');
	conds.push(visible);
	if (query.categories?.length) conds.push(inArray(schema.skills.categoryId, query.categories));
	if (query.format && query.format !== 'either')
		conds.push(or(eq(schema.skills.format, query.format), eq(schema.skills.format, 'either'))!);
	if (query.q?.trim()) {
		const needle = `%${normalizeTitle(query.q).replace(/[%_]/g, '')}%`;
		conds.push(
			or(
				like(schema.skills.titleNormalized, needle),
				like(sql`lower(${schema.skills.description})`, needle)
			)!
		);
	}
	const c = decodeCursor(query.cursor);
	const pageConds = [...conds];
	if (c)
		pageConds.push(
			or(
				lt(schema.skills.createdAt, c.createdAt),
				and(eq(schema.skills.createdAt, c.createdAt), lt(schema.skills.id, c.id))
			)!
		);

	const [{ total }] = await db
		.select({ total: count() })
		.from(schema.skills)
		.where(and(...conds));
	const rows = await db
		.select({
			skill: schema.skills,
			categoryName: schema.categories.name,
			displayName: schema.users.displayName,
			avatarUrl: schema.users.avatarUrl
		})
		.from(schema.skills)
		.innerJoin(schema.categories, eq(schema.skills.categoryId, schema.categories.id))
		.innerJoin(schema.users, eq(schema.skills.userId, schema.users.id))
		.where(and(...pageConds))
		.orderBy(desc(schema.skills.createdAt), desc(schema.skills.id))
		.limit(PAGE_SIZE + 1);
	const page = rows.slice(0, PAGE_SIZE);
	const nextCursor = rows.length > PAGE_SIZE ? encodeCursor(page[page.length - 1].skill) : null;
	return {
		total,
		nextCursor,
		cards: page.map((r) => ({
			id: r.skill.id,
			kind: r.skill.kind,
			categoryId: r.skill.categoryId,
			categoryName: r.categoryName,
			title: r.skill.title,
			description: r.skill.description,
			level: r.skill.level,
			format: r.skill.format,
			status: r.skill.status,
			availability: r.skill.availability,
			createdAt: r.skill.createdAt,
			expiresAt: r.skill.expiresAt,
			userId: r.skill.userId,
			authorName: publicName(r.displayName),
			authorAvatar: r.avatarUrl,
			isMine: r.skill.userId === query.viewerId
		}))
	};
}

export async function getSkill(db: Db, skillId: string) {
	return db.query.skills.findFirst({
		where: eq(schema.skills.id, skillId),
		with: { user: true, category: true, community: true }
	});
}

/** Everything a user has pinned in a community that is not hidden, for profiles and detail sidebars. */
export async function listUserSkills(
	db: Db,
	communityId: string,
	userId: string,
	includeInactive = false
) {
	const statuses = includeInactive ? ['active', 'pending', 'paused', 'expired'] : ['active'];
	return db.query.skills.findMany({
		where: and(
			eq(schema.skills.communityId, communityId),
			eq(schema.skills.userId, userId),
			inArray(schema.skills.status, statuses as ('active' | 'pending')[])
		),
		with: { category: true },
		orderBy: desc(schema.skills.createdAt)
	});
}

export async function pendingSkills(db: Db, communityId: string) {
	return db.query.skills.findMany({
		where: and(eq(schema.skills.communityId, communityId), eq(schema.skills.status, 'pending')),
		with: { user: true, category: true },
		orderBy: schema.skills.createdAt
	});
}
