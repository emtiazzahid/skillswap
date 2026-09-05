<script lang="ts">
	let {
		values,
		errors = {},
		categories,
		authorName,
		quota,
		submitLabel = 'Pin it',
		action = ''
	}: {
		values: {
			kind: 'offer' | 'want';
			categoryId: string;
			title: string;
			description: string;
			level: string;
			format: string;
			availability?: string;
		};
		errors?: Record<string, string>;
		categories: { id: string; name: string }[];
		authorName: string;
		quota: { offer: number; want: number; max: number };
		submitLabel?: string;
		action?: string;
	} = $props();

	// svelte-ignore state_referenced_locally
	let kind = $state(values.kind);
	// svelte-ignore state_referenced_locally
	let categoryId = $state(values.categoryId);
	// svelte-ignore state_referenced_locally
	let title = $state(values.title);
	// svelte-ignore state_referenced_locally
	let description = $state(values.description);
	// svelte-ignore state_referenced_locally
	let format = $state(values.format);
	// svelte-ignore state_referenced_locally
	let availability = $state(values.availability ?? '');
	const categoryName = $derived(categories.find((c) => c.id === categoryId)?.name ?? '');
	const formatLabel: Record<string, string> = {
		in_person: 'In person',
		online: 'Online',
		either: 'Either'
	};
	const used = $derived(kind === 'offer' ? quota.offer : quota.want);
</script>

