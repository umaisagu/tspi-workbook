/**
 * SUMS size arithmetic (workbook SUMS / SUMP rows 10–17).
 *   New and Changed (N) = Modified + Added
 *   Total (T)           = N + Base − Deleted − Modified + Reused   (= Base − Deleted + Added + Reused)
 * Sizes are entered per component in its size measure; roll-ups add up leaf components by measure.
 */
import type { SizeMeasure } from "@/generated/prisma/enums";

/** Size measures (v3.0 PLANGUIDE / SUMS); DLD lines is kept for components sized before v3.0. */
export const SIZE_MEASURES: readonly { value: SizeMeasure; label: string }[] = [
  { value: "LOC", label: "Dart LOC" },
  { value: "REQ_PAGES", label: "SRS pages" },
  { value: "HLD_PAGES", label: "SDD pages" },
  { value: "TEXT_PAGES", label: "Document pages" },
  { value: "SCREENS", label: "Screens" },
  { value: "WIDGETS", label: "Widgets" },
  { value: "API_ENDPOINTS", label: "API endpoints" },
  { value: "TEST_CASES", label: "Test cases" },
  { value: "DLD_LINES", label: "DLD lines (before v3.0)" },
];
export const sizeMeasureLabel = (m: string | null | undefined): string => SIZE_MEASURES.find((o) => o.value === m)?.label ?? m ?? "—";

export interface SizeCounts {
  base: number;
  deleted: number;
  modified: number;
  added: number;
  reused: number;
  newReuse: number;
}

export interface SizeTotals extends SizeCounts {
  newAndChanged: number;
  total: number;
}

export const ZERO_SIZE: SizeCounts = {
  base: 0,
  deleted: 0,
  modified: 0,
  added: 0,
  reused: 0,
  newReuse: 0,
};

export function sizeTotals(c: SizeCounts): SizeTotals {
  const newAndChanged = c.modified + c.added;
  return {
    ...c,
    newAndChanged,
    total: newAndChanged + c.base - c.deleted - c.modified + c.reused,
  };
}

export function addSizes(a: SizeCounts, b: SizeCounts): SizeCounts {
  return {
    base: a.base + b.base,
    deleted: a.deleted + b.deleted,
    modified: a.modified + b.modified,
    added: a.added + b.added,
    reused: a.reused + b.reused,
    newReuse: a.newReuse + b.newReuse,
  };
}

/** Field → message when a size is impossible (e.g. more deleted than base). */
export function sizeErrors(prefix: "plan" | "act", c: SizeCounts): Record<string, string> {
  const e: Record<string, string> = {};
  if (c.deleted > c.base) e[`${prefix}Deleted`] = "Deleted cannot exceed base size";
  if (c.modified > c.base - c.deleted) e[`${prefix}Modified`] = "Modified cannot exceed base minus deleted";
  if (c.newReuse > c.added) e[`${prefix}NewReuse`] = "New reuse is part of added size";
  return e;
}

export interface ComponentNode {
  id: string;
  parentId: string | null;
  sizeMeasure: SizeMeasure;
  plan: SizeCounts;
  actual: SizeCounts;
}

/** Ids of `rootId` and all its descendants (cycle-safe). */
export function descendantsOf(rootId: string, nodes: readonly { id: string; parentId: string | null }[]): Set<string> {
  const out = new Set<string>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const n of nodes) {
      if (n.parentId && out.has(n.parentId) && !out.has(n.id)) {
        out.add(n.id);
        added = true;
      }
    }
  }
  return out;
}

/** Components without children. */
export function leafIds(nodes: readonly { id: string; parentId: string | null }[]): Set<string> {
  const parents = new Set(nodes.map((n) => n.parentId).filter((p): p is string => p !== null));
  return new Set(nodes.filter((n) => !parents.has(n.id)).map((n) => n.id));
}

export interface ProgramSize {
  reqPages: number;
  hldPages: number;
  dldLines: number;
  textPages: number;
  screens: number;
  widgets: number;
  apiEndpoints: number;
  testCases: number;
  loc: SizeTotals;
}

/**
 * SUMP "Program Size" for an assembly (or SYSTEM when scope is null): sums of the leaf components in scope,
 * pages/lines by measure (their totals) and LOC in full detail.
 */
export function programSize(nodes: readonly ComponentNode[], scope: string | null, which: "plan" | "actual"): ProgramSize {
  const leaves = leafIds(nodes);
  const inScope = scope === null ? new Set(nodes.map((n) => n.id)) : descendantsOf(scope, nodes);
  let loc = ZERO_SIZE;
  const pages: Record<Exclude<SizeMeasure, "LOC">, number> = {
    REQ_PAGES: 0,
    HLD_PAGES: 0,
    DLD_LINES: 0,
    TEXT_PAGES: 0,
    SCREENS: 0,
    WIDGETS: 0,
    API_ENDPOINTS: 0,
    TEST_CASES: 0,
  };
  for (const n of nodes) {
    if (!leaves.has(n.id) || !inScope.has(n.id)) continue;
    const c = n[which];
    if (n.sizeMeasure === "LOC") loc = addSizes(loc, c);
    else pages[n.sizeMeasure] += sizeTotals(c).total;
  }
  return {
    reqPages: pages.REQ_PAGES,
    hldPages: pages.HLD_PAGES,
    dldLines: pages.DLD_LINES,
    textPages: pages.TEXT_PAGES,
    screens: pages.SCREENS,
    widgets: pages.WIDGETS,
    apiEndpoints: pages.API_ENDPOINTS,
    testCases: pages.TEST_CASES,
    loc: sizeTotals(loc),
  };
}
