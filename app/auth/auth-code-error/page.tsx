"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

function ErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <Card className="max-w-sm w-full">
                <CardContent className="p-8 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-destructive" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
                    <p className="text-muted-foreground mb-8 leading-relaxed text-sm">
                        {error || "There was a problem signing you in. The link may have expired or been used already."}
                    </p>
                    <Button asChild>
                        <Link href="/login">Back to Login</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading...</div>}>
            <ErrorContent />
        </Suspense>
    );
}
