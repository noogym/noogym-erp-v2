import { apiPath, apiRequest, type PaginatedResponse } from "./api";
import type { OperationalSettings } from "../store/operationalSettingsStore";

export interface OrganizationSettings {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  _count?: {
    gyms?: number;
    users?: number;
    members?: number;
    plans?: number;
  };
}

export interface GymSettings {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  logoUrl?: string;
  isActive?: boolean;
}

export interface UserSettings {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  createdAt?: string;
  gyms?: Array<{ gym?: GymSettings; gymId?: string; id?: string; name?: string }>;
}

export type OrganizationSettingsPayload = Partial<Pick<OrganizationSettings, "name" | "slug" | "email" | "phone" | "website" | "logoUrl" | "country" | "currency" | "timezone">>;
export type GymSettingsPayload = Partial<Pick<GymSettings, "name" | "slug" | "email" | "phone" | "address" | "city" | "province" | "country" | "logoUrl" | "isActive">>;

const API_PAGE_LIMIT = 100;
const API_MAX_PAGES = 1_000;

export const getOrganizationSettings = (token: string) => apiRequest<OrganizationSettings>("/organizations/me", { token });

export const updateOrganizationSettings = (token: string, body: OrganizationSettingsPayload) =>
  apiRequest<OrganizationSettings>("/organizations/me", { method: "PATCH", token, body });

export const listGymSettings = async (token: string) => {
  return listPaginated<GymSettings>("/gyms", token);
};

export const createGymSettings = (token: string, body: GymSettingsPayload) =>
  apiRequest<GymSettings>("/gyms", { method: "POST", token, body });

export const updateGymSettings = (token: string, id: string, body: GymSettingsPayload) =>
  apiRequest<GymSettings>(`/gyms/${id}`, { method: "PATCH", token, body });

export const listUserSettings = async (token: string) => {
  return listPaginated<UserSettings>("/users", token);
};

export const getOperationalSettings = (token: string) => apiRequest<OperationalSettings>("/settings/operational", { token });

export const updateOperationalSettings = (token: string, settings: OperationalSettings) =>
  apiRequest<OperationalSettings>("/settings/operational", { method: "PATCH", token, body: { settings } });

export const resetOperationalSettingsApi = (token: string) =>
  apiRequest<OperationalSettings>("/settings/operational", { method: "DELETE", token });

async function listPaginated<T>(path: string, token: string) {
  const items: T[] = [];
  let page = 1;
  let pages = 1;

  do {
    const response = await apiRequest<PaginatedResponse<T>>(apiPath(path, { page, limit: API_PAGE_LIMIT }), { token });
    items.push(...response.items);
    pages = Math.min(API_MAX_PAGES, Math.max(1, Number(response.meta.pages) || 1));
    page += 1;
  } while (page <= pages);

  return items;
}
