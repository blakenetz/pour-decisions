<script lang="ts">
  import tableSettingImage from '$lib/assets/table-setting.png';
  import ReshapeButton from '$lib/components/ReshapeButton.svelte';
</script>

<div class="flex flex-col items-center min-h-[100dvh] max-h-[100dvh] px-4">
	<h1 class="text-6xl mb-8">Pour Decisions</h1>
	<div class="flex-1 flex items-center w-full">
		<img
			src={tableSettingImage}
			alt="Table Setting"
			class="max-h-full max-w-full w-auto h-auto object-contain mx-auto"
		/>
	</div>
	  <div class="mt-8 mb-4 flex gap-4">
    <ReshapeButton as="a" href="/login" class="inline-block">Login</ReshapeButton>
    <ReshapeButton as="a" href="/signup" class="inline-block">Sign up</ReshapeButton>
  </div>
</div>
