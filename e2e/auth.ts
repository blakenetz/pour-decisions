import { expect, type Page } from '@playwright/test'

const PASSWORD = process.env.E2E_TEST_PASSWORD
if (!PASSWORD) {
	throw new Error('E2E_TEST_PASSWORD must be set (see .env.test.local)')
}

export async function loginAs(page: Page, email: string) {
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
