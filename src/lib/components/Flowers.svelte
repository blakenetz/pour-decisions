<script lang="ts">
import flower170 from '$lib/assets/hand-drawn-flowers/hand-drawn-_g170.png'
import flower171 from '$lib/assets/hand-drawn-flowers/hand-drawn-_g171.png'
import flower172 from '$lib/assets/hand-drawn-flowers/hand-drawn-_g172.png'
import flower174 from '$lib/assets/hand-drawn-flowers/hand-drawn-_g174.png'
import flower182 from '$lib/assets/hand-drawn-flowers/hand-drawn-_g182.png'
import flower184 from '$lib/assets/hand-drawn-flowers/hand-drawn-_g184.png'
import flower187 from '$lib/assets/hand-drawn-flowers/hand-drawn-_g187.png'

// Decorative flowers, statically anchored flush to the bottom of the viewport.
const flowers = [
	{ src: flower170, left: '-2%', width: '9rem' },
	{ src: flower174, left: '11%', width: '7rem' },
	{ src: flower182, left: '27%', width: '4.5rem' },
	{ src: flower187, left: '42%', width: '10rem' },
	{ src: flower171, left: '63%', width: '6.5rem' },
	{ src: flower184, left: '79%', width: '8rem' },
	{ src: flower172, left: '92%', width: '7rem' }
]
</script>

<div class="flowers" aria-hidden="true">
	{#each flowers as flower, i (i)}
		<img src={flower.src} alt="" style="left: {flower.left}; width: {flower.width};" />
	{/each}
</div>

<style>
	.flowers {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: -10;
		height: 0;
		pointer-events: none;
	}

	.flowers img {
		position: absolute;
		bottom: 0;
		display: block;
		opacity: 0.85;
	}
</style>
