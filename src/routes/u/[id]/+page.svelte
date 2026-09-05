<script lang="ts">
	import { pinFor, rotationFor } from '$lib/utils/rotation';
	let { data } = $props();
	const monthYear = (d: Date) =>
		new Date(d).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
	const rots = ['-2deg', '1.5deg', '0.5deg', '-1deg'];
</script>

<svelte:head><title>{data.profile.name} — SkillSwap</title></svelte:head>

<main class="container page">
	<div class="profile">
		<aside>
			<div class="nametag">
				{#if data.profile.avatarUrl}<img
						class="avatar"
						src={data.profile.avatarUrl}
						alt=""
						width="72"
						height="72"
					/>{:else}<span class="avatar">{data.profile.name.slice(0, 1)}</span>{/if}
				<h1>{data.profile.name}</h1>
				{#if data.profile.bio}<p class="bio">{data.profile.bio}</p>{/if}
				<div class="stats">
					<div><span class="n">{data.profile.swaps}</span><span class="l">swaps done</span></div>
					<div>
						<span class="n">{monthYear(data.profile.since)}</span><span class="l">member since</span
						>
					</div>
				</div>
				{#if data.profile.taught}
					<div class="tallybox">
						<span class="tally"
							>{#each Array(Math.floor(data.profile.taught / 5)) as _, i (i)}<s>||||</s
								>{/each}{'|'.repeat(data.profile.taught % 5)}</span
						><span class="muted">people they've taught</span>
					</div>
				{/if}
				{#if data.boards.length}
					<div class="boards">
						<span class="muted">On boards:</span>
						{#each data.boards as b (b.slug)}<a class="chip" href={`/c/${b.slug}`}>{b.name}</a
							>{/each}
					</div>
				{/if}
				{#if data.isSelf}<p style="margin-top: var(--s-4)">
						<a class="btn btn--sm btn--paper" href="/me">Edit name tag</a>
					</p>{/if}
			</div>
			<p class="on-cork muted" style="margin-top:var(--s-4); font-size:13px">
				Full name, email and contact stay private until a swap is accepted.
			</p>
		</aside>

		<div>
			<section class="section">
				<h2>
					Thank-you notes <span class="hand" style="color:var(--highlighter);font-size:1.3rem"
						>stuck here by people they've helped</span
					>
				</h2>
				{#if data.thanks.length}
					<div class="notes">
						{#each data.thanks as t, i (t.id)}<div
								class="note {i % 2 ? 'note--green' : ''}"
								style="--rot:{rots[i % rots.length]}"
							>
								{t.text}<span class="note__by">— {t.from}</span>
							</div>{/each}
					</div>
				{:else}
					<p class="on-cork muted">No notes yet.</p>
				{/if}
			</section>

			<section class="section">
				<h2>{data.isSelf ? 'Your notices' : `${data.profile.name.split(' ')[0]}'s notices`}</h2>
				{#if data.skills.length}
					<div class="board">
						{#each data.skills as s (s.id)}
							<a
								class="card card--{s.kind}"
								style="--rot:{rotationFor(s.id)}"
								href={`/c/${s.slug}/s/${s.id}`}
							>
								{#if s.kind === 'offer'}<span class="pin {pinFor(s.id)}" aria-hidden="true"
									></span>{:else}<span class="tape tape--top" aria-hidden="true"></span>{/if}
								<span class="stamp {s.kind === 'want' ? 'stamp--blue' : ''}"
									>{s.kind} · {s.categoryName}</span
								>
								<span class="card__title">{s.title}</span>
								<span class="card__meta"><span>{s.availability ?? ''}</span></span>
							</a>
						{/each}
					</div>
				{:else}
					<p class="on-cork muted">Nothing pinned on a board you can see.</p>
				{/if}
			</section>
		</div>
	</div>
</main>

<style>
	.profile {
		display: grid;
		grid-template-columns: 340px minmax(0, 1fr);
		gap: var(--s-7);
		align-items: start;
		margin-top: var(--s-5);
	}
	.nametag {
		position: relative;
		background: var(--paper);
		padding: var(--s-6) var(--s-5) var(--s-5);
		box-shadow: var(--lift-paper);
		transform: rotate(-1deg);
		border-top: 14px solid var(--red-pen);
	}
	.nametag::before {
		content: 'HELLO, MY NAME IS';
		position: absolute;
		top: -13px;
		left: 0;
		right: 0;
		text-align: center;
		font: 700 9px/12px var(--font-body);
		letter-spacing: 0.2em;
		color: #fff;
	}
	.nametag .avatar {
		width: 72px;
		height: 72px;
		font-size: 28px;
		margin: 0 auto var(--s-3);
		object-fit: cover;
	}
	.nametag h1 {
		text-align: center;
		font-family: var(--font-hand);
		font-size: 3rem;
		font-weight: 600;
	}
	.bio {
		text-align: center;
		color: var(--ink-soft);
		margin-top: var(--s-2);
		font-size: var(--fs-1);
	}
	.stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--s-3);
		margin-top: var(--s-5);
		text-align: center;
	}
	.stats .n {
		font-family: var(--font-display);
		font-size: var(--fs-5);
		font-weight: 700;
		display: block;
	}
	.stats .l {
		font-size: 12px;
		color: var(--pencil);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.tallybox {
		margin-top: var(--s-4);
		text-align: center;
	}
	.tallybox .muted {
		display: block;
	}
	.boards {
		margin-top: var(--s-4);
		font-size: var(--fs-1);
	}
	.boards a {
		display: inline-block;
		margin: 2px 4px 2px 0;
		text-decoration: none;
	}
	.section h2 {
		color: var(--paper);
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
		margin-bottom: var(--s-3);
	}
	.section + .section {
		margin-top: var(--s-6);
	}
	.notes {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-5) var(--s-4);
		padding: var(--s-2) 0 var(--s-4);
	}
	.profile .board {
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		padding-top: var(--s-3);
	}
	@media (max-width: 900px) {
		.profile {
			grid-template-columns: 1fr;
		}
	}
</style>
