// Single source of truth for the undici import.
//
// Bun ships a built-in stub for the bare `undici` specifier whose MockAgent is
// non-functional. Importing the deep `undici/index.js` path bypasses that shim
// and resolves to the installed package, so the same (real) undici instance is
// shared between the client and tests — required for MockAgent dispatchers to
// intercept requests. On Node this deep import resolves identically.
export {
  type Dispatcher,
  MockAgent,
  request,
} from 'undici/index.js';
