import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { SearchStateProvider } from "react-url-search-state";
import { ReactRouterDomV5Adapter } from "react-url-search-state-adapter-react-router-dom-v5";

import App from "./App";
import "./main.css";

function Root() {
  return (
    <SearchStateProvider adapter={ReactRouterDomV5Adapter}>
      <Switch>
        <Route path="/">
          <App />
        </Route>
      </Switch>
    </SearchStateProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <Root />
    </Router>
  </React.StrictMode>,
);
