import { useMemo } from "react";
import { useHistory, useLocation } from "react-router-dom";

import type { SearchStateAdapter } from "react-url-search-state";

export function useReactRouterDomV5Adapter(): SearchStateAdapter {
  // DEV NOTE: We use `useLocation()` so we can re-renders when location changes,
  // but we prefer to read location directly from history to fix
  // https://github.com/pbeshai/use-query-params/issues/233
  const location = useLocation();

  const history = useHistory();

  return useMemo(
    () => ({
      get location() {
        return history.location;
      },
      pushState: (state: any, path: any) => {
        history.push(path, state ?? location.state);
      },
      replaceState: (state: any, path: any) => {
        history.replace(path, state ?? location.state);
      },
    }),
    [location, history],
  );
}
