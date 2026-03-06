<script>
	import { enhance } from '$app/forms';
	let { loading = false, form = null, onsubmit, oncomplete } = $props();
	let validationError = $state('');
</script>

<form method="POST" action="/" class="card bg-base-200 border border-neutral" use:enhance={({ cancel, formElement }) => {
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
	<div class="card-body">
		<h2 class="card-title font-serif text-primary text-2xl">Create Your Character</h2>
		<p class="text-sm text-neutral-content mb-4">Give your character a name and a lifetime, and discover the history they would have lived through.</p>

		<div class="grid grid-cols-2 gap-4 mb-4">
			<div class="col-span-2">
				<label for="name" class="label text-sm font-semibold">Character Name</label>
				<input type="text" id="name" name="name" required placeholder="e.g. Eleanor Ashworth" value={form?.name ?? ''} class="input input-bordered w-full bg-base-100" />
			</div>

			<div>
				<label for="birthYear" class="label text-sm font-semibold">Born</label>
				<input type="number" id="birthYear" name="birthYear" required min="1" max="2025" placeholder="e.g. 1820" value={form?.birthYear ?? ''} class="input input-bordered w-full bg-base-100" />
			</div>

			<div>
				<label for="deathYear" class="label text-sm font-semibold">Died</label>
				<input type="number" id="deathYear" name="deathYear" required min="1" max="2025" placeholder="e.g. 1895" value={form?.deathYear ?? ''} class="input input-bordered w-full bg-base-100" />
			</div>

			<div class="col-span-2">
				<label for="location" class="label text-sm font-semibold">Location</label>
				<input type="text" id="location" name="location" required placeholder="e.g. London, England" value={form?.location ?? ''} list="location-suggestions" class="input input-bordered w-full bg-base-100" />
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
			<div role="alert" class="alert alert-error text-sm py-2 mb-2">
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