<div class="post">
	<form method="POST" {action} class="index-card">
		<div class="field">
			<span class="label">This is an…</span>
			<div class="seg" role="radiogroup" aria-label="Notice type">
				<label class:selected={kind === 'offer'}
					><input type="radio" name="kind" value="offer" bind:group={kind} class="sr-only" />Offer —
					I can teach</label
				>
				<label class:selected={kind === 'want'}
					><input type="radio" name="kind" value="want" bind:group={kind} class="sr-only" />Want —
					I'd like to learn</label
				>
			</div>
			{#if errors.kind}<span class="error">{errors.kind}</span>{/if}
		</div>
		<div class="quota">
			<span class="dots" aria-hidden="true"
				>{#each Array(quota.max) as _, i (i)}<i class:on={i < used}></i>{/each}</span
			>
			{used} of {quota.max}
			{kind}s used on this board
		</div>
		<div class="field">
			<label class="label" for="title">Title</label>
			<input
				class="input"
				id="title"
				name="title"
				bind:value={title}
				maxlength="80"
				required
				aria-invalid={errors.title ? 'true' : undefined}
			/>
			<span class="hint"
				>Say it like you'd say it to a neighbour. “Fix a leaky tap” beats “Plumbing fundamentals”.</span
			>
			{#if errors.title}<span class="error">{errors.title}</span>{/if}
		</div>
		<div class="grid-fields">
			<div class="field">
				<label class="label" for="categoryId">Category</label>
				<select class="select" id="categoryId" name="categoryId" bind:value={categoryId}>
					{#each categories as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
				</select>
				{#if errors.categoryId}<span class="error">{errors.categoryId}</span>{/if}
			</div>
			<div class="field">
				<span class="label">{kind === 'offer' ? 'I can teach up to' : 'I am currently'}</span>
				<div class="radio-row">
					<label
						><input
							type="radio"
							name="level"
							value="beginner"
							checked={values.level === 'beginner'}
						/>Beginner</label
					>
					<label
						><input
							type="radio"
							name="level"
							value="intermediate"
							checked={values.level === 'intermediate'}
						/>Intermediate</label
					>
					<label
						><input
							type="radio"
							name="level"
							value="advanced"
							checked={values.level === 'advanced'}
						/>Advanced</label
					>
				</div>
			</div>
		</div>
		<div class="field">
			<label class="label" for="description"
				>{kind === 'offer' ? "What you'll actually do" : "What you're hoping to learn"}</label
			>
			<textarea
				class="textarea"
				id="description"
				name="description"
				bind:value={description}
				maxlength="600"
				required></textarea>
			<span class="counter">{description.length} / 600</span>
			{#if errors.description}<span class="error">{errors.description}</span>{/if}
		</div>
		<div class="grid-fields">
			<div class="field">
				<span class="label">Format</span>
				<div class="radio-row">
					<label
						><input type="radio" name="format" value="in_person" bind:group={format} />In person</label
					>
					<label
						><input type="radio" name="format" value="online" bind:group={format} />Online</label
					>
					<label
						><input type="radio" name="format" value="either" bind:group={format} />Either</label
					>
				</div>
			</div>
			<div class="field">
				<label class="label" for="availability">When you're usually free</label>
				<input
					class="input"
					id="availability"
					name="availability"
					bind:value={availability}
					maxlength="140"
					placeholder="Weekday evenings after 8"
				/>
				{#if errors.availability}<span class="error">{errors.availability}</span>{/if}
			</div>
		</div>
		<div class="row" style="justify-content: space-between">
			<button class="btn" type="submit">{submitLabel}</button>
			<span class="muted">Notices stay up 90 days. You can renew.</span>
		</div>
	</form>

	<aside class="preview" aria-label="Live preview">
		<h2>How it'll look on the board</h2>
		<div class="card card--{kind}" style="--rot: 2deg">
			{#if kind === 'offer'}<span class="pin pin--green" aria-hidden="true"></span>{:else}<span
					class="tape tape--top"
					aria-hidden="true"
				></span>{/if}
			<span class="stamp {kind === 'want' ? 'stamp--blue' : ''}">{kind} · {categoryName}</span>
			<span class="card__title">{title || 'Your title here'}</span>
			<span class="card__desc"
				>{description || 'A sentence or two about what you will actually do.'}</span
			>
			{#if availability}<span class="hand" style="font-size:1.15rem">{availability}</span>{/if}
			<span class="card__meta"
				><span class="card__who"
					><span class="avatar">{authorName.slice(0, 1)}</span>{authorName}</span
				><span>{formatLabel[format]}</span></span
			>
		</div>
		<span
			class="hand on-cork"
			style="display:block; margin-top: var(--s-4); color:#fff; font-size:1.3rem"
			>↑ updates as you type</span
		>
	</aside>
</div>

<style>
	.post {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
		gap: var(--s-7);
		align-items: start;
		margin-top: var(--s-2);
	}
	.index-card {
		--rot: -0.5deg;
		transform: rotate(var(--rot));
	}
	.grid-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0 var(--s-4);
	}
	.radio-row {
		display: flex;
		gap: var(--s-2);
		flex-wrap: wrap;
		font-size: var(--fs-1);
	}
	.radio-row label {
		display: inline-flex;
		gap: 0.4em;
		align-items: center;
		background: rgba(255, 255, 255, 0.5);
		padding: 0.35em 0.7em;
		border-radius: 2px;
		border: 1.5px solid transparent;
	}
	.radio-row label:has(:checked) {
		border-color: var(--ink);
		background: var(--paper);
	}
	.radio-row input {
		accent-color: var(--ink);
	}
	.seg label {
		cursor: pointer;
	}
	.seg label.selected {
		background: var(--paper);
		color: var(--ink);
		box-shadow: var(--lift-paper);
	}
	.seg label:has(:focus-visible) {
		outline: 3px solid var(--highlighter);
	}
	.preview {
		position: sticky;
		top: var(--s-5);
	}
	.preview h2 {
		color: var(--paper);
		font-size: var(--fs-4);
		margin-bottom: var(--s-4);
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
	}
	.preview .card {
		max-width: 300px;
	}
	.counter {
		text-align: right;
		font-size: 12px;
		color: var(--pencil);
	}
	.quota {
		display: flex;
		gap: var(--s-2);
		align-items: center;
		font-size: var(--fs-1);
		color: var(--pencil);
		margin-bottom: var(--s-4);
	}
	.quota .dots {
		display: inline-flex;
		gap: 4px;
	}
	.quota .dots i {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 1.5px solid var(--pencil);
	}
	.quota .dots i.on {
		background: var(--pin-red);
		border-color: var(--pin-red);
	}
	@media (max-width: 760px) {
		.post {
			grid-template-columns: 1fr;
		}
		.grid-fields {
			grid-template-columns: 1fr;
		}
		.preview {
			position: static;
		}
	}
</style>
