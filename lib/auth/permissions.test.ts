import { describe, expect, it } from "vitest";
import {
  canAdminister,
  canComment,
  canEditIndividualForm,
  canEditTeamForms,
  canManageMonitoring,
  canManageRoster,
  canReadIndividualForm,
  canReadLecturerNotes,
  canReadPeer,
  canReadComments,
  canEditScheduleRow,
  canEditOwnTeamRow,
  canAddTeamRow,
  canDecideChange,
  canExport,
  canExportPrivate,
  canViewMonitoring,
  canViewTeam,
  type Viewer,
} from "./permissions";

const teamA = { id: "teamA", labGroupId: "g1" };
const teamB = { id: "teamB", labGroupId: "g2" };

const lecturer: Viewer = { userId: "L", appRole: "LECTURER", memberships: [], demonstratorLabGroupIds: [] };
const demoG1: Viewer = { userId: "D1", appRole: "DEMONSTRATOR", memberships: [], demonstratorLabGroupIds: ["g1"] };
const leaderA: Viewer = {
  userId: "S1",
  appRole: "STUDENT",
  memberships: [{ membershipId: "mA1", teamId: "teamA", labGroupId: "g1", roles: ["TEAM_LEADER"], active: true }],
  demonstratorLabGroupIds: [],
};
const memberA: Viewer = {
  userId: "S2",
  appRole: "STUDENT",
  memberships: [{ membershipId: "mA2", teamId: "teamA", labGroupId: "g1", roles: ["PLANNING_MANAGER"], active: true }],
  demonstratorLabGroupIds: [],
};
const formerMemberA: Viewer = {
  userId: "S3",
  appRole: "STUDENT",
  memberships: [{ membershipId: "mA3", teamId: "teamA", labGroupId: "g1", roles: ["TEAM_LEADER"], active: false }],
  demonstratorLabGroupIds: [],
};
// A student who was (wrongly) also marked demonstrator data-wise must not gain demonstrator rights.
const studentWithGroups: Viewer = { userId: "S4", appRole: "STUDENT", memberships: [], demonstratorLabGroupIds: ["g1"] };

describe("administration", () => {
  it("is lecturer only", () => {
    expect(canAdminister(lecturer)).toBe(true);
    expect(canAdminister(demoG1)).toBe(false);
    expect(canAdminister(leaderA)).toBe(false);
  });
});

describe("team visibility", () => {
  it("lecturer sees every team", () => {
    expect(canViewTeam(lecturer, teamA)).toBe(true);
    expect(canViewTeam(lecturer, teamB)).toBe(true);
  });
  it("demonstrator sees only teams in own lab groups", () => {
    expect(canViewTeam(demoG1, teamA)).toBe(true);
    expect(canViewTeam(demoG1, teamB)).toBe(false);
  });
  it("students see only their own active team", () => {
    expect(canViewTeam(memberA, teamA)).toBe(true);
    expect(canViewTeam(memberA, teamB)).toBe(false);
    expect(canViewTeam(formerMemberA, teamA)).toBe(false);
    expect(canViewTeam(studentWithGroups, teamA)).toBe(false);
  });
});

describe("roster and team-level forms", () => {
  it("team leader and lecturer manage the roster", () => {
    expect(canManageRoster(leaderA, teamA)).toBe(true);
    expect(canManageRoster(lecturer, teamA)).toBe(true);
    expect(canManageRoster(memberA, teamA)).toBe(false);
    expect(canManageRoster(demoG1, teamA)).toBe(false);
    expect(canManageRoster(formerMemberA, teamA)).toBe(false);
    expect(canManageRoster(leaderA, teamB)).toBe(false);
  });
  it("only the team leader edits team-level forms", () => {
    expect(canEditTeamForms(leaderA, teamA)).toBe(true);
    expect(canEditTeamForms(memberA, teamA)).toBe(false);
    expect(canEditTeamForms(demoG1, teamA)).toBe(false);
    expect(canEditTeamForms(lecturer, teamA)).toBe(false);
  });
});

describe("individual forms", () => {
  it("members edit only their own", () => {
    expect(canEditIndividualForm(memberA, teamA, "mA2")).toBe(true);
    expect(canEditIndividualForm(memberA, teamA, "mA1")).toBe(false);
    expect(canEditIndividualForm(leaderA, teamA, "mA2")).toBe(false);
    expect(canEditIndividualForm(lecturer, teamA, "mA2")).toBe(false);
    expect(canEditIndividualForm(demoG1, teamA, "mA2")).toBe(false);
  });
  it("owner and staff of the group can read them", () => {
    expect(canReadIndividualForm(memberA, teamA, "mA2", "LOGT")).toBe(true);
    expect(canReadIndividualForm(memberA, teamA, "mA1", "LOGT")).toBe(false);
    expect(canReadIndividualForm(demoG1, teamA, "mA1", "LOGD")).toBe(true);
    expect(canReadIndividualForm(demoG1, teamB, "mB1", "LOGD")).toBe(false);
    expect(canReadIndividualForm(lecturer, teamB, "mB1", "LOGAI")).toBe(true);
  });
  it("PEER is visible only to its author and the lecturer", () => {
    expect(canReadIndividualForm(demoG1, teamA, "mA1", "PEER")).toBe(false);
    expect(canReadPeer(memberA, "mA2")).toBe(true);
    expect(canReadPeer(memberA, "mA1")).toBe(false);
    expect(canReadPeer(leaderA, "mA2")).toBe(false);
    expect(canReadPeer(demoG1, "mA2")).toBe(false);
    expect(canReadPeer(lecturer, "mA2")).toBe(true);
  });
});

