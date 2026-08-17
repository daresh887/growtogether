import Link from "next/link";

/**
 * The frame every auth page sits in: wordmark, one narrow column.
 */
export default function AuthShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="ledger min-h-dvh flex flex-col">
            <header className="px-6 sm:px-10 pt-8">
                <Link href="/" className="font-semibold tracking-tight">
                    LockIn Buddy
                </Link>
            </header>
            <main className="flex-1 w-full max-w-sm mx-auto px-6 py-20 sm:py-28">{children}</main>
        </div>
    );
}
