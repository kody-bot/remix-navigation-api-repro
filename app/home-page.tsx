import { Counter } from './assets/counter.tsx'
import { routes } from './routes.ts'

export function HomePage() {
  return () => (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Remix 3 unguarded window.navigation</title>
        {/* Runs before the app entry, so the runtime boots without the Navigation API. */}
        <script
          type="module"
          src={routes.assets.href({ path: 'app/assets/simulate-legacy-browser.ts' })}
        ></script>
      </head>
      <body>
        <h1>Remix 3 unguarded window.navigation</h1>
        <p>
          Navigation API: <output id="navigation-api">unknown</output>
        </p>
        <p>
          After run(): <output id="boot-status">run() has not returned</output>
        </p>
        <p>
          Uncaught errors reported: <output id="reported-errors">0</output>
        </p>
        <Counter />
        <script type="module" src={routes.assets.href({ path: 'app/assets/entry.ts' })}></script>
      </body>
    </html>
  )
}
