<script lang="ts">
/**
 * Text field that suggests coffees the taster has logged before. Picking one hands it to
 * `onpick` so the page can fill the coffee's details; typing anything else is plain free text.
 */
import { matchCoffees, type PastCoffee } from '$lib/past-pours'

let {
	id,
	name,
	value = $bindable(''),
	coffees,
	onpick,
	placeholder = '',
	inputClass
}: {
	/** Lands on the text field, so a page `<label for={id}>` names it. */
	id: string
	name: string
	value?: string
	coffees: readonly PastCoffee[]
	onpick: (coffee: PastCoffee) => void
	placeholder?: string
	inputClass: string
} = $props()

let open = $state(false)
let activeIndex = $state(-1)

const listboxId = $derived(`${id}-suggestions`)
const matches = $derived(matchCoffees(coffees, value))
const showList = $derived(open && matches.length > 0)

const dateFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })

/** Parsed as local midnight: a bare `YYYY-MM-DD` would be read as UTC and can show the day before. */
function formatDay(day: string): string {
	return dateFormatter.format(new Date(`${day}T00:00`))
}

function pick(coffee: PastCoffee) {
	onpick(coffee)
	open = false
	activeIndex = -1
}

function handleKeydown(event: KeyboardEvent) {
	if (!showList) return
	switch (event.key) {
		case 'ArrowDown':
			event.preventDefault()
			activeIndex = (activeIndex + 1) % matches.length
			break
		case 'ArrowUp':
			event.preventDefault()
			activeIndex = activeIndex <= 0 ? matches.length - 1 : activeIndex - 1
			break
		case 'Enter':
			if (activeIndex >= 0) {
				event.preventDefault()
				pick(matches[activeIndex])
			}
			break
		case 'Escape':
			open = false
			activeIndex = -1
			break
	}
}
</script>

<div class="relative">
	<input
		{id}
		{name}
		type="text"
		role="combobox"
		aria-expanded={showList}
		aria-controls={listboxId}
		aria-autocomplete="list"
		autocomplete="off"
		bind:value
		oninput={() => {
			open = true
			activeIndex = -1
		}}
		onfocus={() => (open = true)}
		onblur={() => (open = false)}
		onkeydown={handleKeydown}
		{placeholder}
		class="w-full {inputClass}"
	/>

	{#if showList}
		<ul
			id={listboxId}
			role="listbox"
			class="absolute z-20 mt-1 w-full min-w-64 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
		>
			<li class="px-3 pt-2 text-[10px] uppercase tracking-widest text-gray-400" aria-hidden="true">
				Logged before
			</li>
			{#each matches as coffee, index (coffee.key)}
				<li role="option" aria-selected={index === activeIndex}>
					<button
						type="button"
						onmousedown={(event) => {
							// Keeps focus in the field until the pick lands; blur would close the list first.
							event.preventDefault()
							pick(coffee)
						}}
						onmouseenter={() => (activeIndex = index)}
						class="flex min-h-11 w-full flex-col justify-center px-3 py-2 text-left hover:bg-gray-50"
						class:bg-gray-50={index === activeIndex}
					>
						<span class="text-sm text-dark-ink">{coffee.productName ?? coffee.roaster}</span>
						<span class="text-xs text-gray-400">
							{[
								coffee.productName ? coffee.roaster : undefined,
								coffee.country,
								coffee.process,
								`last ${formatDay(coffee.lastBrewed)}`
							]
								.filter(Boolean)
								.join(' · ')}
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
