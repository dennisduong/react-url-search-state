import { screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  createTestAdapter,
  renderWithSearchProvider,
  useSearchParamState,
} from "./testHelpers";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function DisplayParam({ param }: { param: "page" | "tab" }) {
  const [value] = useSearchParamState(param);
  return <div data-testid="output">{String(value)}</div>;
}

describe("useSearchParamState", () => {
  it("reads the initial value from the URL", () => {
    const initialSearch = "?page=3&tab=preview";
    const adapter = createTestAdapter(initialSearch);
    renderWithSearchProvider(<DisplayParam param="page" />, adapter);
    expect(screen.getByTestId("output").textContent).toBe("3");
  });

  it("updates value and syncs to the URL", () => {
    const adapter = createTestAdapter("?page=1&tab=preview");
  
    const UpdateParam = () => {
      const [page, setPage] = useSearchParamState("page");
      useEffect(() => {
        setPage(5);
      }, []);
      return <div data-testid="output">{String(page)}</div>;
    };
  
    const { rerender } = renderWithSearchProvider(<UpdateParam />, adapter);
  
    vi.runAllTimers();

    rerender(<UpdateParam />);
  
    expect(screen.getByTestId("output").textContent).toBe("5");
    expect(adapter.location.search).toContain("page=5");
  });
  
  it("merges with other existing search params", () => {
    const initialSearch = "?page=1&tab=preview";
    const adapter = createTestAdapter(initialSearch);
  
    const UpdateParam = () => {
      const [tab, setTab] = useSearchParamState("tab");
      useEffect(() => {
        setTab("details");
      }, []);
      return <div data-testid="output">{tab}</div>;
    };
  
    const { rerender } = renderWithSearchProvider(<UpdateParam />, adapter);
  
    // Force effect + batched update flush
    vi.runAllTimers();

    rerender(<UpdateParam />); // Required to trigger state update on adapter.location.search
  
    expect(screen.getByTestId("output").textContent).toBe("details");
    expect(adapter.location.search).toContain("page=1");
    expect(adapter.location.search).toContain("tab=details");
  });
  
  it("supports functional updates based on previous value", () => {
    const adapter = createTestAdapter("?page=2");
  
    const UpdateParam = () => {
      const [page, setPage] = useSearchParamState("page");
      useEffect(() => {
        setPage((prev) => prev + 3);
      }, []);
      return <div data-testid="output">{String(page)}</div>;
    };
  
    const { rerender } = renderWithSearchProvider(<UpdateParam />, adapter);
  
    vi.runAllTimers();
    rerender(<UpdateParam />); // sync with new location.search
  
    expect(screen.getByTestId("output").textContent).toBe("5");
    expect(adapter.location.search).toContain("page=5");
  });
  
  it("clears param when set to undefined", async () => {
    const adapter = createTestAdapter("?page=3&tab=preview");
  
    const UpdateParam = () => {
      const [tab, setTab] = useSearchParamState("tab");
      useEffect(() => {
        // @ts-expect-error
        setTab(undefined);
      }, []);
      return <div data-testid="output">{tab}</div>;
    };
  
    const { rerender } = renderWithSearchProvider(<UpdateParam />, adapter);
  
    vi.runAllTimers();
    rerender(<UpdateParam />); // reflect flushed location.search
  
    expect(screen.getByTestId("output").textContent).toBe("details"); // fallback default
    expect(adapter.location.search).not.toContain("tab=details");
  });
  
});
