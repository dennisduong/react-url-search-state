# react-url-search-state-adapter-wouter-v3

> [wouter](https://github.com/molefrog/wouter) v3 adapter for [react-url-search-state](https://github.com/dennisduong/react-url-search-state).

## Install

```bash
npm install react-url-search-state@alpha react-url-search-state-adapter-wouter-v3@alpha
```

**Peer dependency:** `wouter@^3.7.1`

## Setup

Wrap your app with `SearchStateProvider`:

```tsx
import { SearchStateProvider } from "react-url-search-state";
import { WouterV3Adapter } from "react-url-search-state-adapter-wouter-v3";

function App() {
  return (
    <SearchStateProvider adapter={WouterV3Adapter}>
      <Home />
    </SearchStateProvider>
  );
}
```

## Usage

See the [main documentation](https://github.com/dennisduong/react-url-search-state#readme) for the full API reference.

## License

MIT
