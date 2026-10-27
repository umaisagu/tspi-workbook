import { describe, expect, it } from "vitest";
import { checkRoster, leavesTeamWithoutLeader, type RosterMember } from "./roles";

const five: RosterMember[] = [
  { membershipId: "1", name: "Aina", roles: ["TEAM_LEADER"] },
  { membershipId: "2", name: "Ben", roles: ["DEVELOPMENT_MANAGER"] },
  { membershipId: "3", name: "Chong", roles: ["PLANNING_MANAGER"] },
  { membershipId: "4", name: "Dayang", roles: ["QUALITY_PROCESS_MANAGER"] },
  { membershipId: "5", name: "Elan", roles: ["SUPPORT_MANAGER"] },
];

describe("checkRoster", () => {
  it("accepts a complete 5-member team", () => {
    expect(checkRoster(five)).toEqual({ errors: [], warnings: [] });
  });
  it("lets one role be shared in a 6-member team", () => {
    const six = [...five, { membershipId: "6", name: "Faiz", roles: ["DEVELOPMENT_MANAGER" as const] }];
    expect(checkRoster(six).errors).toEqual([]);
  });
  it("rejects sharing in a 5-member team", () => {
    const team = five.map((m, i) => (i === 4 ? { ...m, roles: ["TEAM_LEADER" as const] } : m));
    expect(checkRoster(team).errors).toContain("A role can only be shared in a 6-member team.");
  });
  it("rejects two shared roles or a role held by three", () => {
    const six: RosterMember[] = [
      ...five.slice(0, 4),
      { membershipId: "5", name: "Elan", roles: ["TEAM_LEADER"] },
      { membershipId: "6", name: "Faiz", roles: ["DEVELOPMENT_MANAGER"] },
    ];
    expect(checkRoster(six).errors.some((e) => e.startsWith("Only one role may be shared"))).toBe(true);
    const three = [...five, { membershipId: "6", name: "Faiz", roles: ["TEAM_LEADER" as const] }].map((m) =>
      m.membershipId === "2" ? { ...m, roles: ["TEAM_LEADER" as const] } : m,
    );
    expect(checkRoster(three).errors.some((e) => e.includes("held by 3 members"))).toBe(true);
  });
  it("warns about gaps while the team is being formed", () => {
    const r = checkRoster([{ membershipId: "1", name: "Aina", roles: [] }]);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toContain("Aina has no TSPi role.");
    expect(r.warnings).toContain("Team Leader is not assigned yet.");
    expect(r.warnings).toContain("Teams have 5-6 members; this team has 1.");
  });
});

describe("leavesTeamWithoutLeader", () => {
  it("detects a team with members but no leader", () => {
    expect(leavesTeamWithoutLeader(five)).toBe(false);
    expect(leavesTeamWithoutLeader(five.slice(1))).toBe(true);
    expect(leavesTeamWithoutLeader([])).toBe(false);
  });
});
