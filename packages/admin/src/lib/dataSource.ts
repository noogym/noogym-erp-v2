import { readLocal, writeLocal } from "./storage";

export type AdminDataSource =
  | {
      kind: "api";
      token: string;
      activeGymId?: string;
    }
  | {
      kind: "local-first";
      reason: "offline-mode" | "missing-token";
      activeGymId?: string;
    };

export const resolveAdminDataSource = (input: {
  onlineOnly: boolean;
  token?: string | null;
  activeGymId?: string | null;
}): AdminDataSource => {
  const activeGymId = input.activeGymId ?? undefined;

  if (!input.onlineOnly) {
    return { kind: "local-first", reason: "offline-mode", activeGymId };
  }

  if (!input.token) {
    return { kind: "local-first", reason: "missing-token", activeGymId };
  }

  return { kind: "api", token: input.token, activeGymId };
};

export const isApiDataSource = (
  source: AdminDataSource,
): source is Extract<AdminDataSource, { kind: "api" }> => source.kind === "api";

export const localCollection = <T>(key: string, seed: () => T) => ({
  read: () => readLocal(key, seed()),
  write: (value: T) => writeLocal(key, value),
});
