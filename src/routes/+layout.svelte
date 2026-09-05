<script lang="ts">
	import '@fontsource-variable/fraunces';
	import '@fontsource-variable/public-sans';
	import '@fontsource/caveat/500.css';
	import '@fontsource/caveat/600.css';
	import '$lib/styles/app.css';
	import TopBar from '$lib/components/TopBar.svelte';
	let { children, data } = $props();
	// Marker for tests: input typed before hydration would be reset by hydration.
	$effect(() => {
		document.documentElement.dataset.hydrated = 'true';
	});
</script>

<svelte:head>
	<meta property="og:site_name" content="SkillSwap" />
	<meta property="og:type" content="website" />
	<meta property="og:image" content="{data.origin}/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<TopBar user={data.user} inbox={data.inbox} />
{@render children()}
