# react-url-search-state

> ⚡ Type-safe, URL-first search param state management for modern React apps

---

## Features

- ✅ **URL-first**: State is derived from `window.location.search`
- 🧠 **Type-safe**: Validated with your schema, no more `string | undefined` everywhere
- 🔄 **React 18-ready**: Built with hooks and batched updates in mind
- 🌐 **Router-agnostic**: Works with `react-router-dom`, `wouter`, native History API, or your own
- 🧱 **Composable**: Create scoped hooks with `createSearchHooks()`
- 📦 **Minimal dependencies**: Core is zero-dependency unless using optional adapters

> Note: `useNavigate()` supports updating `search`, `pathname`, and/or `hash`.
> Rename the import if needed to avoid clashing with `react-router-dom`'s `useNavigate`.

---

## Installation

```bash
npm install react-url-search-state@alpha
```

---

## Quickstart

```tsx
import { createSearchHooks, defineValidateSearch } from "react-url-search-state";

// Define schema and validators
const validateSearch = defineValidateSearch(function(search) {
  const rawPage = Number(search.page);
  const rawTab = search.tab;

  return {
    tab: rawTab === "details" || rawTab === "preview" ? rawTab : "details",
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1
  };
});

const { useNavigate, useSearch } = createSearchHooks(validateSearch);

function Example() {
  const search = useSearch(); // { tab: "details", page: 1 }
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate({ page: search.page + 1 })}>
      Next Page
    </button>
  );
}
```

---

## Why This Library?

Inspired by [TanStack Router](https://tanstack.com/router)'s philosophy and the adapter-plugin-framework of `url-query-params`, this library aims to:

- Make search state explicit and shareable
- Enforce validation at the boundary
- Provide ergonomic React hooks without rerender noise
- Encourage JSON-first modeling and schema reuse

---

## Roadmap

- [x] Type-safe parsing/validation
- [x] URL + storage fallback handling
- [x] Batched navigation
- [ ] Devtools/debug logging
- [ ] Vue/Solid/Preact adapter (maybe?)

---

## Development

Maintainer notes and build TODOs:

- [ ] Test CommonJS (`cjs`) build
- [ ] Package and publish shared Vite config

---

## License

MIT
