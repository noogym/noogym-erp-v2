import { apiPath, apiRequest, type PaginatedResponse } from "./api";

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
  role: string;
  status: string;
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
