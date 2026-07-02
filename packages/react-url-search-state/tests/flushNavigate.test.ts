import { describe, it, expect, vi, beforeEach } from "vitest";

import type { SearchStateContextValue } from "../src/context";
import { SearchStore } from "../src/store";
import { NavigationQueue } from "../src/navigationQueue";
import { flushNavigate } from "../src/useNavigate";
import { stringifySearch } from "../src/utils";
import {
  ValidatedSearchCache,
  ValidationError,
  defineValidateSearch,
} from "../src/validation";

describe("flushNavigate (functional queue)", () => {
  let store: SearchStore;
  let context: SearchStateContextValue;
  let pushSpy: ReturnType<typeof vi.fn>;
  let replaceSpy: ReturnType<typeof vi.fn>;

  const passthrough = defineValidateSearch((search) => search);

  beforeEach(() => {
    store = new SearchStore("?init=1");

    pushSpy = vi.fn();
    replaceSpy = vi.fn();

    context = {
      adapterRef: {
        current: {
          location: { pathname: "/", search: "?init=1", hash: "" },
          pushState: pushSpy,
          replaceState: replaceSpy,
        },
      },
      cache: new ValidatedSearchCache(),
      navigationQueue: new NavigationQueue(),
      stringifySearch,
      store,
    };
  });

  it("batches multiple updaters and calls pushState by default", () => {
    const queue = [
      {
        search: { x: 1 },
        merge: true,
        options: {},
        path: {},
        validator: passthrough,
      },
      {
        search: { y: 2 },
        merge: true,
        options: {},
        path: { pathname: "/new" },
        validator: passthrough,
      },
    ];

    flushNavigate(
      context,
      (_, nextPath, options) => {
        const fn = options.replace
          ? context.adapterRef.current.replaceState
          : context.adapterRef.current.pushState;
        fn({}, nextPath);
      },
      queue,
    );

    expect(pushSpy).toHaveBeenCalledWith(
      {},
      {
        pathname: "/new",
        search: "?init=1&x=1&y=2",
      },
    );
  });

  it("calls replaceState if last options include replace: true", () => {
    const queue = [
      {
        search: { a: 1 },
        merge: true,
        options: { replace: true },
        path: { hash: "#z" },
        validator: passthrough,
      },
    ];

    flushNavigate(
      context,
      (_, nextPath, options) => {
        const fn = options.replace
          ? context.adapterRef.current.replaceState
          : context.adapterRef.current.pushState;
        fn({}, nextPath);
      },
      queue,
    );

    expect(replaceSpy).toHaveBeenCalledWith(
      {},
      {
        search: "?init=1&a=1",
        hash: "#z",
      },
    );
  });

  it("does not call callback if nothing changed", () => {
    const queue = [
      {
        search: { init: "1" }, // same as initial
        merge: true,
        options: {},
        path: {},
        validator: passthrough,
      },
    ];

    const callback = vi.fn();

    flushNavigate(context, callback, queue);

    expect(callback).not.toHaveBeenCalled();
  });
});

