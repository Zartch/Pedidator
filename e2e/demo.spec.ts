import { expect, test, type Locator, type Page } from '@playwright/test'

// Demo mode (no VITE_MODE): everything lives in the browser's IndexedDB, and
// each test gets a fresh context, so each one starts from an empty database.
// UI texts are Catalan (default language), see src/i18n/ca/*.json.

function madridDay(offsetDays = 0): string {
  const base = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(base)
}

async function newOrder(
  page: Page,
  opts: { customer: string; day: string; time: string },
): Promise<void> {
  await page.getByRole('link', { name: 'Nou encàrrec' }).click()
  await page.getByLabel('Client', { exact: true }).fill(opts.customer)
  await page.getByLabel('Dia de recollida').fill(opts.day)
  await page.getByLabel('Hora', { exact: true }).fill(opts.time)
}

function itemRow(page: Page, n: number): Locator {
  return page.getByRole('listitem', { name: `Article ${n}` })
}

async function save(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Desa', exact: true }).click()
}

async function openDay(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Nou encàrrec' })).toBeVisible()
}

test('crear un encàrrec per avui, preparar-lo i veure el progrés', async ({
  page,
}) => {
  await openDay(page)
  await expect(page.getByText('Cap encàrrec per a aquest dia')).toBeVisible()

  await newOrder(page, { customer: 'Maria Soler', day: madridDay(), time: '10:30' })

  const first = itemRow(page, 1)
  await first.getByLabel('Article', { exact: true }).fill('Pollastre')
  await first.getByLabel('Quantitat').fill('2')

  await page.getByRole('button', { name: 'Afegeix un altre article' }).click()
  const second = itemRow(page, 2)
  await second.getByLabel('Article', { exact: true }).fill('Botifarra')
  await second.getByRole('button', { name: 'Pes', exact: true }).click()
  // Weight typed in grams (the unit defaults to g).
  await second.getByLabel('Quantitat').fill('750')
  await expect(second.getByText('= 750 g')).toBeVisible()
  await save(page)

  // Back on the day: the order is there, not prepared yet.
  const card = page.getByRole('article').filter({ hasText: 'Maria Soler' })
  await expect(card).toBeVisible()
  await expect(card.getByText('10:30')).toBeVisible()
  await expect(card.getByText('Per preparar · 0/2')).toBeVisible()
  await expect(card.getByText('750 g')).toBeVisible()
  await expect(page.getByText('0 de 1 encàrrec preparat')).toBeVisible()
  const bar = page.getByRole('progressbar', { name: 'Encàrrecs preparats' })
  await expect(bar).toHaveAttribute('aria-valuenow', '0')
  await expect(bar).toHaveAttribute('aria-valuemax', '1')

  await card.getByRole('checkbox', { name: /Pollastre/ }).click()
  await expect(card.getByText('Per preparar · 1/2')).toBeVisible()
  await expect(bar).toHaveAttribute('aria-valuenow', '0')

  await card.getByRole('checkbox', { name: /Botifarra/ }).click()
  await expect(card.getByText('Preparat', { exact: true })).toBeVisible()
  await expect(page.getByText('1 de 1 encàrrec preparat')).toBeVisible()
  await expect(bar).toHaveAttribute('aria-valuenow', '1')
})

