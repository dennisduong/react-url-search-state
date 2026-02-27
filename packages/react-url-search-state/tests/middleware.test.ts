import { describe, expect, it } from "vitest";

import {
  runMiddleware,
  retainSearchParams,
  stripSearchParams,
} from "../src/middleware";
import type {
  SearchMiddleware,
  SearchMiddlewareResult,
} from "../src/middleware";
import { deepEqual } from "../src/utils";

type TestSearch = { page: number; tab: string; filter?: string };

const initial: SearchMiddlewareResult<TestSearch> = {
  search: { page: 2, tab: "preview" },
  path: { search: "?page=2&tab=preview" },
  options: {},
};

describe("deepEqual", () => {
  it("returns true for identical primitives", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("a", "a")).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
  });

  it("returns false for different primitives", () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual("a", "b")).toBe(false);
    expect(deepEqual(true, false)).toBe(false);
    expect(deepEqual(1, "1")).toBe(false);
  });

  it("compares arrays deeply", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(deepEqual([1, [2, 3]], [1, [2, 4]])).toBe(false);
  });

  it("compares plain objects deeply", () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("ignores undefined values by default", () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(true);
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });

  it("respects ignoreUndefined: false", () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined }, { ignoreUndefined: false })).toBe(false);
  });

  it("supports partial comparison", () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 }, { partial: true })).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { a: 3 }, { partial: true })).toBe(false);
  });

  it("compares nested objects and arrays (JSON round-trip scenario)", () => {
    const a = { filters: { status: ["all"] }, tags: [1, 2] };
    const b = { filters: { status: ["all"] }, tags: [1, 2] };
    expect(deepEqual(a, b)).toBe(true);

    const c = { filters: { status: ["active"] }, tags: [1, 2] };
    expect(deepEqual(a, c)).toBe(false);
  });
});

describe("runMiddleware", () => {
  it("returns initial state when middleware array is empty", () => {
    const result = runMiddleware<TestSearch>([], initial);
    expect(result).toEqual(initial);
  });

  it("passes through when middleware just calls next()", () => {
    const passthrough: SearchMiddleware<TestSearch> = (ctx) => ctx.next();
    const result = runMiddleware([passthrough], initial);
    expect(result).toEqual(initial);
  });

  it("allows middleware to transform search", () => {
    const doubler: SearchMiddleware<TestSearch> = (ctx) => {
      const result = ctx.next();
      if (!result) return null;
      return { ...result, search: { ...result.search, page: result.search.page * 2 } };
    };
    const result = runMiddleware([doubler], initial);
    expect(result!.search.page).toBe(4);
  });

  it("allows middleware to transform path", () => {
    const pathChanger: SearchMiddleware<TestSearch> = (ctx) => {
      const result = ctx.next({ path: { pathname: "/new" } });
      return result;
    };
    const result = runMiddleware([pathChanger], initial);
    expect(result!.path.pathname).toBe("/new");
  });

  it("allows middleware to transform options", () => {
    const forceReplace: SearchMiddleware<TestSearch> = (ctx) => {
      return ctx.next({ options: { replace: true } });
    };
    const result = runMiddleware([forceReplace], initial);
    expect(result!.options.replace).toBe(true);
  });

  it("returns null when middleware cancels (does not call next)", () => {
    const canceller: SearchMiddleware<TestSearch> = () => null;
    const result = runMiddleware([canceller], initial);
    expect(result).toBeNull();
  });

  it("returns null when middleware explicitly returns null", () => {
    const canceller: SearchMiddleware<TestSearch> = (ctx) => {
      ctx.next(); // call next but discard
      return null;
    };
    const result = runMiddleware([canceller], initial);
    expect(result).toBeNull();
  });

  it("executes multiple middleware in onion order (first is outermost)", () => {
    const order: string[] = [];

    const outer: SearchMiddleware<TestSearch> = (ctx) => {
      order.push("outer-before");
      const result = ctx.next();
      order.push("outer-after");
      return result;
    };

    const inner: SearchMiddleware<TestSearch> = (ctx) => {
      order.push("inner-before");
      const result = ctx.next();
      order.push("inner-after");
      return result;
    };

    runMiddleware([outer, inner], initial);
    expect(order).toEqual([
      "outer-before",
      "inner-before",
      "inner-after",
      "outer-after",
    ]);
  });

  it("allows outer middleware to see inner middleware's transforms", () => {
    const inner: SearchMiddleware<TestSearch> = (ctx) => {
      const result = ctx.next();
      if (!result) return null;
      return { ...result, search: { ...result.search, page: 99 } };
    };

    const outer: SearchMiddleware<TestSearch> = (ctx) => {
      const result = ctx.next();
      if (!result) return null;
      // Outer sees inner's transform
      return { ...result, search: { ...result.search, tab: `page-is-${result.search.page}` } };
    };

    const result = runMiddleware([outer, inner], initial);
    expect(result!.search.page).toBe(99);
    expect(result!.search.tab).toBe("page-is-99");
  });

  it("cancellation in inner middleware stops outer from getting a result", () => {
    const inner: SearchMiddleware<TestSearch> = () => null;

    const outer: SearchMiddleware<TestSearch> = (ctx) => {
      const result = ctx.next();
      // result is null because inner cancelled
      return result;
    };

    const result = runMiddleware([outer, inner], initial);
    expect(result).toBeNull();
  });

  it("passes overrides through the chain", () => {
    const first: SearchMiddleware<TestSearch> = (ctx) => {
      return ctx.next({ search: { ...ctx.search, page: 10 } });
    };

    const second: SearchMiddleware<TestSearch> = (ctx) => {
      // Should see page: 10 from the first middleware's override
      expect(ctx.search.page).toBe(10);
      return ctx.next();
    };

    const result = runMiddleware([first, second], initial);
    expect(result!.search.page).toBe(10);
  });
});

