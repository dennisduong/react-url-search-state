import { describe, it, expect } from "vitest";

import { parseSearch, stringifySearch } from "../src/utils";

describe("parseSearch", () => {
  it("parses simple strings", () => {
    const result = parseSearch("?foo=bar&baz=123");
    expect(result).toEqual({ foo: "bar", baz: 123 });
  });

  it("parses booleans", () => {
    const result = parseSearch("?on=true&off=false");
    expect(result).toEqual({ on: true, off: false });
  });

  it("parses numbers", () => {
    const result = parseSearch("?a=42&b=3.14");
    expect(result).toEqual({ a: 42, b: 3.14 });
  });

  it("parses JSON strings", () => {
    const result = parseSearch("?obj=%7B%22x%22%3A1%7D");
    expect(result).toEqual({ obj: { x: 1 } });
  });

  it("handles arrays", () => {
    const result = parseSearch("?tag=%5B%22foo%22%2C%22bar%22%5D");
    expect(result).toEqual({ tag: ["foo", "bar"] });
  });

  it("handles empty string", () => {
    const result = parseSearch("");
    expect(result).toEqual({});
  });

  describe("malformed input (permissive parsing, must never throw)", () => {
    it("does not throw on double-encoded invalid escape sequences", () => {
      // URLSearchParams decodes "%25E0" to "%E0", which is an invalid UTF-8
      // escape sequence — decodeURIComponent("%E0") throws URIError.
      // Regression: this used to crash SearchStateProvider on mount.
      expect(() => parseSearch("?q=%25E0")).not.toThrow();
      expect(parseSearch("?q=%25E0")).toEqual({ q: "%E0" });
    });

    it("still decodes valid double-encoded values", () => {
      expect(parseSearch("?q=%2520hello")).toEqual({ q: " hello" });
    });

    it("does not throw on a lone percent sign", () => {
      expect(parseSearch("?q=%")).toEqual({ q: "%" });
    });

    it("does not throw on percent followed by non-hex characters", () => {
      expect(parseSearch("?q=%GG")).toEqual({ q: "%GG" });
    });
  });
});

describe("stringifySearch", () => {
  it("serializes simple object", () => {
    const result = stringifySearch({ foo: "bar", baz: 123 });
    expect(result).toBe("?foo=bar&baz=123");
  });

  it("serializes booleans", () => {
    const result = stringifySearch({ active: true, hidden: false });
    expect(result).toBe("?active=true&hidden=false");
  });

  it("serializes nested objects as JSON", () => {
    const result = stringifySearch({ obj: { a: 1 } });
    expect(result).toBe("?obj=%7B%22a%22%3A1%7D");
  });

  it("removes undefined values", () => {
    const result = stringifySearch({ foo: undefined, bar: "yes" });
    expect(result).toBe("?bar=yes");
  });

  it("serializes arrays (JSON-style)", () => {
    const result = stringifySearch({ tag: ["foo", "bar"] });
    expect(result).toBe("?tag=%5B%22foo%22%2C%22bar%22%5D");
  });

  it("returns empty string for empty input", () => {
    const result = stringifySearch({});
    expect(result).toBe("");
  });
});
