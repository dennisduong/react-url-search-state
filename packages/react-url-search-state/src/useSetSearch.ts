import { useCallback } from "react";

import { useNavigate } from "./useNavigate";
import type {
  NavigateOptions,
  ResolveNextSearchFromFn,
  UseNavigateOptions,
} from "./useNavigate";
import type { ValidateSearchFn } from "./validation";

export type SetSearchFunction<T extends ValidateSearchFn> = <
  M extends boolean = true,
>(
  search: ResolveNextSearchFromFn<T, M>,
  options?: NavigateOptions & { merge?: M },
) => void;

/**
 * Updates the validated search state.
 *
 * This is a convenience hook built on top of `useSearchNavigate`,
 * scoped to search param updates only (no pathname or hash support).
 *
 * Supports:
 *
 * - Merging with existing search state (`merge: true`, default)
 * - Replacing or pushing history entries
 * - Functional updates (receives current validated state)
 *
 * ❗️ Throws `ValidationError` if the resulting state fails validation.
 *
 * @example
 * const setSearch = useSetSearch({ validateSearch });
 *
 * // Merge update
 * setSearch({ page: 2 });
 *
 * // Replace entire search state
 * setSearch({ page: 1, q: "test" }, { merge: false });
 *
 * // Functional update
 * setSearch((prev) => ({ ...prev, filter: "active" }));
 *
 * @remarks
 * - Use inside a `<SearchStateProvider>`.
 * - Automatically debounced via `requestAnimationFrame`.
 */
export function useSetSearch<T extends ValidateSearchFn>(
  options: UseNavigateOptions<T>,
) {
  const navigate = useNavigate(options);

  const setSearch: SetSearchFunction<T> = (search, options) => {
    navigate({ search }, options);
  };

  return useCallback(setSearch, [navigate]);
}
