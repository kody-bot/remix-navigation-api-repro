import { clientEntry, on, type Handle } from 'remix/ui'

// A hydrated component, so the reproduction can show that hydration itself
// survives the throw and the page is still interactive.
export const Counter = clientEntry(`${import.meta.url}#Counter`, function Counter(handle: Handle) {
  let count = 0

  return () => (
    <p>
      <button
        type="button"
        id="increment"
        mix={on('click', () => {
          count += 1
          handle.update()
        })}
      >
        increment
      </button>{' '}
      <output id="count">{count}</output>{' '}
      <button
        type="button"
        id="throw"
        mix={on('click', () => {
          setTimeout(() => {
            throw new Error('uncaught error from application code')
          })
        })}
      >
        throw an uncaught error
      </button>
    </p>
  )
})