describe("comments and monitoring", () => {
  it("staff of the group comment on forms", () => {
    expect(canComment(demoG1, teamA)).toBe(true);
    expect(canComment(demoG1, teamB)).toBe(false);
    expect(canComment(lecturer, teamB)).toBe(true);
    expect(canComment(leaderA, teamA)).toBe(false);
  });
  it("students never see monitoring, flags or lecturer notes", () => {
    expect(canViewMonitoring(leaderA, "g1")).toBe(false);
    expect(canViewMonitoring(demoG1, "g1")).toBe(true);
    expect(canViewMonitoring(demoG1, "g2")).toBe(false);
    expect(canViewMonitoring(lecturer, "g2")).toBe(true);
    expect(canReadLecturerNotes(demoG1)).toBe(false);
    expect(canReadLecturerNotes(lecturer)).toBe(true);
    expect(canManageMonitoring(demoG1)).toBe(false);
  });
});

describe("comments", () => {
  it("follow the form's read access", () => {
    expect(canReadComments(memberA, teamA, "LOGT", "mA2")).toBe(true);
    expect(canReadComments(memberA, teamA, "LOGT", "mA1")).toBe(false);
    expect(canReadComments(memberA, teamA, "TASK", null)).toBe(true);
    expect(canReadComments(demoG1, teamA, "LOGD", "mA1")).toBe(true);
    expect(canReadComments(demoG1, teamA, "PEER", "mA1")).toBe(false);
    expect(canReadComments(memberA, teamA, "LOGT", null)).toBe(false);
  });
});

describe("SCHEDULE rows", () => {
  it("members edit their own row, the team leader edits any", () => {
    expect(canEditScheduleRow(memberA, teamA, "mA2")).toBe(true);
    expect(canEditScheduleRow(memberA, teamA, "mA1")).toBe(false);
    expect(canEditScheduleRow(leaderA, teamA, "mA2")).toBe(true);
    expect(canEditScheduleRow(lecturer, teamA, "mA2")).toBe(false);
    expect(canEditScheduleRow(demoG1, teamA, "mA2")).toBe(false);
    expect(canEditScheduleRow(formerMemberA, teamA, "mA3")).toBe(false);
  });
});

describe("member-owned team rows (LOGTEST, CCR)", () => {
  it("any current member adds rows; staff and former members do not", () => {
    expect(canAddTeamRow(memberA, teamA)).toBe(true);
    expect(canAddTeamRow(leaderA, teamA)).toBe(true);
    expect(canAddTeamRow(formerMemberA, teamA)).toBe(false);
    expect(canAddTeamRow(lecturer, teamA)).toBe(false);
    expect(canAddTeamRow(memberA, teamB)).toBe(false);
  });
  it("members edit their own rows, the leader any", () => {
    expect(canEditOwnTeamRow(memberA, teamA, "mA2")).toBe(true);
    expect(canEditOwnTeamRow(memberA, teamA, "mA1")).toBe(false);
    expect(canEditOwnTeamRow(leaderA, teamA, "mA2")).toBe(true);
    expect(canEditOwnTeamRow(demoG1, teamA, "mA2")).toBe(false);
  });
  it("only the team leader decides change requests", () => {
    expect(canDecideChange(leaderA, teamA)).toBe(true);
    expect(canDecideChange(memberA, teamA)).toBe(false);
    expect(canDecideChange(lecturer, teamA)).toBe(false);
  });
});

describe("exports", () => {
  it("staff export their teams; PEER and contribution reports are lecturer only", () => {
    expect(canExport(lecturer, teamB)).toBe(true);
    expect(canExport(demoG1, teamA)).toBe(true);
    expect(canExport(demoG1, teamB)).toBe(false);
    expect(canExport(leaderA, teamA)).toBe(false);
    expect(canExport(memberA, teamA)).toBe(false);
    expect(canExportPrivate(lecturer)).toBe(true);
    expect(canExportPrivate(demoG1)).toBe(false);
    expect(canExportPrivate(leaderA)).toBe(false);
  });
});
