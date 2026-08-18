import SignatureReplay from "./SignatureReplay";
import Avatar from "./Avatar";
import { cadencePhrase, durationPhrase, filedUnder, socialLabel } from "@/utils/contract-shared";
import { atHandle } from "@/utils/identity";
import type { ContractRecord } from "@/app/actions/contracts";

/**
 * A signed contract, rendered as the document it is.
 *
 * It has two faces. While the contract holds, it is signed by a username
 * and the signature block is a sealed panel. Once it is breached the
 * seal is off and the document shows what was underneath all along: the
 * real name, the face, and the signature, redrawn as it was written.
 */
export default function ContractDocument({ contract }: { contract: ContractRecord }) {
    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const revealed = contract.revealed;
    const handle = atHandle(contract.username);

    return (
        <article className="paper-grain type-doc border border-[var(--ink)] p-6 sm:p-10 leading-relaxed text-[0.9375rem]">
            <h2 className="text-center font-bold tracking-[0.2em] mb-8">
                CONTRACT OF ACCOUNTABILITY
            </h2>

            <div className="flex items-start gap-4 mb-6">
                {revealed && contract.faceUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={contract.faceUrl}
                        alt={`Photo of ${contract.realName}`}
                        className="size-16 object-cover border border-[var(--rule)] shrink-0"
                    />
                ) : (
                    <Avatar username={contract.username} avatarUrl={contract.avatarUrl} size={64} />
                )}
                <p>
                    I,{" "}
                    {revealed && contract.realName ? (
                        <>
                            <strong>{contract.realName}</strong>, known here as{" "}
                            <strong>{handle}</strong>
                        </>
                    ) : (
                        <strong>{handle}</strong>
                    )}
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
                {revealed ? (
                    <>
                        <SignatureReplay strokes={contract.strokes} className="w-56 text-[var(--ink)]" />
                        <p className="mt-2">
                            {contract.realName || handle},{" "}
                            {formatDate(contract.createdAt)}
                        </p>
                    </>
                ) : (
                    // People sign their own name, so the strokes are as
                    // identifying as the name itself. They are not sent to
                    // the browser at all while the contract holds.
                    <div
                        className="border border-dashed border-[var(--rule)] px-4 py-5 text-center"
                        aria-label="The signature on this contract is sealed"
                    >
                        <p className="overline" style={{ color: "var(--stamp-red)" }}>
                            Signed and sealed
                        </p>
                        <p className="mt-2 text-[var(--ink-soft)]">
                            A real name, a face and a signature are held behind this contract. They will be published only if the contract is broken.
                        </p>
                    </div>
                )}
                <p className="mt-3 overline">
                    Filed by {handle}, {formatDate(contract.createdAt)}
                </p>
            </div>
        </article>
    );
}
