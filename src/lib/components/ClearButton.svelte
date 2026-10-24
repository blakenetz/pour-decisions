<script lang="ts">
/** Icon-only reset for a field that has no blank option to pick: a solid ink circle with a light
 *  ×, the familiar "clear field" mark. Hidden while there's nothing to clear, but it keeps its
 *  space so the row never shifts. Negative margins give it a 44px tap target around the 24px
 *  circle without making the label row taller. */
let {
	label,
	active,
	onclick
}: {
	/** What gets cleared; read by screen readers as "Clear {label}". */
	label: string
	active: boolean
	onclick: () => void
} = $props()
</script>

<button
	type="button"
	aria-label="Clear {label}"
	title="Clear"
	{onclick}
	class="group -my-3 -mr-3 flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-dark-ink {active
		? ''
		: 'invisible'}"
>
	<span
		class="flex size-6 items-center justify-center rounded-full bg-dark-ink text-off-white transition-transform group-hover:scale-110 group-active:scale-95"
	>
		<svg
			class="size-3"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="3.5"
			aria-hidden="true"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
		</svg>
	</span>
</button>
