import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { loginAs } from './auth'

// The zero-pour account must end empty: later specs expect it to have no pours.
test.afterAll(() => {
	execFileSync('pnpm', ['seed', `--userId=${process.env.E2E_ZERO_SUB}`, '--count=0', '--clear'], {
		stdio: 'inherit'
	})
})

test('logs a beer with a custom style and refills it from Last entry', async ({ page }) => {
	await loginAs(page, process.env.E2E_ZERO_EMAIL as string)
	await page.goto('/pours/new')
	await page.waitForLoadState('networkidle')
	await page.getByRole('button', { name: 'Beer', exact: true }).click()

	await page.locator('#brewery').fill('Smoke Brewing')
	await page.locator('#productName').fill('Frost Line')

	await page.locator('#style').selectOption('__custom__')
	await page.locator('#customStyle').fill('Cold IPA')
	await page
		.getByRole('group', { name: 'Style family' })
		.getByRole('button', { name: 'IPA', exact: true })
		.click()

	await page.locator('#abv').fill('5.8')
	await page.getByRole('button', { name: 'Can', exact: true }).click()
	await page
		.locator('div:has(> input[name="overallRating"]) > div:last-child button')
		.nth(7)
		.click()

	await page.locator('summary', { hasText: 'Beer Details' }).click()
	await page.locator('#hops').fill('citra, mosaic')
	await page.locator('#hops').blur()

	await page.getByRole('button', { name: 'Save' }).click()
	await page.waitForURL((url) => !url.pathname.startsWith('/pours/new'))

	// The form reopens on the beverage logged last, and offers the new style by name.
	await page.goto('/pours/new')
	await page.waitForLoadState('networkidle')
	await expect(page.getByRole('button', { name: 'Beer', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	)
	await expect(
		page.locator('#style optgroup[label="Your styles"] option', { hasText: 'Cold IPA' })
	).toHaveCount(1)

	await page.getByRole('button', { name: 'Last entry' }).click()
	await expect(page.locator('#brewery')).toHaveValue('Smoke Brewing')
	await expect(page.locator('#style')).toHaveValue('Cold IPA')
	await expect(page.locator('input[name="hops"]')).toHaveValue('citra, mosaic')
	await expect(page.locator('input[name="overallRating"]')).toHaveValue('8')
})
