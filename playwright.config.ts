import { defineConfig, devices } from '@playwright/test'

try {
	process.loadEnvFile('.env')
} catch {
	// optional
}
try {
	process.loadEnvFile('.env.test')
} catch {
	// optional
}
try {
	process.loadEnvFile('.env.test.local')
} catch {
	// optional
}

// CI runs the suite against the freshly deployed dev URL; locally it starts (or reuses) `pnpm dev`.
const deployedUrl = process.env.E2E_BASE_URL

export default defineConfig({
	testDir: './e2e',
	globalSetup: './e2e/global-setup.ts',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: 'line',
	use: {
		baseURL: deployedUrl ?? 'http://localhost:8008',
		trace: 'on-first-retry'
	},
	projects: [
		{
			name: 'chromium',
			testIgnore: /mobile\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] }
		},
		{
			// Phones are the primary device; layout specs run on a phone viewport.
			name: 'mobile',
			testMatch: /mobile\.spec\.ts/,
			use: { ...devices['Pixel 7'] }
		}
	],
	webServer: deployedUrl
		? undefined
		: {
				command: 'pnpm dev',
				url: 'http://localhost:8008',
				reuseExistingServer: true,
				timeout: 30_000
			}
})
