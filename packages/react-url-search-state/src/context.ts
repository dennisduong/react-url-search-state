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
import type {
  SearchStateAdapter,
  SearchStateAdapterComponent,
} from "./types";

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
  store: SearchStore;
};

const SearchStateContext = createContext<SearchStateContextValue | undefined>(
  undefined
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

  const [store] = useState(() => new SearchStore(location.search));

  const value = useMemo(() => ({ adapterRef, store }), [adapterRef, store]);

  useEffect(() => {
    adapterRef.current = adapter;
  }, [adapter]);

  useEffect(() => {
    store.setState(location.search);
  }, [location.search]);

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
