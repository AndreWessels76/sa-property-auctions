import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness — process is up. */
export async function GET() {
  return NextResponse.json({
    status: "alive",
    time: new Date().toISOString(),
  });
}
