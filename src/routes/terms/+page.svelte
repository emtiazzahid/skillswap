<svelte:head>
	<title>Terms — SkillSwap</title>
	<meta
		name="description"
		content="The short terms of use for SkillSwap: no money, be honest, be safe."
	/>
</svelte:head>

<main class="container page legal">
	<div class="page-head">
		<div class="grow">
			<h1 class="on-cork">Terms of use</h1>
			<span class="hand" style="color: var(--highlighter); font-size: 1.5rem"
				>last updated 5 September 2026</span
			>
		</div>
	</div>

	<article class="paper sheet">
		<p class="lede">
			SkillSwap is a free, non-commercial hobby project run by one person. Using it means agreeing
			to the following. It is short on purpose.
		</p>

		<h2>What you may do</h2>
		<p>
			Create an account, join or start boards, pin offers and wants, ask people for swaps, and meet
			them to teach and learn. That's the whole product.
		</p>

		<h2>What you may not do</h2>
		<ul>
			<li>
				Ask for or offer money, goods or anything of monetary value in exchange for a skill. This is
				not a marketplace.
			</li>
			<li>
				Post anything illegal, hateful, harassing, sexual, or aimed at a person rather than a skill.
			</li>
			<li>Advertise a business, recruit, or spam boards with the same notice.</li>
			<li>Misrepresent who you are or what you can teach.</li>
			<li>Scrape the site, or use it to collect other people's contact details.</li>
		</ul>

		<h2>Your content</h2>
		<p>
			What you write stays yours. By posting it you allow SkillSwap to display it to the people
			described in the <a href="/privacy">privacy notice</a>. You can delete it at any time.
		</p>

		<h2>Moderation</h2>
		<p>
			Each board is run by its creator and the moderators they appoint. They may hide notices,
			refuse a first post, or remove members from their board. Three reports from different people
			hide a notice until a moderator looks at it. The site operator may remove any board or account
			that breaks these terms.
		</p>

		<h2>Meeting people</h2>
		<p>
			Swaps happen between you and another person, offline or online, without SkillSwap in the
			middle. Nobody is vetted, background-checked or insured. Read the safety advice on the <a
				href="/about">rules page</a
			>, meet in public first, and use your judgement. You are responsible for your own safety and
			for what you teach.
		</p>

		<h2>No warranty</h2>
		<p>
			The service is provided as is, with no guarantee that it works, stays available, or keeps your
			data forever. It may change or shut down at any time. To the extent the law allows, the
			operator is not liable for any loss arising from using it or from a swap arranged through it.
			Nothing here removes rights you have under the law where you live.
		</p>

		<h2>Ending it</h2>
		<p>
			Delete your account in settings whenever you like. We may suspend an account that breaks these
			terms.
		</p>

		<h2>Contact</h2>
		<p>
			Open an issue at <a href="https://github.com/emtiazzahid/skillswap"
				>github.com/emtiazzahid/skillswap</a
			>.
		</p>
	</article>
</main>

<style>
	h1 {
		color: var(--paper);
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
	}
	.sheet {
		max-width: 760px;
		padding: var(--s-6);
		transform: rotate(0.4deg);
	}
	.lede {
		font-size: var(--fs-3);
	}
	.sheet h2 {
		font-family: var(--font-display);
		font-size: var(--fs-4);
		margin: var(--s-5) 0 var(--s-2);
	}
	.sheet ul {
		padding-left: 1.2em;
		margin: 0;
	}
	.sheet li + li {
		margin-top: var(--s-2);
	}
	@media (prefers-reduced-motion: reduce) {
		.sheet {
			transform: none;
		}
	}
</style>
