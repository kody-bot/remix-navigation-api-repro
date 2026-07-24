import type { Page } from 'playwright'
import * as assert from 'remix/assert'
import { createTestServer } from 'remix/node-fetch-server/test'
import { describe, it, type TestContext } from 'remix/test'

import { router } from './router.tsx'

async function load(t: TestContext, options: { navigationApi: boolean }) {
  const server = await createTestServer(router.fetch)
  const page = await t.serve(server)

  const bootErrors: string[] = []
  page.on('pageerror', (error) => bootErrors.push(error.message))

  if (!options.navigationApi) {
    // Removed before any page script runs, so the client runtime boots against
    // the same window shape a browser without the Navigation API gives it.
    await page.addInitScript(() => {
      Reflect.deleteProperty(Window.prototype, 'navigation')
      Reflect.deleteProperty(window, 'navigation')
    })
  }

  await page.goto('/')
  assert.equal(
    await text(page, '#navigation-api'),
    options.navigationApi ? 'present' : 'absent',
    'the browser was not in the expected Navigation API state',
  )

  // Clicking a hydrated button and seeing the DOM update means hydration has
  // finished, so every later read of the page is settled rather than timed.
  await page.click('#increment')
  await page.waitForFunction(() => document.getElementById('count')?.textContent === '1')

  return { page, bootErrors }
}

function text(page: Page, selector: string) {
  return page.locator(selector).textContent()
}

for (const navigationApi of [true, false]) {
  const label = navigationApi
    ? 'with the Navigation API (Chrome, Firefox >= 147, WebKit >= 26.2)'
    : 'without the Navigation API (Firefox <= 146, every browser on iOS <= 26.1)'

  describe(label, () => {
    it('stays interactive', async (t) => {
      const { page } = await load(t, { navigationApi })
      assert.equal(await text(page, '#count'), '1')
    })

    it('run() returns, so the code after it executes', async (t) => {
      const { page, bootErrors } = await load(t, { navigationApi })
      assert.deepEqual(bootErrors, [], `run() threw while booting: ${bootErrors.join(', ')}`)
      assert.equal(await text(page, '#boot-status'), 'run() returned, error reporting installed')
    })

    it('reports uncaught client errors to the listener registered after run()', async (t) => {
      const { page } = await load(t, { navigationApi })

      const thrown = page.waitForEvent('pageerror')
      await page.click('#throw')
      await thrown

      const reported = await text(page, '#reported-errors')
      assert.equal(reported, '1', `the listener saw ${reported} of 1 uncaught errors`)
    })
  })
}
