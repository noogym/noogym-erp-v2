import { getDesktopCollection, isDesktopLocalDbAvailable, setDesktopCollection } from "./desktopLocalDb";
import { belongsToGym } from "./gymScope";

const GYM_SCOPED_COLLECTION_KEYS = new Set([
  "noogym:checkins",
  "noogym:classes",
  "noogym:clients",
  "noogym:employees",
  "noogym:finance",
  "noogym:plans",
  "noogym:products",
  "noogym:sales",
]);

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
  const nextValue = mergeGymScopedValue(key, value);
  window.localStorage.setItem(key, JSON.stringify(nextValue));
  if (isDesktopLocalDbAvailable()) {
    void setDesktopCollection(key, nextValue, { sync: options.sync }).catch(console.error);
  }
}

export async function readLocalDb<T>(
  key: string,
  fallback: T,
  options: { seedMissing?: boolean } = {},
): Promise<T> {
  if (typeof window === "undefined") return fallback;

  if (isDesktopLocalDbAvailable()) {
    const value = await getDesktopCollection<T>(key).catch(() => undefined);
    if (value !== undefined) {
      window.localStorage.setItem(key, JSON.stringify(value));
      return value;
    }

    if (options.seedMissing === false) return fallback;

    const localValue = readLocal(key, fallback);
    await setDesktopCollection(key, localValue).catch(console.error);
    return localValue;
  }

  return readLocal(key, fallback);
}

export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const mergeGymScopedValue = <T>(key: string, value: T) => {
  if (
    typeof window === "undefined" ||
    !GYM_SCOPED_COLLECTION_KEYS.has(key) ||
    !Array.isArray(value)
  ) {
    return value;
  }

  const activeGymId = window.localStorage.getItem("noogym:active-gym-id");
  if (!activeGymId) return value;

  const previous = readLocal<unknown[]>(key, []);
  const nextIds = new Set(
    value
      .map((item) => recordId(item))
      .filter((id): id is string => Boolean(id)),
  );
  const preserved = previous.filter((item) => {
    if (!isRecord(item)) return false;
    if (nextIds.has(String(item.id))) return false;
    return !belongsToGym(item, activeGymId);
  });

  return [...value, ...preserved] as T;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object");

const recordId = (value: unknown) =>
  isRecord(value) && typeof value.id === "string" ? value.id : undefined;