describe("retainSearchParams", () => {
  it("retains all params when passed true", () => {
    const mw = retainSearchParams<TestSearch>(true);

    // Simulate a navigation that drops 'tab' (inner pipeline removes it)
    const inner: SearchMiddleware<TestSearch> = (ctx) => {
      const result = ctx.next();
      if (!result) return null;
      const { tab: _, ...rest } = result.search;
      return { ...result, search: { ...rest, page: 5 } as TestSearch };
    };

    const result = runMiddleware([mw, inner], initial);
    expect(result!.search).toEqual({ page: 5, tab: "preview" });
  });

  it("retains specified keys only", () => {
    const mw = retainSearchParams<TestSearch>(["tab"]);

    const inner: SearchMiddleware<TestSearch> = (ctx) => {
      const result = ctx.next();
      if (!result) return null;
      // Remove both tab and page, set filter
      return {
        ...result,
        search: { page: 99, filter: "active" } as TestSearch,
      };
    };

    const result = runMiddleware([mw, inner], initial);
    // tab is retained from original, page comes from inner
    expect(result!.search.tab).toBe("preview");
    expect(result!.search.page).toBe(99);
    expect(result!.search.filter).toBe("active");
  });

  it("does not override keys that are already present in the result", () => {
    const mw = retainSearchParams<TestSearch>(["tab"]);

    const inner: SearchMiddleware<TestSearch> = (ctx) => {
      const result = ctx.next();
      if (!result) return null;
      return { ...result, search: { ...result.search, tab: "details" } };
    };

    const result = runMiddleware([mw, inner], initial);
    // tab was explicitly set by inner, so retain should not override
    expect(result!.search.tab).toBe("details");
  });

  it("returns null when inner middleware cancels", () => {
    const mw = retainSearchParams<TestSearch>(true);
    const cancel: SearchMiddleware<TestSearch> = () => null;

    const result = runMiddleware([mw, cancel], initial);
    expect(result).toBeNull();
  });
});

