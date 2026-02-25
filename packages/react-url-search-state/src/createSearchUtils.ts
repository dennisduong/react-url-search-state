import { buildSearchString as _buildSearchString } from "./buildSearchString";
import type { SearchMiddleware } from "./middleware";
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
import type {
  InferValidatedSearch,
  ResolveValidatorFn,
  ValidateSearchFn,
} from "./validation";

type NavigateOptions<TValidateSearchFn extends ValidateSearchFn> = Omit<
  UseNavigateOptions<TValidateSearchFn>,
  "validateSearch"
>;

export type SearchUtils<TValidateSearchFn extends ValidateSearchFn> = {
  buildSearchString: (
    params: ResolveValidatorFn<TValidateSearchFn>,
  ) => string;
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
};

/**
 * Factory for creating a typed search utility set bound to a specific `validateSearch` function.
 *
 * Returns hooks and utilities pre-wired to your validator — no need to pass
 * it manually on every call. This is the recommended entry point for most apps and routes.
 *
 * **Hooks:**
 * - `useNavigate`: Full navigation with path/hash and `onBeforeNavigate`
 * - `useSearch`: Reactive reader for validated + optionally selected state
 * - `useSearchParamState`: Read + update a single param with typed getter/setter
 * - `useSetSearch`: Partial or full updates with merge support
 *
 * **Utilities:**
 * - `buildSearchString`: Pure function for generating validated search strings for link building
 *
 * 🧠 All hooks and utilities are auto-wired to the provided validator.
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
 *   buildSearchString,
 *   useNavigate,
 *   useSearch,
 *   useSearchParamState,
 *   useSetSearch,
 * } = createSearchUtils(validateSearch);
 * ```
 */
export function createSearchUtils<TValidateSearchFn extends ValidateSearchFn>(
  validateSearch: TValidateSearchFn,
  opts?: {
    onBeforeNavigate?: OnBeforeNavigateFunction<
      InferValidatedSearch<TValidateSearchFn>
    >;
    middleware?: SearchMiddleware<InferValidatedSearch<TValidateSearchFn>>[];
  },
): SearchUtils<TValidateSearchFn> {
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

    const middleware: SearchMiddleware<TValidated>[] = [
      ...(opts?.middleware ?? []),
      ...(options?.middleware ?? []),
    ];

    return {
      ...options,
      middleware: middleware.length > 0 ? middleware : undefined,
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
    buildSearchString: function (params) {
      return _buildSearchString(validateSearch, params);
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
  };
}
