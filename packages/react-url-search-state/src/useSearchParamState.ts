import { useCallback } from "react";

import type { NavigateOptions, UseNavigateOptions } from "./useNavigate";
import { useSearch } from "./useSearch";
import { useSetSearch } from "./useSetSearch";
import type { ResolveValidatorFn, ValidateSearchFn } from "./validation";

type SetValueFunction<T> = (prev: T) => T;

type UseSearchParamStateReturn<
  TValidateSearchFn extends ValidateSearchFn,
  TKey extends keyof ResolveValidatorFn<TValidateSearchFn>,
> = readonly [
  ResolveValidatorFn<TValidateSearchFn>[TKey],
  (
    nextValue:
      | ResolveValidatorFn<TValidateSearchFn>[TKey]
      | ((
          prev: ResolveValidatorFn<TValidateSearchFn>[TKey],
        ) => ResolveValidatorFn<TValidateSearchFn>[TKey]),
    opts?: NavigateOptions,
  ) => void,
];

export interface useSearchParamState<
  TValidateSearchFn extends ValidateSearchFn,
> {
  <TKey extends keyof ResolveValidatorFn<TValidateSearchFn>>(
    key: TKey,
    options: UseNavigateOptions<TValidateSearchFn>,
  ): UseSearchParamStateReturn<TValidateSearchFn, TKey>;
}

/**
 * Hook to access and update a specific search param value by key,
 * with both getter and setter fully typed based on the key's value type returned from `validateSearch`.
 *
 * Example:
 *   const [count, setCount] = useSearchParamState("count"); // `count` is number | undefined
 *   setCount(); // Type-safe
 *
 * The setter updates the URL search param using `useSetSearch`.
 */
export const useSearchParamState = <
  TValidateSearchFn extends ValidateSearchFn,
  TKey extends keyof ResolveValidatorFn<TValidateSearchFn>,
>(
  name: TKey,
  options: UseNavigateOptions<TValidateSearchFn>,
) => {
  type Value = ResolveValidatorFn<TValidateSearchFn>[TKey];

  const { validateSearch } = options;

  const setSearch = useSetSearch(options);

  const value = useSearch({
    select: (search) => search[name],
    validateSearch,
  }) as ResolveValidatorFn<TValidateSearchFn>[TKey];

  function isSetValueFunction<T>(fn: unknown): fn is SetValueFunction<T> {
    return typeof fn === "function";
  }

  const setValue = useCallback(
    (nextValue: SetValueFunction<Value> | Value, opts?: NavigateOptions) =>
      setSearch(
        (prev) => ({
          ...prev,
          [name]: isSetValueFunction<Value>(nextValue)
            ? nextValue(prev[name])
            : nextValue,
        }),
        opts,
      ),
    [setSearch],
  );

  return [value, setValue] as const;
};
