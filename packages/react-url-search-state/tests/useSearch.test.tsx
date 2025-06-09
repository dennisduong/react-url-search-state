import { render, screen, act } from "@testing-library/react";
import { useEffect, useState } from "react";
import { it, expect } from "vitest";

import {
  SearchStateProvider
} from '../src/context'
import {
  useSearch,
} from "../src/useSearch";
import {
  stringifySearch,
} from '../src/utils'

// Test adapter to simulate react-router behavior
function TestAdapter({
  children,
  search,
  onNavigateRef,
}: {
  children: any;
  search: string;
  onNavigateRef: (fn: (search: string) => void) => void;
}) {
  const [location, setLocation] = useState({ search });

  // Register the navigate function into the test scope
  useEffect(() => {
    onNavigateRef((nextSearch: string) => {
      setLocation({ search: nextSearch });
    });
  }, [onNavigateRef]);

  return children({
    location,
    pushState: (_state: any, search = "?") => setLocation({ search }),
    replaceState: (_state: any, search = "?") => setLocation({ search }),
  });
}

it("uses context and updates on search change", async () => {
  let triggerNavigate!: (next: string) => void;

  // Basic validator function
  const validateSearch = (input: any) => ({
    foo: Number(input.foo) || 0,
    bar: String(input.bar || "default"),
  });

  // Test component
  function TestComponent() {
    const state = useSearch({ validateSearch });

    return (
      <div>
        <div data-testid="foo">{state.foo}</div>
        <div data-testid="bar">{state.bar}</div>
      </div>
    );
  }

  render(
    <SearchStateProvider
      adapter={({ children }) => (
        <TestAdapter
          search="?foo=123&bar=hello"
          onNavigateRef={(fn) => {
            triggerNavigate = fn;
          }}
        >
          {children}
        </TestAdapter>
      )}
    >
      <TestComponent />
    </SearchStateProvider>
  );

  expect(screen.getByTestId("foo").textContent).toBe("123");
  expect(screen.getByTestId("bar").textContent).toBe("hello");

  // Simulate URL update
  act(() => {
    triggerNavigate("?foo=999&bar=world");
  });

  expect(screen.getByTestId("foo").textContent).toBe("999");
  expect(screen.getByTestId("bar").textContent).toBe("world");
});

it("does not re-render when selected slice doesn't change", () => {
  let triggerNavigate!: (search: string) => void;
  let renderCount = 0;

  const validateSearch = (input: any) => ({
    foo: Number(input.foo) || 0,
    bar: String(input.bar || "default"),
  });

  function TestComponent() {
    const foo = useSearch({ validateSearch, select: (s) => s.foo });
    renderCount++;
    return <div data-testid="foo">{foo}</div>;
  }

  render(
    <SearchStateProvider
      adapter={({ children }) => (
        <TestAdapter
          search="?foo=1&bar=hello"
          onNavigateRef={(fn) => {
            triggerNavigate = fn;
          }}
        >
          {children}
        </TestAdapter>
      )}
    >
      <TestComponent />
    </SearchStateProvider>
  );

  expect(screen.getByTestId("foo").textContent).toBe("1");
  const afterInitialRender = renderCount;

  // Trigger a change that should NOT affect the selected value
  act(() => {
    triggerNavigate("?foo=1&bar=world");
  });

  expect(screen.getByTestId("foo").textContent).toBe("1");
  expect(renderCount).toBe(afterInitialRender); // should not re-render

  // Now trigger a change that DOES affect the selected value
  act(() => {
    triggerNavigate("?foo=99&bar=world");
  });

  expect(screen.getByTestId("foo").textContent).toBe("99");
  expect(renderCount).toBe(afterInitialRender + 1); // exactly 1 re-render
});

it("parses and selects nested JSON values", () => {
  let triggerNavigate!: (search: string) => void;
  let renderCount = 0;

  const validateSearch = (input: any) => ({
    user: {
      id: Number(input.user?.id),
      prefs: {
        darkMode: Boolean(input.user?.prefs?.darkMode),
        language: String(input.user?.prefs?.language ?? "en"),
      },
    },
  });

  function TestComponent() {
    const language = useSearch({
      validateSearch,
      select: (s) => s.user.prefs.language,
    });

    renderCount++;

    return <div data-testid="lang">{language}</div>;
  }

  const initial = stringifySearch({
    user: {
      id: 1,
      prefs: {
        darkMode: true,
        language: "en",
      },
    },
  });

  render(
    <SearchStateProvider
      adapter={({ children }) => (
        <TestAdapter
          search={initial}
          onNavigateRef={(fn) => {
            triggerNavigate = fn;
          }}
        >
          {children}
        </TestAdapter>
      )}
    >
      <TestComponent />
    </SearchStateProvider>
  );

  const afterInitialRender = renderCount;
  expect(screen.getByTestId("lang").textContent).toBe("en");

  // Navigate to structurally same language value (should not re-render)
  act(() => {
    triggerNavigate(
      stringifySearch({
        user: {
          id: 1,
          prefs: {
            darkMode: false,
            language: "en",
          },
        },
      })
    );
  });

  expect(screen.getByTestId("lang").textContent).toBe("en");
  expect(renderCount).toBe(afterInitialRender); // no re-render

  // Navigate to a different language (should re-render)
  act(() => {
    triggerNavigate(
      stringifySearch({
        user: {
          id: 1,
          prefs: {
            darkMode: false,
            language: "es",
          },
        },
      })
    );
  });

  expect(screen.getByTestId("lang").textContent).toBe("es");
  expect(renderCount).toBe(afterInitialRender + 1); // one re-render
});