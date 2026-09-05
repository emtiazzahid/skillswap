import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ctx } from '$lib/server/context';
import { requireUser } from '$lib/server/guards';
import {
	SwapError,
	acceptSwap,
	cancelSwap,
	completeSwap,
	declineSwap,
	hasAcceptedBefore,
	listInbox,
	revealContacts
} from '$lib/server/services/swaps';
import { ThanksError, leaveThanks } from '$lib/server/services/thanks';
import { listNotifications, markAllRead } from '$lib/server/services/notifications';
import { decryptContact } from '$lib/server/auth/crypto';
import { publicName } from '$lib/server/services/users';
import { schema } from '$lib/server/db';
import { inArray } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const { db, env } = ctx(event);
	event.setHeaders({ 'cache-control': 'no-store' });
	const [items, notes, acceptedBefore] = await Promise.all([
		listInbox(db, user.id),
		listNotifications(db, user.id, 30),
		hasAcceptedBefore(db, user.id)
	]);
	const contacts: Record<
		string,
		{
			mine: string | null;
			mineLabel: string | null;
			theirs: string | null;
			theirsLabel: string | null;
		}
	> = {};
	if (env.CONTACT_KEY) {
		for (const it of items.filter((i) => i.status === 'accepted' || i.status === 'completed')) {
			try {
				const r = await revealContacts(db, it.id, user.id);
				contacts[it.id] = {
					mine: r.mine ? await decryptContact(env.CONTACT_KEY, r.mine.valueEncrypted) : null,
					mineLabel: r.mine?.label ?? null,
					theirs: r.theirs ? await decryptContact(env.CONTACT_KEY, r.theirs.valueEncrypted) : null,
					theirsLabel: r.theirs?.label ?? null
				};
			} catch {
				/* not revealable */
			}
		}
	}
	const actorIds = [
		...new Set(
			notes
				.map(
					(n) =>
						(n.payload as { fromUserId?: string; actorId?: string }).fromUserId ??
						(n.payload as { actorId?: string }).actorId
				)
				.filter((x): x is string => !!x)
		)
	];
	const actors = actorIds.length
		? await db.query.users.findMany({ where: inArray(schema.users.id, actorIds) })
		: [];
	const names = new Map(actors.map((a) => [a.id, publicName(a.displayName)]));
	const unread = notes.filter((n) => !n.readAt).length;
	await markAllRead(db, user.id);
	return {
		received: items.filter(
			(i) => i.direction === 'received' && (i.status === 'pending' || i.status === 'accepted')
		),
		sent: items.filter(
			(i) => i.direction === 'sent' && (i.status === 'pending' || i.status === 'accepted')
		),
		done: items.filter(
			(i) => i.status === 'completed' || i.status === 'declined' || i.status === 'cancelled'
		),
		contacts,
		acceptedBefore,
		justSent: event.url.searchParams.get('sent') === '1',
		unread,
		notes: notes.map((n) => ({
			id: n.id,
			kind: n.kind,
			createdAt: n.createdAt,
			read: !!n.readAt,
			payload: n.payload as Record<string, string | number | boolean | null>,
			actor:
				names.get(
					String(
						(n.payload as { fromUserId?: string; actorId?: string }).fromUserId ??
							(n.payload as { actorId?: string }).actorId ??
							''
					)
				) ?? null
		}))
	};
};

async function act(
	event: Parameters<Actions[string]>[0],
	fn: (db: ReturnType<typeof ctx>['db'], userId: string, form: FormData) => Promise<void>
) {
	const user = requireUser(event);
	const { db } = ctx(event);
	try {
		await fn(db, user.id, await event.request.formData());
	} catch (e) {
		if (e instanceof SwapError || e instanceof ThanksError)
			return fail(400, { message: e.message });
		throw e;
	}
	return { ok: true };
}

export const actions: Actions = {
	accept: (e) =>
		act(e, async (db, me, f) => {
			await acceptSwap(db, String(f.get('swapId')), me);
		}),
	decline: (e) =>
		act(e, async (db, me, f) => {
			await declineSwap(db, String(f.get('swapId')), me, String(f.get('reason') ?? ''));
		}),
	cancel: (e) =>
		act(e, async (db, me, f) => {
			await cancelSwap(db, String(f.get('swapId')), me);
		}),
	complete: (e) =>
		act(e, async (db, me, f) => {
			await completeSwap(db, String(f.get('swapId')), me);
		}),
	thanks: (e) =>
		act(e, async (db, me, f) => {
			await leaveThanks(db, String(f.get('swapId')), me, String(f.get('text') ?? ''));
		})
};
