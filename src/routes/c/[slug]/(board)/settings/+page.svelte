<script lang="ts">
	let { data, form } = $props();
	const c = $derived(data.community);
	const fmt = (d: Date) =>
		new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
</script>

<div class="grid-2">
	<form method="POST" action="?/update" class="index-card">
		<h2>Board details</h2>
		<div class="field">
			<label class="label" for="name">Name</label><input
				class="input"
				id="name"
				name="name"
				value={c.name}
				maxlength="60"
				required
			/>
		</div>
		<div class="field">
			<label class="label" for="tagline">Tagline</label><input
				class="input"
				id="tagline"
				name="tagline"
				value={c.tagline ?? ''}
				maxlength="140"
			/>
		</div>
		<div class="field">
			<label class="label" for="areaLabel">Area label</label><input
				class="input"
				id="areaLabel"
				name="areaLabel"
				value={c.areaLabel ?? ''}
				maxlength="80"
			/>
		</div>
		<div class="field">
			<label class="label" for="description">Description</label><textarea
				class="textarea"
				id="description"
				name="description"
				maxlength="1000">{c.description ?? ''}</textarea
			>
		</div>
		<div class="field">
			<span class="label">Visibility</span>
			<div class="row" style="gap: var(--s-4); font-size: var(--fs-1)">
				<label
					><input
						type="radio"
						name="visibility"
						value="public"
						checked={c.visibility === 'public'}
					/> Public</label
				>
				<label
					><input
						type="radio"
						name="visibility"
						value="invite"
						checked={c.visibility === 'invite'}
					/> Invite only</label
				>
			</div>
		</div>
		{#if form?.update?.error}<p class="error">{form.update.error}</p>{/if}
		<div class="row">
			<button class="btn btn--sm" type="submit">Save</button>{#if form?.update?.saved}<span
					class="hand"
					style="color:var(--green-pen)">saved ✓</span
				>{/if}
		</div>
	</form>

	<div class="stack">
		<section class="paper">
			<h2>Invite links</h2>
			<p class="muted">
				Each link works for 14 days. Use these for invite-only boards, or to bring friends in fast.
			</p>
			{#if form?.invite?.url}
				<p class="label" style="margin-top: var(--s-3)">New link, copy it now:</p>
				<code class="slip" data-testid="invite-url">{form.invite.url}</code>
			{/if}
			<form method="POST" action="?/invite" class="row" style="margin-top: var(--s-3)">
				<label class="muted" for="maxUses">Max uses</label>
				<input
					class="input"
					id="maxUses"
					name="maxUses"
					type="number"
					min="1"
					max="500"
					value="25"
					style="max-width: 90px"
				/>
				<button class="btn btn--sm" type="submit">Make invite link</button>
			</form>
			{#if data.invites.length}
				<ul class="invites">
					{#each data.invites as i (i.id)}
						<li>
							<span>{i.usedCount}/{i.maxUses} used · expires {fmt(i.expiresAt)}</span>
							<form method="POST" action="?/revoke">
								<input type="hidden" name="inviteId" value={i.id} /><button
									class="link"
									type="submit">Revoke</button
								>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="paper">
			<h2>Hand over the board</h2>
			{#if data.moderators.length}
				<form method="POST" action="?/transfer" class="row">
					<select class="select" name="userId" aria-label="New owner" style="max-width: 240px">
						{#each data.moderators as m (m.userId)}<option value={m.userId}>{m.name}</option>{/each}
					</select>
					<button class="btn btn--sm btn--paper" type="submit">Make them owner</button>
				</form>
				{#if form?.transfer?.error}<p class="error">{form.transfer.error}</p>{/if}
			{:else}
				<p class="muted">Promote someone to moderator on the Members page first.</p>
			{/if}
		</section>

		<form method="POST" action="?/delete" class="paper danger">
			<h2>Take the board down</h2>
			<p class="muted">Hides the board and every notice on it. Type <b>{c.slug}</b> to confirm.</p>
			<div class="row" style="margin-top: var(--s-3)">
				<input
					class="input"
					name="confirm"
					aria-label="Type the slug to confirm"
					style="max-width: 220px"
				/>
				<button class="btn btn--red btn--sm" type="submit">Delete board</button>
			</div>
			{#if form?.del?.error}<p class="error">{form.del.error}</p>{/if}
		</form>
	</div>
</div>

<style>
	h2 {
		font-size: var(--fs-4);
		margin-bottom: var(--s-2);
	}
	.danger {
		border-left: 6px solid var(--red-pen);
	}
	.invites {
		list-style: none;
		padding: 0;
		margin: var(--s-3) 0 0;
		display: grid;
		gap: var(--s-2);
		font-size: var(--fs-1);
	}
	.invites li {
		display: flex;
		justify-content: space-between;
		gap: var(--s-3);
		border-bottom: 1px dashed var(--lined-rule);
		padding-bottom: 4px;
	}
	.link {
		background: none;
		border: 0;
		padding: 0;
		font: inherit;
		color: var(--red-pen);
		text-decoration: underline;
		cursor: pointer;
	}
	code.slip {
		display: block;
		word-break: break-all;
		margin-top: var(--s-2);
	}
</style>
