export interface LocalRecord {
  id: string;
  updatedAt: string;
}

export interface LocalDatabaseAdapter {
  getCollection<T>(key: string, fallback: T[]): T[];
  setCollection<T>(key: string, value: T[]): void;
  addPendingSync(record: LocalRecord): void;
  getPendingSync(): LocalRecord[];
  clearPendingSync(): void;
}

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const localStorageAdapter: LocalDatabaseAdapter = {
  getCollection: <T,>(key: string, fallback: T[]) => readJson<T[]>(`noogym:${key}`, fallback),
  setCollection: <T,>(key: string, value: T[]) => {
    localStorage.setItem(`noogym:${key}`, JSON.stringify(value));
  },
  addPendingSync: (record) => {
    const pending = readJson<LocalRecord[]>("noogym:pending-sync", []);
    localStorage.setItem("noogym:pending-sync", JSON.stringify([...pending, record]));
  },
  getPendingSync: () => readJson<LocalRecord[]>("noogym:pending-sync", []),
  clearPendingSync: () => localStorage.setItem("noogym:pending-sync", "[]")
};

export const sqliteReadyAdapterNote =
  "Este contrato isola o armazenamento local para futura troca por SQLite sem alterar as telas.";
