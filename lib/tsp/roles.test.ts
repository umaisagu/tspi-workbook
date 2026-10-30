import { describe, expect, it } from "vitest";
import { checkRoster, leavesTeamWithoutLeader, type RosterMember } from "./roles";

const five: RosterMember[] = [
  { membershipId: "1", name: "Aina", roles: ["TEAM_LEADER", "SUPPORT_MANAGER"] },
  { membershipId: "2", name: "Ben", roles: ["DEVELOPMENT_MANAGER"] },
  { membershipId: "3", name: "Chong", roles: ["PLANNING_MANAGER"] },
  { membershipId: "4", name: "Dayang", roles: ["QUALITY_PROCESS_MANAGER"] },
  { membershipId: "5", name: "Elan", roles: ["PRODUCT_OWNER"] },
];
const six: RosterMember[] = [
  { ...five[0]!, roles: ["TEAM_LEADER"] },
  ...five.slice(1),
  { membershipId: "6", name: "Faiz", roles: ["SUPPORT_MANAGER"] },
];

describe("checkRoster (v3.0 rotation rule)", () => {
  it("accepts six roles in a 5-member team with exactly one double", () => {
    expect(checkRoster(five)).toEqual({ errors: [], warnings: [] });
  });
  it("accepts a 6-member team with one role each", () => {
    expect(checkRoster(six)).toEqual({ errors: [], warnings: [] });
  });
  it("rejects a role with two holders", () => {
    const team = six.map((m) => (m.membershipId === "6" ? { ...m, roles: ["DEVELOPMENT_MANAGER" as const] } : m));
    expect(checkRoster(team).errors).toContain("Development Manager is held by Ben and Faiz; each role has one holder.");
  });
  it("rejects a member with three roles", () => {
    const team = five.map((m) => (m.membershipId === "1" ? { ...m, roles: ["TEAM_LEADER", "SUPPORT_MANAGER", "PRODUCT_OWNER"] as const } : m));
    expect(checkRoster(team).errors).toContain("Aina holds 3 roles; nobody holds more than 2.");
  });
  it("warns when the number of doubles does not match the team size", () => {
    const sixWithDouble = six.map((m) => (m.membershipId === "6" ? { ...m, roles: [] } : m)).map((m) =>
      m.membershipId === "1" ? { ...m, roles: ["TEAM_LEADER", "SUPPORT_MANAGER"] as const } : m,
    );
    expect(checkRoster(sixWithDouble).warnings).toEqual(["Faiz has no TSPi role.", "In a 6-member team each member holds one role (1 hold two)."]);
    const noDouble = five.map((m) => (m.membershipId === "1" ? { ...m, roles: ["TEAM_LEADER"] as const } : m));
    expect(checkRoster(noDouble).warnings).toEqual(["Support Manager is not assigned yet.", "In a 5-member team exactly 1 member holds two roles (now 0)."]);
  });
  it("warns about gaps while the team is being formed", () => {
    const r = checkRoster([{ membershipId: "1", name: "Aina", roles: [] }]);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toContain("Aina has no TSPi role.");
    expect(r.warnings).toContain("Team Leader is not assigned yet.");
    expect(r.warnings).toContain("Product Owner is not assigned yet.");
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
