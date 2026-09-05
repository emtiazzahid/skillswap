<script lang="ts">
	let { form } = $props();
	// Initial values only: after a failed submit the bound state already holds what the user typed.
	// svelte-ignore state_referenced_locally
	let name = $state(form?.values?.name ?? '');
	// svelte-ignore state_referenced_locally
	let slug = $state(form?.values?.slug ?? '');
	// svelte-ignore state_referenced_locally
	let slugTouched = $state(!!form?.values?.slug);
	const auto = $derived(
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 32)
	);
</script>

<svelte:head><title>Start a board — SkillSwap</title></svelte:head>

<main class="container page">
	<div class="wrap">
		<h1 class="on-cork">
			Start a board <span class="hand" style="color:var(--highlighter)"
				>for your street, hall, or server</span
			>
		</h1>
		<form method="POST" class="index-card">
			<div class="field">
				<label class="label" for="name">Board name</label>
				<input
					class="input"
					id="name"
					name="name"
					bind:value={name}
					maxlength="60"
					required
					placeholder="Mirpur Neighbours"
				/>
				{#if form?.errors?.name}<span class="error">{form.errors.name}</span>{/if}
			</div>
			<div class="field">
				<label class="label" for="slug">Web address</label>
				<div class="row" style="gap: 0.4em">
					<span class="muted">skillswap/c/</span><input
						class="input"
						id="slug"
						name="slug"
						value={slugTouched ? slug : auto}
						oninput={(e) => {
							slugTouched = true;
							slug = (e.target as HTMLInputElement).value;
						}}
						maxlength="32"
						style="max-width: 260px"
					/>
				</div>
				<span class="hint">Lowercase letters, numbers, hyphens. Cannot be changed later.</span>
				{#if form?.errors?.slug}<span class="error">{form.errors.slug}</span>{/if}
			</div>
			<div class="field">
				<label class="label" for="tagline">Tagline</label>
				<input
					class="input"
					id="tagline"
					name="tagline"
					value={form?.values?.tagline ?? ''}
					maxlength="140"
					placeholder="Block C and D residents. Weekend swaps at the community hall."
				/>
				{#if form?.errors?.tagline}<span class="error">{form.errors.tagline}</span>{/if}
			</div>
			<div class="field">
				<label class="label" for="areaLabel">Area label</label>
				<input
					class="input"
					id="areaLabel"
					name="areaLabel"
					value={form?.values?.areaLabel ?? ''}
					maxlength="80"
					placeholder="Mirpur, Dhaka · or · Online"
					style="max-width: 320px"
				/>
			</div>
			<div class="field">
				<label class="label" for="description"
					>Longer description <span class="muted">(optional)</span></label
				>
				<textarea class="textarea" id="description" name="description" maxlength="1000"
					>{form?.values?.description ?? ''}</textarea
				>
			</div>
			<div class="field">
				<span class="label">Who can see it?</span>
				<div class="radio-row">
					<label
						><input
							type="radio"
							name="visibility"
							value="public"
							checked={form?.values?.visibility !== 'invite'}
						/> Public, anyone can join</label
					>
					<label
						><input
							type="radio"
							name="visibility"
							value="invite"
							checked={form?.values?.visibility === 'invite'}
						/> Invite link only</label
					>
				</div>
			</div>
			<button class="btn" type="submit">Pin the board up</button>
		</form>
	</div>
</main>

<style>
	.wrap {
		max-width: 640px;
		margin: var(--s-6) auto;
	}
	h1 {
		color: var(--paper);
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
		margin-bottom: var(--s-4);
		font-size: var(--fs-5);
	}
	.index-card {
		--rot: -0.5deg;
		transform: rotate(var(--rot));
	}
	.radio-row {
		display: flex;
		gap: var(--s-3);
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
</style>
