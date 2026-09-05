<script lang="ts">
	import { pinFor, rotationFor } from '$lib/utils/rotation';
	let {
		card,
		href,
		tall = false
	}: {
		card: {
			id: string;
			kind: 'offer' | 'want';
			categoryName: string;
			title: string;
			description: string;
			format: string;
			status: string;
			availability: string | null;
			authorName: string;
			authorAvatar: string | null;
			isMine: boolean;
		};
		href: string;
		tall?: boolean;
	} = $props();
	const formatLabel: Record<string, string> = {
		in_person: 'In person',
		online: 'Online',
		either: 'Either'
	};
	const tape = ['tape--top', 'tape--tl', 'tape--tr'];
</script>

<a
	class="card card--{card.kind} {tall ? 'card--tall' : ''} {card.status === 'pending'
		? 'card--pending'
		: ''}"
	style="--rot:{rotationFor(card.id)}"
	{href}
>
	{#if card.kind === 'offer'}
		<span class="pin {pinFor(card.id)}" aria-hidden="true"></span>
	{:else}
		<span class="tape {tape[card.id.charCodeAt(0) % 3]}" aria-hidden="true"></span>
	{/if}
	<span class="stamp {card.kind === 'want' ? 'stamp--blue' : ''}"
		>{card.kind} · {card.categoryName}</span
	>
	<span class="card__title">{card.title}</span>
	<span class="card__desc"
		>{card.description.length > 140 ? card.description.slice(0, 137) + '…' : card.description}</span
	>
	{#if card.availability}<span class="hand" style="font-size:1.15rem">{card.availability}</span
		>{/if}
	<span class="card__meta">
		<span class="card__who">
			{#if card.authorAvatar}<img
					class="avatar"
					src={card.authorAvatar}
					alt=""
					width="26"
					height="26"
				/>{:else}<span class="avatar">{card.authorName.slice(0, 1)}</span>{/if}
			{card.isMine ? 'You' : card.authorName}
		</span>
		<span>{formatLabel[card.format] ?? card.format}</span>
	</span>
	{#if card.status === 'pending'}<span class="sticker sticker--sm sticker--corner">Pending</span
		>{/if}
</a>

<style>
	.card--pending {
		background: var(--paper-2);
		outline: 2px dashed var(--pencil-light);
		outline-offset: -6px;
	}
	img.avatar {
		object-fit: cover;
	}
</style>
