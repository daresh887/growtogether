import { getProfile } from "@/app/actions/profile";
import Tape from "@/components/ledger/Tape";
import SignRitual from "./SignRitual";

export const metadata = {
    title: "Lock in",
};

export default async function LockInPage() {
    const profile = await getProfile();
    return (
        <>
            {/* The ritual draws its own page, so the tape gets its own strip of
                ledger above it. It renders nothing unless a contract is live. */}
            <div className="ledger">
                <Tape />
            </div>
            <SignRitual
                defaultFullName={profile?.display_name || ""}
                defaultAvatarUrl={profile?.avatar_url || ""}
            />
        </>
    );
}
