import type { AnySearch } from "./types";
import { createStoreKey, isBrowser, stringifyValue } from "./utils";

/**
 * Saves selected search params to localStorage/sessionStorage.
 *
 * Can be paired with `useSyncMissingSearchParams` for restoration.
 */
export function persistSearchParamsToStorage(
  nextSearch: AnySearch,
  names: string[],
  options: {
    namespace?: string;
    storage?: "local" | "session";
  } = {},
) {
  const { namespace, storage = "local" } = options;
  if (!isBrowser) return;
  const store = window[`${storage}Storage`];
  for (const name of names) {
    const searchValue = nextSearch[name];
    const storeKey = createStoreKey(name, namespace);
    if (searchValue !== undefined && searchValue !== null) {
      store.setItem(
        storeKey,
        typeof searchValue === "string"
          ? searchValue
          : (stringifyValue(searchValue) as string),
      );
    } else {
      store.removeItem(storeKey);
    }
  }
}
