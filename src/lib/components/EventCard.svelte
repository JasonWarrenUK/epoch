<script>
	let { event } = $props();
</script>

<div>
	<div class="flex items-center gap-3 mb-1">
		<span class="font-serif font-bold text-lg text-primary">{event.year}</span>
		{#if event.characterAge !== undefined}
			<span class="badge badge-sm bg-base-100 text-neutral-content border-none">Age {event.characterAge}</span>
		{/if}
	</div>
	<p class="text-[0.95rem] leading-relaxed mb-1">{event.text}</p>
	{#if event.pageUrl}
		<a href={event.pageUrl} target="_blank" rel="noopener noreferrer" class="text-sm text-secondary hover:underline">
			Read more: {event.pageTitle} <span class="sr-only">(opens in new tab)</span>
		</a>
	{/if}
</div>
