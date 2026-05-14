import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password, rememberMe, deviceFingerprint } = await req.json();

    const allowed = (process.env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!allowed.includes((email as string).toLowerCase())) {
      return NextResponse.json(
        { error: "Access denied. This app is private." },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();

    // Collect cookies Supabase wants to write so we can apply them to the response.
    const pendingCookies: { name: string; value: string; options: CookieOptions }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            pendingCookies.push({ name, value, options });
          },
          remove(name: string, options: CookieOptions) {
            pendingCookies.push({ name, value: "", options: { ...options, maxAge: 0 } });
          },
        },
      }
    );

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Invalid credentials" },
        { status: 401 }
      );
    }

    const userId = authData.user.id;
    const admin = createAdminClient();

    // Clean up expired sessions, then count remaining (excluding this device)
    await admin
      .from("user_sessions")
      .delete()
      .eq("user_id", userId)
      .lt("expires_at", new Date().toISOString());

    const { count } = await admin
      .from("user_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("device_fingerprint", deviceFingerprint);

    if ((count ?? 0) >= 2) {
      return NextResponse.json(
        { error: "Maximum devices reached. Please log out from another device first." },
        { status: 403 }
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 15 : 1));

    await admin.from("user_sessions").upsert(
      {
        user_id: userId,
        device_fingerprint: deviceFingerprint,
        last_active: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "user_id,device_fingerprint" }
    );

    // Apply auth cookies to the response
    const response = NextResponse.json({ ok: true });
    pendingCookies.forEach(({ name, value, options }) => {
      const opts = rememberMe ? options : { ...options, maxAge: undefined };
      response.cookies.set(name, value, opts as never);
    });
    return response;
  } catch (err) {
    console.error("[/api/auth/login]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
