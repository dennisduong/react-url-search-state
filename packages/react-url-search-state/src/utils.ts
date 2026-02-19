export const isBrowser = typeof window !== "undefined";

type OptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];

export type OmitOptional<T> = Omit<T, OptionalKeys<T>> &
  Partial<Pick<T, OptionalKeys<T>>>;

export type OverrideMerge<A, B> = {
  [K in keyof A | keyof B]: K extends keyof B
    ? B[K] // If key exists in B, use its type
    : K extends keyof A
      ? A[K] // Otherwise, fallback to A
      : never;
};

// Copied from: https://github.com/TanStack/router/blob/v1.120.3/packages/router-core/src/validators.ts#L71
type AnySchema = {};

// Copied from: https://github.com/TanStack/router/blob/v1.120.3/packages/router-core/src/utils.ts#L440
function hasUriEncodedChars(inputString: string): boolean {
  // This regex looks for a percent sign followed by two hexadecimal digits
  const pattern = /%[0-9A-Fa-f]{2}/;
  return pattern.test(inputString);
}

// Copied from: https://github.com/TanStack/router/blob/v1.120.3/packages/router-core/src/qss.ts#L45C1-L54C2
function toValue(mix: any) {
  if (!mix) return "";
  const str = hasUriEncodedChars(mix)
    ? decodeURIComponent(mix)
    : decodeURIComponent(encodeURIComponent(mix));

  if (str === "false") return false;
  if (str === "true") return true;
  return +str * 0 === 0 && +str + "" === str ? +str : str;
}

// Copied from: https://github.com/TanStack/router/blob/v1.120.3/packages/router-core/src/qss.ts#L65
function decode(str: any, pfx?: string): any {
  const searchParamsPart = pfx ? str.slice(pfx.length) : str;
  const searchParams = new URLSearchParams(searchParamsPart);

  const entries = [...searchParams.entries()];

  return entries.reduce<Record<string, unknown>>((acc, [key, value]) => {
    const previousValue = acc[key];
    if (previousValue == null) {
      acc[key] = toValue(value);
    } else {
      acc[key] = Array.isArray(previousValue)
        ? [...previousValue, toValue(value)]
        : [previousValue, toValue(value)];
    }

    return acc;
  }, {});
}

function parseSearchWith(parser: (str: string) => any) {
  return (searchStr: string): AnySchema => {
    if (searchStr.substring(0, 1) === "?") {
      searchStr = searchStr.substring(1);
    }

    const query: Record<string, unknown> = decode(searchStr);

    // Try to parse any query params that might be json
    for (const key in query) {
      const value = query[key];
      if (typeof value === "string") {
        try {
          query[key] = parser(value);
        } catch (err) {
          //
        }
      }
    }

    return query;
  };
}

export const parseSearch = parseSearchWith(JSON.parse);

// Copied from: https://github.com/TanStack/router/blob/v1.120.3/packages/router-core/src/qss.ts#L23
function encode(obj: any, pfx?: string) {
  const normalizedObject = Object.entries(obj).flatMap(([key, value]) => {
    if (Array.isArray(value)) {
      return value.map((v) => [key, String(v)]);
    } else {
      return [[key, String(value)]];
    }
  });

  const searchParams = new URLSearchParams(normalizedObject);

  return (pfx || "") + searchParams.toString();
}

// Copied from: https://github.com/TanStack/router/blob/v1.120.3/packages/router-core/src/searchParams.ts#L34
export function stringifySearchWith(
  stringify: (search: any) => string,
  parser?: (str: string) => any,
) {
  function stringifyValue(val: any) {
    if (typeof val === "object" && val !== null) {
      try {
        return stringify(val);
      } catch (err) {
        // silent
      }
    } else if (typeof val === "string" && typeof parser === "function") {
      try {
        // Check if it's a valid parseable string.
        // If it is, then stringify it again.
        parser(val);
        return stringify(val);
      } catch (err) {
        // silent
      }
    }
    return val;
  }

  return (search: Record<string, any>) => {
    search = { ...search };

    Object.keys(search).forEach((key) => {
      const val = search[key];
      if (typeof val === "undefined" || val === undefined) {
        delete search[key];
      } else {
        search[key] = stringifyValue(val);
      }
    });

    const searchStr = encode(search as Record<string, string>).toString();

    return searchStr ? `?${searchStr}` : "";
  };
}

