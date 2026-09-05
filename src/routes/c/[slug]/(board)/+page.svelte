<script lang="ts">
	let { data } = $props();
</script>

<div class="empty">
	<span class="hand">Nothing pinned yet. Be first.</span>
	{#if data.isMember}
		<p style="margin-top: var(--s-3)">
			<a class="btn btn--paper" href={`/c/${data.community.slug}/post`}>Pin the first notice</a>
		</p>
	{/if}
</div>
