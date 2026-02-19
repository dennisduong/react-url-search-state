# react-url-search-state-adapter-react-router-dom-v5

> [react-router-dom](https://github.com/remix-run/react-router) v5 adapter for [react-url-search-state](https://github.com/dennisduong/react-url-search-state).

## Install

```bash
npm install react-url-search-state@alpha react-url-search-state-adapter-react-router-dom-v5@alpha
```

**Peer dependency:** `react-router-dom@^5.3.4`

## Setup

Wrap your app with `SearchStateProvider` inside a `<Router>`:

```tsx
import { BrowserRouter, Route, Switch } from "react-router-dom";
import { SearchStateProvider } from "react-url-search-state";
import { ReactRouterDomV5Adapter } from "react-url-search-state-adapter-react-router-dom-v5";

function App() {
  return (
    <BrowserRouter>
      <SearchStateProvider adapter={ReactRouterDomV5Adapter}>
        <Switch>
          <Route path="/" component={Home} />
        </Switch>
      </SearchStateProvider>
    </BrowserRouter>
  );
}
```

## Usage

See the [main documentation](https://github.com/dennisduong/react-url-search-state#readme) for the full API reference.

## License

MIT
