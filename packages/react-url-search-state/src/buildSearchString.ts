import { cleanSearchObject, stringifySearch } from "./utils";
import { runValidateSearchOrThrow } from "./validation";
import type { AnySearch } from "./types";
import type { ValidateSearchFn, ResolveValidatorFn } from "./validation";

/**
 * Builds a validated, cleaned URL search string from the given params.
 *
 * This is the recommended utility for generating typed search strings for
 * link building, redirects, or any URL construction outside of navigation.
 *
 * - Validates `params` through the provided `validateSearch` function
 * - Removes `undefined` values recursively via `cleanSearchObject`
 * - Returns a `?`-prefixed search string (e.g. `"?page=2&q=foo"`)
 *
 * ❗ Throws `ValidationError` if `params` fails validation.
 *
 * @example
 * ```ts
 * // Standalone
 * import { buildSearchString, defineValidateSearch } from "react-url-search-state";
 *
 * const validateSearch = defineValidateSearch((s) => ({
 *   page: Number(s.page) || 1,
 *   q: s.q as string | undefined,
 * }));
 *
 * const search = buildSearchString(validateSearch, { page: 2 });
 * const href = `/results${search}`;
 *
 * // Pre-bound via createSearch factory
 * const { buildSearchString } = createSearch(validateSearch);
 * const search = buildSearchString({ page: 2 });
 * ```
 *
 * @remarks
 * For reactive use (e.g. building a link that reflects current URL state),
 * compose with `useSearch`:
 * ```ts
 * const current = useSearch();
 * const href = `/results${buildSearchString({ ...current, page: 2 })}`;
 * ```
 */
export function buildSearchString<T extends ValidateSearchFn>(
  validateSearch: T,
  params: ResolveValidatorFn<T>,
): string {
  const validated = runValidateSearchOrThrow(validateSearch, params as AnySearch);
  const cleaned = cleanSearchObject(validated as Record<string, unknown>);
  return stringifySearch(cleaned as AnySearch);
}
