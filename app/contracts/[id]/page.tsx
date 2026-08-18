import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getContract } from "@/app/actions/contracts";
import { getPublicProfiles } from "@/app/actions/profile";
import { getDemoProfile } from "@/utils/demo-data";
import { cadencePhrase, filedUnder, socialLabel, stampFor } from "@/utils/contract-shared";
import { atHandle } from "@/utils/identity";
import { StampFilter } from "@/components/ledger/Stamp";
import ContractPanel from "@/components/ledger/ContractPanel";
import ProfileHeader from "@/components/ledger/ProfileHeader";
import LedgerHeader from "@/components/ledger/LedgerHeader";
import Tape from "@/components/ledger/Tape";
import ProofEntry from "@/components/ledger/ProofEntry";
import Comments from "@/components/ledger/Comments";

export const metadata = {
    title: "Profile: LockIn Buddy",
};

/**
 * A profile: who signed, and everything they have posted since. The contract
 * sits beside the posts in its own column — summarised there, and opened in
 * full over the page on request. Reading only; writing happens at
 * /contracts/[id]/post.
 */
export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const supabase = await createClient();
    // The landing's demo cast lives in code, not the database; their ids can
    // never be real (real ids are UUIDs), so this branch is unambiguous.
    const demo = getDemoProfile(id);
    const [{ data: { user } }, data] = await Promise.all([
        supabase.auth.getUser(),
        demo ? Promise.resolve(demo.data) : getContract(id),
    ]);

    if (!data) notFound();
    const { contract, checkins, isOwner, wallComments } = data;
    const stamp = stampFor(contract.status, contract.effectiveAt);

    const profile = demo
        ? { avatarUrl: contract.avatarUrl, bio: demo.bio }
        : (await getPublicProfiles([contract.userId])).get(contract.userId);

    const isLive = contract.status === "active";
    const failed = contract.status === "breached";

    // Once they have failed, the header leads with the face and the name
    // that were sealed. Until then it is the picture they chose, or none.
    const headerName = contract.revealed && contract.realName
        ? contract.realName
        : atHandle(contract.username);
    const headerPhoto = contract.revealed && contract.faceUrl
        ? contract.faceUrl
        : (profile?.avatarUrl || contract.avatarUrl);

    const gaveUpOn = failed
        ? new Date(contract.breachedAt || contract.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
          })
        : null;

    return (
        <div className="ledger min-h-dvh flex flex-col">
            <StampFilter />
            <Tape />
            <LedgerHeader signedIn={!!user} current={isOwner ? "profile" : undefined} />

            <main className="flex-1 w-full max-w-5xl mx-auto px-6 pt-12 sm:pt-16 pb-24">
                <ProfileHeader
                    name={headerName}
                    username={contract.username}
                    avatarUrl={headerPhoto}
                    bio={profile?.bio || ""}
                    filedUnder={filedUnder(contract.category, contract.discipline)}
                    socialUrl={contract.socialUrl}
                    socialLabel={socialLabel(
                        contract.socialPlatform,
                        contract.socialHandle,
                        contract.socialUrl
                    )}
                    posts={checkins.length}
                    // Only a decided fate is worth stamping. "In effect" is noise.
                    stamp={isLive ? null : stamp}
                    failed={failed}
                />

                {failed && (
                    <section
                        id="wall"
                        className="mt-12 border-l-2 pl-6 py-2"
                        style={{ borderColor: "var(--stamp-red)" }}
                    >
                        <p className="overline" style={{ color: "var(--stamp-red)" }}>
                            Gave up{gaveUpOn ? ` · ${gaveUpOn}` : ""}
                        </p>
                        <p className="type-doc mt-3 leading-relaxed text-[0.9375rem]">
                            {contract.realName || atHandle(contract.username)}
                            {contract.realName && (
                                <>, who posted here as {atHandle(contract.username)},</>
                            )}{" "}
                            signed to &ldquo;{contract.commitment.replace(/\.+$/, "")}&rdquo;, and
                            promised proof {cadencePhrase(contract.cadence)}. They stopped.
                        </p>
                        {/* The promise they made themselves at signing, quoted back.
                            Contracts older than the promise column fall back to the
                            forfeit they approved. */}
                        <p className="type-doc mt-3 leading-relaxed text-[0.9375rem]">
                            In their own words: “
                            {contract.promise
                                ? `I promise that ${contract.promise.replace(/\.+$/, "")}`
                                : `If I break this contract, ${contract.forfeit.replace(/\.+$/, "")}`}
                            .”
                        </p>

                        <p className="overline mt-8 border-b border-[var(--rule)] pb-2">
                            Humiliate them
                            {wallComments.length > 0 && ` · ${wallComments.length}`}
                        </p>
                        <Comments
                            targetId={contract.id}
                            kind="wall"
                            comments={wallComments}
                            canComment={!!user && !demo}
                            placeholder={`Say it to ${
                                contract.realName
                                    ? contract.realName.split(" ")[0]
                                    : atHandle(contract.username)
                            }`}
                        />
                        {!user && !demo && (
                            <p className="overline mt-3">
                                Sign in to leave a comment.
                            </p>
                        )}
                    </section>
                )}

                {/* Posts lead; the contract holds the column beside them. On a
                    narrow screen the contract comes first, before the scroll. */}
                <div className="mt-12 grid gap-x-14 gap-y-12 lg:grid-cols-[minmax(0,1fr)_17rem]">
                    <section className="lg:order-1 min-w-0">


                        {checkins.length === 0 ? (
                            <p className="type-doc leading-relaxed py-8">
                                No posts yet.
                                {isOwner ? " Your first post is your introduction." : ""}
                            </p>
                        ) : (
                            <ul>
                                {checkins.map((entry) => (
                                    <ProofEntry
                                        key={entry.id}
                                        entry={{
                                            ...entry,
                                            // Posts stay under the username even after a
                                            // breach: this is the person people watched.
                                            username: contract.username,
                                            avatarUrl: profile?.avatarUrl || contract.avatarUrl,
                                            commitment: contract.commitment,
                                        }}
                                        canComment={!!user && !demo}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>

                    <div className="lg:order-2">
                        <ContractPanel contract={contract} />

                    </div>
                </div>
            </main>
        </div>
    );
}
