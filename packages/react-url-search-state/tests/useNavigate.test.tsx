import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestAdapter, renderWithSearchProvider, useNavigate } from "./testHelpers";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers(); // Ensure all batched calls are flushed
  vi.useRealTimers();
});

describe("useNavigate", () => {
  it("pushes a new search string", () => {
    const initialSearch = "?page=1&tab=preview";
    const adapter = createTestAdapter(initialSearch);
    const spy = vi.spyOn(adapter, "pushState");
  
    const NavigatorComponent = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({ search: { page: 2 } });
      }, []);
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
  
    vi.runAllTimers();
  
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      search: "?page=2&tab=preview",
    });
  });

  it("replaces search string when replace option is true", () => {
    const initialSearch = "?page=1&tab=preview";
    const adapter = createTestAdapter(initialSearch);
    const pushSpy = vi.spyOn(adapter, "pushState");
    const replaceSpy = vi.spyOn(adapter, "replaceState");
  
    const NavigatorComponent = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({ search: { page: 3 } }, { replace: true });
      }, []);
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
  
    vi.runAllTimers(); // Flush batched nav
  
    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy.mock.calls[0]?.[1]).toMatchObject({
      search: "?page=3&tab=preview",
    });
  });

  it("merges with existing validated state by default", () => {
    const initialSearch = "?page=1&tab=preview";
    const adapter = createTestAdapter(initialSearch);
    const spy = vi.spyOn(adapter, "pushState");
  
    const NavigatorComponent = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({ search: { page: 3 } }); // no `merge: false` specified
      }, []);
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);

    vi.runAllTimers(); // Flush batched nav
  
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      search: "?page=3&tab=preview", // preview remains because merge is true by default
    });
  });

  it("replaces entire search state when merge is false", () => {
    const initialSearch = "?page=1&tab=preview";
    const adapter = createTestAdapter(initialSearch);
    const spy = vi.spyOn(adapter, "pushState");
  
    const NavigatorComponent = () => {
      const navigate = useNavigate();
      useEffect(() => {
        // @ts-expect-error - okay for next line for testing
        navigate({ search: { tab: "details" } }, { merge: false });
      }, []);
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers(); // Flush batched nav
  
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      search: "?tab=details", // Only the `tab` key remains; `page` is dropped
    });
  });

  it("accepts functional update to search", () => {
    const initialSearch = "?page=2&tab=preview";
    const adapter = createTestAdapter(initialSearch);
    const spy = vi.spyOn(adapter, "pushState");
  
    const NavigatorComponent = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate({
          search: (prev) => ({
            ...prev,
            page: prev.page + 1,
          }),
        });
      }, []);
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers(); // Flush batched nav
  
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      search: "?page=3&tab=preview",
    });
  });

  it("batches multiple functional updates", () => {
    const initialSearch = "?page=1&tab=preview";
    const adapter = createTestAdapter(initialSearch);
    const spy = vi.spyOn(adapter, "pushState");
  
    const NavigatorComponent = () => {
      const navigate = useNavigate();
  
      useEffect(() => {
        navigate({
          search: (prev) => ({ ...prev, page: prev.page + 1 }),
        });
        navigate({
          search: (prev) => ({ ...prev, tab: "details" }),
        });
      }, []);
  
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers(); // Flush batched nav
  
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      search: "?page=2&tab=details",
    });
  });

  it("batches mix of object and function updates", () => {
    const adapter = createTestAdapter("?page=1&tab=preview");
    const spy = vi.spyOn(adapter, "pushState");
  
    const NavigatorComponent = () => {
      const navigate = useNavigate();
  
      useEffect(() => {
        // Functional update modifies page
        navigate({
          search: (prev) => ({ ...prev, page: prev.page + 1 }),
        });
  
        // Object update overrides tab
        navigate({
          search: { tab: "details" },
        });
  
        // Another functional update modifies tab again
        navigate({
          search: (prev) => ({ ...prev, tab: prev.tab + "-extended" }),
        });
      }, []);
  
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers(); // Flush batched nav
  
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      search: "?page=2&tab=details-extended",
    });
  });

  it("batches mix of object and function updates with merge: false in between", () => {
    const adapter = createTestAdapter("?page=1&tab=preview&filter=active");
    const spy = vi.spyOn(adapter, "pushState");
  
    const NavigatorComponent = () => {
      const navigate = useNavigate();
  
      useEffect(() => {
        // Step 1: Functional update (page++)
        navigate({
          search: (prev) => ({ ...prev, page: prev.page + 1 }),
        });
  
        // Step 2: Reset state (merge: false) and set only tab
        navigate(
          {
            // @ts-expect-error - okay for next line for testing
            search: { tab: "details" },
          },
          { merge: false }
        );
  
        // Step 3: Add back filter
        navigate({
          // @ts-expect-error - okay for next line for testing
          search: { filter: "archived" },
        });
      }, []);
  
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();
  
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      search: "?page=1&tab=details&filter=archived",
    });
  });
  
  it("updates pathname and hash in batched navigation", () => {
    const adapter = createTestAdapter("?page=1&tab=preview", "/original", "#top");
    const spy = vi.spyOn(adapter, "pushState");
  
    const NavigatorComponent = () => {
      const navigate = useNavigate();
  
      useEffect(() => {
        // Step 1: Modify search
        navigate({
          search: { page: 2 },
        });
  
        // Step 2: Update pathname
        navigate({
          search: { tab: "details" },
          pathname: "/updated",
        });
  
        // Step 3: Add hash
        navigate({
          // @ts-expect-error - okay for next line for testing
          search: { filter: "archived" },
          hash: "#bottom",
        });
      }, []);
  
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();
  
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      pathname: "/updated",
      hash: "#bottom",
      search: "?page=2&tab=details&filter=archived",
    });
  });
  
  it("resets state and replaces history with pathname and hash override", () => {
    const adapter = createTestAdapter("?page=1&tab=preview", "/original", "#top");
    const spy = vi.spyOn(adapter, "replaceState");
  
    const NavigatorComponent = () => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate(
          {
            search: { tab: "details", page: 5 },
            pathname: "/new-path",
            hash: "#section2",
          },
          {
            merge: false,
            replace: true,
            state: { source: "test" },
          }
        );
      }, []);
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();
  
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toMatchObject([
      { source: "test" },
      {
        pathname: "/new-path",
        hash: "#section2",
        search: "?page=5&tab=details", // falls back to default tab
      },
    ]);
  });
  
  it("batches mixed object and functional search updates with pathname", () => {
    const adapter = createTestAdapter("?page=1&tab=preview", "/original");
    const spy = vi.spyOn(adapter, "pushState");
  
    const NavigatorComponent = () => {
      const navigate = useNavigate();
  
      useEffect(() => {
        navigate({ search: { page: 2 } }); // object update
        navigate({
          search: (prev) => ({ tab: prev.tab === "preview" ? "details" : "preview" }),
          pathname: "/recalculated",
        });
      }, []);
  
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();
  
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      pathname: "/recalculated",
      search: "?page=2&tab=details",
    });
  });

  it("applies hash-only update correctly", () => {
    const adapter = createTestAdapter("?page=1&tab=preview", "/stay");
    const spy = vi.spyOn(adapter, "pushState");
  
    const NavigatorComponent = () => {
      const navigate = useNavigate();
  
      useEffect(() => {
        navigate({
          search: {},
          hash: "#new",
        });
      }, []);
  
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();
  
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      hash: "#new",
      search: "?page=1&tab=preview",
    });
  });
  
  it("applies merge=false followed by merge=true updates in batch correctly", () => {
    const initialSearch = "?page=1&tab=preview"
    const adapter = createTestAdapter(initialSearch);
    const spy = vi.spyOn(adapter, "pushState");
  
    const NavigatorComponent = () => {
      const navigate = useNavigate();
  
      useEffect(() => {
        // First update resets state (merge: false)
        // @ts-expect-error - okay for next line for testing
        navigate({ search: { page: 42 } }, { merge: false });
  
        // Second update merges into previous validated state
        navigate({ search: { tab: "details" } }, { merge: true });
      }, []);
  
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();
  
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      search: "?page=42&tab=details",
    });
  });
  
  it("applies merge=true followed by merge=false updates in batch correctly", () => {
    const adapter = createTestAdapter("?page=1&tab=preview");
    const spy = vi.spyOn(adapter, "pushState");
  
    const NavigatorComponent = () => {
      const navigate = useNavigate();
  
      useEffect(() => {
        // First update merges into current state
        navigate({ search: { page: 42 } }, { merge: true });
  
        // Second update resets everything with merge: false
        // @ts-expect-error - okay for next line for testing
        navigate({ search: { tab: "details" } }, { merge: false });
      }, []);
  
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();
  
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[1]).toMatchObject({
      search: "?tab=details",
    });
  });
  
  it("calls onBeforeNavigate before committing the navigation", () => {
    const adapter = createTestAdapter("?page=1&tab=preview");
    const pushSpy = vi.spyOn(adapter, "pushState");
    const beforeSpy = vi.fn();
  
    const NavigatorComponent = () => {
      const navigate = useNavigate({
        onBeforeNavigate: beforeSpy,
      });
  
      useEffect(() => {
        navigate({ search: { page: 3 } });
      }, []);
  
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();
  
    expect(beforeSpy).toHaveBeenCalledTimes(1);
    expect(beforeSpy).toHaveBeenCalledWith(
      { page: 3, tab: "preview" }, // validated search
      { search: "?page=3&tab=preview" } // next path
    );
  
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });
  
  it("calls onBeforeNavigate with pathname and hash overrides", () => {
    const adapter = createTestAdapter("?page=1&tab=preview", "/original", "#top");
    const pushSpy = vi.spyOn(adapter, "pushState");
    const beforeSpy = vi.fn();
  
    const NavigatorComponent = () => {
      const navigate = useNavigate({
        onBeforeNavigate: beforeSpy,
      });
  
      useEffect(() => {
        navigate(
          { search: { page: 5 }, pathname: "/new", hash: "#section2" },
          { merge: true }
        );
      }, []);
  
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();
  
    expect(beforeSpy).toHaveBeenCalledTimes(1);
    expect(beforeSpy).toHaveBeenCalledWith(
      { page: 5, tab: "preview" },
      { search: "?page=5&tab=preview", pathname: "/new", hash: "#section2" }
    );
  
    expect(pushSpy).toHaveBeenCalledWith(undefined, {
      search: "?page=5&tab=preview",
      pathname: "/new",
      hash: "#section2",
    });
  });
  
  it("calls onBeforeNavigate with only override values when merge is false", () => {
    const adapter = createTestAdapter("?page=10&tab=preview");
    const pushSpy = vi.spyOn(adapter, "pushState");
    const beforeSpy = vi.fn();
  
    const NavigatorComponent = () => {
      const navigate = useNavigate({
        onBeforeNavigate: beforeSpy,
      });
  
      useEffect(() => {
        // @ts-expect-error - okay for next line for testing
        navigate({ search: { tab: "details" } }, { merge: false });
      }, []);
  
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();
  
    expect(beforeSpy).toHaveBeenCalledWith(
      { tab: "details" },
      { search: "?tab=details" }
    );
  
    expect(pushSpy).toHaveBeenCalledWith(undefined, {
      search: "?tab=details",
    });
  });
  

  it("does not call onBeforeNavigate if state and path are structurally equal", () => {
    const adapter = createTestAdapter("?page=1&tab=preview", "/same", "#hash");
    const pushSpy = vi.spyOn(adapter, "pushState");
    const beforeSpy = vi.fn();
  
    const NavigatorComponent = () => {
      const navigate = useNavigate({
        onBeforeNavigate: beforeSpy,
      });
  
      useEffect(() => {
        navigate({ search: { page: 1 }, pathname: "/same", hash: "#hash" });
      }, []);
  
      return null;
    };
  
    renderWithSearchProvider(<NavigatorComponent />, adapter);
    vi.runAllTimers();
  
    expect(beforeSpy).not.toHaveBeenCalled();
    expect(pushSpy).not.toHaveBeenCalled();
  });
  
});
