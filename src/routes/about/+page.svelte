<svelte:head>
	<title>Rules and safety — SkillSwap</title>
	<meta
		name="description"
		content="How SkillSwap works, the three rules, and how to stay safe when meeting a neighbour."
	/>
</svelte:head>

<main class="container page about">
	<div class="page-head">
		<div class="grow">
			<h1 class="on-cork">Rules &amp; safety</h1>
			<span class="hand" style="color: var(--highlighter); font-size: 1.5rem"
				>pinned by the people who run this board</span
			>
		</div>
	</div>

	<div class="sheets">
		<section class="paper sheet" style="--rot: -0.8deg">
			<span class="tape tape--top" aria-hidden="true"></span>
			<h2>What this is</h2>
			<p>
				A noticeboard for trading what you know. You pin an <b>offer</b> (something you can teach)
				and a <b>want</b> (something you'd like to learn). When someone wants what you offer and offers
				what you want, that's a match. You swap an hour for an hour, or a week for a week, however you
				both like.
			</p>
			<p>
				No money changes hands. No ratings, no stars, no algorithm deciding who is worth your time.
				Just neighbours and a bit of trust.
			</p>
		</section>

		<section class="index-card sheet" style="--rot: 0.7deg">
			<h2>Three rules</h2>
			<ol>
				<li>
					<b>No money, no goods.</b> Titles with prices, fees or "for sale" get bounced by the board.
					If someone asks you to pay, flag them.
				</li>
				<li>
					<b>Be honest about your level.</b> "Beginner who can get you through your first three chords"
					is a great offer. Pretending to be a pro is not.
				</li>
				<li>
					<b>Show up.</b> If you accept a swap, do it. If life happens, cancel and say so. A one-line
					thank-you note after a swap goes on the other person's profile, and it means a lot.
				</li>
			</ol>
		</section>

		<section class="paper sheet paper--lined" style="--rot: -0.4deg">
			<h2>Staying safe</h2>
			<ul>
				<li>
					Do the first session online, or in a public place: a library, a café, a community hall.
				</li>
				<li>
					Don't put your home address in your first message. Contact details are shared only after a
					request is accepted, and only the one method you chose.
				</li>
				<li>Tell someone where you're going the first time you meet a new person.</li>
				<li>
					Anything that feels off: flag the notice or the profile. Three flags hide it until a
					moderator looks. Moderators can remove people from a board.
				</li>
				<li>Keep it to skills. If a "swap" starts to look like unpaid labour, walk away.</li>
			</ul>
		</section>

		<section class="paper sheet" style="--rot: 0.5deg">
			<span class="tape tape--top" aria-hidden="true"></span>
			<h2>How moderation works</h2>
			<p>
				Every board is run by the person who created it, plus anyone they name as a moderator. Your
				first notice on a board waits for a moderator's nod; after that you're trusted and post
				straight to the board.
			</p>
			<p>
				Notices expire after 90 days so the board stays current. You can renew in one click. Delete
				your account and everything you posted goes with it. Thank-you notes you wrote stay, signed
				"former member".
			</p>
		</section>

		<section class="index-card sheet" style="--rot: -0.6deg">
			<h2>Your data</h2>
			<p>
				We store your name, the avatar your sign-in provider gave us, your notices, and one contact
				method which is encrypted at rest and shown only to people whose swap you accepted. No
				tracking pixels, no analytics scripts, no ads. The whole thing is <a
					href="https://github.com/emtiazzahid/skillswap">open source</a
				>.
			</p>
		</section>
	</div>
</main>

<style>
	h1 {
		color: var(--paper);
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
	}
	.sheets {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--s-6);
		margin-top: var(--s-4);
		align-items: start;
	}
	.sheet {
		transform: rotate(var(--rot));
		position: relative;
	}
	.sheet h2 {
		font-size: var(--fs-4);
		margin-bottom: var(--s-2);
	}
	.sheet p + p,
	.sheet li + li {
		margin-top: var(--s-2);
	}
	.sheet ol,
	.sheet ul {
		padding-left: 1.2em;
		margin: 0;
	}
	@media (prefers-reduced-motion: reduce) {
		.sheet {
			transform: none;
		}
	}
</style>
