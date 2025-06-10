import { useEffect } from "react";

import { useSearch, useSearchParamState, useSetSearch } from "./hooks";

function DarkThemeToggler() {
  const darkMode = useSearch({ select: (search) => search.darkMode });

  const setSearch = useSetSearch();

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light",
    );
  }, [darkMode]);

  return (
    <div style={{ marginTop: "1rem" }}>
      <label>
        <input
          type="checkbox"
          checked={darkMode}
          onChange={(e) => setSearch({ darkMode: e.target.checked })}
        />
        Enable Dark Mode
      </label>
    </div>
  );
}

function SearchInput() {
  const [query, setQuery] = useSearchParamState("query");

  return (
    <label>
      Search Query:
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginLeft: 8 }}
      />
    </label>
  );
}

function CurrentSearch() {
  const search = useSearch();

  return (
    <pre style={{ background: "#f0f0f0", padding: "1rem", marginTop: "2rem" }}>
      Current Search State: {JSON.stringify(search, null, 2)}
    </pre>
  );
}

export function App() {
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🔍 Mini Search App</h1>

      <SearchInput />

      <DarkThemeToggler />

      <CurrentSearch />
    </div>
  );
}

export default App;
