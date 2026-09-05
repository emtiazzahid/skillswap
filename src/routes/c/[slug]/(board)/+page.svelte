<script lang="ts">
	import SkillCard from '$lib/components/SkillCard.svelte';
	let { data } = $props();
	const base = $derived(`/c/${data.community.slug}`);
	const withParams = (patch: Record<string, string | null>) => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- plain URL building, not state
		const p = new URLSearchParams();
		p.set('kind', data.kind);
		for (const c of data.selectedCategories) p.append('cat', c);
		if (data.format !== 'any') p.set('format', data.format);
		if (data.q) p.set('q', data.q);
		for (const [k, v] of Object.entries(patch)) {
			if (v === null) p.delete(k);
			else p.set(k, v);
		}
		return `${base}?${p.toString()}`;
	};
</script>

<div class="grid-sidebar">
	<aside class="clipboard filters" aria-label="Filters">
		<form class="clipboard__paper" method="GET" action={base}>
			<h3>Show me</h3>
			<div class="seg" role="tablist" style="width:100%; margin-bottom: var(--s-4)">
				<a
					role="tab"
					aria-selected={data.kind === 'offer'}
					href={withParams({ kind: 'offer', after: null })}
					style="flex:1; text-align:center">Offers</a
				>
				<a
					role="tab"
					aria-selected={data.kind === 'want'}
					href={withParams({ kind: 'want', after: null })}
					style="flex:1; text-align:center">Wants</a
				>
			</div>
			<input type="hidden" name="kind" value={data.kind} />
			<h3>Category</h3>
			<div class="checks" style="margin-bottom: var(--s-4)">
				{#each data.categories as c (c.id)}
					<label
						><input
							type="checkbox"
							name="cat"
							value={c.id}
							checked={data.selectedCategories.includes(c.id)}
						/>
						{c.name}</label
					>
				{/each}
			</div>
			<h3>Format</h3>
			<div class="checks" style="margin-bottom: var(--s-4)">
				<label
					><input type="radio" name="format" value="" checked={data.format === 'any'} /> Any</label
				>
				<label
					><input
						type="radio"
						name="format"
						value="in_person"
						checked={data.format === 'in_person'}
					/> In person</label
				>
				<label
					><input type="radio" name="format" value="online" checked={data.format === 'online'} /> Online</label
				>
			</div>
			{#if data.q}<input type="hidden" name="q" value={data.q} />{/if}
			<div class="row">
				<button class="btn btn--sm" type="submit">Apply</button><a
					class="clear"
					href={`${base}?kind=${data.kind}`}>Clear</a
				>
			</div>
		</form>
	</aside>

	<section>
		<form class="toolbar" method="GET" action={base}>
			<input type="hidden" name="kind" value={data.kind} />
			{#each data.selectedCategories as c (c)}<input type="hidden" name="cat" value={c} />{/each}
			{#if data.format !== 'any'}<input type="hidden" name="format" value={data.format} />{/if}
			<label class="search"
				><span aria-hidden="true">⌕</span><input
					type="search"
					name="q"
					value={data.q}
					placeholder="Search notices… try “guitar”"
					aria-label="Search notices"
				/></label
			>
			<span class="count">{data.total} {data.kind}{data.total === 1 ? '' : 's'} pinned</span>
		</form>

		{#if data.flagged}
			<div class="pending-banner">
				<span class="sticker sticker--sm sticker--red">Flagged</span><span
					>Thanks. That notice has been hidden until a moderator looks at it.</span
				>
			</div>
		{/if}
		{#if data.pendingMine.length}
			<div class="pending-banner">
				<span class="sticker sticker--sm">Pending</span><span
					>Your notice <b>“{data.pendingMine[0]}”</b> is waiting for a moderator. After one approval,
					your notices go straight up.</span
				>
			</div>
		{/if}

		{#if data.cards.length}
			<div class="board">
				{#each data.cards as card, i (card.id)}
					<SkillCard
						{card}
						href={`${base}/s/${card.id}`}
						tall={card.description.length > 120 && i % 5 === 2}
					/>
				{/each}
			</div>
			{#if data.nextCursor}
				<div class="pager">
					<a class="btn btn--paper btn--sm" href={withParams({ after: data.nextCursor })}
						>Older notices →</a
					>
				</div>
			{/if}
		{:else}
			<div class="empty">
				<span class="hand"
					>{data.q || data.selectedCategories.length
						? 'Nothing matches those filters.'
						: `No ${data.kind}s pinned yet. Be first.`}</span
				>
				{#if data.isMember}<p style="margin-top: var(--s-3)">
						<a class="btn btn--paper" href={`${base}/post?kind=${data.kind}`}
							>Pin the first {data.kind}</a
						>
					</p>{/if}
			</div>
		{/if}
	</section>
</div>

<style>
	.filters h3 {
		font-size: var(--fs-2);
		margin-bottom: var(--s-2);
	}
	.clear {
		font-size: 13px;
	}
	.seg a {
		text-decoration: none;
	}
	.toolbar {
		display: flex;
		align-items: center;
		gap: var(--s-3);
		flex-wrap: wrap;
		margin-bottom: var(--s-2);
	}
	.search {
		flex: 1;
		min-width: 200px;
		display: flex;
		align-items: center;
		gap: var(--s-2);
		background: var(--paper);
		padding: 0.5em 0.8em;
		box-shadow: var(--lift-paper);
		border-radius: 2px;
	}
	.search input {
		border: 0;
		background: transparent;
		font: inherit;
		width: 100%;
		color: var(--ink);
	}
	.search input:focus {
		outline: none;
	}
	.count {
		color: var(--paper);
		font-family: var(--font-hand);
		font-size: 1.4rem;
	}
	.pending-banner {
		display: flex;
		gap: var(--s-3);
		align-items: center;
		background: var(--sticky);
		padding: var(--s-3) var(--s-4);
		box-shadow: var(--lift-paper);
		transform: rotate(0.4deg);
		margin: var(--s-3) 0 var(--s-4);
		font-size: var(--fs-1);
	}
	.pager {
		display: flex;
		justify-content: center;
		gap: var(--s-3);
	}
</style>
