import { describe, it, expect } from "vitest";

import { replaceEqualDeep } from "../src/utils";

describe("replaceEqualDeep", () => {
  it("returns prev if deeply equal", () => {
    const prev = { foo: { bar: 1 }, arr: [1, 2] };
    const next = { foo: { bar: 1 }, arr: [1, 2] };

    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(prev); // reference equality
  });

  it("returns new object if different", () => {
    const prev = { foo: { bar: 1 } };
    const next = { foo: { bar: 2 } };

    const result = replaceEqualDeep(prev, next);
    expect(result).not.toBe(prev);
    expect(result).toEqual(next);
  });

  it("reuses shared subtrees", () => {
    const shared = { bar: 1 };
    const prev = { foo: shared, unchanged: [1, 2] };
    const next = { foo: { bar: 1 }, unchanged: [1, 2] };

    const result = replaceEqualDeep(prev, next);
    expect(result.foo).toBe(shared);
    expect(result.unchanged).toBe(prev.unchanged);
  });

  it("treats nulls and undefined correctly", () => {
    expect(replaceEqualDeep(null, null)).toBe(null);
    expect(replaceEqualDeep(undefined, undefined)).toBe(undefined);
    expect(replaceEqualDeep(null, undefined)).toBe(undefined);
    expect(replaceEqualDeep(undefined, null)).toBe(null);
  });

  it("handles arrays", () => {
    const prev = { list: [1, 2, 3] };
    const next = { list: [1, 2, 3] };

    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(prev);
    expect(result.list).toBe(prev.list);
  });

  it("returns same scalar values", () => {
    expect(replaceEqualDeep(42, 42)).toBe(42);
    expect(replaceEqualDeep("test", "test")).toBe("test");
    expect(replaceEqualDeep(true, true)).toBe(true);
  });
});
