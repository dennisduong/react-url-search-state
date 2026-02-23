import { screen } from "@testing-library/react";
import { useEffect } from "react";
import {afterEach,beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTestAdapter,
  renderWithSearchProvider,
  useSearch,
  useSetSearch,
} from "./testHelpers";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSetSearch", () => {
  it("sets a new search param value", () => {
    const adapter = createTestAdapter("?page=1&tab=preview");
    const pushSpy = vi.spyOn(adapter, "pushState");

    const SetSearchComponent = () => {
      const setSearch = useSetSearch();
      useEffect(() => {
        setSearch({ page: 10 });
      }, []);
      return <div data-testid="output">ready</div>;
    };

    renderWithSearchProvider(<SetSearchComponent />, adapter);

    vi.runAllTimers(); // flush requestAnimationFrame batching

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(adapter.location.search).toContain("page=10");
  });

  it("merges new values with existing search params", () => {
    const adapter = createTestAdapter("?page=2&tab=preview");
    const pushSpy = vi.spyOn(adapter, "pushState");
  
    const SetSearchComponent = () => {
      const setSearch = useSetSearch();
      useEffect(() => {
        setSearch({ tab: "details" }); // should merge into existing page=2
      }, []);
      return <div data-testid="output">ready</div>;
    };
  
    renderWithSearchProvider(<SetSearchComponent />, adapter);
    vi.runAllTimers();
  
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(adapter.location.search).toContain("page=2");
    expect(adapter.location.search).toContain("tab=details");
  });
  
  it("supports functional updates based on current validated state", () => {
    const adapter = createTestAdapter("?page=3&tab=preview");
    const pushSpy = vi.spyOn(adapter, "pushState");
  
    const SetSearchComponent = () => {
      const setSearch = useSetSearch();
      useEffect(() => {
        setSearch((prev) => ({ page: prev.page + 1 }));
      }, []);
      return <div data-testid="output">ready</div>;
    };
  
    renderWithSearchProvider(<SetSearchComponent />, adapter);
    vi.runAllTimers();
  
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(adapter.location.search).toContain("page=4");
    expect(adapter.location.search).toContain("tab=preview");
  });

  it("replaces state instead of merging when merge: false is passed", () => {
    const adapter = createTestAdapter("?page=3&tab=preview");
    const pushSpy = vi.spyOn(adapter, "pushState");
  
    const SetSearchComponent = () => {
      const setSearch = useSetSearch();
      useEffect(() => {
        // @ts-expect-error
        setSearch({ page: 1 }, { merge: false });
      }, []);
      return <div data-testid="output">ready</div>;
    };
  
    renderWithSearchProvider(<SetSearchComponent />, adapter);
    vi.runAllTimers();
  
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(adapter.location.search).toContain("page=1");
    expect(adapter.location.search).not.toContain("tab=preview");
  });

  it("coerces invalid value to default via validation", () => {
    const adapter = createTestAdapter("?page=3&tab=preview");
    const pushSpy = vi.spyOn(adapter, "pushState");
  
    const SetSearchComponent = () => {
      const setSearch = useSetSearch();
      const page = useSearch({ select: search => search.page });
      useEffect(() => {
        // Attempt to set a non-numeric value for `page`
        setSearch({ page: "banana" as any });
      }, []);
      return <div data-testid="output">{String(page)}</div>;
    };
  
    const { rerender } = renderWithSearchProvider(<SetSearchComponent />, adapter);
    vi.runAllTimers();
    rerender(<SetSearchComponent />);
  
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("output").textContent).toBe("1"); // 1 is default
    expect(adapter.location.search).toContain("page=1"); // invalid "banana" coerced to 1
  });

  it("clears all other keys when merge is false", () => {
    const adapter = createTestAdapter("?page=3&tab=preview");
    const pushSpy = vi.spyOn(adapter, "pushState");
  
    const SetSearchComponent = () => {
      const setSearch = useSetSearch();
      useEffect(() => {
        // @ts-expect-error
        setSearch({ page: 9 }, { merge: false });
      }, []);
      return <div data-testid="output">ready</div>;
    };
  
    renderWithSearchProvider(<SetSearchComponent />, adapter);
    vi.runAllTimers();
  
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(adapter.location.search).toBe("?page=9"); // tab should be removed
  });
  
});
