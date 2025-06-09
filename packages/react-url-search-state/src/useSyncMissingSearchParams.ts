import { useEffect, useRef } from "react";

import { useSearchStateContext } from "./context";
import { debug } from "./debug";
import type { AnySearch } from "./types";
import { createStoreKey, parseSearch, stringifyValue } from "./utils";
import type { ValidateSearchFn } from "./validation";

export type UseSyncMissingSearchParamsOptions<
  TValidateSearchFn extends ValidateSearchFn,
> = {
  validateSearch: TValidateSearchFn;
  params: Record<
    string,
    {
      storage?: "local" | "session";
      storageNamespace?: string;
    }
  >;
};

export const useSyncMissingSearchParams = <
  TValidateSearchFn extends ValidateSearchFn,
>(
  options: UseSyncMissingSearchParamsOptions<TValidateSearchFn>,
) => {
  const { validateSearch, params } = options;

  const paramsRef = useRef(params);

  const { adapterRef } = useSearchStateContext();
  const { current: adapter } = adapterRef;
  const { location } = adapter;

  useEffect(() => {
    const search = parseSearch(location.search) as AnySearch;
    const searchParams = new URLSearchParams(location.search);
    const searchState = validateSearch(search);

    let missing: Record<string, string> = {};
    Object.entries(paramsRef.current).forEach(([name, config]) => {
      if (searchParams.has(name)) return;
      const { storage, storageNamespace } = config;

      let value = searchState[name];
      if (storage) {
        const store = window[`${storage}Storage`];
        const storeKey = createStoreKey(name, storageNamespace);
        const storeValue = store.getItem(storeKey);

        if (storeValue !== null) {
          value = storeValue;

          debug("[react-url-search-state:useSyncMissingSearchParams] %s", {
            storeKey,
            storeValue,
          });
        }
      }

      if (value !== undefined && value !== null) {
        missing[name] =
          typeof value === "string" ? value : (stringifyValue(value) as string);
      }
    });

    debug(
      "[react-url-search-state:useSyncMissingSearchParams] missing: %s",
      missing,
    );

    if (Object.keys(missing).length) {
      const { current: adapter } = adapterRef;
      const { replaceState } = adapter;
      Object.entries(missing).forEach(([name, value]) => {
        searchParams.set(name, value);
      });
      replaceState(undefined, { search: searchParams.toString() });
    }
  }, [location.search, validateSearch]);
};
