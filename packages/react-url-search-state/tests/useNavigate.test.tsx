import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import {SearchStateProvider} from '../src/context'
import {stringifySearch,} from '../src/utils'
import { useNavigate } from "../src/useNavigate";
import type { SearchStateAdapter } from '../src/types'
import { defineValidateSearch } from '../src/validation'
import type {
  ValidateSearchFn,
} from "../src/validation";

// Mocks — put them at top of test file or in a __mocks__ folder

let mockLocation: SearchStateAdapter["location"] = {
  hash: "",
  pathname: "/",
  search: "",
};
let mockState: any = {};
let pushState = vi.fn();
let replaceState = vi.fn();

vi.mock("../src/useSearchContext", () => ({
  useSearchContext: () => ({
    adapterRef: {
      current: {
        location: mockLocation,
        pushState,
        replaceState,
      },
    },
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
  mockLocation = {
    hash: "",
    pathname: "/",
    search: "",
  };
});

afterEach(() => {
  vi.useRealTimers(); // Clean up timers
});

const wrapper = ({ children }: any) => {
  const adapter = ({ children }: any) =>
    children({
      location: { ...mockLocation, search: stringifySearch(mockState) },
      pushState,
      replaceState,
    });

  return (
    <SearchStateProvider adapter={adapter}>{children}</SearchStateProvider>
  );
};

describe("useNavigate", () => {
  it("should apply pathname and hash in navigation", () => {
    mockState = { foo: 1 };

    const validateSearch: ValidateSearchFn = (input) => ({
      foo: Number(input.foo),
    });

    const { result } = renderHook(() => useNavigate({ validateSearch }), {
      wrapper,
    });

    act(() => {
      result.current(
        {
          pathname: "/next",
          hash: "#top",
          search: { foo: 2 },
        },
        { merge: true }
      );
      vi.runAllTimers();
    });

    const path = pushState.mock.calls[0]?.[1];
    expect(path.pathname).toEqual("/next");
    expect(path.hash).toEqual("#top");
    expect(decodeURIComponent(path.search)).toContain("foo=2");
  });

  it("should support pathname change with merge: false", () => {
    mockState = { foo: 1, bar: "a" };

    const validateSearch: ValidateSearchFn = (input) => ({
      foo: Number(input.foo ?? 0),
      bar: String(input.bar ?? ""),
    });

    const { result } = renderHook(() => useNavigate({ validateSearch }), {
      wrapper,
    });

    act(() => {
      result.current(
        {
          pathname: "/clear",
          search: { foo: 9, bar: "z" },
        },
        { merge: false }
      );
      vi.runAllTimers();
    });

    const path = pushState.mock.calls[0]?.[1];
    const search = decodeURIComponent(path.search);
    expect(decodeURIComponent(path.pathname)).toContain("/clear");
    expect(search).toContain("foo=9");
    expect(search).toContain("bar=z");
  });

  it("should not push if pathname, hash, and search are unchanged", () => {
    mockState = { foo: 1 };

    const validateSearch: ValidateSearchFn = (input) => ({
      foo: Number(input.foo),
    });

    const { result } = renderHook(() => useNavigate({ validateSearch }), {
      wrapper,
    });

    act(() => {
      result.current(
        {
          pathname: "/", // assume current path is /
          hash: "", // default hash
          search: { foo: 1 },
        },
        { merge: true }
      );
      vi.runAllTimers();
    });

    expect(pushState).not.toHaveBeenCalled();
  });

  it("should call onBeforeNavigate before pushState", () => {
    const onBeforeNavigate = vi.fn();

    mockState = { foo: 1 };

    const validateSearch = defineValidateSearch((input) => ({
      foo: Number(input.foo ?? 0),
    }));

    const { result } = renderHook(
      () =>
      useNavigate({
          validateSearch,
          onBeforeNavigate,
        }),
      { wrapper }
    );

    act(() => {
      result.current({ search: { foo: 2 } }, { merge: true });
      vi.runAllTimers();
    });

    expect(onBeforeNavigate).toHaveBeenCalledTimes(1);
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(onBeforeNavigate.mock.invocationCallOrder[0]).toBeLessThan(
      pushState.mock.invocationCallOrder[0] ?? 0
    );
  });

  it("should pass cleaned search object to onBeforeNavigate", () => {
    mockState = { foo: 1, bar: undefined };

    const onBeforeNavigate = vi.fn();

    const validateSearch = defineValidateSearch((input) => ({
      foo: Number(input.foo ?? 0),
      bar: input.bar,
    }));

    const { result } = renderHook(
      () =>
      useNavigate({
          validateSearch,
          onBeforeNavigate,
        }),
      { wrapper }
    );

    act(() => {
      result.current({ search: { foo: 2, bar: undefined } }, { merge: false });
      vi.runAllTimers();
    });

    const arg = onBeforeNavigate.mock.calls[0]?.[0];
    expect(arg).toEqual({ foo: 2 }); // bar: undefined should be removed
  });

  it("should apply pathname and hash in navigation even if search has not changed", () => {
    mockState = { foo: 1 };

    const validateSearch: ValidateSearchFn = (input) => ({
      foo: Number(input.foo),
    });

    const { result } = renderHook(() => useNavigate({ validateSearch }), {
      wrapper,
    });

    act(() => {
      result.current({
        pathname: "/next",
        hash: "#top",
        search: {},
      });
      vi.runAllTimers();
    });

    const path = pushState.mock.calls[0]?.[1];
    expect(path.pathname).toEqual("/next");
    expect(path.hash).toEqual("#top");
    expect(decodeURIComponent(path.search)).toContain("foo=1");
  });
});