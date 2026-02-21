import { useRef } from "react";

import { useSearchStateContext } from "./context";
import type { SearchStateContextValue } from "./context";
import { debug } from "./debug";
import type { NavigateOptions, QueueItem } from "./navigationQueue";
export type { NavigateOptions } from "./navigationQueue";
import { cleanSearchObject, stringifySearch } from "./utils";
import type { OmitOptional } from "./utils";
import type { AnySearch, Path } from "./types";
import { runValidateSearchOrThrow } from "./validation";
import type { InferValidatedSearch, ValidateSearchFn } from "./validation";

export function flushNavigate(
  context: SearchStateContextValue,
  callback: (
    nextSearch: AnySearch,
    nextPath: Path,
    options: NavigateOptions,
  ) => void,
  queue: QueueItem[] = context.navigationQueue.items,
) {
  const pendingQueue = queue.splice(0);
  context.navigationQueue.frameRef = null;
  if (!pendingQueue.length) return;
  const { adapterRef, store } = context;
  const { current: adapter } = adapterRef;
  const { location: prevPath } = adapter;
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
  if (
    nextSearch !== prevPath.search ||
    (finalPath.pathname && finalPath.pathname !== prevPath.pathname) ||
    (finalPath.hash && finalPath.hash !== prevPath.hash)
  ) {
    const nextPath = { ...finalPath, search: nextSearch };
    debug(
      "[react-url-search-state:flushNavigate] cleaned: %s; nextPath: %s; finalOptions: %s",
      cleaned,
      nextPath,
      finalOpts,
    );
    callback(cleaned, nextPath, finalOpts);
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
 * - Navigation changes are batched via `requestAnimationFrame` for performance and stability.
 */
export function useNavigate<T extends ValidateSearchFn>(
  options: UseNavigateOptions<T>,
) {
  const { validateSearch, onBeforeNavigate } = options;

  const onBeforeNavigateRef = useRef(onBeforeNavigate);
  onBeforeNavigateRef.current = onBeforeNavigate;

  const validateSearchRef = useRef(validateSearch);
  validateSearchRef.current = validateSearch;

  const context = useSearchStateContext();

  const navigateRef = useRef<NavigateFunction<T> | null>(null);
  if (navigateRef.current === null) {
    navigateRef.current = (({ search, ...path }, { merge, ...opts } = {}) => {
      const { adapterRef } = context;
      const { current: adapter } = adapterRef;
      const { current: onBeforeNavigate } = onBeforeNavigateRef;
      const { current: validateSearch } = validateSearchRef;

      const { navigationQueue } = context;

      navigationQueue.items.push({
        updater: (nextParsed) => {
          const effectiveMerge = merge ?? true;
          const nextValidated = runValidateSearchOrThrow(
            validateSearch,
            nextParsed,
          ) as InferValidatedSearch<T>;
          return {
            // When merge is false, clear all validated fields. This ensures only the next override takes effect.
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

      if (navigationQueue.frameRef === null) {
        navigationQueue.frameRef = requestAnimationFrame(() => {
          flushNavigate(context, (nextSearch, nextPath, opts) => {
            onBeforeNavigate?.(nextSearch as InferValidatedSearch<T>, nextPath);
            (opts.replace ? adapter.replaceState : adapter.pushState)(
              opts.state,
              nextPath,
            );
          });
        });
      }
    }) as NavigateFunction<T>;
  }

  return navigateRef.current!;
}
