<script lang="ts">
/**
 * Renders a hand-drawn icon from `src/lib/assets/icons/*.svg` inline, so it
 * inherits the surrounding text color instead of being a fixed-color image.
 *
 * Icons come from unDraw Handcrafts (https://handcrafts.undraw.co/app), whose
 * license permits use but prohibits automated downloading — so the SVGs are
 * added to `assets/icons/` by hand rather than fetched by a script.
 */

// Eager + `?raw` so the markup is inlined at build time; no runtime fetch, and
// `{@html}` only ever receives build-time repo content, never user input.
// Vite resolves glob patterns relative to this file — the `$lib` alias is not
// expanded inside `import.meta.glob`, so the path must stay relative.
const sources = import.meta.glob('../assets/icons/*.svg', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>

/** Strips baked dimensions and recolors to `currentColor`, so one file works in
 *  both the light body and the dark header without a second copy. */
function normalize(svg: string): string {
	return svg
		.replace(/\s(?:width|height)="[^"]*"/g, '')
		.replace(/(fill|stroke)="(?!none)[^"]*"/g, '$1="currentColor"')
}

const byName: Record<string, string> = {}
for (const [path, source] of Object.entries(sources)) {
	const name = path
		.split('/')
		.pop()
		?.replace(/\.svg$/, '')
	if (name) byName[name] = normalize(source)
}

let {
	name,
	size = '1.25em',
	class: className = '',
	label
}: {
	/** File name without extension, e.g. `three-lines` for `three-lines.svg`. */
	name: string
	size?: string
	class?: string
	/** Omit for decorative icons; set it when the icon is the only content of a
	 *  control and carries the meaning. */
	label?: string
} = $props()

const markup = $derived(byName[name])
</script>

{#if markup}
	<span
		class="icon {className}"
		style="--icon-size: {size}"
		role={label ? 'img' : undefined}
		aria-label={label}
		aria-hidden={label ? undefined : 'true'}
	>
		{@html markup}
	</span>
{/if}

<style>
	.icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--icon-size);
		height: var(--icon-size);
		flex-shrink: 0;
	}

	.icon :global(svg) {
		width: 100%;
		height: 100%;
		overflow: visible;
	}
</style>
