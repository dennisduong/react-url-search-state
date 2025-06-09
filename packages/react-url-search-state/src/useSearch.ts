import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import { useSearchStateContext } from "./context";
import { replaceEqualDeep } from "./utils";
import { validatedSearchCache } from "./validation";
import type { ResolveValidatorFn, ValidateSearchFn } from "./validation";

export type UseSearchOptions<
  TValidateSearchFn extends ValidateSearchFn,
  TSelected,
> = {
  select?: (input: ResolveValidatorFn<TValidateSearchFn>) => TSelected;
  validateSearch: TValidateSearchFn;
};

export type UseSearchResult<TValidatedSearchFn, TSelected> =
  unknown extends TSelected
    ? ResolveValidatorFn<TValidatedSearchFn>
    : TSelected;

/**
 * Reactively reads validated search state from the current location.
 *
 * This hook:
 *
 * - Parses and validates the raw state via the provided `validateSearch` function
 * - Reacts to `location.search` changes using `useSyncExternalStore`
 * - Optionally applies a `select` function to return a focused slice
 * - Ensures referential stability via `replaceEqualDeep` and cached `select` refs
 *
 * ❗️ Throws `ValidationError` if parsing fails — ensures type safety and visibility into bad state.
 *
 * @typeParam TValidateSearchFn - Validator function type
 * @typeParam TSelected - Optional return shape from the selector
 *
 * @example
 * const { q } = useSearch({
 *   validateSearch,
 *   select: (s) => ({ q: s.q }),
 * });
 *
 * @remarks
 * - Use within a `<SearchStateProvider>`.
 * - Prefer the `createSearchHooks()` factory to avoid passing `validateSearch` manually.
 */
export function useSearch<
  TValidateSearchFn extends ValidateSearchFn,
  TSelected,
>(options: UseSearchOptions<TValidateSearchFn, TSelected>) {
  const selectRef = useRef(options.select);
  const validateSearchRef = useRef(options.validateSearch);
  const previousResult = useRef<TSelected | undefined>(undefined);

  const { store } = useSearchStateContext();

  const getSnapshot = useCallback(() => {
    const { current: select } = selectRef;
    const { current: validateSearch } = validateSearchRef;
    const validated = validatedSearchCache.get({
      validateSearch,
      search: store.getState(),
    }) as ResolveValidatorFn<TValidateSearchFn>;
    if (select) {
      const newSlice = replaceEqualDeep(
        previousResult.current,
        select(validated),
      );
      previousResult.current = newSlice;
      return newSlice;
    }
    return validated;
  }, [store]);

  useEffect(() => {
    selectRef.current = options.select;
  }, [options.select]);

  useEffect(() => {
    validateSearchRef.current = options.validateSearch;
  }, [options.validateSearch]);

  return useSyncExternalStore(store.subscribe, getSnapshot) as UseSearchResult<
    TValidateSearchFn,
    TSelected
  >;
}
