const DEFAULT_API_URL = "http://localhost:3333";
const DEFAULT_WEB_PORTAL_URL = "https://admin.noogym.com/register";

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
  refreshToken?: string;
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
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiBaseUrl = () => {
  const envUrl = readEnv();

  return (envUrl ?? DEFAULT_API_URL).replace(/\/+$/, "");
};

export const webPortalRegisterUrl = () => {
  const portalUrl =
    readPublicEnv("NEXT_PUBLIC_NOOGYM_WEB_URL") ??
    readPublicEnv("VITE_NOOGYM_WEB_URL") ??
    readPublicEnv("NOOGYM_WEB_URL") ??
    DEFAULT_WEB_PORTAL_URL;
  const normalizedUrl = portalUrl.replace(/\/+$/, "");

  return normalizedUrl.endsWith("/register") ? normalizedUrl : `${normalizedUrl}/register`;
};

export const isHttpOnlyAuthEnabled = () => {
  const value = readPublicEnv("NEXT_PUBLIC_NOOGYM_HTTP_ONLY_AUTH");

  if (value !== undefined) {
    return value.toLowerCase() !== "false";
  }

  if (typeof window === "undefined") return false;

  return window.location.port === "3000";
};

export const loginWithApi = (payload: LoginPayload) =>
  authRequest<ApiAuthResponse>("login", "/auth/login", payload);

export const registerWithApi = (payload: RegisterPayload) =>
  authRequest<ApiAuthResponse>("register", "/auth/register", payload);

export const refreshWithApi = (refreshToken?: string) => {
  if (isHttpOnlyAuthEnabled()) {
    return apiRequest<ApiAuthResponse>("/api/auth/refresh", {
      method: "POST",
      baseUrl: "",
      credentials: "include",
    });
  }

  return apiRequest<ApiAuthResponse>("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
};

export const logoutWithApi = (refreshToken?: string) => {
  if (isHttpOnlyAuthEnabled()) {
    return apiRequest<{ message: string }>("/api/auth/logout", {
      method: "POST",
      baseUrl: "",
      credentials: "include",
    });
  }

  return apiRequest<{ message: string }>("/auth/logout", {
    method: "POST",
    body: { refreshToken },
  });
};

export const forgotPasswordWithApi = (email: string) =>
  apiRequest<{ message: string; resetUrl?: string }>("/auth/forgot-password", {
    method: "POST",
    body: { email: email.trim() },
  });

export const resetPasswordWithApi = (payload: {
  email: string;
  password: string;
  token: string;
}) =>
  apiRequest<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: {
      email: payload.email.trim(),
      password: payload.password,
      token: payload.token,
    },
  });

export const apiPath = (
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
) => {
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
    baseUrl?: string;
    credentials?: RequestCredentials;
  } = {},
) => {
  let response: Response;

  try {
    response = await fetch(`${options.baseUrl ?? apiBaseUrl()}${path}`, {
      method: options.method ?? "GET",
      credentials: options.credentials,
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(
      "Nao foi possivel conectar ao servidor. Confirme se a API esta online e tente novamente em instantes.",
      undefined,
      "API_UNREACHABLE",
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
    throw new ApiError(
      resolveApiMessage(payload, response.status, code),
      response.status,
      code,
    );
  }

  return payload.data;
};

const authRequest = <T>(action: string, directPath: string, body: unknown) => {
  if (isHttpOnlyAuthEnabled()) {
    return apiRequest<T>(`/api/auth/${action}`, {
      method: "POST",
      body,
      baseUrl: "",
      credentials: "include",
    });
  }

  return apiRequest<T>(directPath, { method: "POST", body });
};

const resolveApiMessage = <T>(
  payload: ApiEnvelope<T> | null,
  status?: number,
  code?: string,
) => {
  if (status === 503 || code === "DATABASE_UNAVAILABLE") {
    return "O sistema ainda esta a iniciar. Tente novamente em alguns segundos.";
  }

  if (!payload || payload.success)
    return "Nao foi possivel comunicar com a API.";
  const message = payload.error?.message;
  if (Array.isArray(message)) return message.join(" ");
  return message ?? "Nao foi possivel comunicar com a API.";
};

const resolveApiCode = <T>(payload: ApiEnvelope<T> | null) => {
  if (!payload || payload.success) return undefined;
  return payload.error?.code;
};

const readEnv = () => {
  return (
    readPublicEnv("NEXT_PUBLIC_NOOGYM_API_URL") ??
    readPublicEnv("VITE_NOOGYM_API_URL") ??
    readPublicEnv("NOOGYM_API_URL")
  );
};

const readPublicEnv = (key: string) => {
  const metaEnv = (
    import.meta as unknown as { env?: Record<string, string | undefined> }
  ).env;
  const processEnv =
    typeof process !== "undefined"
      ? (process.env as Record<string, string | undefined>)[key]
      : undefined;

  return processEnv ?? metaEnv?.[key];
};