describe("flushNavigate (multi-validator batching)", () => {
  let store: SearchStore;
  let context: SearchStateContextValue;

  const makeContext = (initialSearch: string) => {
    store = new SearchStore(initialSearch);
    context = {
      adapterRef: {
        current: {
          location: { pathname: "/", search: initialSearch, hash: "" },
          pushState: vi.fn(),
          replaceState: vi.fn(),
        },
      },
      cache: new ValidatedSearchCache(),
      navigationQueue: new NavigationQueue(),
      stringifySearch,
      store,
    };
  };

  const validatePage = defineValidateSearch((search) => {
    const page = Number(search.page);
    return { page: Number.isInteger(page) && page > 0 ? page : 1 };
  });

  const validateQ = defineValidateSearch((search) => ({
    q: typeof search.q === "string" ? search.q.trim() : "",
  }));

  it("re-validates keys governed by every validator in the frame, not just the last one", () => {
    makeContext("?init=1");
    const queue = [
      { search: { page: -5 }, merge: true, options: {}, path: {}, validator: validatePage },
      { search: { q: "  hi  " }, merge: true, options: {}, path: {}, validator: validateQ },
    ];

    const callback = vi.fn();
    flushNavigate(context, callback, queue);

    expect(callback).toHaveBeenCalledTimes(1);
    const finalSearch = callback.mock.calls[0]?.[0];
    // page: -5 is normalized by validatePage even though validateQ came last
    expect(finalSearch.page).toBe(1);
    expect(finalSearch.q).toBe("hi");
  });

  it("normalizes every validator's keys regardless of queue order", () => {
    makeContext("?init=1");
    const queue = [
      { search: { q: "  hi  " }, merge: true, options: {}, path: {}, validator: validateQ },
      { search: { page: -5 }, merge: true, options: {}, path: {}, validator: validatePage },
    ];

    const callback = vi.fn();
    flushNavigate(context, callback, queue);

    const finalSearch = callback.mock.calls[0]?.[0];
    expect(finalSearch.page).toBe(1);
    expect(finalSearch.q).toBe("hi");
  });

  it("on overlapping keys, the validator of the later navigation wins the final pass", () => {
    const validateMin10 = defineValidateSearch((search) => ({
      n: Math.max(10, Number(search.n) || 0),
    }));
    const validateMax5 = defineValidateSearch((search) => ({
      n: Math.min(5, Number(search.n) || 0),
    }));

    makeContext("?init=1");
    let queue = [
      { search: { n: 7 }, merge: true, options: {}, path: {}, validator: validateMin10 },
      { search: { n: 7 }, merge: true, options: {}, path: {}, validator: validateMax5 },
    ];
    let callback = vi.fn();
    flushNavigate(context, callback, queue);
    // chain runs [min10, max5]: 7 → 10 → 5
    expect(callback.mock.calls[0]?.[0].n).toBe(5);

    makeContext("?init=1");
    queue = [
      { search: { n: 7 }, merge: true, options: {}, path: {}, validator: validateMax5 },
      { search: { n: 7 }, merge: true, options: {}, path: {}, validator: validateMin10 },
    ];
    callback = vi.fn();
    flushNavigate(context, callback, queue);
    // chain runs [max5, min10]: 7 → 5 → 10
    expect(callback.mock.calls[0]?.[0].n).toBe(10);
  });

  it("dedupes repeated validators by last occurrence in the queue", () => {
    const validateMin10 = vi.fn((search: Record<string, unknown>) => ({
      n: Math.max(10, Number(search.n) || 0),
    }));
    const validateMax5 = vi.fn((search: Record<string, unknown>) => ({
      n: Math.min(5, Number(search.n) || 0),
    }));

    makeContext("?init=1");
    const queue = [
      { search: { n: 7 }, merge: true, options: {}, path: {}, validator: validateMin10 },
      { search: { n: 7 }, merge: true, options: {}, path: {}, validator: validateMax5 },
      { search: { n: 7 }, merge: true, options: {}, path: {}, validator: validateMin10 },
    ];

    const callback = vi.fn();
    flushNavigate(context, callback, queue);

    // min10 appears last, so the chain is [max5, min10]: 7 → 5 → 10.
    // A first-occurrence chain ([min10, max5]) would yield 5 instead.
    expect(callback.mock.calls[0]?.[0].n).toBe(10);
    // merge loop: 2 + 1 calls; final chain: 1 each (deduped)
    expect(validateMin10).toHaveBeenCalledTimes(3);
    expect(validateMax5).toHaveBeenCalledTimes(2);
  });

  it("does not resurrect keys cleared by a merge:false navigation", () => {
    makeContext("?page=3&q=hello");
    const queue = [
      { search: { page: 2 }, merge: true, options: {}, path: {}, validator: validatePage },
      { search: { q: "x" }, merge: false, options: {}, path: {}, validator: validateQ },
    ];

    const callback = vi.fn();
    flushNavigate(context, callback, queue);

    const finalSearch = callback.mock.calls[0]?.[0];
    // merge:false wiped page; validatePage's default must not re-inject it
    expect(finalSearch.page).toBeUndefined();
    expect(finalSearch.q).toBe("x");
  });

  it("a validator's explicit-undefined output does not shield the key from later validators", () => {
    // "invalid → drop the param" style validator
    const validateDropInvalid = defineValidateSearch((search) => ({
      page: Number(search.page) > 0 ? Number(search.page) : undefined,
    }));

    makeContext("?init=1");
    const queue = [
      { search: {}, merge: true, options: {}, path: {}, validator: validateDropInvalid },
      { search: { page: -5 }, merge: true, options: {}, path: {}, validator: validatePage },
    ];

    const callback = vi.fn();
    flushNavigate(context, callback, queue);

    // chain [dropInvalid, validatePage]: dropInvalid maps -5 → undefined, but
    // validatePage came later in the frame so its clamp has the final say —
    // and the navigation must not be swallowed by the identical-URL dedup
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]?.[0].page).toBe(1);
  });

  it("a validator can still drop a param via explicit undefined when no later validator reclaims it", () => {
    const validateDropInvalid = defineValidateSearch((search) => ({
      page: Number(search.page) > 0 ? Number(search.page) : undefined,
    }));

    makeContext("?page=5");
    const queue = [
      { search: { page: -5 }, merge: true, options: {}, path: {}, validator: validateDropInvalid },
    ];

    const callback = vi.fn();
    flushNavigate(context, callback, queue);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]?.[0].page).toBeUndefined();
    expect(callback.mock.calls[0]?.[1].search).toBe(stringifySearch({}));
  });

  it("a mid-chain validation failure drops the whole flush atomically", () => {
    const validateNoBoom = defineValidateSearch((search) => {
      if (search.q === "boom") throw new Error("q must not be boom");
      return { page: Number(search.page) || 1 };
    });

    makeContext("?init=1");
    const queue = [
      { search: { page: 2 }, merge: true, options: {}, path: {}, validator: validateNoBoom },
      { search: { q: "boom" }, merge: true, options: {}, path: {}, validator: validateQ },
    ];

    const callback = vi.fn();
    // validateNoBoom passes in the merge loop (q isn't "boom" yet) but rejects
    // the merged result in the final chain
    expect(() => flushNavigate(context, callback, queue)).toThrow(ValidationError);
    expect(callback).not.toHaveBeenCalled();
  });
});
