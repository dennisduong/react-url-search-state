import { useHistory, useLocation } from "react-router-dom";

import type { SearchStateAdapterComponent } from "react-url-search-state";

export const ReactRouterDomV5Adapter: SearchStateAdapterComponent = (props) => {
  const { children } = props;

  // DEV NOTE: We use `useLocation()` so we can re-renders when location changes,
  // but we prefer to read location directly from history to fix
  // https://github.com/pbeshai/use-query-params/issues/233
  const location = useLocation();

  const history = useHistory();

  return children({
    get location() {
      return history.location;
    },
    pushState: (state, path) => {
      history.push(path, state ?? location.state);
    },
    replaceState: (state, path) => {
      history.replace(path, state ?? location.state);
    },
  });
};
