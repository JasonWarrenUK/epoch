<script>
	import CharacterForm from '$lib/components/CharacterForm.svelte';
	import Timeline from '$lib/components/Timeline.svelte';

	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Grand Chronicle</title>
	<meta name="description" content="Create fictional characters who experience real historical events." />
</svelte:head>

<section class="text-center mb-8">
	<img src="/banner.webp" alt="Grand Chronicle banner" class="w-full max-h-70 object-cover rounded-box mb-4 border border-neutral" />
	<p class="font-serif text-lg text-neutral-content max-w-[36rem] mx-auto leading-relaxed">
		Create fictional characters who experience real historical events.
		Discover the world they would have known.
	</p>
</section>

{#if form?.error}
	<div role="alert" class="alert alert-error mb-4">
		<span>{form.error}</span>
	</div>
{/if}

<CharacterForm
	{loading}
	onsubmit={() => loading = true}
	oncomplete={() => loading = false}
/>

{#if form?.character && form?.events}
	<Timeline character={form.character} events={form.events} />
{/if}
