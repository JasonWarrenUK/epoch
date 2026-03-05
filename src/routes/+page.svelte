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

<section class="hero">
	<img src="/banner.webp" alt="Grand Chronicle banner" class="banner" />
	<p class="tagline">
		Create fictional characters who experience real historical events.
		Discover the world they would have known.
	</p>
</section>

{#if form?.error}
	<div class="error">{form.error}</div>
{/if}

<CharacterForm
	{loading}
	onsubmit={() => loading = true}
	oncomplete={() => loading = false}
/>

{#if form?.character && form?.events}
	<Timeline character={form.character} events={form.events} />
{/if}

<style>
	.hero {
		text-align: center;
		margin-bottom: 2rem;
	}

	.banner {
		width: 100%;
		max-height: 280px;
		object-fit: cover;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
		border: 1px solid var(--color-timeline);
	}

	.tagline {
		font-family: var(--font-serif);
		font-size: 1.1rem;
		color: var(--color-text-muted);
		max-width: 36rem;
		margin: 0 auto;
		line-height: 1.6;
	}

	.error {
		background: #3a1111;
		border: 1px solid #7a2222;
		color: #ff8888;
		padding: 0.75rem 1rem;
		border-radius: 0.3rem;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}
</style>
