import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { formatErrorMessage } from "@/lib/errors/formatError";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { url, anonKey } = getSupabaseEnv();
    let response = NextResponse.json({ success: true });

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.json({ success: true });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return response;
  } catch (error) {
    logger.error("Failed to sign out", error);

    return NextResponse.json(
      { error: formatErrorMessage(error, "Failed to sign out") },
      { status: 500 },
    );
  }
}
