import { getMyDeadline } from "@/app/actions/contracts";
import DeadlineBar from "./DeadlineBar";

/**
 * Your clock, wherever you are. Every page in the app mounts this — the one
 * exception is settings, which is the only place you go to step out of the
 * app rather than work in it.
 *
 * It renders nothing at all when you have no live contract, so pages do not
 * have to ask whether you are signed in before mounting it.
 */
export default async function Tape({ hideLink = false }: { hideLink?: boolean }) {
    const deadline = await getMyDeadline();
    return <DeadlineBar deadline={deadline} hideLink={hideLink} />;
}
