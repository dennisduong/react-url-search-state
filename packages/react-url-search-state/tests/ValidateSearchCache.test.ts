import { describe, it, expect, vi } from "vitest";

import { ValidatedSearchCache } from "../src/validation";

describe("ValidatedSearchCache", () => {
  it("calls validateSearch only once for same object + function", () => {
    const cache = new ValidatedSearchCache();

    const search = { foo: "123" };
    const validateSearch = vi.fn((input: any) => ({
      foo: Number(input.foo),
    }));

    const result1 = cache.get({ search, validateSearch });
    const result2 = cache.get({ search, validateSearch });

    expect(validateSearch).toHaveBeenCalledTimes(1);
    expect(result1).toBe(result2);
    expect(result1).toEqual({ foo: 123 });
  });

  it("caches per validateSearch function", () => {
    const cache = new ValidatedSearchCache();

    const search = { foo: "123" };

    const validateA = vi.fn((x: any) => ({ foo: Number(x.foo) }));
    const validateB = vi.fn((x: any) => ({ foo: `v${x.foo}` }));

    const resultA = cache.get({ search, validateSearch: validateA });
    const resultB = cache.get({ search, validateSearch: validateB });

    expect(validateA).toHaveBeenCalledTimes(1);
    expect(validateB).toHaveBeenCalledTimes(1);

    expect(resultA).toEqual({ foo: 123 });
    expect(resultB).toEqual({ foo: "v123" });
  });

  it("revalidates if new input object is passed (even with same data)", () => {
    const cache = new ValidatedSearchCache();

    const validate = vi.fn((x: any) => x);

    const a = { foo: "123" };
    const b = { foo: "123" }; // structurally equal, but new object

    const result1 = cache.get({ search: a, validateSearch: validate });
    const result2 = cache.get({ search: b, validateSearch: validate });

    expect(validate).toHaveBeenCalledTimes(2);
    expect(result1).toEqual(result2);
    expect(result1).not.toBe(result2); // different identity because validation ran twice
  });
});
