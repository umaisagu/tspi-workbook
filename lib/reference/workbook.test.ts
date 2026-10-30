import { describe, expect, it } from "vitest";
import { DEFECT_TYPES } from "@/lib/tsp/defects";
import { TSPI_ROLES } from "@/lib/tsp/roles";
import { REFERENCE_FILES, WORKBOOK, isReferenceFile } from "./workbook";

describe("Workbook v3.0 reference", () => {
  it("the app's defect types are the workbook's DEFECTTYPES standard", () => {
    expect(DEFECT_TYPES).toEqual(WORKBOOK.defectTypes.map((t) => ({ code: t.code, name: t.name })));
  });
  it("the app's roles are the workbook's six ROLES", () => {
    expect(TSPI_ROLES.map((r) => r.label)).toEqual(WORKBOOK.roles.map((r) => r.role));
  });
  it("has the manual's four stages, the phase standard and the sample team", () => {
    expect(WORKBOOK.manual.stages).toHaveLength(4);
    expect(WORKBOOK.manual.stages.flatMap((s) => s.steps).map((s) => s.n)).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
    expect(WORKBOOK.phases).toHaveLength(27);
    expect(WORKBOOK.milestones.map((m) => m.id)).toEqual(["M1", "M2", "M3", "M4"]);
    expect(WORKBOOK.sample.team.name).toBe("AUV");
    expect(WORKBOOK.sample.members).toHaveLength(5);
  });
  it("only serves the two workbook files", () => {
    expect(isReferenceFile("sample")).toBe(true);
    expect(isReferenceFile("../.env")).toBe(false);
    expect(isReferenceFile("toString")).toBe(false);
    expect(Object.values(REFERENCE_FILES).every((f) => f.file.endsWith(".xlsx"))).toBe(true);
  });
});
