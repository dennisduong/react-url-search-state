import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";

import {
  SearchStateProvider,
  defineValidateSearch,
  createSearchUtils,
  buildSearchString,
  parseSearchWith,
  stringifySearchWith,
} from "../src";
import type {
  Path,
  SearchStateAdapter,
  SearchStateAdapterComponent,
} from "../src";

// ─────────────────────────────
// Helpers
// ─────────────────────────────

function createTestAdapter(
  initial: string = "?page=2&tab=preview",
  pathname: string = "/test",
): SearchStateAdapter {
  let location = { pathname, search: initial, hash: "" };
  return {
    get location() {
      return location;
    },
    pushState: vi.fn((_state: any, path: Path) => {
      location = {
        ...location,
        ...path,
        search: path.search ?? location.search,
      };
    }),
    replaceState: vi.fn((_state: any, path: Path) => {
      location = {
        ...location,
        ...path,
        search: path.search ?? location.search,
      };
    }),
  };
}

const validateSearch = defineValidateSearch((search) => ({
  page: Number(search.page) || 1,
  tab:
    search.tab === "preview" || search.tab === "details"
      ? search.tab
      : "details",
}));

// ─────────────────────────────
// parseSearchWith / stringifySearchWith
// ─────────────────────────────

describe("parseSearchWith", () => {
  it("creates a parser using the provided function", () => {
    const parse = parseSearchWith(JSON.parse);
    const result = parse("?page=2&tab=preview");
    expect(result).toEqual({ page: 2, tab: "preview" });
  });

  it("works with a custom parser (e.g., base64-encoded JSON values)", () => {
    // Custom parser: values are base64-encoded JSON
    const base64Parse = (str: string) => JSON.parse(atob(str));
    const parse = parseSearchWith(base64Parse);

    // Encode { "hello": "world" } as base64 in the "data" param
    const encoded = btoa(JSON.stringify({ hello: "world" }));
    const result = parse(`?data=${encodeURIComponent(encoded)}`);
    expect(result).toEqual({ data: { hello: "world" } });
  });

  it("silently falls back when custom parser throws", () => {
    const alwaysThrow = () => {
      throw new Error("nope");
    };
    const parse = parseSearchWith(alwaysThrow);
    const result = parse("?foo=bar");
    // Value stays as a string when parsing fails
    expect(result).toEqual({ foo: "bar" });
  });
});

describe("stringifySearchWith", () => {
  it("creates a stringifier using the provided function", () => {
    const stringify = stringifySearchWith(JSON.stringify);
    expect(stringify({ page: 2, tab: "preview" })).toBe("?page=2&tab=preview");
  });

  it("works with a custom stringifier", () => {
    // Custom: wrap objects as base64-encoded JSON
    const base64Stringify = (val: any) => btoa(JSON.stringify(val));
    const stringify = stringifySearchWith(base64Stringify);

    const result = stringify({ data: { hello: "world" } });
    expect(result).toContain("data=");
    // The nested object should be base64-encoded
    const params = new URLSearchParams(result.slice(1));
    const decoded = JSON.parse(atob(params.get("data")!));
    expect(decoded).toEqual({ hello: "world" });
  });

  it("removes undefined values", () => {
    const stringify = stringifySearchWith(JSON.stringify);
    expect(stringify({ a: 1, b: undefined })).toBe("?a=1");
  });
});

// ─────────────────────────────
// Provider-level custom serializers
// ─────────────────────────────

