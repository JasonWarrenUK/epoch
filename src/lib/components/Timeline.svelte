<script>
	import EventCard from './EventCard.svelte';
	let { character, events } = $props();

	const TOP_N = 5;

	let expandedDecades = $state(new Set());
	let expandedYears = $state(new Set());
	let showAllDecades = $state(new Set());

	const pinnedYears = $derived(new Set([
		character.birthYear,
		character.birthYear + 18,
		character.deathYear,
	]));

	// Group events by decade, then by year, sorted by significance
	// Pinned years (birth, 18th birthday, death) always appear in top
	let decades = $derived.by(() => {
		/** @type {Map<number, import('$lib/types.js').HistoricalEvent[]>} */
		const decadeMap = new Map();

		for (const event of events) {
			const decade = Math.floor(event.year / 10) * 10;
			if (!decadeMap.has(decade)) decadeMap.set(decade, []);
			decadeMap.get(decade).push(event);
		}

		return [...decadeMap.entries()]
			.sort(([a], [b]) => a - b)
			.map(([decade, decadeEvents]) => {
				// Sort by significance descending, then year ascending as tiebreaker
				const sorted = [...decadeEvents].sort((a, b) =>
					(b.significance ?? 0) - (a.significance ?? 0) || a.year - b.year
				);

				// Pinned events go to top regardless of score
				/** @type {import('$lib/types.js').HistoricalEvent[]} */
				const top = [];
				/** @type {import('$lib/types.js').HistoricalEvent[]} */
				const rest = [];
				const pinnedInTop = new Set();

				for (const event of sorted) {
					if (pinnedYears.has(event.year) && !pinnedInTop.has(event.year)) {
						top.push(event);
						pinnedInTop.add(event.year);
					} else if (top.length < TOP_N) {
						top.push(event);
					} else {
						rest.push(event);
					}
				}

				// Group events by year for display
				const groupByYear = (/** @type {import('$lib/types.js').HistoricalEvent[]} */ evts) => {
					/** @type {Map<number, import('$lib/types.js').HistoricalEvent[]>} */
					const yearMap = new Map();
					for (const e of evts) {
						if (!yearMap.has(e.year)) yearMap.set(e.year, []);
						yearMap.get(e.year).push(e);
					}
					return [...yearMap.entries()]
						.sort(([a], [b]) => a - b)
						.map(([year, yearEvents]) => ({ year, events: yearEvents }));
				};

				// Age range for this decade (based on decade span, clamped to lifespan)
				const minAge = Math.max(decade, character.birthYear) - character.birthYear;
				const maxAge = Math.min(decade + 9, character.deathYear) - character.birthYear;

				return {
					decade,
					topYears: groupByYear(top),
					restYears: groupByYear(rest),
					topCount: top.length,
					restCount: rest.length,
					eventCount: decadeEvents.length,
					ageRange: minAge === maxAge ? `age ${minAge}` : `ages ${minAge}–${maxAge}`,
				};
			});
	});

	function toggleDecade(decade) {
		expandedDecades = new Set(expandedDecades);
		if (expandedDecades.has(decade)) {
			expandedDecades.delete(decade);
		} else {
			expandedDecades.add(decade);
		}
	}

	function toggleYear(year) {
		expandedYears = new Set(expandedYears);
		if (expandedYears.has(year)) {
			expandedYears.delete(year);
		} else {
			expandedYears.add(year);
		}
	}

	function toggleShowAll(decade) {
		showAllDecades = new Set(showAllDecades);
		if (showAllDecades.has(decade)) {
			showAllDecades.delete(decade);
		} else {
			showAllDecades.add(decade);
		}
	}

	function expandAll() {
		expandedDecades = new Set(decades.map(d => d.decade));
		const allYears = decades.flatMap(d => [...d.topYears, ...d.restYears].map(y => y.year));
		expandedYears = new Set(allYears);
	}

	function collapseAll() {
		expandedDecades = new Set();
		expandedYears = new Set();
		showAllDecades = new Set();
	}

	function isSpecialYear(year) {
		return year === character.birthYear || year === character.deathYear;
	}
</script>

