<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>Test sign-in — SkillSwap</title></svelte:head>

<main class="container page">
	<form
		method="POST"
		class="index-card index-card--plain"
		style="max-width: 420px; margin: var(--s-6) auto"
	>
		<h1>Test sign-in</h1>
		<p class="muted">Only available on test instances.</p>
		<input type="hidden" name="state" value={data.state} />
		<div class="field">
			<label class="label" for="id">Provider user id</label><input
				class="input"
				id="id"
				name="id"
				value="test-user-1"
			/>
		</div>
		<div class="field">
			<label class="label" for="name">Name</label><input
				class="input"
				id="name"
				name="name"
				value="Test User"
			/>
		</div>
		{#if form?.message}<p class="error">{form.message}</p>{/if}
		<button class="btn" type="submit">Sign in</button>
	</form>
</main>
