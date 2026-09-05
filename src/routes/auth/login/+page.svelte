<script lang="ts">
	let { data } = $props();
	const q = $derived(`?next=${encodeURIComponent(data.next)}`);
</script>

<svelte:head><title>Sign in — SkillSwap</title></svelte:head>

<main class="container page">
	<div class="login">
		<div class="index-card index-card--plain">
			<span class="tape tape--top" aria-hidden="true"></span>
			<h1>Sign the visitors' book</h1>
			<p class="muted">
				No passwords here. Use an account you already have. We only keep your name and avatar.
			</p>
			<div class="providers">
				{#if data.providers.includes('github')}
					<a class="btn" href={`/auth/start/github${q}`} data-sveltekit-reload
						>Continue with GitHub</a
					>
				{/if}
				{#if data.providers.includes('google')}
					<a class="btn btn--paper" href={`/auth/start/google${q}`} data-sveltekit-reload
						>Continue with Google</a
					>
				{/if}
				{#if data.providers.includes('mock')}
					<a class="btn btn--ghost" href={`/auth/start/mock${q}`} data-sveltekit-reload
						>Continue with test account</a
					>
				{/if}
				{#if data.providers.length === 0}
					<p class="error">no sign-in providers are configured on this instance yet</p>
				{/if}
			</div>
			<p class="hand pencil" style="margin-top: var(--s-4)">
				your email and contact details stay private until a swap is accepted
			</p>
		</div>
	</div>
</main>

<style>
	.login {
		max-width: 480px;
		margin: var(--s-6) auto;
	}
	.index-card {
		--rot: -0.8deg;
		transform: rotate(var(--rot));
		padding-top: var(--s-6);
	}
	h1 {
		font-size: var(--fs-5);
		margin-bottom: var(--s-2);
	}
	.providers {
		display: grid;
		gap: var(--s-3);
		margin-top: var(--s-5);
	}
	.providers .btn {
		justify-content: center;
	}
</style>
