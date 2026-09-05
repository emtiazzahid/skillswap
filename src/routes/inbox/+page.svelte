<script lang="ts">
	let { data, form } = $props();
	let tab = $state<'received' | 'sent' | 'done'>('received');
	let confirming = $state<string | null>(null);
	const ago = (d: Date) => {
		const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
		return h < 1
			? 'just now'
			: h < 24
				? `${h} hours ago`
				: Math.floor(h / 24) === 1
					? 'yesterday'
					: `${Math.floor(h / 24)} days ago`;
	};
	const list = $derived(
		tab === 'received' ? data.received : tab === 'sent' ? data.sent : data.done
	);
	const noteText = (n: (typeof data.notes)[number]) => {
		const t = String(n.payload.title ?? '');
		switch (n.kind) {
			case 'skill_approved':
				return `Your notice “${t}” was approved. You're trusted on that board now.`;
			case 'skill_hidden':
				return `Your notice “${t}” was hidden by a moderator.`;
			case 'skill_expiring':
				return `“${t}” expires in about 10 days. Renew it from the notice page.`;
			case 'skill_expired':
				return `“${t}” expired. Renew it if it's still true.`;
			case 'mod_pending':
				return `New notice waiting for approval: “${t}”.`;
			case 'mod_flag':
				return `A ${n.payload.targetType === 'user' ? 'profile' : 'notice'} was flagged${n.payload.autoHidden ? ' and auto-hidden' : ''}.`;
			case 'swap_requested':
				return `${n.actor ?? 'Someone'} asked you for a swap on “${t}”.`;
			case 'swap_accepted':
				return `${n.actor ?? 'They'} accepted your swap. Contact details are unlocked.`;
			case 'swap_declined':
				return `${n.actor ?? 'They'} declined your request.`;
			case 'swap_completed':
				return `${n.actor ?? 'They'} marked a swap as done. Leave a thank-you note!`;
			case 'swap_cancelled':
				return `${n.actor ?? 'They'} cancelled a swap.`;
			case 'thanks_received':
				return `${n.actor ?? 'Someone'} stuck a thank-you note on your profile.`;
			default:
				return n.kind;
		}
	};
</script>

<svelte:head><title>Inbox — SkillSwap</title></svelte:head>

