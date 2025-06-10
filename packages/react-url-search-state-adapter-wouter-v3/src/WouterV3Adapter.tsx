import { useCallback, useMemo } from "react";
import type { SearchStateAdapterComponent } from "react-url-search-state";
import { navigate, useLocationProperty } from "wouter/use-browser-location";

import { toPath } from "./utils";

export const WouterV3Adapter: SearchStateAdapterComponent = (props) => {
  const { children } = props;

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

  return children({
    location,
    pushState: (state, next) => {
      navigate(toPath(next), {
        state,
      });
    },
    replaceState: (state, next) => {
      navigate(toPath(next), {
        replace: true,
        state: state,
      });
    },
  });
};
