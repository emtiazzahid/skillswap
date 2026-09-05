<script lang="ts">
	let { data, form } = $props();
	const fmt = (d: Date) =>
		new Date(d).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
</script>

<section class="clipboard members">
	<div class="clipboard__paper">
		<h2>Members <span class="chip">{data.counts.members}</span></h2>
		{#if form?.message}<p class="error">{form.message}</p>{/if}
		{#if form?.left}<p class="hand" style="color:var(--green-pen)">You left the board.</p>{/if}
		<div class="table-wrap">
			<table>
				<thead
					><tr
						><th>Member</th><th>Role</th><th>Notices</th><th>Swaps</th><th>Joined</th
						>{#if data.canModerate || data.isMember}<th><span class="sr-only">Actions</span></th
							>{/if}</tr
					></thead
				>
				<tbody>
					{#each data.members as m (m.userId)}
						<tr class:banned={!!m.bannedAt}>
							<td
								><a class="row who" href={`/u/${m.userId}`} style="gap: var(--s-2)"
									><span class="avatar">{m.name.slice(0, 1)}</span>
									{m.name}{#if m.isSelf}<span class="muted">(you)</span>{/if}</a
								></td
							>
							<td>
								{#if m.bannedAt}<span class="role">Removed</span>
								{:else if m.role === 'owner'}<span class="role role--owner">Owner</span>
								{:else if m.role === 'moderator'}<span class="role role--mod">Moderator</span>
								{:else}<span class="role"
										>Member{#if m.trustedAt}
											· trusted{/if}</span
									>{/if}
							</td>
							<td>{m.notices}</td>
							<td>{m.swaps}</td>
							<td>{fmt(m.joinedAt)}</td>
							{#if data.canModerate || data.isMember}
								<td class="actions">
									{#if data.canModerate && !m.isSelf && m.role !== 'owner'}
										{#if m.bannedAt}
											<form method="POST" action="?/unban">
												<input type="hidden" name="userId" value={m.userId} /><button
													class="link"
													type="submit">Unban</button
												>
											</form>
										{:else}
											{#if data.isOwner}
												{#if m.role === 'moderator'}
													<form method="POST" action="?/demote">
														<input type="hidden" name="userId" value={m.userId} /><button
															class="link"
															type="submit">Remove mod</button
														>
													</form>
												{:else}
													<form method="POST" action="?/promote">
														<input type="hidden" name="userId" value={m.userId} /><button
															class="link"
															type="submit">Make mod</button
														>
													</form>
												{/if}
											{/if}
											{#if data.isOwner || m.role === 'member'}
												<form method="POST" action="?/ban">
													<input type="hidden" name="userId" value={m.userId} /><button
														class="link danger"
														type="submit">Ban</button
													>
												</form>
											{/if}
										{/if}
									{:else if m.isSelf && m.role !== 'owner'}
										<form method="POST" action="?/leave">
											<button class="link" type="submit">Leave board</button>
										</form>
									{/if}
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>

<style>
	.members {
		--rot: 0deg;
	}
	h2 {
		font-size: var(--fs-4);
		display: flex;
		align-items: center;
		gap: var(--s-2);
		margin-bottom: var(--s-3);
	}
	.table-wrap {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--fs-1);
		min-width: 560px;
	}
	th {
		text-align: left;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--pencil);
		padding: 6px 8px;
		border-bottom: 1.5px solid var(--pencil-light);
	}
	td {
		padding: 8px;
		border-bottom: 1px dashed var(--lined-rule);
		vertical-align: middle;
	}
	.who {
		color: var(--ink);
		text-decoration: none;
	}
	.role {
		font-size: 11px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 2px;
		background: var(--paper-2);
		white-space: nowrap;
	}
	.role--owner {
		background: var(--ink);
		color: var(--paper);
	}
	.role--mod {
		background: var(--tape);
	}
	.banned td {
		color: var(--pencil);
	}
	.banned .who {
		text-decoration: line-through;
	}
	.actions {
		display: flex;
		gap: var(--s-3);
	}
	.link {
		background: none;
		border: 0;
		padding: 0;
		font: inherit;
		color: var(--blue-pen);
		text-decoration: underline;
		cursor: pointer;
	}
	.link.danger {
		color: var(--red-pen);
	}
</style>
