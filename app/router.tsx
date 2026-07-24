import { createController, createRouter, type MiddlewareContext } from 'remix/router'

import { assetServer } from './assets.ts'
import { HomePage } from './home-page.tsx'
import { render } from './render.tsx'
import { routes } from './routes.ts'

type AppContext = MiddlewareContext<[ReturnType<typeof render>]>

declare module 'remix/router' {
  interface RouterTypes {
    context: AppContext
  }
}

export const router = createRouter<AppContext>({ middleware: [render()] })

router.map(
  routes,
  createController(routes, {
    actions: {
      async assets(context) {
        return (
          (await assetServer.fetch(context.request)) ?? new Response('Not Found', { status: 404 })
        )
      },
      home(context) {
        return context.render(<HomePage />)
      },
    },
  }),
)
