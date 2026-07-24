// Makes a modern browser look like one without the Navigation API, so the bug
// is reproducible on current Chrome. Real browsers in this state: Firefox <=
// 146, and every browser on iOS <= 26.1 (all of them are WebKit).
//
// This module runs before app/assets/entry.ts, so `run()` boots against a
// window that has no `navigation` property at all -- the same starting state as
// those browsers, not a stubbed-out or half-removed API.
if (new URLSearchParams(window.location.search).has('legacy')) {
  Reflect.deleteProperty(Window.prototype, 'navigation')
  Reflect.deleteProperty(window, 'navigation')
}

document.getElementById('navigation-api')!.textContent =
  'navigation' in window ? 'present' : 'absent'
