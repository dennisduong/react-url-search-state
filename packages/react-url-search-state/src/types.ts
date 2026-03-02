export type AnySearch = Record<string, unknown>;

export type Path = Partial<Pick<Location, "hash" | "pathname" | "search">>;

export type SearchStateAdapter = {
  location: Pick<Location, "hash" | "pathname" | "search">;
  pushState: (state: any, path: Path) => void;
  replaceState: (state: any, path: Path) => void;
};

export type SearchStateAdapterHook = () => SearchStateAdapter;

/** @deprecated Use `SearchStateAdapterHook` instead. Will be removed in 1.0. */
export type SearchStateAdapterComponent = React.FC<{
  children: (adapter: SearchStateAdapter) => React.ReactElement;
}>;
