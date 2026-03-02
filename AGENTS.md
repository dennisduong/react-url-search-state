# Repository Guidelines

## Project Structure & Module Organization
- Core library: `packages/react-url-search-state/src/`
- Tests: `packages/react-url-search-state/tests/`
- Router adapters: `packages/react-url-search-state-adapter-*/`
- Examples: `examples/`
- Build output: `packages/*/dist/`; coverage: `coverage/`

## Architecture Overview
- The core package manages parsing, validation, and URL updates; adapters bridge router APIs.
- `SearchStateProvider` wires `SearchStore`, middleware, and a validation cache.
- Reads: `useSearch` subscribes via `useSyncExternalStore`, validates, and optionally selects a slice.
- Writes: `useNavigate` queues updates, batches in `requestAnimationFrame`, runs middleware, then calls adapter `pushState`/`replaceState`.
- Validation is type-first and runtime-optional; parsing is permissive and preserves unknown params.

## Build, Test, and Development Commands
Run from repo root:
- `npm run dev`: Vite dev server for examples.
- `npm run build`: typecheck + build (`tsc -b` + `vite build`).
- `npm run build:types`: emit declarations only.
- `npm run lint`: ESLint.
- `npm test`: Vitest watch mode.
- `npm run test:run`: tests once.
- `npm run test:watch`: watch with verbose reporter.

## Coding Style & Naming Conventions
- TypeScript-first, `type: module`.
- Prettier for formatting; ESLint for linting (`eslint.config.js`).
- Hooks are `useX`; adapters are `react-url-search-state-adapter-<router>`.
- Core package must not add non-React runtime deps.

## Testing Guidelines
- Vitest + jsdom + `@testing-library/react`.
- Test files: `packages/react-url-search-state/tests/*.test.ts(x)`.
- Prefer `testHelpers.tsx` helpers (e.g., `createTestAdapter`, `renderWithSearchProvider`).
- Add coverage for hook behavior, batching/queue changes, and parse/stringify edge cases.

## Commit & Pull Request Guidelines
- Commit prefixes: `feat:`, `fix:`, `perf:`, `test:`, `chore:`.
- Short, action-oriented subjects; include scope or issue numbers when useful.
- PRs should describe behavior changes, include tests or rationale, and link issues.

## Key Files to Know
- `packages/react-url-search-state/src/context.ts`: provider + store wiring.
- `packages/react-url-search-state/src/useSearch.ts`: read hook + selector stability.
- `packages/react-url-search-state/src/useNavigate.ts`: batching, middleware, navigation.
- `packages/react-url-search-state/src/validation.ts`: validator helpers + cache.
- Adapters: `packages/react-url-search-state-adapter-*/src/*Adapter.tsx`.
