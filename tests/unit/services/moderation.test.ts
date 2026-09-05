import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { createDb, schema } from '$lib/server/db';
import { createCommunity, joinCommunity, setModerator } from '$lib/server/services/communities';
import { createSkill } from '$lib/server/services/skills';
import {
	approveSkill,
	flagTarget,
	hideSkill,
	openFlags,
	resolveFlags,
	restoreSkill
} from '$lib/server/services/moderation';

const db = createDb(env.DB);
let cid: string;
const input = {
	kind: 'offer' as const,
	categoryId: 'tech',
	title: 'Excel basics',
	description: 'Pivot tables in an hour, no macros.',
	level: 'beginner' as const,
	format: 'online' as const
};

beforeAll(async () => {
	await db
		.insert(schema.users)
		.values([
			{ id: 'own', displayName: 'Owner' },
			{ id: 'mod', displayName: 'Mod' },
			{ id: 'new', displayName: 'Newbie' },
			{ id: 'r1', displayName: 'R One' },
			{ id: 'r2', displayName: 'R Two' },
			{ id: 'r3', displayName: 'R Three' }
		])
		.onConflictDoNothing();
	const c = await createCommunity(db, 'own', {
		name: 'Mod Board',
		slug: 'mod-board',
		visibility: 'public'
	});
	cid = c.id;
	for (const u of ['mod', 'new', 'r1', 'r2', 'r3']) await joinCommunity(db, cid, u);
	await setModerator(db, cid, 'mod', true);
});

describe('approval', () => {
	it('approve activates the notice, trusts the member and notifies the author', async () => {
		const s = await createSkill(db, cid, 'new', false, input);
		expect(s.status).toBe('pending');
		await approveSkill(db, s.id);
		const after = await db.query.skills.findFirst({ where: (x, { eq }) => eq(x.id, s.id) });
		expect(after?.status).toBe('active');
		const m = await db.query.memberships.findFirst({
			where: (m, { and, eq }) => and(eq(m.communityId, cid), eq(m.userId, 'new'))
		});
		expect(m?.trustedAt).toBeInstanceOf(Date);
		const n = await db.query.notifications.findFirst({
			where: (n, { and, eq }) => and(eq(n.userId, 'new'), eq(n.kind, 'skill_approved'))
		});
		expect(n).toBeTruthy();
		const next = await createSkill(db, cid, 'new', m!.trustedAt !== null, {
			...input,
			title: 'Second post'
		});
		expect(next.status).toBe('active');
	});

	it('hide notifies the author', async () => {
		const s = await createSkill(db, cid, 'own', true, { ...input, title: 'Hide me' });
		await hideSkill(db, s.id, 'spam');
		const after = await db.query.skills.findFirst({ where: (x, { eq }) => eq(x.id, s.id) });
		expect(after?.status).toBe('hidden');
		const n = await db.query.notifications.findFirst({
			where: (n, { and, eq }) => and(eq(n.userId, 'own'), eq(n.kind, 'skill_hidden'))
		});
		expect(n?.payload).toMatchObject({ reason: 'spam' });
	});
});

describe('flags', () => {
	it('third distinct flag auto-hides and pages the moderators; same reporter twice counts once', async () => {
		const s = await createSkill(db, cid, 'own', true, { ...input, title: 'Flag me' });
		expect((await flagTarget(db, cid, 'r1', 'skill', s.id, 'money')).autoHidden).toBe(false);
		expect((await flagTarget(db, cid, 'r1', 'skill', s.id, 'spam')).count).toBe(1);
		expect((await flagTarget(db, cid, 'r2', 'skill', s.id, 'money')).autoHidden).toBe(false);
		const third = await flagTarget(db, cid, 'r3', 'skill', s.id, 'unsafe', 'asked for my address');
		expect(third).toEqual({ count: 3, autoHidden: true });
		const after = await db.query.skills.findFirst({ where: (x, { eq }) => eq(x.id, s.id) });
		expect(after?.status).toBe('hidden');
		const modNote = await db.query.notifications.findMany({
			where: (n, { and, eq }) => and(eq(n.userId, 'mod'), eq(n.kind, 'mod_flag'))
		});
		expect(modNote.some((n) => (n.payload as { autoHidden?: boolean }).autoHidden)).toBe(true);
	});

	it('authors cannot flag their own notice', async () => {
		const s = await createSkill(db, cid, 'own', true, { ...input, title: 'Own notice' });
		await expect(flagTarget(db, cid, 'own', 'skill', s.id, 'spam')).rejects.toThrow(/own notice/);
	});

	it('open flags group by target with reasons and details; restore dismisses them', async () => {
		const s = await createSkill(db, cid, 'own', true, { ...input, title: 'Grouped' });
		await flagTarget(db, cid, 'r1', 'skill', s.id, 'money', 'charging');
		await flagTarget(db, cid, 'r2', 'skill', s.id, 'spam');
		const groups = await openFlags(db, cid);
		const g = groups.find((g) => g.targetId === s.id)!;
		expect(g.count).toBe(2);
		expect(g.reasons.sort()).toEqual(['money', 'spam']);
		expect(g.details).toEqual(['charging']);
		expect(g.title).toBe('Grouped');
		await restoreSkill(db, s.id);
		expect((await openFlags(db, cid)).find((g) => g.targetId === s.id)).toBeUndefined();
	});

	it('resolve marks flags with who and how', async () => {
		await flagTarget(db, cid, 'r1', 'user', 'new', 'unsafe', 'weird messages');
		await resolveFlags(db, cid, 'user', 'new', 'mod', 'dismissed');
		const f = await db.query.flags.findFirst({
			where: (f, { and, eq }) => and(eq(f.targetType, 'user'), eq(f.targetId, 'new'))
		});
		expect(f?.resolvedBy).toBe('mod');
		expect(f?.resolution).toBe('dismissed');
	});
});
