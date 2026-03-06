<script>
	let { event } = $props();
</script>

<div class="bg-white rounded-lg p-5 shadow-sm border border-base-300">
	<div class="flex items-center gap-3 mb-2">
		<span class="font-serif font-bold text-lg text-primary">{event.year}</span>
		{#if event.characterAge !== undefined}
			<span class="text-xs px-2 py-0.5 rounded-full bg-base-200 text-neutral-content">Age {event.characterAge}</span>
		{/if}
	</div>
	<p class="text-[0.95rem] leading-relaxed text-base-content mb-2">{event.text}</p>
	{#if event.pageUrl}
		<a href={event.pageUrl} target="_blank" rel="noopener noreferrer" class="text-sm text-secondary hover:underline">
			Read more: {event.pageTitle} <span class="sr-only">(opens in new tab)</span>
		</a>
	{/if}
</div>
