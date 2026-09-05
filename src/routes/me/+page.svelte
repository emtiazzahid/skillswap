<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>Your name tag — SkillSwap</title></svelte:head>

<main class="container page">
	<div class="page-head">
		<div class="grow">
			<h1 class="on-cork">Your name tag</h1>
			<span class="hand" style="color:var(--highlighter);font-size:1.4rem"
				>neighbors see you as “{data.publicName}”</span
			>
		</div>
		<form method="POST" action="/auth/logout">
			<button class="btn btn--paper btn--sm" type="submit">Sign out</button>
		</form>
	</div>

	<div class="grid-2">
		<form method="POST" action="?/profile" class="index-card">
			<h2>Name and bio</h2>
			<div class="field">
				<label class="label" for="displayName">Display name</label>
				<input
					class="input"
					id="displayName"
					name="displayName"
					value={data.displayName}
					maxlength="40"
					required
				/>
				{#if form?.profile?.error}<span class="error">{form.profile.error}</span>{/if}
			</div>
			<div class="field">
				<label class="label" for="bio">One line about you</label>
				<input class="input" id="bio" name="bio" value={data.bio} maxlength="280" />
			</div>
			<div class="row">
				<button class="btn btn--sm" type="submit">Save</button>{#if form?.profile?.saved}<span
						class="hand"
						style="color:var(--green-pen)">saved ✓</span
					>{/if}
			</div>
		</form>

		<form method="POST" action="?/contact" class="index-card">
			<h2>Contact method</h2>
			<p class="muted" style="margin-bottom: var(--s-3)">
				{#if data.contactLabel}Currently: <b>{data.contactLabel}</b> (hidden). Enter a new value to replace
					it.{:else}Not set yet.{/if}
			</p>
			<div class="field">
				<div class="row">
					<select
						class="select"
						name="contactKind"
						aria-label="Contact method"
						style="max-width: 180px"
					>
						{#each data.kinds as k (k.id)}<option value={k.id} selected={data.contactKind === k.id}
								>{k.label}</option
							>{/each}
					</select>
					<input
						class="input"
						name="contactValue"
						placeholder="@handle, number or email"
						maxlength="120"
						required
						aria-label="Contact detail"
						style="flex: 1"
					/>
				</div>
				{#if form?.contact?.error}<span class="error">{form.contact.error}</span>{/if}
			</div>
			<div class="row">
				<button class="btn btn--sm" type="submit">Save contact</button
				>{#if form?.contact?.saved}<span class="hand" style="color:var(--green-pen)">saved ✓</span
					>{/if}
			</div>
		</form>
	</div>

	<form method="POST" action="?/delete" class="paper danger">
		<h2>Leave the board</h2>
		<p class="muted">
			Deletes your account, notices and requests for good. Thank-you notes you wrote stay, signed
			“former member”.
		</p>
		<div class="row" style="margin-top: var(--s-3)">
			<input
				class="input"
				name="confirm"
				placeholder="type delete"
				aria-label="Type delete to confirm"
				style="max-width: 180px"
			/>
			<button class="btn btn--red btn--sm" type="submit">Delete my account</button>
			{#if form?.del?.error}<span class="error">{form.del.error}</span>{/if}
		</div>
	</form>
</main>

<style>
	h1 {
		color: var(--paper);
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
	}
	h2 {
		font-size: var(--fs-4);
		margin-bottom: var(--s-3);
	}
	.danger {
		margin-top: var(--s-6);
		border-left: 6px solid var(--red-pen);
	}
</style>
