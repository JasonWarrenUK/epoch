<script>
	import '../app.css';
	let { children } = $props();
</script>

<header>
	<a href="/">
		<h1>Grand Chronicle</h1>
	</a>
</header>

<main>
	{@render children()}
</main>

<footer>
	<p>Grand Chronicle &mdash; Explore history through the eyes of fiction</p>
</footer>

<style>
	header {
		text-align: center;
		padding: 1.5rem 1rem;
		background: var(--color-surface);
		border-bottom: 2px solid var(--color-accent-dim);
	}

	header a {
		text-decoration: none;
	}

	header h1 {
		font-family: var(--font-serif);
		font-size: 2rem;
		color: var(--color-accent);
		letter-spacing: 0.05em;
	}

	main {
		max-width: 52rem;
		margin: 0 auto;
		padding: 2rem 1rem;
		min-height: calc(100vh - 12rem);
	}

	footer {
		text-align: center;
		padding: 1.5rem 1rem;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		border-top: 1px solid var(--color-timeline);
	}
</style>
