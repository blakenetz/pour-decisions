<script lang="ts">
	export let as: keyof HTMLElementTagNameMap = 'button';
</script>

<svelte:element
	this={as}
	{...$$restProps}
	class={`root ${$$restProps.class ?? ''}`}
	type={as === 'button' ? 'button' : undefined}
>
	<span>
		<slot></slot>
	</span>
</svelte:element>

<style>
	.root:focus {
		outline: none;
	}

	.root:focus-visible {
		outline: 2px solid #443ffc;
		outline-offset: 3px;
	}

	.root {
		pointer-events: auto;
		cursor: pointer;
		background: #e7e7e7;
		border: none;
		padding: 1.5rem 3rem;
		margin: 0;
		font-size: 1.25rem;
		position: relative;
		display: inline-block;
	}

	.root::before,
	.root::after {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.root {
		font-weight: 900;
		width: 175px;
		height: 120px;
		color: #fff;
		background: none;
	}

	.root::before {
		content: '';
		background: #e6e6e6;
		-webkit-clip-path: path(
			'M154.5,88.5 C131,113.5 62.5,110 30,89.5 C-2.5,69 -3.5,42 4.5,25.5 C12.5,9 33.5,-6 85,3.5 C136.5,13 178,63.5 154.5,88.5 Z'
		);
		clip-path: path(
			'M154.5,88.5 C131,113.5 62.5,110 30,89.5 C-2.5,69 -3.5,42 4.5,25.5 C12.5,9 33.5,-6 85,3.5 C136.5,13 178,63.5 154.5,88.5 Z'
		);
		transition:
			clip-path 0.5s cubic-bezier(0.585, 2.5, 0.645, 0.55),
			-webkit-clip-path 0.5s cubic-bezier(0.585, 2.5, 0.645, 0.55),
			background 0.5s ease;
	}

	.root:hover::before {
		background: #000;
		-webkit-clip-path: path(
			'M143,77 C117,96 74,100.5 45.5,91.5 C17,82.5 -10.5,57 5.5,31.5 C21.5,6 79,-5.5 130.5,4 C182,13.5 169,58 143,77 Z'
		);
		clip-path: path(
			'M143,77 C117,96 74,100.5 45.5,91.5 C17,82.5 -10.5,57 5.5,31.5 C21.5,6 79,-5.5 130.5,4 C182,13.5 169,58 143,77 Z'
		);
	}

	.root::after {
		content: '';
		height: 86%;
		width: 97%;
		top: 5%;
		border-radius: 58% 42% 55% 45% / 56% 45% 55% 44%;
		border: 3px solid #000;
		transform: rotate(-20deg);
		z-index: -1;
		transition: transform 0.5s cubic-bezier(0.585, 2.5, 0.645, 0.55);
	}

	.root:hover::after {
		transform: translate3d(0, -5px, 0);
	}

	.root span {
		display: block;
		transition: transform 0.3s ease;
		mix-blend-mode: difference;
	}

	.root:hover span {
		transform: translate3d(0, -10px, 0);
	}
</style>
