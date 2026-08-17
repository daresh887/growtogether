import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getProfile } from "@/app/actions/profile";
import LedgerHeader from "@/components/ledger/LedgerHeader";
import SettingsActions from "./SettingsActions";
import ProfileEditor from "./ProfileEditor";

export const metadata = { title: "Settings: LockIn Buddy" };

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=/settings");

    const profile = await getProfile();

    return (
        <div className="ledger min-h-dvh flex flex-col">
            <LedgerHeader signedIn current="settings" />

            <main className="flex-1 w-full max-w-xl mx-auto px-6 pt-16 sm:pt-20 pb-24">
                <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-12">
                    Settings.
                </h1>

                <p className="overline mb-2 border-b border-[var(--ink)] pb-3">Your profile</p>
                <ProfileEditor avatarUrl={profile?.avatar_url || ""} bio={profile?.bio || ""} />

                <p className="overline mt-16 mb-2 border-b border-[var(--ink)] pb-3">Your account</p>
                <div className="py-5 border-b border-[var(--rule)]">
                    <p className="type-doc">{user.email}</p>
                    <p className="overline mt-2">Signed in</p>
                </div>
                <SettingsActions email={user.email || ""} />
            </main>
        </div>
    );
}
