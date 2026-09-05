<script lang="ts">
	let { data, form } = $props();
	const base = $derived(`/c/${data.community.slug}`);
	const ago = (d: Date) => {
		const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
		return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
	};
</script>

{#if form?.message}<p class="error on-cork" style="color:var(--highlighter)">{form.message}</p>{/if}
<div class="mod">
	<section class="clipboard" style="--rot:-0.4deg">
		<div class="clipboard__paper">
			<h2>
				Waiting for approval <span class="chip" style="background:var(--sticker-yellow)"
					>{data.pending.length}</span
				>
			</h2>
			<p class="muted" style="margin-bottom:var(--s-3)">
				First notice from each new member. Approve once, they're trusted after.
			</p>
			{#if !data.pending.length}<p class="hand pencil">Nothing waiting. Kettle's on.</p>{/if}
			<div class="queue">
				{#each data.pending as s (s.id)}
					<div class="item">
						<a class="t" href={`${base}/s/${s.id}`}>{s.title}</a>
						<span class="m"
							>{s.kind} · {s.categoryName} · {s.authorName} · joined {ago(s.joinedAt)} · {s.previous}
							previous notices</span
						>
						<span class="d">{s.description}</span>
						<div class="a">
							<form method="POST" action="?/approve">
								<input type="hidden" name="skillId" value={s.id} /><button
									class="btn btn--green btn--sm"
									type="submit">Approve &amp; trust</button
								>
							</form>
							<form method="POST" action="?/hide">
								<input type="hidden" name="skillId" value={s.id} /><button
									class="btn btn--ghost btn--sm"
									type="submit">Hide</button
								>
							</form>
							<form method="POST" action="?/hideban">
								<input type="hidden" name="skillId" value={s.id} /><input
									type="hidden"
									name="userId"
									value={s.authorId}
								/><button class="btn btn--red btn--sm" type="submit">Hide &amp; ban</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="clipboard" style="--rot:0.5deg">
		<div class="clipboard__paper">
			<h2>
				Flags <span class="chip" style="background:var(--sticker-red)">{data.flags.length}</span>
			</h2>
			<p class="muted" style="margin-bottom:var(--s-3)">
				Three flags hide a notice automatically until you look.
			</p>
			{#if !data.flags.length}<p class="hand pencil">No open flags.</p>{/if}
			<div class="queue">
				{#each data.flags as f (`${f.targetType}:${f.targetId}`)}
					<div class="item">
						<span class="reasons"
							>{#each f.reasonLabels as r (r)}<span class="reason">{r}</span>{/each}</span
						>
						{#if f.targetType === 'skill'}<a class="t" href={`${base}/s/${f.targetId}`}>{f.title}</a
							>{:else}<a class="t" href={`/u/${f.targetId}`}>{f.title}</a>{/if}
						<span class="m"
							>{f.count} flag{f.count === 1 ? '' : 's'}{#if f.authorName}
								· by {f.authorName}{/if}{#if f.autoHidden}
								· <b>auto-hidden</b>{/if}</span
						>
						{#each f.details as d (d)}<span class="flagged-q">“{d}”</span>{/each}
						<div class="a">
							{#if f.targetType === 'skill'}
								{#if f.autoHidden}
									<form method="POST" action="?/dismiss">
										<input type="hidden" name="targetType" value="skill" /><input
											type="hidden"
											name="targetId"
											value={f.targetId}
										/><button class="btn btn--sm" type="submit">Keep hidden</button>
									</form>
									<form method="POST" action="?/restore">
										<input type="hidden" name="skillId" value={f.targetId} /><button
											class="btn btn--ghost btn--sm"
											type="submit">Restore</button
										>
									</form>
								{:else}
									<form method="POST" action="?/hide">
										<input type="hidden" name="skillId" value={f.targetId} /><button
											class="btn btn--sm"
											type="submit">Hide notice</button
										>
									</form>
									<form method="POST" action="?/dismiss">
										<input type="hidden" name="targetType" value="skill" /><input
											type="hidden"
											name="targetId"
											value={f.targetId}
										/><button class="btn btn--ghost btn--sm" type="submit">Dismiss</button>
									</form>
								{/if}
							{:else}
								<form method="POST" action="?/dismiss">
									<input type="hidden" name="targetType" value="user" /><input
										type="hidden"
										name="targetId"
										value={f.targetId}
									/><button class="btn btn--sm" type="submit">Dismiss</button>
								</form>
							{/if}
							{#if f.authorId}
								<form method="POST" action="?/ban">
									<input type="hidden" name="targetType" value={f.targetType} /><input
										type="hidden"
										name="targetId"
										value={f.targetId}
									/><input type="hidden" name="userId" value={f.authorId} /><button
										class="btn btn--red btn--sm"
										type="submit">Ban {f.authorName?.split(' ')[0] ?? ''}</button
									>
								</form>
							{/if}
						</div>
					</div>
				{/each}
			</div>
			<hr class="divider" />
			<span class="check">✓ {data.resolved} resolved this month</span>
		</div>
	</section>
</div>

<style>
	.mod {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: var(--s-6);
		align-items: start;
	}
	.clipboard {
		transform: rotate(var(--rot));
	}
	h2 {
		font-size: var(--fs-4);
		display: flex;
		align-items: center;
		gap: var(--s-2);
		margin-bottom: var(--s-3);
	}
	.queue {
		display: grid;
		gap: var(--s-3);
	}
	.item {
		padding: var(--s-3) 0;
		border-bottom: 1.5px dashed var(--pencil-light);
		display: grid;
		gap: var(--s-1);
	}
	.item:last-child {
		border-bottom: 0;
	}
	.t {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: var(--fs-3);
		color: var(--ink);
		text-decoration: none;
	}
	.m {
		font-size: 13px;
		color: var(--pencil);
	}
	.d {
		font-size: var(--fs-1);
		color: var(--ink-soft);
	}
	.a {
		display: flex;
		gap: var(--s-2);
		margin-top: var(--s-2);
		flex-wrap: wrap;
	}
	.reasons {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.reason {
		display: inline-block;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--red-pen);
		border: 1.5px solid var(--red-pen);
		padding: 2px 6px;
		border-radius: 2px;
	}
	.flagged-q {
		font-family: var(--font-hand);
		font-size: 1.2rem;
		color: var(--ink-soft);
	}
	.check {
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
		font-family: var(--font-hand);
		font-size: 1.15rem;
		color: var(--green-pen);
	}
	@media (max-width: 760px) {
		.mod {
			grid-template-columns: minmax(0, 1fr);
		}
		.clipboard {
			--rot: 0deg !important;
		}
	}
</style>
