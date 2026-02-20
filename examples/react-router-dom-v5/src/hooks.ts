import { createSearchUtils } from "react-url-search-state";

import { validateSearch } from "./utils";

export const { useSearch, useSearchParamState, useSetSearch } =
  createSearchUtils(validateSearch);
