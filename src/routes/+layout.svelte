<script>
	import '../app.css';
	let { children } = $props();
</script>

<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-content">Skip to content</a>
<header class="navbar bg-base-200 border-b-2 border-secondary justify-center py-6">
	<a href="/" class="no-underline">
		<h1 class="text-3xl font-serif text-primary tracking-wide">Grand Chronicle</h1>
	</a>
</header>

<main id="main-content" class="max-w-[52rem] mx-auto px-4 py-8 min-h-[calc(100vh-12rem)]">
	{@render children()}
</main>

<footer class="footer footer-center py-6 px-4 text-sm text-neutral-content border-t border-neutral">
	<p>Grand Chronicle &mdash; Explore history through the eyes of fiction</p>
</footer>
