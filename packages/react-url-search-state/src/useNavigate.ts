import { useCallback, useEffect, useRef } from "react";

import { useSearchStateContext } from "./context";
import type { SearchStateContextValue } from "./context";
import { debug } from "./debug";
import { cleanSearchObject, stringifySearch } from "./utils";
import type { OmitOptional } from "./utils";
import type { AnySearch, Path } from "./types";
import { runValidateSearchOrThrow } from "./validation";
import type { InferValidatedSearch, ValidateSearchFn } from "./validation";

export type NavigateOptions = {
  merge?: boolean;
  replace?: boolean;
  state?: any;
};

let frameRef: number | null = null;
let updateQueue: {
  updater: (validated: AnySearch) => AnySearch;
  options: NavigateOptions;
  path: Pick<Path, "hash" | "pathname">;
}[] = [];

function flushNavigate(
  context: SearchStateContextValue,
  callback: (
    nextSearch: AnySearch,
    nextPath: Path,
    options: NavigateOptions,
  ) => void,
) {
  const pendingQueue = updateQueue;
  updateQueue = [];
  frameRef = null;
  if (!pendingQueue.length) return;
  const { adapterRef, store } = context;
  let finalSearch = store.getState();
  let finalPath: Path = {};
  let finalOpts: NavigateOptions = {};
  for (const { updater, options, path } of pendingQueue) {
    finalSearch = updater(finalSearch);
    finalPath = { ...finalPath, ...path };
    finalOpts = { ...finalOpts, ...options };
  }
  const cleaned = cleanSearchObject(finalSearch);
  const nextSearch = stringifySearch(cleaned as AnySearch);
  const prevLocation = adapterRef.current.location;
  if (
    nextSearch !== prevLocation.search ||
    (finalPath.pathname && finalPath.pathname !== prevLocation.pathname) ||
    (finalPath.hash && finalPath.hash !== prevLocation.hash)
  ) {
    const nextLocation = { ...finalPath, search: nextSearch };
    debug(
      "[react-url-search-state:flushNavigate] cleaned: %s; nextLocation: %s; finalOptions: %s",
      cleaned,
      nextLocation,
      finalOpts,
    );
    callback(cleaned, nextLocation, finalOpts);
  }
}

export type OnBeforeNavigateFunction<TSearch extends AnySearch> = (
  nextSearch: TSearch,
  nextPath: Path,
) => void;

export type UseNavigateOptions<TValidateSearchFn extends ValidateSearchFn> = {
  validateSearch: TValidateSearchFn;
  onBeforeNavigate?: OnBeforeNavigateFunction<
    InferValidatedSearch<TValidateSearchFn>
  >;
};

export type ResolveNextSearchFromFn<
  T extends ValidateSearchFn,
  M extends boolean | undefined,
> = M extends true
  ?
      | Partial<InferValidatedSearch<T>>
      | ((prev: InferValidatedSearch<T>) => Partial<InferValidatedSearch<T>>)
  :
      | OmitOptional<InferValidatedSearch<T>>
      | ((
          prev: InferValidatedSearch<T>,
        ) => OmitOptional<InferValidatedSearch<T>>);

export type NavigateFunction<T extends ValidateSearchFn> = <
  M extends boolean = true,
>(
  path: {
    hash?: string;
    pathname?: string;
    search: ResolveNextSearchFromFn<T, M>;
  },
  options?: NavigateOptions & { merge?: M },
) => void;

/**
 * Navigates by updating the URL's search state — with full control.
 *
 * This hook:
 *
 * - Validates the next search state before applying it
 * - Supports merging or replacing the current search params
 * - Handles full or partial updates (including pathname/hash)
 * - Accepts functional updates based on the current validated state
 * - Batches updates with `requestAnimationFrame` for stability
 * - Optionally calls `onBeforeNavigate` before committing the change
 *
 * ❗️ Throws `ValidationError` if the next state fails validation.
 *
 * @example
 * const navigate = useNavigate({ validateSearch });
 *
 * // Merge into current state
 * navigate({ search: { page: 2 } });
 *
 * // Replace entire state and navigate to a new path
 * navigate(
 *   { search: { q: "foo" }, pathname: "/results" },
 *   { merge: false }
 * );
 *
 * // Functional update
 * navigate({ search: (prev) => ({ ...prev, filter: "active" }) });
 *
 * @remarks
 * - Must be used within a `<SearchStateProvider>`. Seriously — we rely on the context.
 * - If you don’t need pathname or hash control, prefer `useSetSearch()` instead.
 * - Changes won’t be applied immediately; they're batched for performance.
 */
export function useNavigate<T extends ValidateSearchFn>(
  options: UseNavigateOptions<T>,
) {
  const { validateSearch, onBeforeNavigate } = options;

  const onBeforeNavigateRef = useRef(onBeforeNavigate);
  const validateSearchRef = useRef(validateSearch);

  const context = useSearchStateContext();

  useEffect(() => {
    onBeforeNavigateRef.current = onBeforeNavigate;
  }, [onBeforeNavigate]);

  useEffect(() => {
    validateSearchRef.current = validateSearch;
  }, [validateSearch]);

  const navigate: NavigateFunction<T> = (
    { search, ...path },
    { merge, ...opts } = {},
  ) => {
    const { adapterRef } = context;
    const { current: adapter } = adapterRef;
    const { current: onBeforeNavigate } = onBeforeNavigateRef;
    const { current: validateSearch } = validateSearchRef;

    updateQueue.push({
      updater: (nextParsed) => {
        const effectiveMerge = merge ?? true;
        const nextValidated = runValidateSearchOrThrow(
          validateSearch,
          nextParsed,
        ) as InferValidatedSearch<T>;
        return {
          // ...nextParsed, // TODO: 🤔 i need to think this line thorough here...
          // Clears all validated fields if "merge" is `false`, otherwise we effectively "merge"
          ...(effectiveMerge
            ? nextValidated
            : Object.fromEntries(
                Object.keys(nextValidated).map((k) => [k, undefined]),
              )),
          ...(typeof search === "function" ? search(nextValidated) : search),
        };
      },
      options: opts,
      path,
    });

    if (frameRef === null) {
      frameRef = requestAnimationFrame(() => {
        flushNavigate(context, (nextSearch, nextLocation, opts) => {
          onBeforeNavigate?.(
            nextSearch as InferValidatedSearch<T>,
            nextLocation,
          );
          (opts.replace ? adapter.replaceState : adapter.pushState)(
            opts.state,
            nextLocation,
          );
        });
      });
    }
  };

  return useCallback(navigate, [context]);
}
