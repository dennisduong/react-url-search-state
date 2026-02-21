# CLAUDE.md

Typed URL search param state management for React. Router-agnostic via an adapter pattern with JSON parsing, validation, structural sharing, and batched navigation. Currently in alpha (0.1.0-alpha.2) — public API is not yet stable.

## Commands

All commands run from the repo root.

```bash
npm run build          # tsc -b && vite build
npm run lint           # eslint .
npm test               # vitest (watch mode)
npm run test:run       # vitest run (single pass)
npm run test:watch     # vitest --watch --reporter verbose

# Single file or pattern
npx vitest run packages/react-url-search-state/tests/useSearch.test.tsx
npx vitest run -t "pattern"
```

## Monorepo Structure

npm workspaces with `nohoist` for `react-router-dom` and `wouter`.

- `packages/react-url-search-state/` — Core library. **Zero non-React deps — enforce this strictly.**
- `packages/react-url-search-state-adapter-react-router-dom-v5/` — React Router v5 adapter
- `packages/react-url-search-state-adapter-react-router-dom-v6/` — React Router v6 adapter
- `packages/react-url-search-state-adapter-react-router-dom-v7/` — React Router v7 adapter
- `packages/react-url-search-state-adapter-wouter-v3/` — Wouter v3 adapter
- `examples/` — Example apps per router

## Architecture

### Adapter Pattern

Adapters are thin wrappers around router-specific hooks (`useLocation`, `useNavigate`) exposing a uniform `SearchStateAdapter` interface (`location`, `pushState`, `replaceState`). **The core library never imports any router directly — keep it that way.**

### Core Data Flow

1. **`SearchStateProvider`** (context.ts) — receives adapter, creates `SearchStore`, syncs with `location.search`
2. **`SearchStore`** (store.ts) — parses URL search string into state, manages subscribers, applies structural sharing via `replaceEqualDeep`
3. **Hooks** read via `useSyncExternalStore`, write through the adapter's push/replace methods

### Key Hooks/utilities (`src/`)

- `useSearch` — read validated state with optional `select` for slicing
- `useNavigate` — full navigation (search, pathname, hash) with merge/replace strategies
- `useSetSearch` — search-only updates convenience wrapper
- `useSearchParamState` — `useState`-like API for a single param
- `buildSearchString` — pure utility for generating validated URL search strings for link building

### Strictness Philosophy (Confirmed Alignment with @tanstack/react-router)

This library mirrors @tanstack/react-router's search param strictness model: **type-first, runtime-optional**.

1. **TypeScript enforcement is strong.** `defineValidateSearch` produces `ValidateSearchFn<T>` which flows through all hooks via generics. Invalid usage is caught at compile time.
2. **Runtime enforcement is optional.** `ValidationError` is only thrown when a provided validator function fails. No validator = no runtime error. Parse errors are silent.
3. **Default parsing is permissive.** `parseSearch` uses JSON-ish parsing with silent fallback — failed JSON parse leaves the value as a string. Type coercion (`"true"` → `true`, `"123"` → `123`) is lenient.
4. **Unknown params are allowed.** The parser returns all decoded params; the validator returns only declared fields. No strict-mode rejection exists.

This gives strong editor feedback while keeping runtime behavior configurable — tight TS types for DX, runtime validation only when a validator is provided, and a forgiving default serializer.

### Other Key Patterns

- **Factory:** `createSearchUtils()` pre-binds all hooks and utilities to a specific validator
- **Validation:** `defineValidateSearch()` for type-safe validators; `composeValidateSearch()` for nested route composition; results cached via `ValidatedSearchCache` (WeakMap)
- **Batching:** Multiple navigate calls in the same frame queue and flush on next `requestAnimationFrame` as a single navigation
- **Structural sharing:** `replaceEqualDeep()` preserves referential equality for unchanged subtrees

## Testing

`packages/react-url-search-state/tests/` — Vitest + jsdom + @testing-library/react. Use `createTestAdapter()` and `renderWithSearchProvider()` from `testHelpers.tsx` for hook tests with a mock adapter. All changes should include tests.

## Build Output

Dual ESM (`dist/esm/index.js`) and CJS (`dist/cjs/index.cjs`) with co-located type declarations.

## TypeScript

Strict mode: `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`. Module resolution: `bundler`. Path alias `react-url-search-state` → `packages/react-url-search-state/src`.
