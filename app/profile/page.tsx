import { redirect } from "next/navigation";

export default function ProfileRedirect() {
    // Redirect to the current user's profile
    // In a real app, you'd get the user ID from the session
    redirect("/profile/me");
}
