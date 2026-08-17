"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMyFaceUrl, signContract, uploadFacePhoto } from "@/app/actions/contracts";
import { isUsernameAvailable, uploadProfileImage } from "@/app/actions/profile";
import { atHandle, validateUsername } from "@/utils/identity";
import Avatar from "@/components/ledger/Avatar";
import ImageCropper from "@/components/ledger/ImageCropper";
import {
    CADENCES,
    CATEGORIES,
    DURATIONS,
    SOCIAL_PLATFORMS,
    cleanHandle,
    MAX_DURATION_DAYS,
    MIN_DURATION_DAYS,
    PUNISHMENT_TERMS,
    STANDARD_PENALTY,
    cadencePhrase,
    cadenceSpec,
    categoryBlurb,
    commitmentPrompt,
    durationPhrase,
    filedUnder,
    socialLabel,
    type Cadence,
    type CategorySlug,
} from "@/utils/contract-shared";
import { Stamp, StampFilter } from "@/components/ledger/Stamp";
import SignatureCanvas, { type SignatureStrokes } from "@/components/ledger/SignatureCanvas";

type Props = {
    defaultFullName: string;
    /** Seeds the public picture only. The sealed face is never prefilled —
     *  it has to be a photo they consciously put behind the contract. */
    defaultAvatarUrl: string;
    // Seeds the flow at a given step with terms filled in (previews/tests)
    prefill?: {
        step: number;
        category?: CategorySlug;
        fullName?: string;
        username?: string;
        photoUrl?: string;
        socialHandle?: string;
        commitment?: string;
        proofDescription?: string;
    };
};

/** What we currently know about the typed username. */
type UsernameState =
    | { kind: "idle" }
    | { kind: "checking" }
    | { kind: "free" }
    | { kind: "taken" }
    | { kind: "invalid"; reason: string };

const STEPS = ["The category", "Who you are", "The commitment", "The punishment", "Lock in"];

const HOUSE_RULES = [
    "You sign a contract that says what you will do.",
    "It takes effect today. Your first post is your introduction.",
    "After that you post proof of your progress, as often as the contract says.",
    "Everyone sees your username. Nobody sees your real name or your face.",
    "If you stop, the seal comes off and both are published here.",
];

const ACK_PHRASE = "I understand";

