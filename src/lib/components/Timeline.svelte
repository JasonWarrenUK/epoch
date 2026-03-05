<script>
	import EventCard from './EventCard.svelte';
	let { character, events } = $props();
</script>

<section class="mt-10">
	<div class="text-center mb-8 pb-6 border-b border-neutral">
		<h2 class="font-serif text-3xl text-primary mb-1">{character.name}</h2>
		<p class="text-neutral-content">
			{character.birthYear} &ndash; {character.deathYear}
			&middot; {character.location}
		</p>
		<p class="mt-2 text-sm text-neutral-content">{events.length} historical events discovered</p>
	</div>

	{#if events.length > 0}
		<ul class="timeline timeline-vertical timeline-compact">
			{#each events as event, i (event.year + event.text.slice(0, 30))}
				<li>
					{#if i > 0}<hr class="bg-neutral" />{/if}
					<div class="timeline-middle">
						<div class="w-3.5 h-3.5 rounded-full bg-primary ring-[3px] ring-base-200"></div>
					</div>
					<div class="timeline-end timeline-box bg-base-200 border-neutral">
						<EventCard {event} />
					</div>
					{#if i < events.length - 1}<hr class="bg-neutral" />{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-center text-neutral-content py-8">No events found matching this lifetime and location. Try broadening the location (e.g. "England" instead of a specific town) or adjusting the years.</p>
	{/if}
</section>
