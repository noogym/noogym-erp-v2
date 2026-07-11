import { cookies } from "next/headers";
import {
  authResponse,
  clearRefreshCookie,
  postAuth,
  REFRESH_COOKIE_NAME,
  type AuthPayload,
} from "../_auth-proxy";

export async function POST() {
  const refreshToken = (await cookies()).get(REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return Response.json(
      {
        success: false,
        error: { message: "Refresh token not found" },
      },
      { status: 401 },
    );
  }

  const { payload, status } = await postAuth<AuthPayload>("/auth/refresh", {
    refreshToken,
  });

  const response = authResponse(payload, status);
  if (status === 401 || payload?.success === false) {
    clearRefreshCookie(response);
  }

  return response;
}
