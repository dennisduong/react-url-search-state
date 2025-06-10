import type { Path } from "react-url-search-state";

/**
 * Joins a partial Location object into a full path string.
 * Ensures `search` and `hash` are properly prefixed with `?` and `#` respectively.
 *
 * @example
 * ```ts
 * toPath({ pathname: "/some/path", search: "foo=bar", hash: "baz" });
 * // → "/some/path?foo=bar#baz"
 * ```
 */
export function toPath({
  pathname = "/",
  search = "",
  hash = "",
}: Partial<Path>): string {
  const normSearch = search && !search.startsWith("?") ? `?${search}` : search;
  const normHash = hash && !hash.startsWith("#") ? `#${hash}` : hash;
  return `${pathname}${normSearch}${normHash}`;
}
