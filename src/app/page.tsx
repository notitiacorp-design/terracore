import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createServerComponentClient({ cookies });

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