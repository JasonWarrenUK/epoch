<script>
	let { event } = $props();

	const CATEGORY_STYLES = {
		conflict: 'bg-error/10 text-error',
		upheaval: 'bg-accent/15 text-accent',
		political: 'bg-primary/10 text-primary',
		disaster: 'bg-neutral/40 text-neutral-content',
		cultural: 'bg-secondary/10 text-secondary',
	};
</script>

<div class="bg-white rounded-lg p-4 sm:p-5 shadow-sm border border-base-300">
	<div class="flex flex-wrap items-center gap-3 mb-2">
		<span class="font-serif font-bold text-lg text-primary">{event.year}</span>
		{#if event.characterAge !== undefined}
			<span class="text-xs px-2 py-0.5 rounded-full bg-base-200 text-neutral-content">Age {event.characterAge}</span>
		{/if}
		{#if event.category}
			<span class="text-[0.65rem] uppercase tracking-wider px-2 py-0.5 rounded-full {CATEGORY_STYLES[event.category] ?? 'bg-base-200 text-neutral-content'}">{event.category}</span>
		{/if}
	</div>
	<p class="text-[0.95rem] leading-relaxed text-base-content mb-2">{event.text}</p>
	{#if event.pageUrl}
		<a href={event.pageUrl} target="_blank" rel="noopener noreferrer" class="text-sm text-secondary hover:underline">
			Read more: {event.pageTitle} <span class="sr-only">(opens in new tab)</span>
		</a>
	{/if}
</div>
