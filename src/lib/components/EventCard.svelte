<script>
	let { event } = $props();
</script>

<div class="event-card">
	<div class="marker"></div>
	<div class="content">
		<div class="meta">
			<span class="year">{event.year}</span>
			{#if event.characterAge !== undefined}
				<span class="age">Age {event.characterAge}</span>
			{/if}
		</div>
		<p class="text">{event.text}</p>
		{#if event.pageUrl}
			<a href={event.pageUrl} target="_blank" rel="noopener noreferrer" class="link">
				Read more: {event.pageTitle}
			</a>
		{/if}
	</div>
</div>

<style>
	.event-card {
		display: flex;
		gap: 1.25rem;
		position: relative;
	}

	.marker {
		flex-shrink: 0;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--color-accent);
		border: 3px solid var(--color-surface);
		margin-top: 0.2rem;
		position: relative;
		z-index: 1;
	}

	.content {
		background: var(--color-surface);
		border: 1px solid var(--color-timeline);
		border-radius: 0.4rem;
		padding: 1rem 1.25rem;
		flex-grow: 1;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.4rem;
	}

	.year {
		font-family: var(--font-serif);
		font-weight: 700;
		font-size: 1.1rem;
		color: var(--color-accent);
	}

	.age {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		background: var(--color-bg);
		padding: 0.1rem 0.5rem;
		border-radius: 1rem;
	}

	.text {
		font-size: 0.95rem;
		line-height: 1.5;
		margin-bottom: 0.4rem;
	}

	.link {
		font-size: 0.8rem;
		color: var(--color-accent-dim);
	}
</style>
