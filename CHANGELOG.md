# Changelog

All notable changes to `react-url-search-state` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
