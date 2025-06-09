import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import {
  SearchStateProvider,
} from "../src/context";
import {
  useSetSearch,
} from "../src/useSetSearch";
import {
  parseSearch,
  stringifySearch,
} from "../src/utils";
import type { ValidateSearchFn } from "../src/validation";
import type { AnySearch } from "../src";

// Mocks — put them at top of test file or in a __mocks__ folder

let mockState: any = {};
let pushState = vi.fn();
let replaceState = vi.fn();

vi.mock("../src/useSearchContext", () => ({
  useSearchContext: () => ({
    adapterRef: { current: { pushState, replaceState } },
    store: {
      getState: () => mockState,
      toString: () => stringifySearch(mockState), // Ensure real stringification
    },
    validatedSearchCache: {
      get: ({ search, validateSearch }: any) => validateSearch(search),
    },
  }),
}));

beforeEach(() => {
  vi.useFakeTimers(); // Control requestAnimationFrame
  pushState.mockClear();
  replaceState.mockClear();
  mockState = {};
});

afterEach(() => {
  vi.useRealTimers(); // Clean up timers
});

const wrapper = ({ children }: any) => {
  const adapter = ({ children }: any) =>
    children({
      location: { search: stringifySearch(mockState) }, // ✅ FIXED
      pushState,
      replaceState,
    });

  return (
    <SearchStateProvider adapter={adapter}>{children}</SearchStateProvider>
  );
};

// Utility to normalize a plain object into a stringifySearch-equivalent shape
function makeStableSearchObject(input: Record<string, unknown>) {
  return parseSearch(stringifySearch(input));
}

