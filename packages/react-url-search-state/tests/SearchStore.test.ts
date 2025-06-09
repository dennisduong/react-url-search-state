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

  it("unsubscribes correctly", () => {
    const unsubscribe = store.subscribe(emitSpy);
    unsubscribe();
    store.setState("?foo=123");
    expect(emitSpy).toHaveBeenCalledTimes(0);
  });
});
