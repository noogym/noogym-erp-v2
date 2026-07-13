import { apiRequest, type ApiAuthResponse } from "./api";

export interface SuperAdminGym {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    members: number;
    users: number;
    products: number;
    sales: number;
    gymClasses: number;
    employees: number;
  };
}

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  gyms: Array<{ id: string; name: string }>;
}

export interface SuperAdminOrganization {
  id: string;
  name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  country?: string | null;
  currency: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  gyms: SuperAdminGym[];
  users: SuperAdminUser[];
  _count: {
    gyms: number;
    users: number;
    members: number;
    plans: number;
    products: number;
    sales: number;
    employees: number;
    subscriptions: number;
    payments: number;
    checkIns: number;
  };
}

export interface SuperAdminOverview {
  totals: {
    organizations: number;
    gyms: number;
    users: number;
    members: number;
    plans: number;
    products: number;
    sales: number;
  };
  organizations: SuperAdminOrganization[];
}

export interface SuperAdminPasswordResetResponse {
  message: string;
  resetUrl?: string;
  user: {
    email: string;
    name: string;
    organizationName: string;
  };
}

export const getSuperAdminOverview = (token: string) =>
  apiRequest<SuperAdminOverview>("/super-admin/overview", { token });

export const requestSuperAdminPasswordReset = (token: string, userId: string) =>
  apiRequest<SuperAdminPasswordResetResponse>(
    `/super-admin/users/${userId}/password-reset`,
    { method: "POST", token },
  );

export const startSuperAdminSupportSession = (
  token: string,
  body: { organizationId: string; reason: string },
) =>
  apiRequest<ApiAuthResponse>("/super-admin/support-sessions", {
    method: "POST",
    token,
    body,
  });

export const endSuperAdminSupportSession = (token: string) =>
  apiRequest<{ message: string }>("/super-admin/support-sessions/end", {
    method: "POST",
    token,
  });
