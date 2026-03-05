<script>
	import { enhance } from '$app/forms';
	let { loading = false, onsubmit, oncomplete } = $props();
</script>

<form method="POST" class="card bg-base-200 border border-neutral" use:enhance={() => {
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
				<input type="text" id="name" name="name" required placeholder="e.g. Eleanor Ashworth" class="input input-bordered w-full bg-base-100" />
			</div>

			<div>
				<label for="birthYear" class="label text-sm font-semibold">Born</label>
				<input type="number" id="birthYear" name="birthYear" required min="1" max="2025" placeholder="e.g. 1820" class="input input-bordered w-full bg-base-100" />
			</div>

			<div>
				<label for="deathYear" class="label text-sm font-semibold">Died</label>
				<input type="number" id="deathYear" name="deathYear" required min="1" max="2025" placeholder="e.g. 1895" class="input input-bordered w-full bg-base-100" />
			</div>

			<div class="col-span-2">
				<label for="location" class="label text-sm font-semibold">Location</label>
				<input type="text" id="location" name="location" required placeholder="e.g. London, England" list="location-suggestions" class="input input-bordered w-full bg-base-100" />
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

		<button type="submit" class="btn btn-primary w-full font-serif text-base tracking-wide" disabled={loading}>
			{#if loading}
				<span class="loading loading-spinner"></span>
				Consulting the archives…
			{:else}
				Chronicle This Life
			{/if}
		</button>
	</div>
</form>
