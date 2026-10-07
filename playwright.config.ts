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

export default defineConfig({
	testDir: './e2e',
	globalSetup: './e2e/global-setup.ts',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: 'line',
	use: {
		baseURL: 'http://localhost:8008',
		trace: 'on-first-retry'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: {
		command: 'pnpm dev',
		url: 'http://localhost:8008',
		reuseExistingServer: true,
		timeout: 30_000
	}
})
