# react-url-search-state-adapter-react-router-dom-v7

> [react-router](https://github.com/remix-run/react-router) v7 adapter for [react-url-search-state](https://github.com/dennisduong/react-url-search-state).

## Install

```bash
npm install react-url-search-state@alpha react-url-search-state-adapter-react-router-dom-v7@alpha
```

**Peer dependency:** `react-router-dom@^7.6.2`

## Setup

Wrap your app with `SearchStateProvider` inside a route tree:

```tsx
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { SearchStateProvider } from "react-url-search-state";
import { ReactRouterDomV7Adapter } from "react-url-search-state-adapter-react-router-dom-v7";

function Root() {
  return (
    <SearchStateProvider adapter={ReactRouterDomV7Adapter}>
      <Outlet />
    </SearchStateProvider>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [{ index: true, element: <Home /> }],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);
```

## Usage

See the [main documentation](https://github.com/dennisduong/react-url-search-state#readme) for the full API reference.

## License

MIT
