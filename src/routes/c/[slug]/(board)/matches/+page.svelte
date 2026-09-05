<script lang="ts">
	import { pinFor, rotationFor } from '$lib/utils/rotation';
	let { data } = $props();
	const base = $derived(`/c/${data.community.slug}`);
</script>

<div class="page-head">
	<div class="grow">
		<h2 class="on-cork title">Your matches</h2>
		<span class="hand" style="color:var(--highlighter);font-size:1.5rem"
			>{data.matches.length
				? `${data.matches.length} ${data.matches.length === 1 ? 'person wants' : 'people want'} what you know, and know what you want`
				: 'nothing reciprocal yet, pin a want and an offer to get matched'}</span
		>
	</div>
	<a class="btn btn--paper btn--sm" href={base}>← Back to board</a>
</div>

<div class="matches">
	{#each data.matches as m (m.person.userId)}
		<section class="match-row">
			<div class="who">
				{#if m.person.avatarUrl}<img
						class="avatar lg"
						src={m.person.avatarUrl}
						alt=""
						width="36"
						height="36"
					/>{:else}<span class="avatar lg">{m.person.name.slice(0, 1)}</span>{/if}
				<b>{m.person.name}</b><span class="why">{m.why}</span>
				<a class="btn btn--sm" href={`${base}/s/${m.theyTeach.id}/request?offer=${m.iTeach.id}`}
					>Request swap</a
				>
			</div>
			<div class="match">
				<div>
					<div class="col-label">You teach {m.person.name.split(' ')[0]}</div>
					<a
						class="card card--offer"
						style="--rot:{rotationFor(m.iTeach.id)}"
						href={`${base}/s/${m.iTeach.id}`}
					>
						<span class="pin {pinFor(m.iTeach.id)}" aria-hidden="true"></span>
						<span class="stamp">Your offer · {m.iTeach.categoryName}</span>
						<span class="card__title">{m.iTeach.title}</span>
						<span class="card__desc"
							>{m.iTeach.description.slice(0, 90)}{m.iTeach.description.length > 90
								? '…'
								: ''}</span
						>
						<span class="mine">they want: “{m.theyWant.title}”</span>
					</a>
				</div>
				<div class="string" aria-hidden="true"></div>
				<div>
					<div class="col-label">{m.person.name.split(' ')[0]} teaches you</div>
					<a
						class="card card--offer"
						style="--rot:{rotationFor(m.theyTeach.id)}"
						href={`${base}/s/${m.theyTeach.id}`}
					>
						<span class="pin {pinFor(m.theyTeach.id)}" aria-hidden="true"></span>
						<span class="stamp">Their offer · {m.theyTeach.categoryName}</span>
						<span class="card__title">{m.theyTeach.title}</span>
						<span class="card__desc"
							>{m.theyTeach.description.slice(0, 90)}{m.theyTeach.description.length > 90
								? '…'
								: ''}</span
						>
						<span class="mine">you want: “{m.iWant.title}”</span>
					</a>
				</div>
			</div>
		</section>
	{/each}
</div>

<section class="gift">
	<div class="page-head">
		<div class="grow">
			<h2 class="on-cork title" style="font-size: var(--fs-5)">You could just gift these</h2>
			<p class="on-cork muted">
				{data.gifts.length
					? `${data.gifts.length} ${data.gifts.length === 1 ? 'person wants' : 'people want'} what you offer. Nothing reciprocal, but who's counting.`
					: 'Nobody is waiting for what you offer right now.'}
			</p>
		</div>
	</div>
	{#if data.gifts.length}
		<div class="board">
			{#each data.gifts as g (g.person.userId + g.theyWant.id)}
				<div class="card card--want" style="--rot:{rotationFor(g.theyWant.id)}">
					<span class="tape tape--top" aria-hidden="true"></span>
					<span class="stamp stamp--blue">Want · {g.theyWant.categoryName}</span>
					<span class="card__title">{g.theyWant.title}</span>
					<span class="card__meta"
						><span class="card__who"
							><span class="avatar">{g.person.name.slice(0, 1)}</span>{g.person.name}</span
						><span
							>{g.theyWant.format === 'in_person'
								? 'In person'
								: g.theyWant.format === 'online'
									? 'Online'
									: 'Either'}</span
						></span
					>
					<a
						class="btn btn--sm btn--ghost"
						style="align-self:flex-start; margin-top: var(--s-2)"
						href={`${base}/s/${g.theyWant.id}/request?offer=${g.iTeach.id}`}>Offer to help</a
					>
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.title {
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
	}
	.matches {
		display: grid;
		gap: var(--s-6);
		margin-top: var(--s-3);
	}
	.match-row {
		position: relative;
		background: rgba(0, 0, 0, 0.12);
		padding: var(--s-5);
		border-radius: 4px;
	}
	.match-row .match :global(.card) {
		max-width: 340px;
		width: 100%;
		justify-self: center;
	}
	.who {
		display: flex;
		align-items: center;
		gap: var(--s-3);
		margin-bottom: var(--s-3);
		color: var(--paper);
		flex-wrap: wrap;
	}
	.who b {
		font-family: var(--font-display);
		font-size: var(--fs-4);
	}
	.who .btn {
		margin-left: auto;
	}
	.why {
		color: rgba(255, 255, 255, 0.85);
		font-size: var(--fs-1);
	}
	.avatar.lg {
		width: 36px;
		height: 36px;
		font-size: 14px;
		object-fit: cover;
	}
	.mine {
		align-self: flex-start;
		margin-top: var(--s-2);
		background: var(--sticky);
		font-family: var(--font-hand);
		font-size: 1.15rem;
		line-height: 1.1;
		padding: 4px 10px;
		box-shadow: var(--lift-paper);
		color: var(--ink);
		transform: rotate(-1.5deg);
	}
	.col-label {
		color: rgba(255, 255, 255, 0.75);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		text-align: center;
		margin-bottom: var(--s-2);
	}
	.gift {
		margin-top: var(--s-7);
	}
	.gift .board {
		grid-template-columns: repeat(auto-fill, minmax(236px, 1fr));
	}
</style>
