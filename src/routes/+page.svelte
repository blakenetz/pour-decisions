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
		console.log('clicking login');
		signupModalOpen = false;
		loginModalOpen = true;
	}

	function openSignupModal() {
		loginModalOpen = false;
		signupModalOpen = true;
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
					openSignupModal();
				}}
			>
				Sign Up
			</LoopLink>
			<SquigglyLink
				as="button"
				type="button"
				on:click={(e) => {
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
		loginModalOpen = false;
	}}
	on:success={handleLoginSuccess}
	on:switchToSignup={openSignupModal}
/>

<SignupModal
	open={signupModalOpen}
	on:close={() => {
		signupModalOpen = false;
	}}
	on:switchToLogin={openLoginModal}
/>
