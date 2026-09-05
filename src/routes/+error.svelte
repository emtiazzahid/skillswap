<script lang="ts">
	import { page } from '$app/state';
	const notFound = $derived(page.status === 404);
</script>

<svelte:head
	><title>{notFound ? 'Fell off the board' : 'Something tore'} — SkillSwap</title></svelte:head
>

<main class="container page">
	<div class="fell">
		<div class="paper card-ish" style="--rot: -3deg">
			<span class="pin pin--red" aria-hidden="true"></span>
			<span class="stamp">{page.status}</span>
			<h1>{notFound ? 'This notice fell off the board.' : 'Something tore.'}</h1>
			<p class="muted">
				{notFound
					? 'It may have expired, been taken down, or never existed. The pin is still here though.'
					: page.error?.message ||
						'Try again in a moment. If it keeps happening, the board admin will hear about it.'}
			</p>
			<div class="row" style="margin-top: var(--s-4)">
				<a class="btn" href="/">Back to the front</a>
				<a class="btn btn--paper" href="/inbox">Inbox</a>
			</div>
		</div>
		<span class="hand arrow">{notFound ? 'nothing here but cork' : 'we keep spare tape'}</span>
	</div>
</main>

<style>
	.fell {
		display: grid;
		place-items: center;
		min-height: 50vh;
		gap: var(--s-4);
	}
	.card-ish {
		position: relative;
		max-width: 480px;
		transform: rotate(var(--rot));
		padding-top: var(--s-6);
	}
	.card-ish h1 {
		font-size: var(--fs-6);
		line-height: 1.05;
		margin: var(--s-2) 0;
	}
	.arrow {
		color: var(--highlighter);
		font-size: 1.6rem;
	}
	@media (prefers-reduced-motion: reduce) {
		.card-ish {
			transform: none;
		}
	}
</style>
