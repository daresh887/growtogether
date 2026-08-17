import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getMyContracts } from "@/app/actions/contracts";

// Your contract IS your profile: one per person, so "Your profile" in the
// header lands here, and this route forwards to it — or to the ritual if
// you have not signed one yet.
export default async function Dashboard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const contracts = await getMyContracts();
    const active = contracts.find((c) => c.status === "active");

    redirect(active ? `/contracts/${active.id}` : "/lock-in");
}
