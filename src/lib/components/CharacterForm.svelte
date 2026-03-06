<script>
	import { enhance } from '$app/forms';
	let { loading = false, form = null, collapsed = false, onsubmit, oncomplete } = $props();
	let validationError = $state('');
	let isCollapsed = $state(false);

	$effect(() => {
		isCollapsed = collapsed;
	});
</script>

{#if isCollapsed}
	<button
		type="button"
		class="w-full text-left px-6 py-4 bg-white rounded-lg shadow-sm border border-base-300 hover:shadow-md transition-shadow cursor-pointer"
		onclick={() => isCollapsed = false}
	>
		<div class="flex items-center justify-between">
			<span class="font-serif text-lg text-primary">Edit Character</span>
			<svg class="w-5 h-5 text-neutral-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>
	</button>
{:else}
	<form method="POST" action="/" class="bg-white rounded-lg shadow-sm border border-base-300 animate-fade-in" use:enhance={({ cancel, formElement }) => {
		const birth = Number(formElement.querySelector('[name="birthYear"]')?.value);
		const death = Number(formElement.querySelector('[name="deathYear"]')?.value);
		if (birth && death && death <= birth) {
			validationError = 'Death year must be after birth year.';
			cancel();
			return;
		}
		validationError = '';
		onsubmit?.();
		return async ({ update }) => {
			await update();
			oncomplete?.();
		};
	}}>
		<div class="p-8">
			<h2 class="font-serif text-primary text-2xl mb-1">Create Your Character</h2>
			<p class="text-sm text-neutral-content mb-8">Give your character a name and a lifetime, and discover the history they would have lived through.</p>

			<div class="grid grid-cols-2 gap-6 mb-6">
				<div class="col-span-2">
					<label for="name" class="block text-xs font-semibold tracking-wider uppercase text-neutral-content mb-2">Character Name</label>
					<input type="text" id="name" name="name" required placeholder="e.g. Eleanor Ashworth" value={form?.name ?? ''} class="input w-full bg-base-100 border-base-300 focus:border-primary focus:outline-none" />
				</div>

				<div>
					<label for="birthYear" class="block text-xs font-semibold tracking-wider uppercase text-neutral-content mb-2">Born</label>
					<input type="number" id="birthYear" name="birthYear" required min="1" max="2025" placeholder="e.g. 1820" value={form?.birthYear ?? ''} class="input w-full bg-base-100 border-base-300 focus:border-primary focus:outline-none" />
				</div>

				<div>
					<label for="deathYear" class="block text-xs font-semibold tracking-wider uppercase text-neutral-content mb-2">Died</label>
					<input type="number" id="deathYear" name="deathYear" required min="1" max="2025" placeholder="e.g. 1895" value={form?.deathYear ?? ''} class="input w-full bg-base-100 border-base-300 focus:border-primary focus:outline-none" />
				</div>

				<div class="col-span-2">
					<label for="location" class="block text-xs font-semibold tracking-wider uppercase text-neutral-content mb-2">Location</label>
					<input type="text" id="location" name="location" required placeholder="e.g. London, England" value={form?.location ?? ''} list="location-suggestions" class="input w-full bg-base-100 border-base-300 focus:border-primary focus:outline-none" />
					<datalist id="location-suggestions">
						<option value="London, England"></option>
						<option value="Paris, France"></option>
						<option value="Rome, Italy"></option>
						<option value="Berlin, Germany"></option>
						<option value="Vienna, Austria"></option>
						<option value="Moscow, Russia"></option>
						<option value="Constantinople, Turkey"></option>
						<option value="Istanbul, Turkey"></option>
						<option value="Beijing, China"></option>
						<option value="Tokyo, Japan"></option>
						<option value="Delhi, India"></option>
						<option value="Cairo, Egypt"></option>
						<option value="New York, United States"></option>
						<option value="Washington, United States"></option>
						<option value="England"></option>
						<option value="France"></option>
						<option value="Germany"></option>
						<option value="Italy"></option>
						<option value="Spain"></option>
						<option value="Portugal"></option>
						<option value="Netherlands"></option>
						<option value="Russia"></option>
						<option value="China"></option>
						<option value="Japan"></option>
						<option value="India"></option>
						<option value="United States"></option>
						<option value="Scotland"></option>
						<option value="Ireland"></option>
						<option value="Greece"></option>
						<option value="Poland"></option>
						<option value="Sweden"></option>
						<option value="Norway"></option>
						<option value="Denmark"></option>
					</datalist>
				</div>
			</div>

			{#if validationError}
				<div role="alert" class="alert alert-error text-sm py-2 mb-4">
					<span>{validationError}</span>
				</div>
			{/if}

			<button type="submit" class="btn btn-primary w-full font-serif text-base tracking-wide" disabled={loading}>
				{#if loading}
					<span class="loading loading-spinner" aria-hidden="true"></span>
					Consulting the archives…
				{:else}
					Chronicle This Life
				{/if}
			</button>
		</div>
	</form>
{/if}
