import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` that degrades to `useEffect` on the server.
 *
 * React logs a warning when `useLayoutEffect` runs during server rendering
 * (it can't do anything useful without a DOM). Layout effects never run on
 * the server anyway, so falling back to `useEffect` there is behaviorally
 * identical and silences the warning.
 *
 * The choice is made once at module load based on the presence of `window`,
 * which is safe because an environment does not switch between having and
 * not having a DOM at runtime.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
