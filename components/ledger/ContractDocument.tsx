import SignatureReplay from "./SignatureReplay";
import { cadencePhrase, durationPhrase, filedUnder, socialLabel } from "@/utils/contract-shared";
import type { ContractRecord } from "@/app/actions/contracts";

/**
 * A signed contract, rendered as the document it is. The signature
 * redraws itself when the document scrolls into view.
 */
export default function ContractDocument({ contract }: { contract: ContractRecord }) {
    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    return (
        <article className="paper-grain type-doc border border-[var(--ink)] p-6 sm:p-10 leading-relaxed text-[0.9375rem]">
            <h2 className="text-center font-bold tracking-[0.2em] mb-8">
                CONTRACT OF ACCOUNTABILITY
            </h2>

            <div className="flex items-start gap-4 mb-6">
                {contract.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={contract.photoUrl}
                        alt={`Photo of ${contract.signerName}`}
                        className="size-16 object-cover border border-[var(--rule)] shrink-0"
                    />
                )}
                <p>
                    I, <strong>{contract.signerName}</strong>
                    {contract.socialUrl ? (
                        <>
                            {" "}(
                            <a
                                href={contract.socialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ink-link"
                            >
                                {socialLabel(contract.socialPlatform, contract.socialHandle, contract.socialUrl)}
                            </a>
                            )
                        </>
                    ) : null}
                    , sign this contract in public, filed under{" "}
                    <strong>{filedUnder(contract.category, contract.discipline)}</strong>.
                </p>
            </div>

            <p className="mb-4">
                1. THE PROMISE. I will {contract.commitment.replace(/\.+$/, "")}.
            </p>
            <p className="mb-4">
                2. THE PROOF. I will post{" "}
                {contract.proofDescription
                    ? contract.proofDescription.replace(/\.+$/, "")
                    : "proof of my progress"}
                , {cadencePhrase(contract.cadence)}. The check runs automatically.
                Missing proof breaks this contract.
            </p>
            <p className="mb-4">
                3. THE PUNISHMENT. If I break this contract,{" "}
                {contract.forfeit.replace(/\.+$/, "")}.
            </p>
            <p className="mb-10">
                4. THE TERM. This contract takes effect on{" "}
                {formatDate(contract.effectiveAt)}, and holds me{" "}
                {durationPhrase(contract.durationDays)}
                {contract.endsAt && <>, until {formatDate(contract.endsAt)}</>}.
            </p>

            {contract.promise && (
                <p className="mb-10">
                    IN MY OWN WORDS. I promise that {contract.promise.replace(/\.+$/, "")}.
                </p>
            )}

            <div className="border-t border-[var(--rule)] pt-6">
                <SignatureReplay strokes={contract.strokes} className="w-56 text-[var(--ink)]" />
                <p className="mt-2">
                    {contract.signerName},{" "}
                    {new Date(contract.createdAt).toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                    })}
                </p>
            </div>
        </article>
    );
}
