import { defineValidateSearch } from "react-url-search-state";

export const validateSearch = defineValidateSearch((search) => {
  // raw values
  const rawDarkMode = search.darkMode;
  const rawQuery = search.query;

  // validated values
  const darkMode = typeof rawDarkMode === "boolean" ? rawDarkMode : false;
  const query = typeof rawQuery === "string" ? rawQuery : "";

  return {
    darkMode,
    query,
  };
});
