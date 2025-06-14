import { useCreateUrlSearchParams } from "./useCreateUrlSearchParams";
import type { CreateUrlSearchParams } from "./useCreateUrlSearchParams";
import { useNavigate } from "./useNavigate";
import type {
  NavigateFunction,
  OnBeforeNavigateFunction,
  UseNavigateOptions,
} from "./useNavigate";
import { useSearch } from "./useSearch";
import type { UseSearchResult } from "./useSearch";
import { useSearchParamState } from "./useSearchParamState";
import type { UseSearchParamStateReturn } from "./useSearchParamState";
import { useSetSearch } from "./useSetSearch";
import type { SetSearchFunction } from "./useSetSearch";
import { useSyncMissingSearchParams } from "./useSyncMissingSearchParams";
import type { UseSyncMissingSearchParamsOptions } from "./useSyncMissingSearchParams";
import type {
  InferValidatedSearch,
  ResolveValidatorFn,
  ValidateSearchFn,
} from "./validation";

type NavigateOptions<TValidateSearchFn extends ValidateSearchFn> = Omit<
  UseNavigateOptions<TValidateSearchFn>,
  "validateSearch"
>;

export type SearchHooks<TValidateSearchFn extends ValidateSearchFn> = {
  useCreateUrlSearchParams: () => CreateUrlSearchParams<TValidateSearchFn>;
  useNavigate: (
    options?: NavigateOptions<TValidateSearchFn>,
  ) => NavigateFunction<TValidateSearchFn>;
  useSearch: <TSelected>(options?: {
    select?: (input: ResolveValidatorFn<TValidateSearchFn>) => TSelected;
  }) => UseSearchResult<TValidateSearchFn, TSelected>;
  useSearchParamState: <
    TKey extends keyof ResolveValidatorFn<TValidateSearchFn>,
  >(
    key: TKey,
    options?: NavigateOptions<TValidateSearchFn>,
  ) => UseSearchParamStateReturn<TValidateSearchFn, TKey>;
  useSetSearch: (
    options?: NavigateOptions<TValidateSearchFn>,
  ) => SetSearchFunction<TValidateSearchFn>;
  useSyncMissingSearchParams: (
    options: Omit<
      UseSyncMissingSearchParamsOptions<TValidateSearchFn>,
      "validateSearch"
    >,
  ) => void;
};

/**
 * Factory for generating typed hooks bound to a specific `validateSearch` function.
 *
 * This is the recommended entry point for most apps and routes.
 * It returns a scoped set of hooks that operate on a validated shape of search params:
 *
 * - `useCreateUrlSearchParams`: Utility for generating shareable URLs from current state
 * - `useNavigate`: Full navigation with path/hash and `onBeforeNavigate`
 * - `useSearch`: Reactive reader for validated + optionally selected state
 * - `useSearchParamState`: Read + update a single param with typed getter/setter
 * - `useSetSearch`: Partial or full updates with merge support
 * - `useSyncMissingSearchParams`: Restore params from local/sessionStorage if missing
 *
 * 🧠 All hooks are auto-wired to the provided validator — no need to pass it manually.
 * 💡 Prefer `composeValidateSearch()` to build on parent schemas — ideal for nested routes.
 *
 * @example
 * ```ts
 * const validateSearch = defineValidateSearch((search) => ({
 *   q: search.q as string | undefined,
 *   page: Number(search.page) || 1,
 * }));
 *
 * const {
 *   useCreateUrlSearchParams,
 *   useNavigate,
 *   useSearch,
 *   useSearchParamState,
 *   useSetSearch,
 *   useSyncMissingSearchParams,
 * } = createSearchHooks(validateSearch);
 * ```
 */
export function createSearchHooks<TValidateSearchFn extends ValidateSearchFn>(
  validateSearch: TValidateSearchFn,
  opts?: {
    onBeforeNavigate?: OnBeforeNavigateFunction<
      InferValidatedSearch<TValidateSearchFn>
    >;
  },
): SearchHooks<TValidateSearchFn> {
  type TValidated = InferValidatedSearch<TValidateSearchFn>;

  const createNavigateOptions = (
    options?: NavigateOptions<TValidateSearchFn>,
  ) => {
    const onBeforeNavigate: OnBeforeNavigateFunction<TValidated> = (
      nextSearch,
      nextPath,
    ) => {
      opts?.onBeforeNavigate?.(nextSearch, nextPath);
      options?.onBeforeNavigate?.(nextSearch, nextPath);
    };

    return {
      ...options,
      onBeforeNavigate,
      validateSearch,
    };
  };

  function useWrappedSearch(): TValidated;
  function useWrappedSearch<
    TSelect extends (search: TValidated) => any,
  >(options: { select: TSelect }): ReturnType<TSelect>;
  function useWrappedSearch<TSelected>(options?: {
    select?: (search: TValidated) => TSelected;
  }) {
    return useSearch({
      ...options,
      validateSearch,
    });
  }

  return {
    useCreateUrlSearchParams: function () {
      return useCreateUrlSearchParams({ validateSearch });
    },
    useNavigate: function (options?: NavigateOptions<TValidateSearchFn>) {
      return useNavigate(createNavigateOptions(options));
    },
    useSearch: useWrappedSearch,
    useSearchParamState: function (key, options) {
      return useSearchParamState(key, createNavigateOptions(options));
    },
    useSetSearch: function (options?: NavigateOptions<TValidateSearchFn>) {
      return useSetSearch(createNavigateOptions(options));
    },
    useSyncMissingSearchParams: function (
      options: Omit<
        UseSyncMissingSearchParamsOptions<TValidateSearchFn>,
        "validateSearch"
      >,
    ) {
      useSyncMissingSearchParams({ ...options, validateSearch });
    },
  };
}
