<script lang="ts">
	export let as: keyof HTMLElementTagNameMap = 'a';
</script>

<svelte:element this={as} {...$$restProps} class={`root ${$$restProps.class ?? ''}`}>
	<span><slot>Writings</slot></span>
	<svg
		class="underline"
		width="100%"
		height="9"
		viewBox="0 0 101 9"
		aria-hidden="true"
		focusable="false"
	>
		<path
			d="M.426 1.973C4.144 1.567 17.77-.514 21.443 1.48 24.296 3.026 24.844 4.627 27.5 7c3.075 2.748 6.642-4.141 10.066-4.688 7.517-1.2 13.237 5.425 17.59 2.745C58.5 3 60.464-1.786 66 2c1.996 1.365 3.174 3.737 5.286 4.41 5.423 1.727 25.34-7.981 29.14-1.294"
			pathLength="1"
		/>
	</svg>
</svelte:element>

<style>
	.root {
		text-decoration: none;
		outline: none;
		cursor: pointer;
		font-size: 18px;
		position: relative;
		white-space: nowrap;
		/* color: var(--color-text); */
		font-size: 1.25rem;
	}

	.root:hover {
		/* color: var(--color-link-hover); */
		outline: none;
	}

	.root:focus {
		outline: none;
		background: lightgrey;
	}

	.root:focus:not(:focus-visible) {
		background: transparent;
	}

	.root:focus-visible {
		outline: 2px solid red;
		background: transparent;
	}

	.root::before {
		content: '';
		display: none;
	}

	.root::before,
	.root::after {
		position: absolute;
		width: 100%;
		height: 1px;
		background: currentColor;
		top: 100%;
		left: 0;
		pointer-events: none;
	}

	.underline {
		position: absolute;
		top: 100%;
		left: 0;
		pointer-events: none;
		fill: none;
		stroke: #000;
		stroke-width: 1px;
	}

	.underline path {
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		transition: stroke-dashoffset 0.6s cubic-bezier(0.7, 0, 0.3, 1);
	}

	.root:hover .underline path {
		stroke-dashoffset: 0;
		transition-timing-function: cubic-bezier(0.8, 1, 0.7, 1);
		transition-duration: 0.3s;
	}
</style>
