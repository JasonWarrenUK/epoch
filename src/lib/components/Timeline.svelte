<script>
	import EventCard from './EventCard.svelte';
	let { character, events } = $props();
</script>

<section class="timeline-section">
	<div class="character-header">
		<h2>{character.name}</h2>
		<p class="lifespan">
			{character.birthYear} &ndash; {character.deathYear}
			&middot; {character.location}
		</p>
		<p class="event-count">{events.length} historical events discovered</p>
	</div>

	{#if events.length > 0}
		<div class="timeline">
			{#each events as event (event.year + event.text.slice(0, 30))}
				<EventCard {event} />
			{/each}
		</div>
	{:else}
		<p class="no-events">No events found matching this lifetime and location. Try broadening the location (e.g. "England" instead of a specific town) or adjusting the years.</p>
	{/if}
</section>

<style>
	.timeline-section {
		margin-top: 2.5rem;
	}

	.character-header {
		text-align: center;
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-timeline);
	}

	.character-header h2 {
		font-family: var(--font-serif);
		font-size: 1.75rem;
		color: var(--color-accent);
		margin-bottom: 0.25rem;
	}

	.lifespan {
		color: var(--color-text-muted);
		font-size: 1rem;
	}

	.event-count {
		margin-top: 0.5rem;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.timeline {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		position: relative;
		padding-left: 6px;
	}

	.timeline::before {
		content: '';
		position: absolute;
		left: 6px;
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--color-timeline);
	}

	.no-events {
		text-align: center;
		color: var(--color-text-muted);
		padding: 2rem;
	}
</style>
