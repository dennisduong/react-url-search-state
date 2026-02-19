import type { AnySearch, Path } from "./types";

export type NavigateOptions = {
  merge?: boolean;
  replace?: boolean;
  state?: any;
};

export type QueueItem = {
  updater: (validated: AnySearch) => AnySearch;
  options: NavigateOptions;
  path: Pick<Path, "hash" | "pathname">;
};

export class NavigationQueue {
  frameRef: number | null = null;
  items: QueueItem[] = [];
}
