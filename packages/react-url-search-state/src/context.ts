import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { SearchStore } from "./store";
import type { SearchStateAdapter, SearchStateAdapterComponent } from "./types";
import { NavigationQueue } from "./navigationQueue";
import { ValidatedSearchCache } from "./validation";

/**
 * 📣 Note: In React 18, `ref.current` is typed as `T | null`, even when initialized.
 * So we defensively check for `null` even though it's never expected to happen
 * in practice. In React 19+, this guard may become unnecessary thanks to
 * improved inference (see: https://github.com/reactjs/rfcs/pull/220).
 */
type RefObject<T> = React.RefObject<T> & {
  readonly current: T;
};

export type SearchStateContextValue = {
  adapterRef: RefObject<SearchStateAdapter>;
  cache: ValidatedSearchCache;
  navigationQueue: NavigationQueue;
  store: SearchStore;
};

const SearchStateContext = createContext<SearchStateContextValue | undefined>(
  undefined,
);

export function useSearchStateContext() {
  const ctx = useContext(SearchStateContext);
  if (ctx === undefined) throw new Error("Missing SearchStateProvider");
  if (ctx.adapterRef.current === undefined)
    throw new Error("React < v19 guard - should never really happen");
  return ctx;
}

function SearchStateProviderInner(props: {
  adapter: SearchStateAdapter;
  children?: React.ReactNode;
}) {
  const { adapter, children } = props;
  const { location } = adapter;

  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  const [store] = useState(() => new SearchStore(location.search));
  const [cache] = useState(() => new ValidatedSearchCache());
  const [navigationQueue] = useState(() => new NavigationQueue());

  const value = useMemo(
    () => ({ adapterRef, cache, navigationQueue, store }),
    [adapterRef, cache, navigationQueue, store],
  );

  useEffect(() => {
    store.setState(location.search);
  }, [location.search, store]);

  useEffect(() => {
    return () => {
      navigationQueue.destroy();
    };
  }, [navigationQueue]);

  return createElement(SearchStateContext.Provider, { value }, children);
}

type SearchStateProviderProps = {
  adapter: SearchStateAdapterComponent;
  children?: React.ReactNode;
};

export function SearchStateProvider(props: SearchStateProviderProps) {
  const { adapter: Adapter, children } = props;

  return createElement(Adapter, {
    children: (adapter: SearchStateAdapter) =>
      createElement(SearchStateProviderInner, { adapter }, children),
  });
}