<main class="container page">
	<div class="page-head">
		<div class="grow">
			<h1 class="on-cork">Inbox</h1>
			<span class="hand" style="color:var(--highlighter);font-size:1.5rem"
				>{data.received.filter((i) => i.status === 'pending').length} envelopes waiting for you</span
			>
		</div>
		<div class="seg tabs" role="tablist">
			<button
				type="button"
				role="tab"
				aria-selected={tab === 'received'}
				onclick={() => (tab = 'received')}
				>Received {#if data.received.length}<span class="chip red">{data.received.length}</span
					>{/if}</button
			>
			<button type="button" role="tab" aria-selected={tab === 'sent'} onclick={() => (tab = 'sent')}
				>Sent {#if data.sent.length}<span class="chip">{data.sent.length}</span>{/if}</button
			>
			<button type="button" role="tab" aria-selected={tab === 'done'} onclick={() => (tab = 'done')}
				>Done</button
			>
		</div>
	</div>

	{#if data.justSent}<div class="sent-note">
			<span class="sticker sticker--sm sticker--green">Sent</span> Your request is on its way. You'll
			see it under “Sent”.
		</div>{/if}
	{#if form?.message}<p class="error on-cork" style="color:var(--highlighter)">
			{form.message}
		</p>{/if}

	<div class="inbox">
		<div class="list" role="tabpanel">
			{#if !list.length}<div class="empty"><span class="hand">Nothing here yet.</span></div>{/if}
			{#each list as it (it.id)}
				<article
					class="envelope {it.status === 'pending' && it.direction === 'received'
						? 'envelope--unread'
						: ''}"
					data-status={it.status}
				>
					<span
						class="sticker sticker--sm {it.status === 'accepted'
							? 'sticker--green'
							: it.status === 'declined' || it.status === 'cancelled'
								? 'sticker--red'
								: ''}"
						>{it.status === 'pending' && it.direction === 'received' ? 'New' : it.status}</span
					>
					<div class="from">
						{#if it.other.avatarUrl}<img
								class="avatar"
								src={it.other.avatarUrl}
								alt=""
								width="26"
								height="26"
							/>{:else}<span class="avatar">{it.other.name.slice(0, 1)}</span>{/if}
						<b>{it.other.name}</b>
						· {ago(it.createdAt)} · <a href={`/c/${it.community.slug}`}>{it.community.name}</a>
					</div>
					<h2 class="envelope__title">
						{#if it.direction === 'received'}
							{#if it.target?.kind === 'want'}Offers to help with {it.target.title}{:else}Wants to
								swap for {it.target?.title ?? 'a notice'}{/if}
						{:else}
							{#if it.target?.kind === 'want'}You offered to help with {it.target.title}{:else}You
								asked for {it.target?.title ?? 'a notice'}{/if}
						{/if}
					</h2>
					<p class="swap-line">
						{#if it.offer}{it.direction === 'received' ? `${it.other.name} offers` : 'You offer'}
							<b>{it.offer.title}</b> in return.{:else}{it.direction === 'received'
								? it.other.name
								: 'You'} chose “just asking”.{/if}
						{#if it.declineReason}<br />Declined: “{it.declineReason}”{/if}
					</p>
					{#if it.note}<p class="note-q">“{it.note}”</p>{/if}

					{#if data.contacts[it.id]}
						{@const c = data.contacts[it.id]}
						<div class="contacts">
							<div>
								<div class="who">{it.other.name.split(' ')[0]}'s contact</div>
								<span class="slip">{c.theirsLabel ?? 'Contact'} · {c.theirs ?? 'not set yet'}</span>
							</div>
							<div>
								<div class="who">What {it.other.name.split(' ')[0]} sees of you</div>
								<span class="slip"
									>{c.mineLabel ?? 'Contact'} · {c.mine ?? 'not set, add one in settings'}</span
								>
							</div>
						</div>
					{/if}

					<div class="envelope__actions">
						{#if it.status === 'pending' && it.direction === 'received'}
							{#if !data.acceptedBefore && confirming !== it.id}
								<button
									class="btn btn--green btn--sm"
									type="button"
									onclick={() => (confirming = it.id)}>Accept</button
								>
							{:else}
								<form method="POST" action="?/accept">
									<input type="hidden" name="swapId" value={it.id} /><button
										class="btn btn--green btn--sm"
										type="submit">{confirming === it.id ? 'Yes, accept' : 'Accept'}</button
									>
								</form>
							{/if}
							<form method="POST" action="?/decline" class="row" style="gap: var(--s-2)">
								<input type="hidden" name="swapId" value={it.id} /><input
									class="input"
									name="reason"
									placeholder="reason (optional)"
									maxlength="200"
									style="max-width: 200px; padding: 0.35em 0.5em"
									aria-label="Decline reason"
								/><button class="btn btn--ghost btn--sm" type="submit">Decline</button>
							</form>
							<a class="btn btn--ghost btn--sm" href={`/u/${it.other.id}`}
								>See {it.other.name.split(' ')[0]}'s profile</a
							>
						{:else if it.status === 'pending'}
							<form method="POST" action="?/cancel">
								<input type="hidden" name="swapId" value={it.id} /><button
									class="btn btn--ghost btn--sm"
									type="submit">Cancel request</button
								>
							</form>
						{:else if it.status === 'accepted'}
							<form method="POST" action="?/complete">
								<input type="hidden" name="swapId" value={it.id} /><button
									class="btn btn--sm"
									type="submit">Mark as done</button
								>
							</form>
							<form method="POST" action="?/cancel">
								<input type="hidden" name="swapId" value={it.id} /><button
									class="btn btn--ghost btn--sm"
									type="submit">Cancel swap</button
								>
							</form>
						{:else if it.status === 'completed' && !it.myThanks}
							<form method="POST" action="?/thanks" class="thanks">
								<input type="hidden" name="swapId" value={it.id} /><label
									class="label"
									for={`t-${it.id}`}>Leave {it.other.name.split(' ')[0]} a thank-you note</label
								><textarea
									class="textarea"
									id={`t-${it.id}`}
									name="text"
									maxlength="200"
									placeholder="One line. It goes on their profile as a sticky note."
								></textarea><button class="btn btn--sm" type="submit">Pin note</button>
							</form>
						{:else if it.status === 'completed'}
							<span class="hand" style="color:var(--green-pen)">note pinned ✓</span>
						{/if}
					</div>
					{#if confirming === it.id && !data.acceptedBefore}
						<div class="safety">
							<h3>Before you accept</h3>
							<ul>
								<li>Do the first session online or somewhere public.</li>
								<li>Don't share your home address in the first message.</li>
								<li>Money changing hands? Flag it. That's not what this board is for.</li>
							</ul>
						</div>
					{/if}
				</article>
			{/each}
		</div>

		<aside class="stack">
			<section class="paper notes">
				<h2>
					Notes <span class="hand" style="font-size:1.1rem"
						>{data.unread ? `${data.unread} new` : 'all read'}</span
					>
				</h2>
				{#if !data.notes.length}<p class="muted">Nothing yet.</p>{/if}
				<ul>
					{#each data.notes as n (n.id)}<li class:new={!n.read}>
							<span>{noteText(n)}</span><span class="muted">{ago(n.createdAt)}</span>
						</li>{/each}
				</ul>
			</section>
		</aside>
	</div>
</main>

<style>
	h1 {
		color: var(--paper);
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
	}
	.tabs button {
		display: inline-flex;
		gap: 0.4em;
		align-items: center;
	}
	.chip.red {
		background: var(--red-pen);
		color: #fff;
		padding: 1px 6px;
	}
	.sent-note {
		display: flex;
		gap: var(--s-3);
		align-items: center;
		background: var(--sticky-2);
		padding: var(--s-3) var(--s-4);
		box-shadow: var(--lift-paper);
		margin-bottom: var(--s-4);
		font-size: var(--fs-1);
	}
	.inbox {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 360px;
		gap: var(--s-6);
		align-items: start;
		margin-top: var(--s-2);
	}
	.list {
		display: grid;
		gap: var(--s-4);
	}
	.envelope .sticker {
		position: absolute;
		right: -10px;
		top: -14px;
	}
	.from {
		display: flex;
		gap: var(--s-2);
		align-items: center;
		font-size: var(--fs-1);
		color: var(--pencil);
		flex-wrap: wrap;
	}
	.from img.avatar {
		object-fit: cover;
	}
	.swap-line {
		font-size: var(--fs-1);
		color: var(--ink-soft);
	}
	.note-q {
		font-family: var(--font-hand);
		font-size: 1.25rem;
		line-height: 1.1;
		color: var(--ink-soft);
		background: rgba(255, 255, 255, 0.6);
		padding: var(--s-2) var(--s-3);
		border-left: 3px solid var(--tape);
	}
	.contacts {
		display: grid;
		gap: var(--s-3);
		margin-top: var(--s-2);
	}
	.contacts .who {
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--pencil);
		margin-bottom: 4px;
	}
	.thanks {
		display: grid;
		gap: var(--s-2);
		width: 100%;
	}
	.safety {
		margin-top: var(--s-3);
		background: var(--sticky-2);
		padding: var(--s-3) var(--s-4);
		box-shadow: var(--lift-paper);
		transform: rotate(0.6deg);
		font-size: var(--fs-1);
	}
	.safety h3 {
		font-size: var(--fs-3);
		margin-bottom: var(--s-1);
	}
	.safety ul {
		margin: 0;
		padding-left: 1.2em;
	}
	.notes h2 {
		font-size: var(--fs-4);
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--s-3);
	}
	.notes ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: var(--s-2);
		font-size: var(--fs-1);
	}
	.notes li {
		display: grid;
		gap: 2px;
		padding-bottom: var(--s-2);
		border-bottom: 1px dashed var(--lined-rule);
	}
	.notes li.new {
		border-left: 3px solid var(--red-pen);
		padding-left: var(--s-2);
	}
	@media (max-width: 900px) {
		.inbox {
			grid-template-columns: 1fr;
		}
	}
</style>
