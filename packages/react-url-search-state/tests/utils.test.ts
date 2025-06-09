import { describe, it, expect } from "vitest";

import { parseSearch, replaceEqualDeep, stringifySearch } from "../src/utils";

describe("parseSearch + stringifySearch (round-trip)", () => {
  const roundTrip = (input: Record<string, unknown>) => {
    const query = stringifySearch(input);
    const parsed = parseSearch(query);
    expect(parsed).toEqual(input);
  };

  it("handles strings, numbers, booleans", () => {
    roundTrip({ a: "hello", b: 42, c: true, d: false });
  });

  it("handles arrays of primitives", () => {
    roundTrip({ tags: ["red", "blue", "green"], nums: [1, 2, 3] });
  });

  it("handles nested objects", () => {
    roundTrip({
      filter: {
        status: "active",
        meta: { score: 99, verified: true },
      },
    });
  });

  it("handles null and undefined", () => {
    const input = { x: null, y: undefined, z: 123 };
    const query = stringifySearch(input);
    const parsed = parseSearch(query);

    expect(query.includes("y")).toBe(false); // undefined is stripped
    expect(parsed).toEqual({ x: null, z: 123 });
  });

  it("handles deeply nested objects and arrays", () => {
    roundTrip({
      user: {
        id: 10,
        name: "Jane",
        roles: ["admin", "editor"],
        settings: { darkMode: true, layout: { cols: 3 } },
      },
    });
  });
});

describe("replaceEqualDeep", () => {
  it("returns previous reference if same primitive", () => {
    const prev = 123;
    const next = 123;
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(prev);
  });

  it("returns next value if different primitive", () => {
    const prev = 123;
    const next = 456;
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(next);
  });

  it("preserves references for deeply equal objects", () => {
    const prev = { a: 1, b: { c: 2 } };
    const next = { a: 1, b: { c: 2 } };
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(prev);
    expect(result.b).toBe(prev.b);
  });

  it("replaces changed nested values but preserves others", () => {
    const prev = { a: 1, b: { c: 2, d: 3 } };
    const next = { a: 1, b: { c: 999, d: 3 } };
    const result = replaceEqualDeep(prev, next);

    expect(result).not.toBe(prev);
    expect(result.a).toBe(prev.a);
    expect(result.b).not.toBe(prev.b);
    expect(result.b.d).toBe(prev.b.d);
  });

  it("preserves reference for deeply equal arrays", () => {
    const prev = [1, 2, 3];
    const next = [1, 2, 3];
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(prev);
  });

  it("replaces changed array elements", () => {
    const prev = [1, 2, 3];
    const next = [1, 999, 3];
    const result = replaceEqualDeep(prev, next);
    expect(result).not.toBe(prev);
    expect(result[0]).toBe(prev[0]);
    expect(result[2]).toBe(prev[2]);
  });

  it("handles undefined entries properly", () => {
    const prev = { a: undefined };
    const next = { a: undefined };
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(prev);
  });

  it("handles mismatched structures", () => {
    const prev = { a: 1 };
    const next = [1];
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(next);
  });
});
