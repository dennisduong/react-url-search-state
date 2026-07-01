# Repository Guidelines

Typed URL search param state for React — router-agnostic core plus per-router adapters. Alpha (core `0.1.0-alpha.6`), public API not yet stable. This file is for any AI coding agent; `CLAUDE.md` has the fuller architecture reference.

## Project Structure & Modules
- Core library: `packages/react-url-search-state/src/` (tests in `../tests/`).
- Router adapters: `packages/react-url-search-state-adapter-*/src/*Adapter.tsx`.
- Examples (one runnable app per router): `examples/{react-router-dom-v5,-v6,-v7,wouter-v3}/`.
- Build output: `packages/*/dist/`; coverage: `coverage/`.
- npm workspaces with `nohoist` for `react-router-dom` and `wouter`.

## Architecture (short)
- Core parses/validates/updates URL search state; adapters bridge each router's `useLocation`/`useNavigate` to the `SearchStateAdapter` interface.
- `SearchStateProvider` wires `SearchStore`, middleware, and the validation cache; store↔URL sync uses an isomorphic layout effect (SSR-safe).
- Reads: `useSearch` subscribes via `useSyncExternalStore`, validates, optionally selects a slice.
- Writes: `useNavigate` queues updates, batches them in `requestAnimationFrame`, runs middleware, then calls adapter `pushState`/`replaceState`.
- Validation is type-first and runtime-optional; parsing is permissive and preserves unknown params. Serialization is overridable via `parseSearchWith`/`stringifySearchWith`.

## Build, Test & Dev Commands (from repo root)
- `npm run build`: full build (`build:core` then `build:adapters`).
- `npm run build:core` / `npm run build:adapters` / `npm run build:types`: scoped builds / declarations only.
- `npm run lint`: ESLint (flat config in `eslint.config.js`).
- `npm test`: Vitest watch. `npm run test:run`: single pass (use this to verify).
- Examples run per-directory: `cd examples/<router> && npm run dev` (there is no working root dev server).

## Coding Style & Conventions
- TypeScript-first, ESM (`type: module`); Prettier for formatting (default config).
- Hooks named `useX`; adapter packages named `react-url-search-state-adapter-<router>`.
- **Core must not add non-React runtime deps and must never import a router.**
- `_`-prefixed unused bindings and silent `catch {}` are allowed by design; `any` is a warning (used deliberately in type utilities and TanStack-copied code).
- Keep the type-first / runtime-optional contract: no strict-mode rejection, no throwing on parse failure.

## Testing Expectations
- Vitest + jsdom + `@testing-library/react`; files: `packages/react-url-search-state/tests/*.test.ts(x)`.
- Prefer `testHelpers.tsx` (`createTestAdapter`, `renderWithSearchProvider`).
- Cover hook behavior, batching/queue changes, parse/stringify edge cases, and SSR paths when relevant.
- All behavior changes require tests.

## Safe Editing Rules
- Don't introduce router or non-React deps into the core package.
- Don't hand-edit `dist/`, `coverage/`, or `package-lock.json`.
- Don't change public exports in `src/index.ts` or the validation/serialization contract without calling it out.
- Keep changes scoped; match existing file/idiom conventions.

## Validate Before Finishing
Run and ensure green: `npm run lint && npm run build && npm run test:run`.
CI (`.github/workflows/ci.yml`) runs the same across Node 20 & 22. Note: CI deletes the macOS-generated `package-lock.json` and does a fresh `npm install` (Linux native-dep resolution, npm/cli#4828) — don't rely on `npm ci` on Linux.

## Commit & PR Guidelines
- Conventional prefixes: `feat:`, `fix:`, `perf:`, `test:`, `chore:`, `docs:`; short, action-oriented subjects; link issues/scope when useful.
- PRs describe behavior changes, include tests or rationale, and note any public-API or contract impact.

## Key Files
- `src/context.ts`: provider + store wiring.
- `src/store.ts` / `src/navigationQueue.ts`: state store and RAF batching.
- `src/useSearch.ts`: read hook + selector stability.
- `src/useNavigate.ts`: batching, middleware, navigation.
- `src/middleware.ts`: middleware pipeline + built-ins.
- `src/validation.ts`: validator helpers + `ValidatedSearchCache`.
- `src/utils.ts`: serialization, `replaceEqualDeep`, `deepEqual`.
- Adapters: `packages/react-url-search-state-adapter-*/src/*Adapter.tsx`.
