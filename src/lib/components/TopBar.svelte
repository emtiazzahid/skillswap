<script lang="ts">
	import type { SessionUser } from '$lib/server/auth/types';
	import { page } from '$app/state';
	let {
		user,
		tagline = 'a noticeboard for trading what you know'
	}: { user: SessionUser | null; tagline?: string } = $props();
	const current = (path: string) => (page.url.pathname === path ? 'page' : undefined);
</script>

<header class="topbar container">
	<div class="topbar__strip">
		<span class="pin pin--l pin--blue" aria-hidden="true"></span>
		<a class="logo" href="/">Skill<span class="logo__swap">Swap</span></a>
		<span class="hand pencil">{tagline}</span>
		<nav class="nav" aria-label="Main">
			<a href="/" aria-current={current('/')}>Boards</a>
			<a href="/about" aria-current={current('/about')}>About</a>
			{#if user}
				<a href="/inbox" aria-current={current('/inbox')}>Inbox</a>
				<a href="/me" class="row" style="gap:6px"
					><span class="avatar">{user.displayName.slice(0, 1)}</span> {user.displayName}</a
				>
			{:else}
				<a class="btn btn--sm" href="/auth/login">Sign in</a>
			{/if}
		</nav>
		<span class="pin pin--r pin--green" aria-hidden="true"></span>
	</div>
</header>
