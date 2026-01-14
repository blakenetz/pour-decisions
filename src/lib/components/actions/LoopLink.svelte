<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	export let as: keyof HTMLElementTagNameMap = 'a';

	const dispatch = createEventDispatcher();

	function handleClick(e: MouseEvent) {
		// Re-dispatch click so parent components can listen with on:click
		dispatch('click', e);
	}
</script>

<svelte:element
	this={as}
	{...$$restProps}
	class={`root ${$$restProps.class ?? ''}`}
	type={as === 'button' ? 'button' : undefined}
	on:click={handleClick}
>
	<span style="pointer-events: none;"><slot></slot></span>
	<svg
		class="underline"
		width="100%"
		height="18"
		viewBox="0 0 59 18"
		aria-hidden="true"
		focusable="false"
	>
		<path d="M.945.149C12.3 16.142 43.573 22.572 58.785 10.842" pathLength="1" />
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
		top: 73%;
		left: -23%;
		pointer-events: none;
		fill: none;
		stroke: #000;
		stroke-width: 5px;
	}

	.underline path {
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		transition: stroke-dashoffset 0.4s cubic-bezier(0.7, 0, 0.3, 1);
	}

	.root:hover .underline path {
		stroke-dashoffset: 0;
		transition-timing-function: cubic-bezier(0.8, 1, 0.7, 1);
		transition-duration: 0.3s;
	}
</style>
