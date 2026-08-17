import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getMyContracts } from "@/app/actions/contracts";

/**
 * "Post" in the header points here rather than at a contract id, so the
 * header stays a plain static link and costs no query on every page. This
 * route does the lookup once, when someone actually wants to write — and
 * sends anyone without a live contract to sign one first.
 */
export default async function PostRedirect() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=/post");

    const contracts = await getMyContracts();
    const active = contracts.find((c) => c.status === "active");

    redirect(active ? `/contracts/${active.id}/post` : "/lock-in");
}
