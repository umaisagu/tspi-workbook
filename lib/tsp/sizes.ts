/**
 * SUMS size arithmetic (workbook SUMS / SUMP rows 10–17).
 *   New and Changed (N) = Modified + Added
 *   Total (T)           = N + Base − Deleted − Modified + Reused   (= Base − Deleted + Added + Reused)
 * Sizes are entered per component in its size measure; roll-ups add up leaf components by measure.
 */
import type { SizeMeasure } from "@/generated/prisma/enums";

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

export const ZERO_SIZE: SizeCounts = { base: 0, deleted: 0, modified: 0, added: 0, reused: 0, newReuse: 0 };

export function sizeTotals(c: SizeCounts): SizeTotals {
  const newAndChanged = c.modified + c.added;
  return { ...c, newAndChanged, total: newAndChanged + c.base - c.deleted - c.modified + c.reused };
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
  const pages = { REQ_PAGES: 0, HLD_PAGES: 0, DLD_LINES: 0, TEXT_PAGES: 0 } as Record<SizeMeasure, number>;
  for (const n of nodes) {
    if (!leaves.has(n.id) || !inScope.has(n.id)) continue;
    const c = n[which];
    if (n.sizeMeasure === "LOC") loc = addSizes(loc, c);
    else pages[n.sizeMeasure] += sizeTotals(c).total;
  }
  return { reqPages: pages.REQ_PAGES, hldPages: pages.HLD_PAGES, dldLines: pages.DLD_LINES, textPages: pages.TEXT_PAGES, loc: sizeTotals(loc) };
}
