import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Session error on home page:", error);
    redirect("/login");
  }

  if (session) {
    redirect("/dashboard");
  }

  redirect("/login");
}
