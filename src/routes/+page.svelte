<script lang="ts">
import { invalidateAll } from '$app/navigation'
import { LoopLink, SquigglyLink } from '$lib'
import tableSettingImage from '$lib/assets/table-setting.png'
import flower170 from '$lib/assets/hand-drawn-flowers/hand-drawn-_g170.png'
import flower171 from '$lib/assets/hand-drawn-flowers/hand-drawn-_g171.png'
import flower172 from '$lib/assets/hand-drawn-flowers/hand-drawn-_g172.png'
import flower174 from '$lib/assets/hand-drawn-flowers/hand-drawn-_g174.png'
import flower182 from '$lib/assets/hand-drawn-flowers/hand-drawn-_g182.png'
import flower184 from '$lib/assets/hand-drawn-flowers/hand-drawn-_g184.png'
import flower187 from '$lib/assets/hand-drawn-flowers/hand-drawn-_g187.png'
import { signOutUser } from '$lib/auth/auth'
import LoginModal from '$lib/components/LoginModal.svelte'
import SignupModal from '$lib/components/SignupModal.svelte'
import OvalButton from '$lib/components/actions/OvalButton.svelte'
import type { PageData } from './$types'

let { data }: { data: PageData } = $props()

let loginModalOpen = $state(false)
let signupModalOpen = $state(false)

async function handleSignOut() {
	await signOutUser()
	await invalidateAll()
}

async function handleLoginSuccess() {
	await invalidateAll()
}

function openLoginModal() {
	signupModalOpen = false
	loginModalOpen = true
}

function openSignupModal() {
	loginModalOpen = false
	signupModalOpen = true
}

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

{#if data.user}
	<div class="flowers" aria-hidden="true">
		{#each flowers as flower, i (i)}
			<img src={flower.src} alt="" style="left: {flower.left}; width: {flower.width};" />
		{/each}
	</div>

	<section class="flex flex-col items-center min-h-[100dvh] p-4">
		<header class="w-full max-w-2xl flex items-center justify-between py-4">
			<h1 class="text-3xl font-bold">Pour Decisions</h1>
			<div class="flex items-center gap-4">
				<span class="text-sm text-gray-600">{data.user.username}</span>
				<button onclick={handleSignOut} class="text-sm underline hover:text-gray-600">
					Sign Out
				</button>
			</div>
		</header>

		<main class="flex-1 flex flex-col items-center justify-center gap-12 w-full max-w-2xl">
			<p class="text-xl text-center">What would you like to do?</p>
			<div class="flex flex-wrap items-center justify-center gap-16">
				<OvalButton as="a" href="/tastings/new">Log a Tasting</OvalButton>
				<OvalButton as="a" href="/dashboard">View My Dashboard</OvalButton>
			</div>
		</main>
	</section>
{:else}
	<section class="flex flex-col items-center min-h-[100dvh] max-h-[100dvh] p-4">
		<div class="mb-8 text-center">
			<h1 class="text-6xl">Welcome.<br />Let's make some<br /><em>Pour Decisions</em></h1>
		</div>
		<div class="flex-1 flex items-center w-full">
			<img
				src={tableSettingImage}
				alt="Table Setting"
				class="max-h-full max-w-full w-auto h-auto object-contain mx-auto"
			/>
		</div>
		<div class="mt-8 mb-4 flex gap-4">
			<LoopLink as="button" type="button" onclick={openSignupModal}>Sign Up</LoopLink>
			<SquigglyLink as="button" type="button" onclick={openLoginModal}>Login</SquigglyLink>
		</div>
	</section>

	<LoginModal
		open={loginModalOpen}
		onclose={() => (loginModalOpen = false)}
		onsuccess={handleLoginSuccess}
		onswitchtosignup={openSignupModal}
	/>

	<SignupModal
		open={signupModalOpen}
		onclose={() => (signupModalOpen = false)}
		onswitchtologin={openLoginModal}
	/>
{/if}

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
