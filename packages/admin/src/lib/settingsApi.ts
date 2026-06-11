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

export const getOrganizationSettings = (token: string) => apiRequest<OrganizationSettings>("/organizations/me", { token });

export const updateOrganizationSettings = (token: string, body: OrganizationSettingsPayload) =>
  apiRequest<OrganizationSettings>("/organizations/me", { method: "PATCH", token, body });

export const listGymSettings = async (token: string) => {
  const response = await apiRequest<PaginatedResponse<GymSettings>>(apiPath("/gyms", { limit: 100 }), { token });
  return response.items;
};

export const createGymSettings = (token: string, body: GymSettingsPayload) =>
  apiRequest<GymSettings>("/gyms", { method: "POST", token, body });

export const updateGymSettings = (token: string, id: string, body: GymSettingsPayload) =>
  apiRequest<GymSettings>(`/gyms/${id}`, { method: "PATCH", token, body });

export const listUserSettings = async (token: string) => {
  const response = await apiRequest<PaginatedResponse<UserSettings>>(apiPath("/users", { limit: 100 }), { token });
  return response.items;
};

export const getOperationalSettings = (token: string) => apiRequest<OperationalSettings>("/settings/operational", { token });

export const updateOperationalSettings = (token: string, settings: OperationalSettings) =>
  apiRequest<OperationalSettings>("/settings/operational", { method: "PATCH", token, body: { settings } });

export const resetOperationalSettingsApi = (token: string) =>
  apiRequest<OperationalSettings>("/settings/operational", { method: "DELETE", token });
