<script lang="ts">
	import CommunityHeader from '$lib/components/CommunityHeader.svelte';
	let { data, children } = $props();
</script>

<svelte:head><title>{data.community.name} — SkillSwap</title></svelte:head>

<main class="container page">
	<CommunityHeader
		community={data.community}
		counts={data.counts}
		isMember={data.isMember}
		canModerate={data.canModerate}
		isOwner={data.isOwner}
	/>
	{@render children()}
</main>
