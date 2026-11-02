import { expect, type Page, test } from '@playwright/test'
import { loginAs } from './auth'

/** Smallest comfortable touch target (Apple HIG: 44pt). */
const MIN_TAP = 44

async function expectNoHorizontalScroll(page: Page) {
	const [scrollWidth, innerWidth] = await page.evaluate(() => [
		document.documentElement.scrollWidth,
		window.innerWidth
	])
	expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
}

/** Expands every collapsed section of the tasting details; already-open ones stay open. Opening
 *  one drops it from the `:not([open])` match, so this always clicks the first left. */
async function openAllSections(page: Page) {
	const collapsed = page.locator('form details:not([open]) > summary')
	while ((await collapsed.count()) > 0) {
		await collapsed.first().click()
	}
}

/** The form opens on whichever beverage the account logged last, so tests pick one. */
async function chooseBeverage(page: Page, beverage: 'Coffee' | 'Beer') {
	await page.getByRole('button', { name: beverage, exact: true }).click()
}

test.beforeEach(async ({ page }) => {
	await loginAs(page, process.env.E2E_LOW_EMAIL as string)
	await page.goto('/pours/new')
	await page.waitForLoadState('networkidle')
})

test('Save stays on screen and the page never scrolls sideways', async ({ page }) => {
	const save = page.getByRole('button', { name: 'Save' })

	await chooseBeverage(page, 'Coffee')
	await expect(save).toBeInViewport()
	await expectNoHorizontalScroll(page)

	// Expanded, the form runs several screens; Save must still be reachable mid-form.
	await openAllSections(page)
	await page.locator('#coffeeGrams').scrollIntoViewIfNeeded()
	await expect(save).toBeInViewport()
	await expectNoHorizontalScroll(page)

	await page.locator('#freeText').scrollIntoViewIfNeeded()
	await expect(save).toBeInViewport()
})

test('rating scales and toggles are big enough to tap', async ({ page }) => {
	for (const beverage of ['Coffee', 'Beer'] as const) {
		await chooseBeverage(page, beverage)
		await openAllSections(page)

		const targets = page.locator('form button[type="button"]:visible')
		const count = await targets.count()
		expect(count).toBeGreaterThan(0)
		for (let i = 0; i < count; i++) {
			const box = await targets.nth(i).boundingBox()
			const label = await targets.nth(i).textContent()
			expect(box?.height, `${beverage}: "${label?.trim()}" height`).toBeGreaterThanOrEqual(MIN_TAP)
			expect(box?.width, `${beverage}: "${label?.trim()}" width`).toBeGreaterThanOrEqual(MIN_TAP)
		}
	}
})
