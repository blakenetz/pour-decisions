<script lang="ts">
import { untrack } from 'svelte'
import { enhance } from '$app/forms'
import { LoopLink } from '$lib'
import AppHeader from '$lib/components/AppHeader.svelte'
import BrewTimeInput from '$lib/components/BrewTimeInput.svelte'
import GrindInput from '$lib/components/GrindInput.svelte'
import { BREW_METHODS } from '$lib/types/coffee'
import type { GrinderId } from '$lib/types/grinders'
import type { ActionData, PageData } from './$types'

let { data, form }: { data: PageData; form: ActionData } = $props()

let saving = $state(false)

// Seeded once from the saved defaults; after that the inputs are the source of truth.
const saved = untrack(() => data.defaults)
let grinder: GrinderId | '' = $state(saved.grinder ?? '')
let grindSetting: number | null = $state(saved.grindSetting ?? null)
let grindSize = $state(saved.grinder ? '' : (saved.grindSize ?? ''))

const inputClass =
	'border-b border-dark-ink bg-transparent py-2 focus:outline-none placeholder:text-gray-300'
const labelClass = 'text-xs uppercase tracking-widest text-gray-500'
</script>

<section class="flex flex-col items-center min-h-[100dvh] p-4 w-full max-w-6xl mx-auto">
	<AppHeader title="Profile" backTo="/dashboard" />

	<main class="flex-1 flex flex-col gap-8 w-full max-w-2xl py-6">
		<div class="border border-gray-200 rounded-lg p-5 flex flex-col gap-4">
			<div>
				<p class="text-xs uppercase tracking-widest text-gray-500">Username</p>
				<p class="text-lg">{data.user.username}</p>
			</div>
			{#if data.user.email}
				<div>
					<p class="text-xs uppercase tracking-widest text-gray-500">Email</p>
					<p class="text-lg">{data.user.email}</p>
				</div>
			{/if}
			<div>
				<p class="text-xs uppercase tracking-widest text-gray-500">Total Pours</p>
				<p class="text-lg">{data.pourCount}</p>
			</div>
		</div>

		<form
			method="POST"
			action="?/saveDefaults"
			use:enhance={() => {
				saving = true
				return async ({ update }) => {
					// Keep what was typed: the reloaded page data already matches it.
					await update({ reset: false })
					saving = false
				}
			}}
			class="border border-gray-200 rounded-lg p-5 flex flex-col gap-6"
		>
			<div>
				<h2 class="text-sm uppercase tracking-widest text-gray-500 font-semibold">Pour Defaults</h2>
				<p class="text-sm text-gray-500 mt-1">
					Your usual brew setup. It's pre-filled each time you log a pour, and you can still change it
					per pour. Leave a field blank for no default.
				</p>
			</div>

			<div class="grid grid-cols-2 gap-6">
				<div class="flex flex-col gap-1">
					<label for="brewMethod" class={labelClass}>Brew Method</label>
					<select
						id="brewMethod"
						name="brewMethod"
						class={inputClass}
						value={data.defaults.brewMethod ?? ''}
					>
						<option value="">No default</option>
						{#each BREW_METHODS as method (method)}
							<option value={method}>{method}</option>
						{/each}
					</select>
				</div>
			</div>

			<GrindInput
				bind:grinder
				bind:grindSize
				bind:grindSetting
				sizePlaceholder="No default"
				{inputClass}
				{labelClass}
			/>

			<div class="grid grid-cols-3 gap-6">
				<div class="flex flex-col gap-1">
					<label for="coffeeGrams" class={labelClass}>Coffee (g)</label>
					<input
						id="coffeeGrams"
						name="coffeeGrams"
						type="number"
						min="0"
						value={data.defaults.coffeeGrams ?? ''}
						class={inputClass}
					/>
				</div>

				<div class="flex flex-col gap-1">
					<label for="waterGrams" class={labelClass}>Water (g)</label>
					<input
						id="waterGrams"
						name="waterGrams"
						type="number"
						min="0"
						value={data.defaults.waterGrams ?? ''}
						class={inputClass}
					/>
				</div>

				<div class="flex flex-col gap-1">
					<label for="waterTempF" class={labelClass}>Water Temp (°F)</label>
					<input
						id="waterTempF"
						name="waterTempF"
						type="number"
						min="0"
						value={data.defaults.waterTempF ?? ''}
						class={inputClass}
					/>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-6">
				<div class="flex flex-col gap-1">
					<span class={labelClass}>Brew Time</span>
					<BrewTimeInput
						name="brewTimeSeconds"
						initialSeconds={data.defaults.brewTimeSeconds}
						{inputClass}
					/>
				</div>

				<div class="flex flex-col gap-1">
					<label for="location" class={labelClass}>Where</label>
					<select id="location" name="location" class={inputClass} value={data.defaults.location ?? ''}>
						<option value="">No default</option>
						<option value="home">Home</option>
						<option value="out">Out and about</option>
					</select>
				</div>
			</div>

			<div class="flex items-center justify-end gap-4">
				{#if form?.error}
					<p class="text-red-500 text-sm">{form.error}</p>
				{:else if form?.saved}
					<p class="text-sm text-gray-500">Saved.</p>
				{/if}
				<button
					type="submit"
					disabled={saving}
					class="px-6 py-2 bg-dark-ink text-off-white disabled:opacity-50 hover:bg-charcoal transition-colors"
				>
					{saving ? 'Saving...' : 'Save defaults'}
				</button>
			</div>
		</form>

		<div class="flex flex-col gap-3 items-start">
			<LoopLink as="a" href="/pours/new">Log a Pour</LoopLink>
		</div>
	</main>
</section>