test('un encàrrec de demà amb article del dia anterior surt a "Preparar avui per a demà" i marca el calendari', async ({
  page,
}) => {
  await openDay(page)
  const tomorrow = madridDay(1)

  await newOrder(page, { customer: 'Pere Vila', day: tomorrow, time: '11:00' })
  const row = itemRow(page, 1)
  await row.getByLabel('Article', { exact: true }).fill('Rostit de vedella')
  await row.getByLabel('Quantitat').fill('1')
  await row.getByRole('switch', { name: 'Preparar el dia abans' }).click()
  await save(page)

  // The form returns to tomorrow's day; go back to today.
  await page.getByRole('button', { name: 'Avui', exact: true }).click()

  const prep = page.getByRole('region', { name: 'Preparar avui per a demà' })
  await expect(prep).toBeVisible()
  await expect(prep.getByText('11:00 · Pere Vila')).toBeVisible()
  await expect(prep.getByText('0/1')).toBeVisible()

  // The calendar marks tomorrow as "prepare the day before" (month grid on this viewport).
  const tomorrowButton = page
    .getByRole('group', { name: /^Calendari de/ })
    .getByRole('button', { name: /preparar la vigília/ })
  await expect(tomorrowButton).toHaveCount(1)
  await expect(tomorrowButton).toContainText(String(Number(tomorrow.slice(8))))

  await prep.getByRole('checkbox', { name: /Rostit de vedella/ }).click()
  await expect(prep.getByText('1/1')).toBeVisible()
})

