import { beforeEach, describe, it, expect, vi } from "vitest";

import { SearchStore } from "../src/store";

describe("SearchStore", () => {
  let store: SearchStore;
  let emitSpy: () => void;

  beforeEach(() => {
    store = new SearchStore("");
    emitSpy = vi.fn();
    store.subscribe(emitSpy);
  });

  it("does not emit if search string is unchanged", () => {
    store.setState("?foo=1");
    store.setState("?foo=1"); // same string
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it("emits if search string is different and structure is different", () => {
    store.setState("?foo=1");
    store.setState("?foo=2"); // different value
    expect(emitSpy).toHaveBeenCalledTimes(2);
  });

  it("emits only once even if setState called with equivalent structure multiple times", () => {
    store.setState("?x=1");
    store.setState("?x=1");
    store.setState("?x=1");
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it("correctly updates internal state when valid", () => {
    store.setState("?page=2");
    expect(store.getState()).toEqual({ page: 2 });
  });

  it("does not emit when param order changes but structure is the same", () => {
    store.setState("?a=1&b=2");
    const stateBefore = store.getState();
    store.setState("?b=2&a=1"); // same structure, different string
    expect(emitSpy).toHaveBeenCalledTimes(1); // no second emit
    expect(store.getState()).toBe(stateBefore); // same reference
  });

  it("preserves state reference when structure is unchanged after reorder", () => {
    store.setState("?x=hello&y=world");
    const ref = store.getState();
    store.setState("?y=world&x=hello");
    expect(store.getState()).toBe(ref);
  });

  it("unsubscribes correctly", () => {
    const unsubscribe = store.subscribe(emitSpy);
    unsubscribe();
    store.setState("?foo=123");
    expect(emitSpy).toHaveBeenCalledTimes(0);
  });
});