describe("stripSearchParams", () => {
  it("strips params matching default values", () => {
    const mw = stripSearchParams<TestSearch>({ page: 1 });

    const initialWithDefault: SearchMiddlewareResult<TestSearch> = {
      search: { page: 1, tab: "preview" },
      path: { search: "?page=1&tab=preview" },
      options: {},
    };

    const result = runMiddleware([mw], initialWithDefault);
    expect(result!.search).toEqual({ tab: "preview" });
    expect("page" in result!.search).toBe(false);
  });

  it("does not strip params that differ from defaults", () => {
    const mw = stripSearchParams<TestSearch>({ page: 1 });

    const result = runMiddleware([mw], initial); // page is 2
    expect(result!.search.page).toBe(2);
  });

  it("strips multiple params", () => {
    const mw = stripSearchParams<TestSearch>({ page: 1, tab: "preview" });

    const initialWithDefaults: SearchMiddlewareResult<TestSearch> = {
      search: { page: 1, tab: "preview" },
      path: { search: "?page=1&tab=preview" },
      options: {},
    };

    const result = runMiddleware([mw], initialWithDefaults);
    expect(result!.search).toEqual({});
  });

  it("returns null when inner middleware cancels", () => {
    const mw = stripSearchParams<TestSearch>({ page: 1 });
    const cancel: SearchMiddleware<TestSearch> = () => null;

    const result = runMiddleware([mw, cancel], initial);
    expect(result).toBeNull();
  });

  it("strips non-primitive values via deep equality", () => {
    type DeepSearch = { filters: { status: string[] }; page: number };

    const mw = stripSearchParams<DeepSearch>({ filters: { status: ["all"] } });

    const state: SearchMiddlewareResult<DeepSearch> = {
      search: { filters: { status: ["all"] }, page: 1 },
      path: { search: "?" },
      options: {},
    };

    const result = runMiddleware([mw], state);
    expect("filters" in result!.search).toBe(false);
    expect(result!.search.page).toBe(1);
  });

  it("does not strip non-primitive values that differ from defaults", () => {
    type DeepSearch = { filters: { status: string[] }; page: number };

    const mw = stripSearchParams<DeepSearch>({ filters: { status: ["all"] } });

    const state: SearchMiddlewareResult<DeepSearch> = {
      search: { filters: { status: ["active", "pending"] }, page: 1 },
      path: { search: "?" },
      options: {},
    };

    const result = runMiddleware([mw], state);
    expect(result!.search.filters).toEqual({ status: ["active", "pending"] });
  });

  it("strips array defaults via deep equality", () => {
    type ArraySearch = { tags: string[]; page: number };

    const mw = stripSearchParams<ArraySearch>({ tags: [] });

    const state: SearchMiddlewareResult<ArraySearch> = {
      search: { tags: [], page: 3 },
      path: { search: "?" },
      options: {},
    };

    const result = runMiddleware([mw], state);
    expect("tags" in result!.search).toBe(false);
    expect(result!.search.page).toBe(3);
  });

  it("strips all params when passed true", () => {
    const mw = stripSearchParams<TestSearch>(true);

    const result = runMiddleware([mw], initial);
    expect(result!.search).toEqual({});
  });

  it("strips listed keys unconditionally when passed an array", () => {
    const mw = stripSearchParams<TestSearch>(["page"]);

    const result = runMiddleware([mw], initial);
    expect("page" in result!.search).toBe(false);
    expect(result!.search.tab).toBe("preview");
  });

  it("strips multiple listed keys unconditionally", () => {
    const mw = stripSearchParams<TestSearch>(["page", "tab"]);

    const result = runMiddleware([mw], initial);
    expect("page" in result!.search).toBe(false);
    expect("tab" in result!.search).toBe(false);
  });

  it("true mode preserves path and options", () => {
    const mw = stripSearchParams<TestSearch>(true);

    const state: SearchMiddlewareResult<TestSearch> = {
      ...initial,
      options: { replace: true },
    };

    const result = runMiddleware([mw], state);
    expect(result!.search).toEqual({});
    expect(result!.options.replace).toBe(true);
    expect(result!.path).toEqual(initial.path);
  });
});
