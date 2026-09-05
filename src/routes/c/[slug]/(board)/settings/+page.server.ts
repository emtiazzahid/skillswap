import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { loadAccess, requireOwner } from '$lib/server/access';
import {
	CommunityError,
	listMembers,
	softDeleteCommunity,
	transferOwnership,
	updateCommunity
} from '$lib/server/services/communities';
import { createInvite, listActiveInvites, revokeInvite } from '$lib/server/services/invites';

export const load: PageServerLoad = async (event) => {
	const { db } = ctx(event);
	const access = await loadAccess(db, event, event.params.slug);
	requireOwner(access);
	const [invites, members] = await Promise.all([
		listActiveInvites(db, access.community.id),
		listMembers(db, access.community.id)
	]);
	return {
		invites: invites.map((i) => ({
			id: i.id,
			usedCount: i.usedCount,
			maxUses: i.maxUses,
			expiresAt: i.expiresAt
		})),
		moderators: members
			.filter((m) => m.role === 'moderator' && !m.bannedAt)
			.map((m) => ({ userId: m.userId, name: m.displayName })),
		newInviteUrl: null as string | null
	};
};

export const actions: Actions = {
	update: async (event) => {
		const { db } = ctx(event);
		const access = await loadAccess(db, event, event.params.slug);
		requireOwner(access);
		const form = await event.request.formData();
		try {
			await updateCommunity(db, access.community.id, {
				name: String(form.get('name') ?? ''),
				tagline: String(form.get('tagline') ?? ''),
				description: String(form.get('description') ?? ''),
				areaLabel: String(form.get('areaLabel') ?? ''),
				visibility: String(form.get('visibility')) === 'invite' ? 'invite' : 'public'
			});
		} catch (e) {
			if (e instanceof CommunityError)
				return fail(400, { update: { error: e.message, saved: false } });
			throw e;
		}
		return { update: { saved: true, error: null } };
	},
	invite: async (event) => {
		const { db, env } = ctx(event);
		const access = await loadAccess(db, event, event.params.slug);
		const owner = requireOwner(access);
		const form = await event.request.formData();
		const maxUses = Number(form.get('maxUses') ?? 25) || 25;
		const { token } = await createInvite(db, access.community.id, owner.userId, maxUses);
		return { invite: { url: `${env.PUBLIC_ORIGIN}/c/${access.community.slug}/join?t=${token}` } };
	},
	revoke: async (event) => {
		const { db } = ctx(event);
		const access = await loadAccess(db, event, event.params.slug);
		requireOwner(access);
		const form = await event.request.formData();
		await revokeInvite(db, access.community.id, String(form.get('inviteId') ?? ''));
		return { revoked: true };
	},
	transfer: async (event) => {
		const { db } = ctx(event);
		const access = await loadAccess(db, event, event.params.slug);
		const owner = requireOwner(access);
		const form = await event.request.formData();
		try {
			await transferOwnership(
				db,
				access.community.id,
				owner.userId,
				String(form.get('userId') ?? '')
			);
		} catch (e) {
			if (e instanceof CommunityError) return fail(400, { transfer: { error: e.message } });
			throw e;
		}
		redirect(303, `/c/${access.community.slug}`);
	},
	delete: async (event) => {
		const { db } = ctx(event);
		const access = await loadAccess(db, event, event.params.slug);
		requireOwner(access);
		const form = await event.request.formData();
		if (String(form.get('confirm') ?? '') !== access.community.slug)
			return fail(400, { del: { error: 'Type the board slug to confirm.' } });
		await softDeleteCommunity(db, access.community.id);
		redirect(303, '/?boardDeleted=1');
	}
};
