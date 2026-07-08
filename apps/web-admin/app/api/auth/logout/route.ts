import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  clearRefreshCookie,
  postAuth,
  REFRESH_COOKIE_NAME,
} from "../_auth-proxy";

export async function POST() {
  const refreshToken = (await cookies()).get(REFRESH_COOKIE_NAME)?.value;

  if (refreshToken) {
    await postAuth("/auth/logout", { refreshToken }).catch(() => undefined);
  }

  const response = NextResponse.json({
    success: true,
    data: { message: "Logged out successfully" },
  });

  clearRefreshCookie(response);

  return response;
}
