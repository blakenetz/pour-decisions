<script lang="ts">
import { invalidateAll } from '$app/navigation'
import { LoopLink, SquigglyLink } from '$lib'
import tableLegsImage from '$lib/assets/table-legs.png'
import tableSettingImage from '$lib/assets/table-setting.png'
import { signOutUser } from '$lib/auth/auth'
import LoginModal from '$lib/components/LoginModal.svelte'
import SignupModal from '$lib/components/SignupModal.svelte'
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
</script>

{#if data.user}
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

		<main class="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-2xl">
			<img src={tableLegsImage} alt="" aria-hidden="true" class="h-96 w-auto" />
			<div class="text-center">
				<h2 class="text-3xl">No pours yet.</h2>
				<p class="text-gray-500 mt-1">Log your first pour to get started.</p>
			</div>
			<LoopLink as="a" href="/pours/new">Log a Pour</LoopLink>
		</main>
	</section>
{:else}
	<section class="flex flex-col items-center min-h-[100dvh] max-h-[100dvh] p-4">
		<div class="mb-8 text-center">
			<h1 class="text-6xl">Welcome.<br />Let's make some<br /><em>Pour Decisions</em></h1>
		</div>
		<div class="flex-1 flex items-center justify-center w-full">
			<img src={tableSettingImage} alt="Table Setting" class="h-96 w-auto" />
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
