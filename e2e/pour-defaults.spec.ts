import { expect, type Page, test } from '@playwright/test'
import { loginAs } from './auth'

/** Navigates and waits for hydration: input typed before it is overwritten when Svelte applies
 *  the server-rendered `value`s, so filling earlier races the page. */
async function open(page: Page, path: string) {
	await page.goto(path)
	await page.waitForLoadState('networkidle')
}

async function saveDefaults(page: Page) {
	await page.getByRole('button', { name: 'Save defaults' }).click()
	await expect(page.getByText('Saved.')).toBeVisible()
}

test('profile defaults pre-fill the pour form, and clearing them removes the pre-fill', async ({
	page
}) => {
	await loginAs(page, process.env.E2E_ZERO_EMAIL as string)

	await open(page, '/profile')
	await page.locator('#brewMethod').selectOption('Pour Over')
	await page.locator('#grindSize').selectOption('Medium-Fine')
	await page.locator('#coffeeGrams').fill('18')
	await page.locator('#waterGrams').fill('300')
	await page.locator('#waterTempF').fill('205')
	await page.getByLabel('Brew time minutes').fill('3')
	await page.getByLabel('Brew time seconds').fill('30')
	await page.locator('#location').selectOption('out')
	await saveDefaults(page)

	await open(page, '/pours/new')
	await expect(page.locator('#brewMethod')).toHaveValue('Pour Over')
	await expect(page.locator('#grindSize')).toHaveValue('Medium-Fine')
	await expect(page.locator('#coffeeGrams')).toHaveValue('18')
	await expect(page.locator('#waterGrams')).toHaveValue('300')
	await expect(page.locator('#waterTempF')).toHaveValue('205')
	await expect(page.locator('input[name="brewTimeSeconds"]')).toHaveValue('210')
	await expect(page.locator('#location')).toHaveValue('out')
	// Most of these live in the collapsed details, so the form must say they're pre-filled.
	await expect(page.getByText('brew setup pre-filled')).toBeVisible()

	// Blank fields mean "no default": clearing everything leaves the form unseeded.
	await open(page, '/profile')
	await page.locator('#brewMethod').selectOption('')
	await page.locator('#grindSize').selectOption('')
	await page.locator('#coffeeGrams').fill('')
	await page.locator('#waterGrams').fill('')
	await page.locator('#waterTempF').fill('')
	await page.getByLabel('Brew time minutes').fill('')
	await page.getByLabel('Brew time seconds').fill('')
	await page.locator('#location').selectOption('')
	await saveDefaults(page)

	await open(page, '/pours/new')
	await expect(page.locator('#brewMethod')).toHaveValue('')
	await expect(page.locator('#coffeeGrams')).toHaveValue('')
	await expect(page.locator('input[name="brewTimeSeconds"]')).toHaveValue('')
	await expect(page.locator('#location')).toHaveValue('home')
	await expect(page.getByText('brew setup pre-filled')).toHaveCount(0)
})

test('profile rejects a default recipe with less water than coffee', async ({ page }) => {
	await loginAs(page, process.env.E2E_ZERO_EMAIL as string)

	await open(page, '/profile')
	await page.locator('#coffeeGrams').fill('30')
	await page.locator('#waterGrams').fill('20')
	await page.getByRole('button', { name: 'Save defaults' }).click()
	await expect(page.getByText('Water weight must be at least the coffee weight')).toBeVisible()
})
