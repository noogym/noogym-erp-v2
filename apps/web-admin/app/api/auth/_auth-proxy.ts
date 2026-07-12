import { NextResponse } from "next/server";

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

export type AuthPayload = {
  accessToken: string;
  refreshToken?: string;
  user: unknown;
};

export const REFRESH_COOKIE_NAME = "noogym_refresh_token";

const DEFAULT_API_URL = "https://apiv1.noogym.com";
const DEFAULT_REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const authApiUrl = (path: string) =>
  `${(process.env.NOOGYM_API_URL ?? process.env.NEXT_PUBLIC_NOOGYM_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, "")}${path}`;

export const postAuth = async <T>(path: string, body: unknown) => {
  let response: Response;

  try {
    response = await fetch(authApiUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { payload: null, status: 503 };
  }

  const payload = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null;

  return { payload, status: response.status };
};

export const authResponse = (
  payload: ApiEnvelope<AuthPayload> | null,
  status: number,
) => {
  if (!payload) {
    return NextResponse.json(
      {
        success: false,
        error: { message: "Nao foi possivel comunicar com a API." },
      },
      { status },
    );
  }

  if (!payload.success) {
    return NextResponse.json(payload, { status });
  }

  const { refreshToken: _refreshToken, ...data } = payload.data;
  const response = NextResponse.json({ ...payload, data }, { status });

  if (payload.data.refreshToken) {
    response.cookies.set(REFRESH_COOKIE_NAME, payload.data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: refreshMaxAgeSeconds(),
    });
  }

  return response;
};

export const clearRefreshCookie = (response: NextResponse) => {
  response.cookies.set(REFRESH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
};

const refreshMaxAgeSeconds = () => {
  const raw = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";
  const match = raw.match(/^(\d+)([smhd])?$/i);
  if (!match) return DEFAULT_REFRESH_MAX_AGE_SECONDS;

  const value = Number(match[1]);
  const unit = match[2]?.toLowerCase() ?? "s";

  if (unit === "m") return value * 60;
  if (unit === "h") return value * 60 * 60;
  if (unit === "d") return value * 60 * 60 * 24;
  return value;
};
