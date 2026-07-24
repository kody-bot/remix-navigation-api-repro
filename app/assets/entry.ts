import { run } from 'remix/ui'

const app = run({
  async loadModule(moduleUrl, exportName) {
    const mod = await import(moduleUrl)
    return mod[exportName]
  },
})

// ---------------------------------------------------------------------------
// Everything below this line is the second-order effect. `run()` throws inside
// startNavigationListener() when the Navigation API is missing, so it never
// returns and none of this ever runs -- including the global error reporting
// that would otherwise tell you something went wrong.
// ---------------------------------------------------------------------------

let reported = 0
window.addEventListener('error', () => {
  reported += 1
  document.getElementById('reported-errors')!.textContent = String(reported)
})

app.addEventListener('error', (event) => {
  console.error('component error:', event.error)
})

document.getElementById('boot-status')!.textContent = 'run() returned, error reporting installed'

void app.ready()
