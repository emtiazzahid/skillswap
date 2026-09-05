<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>Welcome — SkillSwap</title></svelte:head>

<main class="container page">
	<div class="wrap">
		<h1 class="on-cork">
			Fill in your name tag <span class="hand" style="color:var(--highlighter)">takes a minute</span
			>
		</h1>
		<form method="POST" class="index-card">
			<input type="hidden" name="next" value={data.next} />
			<div class="field">
				<label class="label" for="displayName">What should neighbors call you?</label>
				<input
					class="input"
					id="displayName"
					name="displayName"
					value={form?.displayName ?? data.displayName}
					maxlength="40"
					required
					aria-invalid={form?.errors?.displayName ? 'true' : undefined}
				/>
				<span class="hint">Shown as first name and last initial, e.g. "Rina S."</span>
				{#if form?.errors?.displayName}<span class="error">{form.errors.displayName}</span>{/if}
			</div>
			<div class="field">
				<span class="label">How should a match reach you?</span>
				<div class="row">
					<select
						class="select"
						name="contactKind"
						aria-label="Contact method"
						style="max-width: 180px"
					>
						{#each data.kinds as k (k.id)}
							<option value={k.id} selected={form?.contactKind === k.id}>{k.label}</option>
						{/each}
					</select>
					<input
						class="input"
						name="contactValue"
						placeholder="@handle, number or email"
						maxlength="120"
						required
						aria-label="Contact detail"
						style="flex: 1"
					/>
				</div>
				<span class="hint"
					>Encrypted at rest. Only revealed to someone after you both accept a swap.</span
				>
				{#if form?.errors?.contact}<span class="error">{form.errors.contact}</span>{/if}
			</div>
			<div class="field">
				<label class="label" for="bio"
					>One line about you <span class="muted">(optional)</span></label
				>
				<input
					class="input"
					id="bio"
					name="bio"
					value={form?.bio ?? ''}
					maxlength="280"
					placeholder="Plays guitar badly with great enthusiasm."
				/>
			</div>
			<button class="btn" type="submit">Pin my name tag</button>
		</form>
	</div>
</main>

<style>
	.wrap {
		max-width: 560px;
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
</style>
