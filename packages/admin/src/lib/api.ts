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
        code?: string;
      };
    };

export interface ApiAuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeRole?: string;
  permissions?: string[];
  gyms?: Array<{ id: string; name: string }>;
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
    readonly status?: number,
    readonly code?: string
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
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch {
    throw new ApiError(
      "Nao foi possivel conectar ao servidor. Confirme se a API esta online e tente novamente em instantes.",
      undefined,
      "API_UNREACHABLE"
    );
  }

  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    const code = resolveApiCode(payload);
    throw new ApiError(resolveApiMessage(payload, response.status, code), response.status, code);
  }

  return payload.data;
};

const resolveApiMessage = <T>(payload: ApiEnvelope<T> | null, status?: number, code?: string) => {
  if (status === 503 || code === "DATABASE_UNAVAILABLE") {
    return "O sistema ainda esta a iniciar. Tente novamente em alguns segundos.";
  }

  if (!payload || payload.success) return "Nao foi possivel comunicar com a API.";
  const message = payload.error?.message;
  if (Array.isArray(message)) return message.join(" ");
  return message ?? "Nao foi possivel comunicar com a API.";
};

const resolveApiCode = <T>(payload: ApiEnvelope<T> | null) => {
  if (!payload || payload.success) return undefined;
  return payload.error?.code;
};

const readEnv = () => {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const processEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_NOOGYM_API_URL ?? process.env.VITE_NOOGYM_API_URL ?? process.env.NOOGYM_API_URL
      : undefined;

  return processEnv ?? metaEnv?.NEXT_PUBLIC_NOOGYM_API_URL ?? metaEnv?.VITE_NOOGYM_API_URL ?? metaEnv?.NOOGYM_API_URL;
};
