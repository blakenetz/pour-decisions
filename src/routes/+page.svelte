<script lang="ts">
	import tableSettingImage from '$lib/assets/table-setting.png';
	import { OvalButton, LoopLink, SquigglyLink } from '$lib';
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
		<LoopLink as="a" href="/signup">Sign Up</LoopLink>
		<SquigglyLink as="a" href="/login">Login</SquigglyLink>
	</div>
</section>