<section class="mt-10 animate-fade-in">
	<div class="text-center mb-10 pb-8 border-b border-base-300">
		<h2 class="font-serif text-4xl text-primary mb-2">{character.name}</h2>
		<p class="text-neutral-content text-lg">
			{character.birthYear} &ndash; {character.deathYear}
			&middot; {character.location}
		</p>
		<p class="mt-3 text-sm text-neutral-content">{events.length} historical events discovered</p>
		{#if events.length > 0}
			<div class="mt-4 flex justify-center gap-4">
				<button type="button" class="text-xs text-secondary hover:underline cursor-pointer" onclick={expandAll}>Expand all</button>
				<button type="button" class="text-xs text-secondary hover:underline cursor-pointer" onclick={collapseAll}>Collapse all</button>
			</div>
		{/if}
	</div>

	{#if events.length > 0}
		<div class="relative pl-8" aria-label="Historical events timeline">
			<!-- Vertical connecting line -->
			<div class="absolute left-3 top-0 bottom-0 w-px border-l-2 border-dashed border-neutral"></div>

			{#each decades as { decade, topYears, restYears, topCount, restCount, eventCount, ageRange }, di}
				<div class="relative mb-6">
					<!-- Decade dot -->
					<div class="absolute -left-5 top-1 w-4 h-4 rounded-full bg-primary shadow-sm"></div>

					<!-- Decade header -->
					<button
						type="button"
						class="w-full flex items-center gap-4 cursor-pointer group"
						onclick={() => toggleDecade(decade)}
						aria-expanded={expandedDecades.has(decade)}
					>
						<h3 class="font-serif text-2xl text-primary">{decade}s</h3>
						<div class="flex-1 h-px bg-base-300"></div>
						<span class="text-xs text-neutral-content">
							{ageRange} &middot;
							{#if restCount > 0}
								top {topCount} of {eventCount} event{eventCount !== 1 ? 's' : ''}
							{:else}
								{eventCount} event{eventCount !== 1 ? 's' : ''}
							{/if}
						</span>
						<svg
							class="w-4 h-4 text-neutral-content transition-transform duration-200"
							class:rotate-180={expandedDecades.has(decade)}
							fill="none" stroke="currentColor" viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					<!-- Years within decade -->
					{#if expandedDecades.has(decade)}
						<div class="mt-4 ml-4 space-y-4 animate-collapse-open">
							{#snippet yearList(years)}
								{#each years as { year, events: yearEvents }}
									<div class="relative">
										<!-- Year dot -->
										<div class="absolute -left-7 top-1.5 w-2.5 h-2.5 rounded-full {isSpecialYear(year) ? 'bg-accent ring-2 ring-accent/30' : 'bg-neutral'}"></div>

										<!-- Year header -->
										<button
											type="button"
											class="w-full flex items-center gap-3 cursor-pointer"
											onclick={() => toggleYear(year)}
											aria-expanded={expandedYears.has(year)}
										>
											<span class="font-serif text-lg {isSpecialYear(year) ? 'text-accent font-bold' : 'text-base-content'}">{year}</span>
											{#if year === character.birthYear}
												<span class="text-xs font-sans text-accent italic">born</span>
											{:else if year === character.deathYear}
												<span class="text-xs font-sans text-accent italic">died, age {year - character.birthYear}</span>
											{:else}
												<span class="text-xs text-neutral-content">age {year - character.birthYear}</span>
											{/if}
											<span class="text-xs text-neutral-content">{yearEvents.length} event{yearEvents.length !== 1 ? 's' : ''}</span>
											<svg
												class="w-3.5 h-3.5 text-neutral-content transition-transform duration-200"
												class:rotate-180={expandedYears.has(year)}
												fill="none" stroke="currentColor" viewBox="0 0 24 24"
											>
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
											</svg>
										</button>

										<!-- Events within year -->
										{#if expandedYears.has(year)}
											<div class="mt-3 ml-6 space-y-3 animate-collapse-open">
												{#each yearEvents as event}
													<EventCard {event} />
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							{/snippet}

							{@render yearList(topYears)}

							{#if restCount > 0}
								<button
									type="button"
									class="ml-1 text-xs text-secondary hover:underline cursor-pointer"
									onclick={() => toggleShowAll(decade)}
								>
									{#if showAllDecades.has(decade)}
										Show fewer
									{:else}
										Show {restCount} more event{restCount !== 1 ? 's' : ''}
									{/if}
								</button>

								{#if showAllDecades.has(decade)}
									<div class="space-y-4 animate-collapse-open">
										{@render yearList(restYears)}
									</div>
								{/if}
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-center text-neutral-content py-12">No events found matching this lifetime and location. Try broadening the location (e.g. "England" instead of a specific town) or adjusting the years.</p>
	{/if}
</section>
