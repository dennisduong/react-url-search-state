// @vitest-environment node
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SearchStateProvider } from "../src";
import type { Path, SearchStateAdapter } from "../src";
import { useSearch } from "./testHelpers";

/**
 * These tests run in a real server-like environment (no `window`/DOM) to catch
 * anything that only breaks outside the browser — the `useLayoutEffect` SSR
 * warning, accidental `window`/`document` access, or unstable snapshots that
 * would throw during `renderToString`.
 */

// A static, hook-shaped adapter built from a known search string. Navigation is
// a no-op because there is nowhere to navigate to on the server.
function createStaticAdapter(search: string): SearchStateAdapter {
  const location = { pathname: "/", search, hash: "" };
  const noop = (_state: unknown, _path: Path) => {};
  return { location, pushState: noop, replaceState: noop };
}

function Filters() {
  const { page, tab } = useSearch();
  return <div>{`page:${page} tab:${tab}`}</div>;
}

describe("SSR — server render (no DOM)", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("renders validated state from the request URL on first paint", () => {
    const adapter = createStaticAdapter("?tab=preview&page=3");
    const useAdapter = () => adapter;

    const html = renderToString(
      <SearchStateProvider adapter={useAdapter}>
        <Filters />
      </SearchStateProvider>,
    );

    // Correct state on the server — no flash of defaults, no async hydration.
    expect(html).toContain("page:3");
    expect(html).toContain("tab:preview");
  });

  it("applies validator defaults synchronously for missing params", () => {
    const adapter = createStaticAdapter("");
    const useAdapter = () => adapter;

    const html = renderToString(
      <SearchStateProvider adapter={useAdapter}>
        <Filters />
      </SearchStateProvider>,
    );

    expect(html).toContain("page:1");
    expect(html).toContain("tab:details");
  });

  it("does not emit React warnings during server render", () => {
    const adapter = createStaticAdapter("?page=2");
    const useAdapter = () => adapter;

    renderToString(
      <SearchStateProvider adapter={useAdapter}>
        <Filters />
      </SearchStateProvider>,
    );

    // Would fire if `useLayoutEffect` were used directly on the server.
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("does not reference window/document at module load or render", () => {
    // `window` is genuinely absent in this environment.
    expect(typeof window).toBe("undefined");

    const adapter = createStaticAdapter("?page=2");
    const useAdapter = () => adapter;

    expect(() =>
      renderToString(
        <SearchStateProvider adapter={useAdapter}>
          <Filters />
        </SearchStateProvider>,
      ),
    ).not.toThrow();
  });
});
