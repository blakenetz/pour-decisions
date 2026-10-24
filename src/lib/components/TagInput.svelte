<script lang="ts">
/**
 * Flavor tags as removable chips. Enter, comma, or leaving the field turns the typed text into
 * a tag; Backspace on an empty field removes the last one. Submits as one comma-separated
 * hidden field, the shape `parseNotes` already reads on the server.
 */
import { normalizeNote } from '$lib/types/coffee'

const MAX_TAGS = 20
const MAX_TAG_LENGTH = 60
const SUGGESTION_LIMIT = 6

let {
	id,
	name,
	tags = $bindable([]),
	suggestions = [],
	quickPicks = [],
	quickPickLabel = '',
	placeholder = '',
	inputClass
}: {
	/** Lands on the text field, so a page `<label for={id}>` names it. */
	id: string
	name: string
	tags?: string[]
	/** Typeahead vocabulary, already normalized, best matches first. */
	suggestions?: readonly string[]
	/** One-tap tags shown under the field, e.g. the roaster's notes when logging what you tasted. */
	quickPicks?: readonly string[]
	quickPickLabel?: string
	placeholder?: string
	inputClass: string
} = $props()

let draft = $state('')
let open = $state(false)
let activeIndex = $state(-1)

const listboxId = $derived(`${id}-suggestions`)
const full = $derived(tags.length >= MAX_TAGS)

const matches = $derived.by(() => {
	const term = normalizeNote(draft)
	if (!term) return []
	const available = suggestions.filter((s) => !tags.includes(s) && s.includes(term))
	const prefix = available.filter((s) => s.startsWith(term))
	const inner = available.filter((s) => !s.startsWith(term))
	return [...prefix, ...inner].slice(0, SUGGESTION_LIMIT)
})

const openPicks = $derived(quickPicks.filter((tag) => !tags.includes(tag)))

function add(raw: string) {
	const tag = normalizeNote(raw).slice(0, MAX_TAG_LENGTH)
	if (tag && !tags.includes(tag) && !full) tags = [...tags, tag]
}

function commitDraft() {
	for (const part of draft.split(',')) add(part)
	draft = ''
	open = false
	activeIndex = -1
}

function handleInput() {
	// A pasted list ("cocoa, plum, rum") becomes tags at once; the last piece stays editable.
	if (draft.includes(',')) {
		const parts = draft.split(',')
		draft = parts.pop() ?? ''
		for (const part of parts) add(part)
	}
	open = true
	activeIndex = -1
}

function handleKeydown(event: KeyboardEvent) {
	switch (event.key) {
		case 'ArrowDown':
			if (!open || matches.length === 0) return
			event.preventDefault()
			activeIndex = (activeIndex + 1) % matches.length
			break
		case 'ArrowUp':
			if (!open || matches.length === 0) return
			event.preventDefault()
			activeIndex = activeIndex <= 0 ? matches.length - 1 : activeIndex - 1
			break
		case 'Enter':
			// Enter in a tag field means "add this tag", never "submit the pour".
			event.preventDefault()
			if (open && activeIndex >= 0) {
				add(matches[activeIndex])
				draft = ''
				open = false
				activeIndex = -1
			} else {
				commitDraft()
			}
			break
		case 'Backspace':
			if (draft === '' && tags.length > 0) tags = tags.slice(0, -1)
			break
		case 'Escape':
			open = false
			activeIndex = -1
			break
	}
}
</script>

<div class="flex flex-col gap-3">
	<input type="hidden" {name} value={tags.join(', ')} />

	{#if tags.length > 0}
		<ul class="flex flex-wrap gap-2" aria-label="Added notes">
			{#each tags as tag (tag)}
				<li>
					<button
						type="button"
						aria-label="Remove {tag}"
						onclick={() => (tags = tags.filter((t) => t !== tag))}
						class="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full border border-dark-ink bg-dark-ink px-4 text-sm text-off-white"
					>
						{tag}
						<svg
							class="size-3"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="3"
							aria-hidden="true"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<div class="relative">
		<input
			{id}
			type="text"
			role="combobox"
			aria-expanded={open && matches.length > 0}
			aria-controls={listboxId}
			aria-autocomplete="list"
			autocomplete="off"
			maxlength={MAX_TAG_LENGTH}
			disabled={full}
			bind:value={draft}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onblur={commitDraft}
			placeholder={full ? `Up to ${MAX_TAGS} notes` : placeholder}
			class="w-full {inputClass}"
		/>

		{#if open && matches.length > 0}
			<ul
				id={listboxId}
				role="listbox"
				class="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
			>
				{#each matches as match, index (match)}
					<li role="option" aria-selected={index === activeIndex}>
						<button
							type="button"
							onmousedown={(event) => {
								// Keeps focus in the field, so its blur doesn't commit the half-typed text.
								event.preventDefault()
								add(match)
								draft = ''
								open = false
								activeIndex = -1
							}}
							onmouseenter={() => (activeIndex = index)}
							class="flex min-h-11 w-full items-center px-3 text-left text-sm text-dark-ink hover:bg-gray-50"
							class:bg-gray-50={index === activeIndex}
						>
							{match}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if openPicks.length > 0 && !full}
		<div class="flex flex-col gap-2">
			{#if quickPickLabel}
				<span class="text-[10px] uppercase tracking-widest text-gray-400">{quickPickLabel}</span>
			{/if}
			<div class="flex flex-wrap gap-2">
				{#each openPicks as tag (tag)}
					<button
						type="button"
						aria-label="Add {tag}"
						onclick={() => add(tag)}
						class="inline-flex min-h-11 min-w-11 items-center gap-1 rounded-full border border-dashed border-dark-ink px-4 text-sm text-dark-ink"
					>
						<span aria-hidden="true">+</span>
						{tag}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