describe("useSetSearch", () => {
  it("should merge with validatedSearch when merge: true", () => {
    mockState = makeStableSearchObject({ foo: 1, bar: "default" });

    const validateSearch: ValidateSearchFn = (input) => ({
      foo: Number(input.foo ?? 0),
      bar: String(input.bar ?? "default"),
    });

    const { result } = renderHook(() => useSetSearch({ validateSearch }), {
      wrapper,
    });

    act(() => {
      result.current({ foo: 42 }, { merge: true });
      vi.runAllTimers(); // flush requestAnimationFrame
    });

    const expectedSearch = makeStableSearchObject({ foo: 42, bar: "default" });

    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState).toHaveBeenCalledWith(undefined, {
      search: expect.stringContaining(stringifySearch(expectedSearch)),
    });
  });

  it("should NOT call pushState when the resulting search is the same", () => {
    // ❗ Use `makeStableSearchObject` to match how stringifySearch serializes keys
    mockState = makeStableSearchObject({ foo: 1, bar: "default" });

    const validateSearch: ValidateSearchFn = (input) => ({
      foo: Number(input.foo ?? 0),
      bar: String(input.bar ?? "default"),
    });

    const { result } = renderHook(() => useSetSearch({ validateSearch }), {
      wrapper,
    });

    act(() => {
      result.current({ foo: 1 }, { merge: true }); // No change
      vi.runAllTimers(); // Flush RAF
    });

    expect(pushState).not.toHaveBeenCalled();
  });

  it("should replace state when merge is false", () => {
    mockState = { foo: 1, bar: "old" };

    const validateSearch: ValidateSearchFn = (input) => ({
      foo: Number(input.foo),
      bar: String(input.bar),
    });

    const { result } = renderHook(() => useSetSearch({ validateSearch }), {
      wrapper,
    });

    act(() => {
      result.current({ foo: 9, bar: "updated" }, { merge: false });
      vi.runAllTimers();
    });

    const expected = stringifySearch({ foo: 9, bar: "updated" });
    expect(pushState).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ search: expect.stringContaining(expected) })
    );
  });

  it("should accept function updater with merge: true", () => {
    mockState = { foo: 5, bar: "abc" };

    const validateSearch = (input: AnySearch) => ({
      foo: Number(input.foo),
      bar: String(input.bar),
    });

    const { result } = renderHook(() => useSetSearch({ validateSearch }), {
      wrapper,
    });

    act(() => {
      result.current((prev) => ({ foo: prev.foo + 1 }), { merge: true });
      vi.runAllTimers();
    });

    const expected = stringifySearch({ foo: 6, bar: "abc" });
    expect(pushState).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ search: expect.stringContaining(expected) })
    );
  });

  it("should accept function updater with merge: false", () => {
    mockState = { foo: 5, bar: "abc" };

    const validateSearch: ValidateSearchFn = (input) => ({
      foo: Number(input.foo),
      bar: String(input.bar),
    });

    const { result } = renderHook(() => useSetSearch({ validateSearch }), {
      wrapper,
    });

    act(() => {
      result.current(() => ({ foo: 10, bar: "xyz" }), { merge: false });
      vi.runAllTimers();
    });

    const expected = stringifySearch({ foo: 10, bar: "xyz" });
    expect(pushState).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ search: expect.stringContaining(expected) })
    );
  });

  it("should remove undefined values from resolved search", () => {
    mockState = { foo: 1, bar: "abc" };

    const validateSearch: ValidateSearchFn = (input) => ({
      foo: input.foo !== undefined ? Number(input.foo) : undefined,
      bar: input.bar !== undefined ? String(input.bar) : undefined,
    });

    const { result } = renderHook(() => useSetSearch({ validateSearch }), {
      wrapper,
    });

    act(() => {
      result.current({ foo: undefined }, { merge: true });
      vi.runAllTimers();
    });

    const url = pushState.mock.calls[0]?.[1];
    const decoded = decodeURIComponent(url);
    expect(decoded).not.toContain("foo");
  });

  it("should batch multiple calls into a single pushState", () => {
    mockState = { foo: 1, bar: "x" };

    const validateSearch: ValidateSearchFn = (input) => ({
      foo: Number(input.foo ?? 0),
      bar: String(input.bar ?? ""),
    });

    const { result } = renderHook(() => useSetSearch({ validateSearch }), {
      wrapper,
    });

    act(() => {
      result.current({ foo: 2 }, { merge: true });
      result.current({ bar: "y" }, { merge: true });
      vi.runAllTimers(); // flush one RAF
    });

    expect(pushState).toHaveBeenCalledTimes(1);
    const finalUrl = pushState.mock.calls[0]?.[1].search;
    const decoded = decodeURIComponent(finalUrl);
    expect(decoded).toContain("foo=2");
    expect(decoded).toContain("bar=y");
  });

  it("should call replaceState when replace is true", () => {
    mockState = { foo: 1 };

    const validateSearch: ValidateSearchFn = (input) => ({
      foo: Number(input.foo ?? 0),
    });

    const { result } = renderHook(() => useSetSearch({ validateSearch }), {
      wrapper,
    });

    act(() => {
      result.current({ foo: 2 }, { merge: true, replace: true });
      vi.runAllTimers();
    });

    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(pushState).not.toHaveBeenCalled();
  });

  it("should trigger pushState if validateSearch applies defaults", () => {
    mockState = {};

    const validateSearch: ValidateSearchFn = () => ({
      foo: 123, // injects default
    });

    const { result } = renderHook(() => useSetSearch({ validateSearch }), {
      wrapper,
    });

    act(() => {
      result.current({}, { merge: true });
      vi.runAllTimers();
    });

    const expected = stringifySearch({ foo: 123 });
    expect(pushState).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ search: expect.stringContaining(expected) })
    );
  });

  it("should preserve null and false values", () => {
    mockState = {};

    const validateSearch: ValidateSearchFn = () => ({
      show: false,
      filter: null,
    });

    const { result } = renderHook(() => useSetSearch({ validateSearch }), {
      wrapper,
    });

    act(() => {
      result.current({ _: new Date().getTime() });
      vi.runAllTimers();
    });

    const decoded = decodeURIComponent(pushState.mock.calls[0]?.[1].search);
    expect(decoded).toContain("show=false");
  });
});