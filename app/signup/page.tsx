import { Suspense } from "react";
import AuthShell from "@/components/ledger/AuthShell";
import AuthForm from "@/components/ledger/AuthForm";

export const metadata = { title: "Create your account: LockIn Buddy" };

export default function SignUpPage() {
    return (
        <AuthShell>
            <Suspense fallback={<p className="overline">Loading</p>}>
                <AuthForm mode="signup" />
            </Suspense>
        </AuthShell>
    );
}
