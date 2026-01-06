// place files you want to import through the `$lib` alias in this folder.
export { default as OvalButton } from './components/actions/OvalButton.svelte';
export { default as LoopLink } from './components/actions/LoopLink.svelte';
export { default as SquigglyLink } from './components/actions/SquigglyLink.svelte';
export { default as Modal } from './components/Modal.svelte';
export { default as LoginModal } from './components/LoginModal.svelte';
export { default as SignupModal } from './components/SignupModal.svelte';

// Auth utilities
export {
	getAuthUser,
	isAuthenticated,
	getAuthSession,
	signInUser,
	signOutUser
} from './auth/auth';
export { initAmplify } from './auth/amplifyClient';
