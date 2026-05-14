import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = rememberMe ? options : { ...options, maxAge: undefined };
            cookieStore.set(name, value, opts);
          });
        },
      },
    }
  );

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Invalid credentials" },
      { status: 401 }
    );
  }

  const userId = authData.user.id;

  const admin = createAdminClient();

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
    await supabase.auth.signOut();
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

  return NextResponse.json({ ok: true });
}
