# react-url-search-state

> Typed URL search param state management for React. Router-agnostic, validated, and shareable.

[![npm](https://img.shields.io/npm/v/react-url-search-state)](https://www.npmjs.com/package/react-url-search-state)
[![license](https://img.shields.io/npm/l/react-url-search-state)](./LICENSE)

> **Alpha (0.1.0-alpha)** — The public API is not yet stable.

---

## Features

- **URL-first** — State lives in `window.location.search`, making it shareable and bookmarkable
- **Type-safe** — Define a validator once, get fully typed state across all hooks
- **Router-agnostic** — Adapters for React Router v5/v6/v7, Wouter v3, or bring your own
- **Structural sharing** — Unchanged subtrees keep referential equality (no wasted rerenders)
- **Batched navigation** — Multiple updates in one frame are flushed as a single URL change
- **Storage fallback** — Persist and restore params from `localStorage` / `sessionStorage`
- **Zero non-React deps** — The core library has no dependencies beyond React

---

## Quick Start

### 1. Install

```bash
# Core library
npm install react-url-search-state@alpha

# Pick an adapter for your router
npm install react-url-search-state-adapter-react-router-dom-v6@alpha
```

<details>
<summary>All available adapters</summary>

| Router | Adapter package |
|---|---|
| React Router v5 | `react-url-search-state-adapter-react-router-dom-v5` |
| React Router v6 | `react-url-search-state-adapter-react-router-dom-v6` |
| React Router v7 | `react-url-search-state-adapter-react-router-dom-v7` |
| Wouter v3 | `react-url-search-state-adapter-wouter-v3` |

</details>

### 2. Define a validator

A validator takes the raw parsed search object and returns a typed, normalized shape. Invalid or missing params get safe defaults.

```ts
// searchParams.ts
import { defineValidateSearch } from "react-url-search-state";

export const validateSearch = defineValidateSearch((search) => {
  const rawPage = Number(search.page);

  return {
    q: typeof search.q === "string" ? search.q : "",
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    sort: search.sort === "asc" || search.sort === "desc" ? search.sort : "asc",
  };
});
```

### 3. Create typed hooks

```ts
// hooks.ts
import { createSearchHooks } from "react-url-search-state";
import { validateSearch } from "./searchParams";

export const { useSearch, useNavigate, useSetSearch, useSearchParamState } =
  createSearchHooks(validateSearch);
```

### 4. Wrap your app with the provider

The `SearchStateProvider` connects the core library to your router via an adapter.

```tsx
// main.tsx
import { SearchStateProvider } from "react-url-search-state";
import { ReactRouterDomV6Adapter } from "react-url-search-state-adapter-react-router-dom-v6";

function Root() {
  return (
    <SearchStateProvider adapter={ReactRouterDomV6Adapter}>
      <App />
    </SearchStateProvider>
  );
}
```

### 5. Use the hooks

```tsx
import { useSearch, useSetSearch } from "./hooks";

function SearchPage() {
  const { q, page, sort } = useSearch();
  const setSearch = useSetSearch();

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setSearch({ q: e.target.value })}
      />
      <button onClick={() => setSearch({ page: page + 1 })}>
        Next Page
      </button>
    </div>
  );
}
```

---

## API Reference

All hooks below are returned by [`createSearchHooks(validateSearch)`](#createsearchhooksvalidatesearch). They are pre-bound to your validator — no need to pass it manually.

### `createSearchHooks(validateSearch)`

Factory that returns all hooks scoped to a specific validator function.

```ts
const {
  useSearch,
  useNavigate,
  useSetSearch,
  useSearchParamState,
  useCreateUrlSearchParams,
  useSyncMissingSearchParams,
} = createSearchHooks(validateSearch);
```

You can also pass `onBeforeNavigate` at the factory level to intercept every navigation:

```ts
const hooks = createSearchHooks(validateSearch, {
  onBeforeNavigate: (nextSearch, nextPath) => {
    console.log("Navigating to", nextSearch);
  },
});
```

---

### `useSearch(options?)`

Reads the current validated search state. Re-renders only when the result changes.

```ts
// Read the full state
const search = useSearch();
// search.q, search.page, search.sort — all fully typed

// Read a slice (component only re-renders when the slice changes)
const q = useSearch({ select: (s) => s.q });
```

**Options:**

| Option | Type | Description |
|---|---|---|
| `select` | `(state) => TSelected` | Derive a subset of state. Referential equality is preserved via structural sharing. |

---

### `useNavigate(options?)`

Returns a function for full navigation control — search, pathname, and hash.

```ts
const navigate = useNavigate();

// Merge into current search state (default)
navigate({ search: { page: 2 } });

// Replace the entire search state
navigate({ search: { q: "foo", page: 1, sort: "asc" } }, { merge: false });

// Functional update
navigate({ search: (prev) => ({ page: prev.page + 1 }) });

// Change pathname and search together
navigate({ search: { q: "foo" }, pathname: "/results" });

// Replace the history entry instead of pushing
navigate({ search: { page: 2 } }, { replace: true });
```

> **Note:** `useNavigate` supports updating `search`, `pathname`, and/or `hash`. Rename the import if needed to avoid clashing with `react-router-dom`'s `useNavigate`.

**Options:**

| Option | Type | Description |
|---|---|---|
| `onBeforeNavigate` | `(nextSearch, nextPath) => void` | Called before the navigation commits. |

**Navigate function options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `merge` | `boolean` | `true` | Merge into existing state, or replace it entirely. |
| `replace` | `boolean` | `false` | Replace the current history entry instead of pushing. |
| `state` | `any` | — | History state to pass through. |

---

### `useSetSearch(options?)`

Convenience wrapper around `useNavigate` for search-only updates (no pathname or hash).

```ts
const setSearch = useSetSearch();

setSearch({ page: 2 });
setSearch((prev) => ({ sort: prev.sort === "asc" ? "desc" : "asc" }));
setSearch({ q: "foo", page: 1, sort: "asc" }, { merge: false });
```

Same options as `useNavigate`.

---

### `useSearchParamState(key, options?)`

`useState`-like API for a single search param. Returns a `[value, setValue]` tuple.

```ts
const [page, setPage] = useSearchParamState("page");

setPage(2);
setPage((prev) => prev + 1);
setPage(5, { replace: true });
```

---

### `useCreateUrlSearchParams()`

Returns a function for building `URLSearchParams` from the current validated state. Useful for constructing shareable links.

```ts
const createParams = useCreateUrlSearchParams();

// Merge overrides with current state
const params = createParams({ page: 2 });
const href = `/results?${params.toString()}`;

// Replace all params
const fresh = createParams({ q: "foo", page: 1, sort: "asc" }, { replaceAll: true });
```

---

### `useSyncMissingSearchParams(options)`

Restores missing search params from `localStorage` or `sessionStorage` on mount. Pair with `persistSearchParamsToStorage` to save params when they change.

```ts
useSyncMissingSearchParams({
  params: {
    sort: { storage: "local" },
    q: { storage: "session", storageNamespace: "my-app" },
  },
});
```

---

### `SearchStateProvider`

Context provider that connects the core library to your router.

```tsx
import { SearchStateProvider } from "react-url-search-state";
import { ReactRouterDomV6Adapter } from "react-url-search-state-adapter-react-router-dom-v6";

<SearchStateProvider adapter={ReactRouterDomV6Adapter}>
  {children}
</SearchStateProvider>
```

**Props:**

| Prop | Type | Description |
|---|---|---|
| `adapter` | `SearchStateAdapterComponent` | A router adapter component. See [Adapters](#adapters). |

---

### `defineValidateSearch(fn)`

Identity helper that preserves TypeScript inference for your validator function. The function receives a `Record<string, unknown>` and must return a typed object.

```ts
const validateSearch = defineValidateSearch((search) => ({
  q: typeof search.q === "string" ? search.q : "",
  page: Number(search.page) || 1,
}));
```

---

### `composeValidateSearch(base, extend)`

Composes two validators for nested route layouts. The child validator receives both the base result and the raw search object.

```ts
const baseValidator = defineValidateSearch((search) => ({
  q: typeof search.q === "string" ? search.q : "",
}));

const childValidator = composeValidateSearch(baseValidator, (base, raw) => ({
  page: Number(raw.page) || 1,
}));

// childValidator returns { q: string, page: number }
```

---

### `persistSearchParamsToStorage(nextSearch, names, options?)`

Saves selected search params to web storage. Use with `onBeforeNavigate` to persist on every navigation.

```ts
const hooks = createSearchHooks(validateSearch, {
  onBeforeNavigate: (nextSearch) => {
    persistSearchParamsToStorage(nextSearch, ["sort", "q"], {
      storage: "local",       // "local" (default) or "session"
      namespace: "my-app",    // optional key prefix
    });
  },
});
```

---

### `ValidationError`

Error thrown when a `validateSearch` function fails. Caught internally and re-thrown as a `ValidationError` with the original message.

---

## Adapters

Adapters are thin components that bridge router-specific APIs (`useLocation`, `useNavigate`) into a uniform `SearchStateAdapter` interface. The core library never imports any router directly.

| Adapter | Package | Install |
|---|---|---|
| React Router v5 | `react-url-search-state-adapter-react-router-dom-v5` | `npm i react-url-search-state-adapter-react-router-dom-v5@alpha` |
| React Router v6 | `react-url-search-state-adapter-react-router-dom-v6` | `npm i react-url-search-state-adapter-react-router-dom-v6@alpha` |
| React Router v7 | `react-url-search-state-adapter-react-router-dom-v7` | `npm i react-url-search-state-adapter-react-router-dom-v7@alpha` |
| Wouter v3 | `react-url-search-state-adapter-wouter-v3` | `npm i react-url-search-state-adapter-wouter-v3@alpha` |

### Writing a custom adapter

An adapter is a React component that calls `children` with a `SearchStateAdapter` object:

```tsx
import type { SearchStateAdapterComponent } from "react-url-search-state";

const MyAdapter: SearchStateAdapterComponent = ({ children }) => {
  // Hook into your router's location and navigation APIs
  const location = { pathname: "/", search: "", hash: "" };
  const pushState = (state: any, path) => { /* ... */ };
  const replaceState = (state: any, path) => { /* ... */ };

  return children({ location, pushState, replaceState });
};
```

---

## Why This Library?

Inspired by [TanStack Router](https://tanstack.com/router)'s philosophy of treating search params as typed state, and the adapter pattern of [use-query-params](https://github.com/pbeshai/use-query-params), this library aims to:

- Make search state **explicit and shareable** — the URL is the source of truth
- **Validate at the boundary** — raw strings become typed values immediately
- Provide **ergonomic React hooks** without unnecessary rerenders
- Stay **router-agnostic** — swap routers without rewriting state logic

---

## License

MIT
