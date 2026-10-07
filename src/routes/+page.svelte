<script lang="ts">
import { goto } from '$app/navigation'
import { LoopLink, SquigglyLink } from '$lib'
import tableSettingImage from '$lib/assets/table-setting.png'
import LoginModal from '$lib/components/LoginModal.svelte'
import SignupModal from '$lib/components/SignupModal.svelte'

let loginModalOpen = $state(false)
let signupModalOpen = $state(false)

async function handleLoginSuccess() {
	await goto('/dashboard')
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
