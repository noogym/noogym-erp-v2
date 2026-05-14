const DEFAULT_API_URL = "http://localhost:3333";

type ApiEnvelope<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error?: {
        message?: string | string[];
      };
    };

export interface ApiAuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  organizationName?: string;
}

export interface ApiAuthResponse {
  accessToken: string;
  user: ApiAuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  organizationName: string;
  organizationSlug: string;
  name: string;
  phone?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiBaseUrl = () => {
  const envUrl = readEnv();

  return (envUrl ?? DEFAULT_API_URL).replace(/\/+$/, "");
};

export const loginWithApi = (payload: LoginPayload) => apiRequest<ApiAuthResponse>("/auth/login", { method: "POST", body: payload });

export const registerWithApi = (payload: RegisterPayload) =>
  apiRequest<ApiAuthResponse>("/auth/register", { method: "POST", body: payload });

export const forgotPasswordWithApi = (email: string) =>
  apiRequest<{ message: string }>("/auth/forgot-password", { method: "POST", body: { email: email.trim() } });

export const apiPath = (path: string, query?: Record<string, string | number | boolean | undefined>) => {
  if (!query) return path;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });

  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
};

export const apiRequest = async <T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
  } = {}
) => {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(resolveApiMessage(payload) ?? "Nao foi possivel comunicar com a API.", response.status);
  }

  return payload.data;
};

const resolveApiMessage = <T>(payload: ApiEnvelope<T> | null) => {
  if (!payload || payload.success) return null;
  const message = payload.error?.message;
  if (Array.isArray(message)) return message.join(" ");
  return message ?? null;
};

const readEnv = () => {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const processEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_NOOGYM_API_URL ?? process.env.VITE_NOOGYM_API_URL ?? process.env.NOOGYM_API_URL
      : undefined;

  return processEnv ?? metaEnv?.NEXT_PUBLIC_NOOGYM_API_URL ?? metaEnv?.VITE_NOOGYM_API_URL ?? metaEnv?.NOOGYM_API_URL;
};
