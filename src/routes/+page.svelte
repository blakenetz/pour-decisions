<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import tableSettingImage from '$lib/assets/table-setting.png';
	import { LoopLink, SquigglyLink } from '$lib';
	import { getAuthUser, signOutUser } from '$lib/auth/auth';
	import LoginModal from '$lib/components/LoginModal.svelte';
	import SignupModal from '$lib/components/SignupModal.svelte';

	let user: { username: string } | null = null;
	let loading = true;
	let loginModalOpen = false;
	let signupModalOpen = false;

	// Log when modal states change
	$: {
		console.log('[Page] Modal state changed:', { loginModalOpen, signupModalOpen });
	}

	onMount(async () => {
		if (browser) {
			const authUser = await getAuthUser();
			user = authUser;
			loading = false;
		}
	});

	async function handleSignOut() {
		if (browser) {
			await signOutUser();
			user = null;
			await goto('/');
		}
	}

	function handleLoginSuccess() {
		// Refresh user state after successful login
		if (browser) {
			getAuthUser().then((authUser) => {
				user = authUser;
			});
		}
	}

	function openLoginModal() {
		console.log('[Page] openLoginModal called - current state:', { loginModalOpen, signupModalOpen });
		signupModalOpen = false;
		loginModalOpen = true;
		console.log('[Page] openLoginModal - new state:', { loginModalOpen, signupModalOpen });
	}

	function openSignupModal() {
		console.log('[Page] openSignupModal called - current state:', { loginModalOpen, signupModalOpen });
		loginModalOpen = false;
		signupModalOpen = true;
		console.log('[Page] openSignupModal - new state:', { loginModalOpen, signupModalOpen });
	}
</script>

<section class="flex flex-col items-center min-h-[100dvh] max-h-[100dvh] p-4">
	<h1 class="text-6xl mb-8">Pour Decisions</h1>
	<div class="flex-1 flex items-center w-full">
		<img
			src={tableSettingImage}
			alt="Table Setting"
			class="max-h-full max-w-full w-auto h-auto object-contain mx-auto"
		/>
	</div>
	<div class="mt-8 mb-4 flex gap-4">
		{#if loading}
			<p class="text-sm">Loading...</p>
		{:else if user}
			<div class="flex flex-col items-center gap-2">
				<p class="text-sm">Signed in as {user.username}</p>
				<button on:click={handleSignOut} class="text-sm underline">Sign Out</button>
			</div>
		{:else}
			<LoopLink
				as="button"
				type="button"
				on:click={(e) => {
					console.log('[Page] Sign Up button clicked');
					openSignupModal();
				}}
			>
				Sign Up
			</LoopLink>
			<SquigglyLink
				as="button"
				type="button"
				on:click={(e) => {
					console.log('[Page] Login button clicked');
					openLoginModal();
				}}
			>
				Login
			</SquigglyLink>
		{/if}
	</div>
</section>

<LoginModal
	open={loginModalOpen}
	on:close={() => {
		console.log('[Page] LoginModal close event received');
		loginModalOpen = false;
	}}
	on:success={handleLoginSuccess}
	on:switchToSignup={openSignupModal}
/>

<SignupModal
	open={signupModalOpen}
	on:close={() => {
		console.log('[Page] SignupModal close event received');
		signupModalOpen = false;
	}}
	on:switchToLogin={openLoginModal}
/>

