<!-- Decorative collage of sample notices for the landing hero. Static content, no data. -->
<div class="hero__cards" aria-label="Sample notices">
	<div class="card card--offer" style="--rot:-3deg; left:0; top:0">
		<span class="pin" aria-hidden="true"></span>
		<span class="stamp">Offer · Music</span>
		<span class="card__title">Guitar chords for total beginners</span>
		<span class="card__desc">Four chords, twenty songs. Bring any guitar, I have a spare.</span>
		<span class="card__meta"
			><span class="card__who"><span class="avatar">R</span>Rina S.</span><span
				>Online or in person</span
			></span
		>
	</div>
	<div class="card card--want" style="--rot:2.5deg; right:0; top:60px">
		<span class="tape tape--top" aria-hidden="true"></span>
		<span class="stamp stamp--blue">Want · Tech</span>
		<span class="card__title">Excel that doesn't scare me</span>
		<span class="card__desc">Pivot tables. VLOOKUP. Whatever a macro is.</span>
		<span class="card__meta"
			><span class="card__who"><span class="avatar">T</span>Tanvir A.</span><span>Evenings</span
			></span
		>
	</div>
	<div class="card card--offer" style="--rot:1.5deg; left:20px; top:300px">
		<span class="pin pin--green" aria-hidden="true"></span>
		<span class="stamp stamp--green">Offer · Cooking</span>
		<span class="card__title">Sourdough from scratch</span>
		<span class="card__desc">Starter included. One Saturday, two loaves.</span>
		<span class="card__meta"
			><span class="card__who"><span class="avatar">M</span>Maya K.</span><span>In person</span
			></span
		>
	</div>
	<div class="card card--want" style="--rot:-1.5deg; right:30px; top:320px">
		<span class="tape tape--tl" aria-hidden="true"></span>
		<span class="stamp stamp--blue">Want · Languages</span>
		<span class="card__title">Korean for K-drama</span>
		<span class="card__desc">I can already say "saranghae". Need the rest.</span>
		<span class="card__meta"
			><span class="card__who"><span class="avatar">J</span>Joy P.</span><span>Online</span></span
		>
	</div>
</div>

<style>
	.hero__cards {
		position: relative;
		height: 520px;
	}
	.hero__cards :global(.card) {
		position: absolute;
		width: 230px;
	}
	@media (max-width: 900px) {
		.hero__cards {
			height: auto;
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: var(--s-5) var(--s-3);
			padding-top: var(--s-3);
		}
		.hero__cards :global(.card) {
			position: static;
			width: auto;
			--rot: 0deg !important;
		}
	}
	@media (max-width: 480px) {
		.hero__cards {
			grid-template-columns: 1fr;
		}
	}
</style>
