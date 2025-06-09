import { describe, it, expect, vi } from "vitest";

import { SearchStore } from "../src/store";

describe("SearchStore", () => {
  it("initializes state from search string", () => {
    const store = new SearchStore("?foo=123");
    expect(store.getState()).toEqual({ foo: 123 });
    expect(store.toString()).toBe("?foo=123");
  });

  it("notifies listeners on setState()", () => {
    const store = new SearchStore("?foo=123");
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState("?foo=456");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState()).toEqual({ foo: 456 });
  });

  it("does not notify if state is structurally equal", () => {
    const store = new SearchStore("?foo=123");
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState("?foo=123"); // no actual change

    expect(listener).toHaveBeenCalledTimes(0);
  });

  it("notifies listeners on deep nested changes only", () => {
    const store = new SearchStore(
      // {"id":1,"prefs":{"darkMode":false}}
      "?user=%7B%22id%22%3A1%2C%22prefs%22%3A%7B%22darkMode%22%3Afalse%7D%7D",
    );
    const oldState = store.getState() as { user: { id: string } };
    const listener = vi.fn();
    store.subscribe(listener);

    // Change deep nested field
    const newSearch =
      "?user=%7B%22id%22%3A1%2C%22prefs%22%3A%7B%22darkMode%22%3Atrue%7D%7D";
    store.setState(newSearch);

    expect(listener).toHaveBeenCalledTimes(1);
    const newState = store.getState() as { user: { id: string } };

    // Ensure structural sharing for unchanged parts
    expect(newState.user.id).toBe(oldState.user.id);
    expect(newState.user).not.toBe(oldState.user); // because prefs changed
  });

  it("unsubscribes correctly", () => {
    const store = new SearchStore("?foo=123");
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.setState("?foo=456");

    expect(listener).not.toHaveBeenCalled();
  });

  it("preserves references for shared keys", () => {
    const store = new SearchStore("?a=1&b=2");
    const oldState = store.getState();

    store.setState("?a=1&b=999"); // only `b` changes
    const newState = store.getState();

    expect(newState.a).toBe(oldState.a); // structural sharing
    expect(newState).not.toBe(oldState); // top-level change
  });
});
