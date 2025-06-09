export const DEBUG = (() => {
  try {
    return localStorage.getItem("react-url-search-state:debug") !== null;
  } catch {
    return false;
  }
})();

// Internal debug logger. helpful for dev.
export const debug = (message: string, ...args: any[]) => {
  if (!DEBUG) return;
  console.log(
    message,
    ...args.map((value) =>
      typeof value === "string" ? value : JSON.stringify(value),
    ),
  );
};
