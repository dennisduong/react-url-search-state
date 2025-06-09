import { describe, it, expect, vi } from "vitest";

import { ValidatedSearchCache } from "../src/validation";

const createValidatedSearchCache = () => new ValidatedSearchCache();

describe("validatedSearchCache", () => {
  it("returns cached value if same input", () => {
    const cache = createValidatedSearchCache();

    const validateSearch = vi.fn((search: any) => ({
      foo: search.foo ?? "default",
    }));

    const search = { foo: "bar" };
    const result1 = cache.get({ validateSearch, search });
    const result2 = cache.get({ validateSearch, search });

    expect(result1).toBe(result2); // reference equality
    expect(validateSearch).toHaveBeenCalledTimes(1);
  });

  it("recomputes if object identity changes", () => {
    const cache = createValidatedSearchCache();

    const validateSearch = vi.fn((search: any) => ({
      foo: search.foo ?? "default",
    }));

    const parsed1 = { foo: "bar" };
    const parsed2 = { foo: "bar" }; // different reference

    const result1 = cache.get({ validateSearch, search: parsed1 });
    const result2 = cache.get({ validateSearch, search: parsed2 });

    expect(result1).not.toBe(result2);
    expect(validateSearch).toHaveBeenCalledTimes(2);
  });

  it("separates cache per validator function", () => {
    const cache = createValidatedSearchCache();

    const validateSearch1 = vi.fn((s: any) => ({ foo: s.foo }));
    const validateSearch2 = vi.fn((s: any) => ({ bar: s.bar }));

    const search = { foo: "x", bar: "y" };

    const result1 = cache.get({ validateSearch: validateSearch1, search });
    const result2 = cache.get({ validateSearch: validateSearch2, search });

    expect(result1).not.toBe(result2);
    expect(validateSearch1).toHaveBeenCalledTimes(1);
    expect(validateSearch2).toHaveBeenCalledTimes(1);
  });
});
