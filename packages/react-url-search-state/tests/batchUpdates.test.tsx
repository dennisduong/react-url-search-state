import { useEffect } from "react";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SearchStateProvider,
  defineValidateSearch,
  composeValidateSearch,
  createSearchUtils,
} from "../src";
import type { SearchStateAdapter, Path } from "../src";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createTestAdapter(
  initial: string,
  pathname: string = "/",
): SearchStateAdapter {
  let location = { pathname, search: initial, hash: "" };
  return {
    get location() {
      return location;
    },
    pushState: vi.fn((_state: any, path: Path) => {
      location = { ...location, ...path, search: path.search ?? location.search };
    }),
    replaceState: vi.fn((_state: any, path: Path) => {
      location = { ...location, ...path, search: path.search ?? location.search };
    }),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

// ─── Composed validators (simulating nested routing) ─────────────────────────

const baseValidateSearch = defineValidateSearch((search) => {
  const page = Number(search.page);
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    sort: search.sort === "asc" || search.sort === "desc" ? search.sort : "desc",
  };
});

const dashboardValidateSearch = composeValidateSearch(
  baseValidateSearch,
  (_base, raw) => ({
    tab:
      raw.tab === "overview" || raw.tab === "analytics" || raw.tab === "settings"
        ? raw.tab
        : "overview",
    dateRange:
      raw.dateRange === "7d" || raw.dateRange === "30d" || raw.dateRange === "90d"
        ? raw.dateRange
        : "30d",
  }),
);

const {
  useNavigate: useDashboardNavigate,
  useSetSearch: useDashboardSetSearch,
} = createSearchUtils(dashboardValidateSearch);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Batch updates — real-world multi-component scenarios", () => {
  it("sibling components updating different params in the same frame produce a single navigation", () => {
    const adapter = createTestAdapter("?page=1&sort=desc&tab=overview&dateRange=30d");
    const spy = vi.spyOn(adapter, "pushState");

    const Pagination = () => {
      const navigate = useDashboardNavigate();
      useEffect(() => {
        navigate({ search: { page: 3 } });
      }, []);
      return null;
    };

    const TabSwitcher = () => {
      const setSearch = useDashboardSetSearch();
      useEffect(() => {
        setSearch({ tab: "analytics" });
      }, []);
      return null;
    };

    const useAdapter = () => adapter;
    render(
      <SearchStateProvider adapter={useAdapter}>
        <Pagination />
        <TabSwitcher />
      </SearchStateProvider>,
    );

    vi.runAllTimers();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      search: "?page=3&sort=desc&tab=analytics&dateRange=30d",
    });
  });

  it("three components batching functional updates that chain off each other", () => {
    const adapter = createTestAdapter("?page=1&sort=desc&tab=overview&dateRange=30d");
    const spy = vi.spyOn(adapter, "pushState");

    const PageIncrementer = () => {
      const navigate = useDashboardNavigate();
      useEffect(() => {
        navigate({ search: (prev) => ({ ...prev, page: prev.page + 1 }) });
      }, []);
      return null;
    };

    const PageDoubler = () => {
      const navigate = useDashboardNavigate();
      useEffect(() => {
        navigate({ search: (prev) => ({ ...prev, page: prev.page * 2 }) });
      }, []);
      return null;
    };

    const SortFlipper = () => {
      const navigate = useDashboardNavigate();
      useEffect(() => {
        navigate({
          search: (prev) => ({
            ...prev,
            sort: prev.sort === "desc" ? "asc" : "desc",
          }),
        });
      }, []);
      return null;
    };

    const useAdapter = () => adapter;
    render(
      <SearchStateProvider adapter={useAdapter}>
        <PageIncrementer />
        <PageDoubler />
        <SortFlipper />
      </SearchStateProvider>,
    );

    vi.runAllTimers();

    // page: 1 → +1 = 2 → *2 = 4, sort: desc → asc
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      search: "?page=4&sort=asc&tab=overview&dateRange=30d",
    });
  });

  it("merge:false from one component resets state before another component's merge:true applies", () => {
    const adapter = createTestAdapter("?page=5&sort=asc&tab=settings&dateRange=90d");
    const spy = vi.spyOn(adapter, "pushState");

    // Simulates a "reset filters" button that clears everything to defaults
    const ResetFilters = () => {
      const navigate = useDashboardNavigate();
      useEffect(() => {
        navigate(
          { search: { page: 1, sort: "desc", tab: "overview", dateRange: "30d" } },
          { merge: false },
        );
      }, []);
      return null;
    };

    // A different component simultaneously sets a specific tab (queued after reset)
    const TabSetter = () => {
      const setSearch = useDashboardSetSearch();
      useEffect(() => {
        setSearch({ tab: "analytics" });
      }, []);
      return null;
    };

    const useAdapter = () => adapter;
    render(
      <SearchStateProvider adapter={useAdapter}>
        <ResetFilters />
        <TabSetter />
      </SearchStateProvider>,
    );

    vi.runAllTimers();

    // Reset clears to defaults, then tab override applies
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      search: "?page=1&sort=desc&tab=analytics&dateRange=30d",
    });
  });

  it("mixed replace and push in same batch — last option wins", () => {
    const adapter = createTestAdapter("?page=1&sort=desc&tab=overview&dateRange=30d");
    const pushSpy = vi.spyOn(adapter, "pushState");
    const replaceSpy = vi.spyOn(adapter, "replaceState");

    const PushNavigator = () => {
      const navigate = useDashboardNavigate();
      useEffect(() => {
        navigate({ search: { page: 2 } }); // default: push
      }, []);
      return null;
    };

    const ReplaceNavigator = () => {
      const navigate = useDashboardNavigate();
      useEffect(() => {
        navigate({ search: { tab: "settings" } }, { replace: true });
      }, []);
      return null;
    };

    const useAdapter = () => adapter;
    render(
      <SearchStateProvider adapter={useAdapter}>
        <PushNavigator />
        <ReplaceNavigator />
      </SearchStateProvider>,
    );

    vi.runAllTimers();

    // Last options wins: replace: true
    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy.mock.calls[0]?.[1]).toMatchObject({
      search: "?page=2&sort=desc&tab=settings&dateRange=30d",
    });
  });

  it("batched updates with pathname changes from different components", () => {
    const adapter = createTestAdapter(
      "?page=1&sort=desc&tab=overview&dateRange=30d",
      "/dashboard",
    );
    const spy = vi.spyOn(adapter, "pushState");

    const SearchUpdater = () => {
      const navigate = useDashboardNavigate();
      useEffect(() => {
        navigate({ search: { page: 2, tab: "analytics" } });
      }, []);
      return null;
    };

    const PathChanger = () => {
      const navigate = useDashboardNavigate();
      useEffect(() => {
        navigate({
          search: { dateRange: "7d" },
          pathname: "/dashboard/detail",
          hash: "#charts",
        });
      }, []);
      return null;
    };

    const useAdapter = () => adapter;
    render(
      <SearchStateProvider adapter={useAdapter}>
        <SearchUpdater />
        <PathChanger />
      </SearchStateProvider>,
    );

    vi.runAllTimers();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      search: "?page=2&sort=desc&tab=analytics&dateRange=7d",
      pathname: "/dashboard/detail",
      hash: "#charts",
    });
  });

  it("invalid values in batched updates are coerced to defaults by final validation", () => {
    const adapter = createTestAdapter("?page=1&sort=desc&tab=overview&dateRange=30d");
    const spy = vi.spyOn(adapter, "pushState");

    const BadPageSetter = () => {
      const navigate = useDashboardNavigate();
      useEffect(() => {
        navigate({ search: { page: -5 } });
      }, []);
      return null;
    };

    // Valid tab change alongside an invalid sort — ensures navigation fires
    const MixedUpdater = () => {
      const navigate = useDashboardNavigate();
      useEffect(() => {
        navigate({ search: { sort: "invalid" as any, tab: "analytics" } });
      }, []);
      return null;
    };

    const useAdapter = () => adapter;
    render(
      <SearchStateProvider adapter={useAdapter}>
        <BadPageSetter />
        <MixedUpdater />
      </SearchStateProvider>,
    );

    vi.runAllTimers();

    expect(spy).toHaveBeenCalledTimes(1);
    const search = spy.mock.calls[0]?.[1]?.search as string;
    const params = new URLSearchParams(search);
    // page: -5 → coerced to 1, sort: "invalid" → coerced to "desc", tab: "analytics" → valid
    expect(params.get("page")).toBe("1");
    expect(params.get("sort")).toBe("desc");
    expect(params.get("tab")).toBe("analytics");
  });

  it("no navigation fires when batched updates produce the same state as current URL", () => {
    const adapter = createTestAdapter("?page=1&sort=desc&tab=overview&dateRange=30d");
    const spy = vi.spyOn(adapter, "pushState");

    const NoOpUpdater = () => {
      const setSearch = useDashboardSetSearch();
      useEffect(() => {
        // Setting the same values that are already in the URL
        setSearch({ page: 1, sort: "desc" });
      }, []);
      return null;
    };

    const AnotherNoOp = () => {
      const setSearch = useDashboardSetSearch();
      useEffect(() => {
        setSearch({ tab: "overview", dateRange: "30d" });
      }, []);
      return null;
    };

    const useAdapter = () => adapter;
    render(
      <SearchStateProvider adapter={useAdapter}>
        <NoOpUpdater />
        <AnotherNoOp />
      </SearchStateProvider>,
    );

    vi.runAllTimers();

    // No actual state change — adapter should not be called
    expect(spy).not.toHaveBeenCalled();
  });
});
