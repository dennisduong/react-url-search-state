# Changelog

All notable changes to `react-url-search-state` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.1.0-alpha.6] — 2026-06-25

### Breaking Changes

- **Adapter interface changed from a render-prop component to a hook.** The `SearchStateProvider` `adapter` prop now expects a hook (`() => SearchStateAdapter`) instead of a render-prop component. This removes an intermediate adapter component render on every URL change.
  - The four official adapters renamed their exports accordingly:
    - `ReactRouterDomV5Adapter` → `useReactRouterDomV5Adapter`
    - `ReactRouterDomV6Adapter` → `useReactRouterDomV6Adapter`
    - `ReactRouterDomV7Adapter` → `useReactRouterDomV7Adapter`
    - `WouterV3Adapter` → `useWouterV3Adapter`
  - `SearchStateAdapterComponent` is now **deprecated** (still exported, removed in 1.0). Use the new `SearchStateAdapterHook` type.

  **Migration:**

  ```diff
  - import { ReactRouterDomV6Adapter } from "react-url-search-state-adapter-react-router-dom-v6";
  + import { useReactRouterDomV6Adapter } from "react-url-search-state-adapter-react-router-dom-v6";

  - <SearchStateProvider adapter={ReactRouterDomV6Adapter}>
  + <SearchStateProvider adapter={useReactRouterDomV6Adapter}>
  ```

  If you wrote a custom adapter, convert the component to a hook that returns the `SearchStateAdapter` object directly (call `useLocation`/`useNavigate` inside and return `{ location, pushState, replaceState }`) instead of passing it through a `children` render prop.

### Added

- **Custom search param serialization.** `SearchStateProvider` now accepts optional `parseSearch` and `stringifySearch` props to override the default JSON-ish (de)serialization. New `parseSearchWith` / `stringifySearchWith` helpers are exported for building custom (de)serializers.
- New `SearchStateAdapterHook` type export (`() => SearchStateAdapter`).

### Fixed

- **Stale search value during route transitions.** The provider now syncs the store with the URL **during render** (render-phase `updateState` + a layout-effect `emit`) instead of in a `useEffect`. This eliminates the one-render window where `useSearch`/`getSnapshot()` could return the *previous* route's search value immediately after navigating. Consumers no longer need "wait a tick" workarounds.
- `useNavigate` reads the context via a ref inside its callback, avoiding capturing a stale context from the first render.

### Changed

- `cleanSearchObject` is no longer called from `flushNavigate` / `buildSearchString`. Top-level `undefined` values are still stripped during serialization (via `stringifySearchWith`); **nested `undefined` values inside objects are no longer removed** before serialization. (No public API change.)

### Performance

- `flushNavigate` reduces redundant validator calls from N+1 to 2 per flush.

### Adapters

