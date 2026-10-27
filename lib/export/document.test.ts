import { describe, expect, it } from "vitest";
import { cellText, columnWidths, fileName, numericColumns, pdfSafe, sheetNames, tableWidth } from "./document";

describe("cellText", () => {
  it("shows empty values as a dash", () => {
    expect(cellText(null)).toBe("—");
    expect(cellText(undefined)).toBe("—");
    expect(cellText("")).toBe("—");
    expect(cellText(Number.NaN)).toBe("—");
  });
  it("formats numbers", () => {
    expect(cellText(3)).toBe("3");
    expect(cellText(2.345)).toBe("2.35");
    expect(cellText(0.256, "pct")).toBe("25.6%");
    expect(cellText(4.6, "int")).toBe("5");
    expect(cellText(4, "dec")).toBe("4.00");
    expect(cellText(true)).toBe("Yes");
  });
});

describe("pdfSafe", () => {
  it("replaces characters Helvetica cannot draw", () => {
    expect(pdfSafe("≤ 3 − 1 ✓ → x")).toBe("<= 3 - 1 v -> x");
    expect(pdfSafe("Café — “ok”")).toBe('Café — "ok"');
    expect(pdfSafe("日本 ok")).toBe(" ok");
  });
});

describe("sheetNames", () => {
  it("strips forbidden characters, truncates and de-duplicates", () => {
    const names = sheetNames(["LOGT: Aina", "LOGT: Aina", "A".repeat(40), "[x]"]);
    expect(names[0]).toBe("LOGT Aina");
    expect(names[1]).toBe("LOGT Aina (2)");
    expect(names[2]).toHaveLength(31);
    expect(names[3]).toBe("x");
  });
});

describe("fileName", () => {
  it("builds a safe name", () => {
    expect(fileName(["Team Kenyalang", "SUMQ", "M2"], "pdf")).toBe("Team-Kenyalang_SUMQ_M2.pdf");
    expect(fileName(["Ünïcode / bad"], "xlsx")).toBe("Unicode-bad.xlsx");
    expect(fileName([""], "xlsx")).toBe("export.xlsx");
  });
});

describe("columnWidths", () => {
  it("splits the width proportionally", () => {
    expect(columnWidths([{ header: "a", width: 1 }, { header: "b", width: 3 }], 400)).toEqual([100, 300]);
    expect(columnWidths([{ header: "a" }, { header: "b" }], 100)).toEqual([50, 50]);
  });
});

describe("table layout", () => {
  it("narrow tables keep their natural width", () => {
    expect(tableWidth([{ header: "a", width: 10 }, { header: "b", width: 10 }], 770)).toBeCloseTo(104);
    expect(tableWidth(Array.from({ length: 30 }, () => ({ header: "x", width: 10 })), 770)).toBe(770);
  });
  it("detects numeric columns", () => {
    expect(numericColumns({ columns: [{ header: "a" }, { header: "b" }, { header: "c", format: "pct" }], rows: [["x", 1, null]] })).toEqual([false, true, true]);
  });
});
