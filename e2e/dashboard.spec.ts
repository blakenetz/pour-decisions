import { expect, type Page, test } from '@playwright/test'

const PASSWORD = process.env.E2E_TEST_PASSWORD
if (!PASSWORD) {
	throw new Error('E2E_TEST_PASSWORD must be set (see .env.test.local)')
}

async function loginAs(page: Page, email: string) {
	await page.goto('/')
	const loginButton = page.getByRole('button', { name: 'Login' })
	await expect(loginButton).toBeVisible()

	// The button's onclick only exists after Svelte hydration attaches it;
	// a click that lands before hydration is a no-op. Retry the click until
	// the modal actually opens rather than racing hydration once.
	await expect(async () => {
		await loginButton.click()
		await expect(page.locator('#login-email')).toBeVisible({ timeout: 1000 })
	}).toPass({ timeout: 15_000 })

	await page.locator('#login-email').fill(email)
	await page.locator('#login-password').fill(PASSWORD as string)
	await page.getByRole('button', { name: 'Sign in' }).click()
	await page.waitForURL('**/dashboard')
}

test.describe('pour-count-tiered dashboard', () => {
	test('redirects unauthenticated visitors away from /dashboard', async ({ page }) => {
		await page.goto('/dashboard')
		await expect(page).toHaveURL('/')
	})

	test('shows the empty state for a user with 0 pours', async ({ page }) => {
		await loginAs(page, process.env.E2E_ZERO_EMAIL as string)
		await expect(page.getByRole('heading', { name: 'No pours yet.' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Log a Pour' })).toBeVisible()
	})

	test('shows the "not enough data" state for a user with 1-10 pours', async ({ page }) => {
		await loginAs(page, process.env.E2E_LOW_EMAIL as string)
		await expect(page.getByRole('heading', { name: 'Not enough data.' })).toBeVisible()
		await expect(page.getByText(/Pour a few more: 5\/11 pours/)).toBeVisible()
	})

	test('shows the full stats dashboard for a user with 11+ pours', async ({ page }) => {
		await loginAs(page, process.env.E2E_HIGH_EMAIL as string)
		await expect(page.getByText('Total Pours')).toBeVisible()
		await expect(page.getByText('15', { exact: true })).toBeVisible()
		await expect(page.getByText('Average Ratings')).toBeVisible()
		await expect(page.getByText('Pours Over Time')).toBeVisible()
		await expect(page.getByText('Top Roasters')).toBeVisible()
		await expect(page.getByText('Top Regions')).toBeVisible()
	})
})
