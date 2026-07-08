import { getDesktopCollection, isDesktopLocalDbAvailable, setDesktopCollection } from "./desktopLocalDb";

export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T, options: { sync?: boolean } = {}) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  if (isDesktopLocalDbAvailable()) {
    void setDesktopCollection(key, value, { sync: options.sync }).catch(console.error);
  }
}

export async function readLocalDb<T>(key: string, fallback: T): Promise<T> {
  if (typeof window === "undefined") return fallback;

  if (isDesktopLocalDbAvailable()) {
    const value = await getDesktopCollection<T>(key).catch(() => undefined);
    if (value !== undefined) {
      window.localStorage.setItem(key, JSON.stringify(value));
      return value;
    }

    const localValue = readLocal(key, fallback);
    await setDesktopCollection(key, localValue).catch(console.error);
    return localValue;
  }

  return readLocal(key, fallback);
}

export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
