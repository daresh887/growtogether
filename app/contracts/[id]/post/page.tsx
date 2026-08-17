import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getContract } from "@/app/actions/contracts";
import { cadencePhrase } from "@/utils/contract-shared";
import { StampFilter } from "@/components/ledger/Stamp";
import LedgerHeader from "@/components/ledger/LedgerHeader";
import Tape from "@/components/ledger/Tape";
import CheckinComposer from "../CheckinComposer";
import IntroGuide from "../IntroGuide";

export const metadata = {
    title: "Post proof: LockIn Buddy",
};

/**
 * The desk. Writing a post is a different job from reading your profile, so
 * it is a different page: nothing here but the clock, what you promised, and
 * the box you write in. A profile with no posts owes an introduction, and the
 * guide takes the page over until it is filed.
 */
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const supabase = await createClient();
    const [{ data: { user } }, data] = await Promise.all([
        supabase.auth.getUser(),
        getContract(id),
    ]);

    if (!data) notFound();
    const { contract, checkins, isOwner } = data;

    // Only the signer posts to their own profile, and only while it is live.
    if (!isOwner || contract.status !== "active") redirect(`/contracts/${id}`);

    const owesIntro = checkins.length === 0;
    const profile = `/contracts/${id}`;

    const startedOn = new Date(contract.effectiveAt).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div className="ledger min-h-dvh flex flex-col">
            <StampFilter />
            {/* No link on the tape: this is where the link goes. */}
            <Tape hideLink />
            <LedgerHeader signedIn={!!user} current="post" />

            <main className="flex-1 w-full max-w-2xl mx-auto px-6 pt-10 sm:pt-14 pb-24">
                <div className="mt-8">
                    {owesIntro ? (
                        <IntroGuide
                            contractId={contract.id}
                            cadence={contract.cadence}
                            proofDescription={contract.proofDescription}
                            discipline={contract.discipline}
                            startedOn={startedOn}
                            returnTo={profile}
                        />
                    ) : (
                        <>
                            <h1 className="text-3xl font-semibold tracking-tight border-b border-[var(--ink)] pb-3">
                                Post proof
                            </h1>

                            {/* What you signed up for, in front of you while you write. */}
                            <div className="mt-8 mb-10 border-l-2 border-[var(--ink)] pl-4">
                                <p className="overline">The proof you promised</p>
                                <p className="type-doc mt-1 leading-relaxed text-[0.9375rem]">
                                    I will post{" "}
                                    {contract.proofDescription
                                        ? contract.proofDescription.replace(/\.+$/, "")
                                        : "proof of my progress"}
                                    , {cadencePhrase(contract.cadence)}.
                                </p>
                            </div>

                            <CheckinComposer
                                contractId={contract.id}
                                returnTo={profile}
                                autoFocus
                            />
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
