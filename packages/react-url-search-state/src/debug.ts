let debugEnabled = false;
try {
  debugEnabled = localStorage.getItem("react-url-search-state:debug") !== null;
} catch {}

/**
 * Enables or disables the internal debug logger at runtime.
 *
 * When enabled, navigation flushes and other internal events are logged to the console.
 *
 * @example
 * import { setDebug } from "react-url-search-state";
 * setDebug(true);
 */
export function setDebug(enabled: boolean) {
  debugEnabled = enabled;
}

// Internal debug logger.
export const debug = (message: string, ...args: any[]) => {
  if (!debugEnabled) return;
  console.log(
    message,
    ...args.map((value) =>
      typeof value === "string" ? value : JSON.stringify(value),
    ),
  );
};
