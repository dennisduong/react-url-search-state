import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { SearchStateProvider } from "react-url-search-state";
import { ReactRouterDomV6Adapter } from "react-url-search-state-adapter-react-router-dom-v6";

import App from "./App";
import "./main.css";

function Root() {
  return (
    <SearchStateProvider adapter={ReactRouterDomV6Adapter}>
      <Outlet />
    </SearchStateProvider>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [{ index: true, element: <App /> }],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
