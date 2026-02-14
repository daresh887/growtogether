import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import LandingPageClient from "./LandingPageClient";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  // Fetch user count
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const userCount = count || 0;

  return <LandingPageClient userCount={userCount} />;
}
