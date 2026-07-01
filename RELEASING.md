# Releasing

This document is the exact command sequence for cutting a release of
`react-url-search-state` and its adapters to npm.

> **Current target:** `0.1.0-alpha.7` (core only). The adapters are unchanged
> since the last release and are **not** republished this cycle — their peer
> range `^0.1.0-alpha.6` already accepts core `0.1.0-alpha.7`. Replace versions
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

# Confirm the target core version is still free on npm
npm view react-url-search-state@0.1.0-alpha.7 version || echo "free ✓"
```

### Dry-run the tarballs

Each package has a `prepack` hook that runs `npm run build`, so `npm pack`
produces exactly what `npm publish` would ship. Inspect contents before publishing:

```bash
npm pack --dry-run -w react-url-search-state
```

Confirm each tarball includes `dist/esm`, `dist/cjs`, co-located `.d.ts`, and
`src`, with `peerDependencies` (not `dependencies`) and **no `file:` references**.

---

## 2. Publish (core only this cycle)

Only the core package changed this cycle, so only the core is published. The
adapters remain at their already-published versions.

The core carries `publishConfig: { "access": "public", "tag": "alpha" }`, so it
publishes to the **`alpha`** dist-tag (not `latest`) automatically. The
`prepack` hook rebuilds `dist` on each publish.

```bash
npm publish -w react-url-search-state
```

If the publish fails, fix the issue and re-run — already-published versions are
immutable and cannot be re-published.

> When a future release does change the adapters, publish **core first** (the
> adapters declare it as a peerDependency), then the adapters in any order:
>
> ```bash
> npm publish -w react-url-search-state-adapter-react-router-dom-v5
> npm publish -w react-url-search-state-adapter-react-router-dom-v6
> npm publish -w react-url-search-state-adapter-react-router-dom-v7
> npm publish -w react-url-search-state-adapter-wouter-v3
> ```

---

## 3. Post-publish verification

```bash
# Confirm the core version is live on the alpha tag
npm view react-url-search-state dist-tags   # alpha should now be 0.1.0-alpha.7

# Smoke-install into a throwaway dir
cd "$(mktemp -d)"
npm init -y >/dev/null
npm i react-url-search-state@alpha react-url-search-state-adapter-react-router-dom-v6@alpha
```

---

## 4. `latest` dist-tag (decide explicitly)

ℹ️ For core, `latest` currently points at `0.1.0-alpha.6` (the previous
release moved it off the old `0.1.0-alpha.1`). So a plain
`npm install react-url-search-state` resolves to a prerelease. While still in
alpha you may prefer `latest` to lag behind the newest alpha; decide explicitly.
To move `latest` to this release:

```bash
npm dist-tag add react-url-search-state@0.1.0-alpha.7 latest
```

This is a registry operation, not a code change — make it only when you
intend `npm install <pkg>` (no tag) to resolve to this release.

---

## 5. Tag the release in git

```bash
git tag react-url-search-state@0.1.0-alpha.7
git push origin react-url-search-state@0.1.0-alpha.7
```

---

## Package / version reference

| Package | This release | Tag | Published this cycle? |
| --- | --- | --- | --- |
| `react-url-search-state` | `0.1.0-alpha.7` | `alpha` | ✅ yes |
| `react-url-search-state-adapter-react-router-dom-v5` | `0.1.0-alpha.0` | `alpha` | no (unchanged) |
| `react-url-search-state-adapter-react-router-dom-v6` | `0.1.0-alpha.1` | `alpha` | no (unchanged) |
| `react-url-search-state-adapter-react-router-dom-v7` | `0.1.0-alpha.0` | `alpha` | no (unchanged) |
| `react-url-search-state-adapter-wouter-v3` | `0.1.0-alpha.2` | `alpha` | no (unchanged) |
