import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { NavigationQueue } from "../src/navigationQueue";

describe("NavigationQueue.destroy()", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((_cb: FrameRequestCallback) => {
        // Return a non-zero handle so we can distinguish it from null
        return 42;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("cancels a pending frame and clears items", () => {
    const queue = new NavigationQueue();

    // Simulate a pending frame by manually setting frameRef and items
    queue.frameRef = requestAnimationFrame(() => {});
    queue.items.push({
      updater: (s) => s,
      options: {},
      path: {},
    });

    expect(queue.frameRef).not.toBeNull();
    expect(queue.items).toHaveLength(1);

    queue.destroy();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
    expect(queue.frameRef).toBeNull();
    expect(queue.items).toHaveLength(0);
  });

  it("sets frameRef to null and empties items after destroy()", () => {
    const queue = new NavigationQueue();

    queue.frameRef = requestAnimationFrame(() => {});
    queue.items.push({ updater: (s) => s, options: {}, path: {} });
    queue.items.push({ updater: (s) => s, options: { replace: true }, path: { pathname: "/foo" } });

    queue.destroy();

    expect(queue.frameRef).toBeNull();
    expect(queue.items).toHaveLength(0);
  });

  it("is safe to call when there is no pending frame (frameRef is null)", () => {
    const queue = new NavigationQueue();

    // frameRef starts as null - no pending frame
    expect(queue.frameRef).toBeNull();

    // Should not throw and should not call cancelAnimationFrame
    expect(() => queue.destroy()).not.toThrow();
    expect(cancelAnimationFrame).not.toHaveBeenCalled();
    expect(queue.frameRef).toBeNull();
    expect(queue.items).toHaveLength(0);
  });

  it("is safe to call destroy() multiple times", () => {
    const queue = new NavigationQueue();

    queue.frameRef = requestAnimationFrame(() => {});
    queue.items.push({ updater: (s) => s, options: {}, path: {} });

    queue.destroy();
    expect(() => queue.destroy()).not.toThrow();

    expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(queue.frameRef).toBeNull();
    expect(queue.items).toHaveLength(0);
  });
});
