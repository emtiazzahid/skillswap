<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>Join {data.community.name} — SkillSwap</title></svelte:head>

<main class="container page">
	<form method="POST" class="index-card index-card--plain wrap">
		<span class="tape tape--top" aria-hidden="true"></span>
		<h1>Join {data.community.name}?</h1>
		{#if data.community.tagline}<p class="muted">{data.community.tagline}</p>{/if}
		<input type="hidden" name="next" value={data.next} />
		<ul class="rules">
			<li>No money changes hands. Ever.</li>
			<li>Meet in public or online first.</li>
			<li>Your first notice waits for a moderator. After that you are trusted.</li>
		</ul>
		{#if form?.message}<p class="error">{form.message}</p>{/if}
		<div class="row">
			<button class="btn" type="submit">Join the board</button><a class="btn btn--ghost" href="/"
				>Not now</a
			>
		</div>
	</form>
</main>

<style>
	.wrap {
		max-width: 520px;
		margin: var(--s-6) auto;
		padding-top: var(--s-6);
		--rot: 0.6deg;
		transform: rotate(var(--rot));
	}
	h1 {
		font-size: var(--fs-5);
		margin-bottom: var(--s-2);
	}
	.rules {
		margin: var(--s-4) 0;
		padding-left: 1.2em;
		font-size: var(--fs-1);
		color: var(--ink-soft);
	}
</style>
