<script lang="ts">
import { enhance } from '$app/forms'
import type { ActionData } from './$types'

const BREW_METHODS = ['Espresso', 'Pour Over', 'French Press', 'Drip', 'Cold Brew', 'AeroPress']
const SCALE = [1, 2, 3, 4, 5] as const

let { form }: { form: ActionData } = $props()

let brewMethod = $state('')
let rating = $state(0)
let acidity = $state(0)
let bodyScore = $state(0)
let submitting = $state(false)
</script>

<section class="min-h-[100dvh] p-6 flex flex-col max-w-lg mx-auto">
	<header class="mb-10">
		<a href="/" class="text-sm text-gray-500 hover:text-dark-ink">← Back</a>
		<h1 class="text-5xl mt-3">Log a Tasting</h1>
	</header>

	<form
		method="POST"
		use:enhance={() => {
			submitting = true
			return async ({ update }) => {
				await update()
				submitting = false
			}
		}}
		class="flex flex-col gap-8 flex-1"
	>
		<!-- Hidden inputs for custom control values -->
		<input type="hidden" name="brewMethod" value={brewMethod} />
		<input type="hidden" name="rating" value={rating} />
		<input type="hidden" name="acidity" value={acidity} />
		<input type="hidden" name="body" value={bodyScore} />

		<div class="flex flex-col gap-6">
			<div class="flex flex-col gap-1">
				<label for="producer" class="text-xs uppercase tracking-widest text-gray-500">Roaster</label>
				<input
					id="producer"
					name="producer"
					type="text"
					placeholder="e.g. Blue Bottle"
					class="border-b border-dark-ink bg-transparent py-2 focus:outline-none placeholder:text-gray-300"
				/>
			</div>

			<div class="flex flex-col gap-1">
				<label for="productName" class="text-xs uppercase tracking-widest text-gray-500">Coffee Name</label>
				<input
					id="productName"
					name="productName"
					type="text"
					placeholder="e.g. Ethiopia Yirgacheffe"
					class="border-b border-dark-ink bg-transparent py-2 focus:outline-none placeholder:text-gray-300"
				/>
			</div>
		</div>

		<div class="flex flex-col gap-3">
			<span class="text-xs uppercase tracking-widest text-gray-500">Brew Method</span>
			<div class="flex flex-wrap gap-2">
				{#each BREW_METHODS as method (method)}
					<button
						type="button"
						onclick={() => (brewMethod = brewMethod === method ? '' : method)}
						class={`px-3 py-1 rounded-full border text-sm transition-colors ${
							brewMethod === method
								? 'bg-dark-ink text-off-white border-dark-ink'
								: 'bg-transparent text-dark-ink border-dark-ink'
						}`}
					>
						{method}
					</button>
				{/each}
			</div>
		</div>

		<div class="flex flex-col gap-3">
			<span class="text-xs uppercase tracking-widest text-gray-500">Rating</span>
			<div class="flex gap-2">
				{#each SCALE as n (n)}
					<button
						type="button"
						onclick={() => (rating = rating === n ? 0 : n)}
						class={`w-9 h-9 rounded-full border transition-colors text-sm ${
							n <= rating
								? 'bg-dark-ink text-off-white border-dark-ink'
								: 'bg-transparent text-dark-ink border-dark-ink'
						}`}
					>
						{n}
					</button>
				{/each}
			</div>
		</div>

		<div class="flex flex-col gap-6">
			<div class="flex flex-col gap-3">
				<span class="text-xs uppercase tracking-widest text-gray-500">Acidity</span>
				<div class="flex gap-2">
					{#each SCALE as n (n)}
						<button
							type="button"
							onclick={() => (acidity = acidity === n ? 0 : n)}
							class={`w-9 h-9 rounded-full border transition-colors text-sm ${
								n <= acidity
									? 'bg-brand-teal-600 text-off-white border-brand-teal-600'
									: 'bg-transparent text-dark-ink border-dark-ink'
							}`}
						>
							{n}
						</button>
					{/each}
				</div>
			</div>

			<div class="flex flex-col gap-3">
				<span class="text-xs uppercase tracking-widest text-gray-500">Body</span>
				<div class="flex gap-2">
					{#each SCALE as n (n)}
						<button
							type="button"
							onclick={() => (bodyScore = bodyScore === n ? 0 : n)}
							class={`w-9 h-9 rounded-full border transition-colors text-sm ${
								n <= bodyScore
									? 'bg-brand-teal-600 text-off-white border-brand-teal-600'
									: 'bg-transparent text-dark-ink border-dark-ink'
							}`}
						>
							{n}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<div class="flex flex-col gap-1">
			<label for="freeText" class="text-xs uppercase tracking-widest text-gray-500">Notes</label>
			<textarea
				id="freeText"
				name="freeText"
				rows="4"
				placeholder="What stood out? Any flavor notes..."
				class="border-b border-dark-ink bg-transparent py-2 resize-none focus:outline-none placeholder:text-gray-300"
			></textarea>
		</div>

		{#if form?.error}
			<p class="text-red-500 text-sm">{form.error}</p>
		{/if}

		<div class="flex justify-end mt-auto pb-8">
			<button
				type="submit"
				disabled={submitting}
				class="px-8 py-3 bg-dark-ink text-off-white text-lg disabled:opacity-50 hover:bg-charcoal transition-colors"
			>
				{submitting ? 'Saving...' : 'Save Tasting'}
			</button>
		</div>
	</form>
</section>
