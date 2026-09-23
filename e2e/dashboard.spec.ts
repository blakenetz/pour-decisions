import { expect, type Page, test } from '@playwright/test'

const PASSWORD = process.env.E2E_TEST_PASSWORD
if (!PASSWORD) {
	throw new Error('E2E_TEST_PASSWORD must be set (see .env.test.local)')
}

/** Pour count the seed script gives the "high" tier account. */
const HIGH_TIER_POURS = 120

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

	test('shows the explorable dashboard for a user with 11+ pours', async ({ page }) => {
		await loginAs(page, process.env.E2E_HIGH_EMAIL as string)
		await expect(page.getByRole('heading', { name: 'What your log says' })).toBeVisible()
		await expect(page.getByRole('heading', { name: 'Explore' })).toBeVisible()
		await expect(page.getByText('Pours in view').first()).toBeVisible()
		await expect(page.getByText(String(HIGH_TIER_POURS), { exact: true }).first()).toBeVisible()
		await expect(page.getByRole('link', { name: 'Log a Pour' })).toBeVisible()
	})
})

test.describe('dashboard drill-down', () => {
	test.beforeEach(async ({ page }) => {
		await loginAs(page, process.env.E2E_HIGH_EMAIL as string)
	})

	test('filtering by origin narrows every downstream view', async ({ page }) => {
		const unfilteredRows = await page.locator('tbody tr').count()
		await page.locator('#filter-country').selectOption('Ethiopia')

		// The pour table only lists the filtered origin.
		const originCells = page.locator('tbody tr td:nth-child(3)')
		const count = await originCells.count()
		expect(count).toBeGreaterThan(0)
		for (let i = 0; i < count; i++) {
			await expect(originCells.nth(i)).toContainText('Ethiopia')
		}

		// The table is capped, so narrowing shows up as the chip plus a row set that
		// is no larger than the unfiltered one — every row of which is Ethiopian.
		expect(count).toBeLessThanOrEqual(unfilteredRows)
		await expect(page.getByRole('button', { name: /Origin: Ethiopia/ })).toBeVisible()
	})

	test('grind size axis stays in fine-to-coarse order, not alphabetical', async ({ page }) => {
		await page.locator('#filter-brewMethod').selectOption('Pour Over')
		await page.locator('#breakdown').selectOption('grindSize')

		const labels = await page
			.locator('.lc-axis-tick text, svg text')
			.allTextContents()
			.then((all) => all.map((t) => t.trim()))

		const grindOrder = [
			'Extra Fine',
			'Fine',
			'Medium-Fine',
			'Medium',
			'Medium-Coarse',
			'Coarse',
			'Extra Coarse'
		]
		const present = labels.filter((label) => grindOrder.includes(label))
		expect(present.length).toBeGreaterThan(1)

		const ranks = present.map((label) => grindOrder.indexOf(label))
		const sorted = [...ranks].sort((a, b) => a - b)
		expect(ranks).toEqual(sorted)
	})

	test('clearing filters restores the full collection', async ({ page }) => {
		await page.locator('#filter-country').selectOption('Ethiopia')
		await expect(page.getByRole('button', { name: /Origin: Ethiopia/ })).toBeVisible()

		await page.getByRole('button', { name: 'Clear all' }).click()
		await expect(page.getByRole('button', { name: /Origin: Ethiopia/ })).toHaveCount(0)
		await expect(page.getByText(String(HIGH_TIER_POURS), { exact: true }).first()).toBeVisible()
	})
})
