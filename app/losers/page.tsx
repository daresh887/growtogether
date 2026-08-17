import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getBreachedContracts } from "@/app/actions/contracts";
import { filedUnder } from "@/utils/contract-shared";
import { Stamp, StampFilter } from "@/components/ledger/Stamp";
import SignatureReplay from "@/components/ledger/SignatureReplay";
import LedgerHeader from "@/components/ledger/LedgerHeader";
import Tape from "@/components/ledger/Tape";

export const metadata = {
    title: "The losers: LockIn Buddy",
    description:
        "The people who signed with their names and faces, promised proof, and stopped.",
};

// Stamps land at slightly different angles, like a real ledger
const ROTATIONS = [-6, -4, -8, -5, -7];

/**
 * The losers get their own room. The feed is for people doing the work;
 * this page is for everyone who signed with their face and stopped.
 */
export default async function Losers() {
    const supabase = await createClient();
    const [{ data: { user } }, losers] = await Promise.all([
        supabase.auth.getUser(),
        getBreachedContracts(60),
    ]);

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

    return (
        <div className="ledger min-h-dvh flex flex-col">
            <StampFilter />
            <Tape />
            <LedgerHeader signedIn={!!user} />

            <main className="flex-1 w-full max-w-2xl mx-auto px-6 pt-12 sm:pt-16 pb-24">
                <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">The losers.</h1>
                <p className="mt-5 max-w-xl leading-relaxed text-[var(--ink-soft)]">
                    Everyone here signed a contract with their name and their face on it,
                    promised to post proof, and stopped. This is the punishment they
                    agreed to.
                </p>

                {losers.length === 0 ? (
                    <p className="type-doc leading-relaxed mt-14 border-t border-[var(--rule)] pt-10">
                        Nobody has failed yet. Give it time.
                    </p>
                ) : (
                    <ul className="mt-12 border-t-2" style={{ borderColor: "var(--stamp-red)" }}>
                        {losers.map((contract, i) => (
                            <li key={contract.id} className="py-8 border-b border-[var(--rule)] breach-entry">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                                    <div className="flex-1 min-w-0 flex gap-4">
                                        {contract.photoUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={contract.photoUrl}
                                                alt={`Photo of ${contract.signerName}`}
                                                className="size-14 object-cover border border-[var(--rule)] shrink-0"
                                            />
                                        )}
                                        <div className="min-w-0">
                                            <p className="overline mb-2">
                                                {formatDate(contract.breachedAt || contract.createdAt)} ·{" "}
                                                {filedUnder(contract.category, contract.discipline)}
                                            </p>
                                            <Link
                                                href={`/contracts/${contract.id}`}
                                                className="text-lg font-semibold ink-link"
                                            >
                                                <span className="strike-target">{contract.signerName}</span>
                                            </Link>
                                            <p className="type-doc mt-2 leading-relaxed text-[0.9375rem]">
                                                Signed to {contract.commitment.replace(/\.+$/, "")}. Stopped.
                                            </p>
                                            {contract.promise && (
                                                <div
                                                    className="mt-4 border-l-2 pl-4"
                                                    style={{ borderColor: "var(--stamp-red)" }}
                                                >
                                                    <p className="overline" style={{ color: "var(--stamp-red)" }}>
                                                        The promise they broke
                                                    </p>
                                                    <p className="type-doc mt-1 leading-relaxed text-[0.9375rem]">
                                                        “I promise that {contract.promise.replace(/\.+$/, "")}.”
                                                    </p>
                                                </div>
                                            )}
                                            <Link
                                                href={`/contracts/${contract.id}#wall`}
                                                className="btn-red inline-block mt-5"
                                            >
                                                Humiliate them
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="flex sm:flex-col items-center sm:items-end gap-5 shrink-0 sm:w-52">
                                        <Stamp tone="red" rotate={ROTATIONS[i % ROTATIONS.length]}>
                                            Failed
                                        </Stamp>
                                        {/* The signature that meant nothing, at full size. */}
                                        <SignatureReplay
                                            strokes={contract.strokes}
                                            className="w-40 sm:w-52 text-[var(--ink)]"
                                        />
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    );
}
