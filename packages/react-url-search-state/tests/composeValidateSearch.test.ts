import { describe, expect, it, vi } from "vitest";

import {
  composeValidateSearch,
  defineValidateSearch,
  ValidationError,
  runValidateSearchOrThrow,
} from "../src/validation";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseValidator = defineValidateSearch((search) => ({
  q: search.q as string | undefined,
  page: Number(search.page) || 1,
}));

const childValidator = (
  base: ReturnType<typeof baseValidator>,
  raw: Record<string, unknown>,
) => ({
  tab: (raw.tab as string) ?? "all",
  pageSize: Number(raw.pageSize) || 10,
});

// ─── Basic merge ─────────────────────────────────────────────────────────────

describe("composeValidateSearch — basic merge", () => {
  it("merges base and child results into one object", () => {
    const composed = composeValidateSearch(baseValidator, childValidator);
    const result = composed({ q: "hello", page: "2", tab: "recent", pageSize: "25" });

    expect(result).toEqual({
      q: "hello",
      page: 2,
      tab: "recent",
      pageSize: 25,
    });
  });

  it("base fields are present when child does not declare them", () => {
    const composed = composeValidateSearch(baseValidator, (_base, _raw) => ({
      extra: "value",
    }));
    const result = composed({ q: "foo", page: "3" });

    expect(result.q).toBe("foo");
    expect(result.page).toBe(3);
    expect((result as any).extra).toBe("value");
  });

  it("applies base validator defaults when relevant raw params are missing", () => {
    const composed = composeValidateSearch(baseValidator, childValidator);
    const result = composed({});

    // base defaults: page → 1, q → undefined
    // child defaults: tab → "all", pageSize → 10
    expect(result.page).toBe(1);
    expect(result.q).toBeUndefined();
    expect(result.tab).toBe("all");
    expect(result.pageSize).toBe(10);
  });
});

// ─── extend() receives the correct arguments ──────────────────────────────────

describe("composeValidateSearch — extend() arguments", () => {
  it("passes the base-validated result as the first argument to extend()", () => {
    const extend = vi.fn((_base: any, _raw: any) => ({}));
    const composed = composeValidateSearch(baseValidator, extend);

    composed({ page: "7", q: "bar" });

    expect(extend).toHaveBeenCalledWith(
      { page: 7, q: "bar" },
      expect.objectContaining({ page: "7", q: "bar" }),
    );
  });

  it("passes the original raw search as the second argument to extend()", () => {
    const extend = vi.fn((_base: any, raw: any) => ({
      rawPage: raw.page, // raw string, not the coerced number
    }));
    const composed = composeValidateSearch(baseValidator, extend);

    const result = composed({ page: "5" });

    expect((result as any).rawPage).toBe("5"); // raw string preserved
    expect(result.page).toBe(5); // coerced by base
  });
});

// ─── Key-override semantics ───────────────────────────────────────────────────

describe("composeValidateSearch — key-override semantics", () => {
  it("child keys override base keys when they conflict", () => {
    const base = defineValidateSearch((_raw) => ({ page: 1, shared: "base" }));
    const composed = composeValidateSearch(base, (_base, _raw) => ({
      shared: "child",
    }));

    const result = composed({});

    expect(result.shared).toBe("child"); // child wins
    expect(result.page).toBe(1); // base-only field preserved
  });

  it("base value remains when child does not override the same key", () => {
    const base = defineValidateSearch((_raw) => ({ a: "base-a", b: "base-b" }));
    const composed = composeValidateSearch(base, (_base, _raw) => ({
      c: "child-c",
    }));

    const result = composed({});

    expect(result.a).toBe("base-a");
    expect(result.b).toBe("base-b");
    expect((result as any).c).toBe("child-c");
  });
});

// ─── Multi-layer composition ──────────────────────────────────────────────────

