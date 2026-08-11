const CACHE_KEY = "azimuth.attested.v1";

function load(): Map<string, boolean> {
  if (typeof sessionStorage === "undefined") return new Map();
  try {
    return new Map(Object.entries(JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? "{}")));
  } catch {
    return new Map();
  }
}

const cache = load();

export function readAttested(handle: string): boolean | undefined {
  return cache.get(handle);
}

export function rememberAttested(handle: string, value: boolean): void {
  cache.set(handle, value);
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(cache)));
}

export function allAttested(handles: string[]): boolean[] | null {
  const values = handles.map((handle) => cache.get(handle));
  return values.every((value) => value !== undefined) ? (values as boolean[]) : null;
}
