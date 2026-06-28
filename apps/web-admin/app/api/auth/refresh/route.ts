import { cookies } from "next/headers";
import {
  authResponse,
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

  return authResponse(payload, status);
}
