<script>
	import { enhance } from '$app/forms';
	let { loading = false, onsubmit, oncomplete } = $props();
</script>

<form method="POST" class="character-form" use:enhance={() => {
	onsubmit?.();
	return async ({ update }) => {
		await update();
		oncomplete?.();
	};
}}>
	<h2>Create Your Character</h2>
	<p class="subtitle">Give your character a name and a lifetime, and discover the history they would have lived through.</p>

	<div class="fields">
		<div class="field full">
			<label for="name">Character Name</label>
			<input type="text" id="name" name="name" required placeholder="e.g. Eleanor Ashworth" />
		</div>

		<div class="field">
			<label for="birthYear">Born</label>
			<input type="number" id="birthYear" name="birthYear" required min="1" max="2025" placeholder="e.g. 1820" />
		</div>

		<div class="field">
			<label for="deathYear">Died</label>
			<input type="number" id="deathYear" name="deathYear" required min="1" max="2025" placeholder="e.g. 1895" />
		</div>

		<div class="field full">
			<label for="location">Location <span class="optional">(optional)</span></label>
			<input type="text" id="location" name="location" placeholder="e.g. London, England" />
		</div>
	</div>

	<button type="submit" disabled={loading}>
		{loading ? 'Consulting the archives…' : 'Chronicle This Life'}
	</button>
</form>

<style>
	.character-form {
		background: var(--color-surface);
		border: 1px solid var(--color-timeline);
		border-radius: 0.5rem;
		padding: 2rem;
	}

	h2 {
		font-family: var(--font-serif);
		color: var(--color-accent);
		font-size: 1.5rem;
		margin-bottom: 0.25rem;
	}

	.subtitle {
		color: var(--color-text-muted);
		font-size: 0.9rem;
		margin-bottom: 1.5rem;
	}

	.fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.field.full {
		grid-column: 1 / -1;
	}

	label {
		display: block;
		font-size: 0.85rem;
		font-weight: 600;
		margin-bottom: 0.3rem;
		color: var(--color-text);
	}

	.optional {
		font-weight: 400;
		color: var(--color-text-muted);
	}

	input {
		width: 100%;
		padding: 0.6rem 0.75rem;
		background: var(--color-bg);
		border: 1px solid var(--color-timeline);
		border-radius: 0.3rem;
		color: var(--color-text);
		font-size: 0.95rem;
		font-family: var(--font-sans);
	}

	input::placeholder {
		color: var(--color-text-muted);
		opacity: 0.5;
	}

	input:focus {
		outline: none;
		border-color: var(--color-accent);
	}

	button {
		width: 100%;
		padding: 0.75rem;
		background: var(--color-accent);
		color: var(--color-bg);
		border: none;
		border-radius: 0.3rem;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		font-family: var(--font-serif);
		letter-spacing: 0.03em;
	}

	button:hover:not(:disabled) {
		background: var(--color-accent-dim);
	}

	button:disabled {
		opacity: 0.6;
		cursor: wait;
	}
</style>
