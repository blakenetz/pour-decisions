<script lang="ts">
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import { fly } from 'svelte/transition';

	export let open = false;
	export let title = '';

	const dispatch = createEventDispatcher();

	let dialogElement: HTMLDialogElement;
	let dialogSupported = true;

	onMount(() => {
		console.log('[Modal] onMount - title:', title);
		// Check if dialog element is supported
		if (
			typeof HTMLDialogElement === 'undefined' ||
			typeof HTMLDialogElement.prototype.showModal !== 'function'
		) {
			dialogSupported = false;
			console.warn(
				'HTMLDialogElement is not supported in this browser. Consider using a polyfill.'
			);
		} else {
			console.log('[Modal] Dialog element is supported');
		}
	});

	function handleClose() {
		console.log('[Modal] handleClose called');
		dispatch('close');
	}

	function handleCancel(e: Event) {
		// Prevent default close behavior and handle it ourselves
		e.preventDefault();
		console.log('[Modal] handleCancel called');
		handleClose();
	}

	async function updateDialog() {
		console.log('[Modal] updateDialog called - open:', open, 'dialogElement:', !!dialogElement, 'dialogSupported:', dialogSupported);
		
		// Wait for DOM to be ready
		await tick();
		
		if (!dialogElement) {
			console.log('[Modal] dialogElement not yet bound, skipping');
			return;
		}
		
		if (!dialogSupported) {
			console.log('[Modal] Dialog not supported, skipping');
			return;
		}
		
		if (open) {
			// Use showModal() instead of show() to get modal behavior
			if (!dialogElement.open) {
				console.log('[Modal] Opening dialog with showModal()');
				dialogElement.showModal();
				console.log('[Modal] Dialog opened, dialogElement.open:', dialogElement.open);
			} else {
				console.log('[Modal] Dialog already open, skipping');
			}
		} else {
			// Only close if it's currently open to avoid errors
			if (dialogElement.open) {
				console.log('[Modal] Closing dialog');
				dialogElement.close();
				console.log('[Modal] Dialog closed, dialogElement.open:', dialogElement.open);
			} else {
				console.log('[Modal] Dialog already closed, skipping');
			}
		}
	}

	// Watch for open prop changes and show/hide dialog accordingly
	$: {
		console.log('[Modal] Reactive statement triggered - open:', open, 'title:', title);
		updateDialog();
	}
</script>

<dialog
	bind:this={dialogElement}
	class="dialog"
	aria-labelledby={title ? 'modal-title' : undefined}
	on:cancel={handleCancel}
	on:close={handleClose}
>
	<div class="dialog-content" transition:fly={{ y: -20, duration: 200 }}>
		<div class="p-6">
			{#if title}
				<h2 id="modal-title" class="text-2xl font-semibold mb-6">{title}</h2>
			{/if}
			<slot />
		</div>
	</div>
</dialog>

<style>
	.dialog {
		/* Reset default dialog styles */
		padding: 0;
		border: none;
		background: transparent;
		max-width: 90vw;
		max-height: 90vh;
		width: 100%;
		/* Center the dialog */
		margin: auto;
	}

	/* Style the backdrop using the ::backdrop pseudo-element
	   This is only available when using showModal() */
	.dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		animation: backdrop-fade-in 0.2s ease-out;
	}

	@keyframes backdrop-fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.dialog-content {
		background: white;
		border-radius: 0.5rem;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
		max-width: 28rem;
		width: 100%;
		margin: 0 auto;
		max-height: 90vh;
		overflow-y: auto;
	}

	/* Animation for dialog opening */
	@keyframes dialog-show {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(-10px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.dialog[open] .dialog-content {
		animation: dialog-show 0.2s ease-out;
	}
</style>
