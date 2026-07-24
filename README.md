# Remix 3 client runtime reads `window.navigation` without a feature check

`run()` from `remix/ui` throws on any browser that does not implement the
Navigation API, so it never returns and every line of application code
sequenced after it silently never executes.

Reproduction for [remix-run/remix#11641](https://github.com/remix-run/remix/issues/11641).

## Versions

| | |
| --- | --- |
| `remix` | `3.0.0-beta.5` (pinned exactly) |
| `@remix-run/ui` | `0.4.0` (reached through `remix`, pinned with an npm `overrides` entry so a later release cannot silently change what this reproduces) |
| Node | 24.3.0 or newer |
| Browser | Chrome for Testing 149.0.7827.55, via Playwright 1.61.1 |

## Steps

```sh
npm install
npx playwright install chromium
npm test
```

### Expected

All six tests pass. Removing the Navigation API should change how navigation
behaves, not whether the runtime boots.

### Actual

Four pass, two fail.

```
▶ with the Navigation API (Chrome, Firefox >= 147, WebKit >= 26.2)
  ✓ stays interactive
  ✓ run() returns, so the code after it executes
  ✓ reports uncaught client errors to the listener registered after run()
▶ without the Navigation API (Firefox <= 146, every browser on iOS <= 26.1)
  ✓ stays interactive
  ✗ run() returns, so the code after it executes
    Error: run() threw while booting: Cannot read properties of undefined (reading 'updateCurrentEntry')
  ✗ reports uncaught client errors to the listener registered after run()
    Error: the listener saw 0 of 1 uncaught errors
```

The uncaught error on boot, verbatim from Chrome 149 running this app:

```
TypeError: Cannot read properties of undefined (reading 'updateCurrentEntry')
    at startNavigationListenerImpl (http://localhost:44100/assets/node_modules/%40remix-run/ui/dist/runtime/navigation.js:36:13)
    at startNavigationListener (http://localhost:44100/assets/node_modules/%40remix-run/ui/dist/runtime/navigation.js:28:9)
    at run (http://localhost:44100/assets/node_modules/%40remix-run/ui/dist/runtime/run.js:53:2)
    at http://localhost:44100/assets/app/assets/entry.ts:2:13
```

The same throw was reported from production on the affected engines, where the
wording differs: Firefox says
`TypeError: can't access property "updateCurrentEntry", r is undefined` and
WebKit says `TypeError: undefined is not an object (evaluating 'r.updateCurrentEntry')`.

## Cause

[`packages/ui/src/runtime/navigation.ts#L59-L63`](https://github.com/remix-run/remix/blob/ui@0.4.0/packages/ui/src/runtime/navigation.ts#L59-L63)
reads `window.navigation` and calls a method on it with no feature check:

```ts
let navigation = window.navigation

navigation.updateCurrentEntry({
  state: { target: undefined, src: window.location.href, resetScroll: true, $rmx: true },
})
```

[`run()`](https://github.com/remix-run/remix/blob/ui@0.4.0/packages/ui/src/runtime/run.ts#L102)
calls `startNavigationListener()` during boot, after `createFrame()` but before
it returns. `navigate()` at
[line 37](https://github.com/remix-run/remix/blob/ui@0.4.0/packages/ui/src/runtime/navigation.ts#L37)
has the same unguarded read.

A feature check is the obvious remedy; what the runtime should do instead of
intercepting navigations is a design question this reproduction does not try to
answer.

## What actually breaks

Not the page. Hydration is already in flight when `run()` throws, so it
completes: the `increment` button in this app still works with the Navigation
API removed, and both tests named `stays interactive` pass. This is not a blank
screen.

What breaks is everything the application sequences after `run()`. In
[`app/assets/entry.ts`](./app/assets/entry.ts) that is the global error
listener, which is where the production app that hit this bug wired up its
error reporting:

```ts
const app = run({ ... })

// never runs without the Navigation API
window.addEventListener('error', () => { ... })
```

So affected users get an app that mostly works, throws real client errors, and
reports none of them. The page prints an `Uncaught errors reported` counter to
make that visible: with the Navigation API it reads `1` after clicking
`throw an uncaught error`, without it the counter stays at `0` while the browser
console shows the error.

## Affected browsers

The Navigation API only reached
[Baseline Newly Available on 2026-01-13](https://web-platform-dx.github.io/web-features-explorer/features/navigation/);
two of the three engines shipped it this year.

| Engine | Has Navigation API | Affected |
| --- | --- | --- |
| Chromium | Chrome and Edge 102 (2022) | Samsung Internet 18 and earlier |
| Gecko | Firefox 147 (2026) | Firefox 146 and earlier |
| WebKit | Safari 26.2 (2026) | Safari and iOS 26.1 and earlier |

Every browser on iOS is WebKit, so on iOS 26.1 and earlier this affects Safari,
Chrome, Firefox, Edge, and in-app browsers alike.

Observed in production on `remix@3.0.0-beta.5`.

## How this reproduces on a modern browser

The tests delete `window.navigation` before any page script runs
([`app/navigation-api.test.e2e.ts`](./app/navigation-api.test.e2e.ts)):

```ts
await page.addInitScript(() => {
  Reflect.deleteProperty(Window.prototype, 'navigation')
  Reflect.deleteProperty(window, 'navigation')
})
```

Both deletes are needed to leave the window in the same state as a browser
without the API: `'navigation' in window` is `false` and nothing is stubbed, so
`startNavigationListenerImpl` runs the real code path against a real absent
global rather than a mock. Each test asserts that state before asserting
anything else, so a simulation that stopped working would fail loudly instead of
passing silently.

## Reproducing by hand

```sh
npm start
```

- <http://localhost:44100> boots normally.
- <http://localhost:44100/?legacy> removes the Navigation API from a module that
  runs before the app entry
  ([`app/assets/simulate-legacy-browser.ts`](./app/assets/simulate-legacy-browser.ts))
  and reproduces the failure. Open devtools to see the `TypeError`.

On a real Firefox 146 or iOS 26.1 device, plain <http://localhost:44100> fails
the same way with no query parameter.

## Files

```
server.ts                              node http server
app/routes.ts                          two routes: assets, home
app/router.tsx                         router and controller
app/render.tsx                         renderWith + renderToStream
app/assets.ts                          asset server for app/assets/**
app/home-page.tsx                      the whole page
app/assets/simulate-legacy-browser.ts  removes window.navigation on ?legacy
app/assets/entry.ts                    run(), then the code that never executes
app/assets/counter.tsx                 hydrated component, shows the page still works
app/navigation-api.test.e2e.ts         the failing tests
```
