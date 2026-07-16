import { describe, expect, it } from "vitest";

import { buildSearchString, defineValidateSearch, ValidationError } from "../src";

const validateSearch = defineValidateSearch((search) => ({
  page: Number(search.page) || 1,
  q: search.q as string | undefined,
}));

describe("buildSearchString (standalone)", () => {
  it("returns a valid search string from params", () => {
    const result = buildSearchString(validateSearch, { page: 2, q: "hello" });
    expect(result).toBe("?page=2&q=hello");
  });

  it("applies validator defaults when params are sparse", () => {
    const result = buildSearchString(validateSearch, { page: 0, q: undefined });
    // page defaults to 1 per validator; q is undefined and cleaned out
    expect(result).toBe("?page=1");
  });

  it("cleans undefined values from output", () => {
    const result = buildSearchString(validateSearch, { page: 3, q: undefined });
    expect(result).not.toContain("q=");
  });

  it("throws ValidationError when validator throws", () => {
    const strictValidate = defineValidateSearch((search) => {
      if (!search.page) throw new Error("page is required");
      return { page: Number(search.page) };
    });
    expect(() => buildSearchString(strictValidate, {} as any)).toThrow(ValidationError);
  });

  it("allows omitting params whose type includes undefined", () => {
    // q is `string | undefined` — omitting it must compile and behave
    // identically to passing it explicitly
    const omitted = buildSearchString(validateSearch, { page: 2 });
    const explicit = buildSearchString(validateSearch, { page: 2, q: undefined });
    expect(omitted).toBe("?page=2");
    expect(omitted).toBe(explicit);
  });

  it("still requires params whose type excludes undefined", () => {
    // @ts-expect-error - page is required and may not be omitted
    buildSearchString(validateSearch, { q: "hello" });
  });
});

describe("buildSearchString (pre-bound via createSearchUtils)", () => {
  it("is pre-bound to the factory validator", async () => {
    const { createSearchUtils } = await import("../src");
    const { buildSearchString: bound } = createSearchUtils(validateSearch);
    const result = bound({ page: 5, q: "test" });
    expect(result).toBe("?page=5&q=test");
  });

  it("allows omitting params whose type includes undefined", async () => {
    const { createSearchUtils } = await import("../src");
    const { buildSearchString: bound } = createSearchUtils(validateSearch);
    const omitted = bound({ page: 5 });
    const explicit = bound({ page: 5, q: undefined });
    expect(omitted).toBe("?page=5");
    expect(omitted).toBe(explicit);
  });

  it("still requires params whose type excludes undefined", async () => {
    const { createSearchUtils } = await import("../src");
    const { buildSearchString: bound } = createSearchUtils(validateSearch);
    // @ts-expect-error - page is required and may not be omitted
    bound({ q: "test" });
  });
});
