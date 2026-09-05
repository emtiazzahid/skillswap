import { relations } from 'drizzle-orm';
import {
	oauthAccounts,
	users,
	sessions,
	memberships,
	communities,
	skills,
	categories,
	contactMethods
} from './schema';

export const usersRelations = relations(users, ({ many, one }) => ({
	oauthAccounts: many(oauthAccounts),
	sessions: many(sessions),
	memberships: many(memberships),
	skills: many(skills),
	contact: one(contactMethods, { fields: [users.id], references: [contactMethods.userId] })
}));
export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
	user: one(users, { fields: [oauthAccounts.userId], references: [users.id] })
}));
export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] })
}));
export const communitiesRelations = relations(communities, ({ one, many }) => ({
	owner: one(users, { fields: [communities.ownerId], references: [users.id] }),
	memberships: many(memberships),
	skills: many(skills)
}));
export const membershipsRelations = relations(memberships, ({ one }) => ({
	community: one(communities, { fields: [memberships.communityId], references: [communities.id] }),
	user: one(users, { fields: [memberships.userId], references: [users.id] })
}));
export const skillsRelations = relations(skills, ({ one }) => ({
	community: one(communities, { fields: [skills.communityId], references: [communities.id] }),
	user: one(users, { fields: [skills.userId], references: [users.id] }),
	category: one(categories, { fields: [skills.categoryId], references: [categories.id] })
}));
