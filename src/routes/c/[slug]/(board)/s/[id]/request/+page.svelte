<script lang="ts">
	let { data, form } = $props();
	const base = $derived(`/c/${data.community.slug}`);
</script>

<p class="on-cork muted crumb">
	<a href={base}>{data.community.name}</a> ›
	<a href={`${base}/s/${data.target.id}`}>{data.target.title}</a> › Request
</p>
<form method="POST" class="index-card wrap">
	<h2>Ask {data.owner.first} for a swap</h2>
	<p class="muted" style="margin-bottom:var(--s-4)">
		{#if data.target.kind === 'offer'}You'd like to learn <b>{data.target.title}</b>.{:else}You can
			help with <b>{data.target.title}</b>.{/if}
		{#if data.theirWants.length}{data.owner.first} wants {#each data.theirWants as w, i (w.id)}{i
					? i === data.theirWants.length - 1
						? ' and '
						: ', '
					: ''}<b>{w.title}</b>{/each}. Pick something you can give back, or offer nothing and just
			ask nicely.{:else}{data.owner.first} hasn't pinned any wants yet, so just ask nicely.{/if}
	</p>
	<div class="field">
		<span class="label">What I'll teach in return</span>
		<div class="offer-pick">
			{#each data.myOffers as o (o.id)}
				<label
					><input type="radio" name="offer" value={o.id} checked={data.preselect === o.id} /><span
						><b>{o.title}</b><small
							>{o.matchesWant ? `Matches one of ${data.owner.first}'s wants` : 'Your offer'}</small
						></span
					></label
				>
			{/each}
			<label
				><input type="radio" name="offer" value="none" checked={!data.preselect} /><span
					><b>Nothing, just asking</b><small
						>That's allowed. {data.owner.first} can still say yes.</small
					></span
				></label
			>
		</div>
	</div>
	<div class="field">
		<label class="label" for="note">A short note</label>
		<textarea
			class="textarea"
			id="note"
			name="note"
			maxlength={data.noteMax}
			placeholder={`Hi ${data.owner.first}, I have a guitar gathering dust…`}
			>{form?.note ?? ''}</textarea
		>
		<span class="hint">{data.noteMax} characters max. Be specific about when you're free.</span>
	</div>
	{#if form?.error}<p class="error">{form.error}</p>{/if}
	<div class="row" style="justify-content:space-between">
		<button class="btn" type="submit">Send request</button>
		<span class="hand pencil" style="font-size:1.1rem"
			>contact details unlock after {data.owner.first} accepts</span
		>
	</div>
</form>

<style>
	.crumb {
		margin-bottom: var(--s-3);
	}
	.crumb a {
		color: #fff;
	}
	.wrap {
		max-width: 620px;
		--rot: 0.6deg;
		transform: rotate(var(--rot));
	}
	h2 {
		font-size: var(--fs-4);
		margin-bottom: var(--s-2);
	}
	.offer-pick {
		display: grid;
		gap: var(--s-2);
	}
	.offer-pick label {
		display: flex;
		gap: var(--s-2);
		align-items: flex-start;
		background: rgba(255, 255, 255, 0.5);
		padding: var(--s-2) var(--s-3);
		border-radius: 2px;
		border: 1.5px solid transparent;
	}
	.offer-pick label:has(:checked) {
		border-color: var(--ink);
		background: var(--paper);
	}
	.offer-pick input {
		accent-color: var(--ink);
		margin-top: 3px;
	}
	.offer-pick small {
		color: var(--pencil);
		display: block;
	}
</style>
