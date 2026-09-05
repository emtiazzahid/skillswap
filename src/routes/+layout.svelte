<script lang="ts">
	import '@fontsource-variable/fraunces';
	import '@fontsource-variable/public-sans';
	import '@fontsource/caveat/500.css';
	import '@fontsource/caveat/600.css';
	import '$lib/styles/app.css';
	import TopBar from '$lib/components/TopBar.svelte';
	let { children, data } = $props();
</script>

<TopBar user={data.user} />
{@render children()}
