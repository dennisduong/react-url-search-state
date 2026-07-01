# CLAUDE.md

Typed URL search param state management for React. Router-agnostic via an adapter pattern with JSON parsing, validation, structural sharing, and batched navigation. SSR-safe. Currently in alpha (core is `0.1.0-alpha.6`) — public API is not yet stable.

## Commands

All commands run from the repo root unless noted.

```bash
npm run build          # build:core then build:adapters (full publishable build)
npm run build:core     # build core package only
npm run build:adapters # build all adapter packages (--if-present)
npm run build:types    # tsc -p tsconfig.json (declarations only)
npm run lint           # eslint .
npm test               # vitest (watch mode)
npm run test:run       # vitest run (single pass — use this for CI-style checks)
npm run test:watch     # vitest --watch --reporter verbose

# Single file or pattern
npx vitest run packages/react-url-search-state/tests/useSearch.test.tsx
npx vitest run -t "pattern"
```

Per-package `build` (run inside a package dir or via `--workspace`) is `tsc -b && vite build`, emitting dual ESM/CJS + declarations.

There is no working root `dev` server (no root `vite.config`). Run examples individually: `cd examples/<router> && npm run dev`.

## Monorepo Structure

npm workspaces (`workspaces.packages: ["packages/*"]`) with `nohoist` for `react-router-dom` and `wouter` so each adapter/example resolves its own router version.

- `packages/react-url-search-state/` — Core library. **Zero non-React runtime deps — enforce this strictly.**
- `packages/react-url-search-state-adapter-react-router-dom-v5/` — React Router v5 adapter
- `packages/react-url-search-state-adapter-react-router-dom-v6/` — React Router v6 adapter
- `packages/react-url-search-state-adapter-react-router-dom-v7/` — React Router v7 adapter
- `packages/react-url-search-state-adapter-wouter-v3/` — Wouter v3 adapter
- `examples/{react-router-dom-v5,react-router-dom-v6,react-router-dom-v7,wouter-v3}/` — one runnable example app per router

Adapters and examples pin their router as a peer/dev dep; the core package declares only a `react` peer dep (`^18 || ^19`).

## Architecture

### Adapter Pattern

Adapters are thin wrappers around router-specific hooks (`useLocation`, `useNavigate`) exposing a uniform `SearchStateAdapter` interface (`location`, `pushState`, `replaceState`). Each adapter is a single `*Adapter.tsx` in its `src/`. **The core library never imports any router directly — keep it that way.**

### Core Data Flow

1. **`SearchStateProvider`** (`context.ts`) — receives the adapter, creates a `SearchStore`, and syncs it with `location.search`.
2. **`SearchStore`** (`store.ts`) — parses the URL search string into state, manages subscribers, applies structural sharing via `replaceEqualDeep`.
3. **Hooks** read via `useSyncExternalStore` and write through the adapter's push/replace methods.

Store↔URL syncing uses `useIsomorphicLayoutEffect` (`useLayoutEffect` in the browser, `useEffect` on the server) so the core renders cleanly under SSR without React layout-effect warnings.

### Public API surface (`src/index.ts`)

Value exports: `SearchStateProvider`, `createSearchUtils`, `buildSearchString`, `setDebug`, `retainSearchParams`, `stripSearchParams`, `runMiddleware`, `useSearch`, `useNavigate`, `useSetSearch`, `useSearchParamState`, `deepEqual`, `parseSearchWith`, `stringifySearchWith`, `composeValidateSearch`, `defineValidateSearch`, `ValidationError`.

Key hooks/utilities:

- `useSearch` — read validated state with optional `select` for slicing
- `useNavigate` — full navigation (search, pathname, hash) with merge/replace strategies
- `useSetSearch` — search-only updates convenience wrapper
- `useSearchParamState` — `useState`-like API for a single param
- `buildSearchString` — pure utility for generating validated URL search strings for link building
- `setDebug(enabled)` — toggles the internal debug logger (`debug.ts`); also auto-enabled when the `react-url-search-state:debug` localStorage key is present

### Custom Serialization

