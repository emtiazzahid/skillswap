<svelte:head>
	<title>Privacy — SkillSwap</title>
	<meta name="description" content="What SkillSwap stores, who can see it, and how to delete it." />
</svelte:head>

<main class="container page legal">
	<div class="page-head">
		<div class="grow">
			<h1 class="on-cork">Privacy</h1>
			<span class="hand" style="color: var(--highlighter); font-size: 1.5rem"
				>last updated 5 September 2026</span
			>
		</div>
	</div>

	<article class="paper sheet">
		<p class="lede">
			SkillSwap is a non-commercial hobby project. It has no ads, no trackers and no analytics. It
			collects the least it can and still work.
		</p>

		<h2>What is stored</h2>
		<ul>
			<li>
				<b>Your account.</b> A display name and avatar URL supplied by GitHub or Google when you sign
				in, plus the provider's user id so we recognise you next time. No email address is requested or
				stored.
			</li>
			<li>
				<b>What you write.</b> Your bio, the offers and wants you pin, swap requests and their notes,
				thank-you notes, and any reports you file.
			</li>
			<li>
				<b>One contact method.</b> Whatever you enter in settings (Telegram handle, email, phone, whatever
				you choose). It is encrypted before it is written to the database.
			</li>
			<li>
				<b>Sessions.</b> A random session token in a cookie named <code>ss_session</code>, and its
				hash on the server. It expires after 30 days.
			</li>
		</ul>

		<h2>Who can see what</h2>
		<ul>
			<li>
				Visitors see your first name and last initial, your bio, and your active notices on public
				boards.
			</li>
			<li>
				Your contact method is shown to one person only: someone whose swap request you accepted, or
				whose request you accepted yours. Nobody else, at any time.
			</li>
			<li>Moderators of a board see the notices posted on it and the reports filed there.</li>
			<li>Invite-only boards are invisible to people who are not members.</li>
		</ul>

		<h2>Cookies</h2>
		<p>
			One cookie, for your session. It is strictly necessary to keep you signed in. No advertising
			or analytics cookies are set, so there is no consent banner to click.
		</p>

		<h2>Where it lives</h2>
		<p>
			On Cloudflare Workers, D1 and KV. Cloudflare processes the data as our infrastructure provider
			and may store it in any of its regions. Sign-in is handled by GitHub and Google under their
			own privacy policies.
		</p>

		<h2>How long it is kept</h2>
		<p>
			Notices expire after 90 days unless you renew them. Sessions and used invites are purged by a
			daily job. Everything else stays until you delete it.
		</p>

		<h2>Deleting your data</h2>
		<p>
			Settings has a delete button. It removes your account, your notices, your swap requests and
			your contact method for good. Thank-you notes you wrote stay on the other person's profile,
			signed "former member", because they belong to their record and not to yours.
		</p>

		<h2>Children</h2>
		<p>SkillSwap is not intended for anyone under 16.</p>

		<h2>Contact</h2>
		<p>
			Questions, corrections or a deletion request you cannot do yourself: open an issue at <a
				href="https://github.com/emtiazzahid/skillswap">github.com/emtiazzahid/skillswap</a
			>. The whole source is there, so you can check any of this for yourself.
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
		transform: rotate(-0.4deg);
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
	code {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.95em;
	}
	@media (prefers-reduced-motion: reduce) {
		.sheet {
			transform: none;
		}
	}
</style>
