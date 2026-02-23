import type { AnySearch, Path } from "./types";
import type { ValidateSearchFn } from "./validation";

export type NavigateOptions = {
  merge?: boolean;
  replace?: boolean;
  state?: any;
};

export type QueueItem = {
  updater: (validated: AnySearch) => AnySearch;
  options: NavigateOptions;
  path: Pick<Path, "hash" | "pathname">;
  validator?: ValidateSearchFn;
};

export class NavigationQueue {
  frameRef: number | null = null;
  items: QueueItem[] = [];

  schedule(callback: FrameRequestCallback): void {
    if (this.frameRef !== null) return;
    if (typeof requestAnimationFrame !== "undefined") {
      this.frameRef = requestAnimationFrame(callback);
    }
  }

  destroy() {
    if (this.frameRef !== null) {
      if (typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(this.frameRef);
      }
      this.frameRef = null;
    }
    this.items = [];
  }
}
