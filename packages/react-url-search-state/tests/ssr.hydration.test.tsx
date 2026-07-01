import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SearchStateProvider } from "../src";
import type { Path, SearchStateAdapter } from "../src";
import { useSearch } from "./testHelpers";

/**
 * Verifies the client hydrates server-rendered markup with no mismatch. Because
 * both the server and the client initialize the store from the same URL, the
 * first client render must produce identical output — the property that makes
 * URL search params a clean fit for SSR.
 */

function createStaticAdapter(search: string): SearchStateAdapter {
  const location = { pathname: "/", search, hash: "" };
  const noop = (_state: unknown, _path: Path) => {};
  return { location, pushState: noop, replaceState: noop };
}

function Filters() {
  const { page, tab } = useSearch();
  return <div data-testid="filters">{`page:${page} tab:${tab}`}</div>;
}

describe("SSR — client hydration", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let container: HTMLDivElement;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    container.remove();
  });

  it("hydrates server markup without a mismatch warning", () => {
    const adapter = createStaticAdapter("?tab=preview&page=3");
    const useAdapter = () => adapter;
    const tree = (
      <SearchStateProvider adapter={useAdapter}>
        <Filters />
      </SearchStateProvider>
    );

    container.innerHTML = renderToString(tree);
    const serverHtml = container.innerHTML;

    act(() => {
      hydrateRoot(container, tree);
    });

    // React logs a console.error on any hydration mismatch; none expected.
    expect(errorSpy).not.toHaveBeenCalled();
    // DOM untouched by hydration — server and client agree.
    expect(container.innerHTML).toBe(serverHtml);
    expect(container.querySelector("[data-testid=filters]")?.textContent).toBe(
      "page:3 tab:preview",
    );
  });
});
