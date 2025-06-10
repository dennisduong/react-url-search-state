import { useLocation, useNavigate } from "react-router";

import type { SearchStateAdapterComponent } from "react-url-search-state";

export const ReactRouterDomV7Adapter: SearchStateAdapterComponent = (props) => {
  const { children } = props;

  const location = useLocation();
  const navigate = useNavigate();

  return children({
    location,
    pushState: (state, path) => {
      navigate(path, {
        state: state ?? location.state,
      });
    },
    replaceState: (state, path) => {
      navigate(path, {
        replace: true,
        state: state ?? location.state,
      });
    },
  });
};
