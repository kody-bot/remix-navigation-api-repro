import { renderWith } from 'remix/middleware/render'
import { createHtmlResponse } from 'remix/response/html'
import type { RemixNode } from 'remix/ui'
import { renderToStream } from 'remix/ui/server'

import { assetServer } from './assets.ts'

export function render() {
  return renderWith(
    ({ request }) =>
      function render(node: RemixNode, init?: ResponseInit) {
        const stream = renderToStream(node, {
          frameSrc: request.url,
          signal: request.signal,
          async resolveClientEntry(entryId) {
            return {
              href: await assetServer.getHref(entryId),
              exportName: entryId.split('#')[1]!,
            }
          },
        })

        return createHtmlResponse(stream, init)
      },
  )
}
