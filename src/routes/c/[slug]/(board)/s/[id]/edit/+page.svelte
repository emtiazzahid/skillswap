<script lang="ts">
	import SkillForm from '$lib/components/SkillForm.svelte';
	let { data, form } = $props();
	const fmt = (d: Date) =>
		new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	const status = $derived(form?.status ?? data.skill.status);
</script>

<h2 class="on-cork title">Edit your notice</h2>
<div class="controls paper">
	<span class="chip">Status: {status}</span>
	<span class="muted"
		>Expires {fmt(data.skill.expiresAt)}{#if form?.renewed}
			· renewed for 90 days{/if}</span
	>
	<span class="spacer"></span>
	{#if status === 'active'}<form method="POST" action="?/pause">
			<button class="btn btn--sm btn--ghost" type="submit">Pause</button>
		</form>{/if}
	{#if status === 'paused'}<form method="POST" action="?/resume">
			<button class="btn btn--sm btn--ghost" type="submit">Resume</button>
		</form>{/if}
	<form method="POST" action="?/renew">
		<button class="btn btn--sm btn--paper" type="submit">Renew 90 days</button>
	</form>
	<form method="POST" action="?/delete">
		<button class="btn btn--sm btn--red" type="submit">Delete</button>
	</form>
</div>
<SkillForm
	values={form?.values ?? data.values}
	errors={form?.errors ?? {}}
	categories={data.categories}
	authorName={data.authorName}
	quota={data.quota}
	submitLabel="Save changes"
	action="?/update"
/>

<style>
	.title {
		font-size: var(--fs-5);
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
		margin-bottom: var(--s-3);
	}
	.controls {
		display: flex;
		gap: var(--s-3);
		align-items: center;
		flex-wrap: wrap;
		padding: var(--s-3) var(--s-4);
		margin-bottom: var(--s-4);
	}
	.spacer {
		flex: 1;
	}
</style>
