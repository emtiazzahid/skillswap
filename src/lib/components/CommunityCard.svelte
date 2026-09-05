<script lang="ts">
	import type { CommunityCard } from '$lib/server/services/communities';
	let { community, rot = '0deg' }: { community: CommunityCard; rot?: string } = $props();
</script>

<a class="community" style={`--rot:${rot}`} href={`/c/${community.slug}`}>
	{#if community.areaLabel}<span class="tag">{community.areaLabel}</span>{/if}
	<h3>{community.name}</h3>
	{#if community.tagline}<p class="muted">{community.tagline}</p>{/if}
	<span class="counts"
		><span><b>{community.members}</b> members</span><span><b>{community.notices}</b> notices</span
		></span
	>
</a>

<style>
	.community {
		position: relative;
		background: var(--paper);
		padding: var(--s-4);
		box-shadow: var(--lift-paper), var(--inset-paper);
		text-decoration: none;
		color: var(--ink);
		display: grid;
		gap: var(--s-2);
		transform: rotate(var(--rot));
		transition: transform var(--t-fast) var(--ease-out);
	}
	.community:hover {
		transform: rotate(0) translateY(-2px);
	}
	.community .tag {
		justify-self: start;
	}
	.community h3 {
		font-size: var(--fs-4);
	}
	.counts {
		display: flex;
		gap: var(--s-4);
		font-size: var(--fs-1);
		color: var(--pencil);
	}
	.counts b {
		color: var(--ink);
		font-family: var(--font-display);
		font-size: var(--fs-3);
	}
</style>
