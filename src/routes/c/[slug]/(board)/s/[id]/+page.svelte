<script lang="ts">
	import { pinFor } from '$lib/utils/rotation';
	let { data, form } = $props();
	const base = $derived(`/c/${data.community.slug}`);
	const ago = (d: Date) => {
		const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
		return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
	};
	const monthYear = (d: Date) =>
		new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
	let flagging = $state(false);
</script>

<svelte:head><title>{data.skill.title} — {data.community.name}</title></svelte:head>

<p class="on-cork muted crumb"><a href={base}>{data.community.name}</a> › Board › Notice</p>
<div class="detail">
	<div>
		<article class="card card--{data.skill.kind} big-card" style="--rot:-0.8deg">
			{#if data.skill.kind === 'offer'}<span class="pin {pinFor(data.skill.id)}" aria-hidden="true"
				></span>{:else}<span class="tape tape--top" aria-hidden="true"></span>{/if}
			<div class="row" style="justify-content:space-between">
				<span class="stamp {data.skill.kind === 'want' ? 'stamp--blue' : ''}"
					>{data.skill.kind} · {data.skill.categoryName}</span
				>
				<span class="hand" style="font-size:1.2rem">pinned {ago(data.skill.createdAt)}</span>
			</div>
			{#if data.skill.status !== 'active'}<span
					class="sticker sticker--sm sticker--corner {data.skill.status === 'hidden'
						? 'sticker--red'
						: ''}">{data.skill.status}</span
				>{/if}
			<h2 class="card__title">{data.skill.title}</h2>
			<p class="card__desc">{data.skill.description}</p>
			<dl class="facts">
				<div>
					<dt>{data.skill.kind === 'offer' ? 'Teaches up to' : 'Current level'}</dt>
					<dd>{data.skill.level}</dd>
				</div>
				<div>
					<dt>Format</dt>
					<dd>{data.skill.format}</dd>
				</div>
				<div>
					<dt>Availability</dt>
					<dd>{data.skill.availability ?? 'Ask'}</dd>
				</div>
			</dl>
			<div class="owner">
				{#if data.owner.avatarUrl}<img
						class="avatar big"
						src={data.owner.avatarUrl}
						alt=""
						width="40"
						height="40"
					/>{:else}<span class="avatar big">{data.owner.name.slice(0, 1)}</span>{/if}
				<div>
					<b>{data.isMine ? 'You' : data.owner.name}</b><br /><span class="muted"
						>Member since {monthYear(data.owner.since)} · {data.owner.swaps} swaps completed ·
						<a href={`/u/${data.owner.id}`}>Profile</a></span
					>
				</div>
			</div>
			{#if data.isMine}
				<div class="owner-actions">
					<a class="btn btn--sm btn--paper" href={`${base}/s/${data.skill.id}/edit`}
						>Edit, pause or renew</a
					>
				</div>
			{/if}
		</article>

		{#if !data.isMine && data.isMember}
			<div class="flag-row">
				{#if form?.flag?.done}
					<span class="hand" style="color:#fff"
						>Flagged. {form.flag.autoHidden
							? 'It has been hidden until a moderator looks.'
							: 'A moderator will take a look.'}</span
					>
				{:else}
					<span class="flag"
						>Something wrong with this notice? <button
							class="linkbtn"
							type="button"
							onclick={() => (flagging = !flagging)}>Flag it</button
						></span
					>
					{#if flagging}
						<form method="POST" action="?/flag" class="paper flag-form">
							<div class="field">
								<span class="label">Why?</span>
								<div class="checks">
									{#each data.flagReasons as r (r.id)}<label
											><input type="radio" name="reason" value={r.id} checked={r.id === 'money'} />
											{r.label}</label
										>{/each}
								</div>
							</div>
							<div class="field">
								<label class="label" for="detail">Anything else?</label><input
									class="input"
									id="detail"
									name="detail"
									maxlength="300"
								/>
							</div>
							{#if form?.flag?.error}<p class="error">{form.flag.error}</p>{/if}
							<button class="btn btn--sm btn--red" type="submit">Send flag</button>
						</form>
					{/if}
				{/if}
			</div>
		{/if}

		{#if data.others.length}
			<section class="others">
				<h3>{data.isMine ? 'You' : data.owner.name} also pinned</h3>
				<div class="board">
					{#each data.others as s (s.id)}
						<a
							class="card card--{s.kind}"
							style="--rot:{s.id.charCodeAt(1) % 2 ? '1.5deg' : '-1deg'}"
							href={`${base}/s/${s.id}`}
						>
							{#if s.kind === 'offer'}<span class="pin {pinFor(s.id)}" aria-hidden="true"
								></span>{:else}<span class="tape tape--tl" aria-hidden="true"></span>{/if}
							<span class="stamp {s.kind === 'want' ? 'stamp--blue' : ''}"
								>{s.kind} · {s.categoryName}</span
							>
							<span class="card__title">{s.title}</span>
							<span class="card__meta"><span>{s.availability ?? ''}</span></span>
						</a>
					{/each}
				</div>
			</section>
		{/if}
	</div>

	<aside class="request">
		{#if data.isMine}
			<div class="index-card index-card--plain">
				<h3>This is your notice</h3>
				<p class="muted">
					Requests from neighbours land in your <a href="/inbox">inbox</a>. Keep it fresh: notices
					expire after 90 days.
				</p>
			</div>
		{:else if !data.isMember}
			<div class="index-card index-card--plain">
				<h3>Like the look of this?</h3>
				<p class="muted">Join the board to ask {data.owner.name} for a swap.</p>
				<a class="btn" style="margin-top: var(--s-3)" href={`${base}/join`}>Join the board</a>
			</div>
		{:else}
			<div class="index-card index-card--plain">
				<h3>Ask {data.owner.name} for a swap</h3>
				<p class="muted">Swap requests open in the next milestone.</p>
				<a class="btn" style="margin-top: var(--s-3)" href={`${base}/s/${data.skill.id}/request`}
					>Request swap</a
				>
			</div>
		{/if}
	</aside>
</div>

<style>
	.crumb {
		margin-bottom: var(--s-3);
	}
	.crumb a {
		color: #fff;
	}
	.detail {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
		gap: var(--s-7);
		align-items: start;
	}
	.big-card {
		padding: var(--s-6) var(--s-6) var(--s-5);
	}
	.big-card .card__title {
		font-size: var(--fs-6);
	}
	.big-card .card__desc {
		font-size: var(--fs-2);
		color: var(--ink-soft);
		margin-top: var(--s-3);
		white-space: pre-line;
	}
	.facts {
		display: grid;
		grid-template-columns: repeat(3, auto);
		gap: var(--s-4);
		margin: var(--s-4) 0 0;
		font-size: var(--fs-1);
	}
	.facts dt {
		color: var(--pencil);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.facts dd {
		margin: 0;
		font-weight: 600;
	}
	.owner {
		display: flex;
		gap: var(--s-3);
		align-items: center;
		margin-top: var(--s-5);
		padding-top: var(--s-4);
		border-top: 1.5px dashed var(--pencil-light);
	}
	.avatar.big {
		width: 40px;
		height: 40px;
		font-size: 15px;
		object-fit: cover;
	}
	.owner-actions {
		margin-top: var(--s-3);
	}
	.flag-row {
		margin-top: var(--s-3);
	}
	.flag {
		font-size: 13px;
		color: rgba(255, 255, 255, 0.85);
	}
	.linkbtn {
		background: none;
		border: 0;
		padding: 0;
		font: inherit;
		color: #fff;
		text-decoration: underline;
		cursor: pointer;
	}
	.flag-form {
		margin-top: var(--s-3);
		max-width: 420px;
	}
	.others {
		margin-top: var(--s-6);
	}
	.others h3 {
		color: var(--paper);
		margin-bottom: var(--s-3);
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
	}
	.others .board {
		grid-template-columns: 1fr 1fr;
		padding: var(--s-3) 0;
	}
	.request .index-card {
		--rot: 0.6deg;
		transform: rotate(var(--rot));
	}
	.request h3 {
		margin-bottom: var(--s-2);
	}
	@media (max-width: 760px) {
		.detail {
			grid-template-columns: 1fr;
		}
		.big-card .card__title {
			font-size: var(--fs-5);
		}
		.facts {
			grid-template-columns: 1fr;
		}
	}
</style>
