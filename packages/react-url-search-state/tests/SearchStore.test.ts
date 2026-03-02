import { beforeEach, describe, it, expect, vi } from "vitest";

import { SearchStore } from "../src/store";

/** Helper: update state and emit if changed (mirrors provider usage). */
function setState(store: SearchStore, search: string) {
  if (store.updateState(search)) {
    store.emit();
  }
}

describe("SearchStore", () => {
  let store: SearchStore;
  let emitSpy: () => void;

  beforeEach(() => {
    store = new SearchStore("");
    emitSpy = vi.fn();
    store.subscribe(emitSpy);
  });

  it("does not emit if search string is unchanged", () => {
    setState(store, "?foo=1");
    setState(store, "?foo=1"); // same string
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it("emits if search string is different and structure is different", () => {
    setState(store, "?foo=1");
    setState(store, "?foo=2"); // different value
    expect(emitSpy).toHaveBeenCalledTimes(2);
  });

  it("emits only once even if called with equivalent structure multiple times", () => {
    setState(store, "?x=1");
    setState(store, "?x=1");
    setState(store, "?x=1");
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it("correctly updates internal state when valid", () => {
    setState(store, "?page=2");
    expect(store.getState()).toEqual({ page: 2 });
  });

  it("does not emit when param order changes but structure is the same", () => {
    setState(store, "?a=1&b=2");
    const stateBefore = store.getState();
    setState(store, "?b=2&a=1"); // same structure, different string
    expect(emitSpy).toHaveBeenCalledTimes(1); // no second emit
    expect(store.getState()).toBe(stateBefore); // same reference
  });

  it("preserves state reference when structure is unchanged after reorder", () => {
    setState(store, "?x=hello&y=world");
    const ref = store.getState();
    setState(store, "?y=world&x=hello");
    expect(store.getState()).toBe(ref);
  });

  it("unsubscribes correctly", () => {
    const unsubscribe = store.subscribe(emitSpy);
    unsubscribe();
    setState(store, "?foo=123");
    expect(emitSpy).toHaveBeenCalledTimes(0);
  });
});
