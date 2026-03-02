import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Outlet } from "react-router";
import { RouterProvider } from "react-router/dom";
import { SearchStateProvider } from "react-url-search-state";
import { useReactRouterDomV7Adapter } from "react-url-search-state-adapter-react-router-dom-v7";

import App from "./App";
import "./main.css";

function Root() {
  return (
    <SearchStateProvider adapter={useReactRouterDomV7Adapter}>
      <Outlet />
    </SearchStateProvider>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [{ index: true, Component: App }],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
