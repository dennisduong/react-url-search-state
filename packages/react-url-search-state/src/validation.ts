import type { AnySearch } from "./types";
import type { OverrideMerge } from "./utils";

export type ValidateSearchFn<TValidated extends AnySearch = AnySearch> = (
  input: AnySearch,
) => TValidated;

export type ResolveValidatorFn<TValidator> = TValidator extends (
  ...args: any
) => infer TSchema
  ? TSchema
  : AnySearch;

export type InferValidatedSearch<T extends ValidateSearchFn> = ReturnType<T>;

/**
 * Error thrown when `validateSearch` fails to parse the current state.
 *
 * This is surfaced in hooks like `useSearch`, `useSetSearch`, and `useSearchNavigate`
 * if the provided validator throws an exception.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Composes two `validateSearch` functions into one.
 *
 * This is useful when a parent route defines a base schema,
 * and a child route wants to extend it with additional params.
 *
 * The base validator runs first. The child validator receives both:
 *
 * - The result of the base validation
 * - The original raw search object
 *
 * This allows the child to build on top of the parent, safely and predictably.
 *
 * @example
 * const base = defineValidateSearch((search) => ({
 *   q: search.q as string | undefined,
 * }));
 *
 * const extended = composeValidateSearch(base, (base, raw) => ({
 *   page: Number(raw.page) || 1,
 * }));
 *
 * const search = extended({ q: "foo", page: "2" });
 * // => { q: "foo", page: 2 }
 *
 * @remarks
 * - The final result merges both layers into one object.
 * - Keys in the child validator take precedence.
 */
export function composeValidateSearch<
  TBase extends Record<string, any>,
  TChild extends Record<string, any>,
>(
  base: (raw: AnySearch) => TBase,
  extend: (base: TBase, raw: AnySearch) => TChild,
): (raw: AnySearch) => OverrideMerge<TBase, TChild> {
  return function (raw: AnySearch) {
    const baseResult = base(raw);
    const childResult = extend(baseResult, raw);
    return { ...baseResult, ...childResult };
  };
}

/** @internal Utility to execute a validator with error-wrapping logic */
export function runValidateSearchOrThrow(
  validate: ValidateSearchFn,
  search: AnySearch,
) {
  try {
    return validate(search);
  } catch (error) {
    throw new ValidationError(
      error instanceof Error ? error.message : `Uncaught error: ${error}`,
    );
  }
}

/**
 * Defines a `validateSearch` function with full type inference support.
 *
 * This is a no-op helper used to preserve type inference when
 * defining your validation logic for search params.
 *
 * It lets TypeScript infer the return type and use it across all hooks.
 *
 * @example
 * const validateSearch = defineValidateSearch((search) => ({
 *   q: search.q as string | undefined,
 *   page: Number(search.page) || 1,
 * }));
 */
export function defineValidateSearch<T extends AnySearch>(
  fn: (search: AnySearch) => T,
): ValidateSearchFn<T> {
  return fn;
}

/**
 * A memory-safe cache for storing validated search results.
 *
 * Uses a two-level WeakMap structure to:
 *
 * - Avoid re-validating the same search object multiple times
 * - Support multiple `validateSearch` functions simultaneously
 * - Automatically release cache entries when the original search object is GC'd
 *
 * This is a performance optimization used by `useSearch()` and related hooks.
 */
export class ValidatedSearchCache {
  private cache: WeakMap<AnySearch, WeakMap<ValidateSearchFn, AnySearch>>;

  constructor() {
    this.cache = new WeakMap();
  }

  /**
   * Retrieves a validated search object from the cache, or validates and stores it if not already cached.
   */
  get = ({
    search,
    validateSearch,
  }: {
    validateSearch: ValidateSearchFn;
    search: AnySearch;
  }) => {
    let inner = this.cache.get(search);
    if (!inner) {
      // Level 1: cache by raw search object reference
      inner = new WeakMap<ValidateSearchFn, AnySearch>();
      this.cache.set(search, inner);
    }
    let validated = inner.get(validateSearch);
    if (!validated) {
      // Level 2: cache by validator function reference
      validated = runValidateSearchOrThrow(validateSearch, search);
      inner.set(validateSearch, validated);
    }
    return validated;
  };

  clear = () => {
    this.cache = new WeakMap();
  };
}

export const validatedSearchCache = new ValidatedSearchCache();
