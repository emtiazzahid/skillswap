<script lang="ts">
	import SampleCards from '$lib/components/SampleCards.svelte';
	import CommunityCard from '$lib/components/CommunityCard.svelte';
	let { data } = $props();
	const rots = ['-1deg', '1.2deg', '-0.4deg', '0.8deg', '-1.4deg', '0.5deg'];
</script>

<svelte:head>
	<title>SkillSwap — Neighbors trade skills, no money</title>
	<meta
		name="description"
		content="A community noticeboard where neighbors trade skills. No money, no ratings, no algorithm."
	/>
	<meta property="og:title" content="SkillSwap — Neighbors trade skills, no money" />
	<meta
		property="og:description"
		content="Teach me guitar, I'll teach you spreadsheets. A community noticeboard for trading what you know."
	/>
</svelte:head>

<main class="container">
	<section class="hero">
		<div class="hero__poster">
			<span class="tape tape--tl" aria-hidden="true"></span>
			<span class="tape tape--tr" aria-hidden="true"></span>
			<h1>Teach me guitar,<br />I'll teach you <em>Excel.</em></h1>
			<p>
				SkillSwap is a community noticeboard where neighbors trade skills. No money, no ratings, no
				algorithm. Just people who know things and people who want to learn them.
			</p>
			<div class="hero__cta">
				<a class="btn" href="/auth/login">Find your board</a>
				<a class="btn btn--ghost" href="/auth/login">Start one for your community</a>
			</div>
			<div class="note hero__note">
				Free, forever.<br />Open source.<span class="note__by">— the rules</span>
			</div>
		</div>
		<SampleCards />
	</section>

	<section>
		<div class="section-title">
			<h2>How it works</h2>
			<span class="hand" style="color:var(--highlighter)">it's three index cards, really</span>
		</div>
		<div class="how">
			<div class="index-card">
				<span class="num">1</span>
				<h3>Pin what you know</h3>
				<p>
					Post an <b>offer</b> for anything you can teach. Post a <b>want</b> for anything you'd like
					to learn. Guitar, Bangla, tax forms, knots.
				</p>
			</div>
			<div class="index-card">
				<span class="num">2</span>
				<h3>Find a match</h3>
				<p>
					The board shows who wants what you offer, and who offers what you want. Reciprocal pairs
					float to the top.
				</p>
			</div>
			<div class="index-card">
				<span class="num">3</span>
				<h3>Swap and say thanks</h3>
				<p>
					Accept a request, contact details unlock for both of you. Meet in public or online. Leave
					a one-line thank-you note.
				</p>
			</div>
		</div>
	</section>

	<section class="communities">
		<div class="section-title">
			<h2>{data.mine.length ? 'Your boards' : 'Boards near and far'}</h2>
			<a class="btn btn--sm btn--paper" href="/communities/new" style="margin-left:auto"
				>+ Start a board</a
			>
		</div>
		{#if data.mine.length}
			<div class="community-list">
				{#each data.mine as c, i (c.id)}<CommunityCard
						community={c}
						rot={rots[i % rots.length]}
					/>{/each}
			</div>
			{#if data.publicBoards.length}<h2 class="on-cork" style="margin-top:var(--s-6)">
					Other public boards
				</h2>{/if}
		{/if}
		{#if data.publicBoards.length}
			<div class="community-list">
				{#each data.publicBoards as c, i (c.id)}<CommunityCard
						community={c}
						rot={rots[(i + 3) % rots.length]}
					/>{/each}
			</div>
		{:else if !data.mine.length}
			<div class="empty"><span class="hand">Nothing pinned yet. Start the first board.</span></div>
		{/if}
	</section>

	<footer class="footer">
		<span>SkillSwap is a non-commercial hobby project.</span>
		<a href="https://github.com/emtiazzahid/skillswap">Source on GitHub</a>
		<a href="/about">Rules &amp; safety</a>
		<a href="/privacy">Privacy</a>
		<a href="/terms">Terms</a>
	</footer>
</main>

<style>
	.hero {
		display: grid;
		grid-template-columns: 1.05fr 1fr;
		gap: var(--s-7);
		align-items: center;
		padding: var(--s-7) 0 var(--s-6);
	}
	.hero__poster {
		position: relative;
		background: var(--paper);
		padding: var(--s-6);
		box-shadow: var(--lift-paper), var(--inset-paper);
		transform: rotate(-1.2deg);
	}
	.hero__poster h1 {
		font-size: clamp(2.4rem, 4.6vw, 3.6rem);
		font-weight: 700;
	}
	.hero__poster h1 em {
		font-style: italic;
		font-weight: 500;
		color: var(--red-pen);
	}
	.hero__poster p {
		font-size: var(--fs-3);
		color: var(--ink-soft);
		margin-top: var(--s-4);
		max-width: 34ch;
	}
	.hero__cta {
		display: flex;
		gap: var(--s-3);
		margin-top: var(--s-5);
		flex-wrap: wrap;
		align-items: center;
	}
	.hero__note {
		position: absolute;
		right: -28px;
		bottom: -26px;
		--rot: 6deg;
		width: 170px;
		font-size: 1.2rem;
	}
	.how {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--s-5);
		margin: var(--s-6) 0;
	}
	.how .index-card {
		padding-left: 60px;
		min-height: 180px;
	}
	.how .num {
		position: absolute;
		left: 12px;
		top: 10px;
		font-family: var(--font-hand);
		font-size: 2.4rem;
		color: var(--red-pen);
		line-height: 1;
	}
	.how h3 {
		margin-bottom: var(--s-2);
	}
	.section-title {
		display: flex;
		align-items: baseline;
		gap: var(--s-3);
		flex-wrap: wrap;
	}
	.section-title h2 {
		color: var(--paper);
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
	}
	.communities {
		margin: var(--s-6) 0 var(--s-4);
	}
	.community-list {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--s-5);
		margin-top: var(--s-4);
	}
	.footer {
		color: #fff;
		font-size: var(--fs-1);
		padding: var(--s-6) 0 var(--s-7);
		display: flex;
		gap: var(--s-5);
		flex-wrap: wrap;
	}
	.footer a {
		color: #fff;
	}
	@media (max-width: 900px) {
		.hero {
			grid-template-columns: 1fr;
			gap: var(--s-6);
			padding-top: var(--s-6);
		}
		.hero__poster {
			transform: none;
		}
		.hero__note {
			position: static;
			margin-top: var(--s-5);
			width: 180px;
			--rot: -2deg;
		}
		.how {
			grid-template-columns: 1fr;
		}
	}
</style>