export default function SignRitual({ defaultFullName, defaultAvatarUrl, prefill }: Props) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState(prefill?.step ?? 0);
    const [category, setCategory] = useState<CategorySlug | null>(prefill?.category ?? null);
    const [discipline, setDiscipline] = useState("");
    // Two fields, because a legal name has two halves and asking for them
    // separately is what makes "your real name" unambiguous. The contract
    // itself still carries one line of text.
    const prefilledName = (prefill?.fullName ?? defaultFullName).trim().replace(/\s+/g, " ");
    const [firstName, setFirstName] = useState(prefilledName.split(" ")[0] || "");
    const [lastName, setLastName] = useState(prefilledName.split(" ").slice(1).join(" "));

    // --- Public identity ---
    const [username, setUsername] = useState(prefill?.username ?? "");
    const [usernameState, setUsernameState] = useState<UsernameState>({ kind: "idle" });
    /** "" is a real answer here: no profile picture at all. */
    const [avatarUrl, setAvatarUrl] = useState(prefill?.photoUrl ?? defaultAvatarUrl);
    const [socialPlatformId, setSocialPlatformId] = useState(SOCIAL_PLATFORMS[0].id);
    const [socialHandle, setSocialHandle] = useState(prefill?.socialHandle ?? "");

    // --- Sealed identity ---
    /** A path in the private bucket. There is no public URL for this. */
    const [facePath, setFacePath] = useState("");
    /** A short-lived signed URL, so they can see what they uploaded. */
    const [facePreview, setFacePreview] = useState("");
    /** Kept so "use it as my picture too" does not need a second crop. */
    const [faceFile, setFaceFile] = useState<File | null>(null);

    const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
    /** Which slot the image being cropped is destined for. */
    const [cropTarget, setCropTarget] = useState<"face" | "avatar">("face");
    const [uploading, setUploading] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [commitment, setCommitment] = useState(prefill?.commitment ?? "");
    const [cadence, setCadence] = useState<Cadence>("daily");
    const [proofDescription, setProofDescription] = useState(prefill?.proofDescription ?? "");
    // Term: a preset index, or "custom". Lifetime is the preset with days === null.
    const [termChoice, setTermChoice] = useState<number | "custom">(0);
    const [customDays, setCustomDays] = useState("");
    const [ackText, setAckText] = useState("");
    const [promise, setPromise] = useState("");
    const [strokes, setStrokes] = useState<SignatureStrokes>([]);
    const [signing, setSigning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sealed, setSealed] = useState<{ contractId: string; effectiveAt: string } | null>(null);

    const timezone = useMemo(
        () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        []
    );

    // Preview of the effective date — today. The server computes the real one.
    const previewEffective = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const formatDate = (d: Date) =>
        d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const today = formatDate(new Date());

    const understood =
        ackText.trim().replace(/\s+/g, " ").toLowerCase() === ACK_PHRASE.toLowerCase();

    const customDaysNumber = Number(customDays);
    const customDaysValid =
        Number.isFinite(customDaysNumber) &&
        Number.isInteger(customDaysNumber) &&
        customDaysNumber >= MIN_DURATION_DAYS &&
        customDaysNumber <= MAX_DURATION_DAYS;
    const durationDays: number | null =
        termChoice === "custom"
            ? customDaysValid
                ? customDaysNumber
                : MIN_DURATION_DAYS
            : DURATIONS[termChoice].days;
    const termReady = termChoice !== "custom" || customDaysValid;

    const currentPlatform = SOCIAL_PLATFORMS.find((p) => p.id === socialPlatformId)!;
    const cleanedHandle = cleanHandle(socialPlatformId, socialHandle);
    const handleReady =
        cleanedHandle.length >= 2 &&
        (socialPlatformId !== "website" || cleanedHandle.includes("."));

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim().replace(/\s+/g, " ");

    // The commitment step speaks the language of the register you picked.
    const prompt = commitmentPrompt(category || "");

    // Social is optional now, so it only has to be valid if they typed one.
    const socialReady = socialHandle.trim().length === 0 || handleReady;

    const identityReady =
        usernameState.kind === "free" &&
        firstName.trim().length >= 2 &&
        lastName.trim().length >= 2 &&
        facePath.length > 0 &&
        socialReady;
    const commitmentReady =
        commitment.trim().length >= 10 && proofDescription.trim().length >= 5 && termReady;
    const promiseReady = promise.trim().length >= 10;

    const pickPhoto = (target: "face" | "avatar") => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || uploading || avatarUploading) return;
        setError(null);
        setCropTarget(target);
        setPendingPhotoFile(file);
    };

    const uploadCroppedPhoto = async (cropped: File) => {
        const target = cropTarget;
        setPendingPhotoFile(null);
        setError(null);

        if (target === "avatar") {
            setAvatarUploading(true);
            try {
                const formData = new FormData();
                formData.append("file", cropped);
                setAvatarUrl(await uploadProfileImage(formData));
            } catch (err: any) {
                setError(err?.message || "Failed to upload the picture");
            } finally {
                setAvatarUploading(false);
            }
            return;
        }

        // The face goes to the private bucket and comes back as a path.
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", cropped);
            const path = await uploadFacePhoto(formData);
            setFacePath(path);
            setFaceFile(cropped);
            setFacePreview((await getMyFaceUrl(path)) || "");
        } catch (err: any) {
            setError(err?.message || "Failed to upload the photo");
        } finally {
            setUploading(false);
        }
    };

    /**
     * Reuse the sealed face as the public picture. It is uploaded a second
     * time, to the public bucket — the sealed copy stays where it is, so
     * removing the picture later does not unseal anything.
     */
    const useFaceAsAvatar = async () => {
        if (!faceFile || avatarUploading) return;
        setAvatarUploading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("file", faceFile);
            setAvatarUrl(await uploadProfileImage(formData));
        } catch (err: any) {
            setError(err?.message || "Failed to use that photo");
        } finally {
            setAvatarUploading(false);
        }
    };

    /** Checked on blur rather than per keystroke: one query, not thirty. */
    const checkUsername = async () => {
        const raw = username.trim();
        if (!raw) return setUsernameState({ kind: "idle" });

        let cleaned: string;
        try {
            cleaned = validateUsername(raw);
        } catch (err: any) {
            return setUsernameState({ kind: "invalid", reason: err?.message || "Invalid username" });
        }
        setUsername(cleaned);
        setUsernameState({ kind: "checking" });
        try {
            const free = await isUsernameAvailable(cleaned);
            setUsernameState({ kind: free ? "free" : "taken" });
        } catch {
            setUsernameState({ kind: "invalid", reason: "Could not check that username" });
        }
    };

    const handleSign = async () => {
        if (strokes.length === 0 || signing || !category) return;
        setSigning(true);
        setError(null);
        try {
            const result = await signContract({
                category,
                discipline: discipline.trim(),
                username,
                avatarUrl,
                socialPlatform: socialPlatformId,
                socialHandle: socialHandle.trim() ? cleanedHandle : "",
                realName: fullName,
                facePath,
                commitment: commitment.trim(),
                cadence,
                proofDescription: proofDescription.trim(),
                promise: promise.trim(),
                durationDays,
                strokes,
                timezone,
            });
            setSealed({ contractId: result.contractId, effectiveAt: result.effectiveAt });
            setStep(5);
        } catch (e: any) {
            setError(e?.message || "Something went wrong. The contract was not recorded.");
        } finally {
            setSigning(false);
        }
    };

    const primaryBtn =
        "bg-[var(--ink)] text-[var(--paper)] px-7 py-3 text-sm font-medium tracking-wide disabled:opacity-25 disabled:cursor-not-allowed";
    const inputCls =
        "type-doc w-full bg-transparent text-base leading-relaxed border-0 border-b border-[var(--rule)] focus:border-[var(--ink)] focus:outline-none py-2 placeholder:text-[var(--ink-soft)]";
    const textareaCls = `${inputCls} resize-none`;

    return (
        <div className="ledger min-h-dvh flex flex-col">
            <StampFilter />

            {/* Top bar */}
            <header className="flex items-baseline justify-between px-6 sm:px-10 pt-8">
                <span className="overline">Contract of accountability</span>
                {step < 5 && (
                    <Link href="/" className="overline ink-link">
                        Leave without signing
                    </Link>
                )}
            </header>

            <main className="flex-1 w-full max-w-xl mx-auto px-6 py-16 sm:py-24">
                {step < 5 && (
                    <p className="overline mb-10">
                        Step {step + 1} of {STEPS.length}: {STEPS[step]}
                    </p>
                )}

                {/* ============ Step 1: the category ============ */}
                {step === 0 && (
                    <section>
                        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                            Start your contract.
                        </h1>
                        <p className="text-[var(--ink-soft)] leading-relaxed mb-8">
                            This is how it works:
                        </p>

                        <ol className="type-doc space-y-3 mb-12">
                            {HOUSE_RULES.map((rule, i) => (
                                <li key={i} className="flex gap-4 leading-relaxed">
                                    <span className="shrink-0">§{i + 1}</span>
                                    <span>{rule}</span>
                                </li>
                            ))}
                        </ol>

                        <div className="mb-10">
                            <span className="overline block mb-1">Choose a category</span>
                            <div>
                                {CATEGORIES.map((c) => {
                                    const selected = category === c.slug;
                                    return (
                                        <button
                                            key={c.slug}
                                            type="button"
                                            onClick={() => setCategory(c.slug)}
                                            aria-pressed={selected}
                                            className={`w-full text-left py-4 border-b border-[var(--rule)] flex items-baseline gap-4 ${
                                                selected ? "border-l-2 border-l-[var(--ink)] pl-4" : "pl-0"
                                            }`}
                                            style={{ transition: "padding 0.15s ease" }}
                                        >
                                            <span className={selected ? "font-semibold" : "font-medium"}>
                                                {c.name}
                                            </span>
                                            <span className="text-sm text-[var(--ink-soft)]">
                                                {categoryBlurb(c.slug)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <label className="block mb-12">
                            <span className="overline block mb-2">Your focus</span>
                            <input
                                type="text"
                                maxLength={40}
                                value={discipline}
                                onChange={(e) => setDiscipline(e.target.value)}
                                placeholder="dropshipping, powerlifting, IELTS…"
                                className={inputCls}
                            />
                            <span className="overline block mt-2">
                                Name the exact thing you are working on
                            </span>
                        </label>

                        <button
                            className={primaryBtn}
                            disabled={!category || discipline.trim().length < 2}
                            onClick={() => setStep(1)}
                        >
                            Continue
                        </button>
                    </section>
                )}

                {/* ============ Step 2: who you are ============ */}
                {step === 1 && (
                    <section>
                        {pendingPhotoFile && (
                            <ImageCropper
                                file={pendingPhotoFile}
                                aspect={1}
                                outputWidth={600}
                                title={cropTarget === "face" ? "Frame your face" : "Frame your picture"}
                                onCancel={() => setPendingPhotoFile(null)}
                                onApply={uploadCroppedPhoto}
                            />
                        )}
                        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                            Who you are here, and who you really are.
                        </h1>
                        <p className="text-[var(--ink-soft)] leading-relaxed mb-10">
                            Everyone sees the first half. The second half is sealed against
                            the contract, and only opens if you give up.
                        </p>

                        {/* ---------- In public ---------- */}
                        <p className="overline border-b border-[var(--ink)] pb-2 mb-6">
                            In public
                        </p>

                        <label className="block mb-8">
                            <span className="overline block mb-2">Your username</span>
                            <div className="flex items-baseline gap-1 border-b border-[var(--rule)] focus-within:border-[var(--ink)]">
                                <span className="type-doc text-[var(--ink-soft)]">@</span>
                                <input
                                    type="text"
                                    maxLength={20}
                                    value={username}
                                    onChange={(e) => {
                                        setUsername(e.target.value.toLowerCase());
                                        setUsernameState({ kind: "idle" });
                                    }}
                                    onBlur={checkUsername}
                                    placeholder="whatpeoplecallyou"
                                    autoComplete="off"
                                    spellCheck={false}
                                    aria-label="Your username"
                                    className="type-doc flex-1 bg-transparent border-0 focus:outline-none py-2 placeholder:text-[var(--ink-soft)]"
                                    autoFocus
                                />
                            </div>
                            <p
                                className="text-sm mt-2"
                                style={{
                                    color:
                                        usernameState.kind === "taken" || usernameState.kind === "invalid"
                                            ? "var(--stamp-red)"
                                            : "var(--ink-soft)",
                                }}
                                aria-live="polite"
                            >
                                {usernameState.kind === "checking" && "Checking…"}
                                {usernameState.kind === "free" && `${atHandle(username)} is yours.`}
                                {usernameState.kind === "taken" && "Taken. Try another one."}
                                {usernameState.kind === "invalid" && usernameState.reason}
                                {usernameState.kind === "idle" &&
                                    "Letters, numbers and underscores. This is the name on everything you post."}
                            </p>
                        </label>

                        <div className="mb-8">
                            <span className="overline block mb-2">
                                Your picture <span className="normal-case">(optional)</span>
                            </span>
                            <div className="flex items-center gap-5 flex-wrap">
                                <Avatar username={username || "you"} avatarUrl={avatarUrl} size={80} />
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={() => avatarInputRef.current?.click()}
                                        disabled={avatarUploading}
                                        className="overline ink-link disabled:opacity-30 text-left"
                                    >
                                        {avatarUploading
                                            ? "Uploading…"
                                            : avatarUrl
                                              ? "Change picture"
                                              : "Upload a picture"}
                                    </button>
                                    {faceFile && (
                                        <button
                                            type="button"
                                            onClick={useFaceAsAvatar}
                                            disabled={avatarUploading}
                                            className="overline ink-link disabled:opacity-30 text-left"
                                        >
                                            Use my face as my picture
                                        </button>
                                    )}
                                    {avatarUrl && (
                                        <button
                                            type="button"
                                            onClick={() => setAvatarUrl("")}
                                            className="overline ink-link text-left"
                                        >
                                            Remove picture
                                        </button>
                                    )}
                                </div>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={pickPhoto("avatar")}
                                    className="hidden"
                                />
                            </div>
                            <p className="text-sm text-[var(--ink-soft)] mt-3">
                                Anything you like, or nothing at all — a letter stands in for
                                it. This is not the photo the contract holds against you.
                            </p>
                        </div>

                        <div className="mb-12">
                            <span className="overline block mb-2">
                                Where people can find you{" "}
                                <span className="normal-case">(optional, editable later)</span>
                            </span>
                            <div className="flex items-baseline gap-4">
                                <select
                                    value={socialPlatformId}
                                    onChange={(e) => setSocialPlatformId(e.target.value)}
                                    aria-label="Platform"
                                    className="type-doc bg-transparent border-0 border-b border-[var(--rule)] focus:border-[var(--ink)] focus:outline-none py-2 cursor-pointer"
                                >
                                    {SOCIAL_PLATFORMS.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="flex items-baseline gap-1 flex-1 border-b border-[var(--rule)] focus-within:border-[var(--ink)]">
                                    {currentPlatform.prefix && (
                                        <span className="type-doc text-[var(--ink-soft)]">
                                            {currentPlatform.prefix}
                                        </span>
                                    )}
                                    <input
                                        type="text"
                                        maxLength={60}
                                        value={socialHandle}
                                        onChange={(e) => setSocialHandle(e.target.value)}
                                        placeholder={currentPlatform.placeholder}
                                        aria-label="Your handle"
                                        className="type-doc flex-1 bg-transparent border-0 focus:outline-none py-2 placeholder:text-[var(--ink-soft)]"
                                    />
                                </div>
                            </div>
                            <p className="text-sm text-[var(--ink-soft)] mt-3">
                                Shown on your profile from the moment you sign. Leave it
                                empty if you would rather not.
                            </p>
                        </div>

                        {/* ---------- Under seal ---------- */}
                        <p
                            className="overline border-b pb-2 mb-4"
                            style={{ color: "var(--stamp-red)", borderColor: "var(--stamp-red)" }}
                        >
                            Under seal
                        </p>
                        <p className="type-doc leading-relaxed text-[0.9375rem] mb-8">
                            This is the part that makes the contract mean something. Nobody
                            can see it — not on the page, and not by asking the database,
                            which refuses to hand it over. It is published on the front page
                            on the day you give up, and on no other day.
                        </p>

                        {/* The one rule that costs an account rather than a form error. */}
                        <div
                            className="border-l-2 pl-4 mb-10"
                            style={{ borderColor: "var(--stamp-red)" }}
                        >
                            <p className="overline" style={{ color: "var(--stamp-red)" }}>
                                Read this before you fill it in
                            </p>
                            <p className="type-doc mt-1 leading-relaxed text-[0.9375rem]">
                                A fake name or a photo that is not you means your account is
                                removed and your contract is deleted. No warning, no appeal.
                                The whole thing only works because the person under the seal
                                is you. If you are not willing to put your real name and your
                                real face behind it, LockIn Buddy is not for you.
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-8 mb-8">
                            <label className="block">
                                <span className="overline block mb-2">First name</span>
                                <input
                                    type="text"
                                    maxLength={40}
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="Your given name"
                                    autoComplete="given-name"
                                    className={inputCls}
                                />
                            </label>
                            <label className="block">
                                <span className="overline block mb-2">Last name</span>
                                <input
                                    type="text"
                                    maxLength={40}
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="Your family name"
                                    autoComplete="family-name"
                                    className={inputCls}
                                />
                            </label>
                        </div>

                        <div className="mb-12">
                            <span className="overline block mb-2">A photo of your face</span>
                            <div className="flex items-center gap-5">
                                {facePreview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={facePreview}
                                        alt="The face you are signing with"
                                        className="size-20 object-cover border border-[var(--rule)]"
                                    />
                                ) : (
                                    <div className="size-20 border border-dashed border-[var(--rule)] flex items-center justify-center">
                                        <span className="overline">Sealed</span>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="overline ink-link disabled:opacity-30"
                                >
                                    {uploading
                                        ? "Uploading…"
                                        : facePath
                                          ? "Change photo"
                                          : "Upload a photo"}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={pickPhoto("face")}
                                    className="hidden"
                                />
                            </div>
                            <p className="text-sm text-[var(--ink-soft)] mt-3">
                                It must be a photo of you, clearly showing your face. Not a
                                logo, not a cartoon, not a stranger, not your dog. If you
                                break the contract, this is the face everyone sees.
                            </p>
                        </div>

                        {error && (
                            <p className="text-sm mb-6" style={{ color: "var(--stamp-red)" }} role="alert">
                                {error}
                            </p>
                        )}

                        <div className="flex items-center gap-8">
                            <button className="overline ink-link" onClick={() => setStep(0)}>
                                Back
                            </button>
                            <button className={primaryBtn} disabled={!identityReady} onClick={() => setStep(2)}>
                                Continue
                            </button>
                        </div>
                    </section>
                )}

                {/* ============ Step 3: the commitment ============ */}
                {step === 2 && (
                    <section>
                        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                            {prompt.heading}
                        </h1>
                        <p className="text-[var(--ink-soft)] leading-relaxed mb-10">
                            {prompt.guidance}
                        </p>

                        <label className="block mb-8">
                            <span className="overline block mb-3">Complete the sentence</span>
                            <div className="flex gap-2 items-baseline">
                                <span className="type-doc shrink-0">I will</span>
                                <textarea
                                    rows={2}
                                    maxLength={500}
                                    value={commitment}
                                    onChange={(e) => setCommitment(e.target.value)}
                                    placeholder={prompt.commitment}
                                    className={textareaCls}
                                    autoFocus
                                />
                            </div>
                        </label>

                        <label className="block mb-8">
                            <span className="overline block mb-3">What exactly will you post as proof</span>
                            <div className="flex gap-2 items-baseline">
                                <span className="type-doc shrink-0">I will post</span>
                                <textarea
                                    rows={2}
                                    maxLength={200}
                                    value={proofDescription}
                                    onChange={(e) => setProofDescription(e.target.value)}
                                    placeholder={prompt.proof}
                                    className={textareaCls}
                                />
                            </div>
                        </label>

                        <div className="mb-12">
                            <span className="overline block mb-3">How often you must post proof</span>
                            <div className="flex flex-wrap gap-x-8 gap-y-3">
                                {CADENCES.map((c) => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setCadence(c.value)}
                                        className={
                                            cadence === c.value
                                                ? "text-sm font-semibold border-b-2 border-[var(--ink)] pb-0.5"
                                                : "text-sm text-[var(--ink-soft)] pb-0.5 border-b-2 border-transparent hover:text-[var(--ink)]"
                                        }
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-12">
                            <span className="overline block mb-3">How long will your commitment be?</span>
                            <div className="flex flex-wrap gap-x-8 gap-y-3">
                                {DURATIONS.map((d, i) => (
                                    <button
                                        key={d.label}
                                        type="button"
                                        onClick={() => setTermChoice(i)}
                                        className={
                                            termChoice === i
                                                ? "text-sm font-semibold border-b-2 border-[var(--ink)] pb-0.5"
                                                : "text-sm text-[var(--ink-soft)] pb-0.5 border-b-2 border-transparent hover:text-[var(--ink)]"
                                        }
                                    >
                                        {d.label}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setTermChoice("custom")}
                                    className={
                                        termChoice === "custom"
                                            ? "text-sm font-semibold border-b-2 border-[var(--ink)] pb-0.5"
                                            : "text-sm text-[var(--ink-soft)] pb-0.5 border-b-2 border-transparent hover:text-[var(--ink)]"
                                    }
                                >
                                    Custom
                                </button>
                            </div>

                            {termChoice === "custom" && (
                                <label className="block mt-5">
                                    <span className="overline block mb-2">Number of days</span>
                                    <input
                                        type="number"
                                        min={MIN_DURATION_DAYS}
                                        max={MAX_DURATION_DAYS}
                                        value={customDays}
                                        onChange={(e) => setCustomDays(e.target.value)}
                                        placeholder={`${MIN_DURATION_DAYS} or more`}
                                        className={`${inputCls} max-w-[12rem]`}
                                        autoFocus
                                    />
                                </label>
                            )}

                            <p className="overline mt-6">
                                {termChoice === "custom" && !customDaysValid
                                    ? `The shortest contract is ${MIN_DURATION_DAYS} days`
                                    : durationDays === null
                                      ? "This contract never ends"
                                      : `Ends ${formatDate(
                                            new Date(previewEffective.getTime() + durationDays * 86_400_000)
                                        )}`}
                            </p>
                        </div>

                        <div className="flex items-center gap-8">
                            <button className="overline ink-link" onClick={() => setStep(1)}>
                                Back
                            </button>
                            <button className={primaryBtn} disabled={!commitmentReady} onClick={() => setStep(3)}>
                                Continue
                            </button>
                        </div>
                    </section>
                )}

                {/* ============ Step 4: the punishment ============ */}
                {step === 3 && (
                    <section>
                        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                            Understand the punishment.
                        </h1>
                        <p className="text-[var(--ink-soft)] leading-relaxed mb-10">
                            There is one punishment. It is not optional. If you break this
                            contract, this happens:
                        </p>

                        <ol className="type-doc space-y-4 mb-12">
                            {PUNISHMENT_TERMS.map((term, i) => (
                                <li key={i} className="flex gap-4 leading-relaxed">
                                    <span className="shrink-0">§{i + 1}</span>
                                    <span>{term}</span>
                                </li>
                            ))}
                        </ol>

                        <label className="block mb-12">
                            <span className="overline block mb-3">Now promise yourself</span>
                            <div className="flex gap-2 items-baseline">
                                <span className="type-doc shrink-0">I promise that</span>
                                <textarea
                                    rows={2}
                                    maxLength={300}
                                    value={promise}
                                    onChange={(e) => setPromise(e.target.value)}
                                    placeholder="I will commit to this and I will not break this contract"
                                    className={textareaCls}
                                />
                            </div>
                            <span className="overline block mt-2">
                                Your own words. If you fail, they are published on your page,
                                quoted back at you.
                            </span>
                        </label>

                        <div className="mb-12">
                            <span className="overline block mb-3">
                                Type “{ACK_PHRASE}” to approve
                            </span>
                            <div className="flex items-center gap-6">
                                <input
                                    type="text"
                                    maxLength={40}
                                    value={ackText}
                                    onChange={(e) => setAckText(e.target.value)}
                                    placeholder={ACK_PHRASE}
                                    className={`${inputCls} max-w-xs`}
                                    aria-label={`Type ${ACK_PHRASE} to approve the punishment`}
                                    autoFocus
                                />
                                {understood && (
                                    <Stamp slam rotate={-6}>
                                        Understood
                                    </Stamp>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <button className="overline ink-link" onClick={() => setStep(2)}>
                                Back
                            </button>
                            <button
                                className={primaryBtn}
                                disabled={!understood || !promiseReady}
                                onClick={() => setStep(4)}
                            >
                                Continue
                            </button>
                        </div>
                    </section>
                )}

                {/* ============ Step 5: lock in ============ */}
                {step === 4 && category && (
                    <section>
                        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                            Sign your contract. Then lock in.
                        </h1>
                        <p className="text-[var(--ink-soft)] leading-relaxed mb-10">
                            This contract takes effect today, the moment you sign it. There
                            is no waiting period. Before you sign it, make sure you are convinced you want to do this.
                        </p>

                        <article className="paper-grain type-doc border border-[var(--ink)] p-6 sm:p-10 leading-relaxed text-[0.9375rem] mb-10">
                            <h2 className="text-center font-bold tracking-[0.2em] mb-8">
                                CONTRACT OF ACCOUNTABILITY
                            </h2>

                            {/* Your own copy, so it shows both halves: the name and
                                face here are what the seal is holding. */}
                            <div className="flex items-start gap-4 mb-6">
                                {facePreview && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={facePreview}
                                        alt={`Photo of ${fullName}`}
                                        className="size-16 object-cover border border-[var(--rule)] shrink-0"
                                    />
                                )}
                                <p>
                                    I, <strong>{fullName}</strong>, signing publicly as{" "}
                                    <strong>{atHandle(username)}</strong>
                                    {cleanedHandle && socialHandle.trim()
                                        ? ` (${socialLabel(socialPlatformId, cleanedHandle, "")})`
                                        : ""}
                                    , sign this contract in public, filed under{" "}
                                    <strong>{filedUnder(category, discipline.trim())}</strong>.
                                </p>
                            </div>
                            <p className="mb-4 text-[var(--ink-soft)]">
                                Only {atHandle(username)} appears on this contract while it
                                holds. The name and face above are sealed until it breaks.
                            </p>

                            <p className="mb-4">
                                1. THE PROMISE. I will {commitment.trim().replace(/\.+$/, "")}.
                            </p>
                            <p className="mb-4">
                                2. THE PROOF. I will post {proofDescription.trim().replace(/\.+$/, "")},{" "}
                                {cadencePhrase(cadence)}. The check runs automatically.
                                Missing proof breaks this contract.
                            </p>
                            <p className="mb-4">
                                3. THE PUNISHMENT. If I break this contract, {STANDARD_PENALTY}.
                            </p>
                            <p className="mb-10">
                                4. THE TERM. This contract takes effect on{" "}
                                {formatDate(previewEffective)}, and holds me{" "}
                                {durationPhrase(durationDays)}
                                {durationDays !== null && (
                                    <>
                                        , until{" "}
                                        {formatDate(
                                            new Date(previewEffective.getTime() + durationDays * 86_400_000)
                                        )}
                                    </>
                                )}
                                .
                            </p>

                            <div className="border-t border-[var(--rule)] pt-6">
                                <SignatureCanvas onChange={setStrokes} />
                                <p className="mt-2">
                                    {fullName}, {today}
                                </p>
                            </div>
                        </article>

                        {error && (
                            <p className="text-sm mb-6" style={{ color: "var(--stamp-red)" }} role="alert">
                                {error}
                            </p>
                        )}

                        <div className="flex items-center gap-8">
                            <button className="overline ink-link" onClick={() => setStep(3)} disabled={signing}>
                                Back
                            </button>
                            <button
                                className={primaryBtn}
                                disabled={strokes.length === 0 || signing}
                                onClick={handleSign}
                            >
                                {signing ? "Recording…" : "Lock in"}
                            </button>
                        </div>
                    </section>
                )}

                {/* ============ Sealed ============ */}
                {step === 5 && (
                    <section className="flex flex-col items-center text-center pt-10">
                        <Stamp slam size="lg" rotate={-7} className="mb-10">
                            Locked in
                        </Stamp>
                        <p className="overline mb-3">
                            In effect from{" "}
                            {sealed ? formatDate(new Date(sealed.effectiveAt)) : formatDate(previewEffective)}
                        </p>
                        <p className="type-doc leading-relaxed max-w-sm mb-12">
                            Your contract is live as of today.
                            <br />
                            Your first task: introduce yourself. 
                        </p>
                        <button
                            className={primaryBtn}
                            onClick={() => {
                                router.push(sealed ? `/contracts/${sealed.contractId}` : "/");
                                router.refresh();
                            }}
                        >
                            Write your introduction
                        </button>
                    </section>
                )}
            </main>
        </div>
    );
}
