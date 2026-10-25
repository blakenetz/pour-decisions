<script lang="ts">
/**
 * Beer style picker: the catalogue grouped by family, the taster's own past styles, and an
 * "Add a style…" escape hatch that swaps in a text field plus a family choice. Catalogue styles
 * submit no family (the server derives it); custom ones submit the family they belong to.
 */
import { BEER_STYLE_FAMILIES, BEER_STYLES, canonicalStyle } from '$lib/types/beer'
import ChoicePills from './ChoicePills.svelte'

const CUSTOM = '__custom__'

let {
	style = $bindable(''),
	family = $bindable(''),
	customStyles,
	inputClass,
	labelClass
}: {
	style?: string
	family?: string
	/** Styles the taster added on past pours, most recent first. */
	customStyles: readonly { style: string; family: string }[]
	inputClass: string
	labelClass: string
} = $props()

// Set by picking "Add a style…", so an empty or half-typed style stays in text mode.
let customMode = $state(false)

const byFamily = BEER_STYLE_FAMILIES.map((name) => ({
	name,
	styles: BEER_STYLES.filter((entry) => entry.family === name).map((entry) => entry.style)
}))
const FAMILY_OPTIONS = BEER_STYLE_FAMILIES.map((name) => ({ value: name, label: name }))

function findCustom(value: string) {
	const key = value.trim().toLowerCase()
	return customStyles.find((entry) => entry.style.toLowerCase() === key)
}

const savedCustom = $derived(findCustom(style))
const isCustom = $derived(
	customMode ||
		(style !== '' && canonicalStyle(style).family === undefined && savedCustom === undefined)
)

function choose(value: string) {
	if (value === CUSTOM) {
		customMode = true
		style = ''
		family = ''
		return
	}
	customMode = false
	style = value
	family = findCustom(value)?.family ?? canonicalStyle(value).family ?? ''
}

/** Snaps typed text onto a known spelling, so "cold ipa" doesn't become a second style. */
function resolveTyped() {
	const known = canonicalStyle(style)
	const match = known.family ? { style: known.style, family: known.family } : findCustom(style)
	if (!match) return
	customMode = false
	style = match.style
	family = match.family
}
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-col gap-1">
		<label for="style" class={labelClass}>Style<span class="text-red-500"> *</span></label>
		<select
			id="style"
			name={isCustom ? undefined : 'style'}
			bind:value={() => (isCustom ? CUSTOM : style), choose}
			class={inputClass}
		>
			<option value="">Select a style</option>
			{#if customStyles.length > 0}
				<optgroup label="Your styles">
					{#each customStyles as entry (entry.style)}
						<option value={entry.style}>{entry.style}</option>
					{/each}
				</optgroup>
			{/if}
			{#each byFamily as group (group.name)}
				<optgroup label={group.name}>
					{#each group.styles as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</optgroup>
			{/each}
			<option value={CUSTOM}>Add a style…</option>
		</select>
	</div>

	{#if isCustom}
		<label for="customStyle" class="sr-only">Your style</label>
		<input
			id="customStyle"
			name="style"
			type="text"
			maxlength="80"
			placeholder="e.g. Cold IPA"
			bind:value={style}
			onblur={resolveTyped}
			class={inputClass}
		/>
		<ChoicePills
			label="Style family"
			name="styleFamily"
			options={FAMILY_OPTIONS}
			bind:value={family}
			clearable
		/>
	{:else if savedCustom}
		<input type="hidden" name="styleFamily" value={family} />
	{/if}
</div>
