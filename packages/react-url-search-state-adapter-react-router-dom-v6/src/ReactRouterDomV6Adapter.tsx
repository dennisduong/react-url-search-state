import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { SearchStateAdapter } from "react-url-search-state";

export function useReactRouterDomV6Adapter(): SearchStateAdapter {
  const location = useLocation();
  const navigate = useNavigate();

  return useMemo(
    () => ({
      location,
      pushState: (state: any, path: any) => {
        navigate(path, {
          state: state ?? location.state,
        });
      },
      replaceState: (state: any, path: any) => {
        navigate(path, {
          replace: true,
          state: state ?? location.state,
        });
      },
    }),
    [location, navigate],
  );
}
