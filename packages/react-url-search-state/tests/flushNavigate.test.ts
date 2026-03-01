import { describe, it, expect, vi, beforeEach } from "vitest";

import type { SearchStateContextValue } from "../src/context";
import { SearchStore } from "../src/store";
import type { AnySearch } from "../src/types";
import { NavigationQueue } from "../src/navigationQueue";
import { flushNavigate } from "../src/useNavigate";
import { stringifySearch } from "../src/utils";
import { ValidatedSearchCache } from "../src/validation";

describe("flushNavigate (functional queue)", () => {
  let store: SearchStore;
  let context: SearchStateContextValue;
  let pushSpy: ReturnType<typeof vi.fn>;
  let replaceSpy: ReturnType<typeof vi.fn>;

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
        updater: () => ({ x: 1 }),
        options: {},
        path: {},
      },
      {
        updater: (prev: AnySearch) => ({ ...prev, y: 2 }),
        options: {},
        path: { pathname: "/new" },
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
        search: "?x=1&y=2",
      },
    );
  });

  it("calls replaceState if last options include replace: true", () => {
    const queue = [
      {
        updater: () => ({ a: 1 }),
        options: { replace: true },
        path: { hash: "#z" },
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
        search: "?a=1",
        hash: "#z",
      },
    );
  });

  it("does not call callback if nothing changed", () => {
    const queue = [
      {
        updater: () => ({ init: "1" }), // same as initial
        options: {},
        path: {},
      },
    ];

    const callback = vi.fn();

    flushNavigate(context, callback, queue);

    expect(callback).not.toHaveBeenCalled();
  });
});
