# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha.1] - 2025-06-08

### Added
- Initial release of the `react-url-search-state` package.
- Type-safe React hooks for managing URL search state using `URLSearchParams`.
- Built-in validators for parsing/normalizing query strings into strongly typed values.
- Integration with `react-router-dom` v6 (adapter pattern).
- Scoped search helpers via `createSearchHooks`.
- Optional state sync with `localStorage` or `sessionStorage`.
- Batched navigation via `requestAnimationFrame`.
