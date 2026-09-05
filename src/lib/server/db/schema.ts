import {
	sqliteTable,
	text,
	integer,
	primaryKey,
	index,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

const now = () => sql`(unixepoch('subsec') * 1000)`;
const ts = (name: string) => integer(name, { mode: 'timestamp_ms' });

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	displayName: text('display_name').notNull(),
	avatarUrl: text('avatar_url'),
	bio: text('bio'),
	onboardedAt: ts('onboarded_at'),
	createdAt: ts('created_at').notNull().default(now()),
	deletedAt: ts('deleted_at')
});

export const oauthAccounts = sqliteTable(
	'oauth_accounts',
	{
		provider: text('provider', { enum: ['github', 'google', 'mock'] }).notNull(),
		providerUserId: text('provider_user_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: ts('created_at').notNull().default(now())
	},
	(t) => [
		primaryKey({ columns: [t.provider, t.providerUserId] }),
		index('oauth_user_idx').on(t.userId)
	]
);

export const sessions = sqliteTable(
	'sessions',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: ts('expires_at').notNull(),
		createdAt: ts('created_at').notNull().default(now())
	},
	(t) => [index('sessions_user_idx').on(t.userId)]
);

export const communities = sqliteTable('communities', {
	id: text('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	tagline: text('tagline'),
	description: text('description'),
	visibility: text('visibility', { enum: ['public', 'invite'] })
		.notNull()
		.default('public'),
	areaLabel: text('area_label'),
	ownerId: text('owner_id')
		.notNull()
		.references(() => users.id),
	createdAt: ts('created_at').notNull().default(now()),
	deletedAt: ts('deleted_at')
});

export const memberships = sqliteTable(
	'memberships',
	{
		communityId: text('community_id')
			.notNull()
			.references(() => communities.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		role: text('role', { enum: ['member', 'moderator', 'owner'] })
			.notNull()
			.default('member'),
		trustedAt: ts('trusted_at'),
		bannedAt: ts('banned_at'),
		joinedAt: ts('joined_at').notNull().default(now())
	},
	(t) => [
		primaryKey({ columns: [t.communityId, t.userId] }),
		index('memberships_user_idx').on(t.userId)
	]
);

export const invites = sqliteTable(
	'invites',
	{
		id: text('id').primaryKey(),
		communityId: text('community_id')
			.notNull()
			.references(() => communities.id, { onDelete: 'cascade' }),
		tokenHash: text('token_hash').notNull(),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		maxUses: integer('max_uses').notNull().default(25),
		usedCount: integer('used_count').notNull().default(0),
		expiresAt: ts('expires_at').notNull(),
		revokedAt: ts('revoked_at'),
		createdAt: ts('created_at').notNull().default(now())
	},
	(t) => [
		uniqueIndex('invites_token_idx').on(t.tokenHash),
		index('invites_community_idx').on(t.communityId)
	]
);

export const categories = sqliteTable('categories', {
	id: text('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	sortOrder: integer('sort_order').notNull().default(0)
});

export const skills = sqliteTable(
	'skills',
	{
		id: text('id').primaryKey(),
		communityId: text('community_id')
			.notNull()
			.references(() => communities.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		kind: text('kind', { enum: ['offer', 'want'] }).notNull(),
		categoryId: text('category_id')
			.notNull()
			.references(() => categories.id),
		title: text('title').notNull(),
		titleNormalized: text('title_normalized').notNull(),
		description: text('description').notNull(),
		level: text('level', { enum: ['beginner', 'intermediate', 'advanced'] })
			.notNull()
			.default('beginner'),
		format: text('format', { enum: ['in_person', 'online', 'either'] })
			.notNull()
			.default('either'),
		availability: text('availability'),
		status: text('status', { enum: ['pending', 'active', 'paused', 'hidden', 'expired'] })
			.notNull()
			.default('active'),
		expiryNotifiedAt: ts('expiry_notified_at'),
		createdAt: ts('created_at').notNull().default(now()),
		updatedAt: ts('updated_at').notNull().default(now()),
		expiresAt: ts('expires_at').notNull()
	},
	(t) => [
		index('skills_board_idx').on(t.communityId, t.kind, t.status, t.createdAt),
		index('skills_category_idx').on(t.communityId, t.categoryId),
		index('skills_user_idx').on(t.userId)
	]
);

export const swapRequests = sqliteTable(
	'swap_requests',
	{
		id: text('id').primaryKey(),
		communityId: text('community_id')
			.notNull()
			.references(() => communities.id, { onDelete: 'cascade' }),
		fromUserId: text('from_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		toUserId: text('to_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		offerSkillId: text('offer_skill_id').references(() => skills.id, { onDelete: 'set null' }),
		wantSkillId: text('want_skill_id')
			.notNull()
			.references(() => skills.id, { onDelete: 'cascade' }),
		note: text('note'),
		declineReason: text('decline_reason'),
		status: text('status', { enum: ['pending', 'accepted', 'declined', 'completed', 'cancelled'] })
			.notNull()
			.default('pending'),
		createdAt: ts('created_at').notNull().default(now()),
		respondedAt: ts('responded_at'),
		completedAt: ts('completed_at')
	},
	(t) => [
		index('swaps_to_idx').on(t.toUserId, t.status),
		index('swaps_from_idx').on(t.fromUserId, t.status)
	]
);

export const contactMethods = sqliteTable('contact_methods', {
	userId: text('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	kind: text('kind', {
		enum: ['email', 'telegram', 'whatsapp', 'signal', 'discord', 'other']
	}).notNull(),
	valueEncrypted: text('value_encrypted').notNull(),
	label: text('label').notNull(),
	updatedAt: ts('updated_at').notNull().default(now())
});

export const thanks = sqliteTable(
	'thanks',
	{
		id: text('id').primaryKey(),
		swapRequestId: text('swap_request_id')
			.notNull()
			.references(() => swapRequests.id, { onDelete: 'cascade' }),
		fromUserId: text('from_user_id').references(() => users.id, { onDelete: 'set null' }),
		fromName: text('from_name').notNull(),
		toUserId: text('to_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		text: text('text').notNull(),
		createdAt: ts('created_at').notNull().default(now())
	},
	(t) => [
		uniqueIndex('thanks_once_idx').on(t.swapRequestId, t.fromUserId),
		index('thanks_to_idx').on(t.toUserId)
	]
);

export const flags = sqliteTable(
	'flags',
	{
		id: text('id').primaryKey(),
		communityId: text('community_id')
			.notNull()
			.references(() => communities.id, { onDelete: 'cascade' }),
		targetType: text('target_type', { enum: ['skill', 'user'] }).notNull(),
		targetId: text('target_id').notNull(),
		reporterId: text('reporter_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		reason: text('reason', { enum: ['spam', 'money', 'harassment', 'unsafe', 'other'] }).notNull(),
		detail: text('detail'),
		createdAt: ts('created_at').notNull().default(now()),
		resolvedAt: ts('resolved_at'),
		resolvedBy: text('resolved_by').references(() => users.id, { onDelete: 'set null' }),
		resolution: text('resolution', { enum: ['dismissed', 'hidden', 'banned'] })
	},
	(t) => [
		index('flags_target_idx').on(t.communityId, t.targetType, t.targetId),
		uniqueIndex('flags_once_idx').on(t.targetType, t.targetId, t.reporterId)
	]
);

export const notifications = sqliteTable(
	'notifications',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		kind: text('kind').notNull(),
		payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
		readAt: ts('read_at'),
		createdAt: ts('created_at').notNull().default(now())
	},
	(t) => [index('notifications_user_idx').on(t.userId, t.readAt, t.createdAt)]
);

export type User = typeof users.$inferSelect;
export type Community = typeof communities.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type SwapRequest = typeof swapRequests.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