- **Fixed adapter packaging for publishing.** The adapter packages previously declared `react`, the router library, and `react-url-search-state` as regular `dependencies` — including an unresolvable `"react-url-search-state": "file:../…"` reference that made the published packages uninstallable. These are now correctly declared as `peerDependencies` (the adapter must share the host app's single instance of React, the router, and the search-state context); build-time copies are kept in `devDependencies` using the published semver range (no `file:` references remain anywhere in the manifests).
  - `react-url-search-state-adapter-react-router-dom-v6` → **0.1.0-alpha.1** (republish required to expose `useReactRouterDomV6Adapter` and the corrected peer deps)
  - `react-url-search-state-adapter-wouter-v3` → **0.1.0-alpha.2** (`alpha.1` was already published with the old packaging)
  - `…-react-router-dom-v5` / `…-v7` ship at `0.1.0-alpha.0` (first publish, with the corrected packaging)
- **Fixed the v5 adapter build.** `react-router-dom@5` ships its types via `@types/react-router-dom`, but npm hoists `react-router-dom@6` (whose bundled types lack `useHistory`) to the workspace root, shadowing them. A build-time `paths` mapping in the v5 adapter's `tsconfig.json` points type resolution at `@types/react-router-dom`. (Emit is unaffected — the published `.d.ts` still imports from `react-router-dom`.)

### Publishing

- Each publishable package now has a `prepack` script that runs its build, so `npm publish` / `npm pack` always ships a freshly built `dist` (previously there was no pre-publish build hook, so a stale or missing `dist` could be published silently).

---

## [0.1.0-alpha.5] — 2026-02-27

### Fixed

- `stripSearchParams` now uses `deepEqual` instead of `===` for comparing param values against defaults, correctly handling objects and arrays

### Added

- `stripSearchParams` accepts three input modes:
  - `true` — strips all search params (returns empty search object)
  - `Array<keyof TSearch>` — strips listed keys unconditionally
  - `Partial<TSearch>` (existing) — strips keys whose value deeply equals the provided default
- `deepEqual` utility exported from the package for use in application code

---

## [0.1.0-alpha.4] — 2026-02-25

### Added

- **Middleware pipeline** — New `SearchMiddleware` system for intercepting, transforming, and cancelling navigations before they reach the URL. Uses an onion model with `next()` chaining, inspired by TanStack Router's `search.middlewares`.
  - Middleware composes at three levels: Provider → Factory → Hook (outermost to innermost)
  - Return `null` from any middleware to cancel navigation (`onBeforeNavigate` does not fire)
  - `onBeforeNavigate` receives middleware-transformed values
- **`retainSearchParams(keys | true)`** — Built-in middleware that preserves specified (or all) search params across navigations
- **`stripSearchParams(defaults)`** — Built-in middleware that removes params matching their default values
- **`runMiddleware()`** — Low-level pipeline runner exported for advanced/testing use cases
- New exports: `SearchMiddleware`, `SearchMiddlewareContext`, `SearchMiddlewareResult` types
- `SearchStateProvider` now accepts an optional `middleware` prop for app-wide middleware
- `createSearchUtils` now accepts an optional `middleware` option for factory-level middleware
- `useNavigate`, `useSetSearch`, `useSearchParamState` now accept an optional `middleware` option for hook-level middleware

### Tests

- `middleware.test.ts` — 19 unit tests for `runMiddleware`, `retainSearchParams`, `stripSearchParams`
- `useNavigate.middleware.test.tsx` — 9 integration tests for middleware transforms, cancellation, composition order, and `onBeforeNavigate` interaction

---

## [0.1.0-alpha.3] — 2026-02-24

### Added

- **Direct hook exports** — `useSearch`, `useNavigate`, `useSetSearch`, and `useSearchParamState` are now exported directly from the package alongside their public types (`UseSearchOptions`, `UseNavigateOptions`, `NavigateOptions`, `NavigateFunction`, `OnBeforeNavigateFunction`, `SetSearchFunction`, `UseSearchParamStateReturn`). Developers can now pass `validateSearch` explicitly per call instead of using the `createSearchUtils` factory. The factory remains the recommended default.

### Fixed

- README API reference corrected — all examples now reference `createSearchUtils` (not the old `createSearchHooks` name) and `buildSearchString` (not the old `useCreateUrlSearchParams` hook).
- TypeScript build no longer fails due to an unused parameter in the `composeValidateSearch` test fixture.

### Tests

- Provider unmount cancels pending RAF-scheduled navigations
- Sibling and nested `SearchStateProvider` isolation
- Factory-level `onBeforeNavigate` interception and composition
- `useSearchParamState({ replace: true })` option
- Full `composeValidateSearch` suite — merge semantics, multi-layer composition, error handling

---

## [0.1.0-alpha.2] — 2025-06-10

### Breaking Changes

- `createSearchHooks` renamed to `createSearchUtils`
- `useCreateUrlSearchParams` hook removed; replaced by the standalone `buildSearchString(validateSearch, params)` utility

### Added

- `setDebug(enabled)` exported for runtime-toggleable debug logging
- `composeValidateSearch` for composing validators across nested route layouts

### Fixed

- `useSearch` now provides `getServerSnapshot` to `useSyncExternalStore` for SSR compatibility
- `cleanSearchObject` now correctly removes empty objects nested inside arrays
- `flushNavigate` re-validates the final merged state before committing navigation
- `flushNavigate` uses nullish checks for `hash` and `pathname` to avoid spurious navigations
- `SearchStore.setState` skips emitting when state is structurally unchanged
- `requestAnimationFrame` calls are guarded for SSR environments
- Navigation queue is now scoped per provider context (fixes cross-provider interference)
- RAF is cancelled on provider unmount

### Performance

- `useNavigate` no longer allocates a new navigate function on every render
- `SearchStateProviderInner` replaces a redundant `useMemo` with a `useRef` for the context value

---

## [0.1.0-alpha.1] — 2025-06-09

Initial public alpha release.

- Type-safe React hooks for managing URL search state
- `createSearchUtils` factory for pre-bound typed hooks
- `useSearch`, `useNavigate`, `useSetSearch`, `useSearchParamState` hooks
- `buildSearchString` utility for constructing shareable links
- `defineValidateSearch` for type-safe validators
- `ValidationError` for runtime validation failures
- Structural sharing via `replaceEqualDeep`
- Batched navigation via `requestAnimationFrame`
- Router-agnostic adapter pattern
- Adapters: React Router v5, v6, v7, Wouter v3
