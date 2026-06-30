# Releasing

This document is the exact command sequence for cutting a release of
`react-url-search-state` and its adapters to npm.

> **Current target:** `0.1.0-alpha.6` (core) + adapter bumps. Replace versions
> below if you are cutting a later release.

---

## 0. Prerequisites (once)

```bash
# Authenticated as a user with publish rights to the packages
npm whoami            # should print your npm username
npm login             # if the above fails

# Clean tree on the release branch, fully reviewed and merged to main
git checkout main
git pull
git status            # must be clean
```

> **Note on the release branch.** The `release/0.1.0-alpha.6` branch was squashed
> and rewritten locally after it had already been pushed to `origin`. If you push
> that branch again before merging you will need:
>
> ```bash
> git push --force-with-lease origin release/0.1.0-alpha.6
> ```
>
> Publishing itself should happen from `main` after the branch is merged.

---

## 1. Pre-flight verification (no publish)

Run from the repo root.

```bash
# Full clean build of every package (skips workspaces without a build script)
npm run build --ws --if-present

# Full test suite (single pass)
npm run test:run

# Confirm the target versions are still free on npm
npm view react-url-search-state@0.1.0-alpha.6 version || echo "free ✓"
npm view react-url-search-state-adapter-react-router-dom-v5@0.1.0-alpha.0 version || echo "free ✓"
npm view react-url-search-state-adapter-react-router-dom-v6@0.1.0-alpha.1 version || echo "free ✓"
npm view react-url-search-state-adapter-react-router-dom-v7@0.1.0-alpha.0 version || echo "free ✓"
npm view react-url-search-state-adapter-wouter-v3@0.1.0-alpha.2 version || echo "free ✓"
```

### Dry-run the tarballs

Each package has a `prepack` hook that runs `npm run build`, so `npm pack`
produces exactly what `npm publish` would ship. Inspect contents before publishing:

```bash
npm pack --dry-run -w react-url-search-state
npm pack --dry-run -w react-url-search-state-adapter-react-router-dom-v5
npm pack --dry-run -w react-url-search-state-adapter-react-router-dom-v6
npm pack --dry-run -w react-url-search-state-adapter-react-router-dom-v7
npm pack --dry-run -w react-url-search-state-adapter-wouter-v3
```

Confirm each tarball includes `dist/esm`, `dist/cjs`, co-located `.d.ts`, and
`src`, with `peerDependencies` (not `dependencies`) and **no `file:` references**.

---

## 2. Publish (order matters)

Publish the **core first** — the adapters declare it as a peerDependency, but
publishing core first keeps the registry consistent for anyone installing the
adapters immediately after.

All packages carry `publishConfig: { "access": "public", "tag": "alpha" }`, so
they publish to the **`alpha`** dist-tag (not `latest`) automatically. The
`prepack` hook rebuilds `dist` on each publish.

```bash
# 1) Core
npm publish -w react-url-search-state

# 2) Adapters (any order among themselves)
npm publish -w react-url-search-state-adapter-react-router-dom-v5
npm publish -w react-url-search-state-adapter-react-router-dom-v6
npm publish -w react-url-search-state-adapter-react-router-dom-v7
npm publish -w react-url-search-state-adapter-wouter-v3
```

If a publish fails midway, fix the issue and re-run only the failed package —
already-published versions are immutable and cannot be re-published.

---

## 3. Post-publish verification

```bash
# Confirm each version is live on the alpha tag
npm view react-url-search-state dist-tags
npm view react-url-search-state-adapter-react-router-dom-v5 dist-tags
npm view react-url-search-state-adapter-react-router-dom-v6 dist-tags
npm view react-url-search-state-adapter-react-router-dom-v7 dist-tags
npm view react-url-search-state-adapter-wouter-v3 dist-tags

# Smoke-install into a throwaway dir
cd "$(mktemp -d)"
npm init -y >/dev/null
npm i react-url-search-state@alpha react-url-search-state-adapter-react-router-dom-v6@alpha
```

---

## 4. `latest` dist-tag (decide explicitly)

⚠️ The `latest` tag is currently **stale** — it points at an old prerelease
(`0.1.0-alpha.1`), so a plain `npm install react-url-search-state` does **not**
get this release. While still in alpha this is arguably correct (you don't want
`latest` resolving to a prerelease). If you *do* want `latest` to track the
newest alpha, move it manually after publishing:

```bash
npm dist-tag add react-url-search-state@0.1.0-alpha.6 latest
# (repeat per package if desired)
```

This is a registry operation, not a code change — make it only when you
intend `npm install <pkg>` (no tag) to resolve to this release.

---

## 5. Tag the release in git

```bash
git tag react-url-search-state@0.1.0-alpha.6
git push origin react-url-search-state@0.1.0-alpha.6
```

---

## Package / version reference

| Package | This release | Tag |
| --- | --- | --- |
| `react-url-search-state` | `0.1.0-alpha.6` | `alpha` |
| `react-url-search-state-adapter-react-router-dom-v5` | `0.1.0-alpha.0` | `alpha` |
| `react-url-search-state-adapter-react-router-dom-v6` | `0.1.0-alpha.1` | `alpha` |
| `react-url-search-state-adapter-react-router-dom-v7` | `0.1.0-alpha.0` | `alpha` |
| `react-url-search-state-adapter-wouter-v3` | `0.1.0-alpha.2` | `alpha` |
