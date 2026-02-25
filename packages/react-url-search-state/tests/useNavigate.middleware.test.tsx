import { createElement, useEffect } from "react";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSearchUtils,
  SearchStateProvider,
} from "../src";
import type {
  AnySearch,
  SearchMiddleware,
  SearchStateAdapterComponent,
} from "../src";
import { createTestAdapter, renderWithSearchProvider, validateSearch } from "./testHelpers";

// Helper: create factory-bound hooks with middleware
function createHooksWithMiddleware(
  middleware?: SearchMiddleware<{ page: number; tab: string }>[],
) {
  return createSearchUtils(validateSearch, { middleware });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("useNavigate middleware", () => {
  it("transforms search params before adapter commit", () => {
    const adapter = createTestAdapter("?page=1&tab=preview");
    const spy = vi.spyOn(adapter, "pushState");

    const middleware: SearchMiddleware<{ page: number; tab: string }> = (ctx) => {
      const result = ctx.next();
      if (!result) return null;
      return { ...result, search: { ...result.search, page: 42 } };
    };

    const { useNavigate } = createHooksWithMiddleware([middleware]);

    const Component = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({ search: { page: 2 } });
      }, []);
      return null;
    };

    renderWithSearchProvider(<Component />, adapter);
    vi.runAllTimers();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      search: "?page=42&tab=preview",
    });
  });

  it("cancels navigation when middleware returns null", () => {
    const adapter = createTestAdapter("?page=1&tab=preview");
    const pushSpy = vi.spyOn(adapter, "pushState");
    const replaceSpy = vi.spyOn(adapter, "replaceState");

    const canceller: SearchMiddleware<{ page: number; tab: string }> = () => null;

    const { useNavigate } = createHooksWithMiddleware([canceller]);

    const Component = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({ search: { page: 2 } });
      }, []);
      return null;
    };

    renderWithSearchProvider(<Component />, adapter);
    vi.runAllTimers();

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it("onBeforeNavigate fires with middleware-transformed values", () => {
    const adapter = createTestAdapter("?page=1&tab=preview");
    const beforeSpy = vi.fn();

    const middleware: SearchMiddleware<{ page: number; tab: string }> = (ctx) => {
      const result = ctx.next();
      if (!result) return null;
      return { ...result, search: { ...result.search, page: 100 } };
    };

    const { useNavigate } = createHooksWithMiddleware([middleware]);

    const Component = () => {
      const navigate = useNavigate({ onBeforeNavigate: beforeSpy });
      useEffect(() => {
        navigate({ search: { page: 2 } });
      }, []);
      return null;
    };

    renderWithSearchProvider(<Component />, adapter);
    vi.runAllTimers();

    expect(beforeSpy).toHaveBeenCalledTimes(1);
    expect(beforeSpy).toHaveBeenCalledWith(
      { page: 100, tab: "preview" },
      { search: "?page=100&tab=preview" },
    );
  });

  it("onBeforeNavigate does NOT fire when middleware cancels", () => {
    const adapter = createTestAdapter("?page=1&tab=preview");
    const beforeSpy = vi.fn();

    const canceller: SearchMiddleware<{ page: number; tab: string }> = () => null;

    const { useNavigate } = createHooksWithMiddleware([canceller]);

    const Component = () => {
      const navigate = useNavigate({ onBeforeNavigate: beforeSpy });
      useEffect(() => {
        navigate({ search: { page: 2 } });
      }, []);
      return null;
    };

    renderWithSearchProvider(<Component />, adapter);
    vi.runAllTimers();

    expect(beforeSpy).not.toHaveBeenCalled();
  });

  it("middleware can force replace option", () => {
    const adapter = createTestAdapter("?page=1&tab=preview");
    const pushSpy = vi.spyOn(adapter, "pushState");
    const replaceSpy = vi.spyOn(adapter, "replaceState");

    const forceReplace: SearchMiddleware<{ page: number; tab: string }> = (ctx) => {
      return ctx.next({ options: { replace: true } });
    };

    const { useNavigate } = createHooksWithMiddleware([forceReplace]);

    const Component = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({ search: { page: 2 } }); // no replace option
      }, []);
      return null;
    };

    renderWithSearchProvider(<Component />, adapter);
    vi.runAllTimers();

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalledTimes(1);
  });

  it("hook-level middleware runs after factory-level middleware", () => {
    const order: string[] = [];

    const factoryMw: SearchMiddleware<{ page: number; tab: string }> = (ctx) => {
      order.push("factory");
      return ctx.next();
    };

    const hookMw: SearchMiddleware<{ page: number; tab: string }> = (ctx) => {
      order.push("hook");
      return ctx.next();
    };

    const { useNavigate } = createHooksWithMiddleware([factoryMw]);
    const adapter = createTestAdapter("?page=1&tab=preview");

    const Component = () => {
      const navigate = useNavigate({ middleware: [hookMw] });
      useEffect(() => {
        navigate({ search: { page: 2 } });
      }, []);
      return null;
    };

    renderWithSearchProvider(<Component />, adapter);
    vi.runAllTimers();

    expect(order).toEqual(["factory", "hook"]);
  });

  it("provider → factory → hook middleware compose in correct order", () => {
    const order: string[] = [];

    const providerMw: SearchMiddleware<AnySearch> = (ctx) => {
      order.push("provider");
      return ctx.next();
    };

    const factoryMw: SearchMiddleware<{ page: number; tab: string }> = (ctx) => {
      order.push("factory");
      return ctx.next();
    };

    const hookMw: SearchMiddleware<{ page: number; tab: string }> = (ctx) => {
      order.push("hook");
      return ctx.next();
    };

    const { useNavigate } = createSearchUtils(validateSearch, {
      middleware: [factoryMw],
    });

    const adapter = createTestAdapter("?page=1&tab=preview");
    const TestAdapter: SearchStateAdapterComponent = ({ children }) =>
      children(adapter);

    const Component = () => {
      const navigate = useNavigate({ middleware: [hookMw] });
      useEffect(() => {
        navigate({ search: { page: 2 } });
      }, []);
      return null;
    };

    render(
      createElement(
        SearchStateProvider,
        { adapter: TestAdapter, middleware: [providerMw] },
        createElement(Component),
      ),
    );
    vi.runAllTimers();

    expect(order).toEqual(["provider", "factory", "hook"]);
  });

  it("middleware transforms are reflected in the final adapter call", () => {
    const adapter = createTestAdapter("?page=1&tab=preview");
    const spy = vi.spyOn(adapter, "pushState");

    const addFilter: SearchMiddleware<{ page: number; tab: string }> = (ctx) => {
      const result = ctx.next();
      if (!result) return null;
      return {
        ...result,
        search: { ...result.search, filter: "active" } as { page: number; tab: string },
      };
    };

    const { useNavigate } = createHooksWithMiddleware([addFilter]);

    const Component = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({ search: { page: 3 } });
      }, []);
      return null;
    };

    renderWithSearchProvider(<Component />, adapter);
    vi.runAllTimers();

    expect(spy).toHaveBeenCalledTimes(1);
    // The search string should include the filter added by middleware
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      search: "?page=3&tab=preview&filter=active",
    });
  });

  it("works without any middleware (no-op path)", () => {
    const adapter = createTestAdapter("?page=1&tab=preview");
    const spy = vi.spyOn(adapter, "pushState");

    const { useNavigate } = createHooksWithMiddleware(); // no middleware

    const Component = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({ search: { page: 5 } });
      }, []);
      return null;
    };

    renderWithSearchProvider(<Component />, adapter);
    vi.runAllTimers();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      search: "?page=5&tab=preview",
    });
  });
});
