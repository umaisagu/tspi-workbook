import { redirectToOwnTeam } from "@/lib/server/team-page";

export default async function MilestonesShortcut() {
  return redirectToOwnTeam("/milestones");
}
