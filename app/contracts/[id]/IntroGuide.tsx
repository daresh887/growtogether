"use client";

import { useState } from "react";
import { cadencePhrase, cadenceSpec } from "@/utils/contract-shared";
import CheckinComposer from "./CheckinComposer";

type Props = {
    contractId: string;
    cadence: string;
    proofDescription: string;
    discipline: string;
    /** Already formatted server-side, so the date reads the same on both sides. */
    startedOn: string;
    /** Where the filed introduction lands you: your profile, opened. */
    returnTo: string;
};

const INTRO_PROMPTS = [
    "Who you are, and what you are working on.",
    "Where you are starting from today. Numbers, if you have them.",
    "Why you signed. The thing you want to stop failing at.",
];

/**
 * The first post is an introduction, and nobody knows that until they are
 * told. This walks a fresh signer through what the contract now demands,
 * then hands them the composer with the introduction already framed.
 * It owns the posting page until the profile has its first post, so leaving
 * and coming back does not lose the thread.
 */
export default function IntroGuide({
    contractId,
    cadence,
    proofDescription,
    discipline,
    startedOn,
    returnTo,
}: Props) {
    const [step, setStep] = useState(0);
    const last = 2;

    const primaryBtn = "btn-ink";

    return (
        <section>
            <div className="flex items-baseline justify-between gap-6 border-b border-[var(--ink)] pb-3 mb-10">
                <span className="overline">
                    First post · step {step + 1} of {last + 1}
                </span>
                {step < last && (
                    <button className="overline ink-link" onClick={() => setStep(last)}>
                        Skip to writing
                    </button>
                )}
            </div>

            {step === 0 && (
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight mb-3">
                        Your contract is in effect.
                    </h2>
                    <p className="type-doc leading-relaxed mb-4">
                        It started on {startedOn}. The
                        timer above this guide is already running.
                    </p>
                    <p className="type-doc leading-relaxed mb-8">
                        You must post {cadencePhrase(cadence)}.{" "}
                        Remember, if the timer runs out, your contract is breached and your name,
                        your face, and your terms go on the front page.
                    </p>
                    <button className={primaryBtn} onClick={() => setStep(1)}>
                        Next
                    </button>
                </div>
            )}

            {step === 1 && (
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight mb-3">
                        What counts as proof.
                    </h2>
                    <p className="type-doc leading-relaxed mb-4">
                        You set the bar yourself when you signed:
                    </p>
                    <p className="type-doc leading-relaxed border-l-2 border-[var(--ink)] pl-4 mb-4">
                        I will post{" "}
                        {proofDescription
                            ? proofDescription.replace(/\.+$/, "")
                            : "proof of my progress"}
                        .
                    </p>
                    <p className="type-doc leading-relaxed mb-8">
                        Write what you actually did, and add photos when you have them.
                        Screenshots are hard to argue with. Everything you post is public
                        and stays on your profile.
                    </p>
                    <div className="flex items-center gap-8">
                        <button className="overline ink-link" onClick={() => setStep(0)}>
                            Back
                        </button>
                        <button className={primaryBtn} onClick={() => setStep(2)}>
                            Next
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight mb-3">
                        Now introduce yourself.
                    </h2>
                    <p className="type-doc leading-relaxed mb-6">
                        Your first post opens your profile. Cover
                        these three:
                    </p>

                    <ol className="type-doc space-y-3 mb-8">
                        {INTRO_PROMPTS.map((prompt, i) => (
                            <li key={i} className="flex gap-4 leading-relaxed">
                                <span className="shrink-0">§{i + 1}</span>
                                <span>{prompt}</span>
                            </li>
                        ))}
                    </ol>

                    <CheckinComposer
                        contractId={contractId}
                        returnTo={returnTo}
                        label="Your introduction"
                        placeholder={`I'm starting ${
                            discipline || "this"
                        } today. Here is who I am, where I'm starting from, and why I signed.`}
                        submitLabel="Post your introduction"
                        busyLabel="Filing…"
                        autoFocus
                    />

                    <button className="overline ink-link" onClick={() => setStep(1)}>
                        Back
                    </button>
                </div>
            )}
        </section>
    );
}
