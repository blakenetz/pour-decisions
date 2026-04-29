<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount, onDestroy, tick } from 'svelte';
	import { fly } from 'svelte/transition';

	let { open = false, title = '', onclose, children }: {
		open?: boolean;
		title?: string;
		onclose?: () => void;
		children?: Snippet;
	} = $props();

	let dialogElement: HTMLDialogElement | undefined = $state();
	let dialogSupported = $state(true);

	onMount(() => {
		// Check if dialog element is supported
		if (
			typeof HTMLDialogElement === 'undefined' ||
			typeof HTMLDialogElement.prototype.showModal !== 'function'
		) {
			dialogSupported = false;
			// native <dialog> not supported; use fallback markup
			console.warn('HTMLDialogElement is not supported in this browser. Using fallback modal.');

			// Add Escape key handler to close fallback modal
			const escHandler = (e: KeyboardEvent) => {
				if (e.key === 'Escape' && open) {
					handleClose();
				}
			};
			window.addEventListener('keydown', escHandler);
			onDestroy(() => window.removeEventListener('keydown', escHandler));
		}
	});

	function handleClose() {
		onclose?.();
	}

	function handleCancel(e: Event) {
		// Prevent default close behavior and handle it ourselves
		e.preventDefault();
		handleClose();
	}

	function handleBackdropClick(e: MouseEvent) {
		// Only close if the click happened on the backdrop, not the content
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}

	function handleBackdropKey(e: KeyboardEvent) {
		// Allow Enter/Space to activate backdrop click for keyboard users
		if ((e.key === 'Enter' || e.key === ' ') && open) {
			// Prevent scrolling on space
			e.preventDefault();
			handleClose();
		}
	}

	async function updateDialog() {
		// Wait for DOM to be ready
		await tick();

		if (!dialogElement || !dialogSupported) return;

		if (open) {
			if (!dialogElement.open) dialogElement.showModal();
		} else {
			if (dialogElement.open) dialogElement.close();
		}
	}

	// Watch for open prop changes and show/hide dialog accordingly
	$effect(() => {
		if (open) {
			updateDialog();
		}
	});

	// If the dialog element gets bound after initial render, ensure we sync state
	$effect(() => {
		if (dialogElement && open) updateDialog();
	});
</script>

<dialog
	bind:this={dialogElement}
	class="dialog"
	aria-labelledby={title ? 'modal-title' : undefined}
	oncancel={handleCancel}
	onclose={handleClose}
>
	<div class="dialog-content" transition:fly={{ y: -20, duration: 200 }}>
		<div class="p-6">
			{#if title}
				<h2 id="modal-title" class="text-2xl font-semibold mb-6">{title}</h2>
			{/if}
			{#if children}{@render children()}{/if}
		</div>
	</div>
</dialog>

{#if !dialogSupported}
	<!-- Fallback modal for browsers without native <dialog> support -->
	<div
		class="modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby={title ? 'modal-title' : undefined}
		onclick={handleBackdropClick}
		onkeydown={handleBackdropKey}
		tabindex="-1"
		class:show={open}
	>
		<div class="dialog-content" transition:fly={{ y: -20, duration: 200 }}>
			<div class="p-6">
				{#if title}
					<h2 id="modal-title" class="text-2xl font-semibold mb-6">{title}</h2>
				{/if}
				{#if children}{@render children()}{/if}
			</div>
		</div>
	</div>
{/if}

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
