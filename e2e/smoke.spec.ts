import { expect, test } from '@playwright/test'

test('la app carga y sigue cargando sin conexión', async ({
  page,
  context,
}) => {
  await page.goto('/')
  const title = page.getByRole('heading', { name: 'Pedidator' })
  await expect(title).toBeVisible()

  // El service worker tiene que controlar la página antes de cortar la red.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await page.reload()
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(title).toBeVisible()
})

test('el manifiesto declara la app como standalone con iconos', async ({
  request,
  baseURL,
}) => {
  const indexRes = await request.get(baseURL ?? '/')
  const html = await indexRes.text()
  const match = html.match(/<link rel="manifest" href="([^"]+)"/)
  expect(match, 'enlace al manifiesto en index.html').not.toBeNull()

  const manifestUrl = new URL(match![1], baseURL)
  const manifest = await (await request.get(manifestUrl.toString())).json()
  expect(manifest.name).toBe('Pedidator')
  expect(manifest.display).toBe('standalone')
  const purposes = manifest.icons.map(
    (i: { purpose?: string; sizes: string }) =>
      `${i.sizes}:${i.purpose ?? 'any'}`,
  )
  expect(purposes).toEqual(
    expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']),
  )
})
