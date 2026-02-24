import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defineValidateSearch, createSearchUtils } from "../src";
import { createTestAdapter, renderWithSearchProvider } from "./testHelpers";

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

// ─── Factory-level onBeforeNavigate ───────────────────────────────────────────

describe("createSearchUtils — factory-level onBeforeNavigate", () => {
  it("fires when navigate() is called via a factory-bound useNavigate", () => {
    const factorySpy = vi.fn();
    const { useNavigate } = createSearchUtils(validateSearch, {
      onBeforeNavigate: factorySpy,
    });

    const adapter = createTestAdapter("?page=1&tab=all");
    const NavigatorComponent = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({ search: { page: 2 } });
      }, []);
      return null;
    };

    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();

    expect(factorySpy).toHaveBeenCalledTimes(1);
    expect(factorySpy).toHaveBeenCalledWith(
      { page: 2, tab: "all" },
      { search: "?page=2&tab=all" },
    );
  });

  it("fires with correct nextSearch and nextPath including pathname and hash overrides", () => {
    const factorySpy = vi.fn();
    const { useNavigate } = createSearchUtils(validateSearch, {
      onBeforeNavigate: factorySpy,
    });

    const adapter = createTestAdapter("?page=1&tab=all", "/original", "#top");
    const NavigatorComponent = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({ search: { page: 3 }, pathname: "/new", hash: "#section" });
      }, []);
      return null;
    };

    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();

    expect(factorySpy).toHaveBeenCalledWith(
      { page: 3, tab: "all" },
      { search: "?page=3&tab=all", pathname: "/new", hash: "#section" },
    );
  });

  it("does not fire when navigation produces no change", () => {
    const factorySpy = vi.fn();
    const { useNavigate } = createSearchUtils(validateSearch, {
      onBeforeNavigate: factorySpy,
    });

    const adapter = createTestAdapter("?page=1&tab=all");
    const NavigatorComponent = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({ search: { page: 1 } }); // same as initial state
      }, []);
      return null;
    };

    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();

    expect(factorySpy).not.toHaveBeenCalled();
  });

  it("fires via useSetSearch when factory onBeforeNavigate is set", () => {
    const factorySpy = vi.fn();
    const { useSetSearch } = createSearchUtils(validateSearch, {
      onBeforeNavigate: factorySpy,
    });

    const adapter = createTestAdapter("?page=1&tab=all");
    const SetSearchComponent = () => {
      const setSearch = useSetSearch();
      useEffect(() => {
        setSearch({ page: 5 });
      }, []);
      return null;
    };

    renderWithSearchProvider(<SetSearchComponent />, adapter);
    vi.runAllTimers();

    expect(factorySpy).toHaveBeenCalledTimes(1);
    expect(factorySpy).toHaveBeenCalledWith(
      { page: 5, tab: "all" },
      { search: "?page=5&tab=all" },
    );
  });

  it("fires via useSearchParamState when factory onBeforeNavigate is set", () => {
    const factorySpy = vi.fn();
    const { useSearchParamState } = createSearchUtils(validateSearch, {
      onBeforeNavigate: factorySpy,
    });

    const adapter = createTestAdapter("?page=1&tab=all");
    const ParamStateComponent = () => {
      const [, setPage] = useSearchParamState("page");
      useEffect(() => {
        setPage(7);
      }, []);
      return null;
    };

    renderWithSearchProvider(<ParamStateComponent />, adapter);
    vi.runAllTimers();

    expect(factorySpy).toHaveBeenCalledTimes(1);
    expect(factorySpy).toHaveBeenCalledWith(
      { page: 7, tab: "all" },
      { search: "?page=7&tab=all" },
    );
  });
});

// ─── Composition order: factory callback runs first, call-site second ─────────

describe("createSearchUtils — onBeforeNavigate composition order", () => {
  it("factory callback runs before call-site callback", () => {
    const callOrder: string[] = [];
    const factorySpy = vi.fn(() => callOrder.push("factory"));
    const callSiteSpy = vi.fn(() => callOrder.push("call-site"));

    const { useNavigate } = createSearchUtils(validateSearch, {
      onBeforeNavigate: factorySpy,
    });

    const adapter = createTestAdapter("?page=1&tab=all");
    const NavigatorComponent = () => {
      const navigate = useNavigate({ onBeforeNavigate: callSiteSpy });
      useEffect(() => {
        navigate({ search: { page: 2 } });
      }, []);
      return null;
    };

    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();

    expect(callOrder).toEqual(["factory", "call-site"]);
    expect(factorySpy).toHaveBeenCalledTimes(1);
    expect(callSiteSpy).toHaveBeenCalledTimes(1);
  });

  it("both callbacks receive the same nextSearch and nextPath", () => {
    const factorySpy = vi.fn();
    const callSiteSpy = vi.fn();

    const { useNavigate } = createSearchUtils(validateSearch, {
      onBeforeNavigate: factorySpy,
    });

    const adapter = createTestAdapter("?page=1&tab=all");
    const NavigatorComponent = () => {
      const navigate = useNavigate({ onBeforeNavigate: callSiteSpy });
      useEffect(() => {
        navigate({ search: { page: 4 } });
      }, []);
      return null;
    };

    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();

    expect(factorySpy).toHaveBeenCalledWith(
      { page: 4, tab: "all" },
      { search: "?page=4&tab=all" },
    );
    expect(callSiteSpy).toHaveBeenCalledWith(
      { page: 4, tab: "all" },
      { search: "?page=4&tab=all" },
    );
  });

  it("only call-site callback fires when no factory onBeforeNavigate is set", () => {
    const callSiteSpy = vi.fn();
    const { useNavigate } = createSearchUtils(validateSearch); // no factory cb

    const adapter = createTestAdapter("?page=1&tab=all");
    const NavigatorComponent = () => {
      const navigate = useNavigate({ onBeforeNavigate: callSiteSpy });
      useEffect(() => {
        navigate({ search: { page: 2 } });
      }, []);
      return null;
    };

    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();

    expect(callSiteSpy).toHaveBeenCalledTimes(1);
  });

  it("only factory callback fires when no call-site onBeforeNavigate is set", () => {
    const factorySpy = vi.fn();
    const { useNavigate } = createSearchUtils(validateSearch, {
      onBeforeNavigate: factorySpy,
    });

    const adapter = createTestAdapter("?page=1&tab=all");
    const NavigatorComponent = () => {
      const navigate = useNavigate(); // no call-site cb
      useEffect(() => {
        navigate({ search: { page: 2 } });
      }, []);
      return null;
    };

    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();

    expect(factorySpy).toHaveBeenCalledTimes(1);
  });
});
