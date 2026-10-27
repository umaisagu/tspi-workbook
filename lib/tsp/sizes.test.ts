import { describe, expect, it } from "vitest";
import { descendantsOf, leafIds, programSize, sizeErrors, sizeTotals, ZERO_SIZE, type ComponentNode } from "./sizes";

describe("SUMS size totals", () => {
  it("N&C = modified + added; Total = N + B − D − M + R", () => {
    // workbook SUMP rows 15–16
    const t = sizeTotals({ base: 1000, deleted: 100, modified: 50, added: 300, reused: 200, newReuse: 40 });
    expect(t.newAndChanged).toBe(350);
    expect(t.total).toBe(1400); // = B − D + A + R = 1000 − 100 + 300 + 200
  });
  it("a new program is all added", () => {
    expect(sizeTotals({ ...ZERO_SIZE, added: 500 })).toMatchObject({ newAndChanged: 500, total: 500 });
  });
  it("rejects impossible sizes", () => {
    expect(sizeErrors("plan", { ...ZERO_SIZE, base: 10, deleted: 20 })).toHaveProperty("planDeleted");
    expect(sizeErrors("act", { ...ZERO_SIZE, base: 10, deleted: 5, modified: 6 })).toHaveProperty("actModified");
    expect(sizeErrors("act", { ...ZERO_SIZE, added: 5, newReuse: 6 })).toHaveProperty("actNewReuse");
    expect(sizeErrors("plan", { ...ZERO_SIZE, base: 10, deleted: 2, modified: 8, added: 5, newReuse: 5 })).toEqual({});
  });
});

const n = (id: string, parentId: string | null, sizeMeasure: ComponentNode["sizeMeasure"], planAdded: number, actAdded: number): ComponentNode => ({
  id,
  parentId,
  sizeMeasure,
  plan: { ...ZERO_SIZE, added: planAdded },
  actual: { ...ZERO_SIZE, added: actAdded },
});
const nodes = [
  n("app", null, "LOC", 0, 0),
  n("login", "app", "LOC", 400, 350),
  n("feed", "app", "LOC", 600, 200),
  n("srs", null, "REQ_PAGES", 30, 28),
  n("sds", null, "HLD_PAGES", 20, 12),
];

describe("component hierarchy", () => {
  it("finds descendants and leaves", () => {
    expect([...descendantsOf("app", nodes)].sort()).toEqual(["app", "feed", "login"]);
    expect([...leafIds(nodes)].sort()).toEqual(["feed", "login", "sds", "srs"]);
  });
  it("is safe with cycles", () => {
    expect(descendantsOf("a", [{ id: "a", parentId: "b" }, { id: "b", parentId: "a" }]).size).toBe(2);
  });
});

describe("program size", () => {
  it("adds leaf parts for SYSTEM, by measure", () => {
    const p = programSize(nodes, null, "plan");
    expect(p).toMatchObject({ reqPages: 30, hldPages: 20, dldLines: 0 });
    expect(p.loc.newAndChanged).toBe(1000);
    expect(programSize(nodes, null, "actual").loc.total).toBe(550);
  });
  it("limits to an assembly's parts", () => {
    expect(programSize(nodes, "app", "plan").loc.added).toBe(1000);
    expect(programSize(nodes, "login", "actual").loc.added).toBe(350);
    expect(programSize(nodes, "app", "plan").reqPages).toBe(0);
  });
});