test('lliurar un encàrrec el plega a "Lliurats"', async ({ page }) => {
  await openDay(page)
  await newOrder(page, { customer: 'Anna Puig', day: madridDay(), time: '12:00' })
  const row = itemRow(page, 1)
  await row.getByLabel('Article', { exact: true }).fill('Costelles')
  await row.getByLabel('Quantitat').fill('3')
  await save(page)

  const card = page.getByRole('article').filter({ hasText: 'Anna Puig' })
  await card.getByRole('checkbox', { name: /Costelles/ }).click()
  await card.getByRole('button', { name: 'Lliurar', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Lliurar', exact: true })
    .click()

  await expect(card).toHaveCount(0)
  await expect(page.getByText('1 lliurat', { exact: true })).toBeVisible()

  // The delivered group is always there, folded.
  const group = page.getByRole('button', { name: 'Lliurats (1)' })
  await expect(group).toBeVisible()
  await expect(group).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('link', { name: /Anna Puig/ })).toHaveCount(0)
  await group.click()
  await expect(page.getByRole('link', { name: /Anna Puig/ })).toBeVisible()
})

test('lliurar deixant a deure crea el ticket pendent', async ({ page }) => {
  await openDay(page)
  await newOrder(page, { customer: 'Laia Roca', day: madridDay(), time: '12:00' })
  const row = itemRow(page, 1)
  await row.getByLabel('Article', { exact: true }).fill('Llonganissa')
  await row.getByLabel('Quantitat').fill('1')
  await save(page)

  const card = page.getByRole('article').filter({ hasText: 'Laia Roca' })
  await card.getByRole('checkbox', { name: /Llonganissa/ }).click()
  await card.getByRole('button', { name: 'Lliurar', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Lliurar i deixar a deure' }).click()
  await dialog.getByLabel('Import').fill('8,40')
  await dialog.getByRole('button', { name: 'Lliurar i crear ticket' }).click()
  await expect(card).toHaveCount(0)

  await page.getByRole('link', { name: 'Tickets' }).click()
  await expect(page.getByRole('heading', { name: 'Laia Roca' })).toBeVisible()
  await expect(page.getByText('8,40').first()).toBeVisible()
})

test('crear un ticket i marcar-lo com a pagat', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Tickets' }).click()
  await expect(page.getByText('No hi ha tickets pendents')).toBeVisible()

  await page.getByRole('button', { name: 'Nou ticket' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Client', { exact: true }).fill('Joan Ferrer')
  await dialog.getByLabel('Import').fill('12,50')
  await dialog.getByRole('button', { name: 'Desa', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Joan Ferrer' })).toBeVisible()
  await expect(page.getByText('12,50').first()).toBeVisible()

  await page.getByRole('button', { name: /^Marca com a pagat: Joan Ferrer/ }).click()
  await expect(page.getByRole('heading', { name: 'Joan Ferrer' })).toHaveCount(0)
  await expect(page.getByText('No hi ha tickets pendents')).toBeVisible()
})

test('un ticket pagat es veu a Pagats i torna a pendent', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Tickets' }).click()
  await page.getByRole('button', { name: 'Nou ticket' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Client', { exact: true }).fill('Lluís Mas')
  await dialog.getByLabel('Import').fill('7,30')
  await dialog.getByRole('button', { name: 'Desa', exact: true }).click()
  await page.getByRole('button', { name: /^Marca com a pagat: Lluís Mas/ }).click()
  await expect(page.getByRole('heading', { name: 'Lluís Mas' })).toHaveCount(0)

  await page.getByRole('tab', { name: 'Pagats' }).click()
  await expect(page.getByRole('heading', { name: 'Lluís Mas' })).toBeVisible()
  await expect(page.getByTestId('paid-total')).toHaveText('7,30 €')

  await page.getByRole('button', { name: 'Torna a pendent' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Torna a pendent', exact: true })
    .click()
  await expect(page.getByText('No hi ha tickets pagats')).toBeVisible()

  await page.getByRole('tab', { name: 'Pendents' }).click()
  await expect(page.getByRole('heading', { name: 'Lluís Mas' })).toBeVisible()
})

test('canviar d\'idioma tradueix la interfície', async ({ page }) => {
  await openDay(page)
  await expect(page.getByRole('link', { name: 'Nou encàrrec' })).toBeVisible()

  await page.getByLabel('Idioma').selectOption('es')
  await expect(page.getByRole('link', { name: 'Nuevo encargo' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Nou encàrrec' })).toHaveCount(0)

  await page.getByLabel('Idioma').selectOption('ca')
  await expect(page.getByRole('link', { name: 'Nou encàrrec' })).toBeVisible()
})

test('les dades segueixen després de recarregar sense connexió', async ({
  page,
  context,
}) => {
  await openDay(page)
  await newOrder(page, { customer: 'Rosa Camps', day: madridDay(), time: '09:15' })
  const row = itemRow(page, 1)
  await row.getByLabel('Article', { exact: true }).fill('Llom')
  await row.getByLabel('Quantitat').fill('4')
  await save(page)
  await expect(
    page.getByRole('article').filter({ hasText: 'Rosa Camps' }),
  ).toBeVisible()

  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await page.reload()
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true)

  await context.setOffline(true)
  await page.reload()
  const card = page.getByRole('article').filter({ hasText: 'Rosa Camps' })
  await expect(card).toBeVisible()
  await expect(card.getByText('Llom')).toBeVisible()
})

test('editar un producte del catàleg es veu als suggeriments del formulari', async ({
  page,
}) => {
  await openDay(page)
  // Saving an order fills the catalogue by itself.
  await newOrder(page, { customer: 'Marta Vidal', day: madridDay(), time: '09:00' })
  await itemRow(page, 1).getByLabel('Article', { exact: true }).fill('Entrecot')
  await save(page)
  await expect(page.getByRole('article').filter({ hasText: 'Marta Vidal' })).toBeVisible()

  await page.getByRole('link', { name: 'Productes' }).click()
  await expect(page.getByRole('heading', { name: 'Productes' })).toBeVisible()
  await page.getByRole('link', { name: /Entrecot/ }).click()
  await page.getByLabel('Nom', { exact: true }).fill('Entrecot de vedella')
  await page.getByRole('button', { name: 'Pes', exact: true }).click()
  await page.getByRole('button', { name: 'Desa', exact: true }).click()
  await expect(page.getByRole('link', { name: /Entrecot de vedella/ })).toBeVisible()

  await page.getByRole('link', { name: 'Dia', exact: true }).click()
  await page.getByRole('link', { name: 'Nou encàrrec' }).click()
  const name = itemRow(page, 1).getByLabel('Article', { exact: true })
  await name.fill('entre')
  await expect(page.getByRole('button', { name: 'Entrecot de vedella' })).toBeVisible()
})
