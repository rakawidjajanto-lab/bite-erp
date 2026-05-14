import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { deviceFingerprint } = await req.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    if (deviceFingerprint) {
      await admin
        .from("user_sessions")
        .delete()
        .eq("user_id", user.id)
        .eq("device_fingerprint", deviceFingerprint);
    } else {
      await admin.from("user_sessions").delete().eq("user_id", user.id);
    }
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
