<script lang="ts">
	import SkillForm from '$lib/components/SkillForm.svelte';
	let { data, form } = $props();
</script>

<h2 class="on-cork title">
	Pin a notice <span class="hand" style="color:var(--highlighter)">to {data.community.name}</span>
</h2>
{#if !data.trusted}<p class="on-cork muted" style="margin-bottom: var(--s-3)">
		Your first notice here waits for a moderator. After that, they go straight up.
	</p>{/if}
<SkillForm
	values={form?.values ?? data.values}
	errors={form?.errors ?? {}}
	categories={data.categories}
	authorName={data.authorName}
	quota={data.quota}
/>

<style>
	.title {
		font-size: var(--fs-5);
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
	}
</style>
