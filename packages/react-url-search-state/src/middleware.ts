import type { AnySearch, Path } from "./types";
import type { NavigateOptions } from "./navigationQueue";
import { deepEqual } from "./utils";

export type SearchMiddlewareResult<TSearch extends AnySearch = AnySearch> = {
  search: TSearch;
  path: Path;
  options: NavigateOptions;
};

export type SearchMiddlewareContext<TSearch extends AnySearch = AnySearch> = {
  search: TSearch;
  path: Path;
  options: NavigateOptions;
  next: (overrides?: {
    search?: TSearch;
    path?: Partial<Path>;
    options?: Partial<NavigateOptions>;
  }) => SearchMiddlewareResult<TSearch> | null;
};

export type SearchMiddleware<TSearch extends AnySearch = AnySearch> = (
  ctx: SearchMiddlewareContext<TSearch>,
) => SearchMiddlewareResult<TSearch> | null;

/**
 * Runs a middleware pipeline using an onion model with `next()` chaining.
 *
 * Each middleware receives the current `{ search, path, options }` and a `next()`
 * function. Calling `next()` delegates to the next middleware in the chain.
 * Returning `null` from any middleware cancels the navigation.
 *
 * The last middleware in the chain calls a terminal that returns the current state.
 */
export function runMiddleware<TSearch extends AnySearch>(
  middleware: SearchMiddleware<TSearch>[],
  initial: SearchMiddlewareResult<TSearch>,
): SearchMiddlewareResult<TSearch> | null {
  // Build the chain from the inside out (last middleware wraps terminal)
  type NextFn = SearchMiddlewareContext<TSearch>["next"];

  // Terminal: returns the current state as-is
  let chain: NextFn = (overrides) => ({
    search: overrides?.search ?? initial.search,
    path: { ...initial.path, ...overrides?.path },
    options: { ...initial.options, ...overrides?.options },
  });

  // Wrap from right to left so middleware[0] is outermost
  for (let i = middleware.length - 1; i >= 0; i--) {
    const mw = middleware[i]!;
    const nextInChain = chain;

    chain = (overrides) => {
      const currentSearch = overrides?.search ?? initial.search;
      const currentPath = { ...initial.path, ...overrides?.path };
      const currentOptions = { ...initial.options, ...overrides?.options };

      return mw({
        search: currentSearch,
        path: currentPath,
        options: currentOptions,
        next: (innerOverrides) =>
          nextInChain({
            search: innerOverrides?.search ?? currentSearch,
            path: { ...currentPath, ...innerOverrides?.path },
            options: { ...currentOptions, ...innerOverrides?.options },
          }),
      });
    };
  }

  return chain();
}

/**
 * Creates a middleware that retains specified search params across navigations.
 *
 * Pass `true` to retain all current params, or an array of keys to retain specific ones.
 * Retained params are merged back after the rest of the pipeline runs.
 */
export function retainSearchParams<TSearch extends AnySearch>(
  keys: Array<keyof TSearch> | true,
): SearchMiddleware<TSearch> {
  return (ctx) => {
    const result = ctx.next();
    if (!result) return null;

    if (keys === true) {
      return {
        ...result,
        search: { ...ctx.search, ...result.search },
      };
    }

    const retained: Partial<TSearch> = {};
    for (const key of keys) {
      if (key in ctx.search && !(key in result.search)) {
        (retained as AnySearch)[key as string] = ctx.search[key];
      }
    }

    return {
      ...result,
      search: { ...retained, ...result.search } as TSearch,
    };
  };
}

/**
 * Creates a middleware that strips search params from the URL.
 *
 * Accepts three input modes:
 * - `true` — strips all search params (returns empty search object)
 * - `Array<keyof TSearch>` — strips listed keys unconditionally
 * - `Partial<TSearch>` — strips keys whose value deeply equals the provided default
 */
export function stripSearchParams<TSearch extends AnySearch>(
  input: true | Array<keyof TSearch> | Partial<TSearch>,
): SearchMiddleware<TSearch> {
  return (ctx) => {
    const result = ctx.next();
    if (!result) return null;

    if (input === true) {
      return { ...result, search: {} as TSearch };
    }

    const stripped = { ...result.search };

    if (Array.isArray(input)) {
      for (const key of input) {
        delete (stripped as AnySearch)[key as string];
      }
    } else {
      for (const key of Object.keys(input) as Array<keyof TSearch>) {
        if (deepEqual((stripped as AnySearch)[key as string], input[key])) {
          delete (stripped as AnySearch)[key as string];
        }
      }
    }

    return {
      ...result,
      search: stripped,
    };
  };
}
