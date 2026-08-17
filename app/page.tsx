import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { filedUnder } from "@/utils/contract-shared";
import { DEMO_GAVE_UP, DEMO_LANDING_POSTS } from "@/utils/demo-data";
import { Stamp, StampFilter } from "@/components/ledger/Stamp";
import LedgerHeader from "@/components/ledger/LedgerHeader";
import ProofEntry from "@/components/ledger/ProofEntry";

export const metadata = {
    title: "LockIn Buddy",
    description:
        "Sign a contract with your name and face on it. Commit to one thing and post proof. Give up, and you're publicly humiliated.",
};

const ROTATIONS = [-6, -4, -8];

/**
 * The front page: one plain explanation, a failure, and proof. Everything
 * shown here is a hardcoded demo cast — the landing always looks alive and
 * always tells the same story, and none of it appears in the real feed.
 * Members skip straight to the feed.
 */
export default async function Landing() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/feed");

    const gaveUp = DEMO_GAVE_UP;
    const popular = DEMO_LANDING_POSTS;

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

    return (
        <div className="ledger min-h-dvh flex flex-col">
            <StampFilter />
            <LedgerHeader signedIn={false} />

            <main className="flex-1 w-full max-w-2xl mx-auto px-6">
                {/* ============ The pitch, in full ============ */}
                <section className="pt-20 sm:pt-28 pb-16 sm:pb-20">
                    <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
                        Stay committed.
                        <br />
                        Or get publicly humiliated.
                    </h1>

                    <p className="mt-8 max-w-xl leading-relaxed text-[var(--ink-soft)]">
                        Sign a contract with your name and your face on it, commit
                        to one thing, and post proof that you&rsquo;re doing it. If you
                        give up, you&rsquo;re published on the front page where everybody will see that you failed. 
                    </p>

                    <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                        <Link href="/lock-in" className="btn-ink">
                            Sign the contract
                        </Link>
                        <a href="#proof" className="overline ink-link">
                            See what people post ↓
                        </a>
                    </div>
                </section>

                {/* ============ The people it happened to ============ */}
                {gaveUp.length > 0 && (
                    <section className="border-t border-[var(--rule)] py-14">
                        <p
                            className="overline mb-2 border-b pb-3"
                            style={{ color: "var(--stamp-red)", borderColor: "var(--stamp-red)" }}
                        >
                            They gave up
                        </p>
                        <ul>
                            {gaveUp.map((contract, i) => (
                                <li key={contract.id} className="py-7 border-b border-[var(--rule)] breach-entry">
                                    <div className="flex items-start gap-4">
                                        {contract.photoUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={contract.photoUrl}
                                                alt={`Photo of ${contract.signerName}`}
                                                className="size-14 object-cover border border-[var(--rule)] shrink-0"
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="overline mb-1">
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
                                            <Link
                                                href={`/contracts/${contract.id}#wall`}
                                                className="overline ink-link inline-block mt-3"
                                            >
                                                Humiliate them →
                                            </Link>
                                        </div>
                                        <Stamp tone="red" rotate={ROTATIONS[i % ROTATIONS.length]}>
                                            Failed
                                        </Stamp>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* ============ The feed, live ============ */}
                <section id="proof" className="border-t border-[var(--rule)] py-14 sm:py-16">
                    <div className="flex items-baseline justify-between gap-6 border-b border-[var(--ink)] pb-3">
                        <p className="overline" style={{ color: "var(--ink)" }}>
                            What people are posting
                        </p>
                    </div>

                    {popular.length === 0 ? (
                        <p className="type-doc leading-relaxed py-10">
                            No posts yet. The first name here could be yours.
                        </p>
                    ) : (
                        <ul>
                            {popular.map((entry) => (
                                // Demo posts: real-looking, but nobody to click through to.
                                <ProofEntry key={entry.id} entry={entry} linkAuthor={false} />
                            ))}
                        </ul>
                    )}
                </section>

                {/* ============ Closing ============ */}
                <section className="border-t border-[var(--rule)] py-16 sm:py-20 text-center">
                    <Link href="/lock-in" className="btn-ink">
                        Sign the contract
                    </Link>
                </section>
            </main>

            <footer className="px-6 sm:px-10 py-8 border-t border-[var(--rule)]">
                <p className="overline">LockIn Buddy</p>
            </footer>
        </div>
    );
}