describe("SearchStateProvider with custom parseSearch/stringifySearch", () => {
  it("uses custom parseSearch for initial store state", () => {
    // Custom parser: always parses numbers, ignores JSON
    const customParse = (searchStr: string): Record<string, unknown> => {
      const params = new URLSearchParams(
        searchStr.startsWith("?") ? searchStr.slice(1) : searchStr,
      );
      const result: Record<string, unknown> = {};
      for (const [key, value] of params.entries()) {
        const num = Number(value);
        result[key] = Number.isFinite(num) ? num : value;
      }
      return result;
    };

    const { useSearch } = createSearchUtils(validateSearch);
    let searchResult: any;

    function Reader() {
      searchResult = useSearch();
      return null;
    }

    const adapter = createTestAdapter("?page=3&tab=details");
    const TestAdapter: SearchStateAdapterComponent = ({ children }) =>
      children(adapter);

    render(
      <SearchStateProvider adapter={TestAdapter} parseSearch={customParse}>
        <Reader />
      </SearchStateProvider>,
    );

    // Custom parser returns { page: 3, tab: "details" }; validator then processes it
    expect(searchResult).toEqual({ page: 3, tab: "details" });
  });

  it("uses custom stringifySearch for navigation", async () => {
    const customStringify = vi.fn((search: Record<string, unknown>) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(search)) {
        if (value !== undefined) {
          params.set(
            key,
            typeof value === "object" ? JSON.stringify(value) : String(value),
          );
        }
      }
      const str = params.toString();
      return str ? `?${str}` : "";
    });

    const { useSearch, useSetSearch } = createSearchUtils(validateSearch);
    let setSearch: any;

    function Writer() {
      setSearch = useSetSearch();
      return null;
    }

    function Reader() {
      useSearch();
      return null;
    }

    const adapter = createTestAdapter("?page=1&tab=details");
    const TestAdapter: SearchStateAdapterComponent = ({ children }) =>
      children(adapter);

    render(
      <SearchStateProvider
        adapter={TestAdapter}
        stringifySearch={customStringify}
      >
        <Reader />
        <Writer />
      </SearchStateProvider>,
    );

    await act(async () => {
      setSearch({ page: 5 });
      // Wait for RAF flush
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    // The custom stringifySearch should have been called during navigation
    expect(customStringify).toHaveBeenCalled();
  });

  it("defaults work when no custom serializers are provided", () => {
    const { useSearch } = createSearchUtils(validateSearch);
    let searchResult: any;

    function Reader() {
      searchResult = useSearch();
      return null;
    }

    const adapter = createTestAdapter("?page=2&tab=preview");
    const TestAdapter: SearchStateAdapterComponent = ({ children }) =>
      children(adapter);

    render(
      <SearchStateProvider adapter={TestAdapter}>
        <Reader />
      </SearchStateProvider>,
    );

    expect(searchResult).toEqual({ page: 2, tab: "preview" });
  });
});

// ─────────────────────────────
// buildSearchString with custom stringifySearch
// ─────────────────────────────

describe("buildSearchString with custom stringifySearch", () => {
  it("uses custom stringifySearch when provided", () => {
    const uppercaseStringify = (search: Record<string, unknown>) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(search)) {
        if (value !== undefined) {
          params.set(key.toUpperCase(), String(value).toUpperCase());
        }
      }
      const str = params.toString();
      return str ? `?${str}` : "";
    };

    const result = buildSearchString(
      validateSearch,
      { page: 2, tab: "preview" },
      {
        stringifySearch: uppercaseStringify,
      },
    );
    expect(result).toBe("?PAGE=2&TAB=PREVIEW");
  });

  it("uses default stringifySearch when not provided", () => {
    const result = buildSearchString(validateSearch, {
      page: 2,
      tab: "preview",
    });
    expect(result).toBe("?page=2&tab=preview");
  });
});

// ─────────────────────────────
// createSearchUtils with custom stringifySearch
// ─────────────────────────────

describe("createSearchUtils with custom stringifySearch", () => {
  it("uses custom stringifySearch in factory-bound buildSearchString", () => {
    const uppercaseStringify = (search: Record<string, unknown>) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(search)) {
        if (value !== undefined) {
          params.set(key.toUpperCase(), String(value).toUpperCase());
        }
      }
      const str = params.toString();
      return str ? `?${str}` : "";
    };

    const { buildSearchString: factoryBuild } = createSearchUtils(
      validateSearch,
      {
        stringifySearch: uppercaseStringify,
      },
    );

    const result = factoryBuild({ page: 2, tab: "preview" });
    expect(result).toBe("?PAGE=2&TAB=PREVIEW");
  });
});
