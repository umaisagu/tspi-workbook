import { redirectToOwnTeam } from "@/lib/server/team-page";

export default async function TeamShortcut() {
  return redirectToOwnTeam("");
}
