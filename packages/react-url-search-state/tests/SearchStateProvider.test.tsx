import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defineValidateSearch, createSearchUtils, SearchStateProvider } from "../src";
import type { SearchStateAdapterComponent } from "../src";
import { createTestAdapter } from "./testHelpers";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const validateSearch = defineValidateSearch((search) => ({
  page: Number(search.page) || 1,
  tab: (search.tab as string) ?? "all",
}));

const { useSearch, useNavigate } = createSearchUtils(validateSearch);

function makeAdapter(
  adapter: ReturnType<typeof createTestAdapter>,
): SearchStateAdapterComponent {
  return ({ children }) => children(adapter);
}

// ─── Sibling providers ────────────────────────────────────────────────────────

describe("SearchStateProvider — sibling isolation", () => {
  it("each sibling provider maintains independent state", () => {
    const adapterA = createTestAdapter("?page=1&tab=all");
    const adapterB = createTestAdapter("?page=5&tab=all");

    const DisplayA = () => {
      const search = useSearch();
      return <div data-testid="a">{search.page}</div>;
    };

    const DisplayB = () => {
      const search = useSearch();
      return <div data-testid="b">{search.page}</div>;
    };

    render(
      <>
        <SearchStateProvider adapter={makeAdapter(adapterA)}>
          <DisplayA />
        </SearchStateProvider>
        <SearchStateProvider adapter={makeAdapter(adapterB)}>
          <DisplayB />
        </SearchStateProvider>
      </>,
    );

    expect(screen.getByTestId("a").textContent).toBe("1");
    expect(screen.getByTestId("b").textContent).toBe("5");
  });

  it("navigate() in one sibling calls only that provider's adapter", () => {
    const adapterA = createTestAdapter("?page=1&tab=all");
    const adapterB = createTestAdapter("?page=5&tab=all");
    const spyA = vi.spyOn(adapterA, "pushState");
    const spyB = vi.spyOn(adapterB, "pushState");

    const NavigatorA = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({ search: { page: 2 } });
      }, []);
      return null;
    };

    render(
      <>
        <SearchStateProvider adapter={makeAdapter(adapterA)}>
          <NavigatorA />
        </SearchStateProvider>
        <SearchStateProvider adapter={makeAdapter(adapterB)} />
      </>,
    );

    vi.runAllTimers();

    expect(spyA).toHaveBeenCalledTimes(1);
    expect(spyB).not.toHaveBeenCalled();
  });

  it("each sibling navigates independently — correct adapter called per provider", () => {
    const adapterA = createTestAdapter("?page=1&tab=all");
    const adapterB = createTestAdapter("?page=5&tab=all");
    const spyA = vi.spyOn(adapterA, "pushState");
    const spyB = vi.spyOn(adapterB, "pushState");

    const NavigatorA = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({ search: { page: 2 } });
      }, []);
      return null;
    };

    const NavigatorB = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({ search: { page: 9 } });
      }, []);
      return null;
    };

    render(
      <>
        <SearchStateProvider adapter={makeAdapter(adapterA)}>
          <NavigatorA />
        </SearchStateProvider>
        <SearchStateProvider adapter={makeAdapter(adapterB)}>
          <NavigatorB />
        </SearchStateProvider>
      </>,
    );

    vi.runAllTimers();

    expect(spyA).toHaveBeenCalledTimes(1);
    expect(spyA.mock.calls[0]?.[1]).toMatchObject({ search: "?page=2&tab=all" });
    expect(spyB).toHaveBeenCalledTimes(1);
    expect(spyB.mock.calls[0]?.[1]).toMatchObject({ search: "?page=9&tab=all" });
  });
});

// ─── Nested providers ─────────────────────────────────────────────────────────

describe("SearchStateProvider — nested isolation", () => {
  it("inner provider shadows outer provider for inner hooks", () => {
    const outerAdapter = createTestAdapter("?page=1&tab=all");
    const innerAdapter = createTestAdapter("?page=99&tab=all");

    const DisplayOuter = () => {
      const search = useSearch();
      return <div data-testid="outer">{search.page}</div>;
    };

    const DisplayInner = () => {
      const search = useSearch();
      return <div data-testid="inner">{search.page}</div>;
    };

    render(
      <SearchStateProvider adapter={makeAdapter(outerAdapter)}>
        <DisplayOuter />
        <SearchStateProvider adapter={makeAdapter(innerAdapter)}>
          <DisplayInner />
        </SearchStateProvider>
      </SearchStateProvider>,
    );

    expect(screen.getByTestId("outer").textContent).toBe("1");
    expect(screen.getByTestId("inner").textContent).toBe("99");
  });

  it("navigate() inside inner provider calls inner adapter only", () => {
    const outerAdapter = createTestAdapter("?page=1&tab=all");
    const innerAdapter = createTestAdapter("?page=99&tab=all");
    const spyOuter = vi.spyOn(outerAdapter, "pushState");
    const spyInner = vi.spyOn(innerAdapter, "pushState");

    const NavigatorInner = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({ search: { page: 7 } });
      }, []);
      return null;
    };

    render(
      <SearchStateProvider adapter={makeAdapter(outerAdapter)}>
        <SearchStateProvider adapter={makeAdapter(innerAdapter)}>
          <NavigatorInner />
        </SearchStateProvider>
      </SearchStateProvider>,
    );

    vi.runAllTimers();

    expect(spyInner).toHaveBeenCalledTimes(1);
    expect(spyOuter).not.toHaveBeenCalled();
  });

  it("navigate() in outer provider does not reach inner provider", () => {
    const outerAdapter = createTestAdapter("?page=1&tab=all");
    const innerAdapter = createTestAdapter("?page=99&tab=all");
    const spyOuter = vi.spyOn(outerAdapter, "pushState");
    const spyInner = vi.spyOn(innerAdapter, "pushState");

    const NavigatorOuter = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({ search: { page: 3 } });
      }, []);
      return null;
    };

    render(
      <SearchStateProvider adapter={makeAdapter(outerAdapter)}>
        <NavigatorOuter />
        <SearchStateProvider adapter={makeAdapter(innerAdapter)} />
      </SearchStateProvider>,
    );

    vi.runAllTimers();

    expect(spyOuter).toHaveBeenCalledTimes(1);
    expect(spyInner).not.toHaveBeenCalled();
  });

  it("unmounting inner provider does not affect outer provider's hooks", () => {
    const outerAdapter = createTestAdapter("?page=1&tab=all");
    const innerAdapter = createTestAdapter("?page=99&tab=all");

    const DisplayOuter = () => {
      const search = useSearch();
      return <div data-testid="outer">{search.page}</div>;
    };

    const DisplayInner = () => {
      const search = useSearch();
      return <div data-testid="inner">{search.page}</div>;
    };

    const { rerender } = render(
      <SearchStateProvider adapter={makeAdapter(outerAdapter)}>
        <DisplayOuter />
        <SearchStateProvider adapter={makeAdapter(innerAdapter)}>
          <DisplayInner />
        </SearchStateProvider>
      </SearchStateProvider>,
    );

    expect(screen.getByTestId("outer").textContent).toBe("1");
    expect(screen.getByTestId("inner").textContent).toBe("99");

    // Unmount the inner provider — outer should be unaffected
    rerender(
      <SearchStateProvider adapter={makeAdapter(outerAdapter)}>
        <DisplayOuter />
      </SearchStateProvider>,
    );

    expect(screen.getByTestId("outer").textContent).toBe("1");
    expect(screen.queryByTestId("inner")).toBeNull();
  });
});