`utils.ts` exposes `parseSearchWith(parser)` and `stringifySearchWith(stringifier)` factories. The defaults `parseSearch`/`stringifySearch` are built from `JSON.parse`/`JSON.stringify`. `SearchStateProvider` accepts `parseSearch`/`stringifySearch` props to override serialization (e.g. to plug in a different codec). Parsing is permissive: a failed parse leaves the value as its raw string.

### Strictness Philosophy (Confirmed Alignment with @tanstack/react-router)

This library mirrors @tanstack/react-router's search param strictness model: **type-first, runtime-optional**.

1. **TypeScript enforcement is strong.** `defineValidateSearch` produces `ValidateSearchFn<T>` which flows through all hooks via generics. Invalid usage is caught at compile time.
2. **Runtime enforcement is optional.** `ValidationError` is only thrown when a provided validator function fails. No validator = no runtime error. Parse errors are silent.
3. **Default parsing is permissive.** Failed JSON parse leaves the value as a string. Type coercion (`"true"` → `true`, `"123"` → `123`) is lenient.
4. **Unknown params are allowed.** The parser returns all decoded params; the validator returns only declared fields. No strict-mode rejection exists.

Strong editor feedback with configurable runtime behavior — tight TS types for DX, runtime validation only when a validator is provided, and a forgiving default serializer.

### Middleware Pipeline

`SearchMiddleware` functions intercept navigations via an onion model with `next()` chaining. Each middleware can transform `{ search, path, options }` or return `null` to cancel. Middleware composes at three levels: **Provider → Factory → Hook** (outermost to innermost). `onBeforeNavigate` fires after middleware with transformed values and is skipped on cancellation.

Built-in utilities: `retainSearchParams(keys | true)` preserves params across navigations; `stripSearchParams(defaults)` removes params matching defaults. `runMiddleware` is the exported composition primitive.

Core implementation in `src/middleware.ts`. Wired into `useNavigate.ts` (RAF callback), `context.ts` (provider prop), and `createSearchUtils.ts` (factory option).

### Other Key Patterns

- **Factory:** `createSearchUtils()` pre-binds all hooks and utilities to a specific validator
- **Validation:** `defineValidateSearch()` for type-safe validators; `composeValidateSearch()` for nested route composition; results cached via `ValidatedSearchCache` (WeakMap in `validation.ts`)
- **Batching:** `NavigationQueue` (`navigationQueue.ts`) queues navigate calls in the same frame and flushes them on the next `requestAnimationFrame` as a single navigation
- **Structural sharing:** `replaceEqualDeep()` (`utils.ts`) preserves referential equality for unchanged subtrees

## Testing

`packages/react-url-search-state/tests/` — Vitest + jsdom + @testing-library/react (config in `vitest.config.ts`; globals on, setup in `tests/setup.ts`). Use `createTestAdapter()` and `renderWithSearchProvider()` from `testHelpers.tsx` for hook tests with a mock adapter. SSR is covered by `ssr.server.test.tsx` / `ssr.hydration.test.tsx`; custom serialization by `customSerialization.test.tsx`. All changes should include tests.

## CI

`.github/workflows/ci.yml` runs on pushes to `main` and all PRs, matrixed over Node 20 & 22: `npm run lint`, `npm run build`, `npm run test:run`.

**Gotcha:** the committed `package-lock.json` is generated on macOS and only records darwin native optional deps (rollup/esbuild). CI therefore deletes the lockfile and runs a fresh `npm install` so the runner resolves Linux binaries (npm/cli#4828). Don't assume `npm ci` works on Linux with the committed lock.

## Build Output

Dual ESM (`dist/esm/index.js`) and CJS (`dist/cjs/index.cjs`) with co-located type declarations. Packages publish `dist` + `src`.

## TypeScript

Strict mode with `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly`. Module resolution: `bundler`. Path alias `react-url-search-state` → `packages/react-url-search-state/src`.

## How to approach edits here

- Never add a router import or any non-React runtime dependency to the core package.
- Prefer `_`-prefixed names for intentionally unused bindings; silent `catch {}` is allowed (permissive parsing). `any` is a warning, not an error — it's used deliberately in value-agnostic type utilities and TanStack-copied code (look for "Copied from" comments).
- Keep the type-first / runtime-optional contract intact: don't add strict-mode rejection or throw on parse failures.
- Add or update tests for any behavior change; validate with `npm run lint && npm run build && npm run test:run` before finishing.