export const stringifySearch = stringifySearchWith(JSON.stringify);

/**
 * This function returns `prev` if `_next` is deeply equal.
 * If not, it will replace any deeply equal children of `b` with those of `a`.
 * This can be used for structural sharing between immutable JSON values for example.
 * Do not use this with signals
 *
 * Copied from: https://github.com/TanStack/router/blob/v1.120.3/packages/router-core/src/utils.ts#L207
 */
export function replaceEqualDeep<T>(prev: any, _next: T): T {
  if (prev === _next) {
    return prev;
  }

  const next = _next as any;

  const array = isPlainArray(prev) && isPlainArray(next);

  if (array || (isPlainObject(prev) && isPlainObject(next))) {
    const prevItems = array ? prev : Object.keys(prev);
    const prevSize = prevItems.length;
    const nextItems = array ? next : Object.keys(next);
    const nextSize = nextItems.length;
    const copy: any = array ? [] : {};

    let equalItems = 0;

    for (let i = 0; i < nextSize; i++) {
      const key = array ? i : (nextItems[i] as any);
      if (
        ((!array && prevItems.includes(key)) || array) &&
        prev[key] === undefined &&
        next[key] === undefined
      ) {
        copy[key] = undefined;
        equalItems++;
      } else {
        copy[key] = replaceEqualDeep(prev[key], next[key]);
        if (copy[key] === prev[key] && prev[key] !== undefined) {
          equalItems++;
        }
      }
    }

    return prevSize === nextSize && equalItems === prevSize ? prev : copy;
  }

  return next;
}

// Copied from: https://github.com/jonschlinkert/is-plain-object
export function isPlainObject(o: any) {
  if (!hasObjectPrototype(o)) {
    return false;
  }

  // If has modified constructor
  const ctor = o.constructor;
  if (typeof ctor === "undefined") {
    return true;
  }

  // If has modified prototype
  const prot = ctor.prototype;
  if (!hasObjectPrototype(prot)) {
    return false;
  }

  // If constructor does not have an Object-specific method
  if (!prot.hasOwnProperty("isPrototypeOf")) {
    return false;
  }

  // Most likely a plain Object
  return true;
}

export function hasObjectPrototype(o: any) {
  return Object.prototype.toString.call(o) === "[object Object]";
}

// Copied from: https://github.com/TanStack/router/blob/v1.120.3/packages/router-core/src/utils.ts#L279
export function isPlainArray(value: unknown): value is Array<unknown> {
  return Array.isArray(value) && value.length === Object.keys(value).length;
}

/**
 * Recursively removes `undefined` values from an object.
 *
 * Used internally before stringifying search state for URL updates.
 * Ensures the final query string is as compact and clean as possible.
 */
export function cleanSearchObject(input: Record<string, unknown>) {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      const cleanedArray = value
        .map((v) =>
          typeof v === "object" && v !== null
            ? cleanSearchObject(v as Record<string, unknown>)
            : v,
        )
        .filter((v) => v !== undefined);

      result[key] = cleanedArray;
    } else if (typeof value === "object" && value !== null) {
      const cleanedObj = cleanSearchObject(value as Record<string, unknown>);
      result[key] = cleanedObj;
    } else {
      result[key] = value;
    }
  }

  return result;
}

// Attempts to safely JSON.stringify an input. Falls back to raw value on error.
export function stringifyValue(val: unknown) {
  if (typeof val === "object" && val !== null) {
    try {
      return JSON.stringify(val);
    } catch (err) {
      // silent
    }
  }
  return val;
}

// Constructs a scoped key for local/session storage (e.g. "namespace:key").
export function createStoreKey(name: string, namespace?: string) {
  return `${namespace ? `${namespace}:` : ""}${name}`;
}
