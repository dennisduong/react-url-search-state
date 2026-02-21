import { describe, expect, it } from "vitest";
import { cleanSearchObject } from "../src/utils";

describe("cleanSearchObject", () => {
  it("removes top-level undefined values", () => {
    expect(cleanSearchObject({ a: 1, b: undefined, c: "x" })).toEqual({
      a: 1,
      c: "x",
    });
  });

  it("keeps falsy non-undefined values", () => {
    expect(cleanSearchObject({ a: 0, b: false, c: null, d: "" })).toEqual({
      a: 0,
      b: false,
      c: null,
      d: "",
    });
  });

  it("recursively cleans nested objects", () => {
    expect(
      cleanSearchObject({ nested: { x: undefined, y: 2 } }),
    ).toEqual({ nested: { y: 2 } });
  });

  it("removes undefined items from arrays", () => {
    expect(cleanSearchObject({ arr: [1, undefined, 3] })).toEqual({
      arr: [1, 3],
    });
  });

  it("filters out empty objects produced by cleaning array items", () => {
    // Previously [{ x: undefined }] became [{}] — now it should become []
    expect(cleanSearchObject({ arr: [{ x: undefined }] })).toEqual({
      arr: [],
    });
  });

  it("keeps non-empty cleaned objects in arrays", () => {
    expect(
      cleanSearchObject({ arr: [{ x: undefined, y: 1 }, { x: undefined }] }),
    ).toEqual({ arr: [{ y: 1 }] });
  });

  it("handles arrays of primitives and objects together", () => {
    expect(
      cleanSearchObject({
        arr: [1, { a: undefined }, "keep", { b: 2, c: undefined }],
      }),
    ).toEqual({ arr: [1, "keep", { b: 2 }] });
  });

  it("returns an empty object when all keys are undefined", () => {
    expect(cleanSearchObject({ a: undefined, b: undefined })).toEqual({});
  });

  it("preserves nested arrays as-is rather than converting them to keyed objects", () => {
    expect(cleanSearchObject({ arr: [[1, 2], [3, 4]] })).toEqual({
      arr: [[1, 2], [3, 4]],
    });
  });
});
