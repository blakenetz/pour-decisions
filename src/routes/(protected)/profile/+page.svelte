<script lang="ts">
import { LoopLink } from '$lib'
import AppHeader from '$lib/components/AppHeader.svelte'
import type { PageData } from './$types'

let { data }: { data: PageData } = $props()
</script>

<section class="flex flex-col items-center min-h-[100dvh] p-4">
	<AppHeader title="Profile" backTo="/dashboard" />

	<main class="flex-1 flex flex-col gap-8 w-full max-w-2xl py-6">
		<div class="border border-gray-200 rounded-lg p-5 flex flex-col gap-4">
			<div>
				<p class="text-xs uppercase tracking-widest text-gray-500">Username</p>
				<p class="text-lg">{data.user.username}</p>
			</div>
			{#if data.user.email}
				<div>
					<p class="text-xs uppercase tracking-widest text-gray-500">Email</p>
					<p class="text-lg">{data.user.email}</p>
				</div>
			{/if}
			<div>
				<p class="text-xs uppercase tracking-widest text-gray-500">Total Pours</p>
				<p class="text-lg">{data.pourCount}</p>
			</div>
		</div>

		<div class="flex flex-col gap-3 items-start">
			<LoopLink as="a" href="/pours/new">Log a Pour</LoopLink>
		</div>
	</main>
</section>
