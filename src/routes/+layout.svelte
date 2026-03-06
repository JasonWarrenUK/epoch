<script>
	import '../app.css';
	let { children } = $props();
</script>

<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-content">Skip to content</a>
<header class="py-10 text-center border-b border-base-300">
	<a href="/" class="no-underline">
		<h1 class="text-4xl font-serif text-primary tracking-widest">Epoch</h1>
	</a>
</header>

<main id="main-content" class="max-w-[60rem] mx-auto px-6 py-12 min-h-[calc(100vh-14rem)]">
	{@render children()}
</main>

<footer class="py-8 px-4 text-center border-t border-base-300">
	<p class="font-serif text-sm italic text-neutral-content">Explore history through the eyes of fiction</p>
</footer>
