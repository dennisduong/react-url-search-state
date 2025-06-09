export type AnySearch = Record<string, unknown>;

export type Path = Partial<Pick<Location, "hash" | "pathname" | "search">>;

export type SearchStateAdapter = {
  location: Pick<Location, "hash" | "pathname" | "search">;
  pushState: (state: any, path: Path) => void;
  replaceState: (state: any, path: Path) => void;
};

export type SearchStateAdapterComponent = React.FC<{
  children: (adapter: SearchStateAdapter) => React.ReactElement;
}>;
