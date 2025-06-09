import { useLocation, useNavigate } from "react-router-dom";

import type { SearchStateAdapterComponent } from "react-url-search-state";

export const ReactRouterDomV6Adapter: SearchStateAdapterComponent = (props) => {
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
