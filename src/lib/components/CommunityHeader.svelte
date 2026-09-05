<script lang="ts">
	import { page } from '$app/state';
	let {
		community,
		counts,
		canModerate = false,
		isMember = false,
		isOwner = false
	}: {
		community: {
			slug: string;
			name: string;
			tagline: string | null;
			areaLabel: string | null;
			visibility: string;
		};
		counts: { members: number; notices: number };
		canModerate?: boolean;
		isMember?: boolean;
		isOwner?: boolean;
	} = $props();
	const base = $derived(`/c/${community.slug}`);
	const current = (path: string) => (page.url.pathname === path ? 'page' : undefined);
</script>

<div class="community-head">
	<div class="banner">
		<span class="tape tape--tl" aria-hidden="true"></span><span
			class="tape tape--tr"
			aria-hidden="true"
		></span>
		<h1>{community.name}</h1>
		{#if community.tagline}<p class="muted">{community.tagline}</p>{/if}
	</div>
	{#if community.areaLabel}<span class="tag">{community.areaLabel}</span>{/if}
	{#if community.visibility === 'invite'}<span class="chip">Invite only</span>{/if}
	<div class="actions">
		<span class="on-cork muted">{counts.members} members · {counts.notices} notices</span>
		{#if isMember}
			<a class="btn" href={`${base}/post`}>+ Pin a notice</a>
		{:else}
			<a class="btn" href={`${base}/join`}>Join this board</a>
		{/if}
	</div>
</div>

<nav class="subnav" aria-label="Community">
	<div class="seg">
		<a href={base} aria-current={current(base)}>Board</a>
		{#if isMember}<a href={`${base}/matches`} aria-current={current(`${base}/matches`)}>Matches</a
			>{/if}
		<a href={`${base}/members`} aria-current={current(`${base}/members`)}>Members</a>
		{#if canModerate}<a href={`${base}/mod`} aria-current={current(`${base}/mod`)}>Moderation</a
			>{/if}
		{#if isOwner}<a href={`${base}/settings`} aria-current={current(`${base}/settings`)}>Settings</a
			>{/if}
	</div>
</nav>

<style>
	.community-head {
		display: flex;
		align-items: flex-end;
		gap: var(--s-5);
		flex-wrap: wrap;
		padding: var(--s-6) 0 var(--s-4);
	}
	.community-head .tag,
	.community-head .chip {
		margin-bottom: var(--s-3);
	}
	.community-head .actions {
		margin-left: auto;
		display: flex;
		gap: var(--s-3);
		align-items: center;
		flex-wrap: wrap;
	}
	.subnav {
		display: flex;
		gap: var(--s-2);
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: var(--s-4);
	}
	.subnav .seg {
		background: rgba(0, 0, 0, 0.18);
	}
	.subnav .seg > :global(*) {
		color: rgba(255, 255, 255, 0.92);
	}
	.subnav .seg > :global([aria-current='page']) {
		color: var(--ink);
	}
	@media (max-width: 760px) {
		.community-head .actions {
			width: 100%;
			margin-left: 0;
			justify-content: space-between;
		}
	}
</style>
