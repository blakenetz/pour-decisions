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

test('saved defaults fill the pour form only when asked, and clearing them removes the option', async ({
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
	// Nothing is applied on load.
	await expect(page.locator('#brewMethod')).toHaveValue('')
	await expect(page.locator('#coffeeGrams')).toHaveValue('')
	await expect(page.locator('input[name="brewTimeSeconds"]')).toHaveValue('')
	await expect(page.locator('#location')).toHaveValue('home')

	await page.getByRole('button', { name: 'Use my brew defaults' }).click()
	await expect(page.locator('#brewMethod')).toHaveValue('Pour Over')
	await expect(page.locator('#grindSize')).toHaveValue('Medium-Fine')
	await expect(page.locator('#coffeeGrams')).toHaveValue('18')
	await expect(page.locator('#waterGrams')).toHaveValue('300')
	await expect(page.locator('#waterTempF')).toHaveValue('205')
	await expect(page.locator('input[name="brewTimeSeconds"]')).toHaveValue('210')
	await expect(page.getByLabel('Brew time minutes')).toHaveValue('3')
	await expect(page.locator('#location')).toHaveValue('out')
	// The filled fields live in the collapsed details, which opens so they're visible.
	await expect(page.locator('#grindSize')).toBeVisible()

	// Blank fields mean "no default": with nothing saved, the form offers no fill button.
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
	await expect(page.getByRole('button', { name: 'Use my brew defaults' })).toHaveCount(0)
	await expect(page.getByRole('link', { name: 'profile' })).toBeVisible()
})

test('a grinder replaces grind size with its own dial, filed under a shared band', async ({
	page
}) => {
	await loginAs(page, process.env.E2E_ZERO_EMAIL as string)

	await open(page, '/profile')
	await page.locator('#grinder').selectOption('baratza-encore')
	await expect(page.locator('#grindSize')).toHaveCount(0)
	await expect(page.getByLabel('Setting (0–40)')).toBeVisible()
	await page.locator('#grindSetting').selectOption('14')
	await expect(page.getByText('≈ Medium-Fine')).toBeVisible()
	await saveDefaults(page)

	await open(page, '/pours/new')
	await page.getByRole('button', { name: 'Use my brew defaults' }).click()
	await expect(page.locator('#grinder')).toHaveValue('baratza-encore')
	await expect(page.locator('#grindSetting')).toHaveValue('14')
	await page.locator('#grindSetting').selectOption('32')
	await expect(page.getByText('≈ Coarse')).toBeVisible()

	// Another grinder's dial replaces the setting list, and the old setting doesn't carry over.
	await page.locator('#grinder').selectOption('fellow-ode-gen-2')
	await expect(page.locator('#grindSetting')).toHaveValue('')
	await page.locator('#grindSetting').selectOption('4.2')
	await expect(page.getByText('≈ Medium-Fine')).toBeVisible()

	// Back to no specific grinder: the descriptive sizes return, and the defaults are cleared.
	await open(page, '/profile')
	await page.locator('#grinder').selectOption('')
	await expect(page.locator('#grindSetting')).toHaveCount(0)
	await expect(page.locator('#grindSize')).toHaveValue('')
	await saveDefaults(page)
	await open(page, '/pours/new')
	await expect(page.getByRole('button', { name: 'Use my brew defaults' })).toHaveCount(0)
})

test('profile rejects a default recipe with less water than coffee', async ({ page }) => {
	await loginAs(page, process.env.E2E_ZERO_EMAIL as string)

	await open(page, '/profile')
	await page.locator('#coffeeGrams').fill('30')
	await page.locator('#waterGrams').fill('20')
	await page.getByRole('button', { name: 'Save defaults' }).click()
	await expect(page.getByText('Water weight must be at least the coffee weight')).toBeVisible()
})
