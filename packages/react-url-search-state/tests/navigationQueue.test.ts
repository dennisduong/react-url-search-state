import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { NavigationQueue } from "../src/navigationQueue";

describe("NavigationQueue.schedule()", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("schedules a callback via requestAnimationFrame and stores the frame ID", () => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((_cb: FrameRequestCallback) => 99),
    );

    const queue = new NavigationQueue();
    const callback = vi.fn();
    queue.schedule(callback);

    expect(requestAnimationFrame).toHaveBeenCalledWith(callback);
    expect(queue.frameRef).toBe(99);
  });

  it("does not reschedule if frameRef is already set", () => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((_cb: FrameRequestCallback) => 55),
    );

    const queue = new NavigationQueue();
    queue.frameRef = 1; // simulate already-scheduled frame
    const callback = vi.fn();
    queue.schedule(callback);

    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(queue.frameRef).toBe(1); // unchanged
  });

  it("does not throw when requestAnimationFrame is not defined (SSR guard)", () => {
    vi.stubGlobal("requestAnimationFrame", undefined);

    const queue = new NavigationQueue();
    const callback = vi.fn();
    expect(() => queue.schedule(callback)).not.toThrow();
    expect(queue.frameRef).toBeNull(); // nothing scheduled
    expect(callback).not.toHaveBeenCalled();
  });
});

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
