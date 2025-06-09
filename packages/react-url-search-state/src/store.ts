import { parseSearch, replaceEqualDeep } from "./utils";

type Listener = () => void;

/**
 * Internal reactive store for managing and subscribing to parsed search state.
 *
 * This class:
 *
 * - Holds the current parsed search object (`Record<string, unknown>`)
 * - Notifies listeners when the search string changes
 * - Uses structural sharing via `replaceEqualDeep` to avoid unnecessary updates
 *
 * Typically used internally by the `SearchStateProvider` and exposed to hooks like `useSearch`.
 */
export class SearchStore {
  private listeners: Set<Listener>;
  private search: string;
  private state: Record<string, unknown>;

  constructor(search: string) {
    this.search = search;
    this.state = parseSearch(search);
    this.listeners = new Set();
  }

  /**
   * Subscribe to store changes (for useSyncExternalStore, etc).
   * Returns an unsubscribe function.
   */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.unsubscribe(listener);
  };

  unsubscribe = (listener: Listener) => {
    this.listeners.delete(listener);
  };

  /**
   * Updates the internal state if the new search string results
   * in a meaningful change. Uses `replaceEqualDeep` for structural sharing.
   */
  setState = (nextSearch: string) => {
    if (this.search === nextSearch) return;
    const nextState = replaceEqualDeep(this.state, parseSearch(nextSearch));
    this.search = nextSearch;
    this.state = nextState;
    this.emit();
  };

  /** Returns the current parsed search object. */
  getState = () => this.state;

  /** Returns the raw search string (e.g., `?foo=bar`). */
  toString = () => this.search;

  private emit = () => {
    for (const listener of this.listeners) {
      listener();
    }
  };
}
