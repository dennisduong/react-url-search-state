import { useCallback, useEffect, useRef } from "react";

import { useSearchStateContext } from "./context";
import { validatedSearchCache } from "./validation";
import type { ResolveValidatorFn, ValidateSearchFn } from "./validation";
import { stringifySearch } from "./utils";

export interface CreateUrlSearchParams<
  TValidateSearchFn extends ValidateSearchFn,
> {
  (
    init: ResolveValidatorFn<TValidateSearchFn>,
    options: { replaceAll: true },
  ): URLSearchParams;

  (
    init?: Partial<ResolveValidatorFn<TValidateSearchFn>>,
    options?: { replaceAll?: boolean },
  ): URLSearchParams;
}

type UseCreateUrlSearchParamsOptions<
  TValidateSearchFn extends ValidateSearchFn,
> = {
  validateSearch: TValidateSearchFn;
};

/**
 * Creates a URLSearchParams instance from the current validated search state.
 *
 * Useful for:
 *
 * - Generating anchor links or navigation targets with current search context
 * - Hydrating downstream apps with the same param state
 * - Copying or inspecting search state outside of the URL
 *
 * 🧠 Uses the current search state from context, validated and optionally overridden.
 * ℹ️ Always returns a fresh URLSearchParams instance — caller is responsible for mutating or serializing.
 *
 * @example
 * ```ts
 * const createParams = useCreateUrlSearchParams({ validateSearch });
 * const params = createParams({ page: 2 }); // overrides page but keeps others
 * const href = `/some-route?${params.toString()}`;
 * ```
 */
export const useCreateUrlSearchParams = <
  TValidateSearchFn extends ValidateSearchFn,
>(
  options: UseCreateUrlSearchParamsOptions<TValidateSearchFn>,
) => {
  const { validateSearch } = options;

  const validateSearchRef = useRef(validateSearch);

  const { store } = useSearchStateContext();

  useEffect(() => {
    validateSearchRef.current = validateSearch;
  }, [validateSearch]);

  const createUrlSearchParams: CreateUrlSearchParams<TValidateSearchFn> = (
    init,
    options,
  ) => {
    const { current: validateSearch } = validateSearchRef;
    const cacheKey = { validateSearch, search: store.getState() };
    const validatedSearch = validatedSearchCache.get(cacheKey);
    const finalSearch =
      options?.replaceAll === true
        ? (init ?? {})
        : { ...validatedSearch, ...init };
    const serializedSearch = stringifySearch(finalSearch);
    return new URLSearchParams(serializedSearch);
  };

  return useCallback(createUrlSearchParams, [store]);
};
