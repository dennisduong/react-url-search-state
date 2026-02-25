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
- **Middleware pipeline** — Intercept, transform, or cancel navigations with composable middleware
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
import { createSearchUtils } from "react-url-search-state";
import { validateSearch } from "./searchParams";

export const { useSearch, useNavigate, useSetSearch, useSearchParamState } =
  createSearchUtils(validateSearch);
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

All hooks below are returned by [`createSearchUtils(validateSearch)`](#createsearchvalidatesearch). They are pre-bound to your validator — no need to pass it manually.

### `createSearchUtils(validateSearch)`

Factory that returns all hooks and utilities scoped to a specific validator function.

```ts
const {
  buildSearchString,
  useSearch,
  useNavigate,
  useSetSearch,
  useSearchParamState,
} = createSearchUtils(validateSearch);
```

You can also pass `onBeforeNavigate` and `middleware` at the factory level to intercept every navigation:

```ts
const hooks = createSearchUtils(validateSearch, {
  onBeforeNavigate: (nextSearch, nextPath) => {
    console.log("Navigating to", nextSearch);
  },
  middleware: [stripSearchParams({ page: 1 })],
});
```

---

### `buildSearchString(validateSearch, params)`

Pure utility for building a validated, cleaned URL search string. Use this for link building, redirects, clipboard, or any URL construction outside of navigation.

```ts
import { buildSearchString, defineValidateSearch } from "react-url-search-state";

const validateSearch = defineValidateSearch((s) => ({
  page: Number(s.page) || 1,
  q: s.q as string | undefined,
}));

// Standalone usage
const search = buildSearchString(validateSearch, { page: 2, q: "foo" });
const href = `/results${search}`; // "/results?page=2&q=foo"
```

When used via `createSearchUtils`, the validator is pre-bound:

```ts
const { buildSearchString } = createSearchUtils(validateSearch);

// Reactive link building with current state
const current = useSearch();
const href = `/results${buildSearchString({ ...current, page: 2 })}`;
```

- Validates params through the provided `validateSearch` function
- Removes `undefined` values recursively
- Returns a `?`-prefixed search string (e.g. `"?page=2&q=foo"`)
- Throws `ValidationError` if params fail validation

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
| `onBeforeNavigate` | `(nextSearch, nextPath) => void` | Called before the navigation commits (after middleware). |
| `middleware` | `SearchMiddleware[]` | Hook-level middleware. Runs after provider and factory middleware. See [Middleware](#middleware). |

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
| `middleware` | `SearchMiddleware[]` | Provider-level middleware applied to all navigations. See [Middleware](#middleware). |

---

### `defineValidateSearch(fn)`

Identity helper that preserves TypeScript inference for your validator function. The function receives the raw parsed search object (`Record<string, unknown>`) and must return a typed object. The return type becomes the source of truth for all hooks.

Your validator controls runtime strictness: coerce bad input to defaults for permissive behavior, or throw (e.g., via Zod) for strict runtime enforcement. See [How Validation Works](#how-validation-works).

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

### `ValidationError`

Error thrown when a `validateSearch` function throws at runtime. The library catches the original error and re-throws it as a `ValidationError` with the original message.

This only occurs if your validator actually throws — if your validator silently coerces bad input to defaults, no `ValidationError` is thrown. Use React error boundaries to catch these in the component tree.

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

## Middleware

Middleware lets you intercept, transform, or cancel navigations before they reach the URL. Inspired by TanStack Router's `search.middlewares`, middleware uses an onion model with `next()` chaining.

### How it works

Each middleware receives a context with the current `search`, `path`, `options`, and a `next()` function. Call `next()` to delegate to the next middleware in the chain. Return `null` to cancel the navigation entirely.

```ts
import type { SearchMiddleware } from "react-url-search-state";

const loggingMiddleware: SearchMiddleware<MySearch> = (ctx) => {
  console.log("Before:", ctx.search);
  const result = ctx.next();
  if (result) console.log("After:", result.search);
  return result;
};
```

### Composition order

Middleware composes at three levels, executed outermost to innermost:

1. **Provider** — applied to all navigations app-wide
2. **Factory** — applied to all navigations from a `createSearchUtils` instance
3. **Hook** — applied to a specific `useNavigate` / `useSetSearch` / `useSearchParamState` call

```ts
// Provider-level (untyped, applies to all navigations)
<SearchStateProvider adapter={Adapter} middleware={[providerMiddleware]}>

// Factory-level (typed to your validator)
const { useNavigate } = createSearchUtils(validateSearch, {
  middleware: [factoryMiddleware],
});

// Hook-level (typed to your validator)
const navigate = useNavigate({
  middleware: [hookMiddleware],
});
```

### Cancelling navigation

Return `null` from any middleware to cancel the navigation. The adapter is never called, and `onBeforeNavigate` does not fire.

```ts
const blockIfEmpty: SearchMiddleware<MySearch> = (ctx) => {
  if (!ctx.search.q) return null; // cancel if no query
  return ctx.next();
};
```

### Transforming values

Middleware can modify search, path, or options by passing overrides to `next()` or by modifying the result:

```ts
// Via next() overrides
const forceReplace: SearchMiddleware<MySearch> = (ctx) => {
  return ctx.next({ options: { replace: true } });
};

// Via post-processing
const clampPage: SearchMiddleware<MySearch> = (ctx) => {
  const result = ctx.next();
  if (!result) return null;
  return {
    ...result,
    search: { ...result.search, page: Math.max(1, result.search.page) },
  };
};
```

### Built-in middleware

#### `retainSearchParams(keys | true)`

Preserves specified search params (or all params when passed `true`) across navigations. Useful for keeping global params like `locale` or `theme` that shouldn't be lost during route changes.

```ts
import { retainSearchParams } from "react-url-search-state";

// Retain specific keys
const { useNavigate } = createSearchUtils(validateSearch, {
  middleware: [retainSearchParams(["locale"])],
});

// Retain all current params
const { useNavigate } = createSearchUtils(validateSearch, {
  middleware: [retainSearchParams(true)],
});
```

#### `stripSearchParams(defaults)`

Removes search params that match their default values, keeping URLs clean. Params are compared with strict equality (`===`).

```ts
import { stripSearchParams } from "react-url-search-state";

const { useNavigate } = createSearchUtils(validateSearch, {
  middleware: [stripSearchParams({ page: 1, sort: "asc" })],
});

// navigate({ search: { page: 1, sort: "asc", q: "foo" } })
// URL becomes: ?q=foo (page and sort are stripped because they match defaults)
```

### Interaction with `onBeforeNavigate`

`onBeforeNavigate` fires **after** the middleware pipeline, receiving the final transformed values. If middleware cancels the navigation, `onBeforeNavigate` does not fire.

---

## Cookbook

### Persist & restore search params from storage

Storage persistence is outside the scope of the core library, but easy to implement with the existing hooks.

**Restore on mount** — reads saved params from `localStorage` and merges any missing ones into the URL:

```tsx
import { useState, useEffect } from "react";
import { useSetSearch } from "./hooks";

function EnsureSearchParams({ children }: { children: React.ReactNode }) {
  const setSearch = useSetSearch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("my-app:filters");
    if (saved) {
      const restored = JSON.parse(saved);
      setSearch((prev) => ({ ...prev, ...restored }), { replace: true });
    }
    setReady(true);
  }, []);

  if (!ready) return null;
  return children;
}
```

**Persist on navigate** — saves params to `localStorage` whenever the URL changes via `onBeforeNavigate`:

```ts
const hooks = createSearchUtils(validateSearch, {
  onBeforeNavigate: (nextSearch) => {
    localStorage.setItem("my-app:filters", JSON.stringify(nextSearch));
  },
});
```

---

## How Validation Works

This library follows the same strictness model as [@tanstack/react-router](https://tanstack.com/router): **type-first, runtime-optional**.

**TypeScript catches mistakes at compile time.** Your `defineValidateSearch` return type flows through every hook — `useSearch`, `useNavigate`, `useSetSearch`, `useSearchParamState`, and `buildSearchString`. Invalid values (e.g., passing a `string` where `number` is expected) are flagged by the compiler before your code ever runs.

**Runtime validation is opt-in.** The library only throws `ValidationError` if your validator function throws. If your validator silently coerces bad input to defaults (as in the Quick Start example), no runtime error occurs. This means you choose the strictness level:

```ts
// Permissive — coerces bad input to defaults, never throws
const permissive = defineValidateSearch((search) => ({
  page: Number(search.page) || 1,
}));

// Strict — throws on invalid input (e.g., using Zod)
const strict = defineValidateSearch((search) => {
  return z.object({ page: z.number().int().positive() }).parse(search);
});
```

**Parsing is forgiving by default.** URL query strings are decoded with JSON-ish parsing (borrowed from TanStack Router's `qss`). Values like `"true"` become `true`, `"123"` becomes `123`, and JSON-encoded strings are parsed automatically. If JSON parsing fails, the value stays as a string — no error is thrown.

**Unknown params are allowed.** Extra query params that aren't in your validator are parsed but silently filtered out when your validator returns only declared fields. There is no strict mode that rejects unknown params.

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
