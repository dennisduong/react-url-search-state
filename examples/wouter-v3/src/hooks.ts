import { createSearchHooks } from "react-url-search-state";

import { validateSearch } from "./utils";

export const { useSearch, useSearchParamState, useSetSearch } =
  createSearchHooks(validateSearch);
