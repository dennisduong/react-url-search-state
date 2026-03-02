import { parseSearch as defaultParseSearch, replaceEqualDeep } from "./utils";

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
  private parseSearch: (searchStr: string) => Record<string, unknown>;
  private search: string;
  private state: Record<string, unknown>;

  constructor(
    search: string,
    parseSearch: (searchStr: string) => Record<string, unknown> = defaultParseSearch,
  ) {
    this.parseSearch = parseSearch;
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
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Updates internal state without notifying subscribers.
   * Returns `true` if the state reference changed.
   *
   * Use this during React's render phase to keep the store in sync
   * with the URL, then call `emit()` in a layout effect.
   */
  updateState = (nextSearch: string): boolean => {
    if (this.search === nextSearch) return false;
    const nextState = replaceEqualDeep(this.state, this.parseSearch(nextSearch));
    this.search = nextSearch;
    if (nextState !== this.state) {
      this.state = nextState;
      return true;
    }
    return false;
  };

  /** Notifies all subscribers of a state change. */
  emit = () => {
    for (const listener of this.listeners) {
      listener();
    }
  };

  /** Returns the current parsed search object. */
  getState = () => this.state;
}
