"use client";

import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/utils/contract-shared";

type Props = {
    category: string; // "" means all
    sort: "popular" | "new";
};

/**
 * One quiet row above the feed: sort on the left, category on the right.
 * What a category means is explained in the margin beside the feed.
 */
export default function FeedControls({ category, sort }: Props) {
    const router = useRouter();

    const navigate = (nextCategory: string, nextSort: string) => {
        const params = new URLSearchParams();
        if (nextCategory) params.set("c", nextCategory);
        if (nextSort !== "new") params.set("sort", nextSort);
        const qs = params.toString();
        router.replace(qs ? `/feed?${qs}` : "/feed");
    };

    return (
        <div className="flex items-baseline justify-between border-b border-[var(--ink)] pb-3">
            <div className="flex gap-5">
                <button
                    type="button"
                    onClick={() => navigate(category, "new")}
                    className={sort === "new" ? "overline border-b border-[var(--ink)]" : "overline ink-link"}
                    style={sort === "new" ? { color: "var(--ink)" } : undefined}
                >
                    New
                </button>
                <button
                    type="button"
                    onClick={() => navigate(category, "popular")}
                    className={sort === "popular" ? "overline border-b border-[var(--ink)]" : "overline ink-link"}
                    style={sort === "popular" ? { color: "var(--ink)" } : undefined}
                >
                    Popular
                </button>
            </div>

            <select
                value={category}
                onChange={(e) => navigate(e.target.value, sort)}
                aria-label="Filter by category"
                className="overline bg-transparent border-0 focus:outline-none cursor-pointer text-right"
            >
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                        {c.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
