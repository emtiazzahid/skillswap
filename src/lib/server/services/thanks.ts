import { and, eq } from 'drizzle-orm';
import { schema, type Db } from '../db';
import { newId } from '../ids';
import { notify } from './notifications';

export class ThanksError extends Error {}
export const THANKS_MAX = 200;

/** One thank-you note per person per completed swap, addressed to the other party. */
export async function leaveThanks(db: Db, swapId: string, fromUserId: string, text: string) {
	const s = await db.query.swapRequests.findFirst({ where: eq(schema.swapRequests.id, swapId) });
	if (!s) throw new ThanksError('Swap not found.');
	if (s.fromUserId !== fromUserId && s.toUserId !== fromUserId)
		throw new ThanksError('Not your swap.');
	if (s.status !== 'completed')
		throw new ThanksError('You can thank someone once the swap is marked done.');
	const t = text.trim();
	if (t.length < 2) throw new ThanksError('Write at least a couple of words.');
	if (t.length > THANKS_MAX) throw new ThanksError(`Keep it under ${THANKS_MAX} characters.`);
	const existing = await db.query.thanks.findFirst({
		where: and(eq(schema.thanks.swapRequestId, swapId), eq(schema.thanks.fromUserId, fromUserId))
	});
	if (existing) throw new ThanksError('You already left a note for this swap.');
	const from = await db.query.users.findFirst({ where: eq(schema.users.id, fromUserId) });
	const toUserId = s.fromUserId === fromUserId ? s.toUserId : s.fromUserId;
	const id = newId();
	await db.insert(schema.thanks).values({
		id,
		swapRequestId: swapId,
		fromUserId,
		fromName: from?.displayName ?? 'Member',
		toUserId,
		text: t
	});
	await notify(db, toUserId, 'thanks_received', { swapId, thanksId: id, fromUserId });
	return id;
}
