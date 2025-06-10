import React from "react";
import ReactDOM from "react-dom/client";
import { SearchStateProvider } from "react-url-search-state";
import { WouterV3Adapter } from "react-url-search-state-adapter-wouter-v3";
import { Route } from "wouter";

import App from "./App";
import "./main.css";

function Root() {
  return (
    <Route>
      <App />
    </Route>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SearchStateProvider adapter={WouterV3Adapter}>
      <Root />
    </SearchStateProvider>
  </React.StrictMode>,
);
