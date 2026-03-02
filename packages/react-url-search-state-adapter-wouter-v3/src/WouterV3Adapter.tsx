import { useCallback, useMemo } from "react";
import type { SearchStateAdapter } from "react-url-search-state";
import { navigate, useLocationProperty } from "wouter/use-browser-location";

import { toPath } from "./utils";

export function useWouterV3Adapter(): SearchStateAdapter {
  const currentPath = useLocationProperty(
    useCallback(
      () =>
        [
          window.location.pathname,
          window.location.search,
          window.location.hash,
        ].join(""),
      [],
    ),
  );

  const location = useMemo(() => {
    const url = new URL(currentPath, window.location.origin);
    return {
      hash: url.hash,
      pathname: url.pathname,
      search: url.search,
    };
  }, [currentPath]);

  return useMemo(
    () => ({
      location,
      pushState: (state: any, next: any) => {
        navigate(toPath(next), {
          state,
        });
      },
      replaceState: (state: any, next: any) => {
        navigate(toPath(next), {
          replace: true,
          state: state,
        });
      },
    }),
    [location],
  );
}
