"use client";

import { useEffect, useRef, useState } from "react";
import type { ContractRecord } from "@/app/actions/contracts";
import { cadencePhrase, durationPhrase } from "@/utils/contract-shared";
import ContractDocument from "./ContractDocument";

/** One clause of the summary: a label and the promise under it. */
function Clause({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="py-4 border-b border-[var(--rule)]">
            <p className="overline">{label}</p>
            <p className="type-doc mt-1.5 leading-relaxed text-[0.8125rem]">{children}</p>
        </div>
    );
}

/**
 * The contract, beside the profile rather than inside it. The column holds
 * the terms in brief — what was promised, what counts, what it costs — and
 * the signed document itself opens over the page when asked for.
 */
export default function ContractPanel({ contract }: { contract: ContractRecord }) {
    const [open, setOpen] = useState(false);
    const closeRef = useRef<HTMLButtonElement>(null);

    // A dialog owns the escape key and the page's scroll while it is up.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        closeRef.current?.focus();
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = previous;
        };
    }, [open]);

    const promise = contract.commitment.replace(/\.+$/, "");
    const proof = contract.proofDescription
        ? contract.proofDescription.replace(/\.+$/, "")
        : "proof of my progress";
    const forfeit = contract.forfeit.replace(/\.+$/, "");

    return (
        <>
            <aside className="lg:sticky lg:top-28">
                <p className="overline border-b border-[var(--ink)] pb-3">The contract</p>

                <Clause label="The promise">I will {promise}.</Clause>
                <Clause label="The proof">
                    I will post {proof}, {cadencePhrase(contract.cadence)}.
                </Clause>
                <Clause label="The forfeit">If I break this contract, {forfeit}.</Clause>
                <Clause label="The term">
                    Signed for {durationPhrase(contract.durationDays).replace(/^for /, "")}.
                </Clause>

                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="overline nav-button w-full justify-center mt-5"
                >
                    Read the full contract →
                </button>
            </aside>

            {open && (
                <div
                    className="fixed inset-0 z-50 overflow-y-auto overscroll-contain px-4 sm:px-6 py-10"
                    style={{ background: "rgba(22, 21, 19, 0.55)" }}
                    onClick={() => setOpen(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Contract signed by ${contract.signerName}`}
                        className="w-full max-w-2xl mx-auto"
                        // The document is not the backdrop; clicks inside it stay inside.
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-end mb-3">
                            <button
                                ref={closeRef}
                                type="button"
                                onClick={() => setOpen(false)}
                                className="overline px-3 py-2"
                                style={{ color: "var(--paper)" }}
                            >
                                Close ✕
                            </button>
                        </div>
                        <div style={{ background: "var(--paper)" }}>
                            <ContractDocument contract={contract} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