describe("composeValidateSearch — multi-layer composition", () => {
  it("composes three layers: composeValidateSearch(compose(A, B), C)", () => {
    const layerA = defineValidateSearch((_raw) => ({ a: 1 }));
    const layerAB = composeValidateSearch(layerA, (_base, _raw) => ({ b: 2 }));
    const layerABC = composeValidateSearch(layerAB, (_base, _raw) => ({ c: 3 }));

    const result = layerABC({});

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("each layer's extend() receives the fully merged result of all prior layers", () => {
    const layerA = defineValidateSearch((_raw) => ({ a: "A" }));
    const layerAB = composeValidateSearch(layerA, (base, _raw) => ({
      b: `${base.a}-B`,
    }));

    const extendC = vi.fn((base: any, _raw: any) => ({ c: `${base.b}-C` }));
    const layerABC = composeValidateSearch(layerAB, extendC);

    const result = layerABC({});

    // extendC's base should have both a and b from prior layers
    expect(extendC).toHaveBeenCalledWith(
      { a: "A", b: "A-B" },
      expect.anything(),
    );
    expect((result as any).c).toBe("A-B-C");
  });

  it("later-layer child keys override earlier-layer keys in multi-layer setup", () => {
    const layerA = defineValidateSearch((_raw) => ({ shared: "A", a: 1 }));
    const layerAB = composeValidateSearch(layerA, (_base, _raw) => ({
      shared: "B",
      b: 2,
    }));
    const layerABC = composeValidateSearch(layerAB, (_base, _raw) => ({
      shared: "C",
      c: 3,
    }));

    const result = layerABC({});

    expect(result.shared).toBe("C"); // last layer wins
    expect(result.a).toBe(1);
    expect(result.b).toBe(2);
    expect(result.c).toBe(3);
  });
});

// ─── Error propagation ────────────────────────────────────────────────────────

describe("composeValidateSearch — error propagation", () => {
  it("propagates errors thrown by the base validator", () => {
    const strictBase = defineValidateSearch((search) => {
      if (!search.required) throw new Error("required is missing");
      return { required: search.required as string };
    });
    const composed = composeValidateSearch(strictBase, (_base, _raw) => ({
      extra: "ok",
    }));

    expect(() => composed({})).toThrow("required is missing");
  });

  it("propagates errors thrown by the extend() function", () => {
    const base = defineValidateSearch((_raw) => ({ a: 1 }));
    const composed = composeValidateSearch(base, (_base, _raw) => {
      throw new Error("extend blew up");
    });

    expect(() => composed({})).toThrow("extend blew up");
  });

  it("wraps composed validator errors in ValidationError when used via runValidateSearchOrThrow", () => {
    const strictBase = defineValidateSearch((search) => {
      if (!search.required) throw new Error("required is missing");
      return { required: search.required as string };
    });
    const composed = composeValidateSearch(strictBase, (_base, _raw) => ({}));

    expect(() => runValidateSearchOrThrow(composed, {})).toThrow(ValidationError);
  });
});

// ─── Integration with defineValidateSearch ────────────────────────────────────

describe("composeValidateSearch — integration with defineValidateSearch", () => {
  it("works when both base and extend are created with defineValidateSearch", () => {
    const base = defineValidateSearch((search) => ({
      sort: (search.sort as string) ?? "asc",
    }));
    const composed = composeValidateSearch(
      base,
      defineValidateSearch((_search) => ({
        filter: "active",
      })),
    );

    const result = composed({ sort: "desc" });

    expect(result.sort).toBe("desc");
    expect((result as any).filter).toBe("active");
  });

  it("unknown raw params are not included in the composed result unless a validator declares them", () => {
    const base = defineValidateSearch((_raw) => ({ a: 1 }));
    const composed = composeValidateSearch(base, (_base, _raw) => ({ b: 2 }));

    const result = composed({ unknown: "param", a: "99" });

    expect((result as any).unknown).toBeUndefined();
    expect(result.a).toBe(1); // base validator ignores raw a since it returns literal 1
    expect(result.b).toBe(2);
  });
});
