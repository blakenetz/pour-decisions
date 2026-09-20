import { execFileSync } from 'node:child_process'

/**
 * Seeds the three e2e test accounts to their expected pour-count tiers before
 * the suite runs, so each test observes deterministic dashboard state.
 */
export default function globalSetup() {
	const zero = process.env.E2E_ZERO_SUB
	const low = process.env.E2E_LOW_SUB
	const high = process.env.E2E_HIGH_SUB
	if (!zero || !low || !high) {
		throw new Error('E2E_ZERO_SUB, E2E_LOW_SUB, and E2E_HIGH_SUB must be set (see .env.test)')
	}

	execFileSync('pnpm', ['seed', `--zero=${zero}`, `--low=${low}`, `--high=${high}`], {
		stdio: 'inherit'
	})
}
