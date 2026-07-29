import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { jsonError } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { LoggerService } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit({
      key: `auth:login:${clientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (limited) {
      return limited;
    }

    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      LoggerService.warn("Login failed", { email });
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    LoggerService.audit("User signed in", { userId: data.user.id });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
      {
        headers: response.headers,
      },
    );
  } catch (error) {
    return jsonError(error, "Failed to sign in");
  }
}
