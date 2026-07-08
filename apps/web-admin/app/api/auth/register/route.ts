import { NextRequest } from "next/server";
import { authResponse, postAuth, type AuthPayload } from "../_auth-proxy";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { payload, status } = await postAuth<AuthPayload>(
    "/auth/register",
    body,
  );

  return authResponse(payload, status);
}
