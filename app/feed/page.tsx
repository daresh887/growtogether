import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import {
    getBreachedContracts,
    getCategoryFeed,
    getRecentProof,
} from "@/app/actions/contracts";
import { CATEGORIES, categorySpec } from "@/utils/contract-shared";
import { StampFilter } from "@/components/ledger/Stamp";
import LedgerHeader from "@/components/ledger/LedgerHeader";
import ProofEntry from "@/components/ledger/ProofEntry";
import FeedControls from "@/components/ledger/FeedControls";
import Tape from "@/components/ledger/Tape";

export const metadata = {
    title: "The feed: LockIn Buddy",
    description:
        "Proof of work, posted in public. Every post on every live contract, and the people who gave up.",
};

export default async function Feed({
    searchParams,
}: {
    searchParams: Promise<{ c?: string; sort?: string }>;
}) {
    const { c, sort: sortParam } = await searchParams;
    const category = CATEGORIES.some((cat) => cat.slug === c) ? (c as string) : "";
    const selectedCategory = category ? categorySpec(category) : undefined;
    // New is the default: the feed is a record of what people are doing now.
    const sort: "popular" | "new" = sortParam === "popular" ? "popular" : "new";

    const supabase = await createClient();
    const [{ data: { user } }, feed, breached] = await Promise.all([
        supabase.auth.getUser(),
        category ? getCategoryFeed(category) : getRecentProof(),
        getBreachedContracts(),
    ]);

    // Heat is scored server-side, where the engagement timestamps live.
    const posts = [...feed].sort((a, b) => {
        if (sort === "popular" && b.heat !== a.heat) return b.heat - a.heat;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return (
        <div className="ledger min-h-dvh flex flex-col">
            <StampFilter />
            <Tape />
            <LedgerHeader signedIn={!!user} current="feed" />

            <main className="flex-1 w-full max-w-2xl mx-auto px-6 pt-12 sm:pt-16 pb-24">
                {/* The losers get one line here, and a whole page of their own.
                    The feed belongs to the people still doing the work. */}
                {breached.length > 0 && (
                    <Link
                        href="/losers"
                        className="flex items-baseline justify-between gap-6 border-b pb-3 mb-10"
                        style={{ borderColor: "var(--stamp-red)" }}
                    >
                        <span className="overline" style={{ color: "var(--stamp-red)" }}>
                            {breached.length} {breached.length === 1 ? "person" : "people"} gave up
                        </span>
                        <span className="overline ink-link" style={{ color: "var(--stamp-red)" }}>
                            The losers →
                        </span>
                    </Link>
                )}

                {/* The feed keeps its own width; what a category means goes in
                    the margin beside it, where the page is empty anyway. */}
                <div className="relative">
                    <FeedControls category={category} sort={sort} />

                    {selectedCategory && (
                        <aside className="hidden xl:block absolute left-full top-0 h-full ml-10 w-56">
                            <p className="sticky top-28 type-doc leading-relaxed text-[0.8125rem] text-[var(--ink-soft)] border-l border-[var(--rule)] pl-4">
                                {selectedCategory.description} For example:{" "}
                                {selectedCategory.examples.join(", ")}.
                            </p>
                        </aside>
                    )}

                    {selectedCategory && (
                        <p className="xl:hidden mt-4 type-doc leading-relaxed text-[0.8125rem] text-[var(--ink-soft)]">
                            {selectedCategory.description} For example:{" "}
                            {selectedCategory.examples.join(", ")}.
                        </p>
                    )}

                    {posts.length === 0 ? (
                        <div className="py-16">
                            <p className="type-doc leading-relaxed">
                                No posts yet.
                                <br />
                                <Link href="/lock-in" className="ink-link">
                                    Lock in
                                </Link>{" "}
                                and be the first.
                            </p>
                        </div>
                    ) : (
                        <ul>
                            {posts.map((entry) => (
                                <ProofEntry key={entry.id} entry={entry} canComment={!!user} />
                            ))}
                        </ul>
                    )}
                </div>
            </main>
        </div>
    );
}
