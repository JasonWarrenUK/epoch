<script>
	import CharacterForm from '$lib/components/CharacterForm.svelte';
	import Timeline from '$lib/components/Timeline.svelte';

	let { form } = $props();
	let loading = $state(false);
	let hasResults = $derived(form?.character && form?.events);
</script>

<svelte:head>
	<title>Epoch</title>
	<meta name="description" content="Create fictional characters who experience real historical events." />
</svelte:head>

{#if !hasResults}
	<section class="max-w-[40rem] mx-auto text-center mb-12 animate-fade-in">
		<p class="font-serif text-xl text-neutral-content leading-relaxed">
			Create fictional characters who experience real historical events.
			Discover the world they would have known.
		</p>
	</section>
{/if}

{#if form?.error}
	<div role="alert" class="alert alert-error mb-6 max-w-[40rem] mx-auto">
		<span>{form.error}</span>
	</div>
{/if}

<div class={hasResults ? 'max-w-[40rem] mx-auto mb-12' : 'max-w-[40rem] mx-auto'}>
	<CharacterForm
		{loading}
		{form}
		collapsed={hasResults}
		onsubmit={() => loading = true}
		oncomplete={() => loading = false}
	/>
</div>

{#if hasResults}
	<Timeline character={form.character} events={form.events} />
{/if}
