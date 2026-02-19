import { render } from "@testing-library/react";

import { defineValidateSearch, createSearchHooks, SearchStateProvider } from "../src";
import type { Path, SearchStateAdapter, SearchStateAdapterComponent } from '../src';

// ─────────────────────────────
// ✅ Schema + Hooks
// ─────────────────────────────

export const validateSearch = defineValidateSearch((search) => {
  const page = Number(search.page);
  const tab = search.tab === "preview" || search.tab === "details" ? search.tab : "details";

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    tab,
  };
});

export const {
  useCreateUrlSearchParams,
  useNavigate,
  useSearch,
  useSearchParamState,
  useSetSearch,
} = createSearchHooks(validateSearch);

// ─────────────────────────────
// 🧪 Shared Adapter + Provider
// ─────────────────────────────

export function createTestAdapter(
  initial: string = "?tab=preview&page=2",
  pathname: string = "/test",
  hash: string = ""
): SearchStateAdapter {
  let location = {
    pathname,
    search: initial,
    hash,
  };

  return {
    get location() {
      return location;
    },
    pushState: (_state: any, path: Path) => {
      location = {
        ...location,
        ...path,
        search: path.search ?? location.search,
      };
    },
    replaceState: (_state: any, path: Path) => {
      location = {
        ...location,
        ...path,
        search: path.search ?? location.search,
      };
    },
  };
}

export function renderWithSearchProvider(
  ui: React.ReactNode,
  adapter: SearchStateAdapter = createTestAdapter()
) {
  const TestAdapter: SearchStateAdapterComponent = ({ children }) => children(adapter)

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <SearchStateProvider adapter={TestAdapter}>{children}</SearchStateProvider>
  );

  return render(ui, { wrapper: Wrapper });
}
