import { screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import { createTestAdapter, renderWithSearchProvider, useSearch } from "./testHelpers";

// Simple test component to surface validated state
function DisplaySearch() {
  const search = useSearch();
  return <div data-testid="output">Page: {search.page}</div>;
}

describe("useSearch", () => {
  it("returns validated search state and ignores unknown keys", () => {
    const adapter = createTestAdapter("?unknown=hello");
    renderWithSearchProvider(<DisplaySearch />, adapter);
    expect(screen.getByTestId("output").textContent).toBe("Page: 1");
  });

  it("parses valid params correctly", () => {
    const adapter = createTestAdapter("?page=5");
    renderWithSearchProvider(<DisplaySearch />, adapter);
    expect(screen.getByTestId("output").textContent).toBe("Page: 5");
  });

  it("falls back to default for invalid page", () => {
    const adapter = createTestAdapter("?page=banana");
    renderWithSearchProvider(<DisplaySearch />, adapter);
    expect(screen.getByTestId("output").textContent).toBe("Page: 1");
  });

  it("falls back to defaults when values are missing", () => {
    const adapter = createTestAdapter("?tab=unknown");
    renderWithSearchProvider(<DisplaySearch />, adapter);
    expect(screen.getByTestId("output").textContent).toBe("Page: 1");
  });

  // Ensures referential stability if nothing in the URL search string changes
  it("returns stable reference if search state doesn't change even if re-rendered", () => {
    const capturedStates: unknown[] = [];

    const Capture = () => {
      const search = useSearch();
      useEffect(() => {
        capturedStates.push(search);
      });
      return null;
    };

    const adapter = createTestAdapter("?page=2&tab=preview");
    const { rerender } = renderWithSearchProvider(<Capture />, adapter);
    rerender(<Capture />);

    expect(capturedStates).toHaveLength(2);
    expect(capturedStates[0]).toBe(capturedStates[1]);
  });

  it("throws when used outside of SearchStateProvider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => useSearch()).toThrow();
    errorSpy.mockRestore();
  });

  it("handles malformed query values gracefully", () => {
    const adapter = createTestAdapter("?page=notanumber");
    renderWithSearchProvider(<DisplaySearch />, adapter);
    expect(screen.getByTestId("output").textContent).toContain("Page: 1");
  });

  // Selectors are re-evaluated if the selector identity changes
  it("recomputes selected value if selector function changes", () => {
    const spy = vi.fn();

    const SelectorComponent = ({ select }: { select: (s: any) => unknown }) => {
      const selected = useSearch({ select });
      useEffect(() => {
        spy(selected);
      }, [selected]);
      return null;
    };

    const adapter = createTestAdapter("?page=2&tab=preview");

    const { rerender } = renderWithSearchProvider(
      <SelectorComponent select={(s) => s.page} />,
      adapter
    );

    // Same value, different transformation => triggers recompute
    rerender(<SelectorComponent select={(s) => `${s.page}`} />);

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, 2);
    expect(spy).toHaveBeenNthCalledWith(2, "2");
  });

  // Reacts to actual changes in validated state
  it("recomputes selected value if underlying validated state changes", () => {
    const spy = vi.fn();

    const SelectorComponent = ({ select }: { select: (s: { page: number; tab: string }) => unknown }) => {
      const selected = useSearch({ select });
      useEffect(() => {
        spy(selected);
      }, [selected]);
      return null;
    };

    const adapter = createTestAdapter("?page=1&tab=preview");
    const { rerender } = renderWithSearchProvider(
      <SelectorComponent select={(s) => s.page} />,
      adapter
    );

    adapter.replaceState(null, { search: "?page=2&tab=preview" });
    rerender(<SelectorComponent select={(s) => s.page} />);

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, 1);
    expect(spy).toHaveBeenNthCalledWith(2, 2);
  });

  // Structural equality check prevents re-renders
  it("does not recompute selected value if selected value is shallowly equal", () => {
    const spy = vi.fn();

    const SelectorComponent = ({ select }: { select: (s: { page: number; tab: string }) => unknown }) => {
      const selected = useSearch({ select });
      useEffect(() => {
        spy(selected);
      }, [selected]);
      return null;
    };

    const adapter = createTestAdapter("?page=1&tab=preview");
    const { rerender } = renderWithSearchProvider(
      <SelectorComponent select={(s) => ({ onlyPage: s.page })} />,
      adapter
    );

    adapter.replaceState(null, { search: "?tab=preview&page=1" });
    rerender(<SelectorComponent select={(s) => ({ onlyPage: s.page })} />);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ onlyPage: 1 });
  });

  // replaceEqualDeep ensures referential stability across re-renders with deeply equal values
  it("maintains reference equality if selected value is deeply equal", () => {
    const spy = vi.fn();

    const SelectorComponent = ({ select }: { select: (s: { page: number; tab: string }) => unknown }) => {
      const selected = useSearch({ select });
      useEffect(() => {
        spy(selected);
      }, [selected]);
      return null;
    };

    const adapter = createTestAdapter("?page=1&tab=preview");
    const { rerender } = renderWithSearchProvider(
      <SelectorComponent select={(s) => ({ shallowCopy: { ...s } })} />,
      adapter
    );

    rerender(<SelectorComponent select={(s) => ({ shallowCopy: { ...s } })} />);

    expect(spy).toHaveBeenCalledTimes(1); // no change emitted thanks to replaceEqualDeep
  });

  it("supports selectors that return undefined", () => {
    const spy = vi.fn();
  
    const SelectorComponent = ({ select }: { select: (s: { page: number; tab: string }) => unknown }) => {
      const selected = useSearch({ select });
      useEffect(() => {
        spy(selected);
      }, [selected]);
      return null;
    };
  
    const adapter = createTestAdapter("?page=1&tab=preview");
    const { rerender } = renderWithSearchProvider(
      <SelectorComponent select={() => undefined} />,
      adapter
    );
  
    // Simulate re-render with same selector that returns undefined again
    rerender(<SelectorComponent select={() => undefined} />);
  
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(undefined);
  });

  it("uses default values when search string is empty", () => {
    const adapter = createTestAdapter(""); // No search params
    renderWithSearchProvider(<DisplaySearch />, adapter);
    expect(screen.getByTestId("output").textContent).toBe("Page: 1"); // default
  });

  it("throws if selector function throws", () => {
    const adapter = createTestAdapter("?page=1&tab=preview");
  
    const SelectorComponent = () => {
      // This selector throws!
      useSearch({
        select: () => {
          throw new Error("Selector function threw an error");
        },
      });
      return null;
    };
  
    expect(() => {
      renderWithSearchProvider(<SelectorComponent />, adapter);
    }).toThrowError("Selector function threw an error");
  });
  
});
