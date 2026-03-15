import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const session = await getAuthSession();

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    session,
  });
}
