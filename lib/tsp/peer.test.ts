import { describe, expect, it } from "vitest";
import { PEER_CRITERIA, PEER_MAX, peerComplete, peerTotal, summarisePeer, type PeerRow } from "./peer";

const all = (n: number) => Object.fromEntries(PEER_CRITERIA.map((c) => [c.key, n]));

describe("PEER rubric", () => {
  it("has the rubric's 10 criteria, 50 marks", () => {
    expect(PEER_CRITERIA).toHaveLength(10);
    expect(PEER_MAX).toBe(50);
    expect(peerTotal(all(4))).toBe(40);
  });
});

const rows: PeerRow[] = [
  { evaluatorId: "a", evaluateeId: "a", scores: all(5), submitted: true },
  { evaluatorId: "a", evaluateeId: "b", scores: all(3), submitted: true },
  { evaluatorId: "b", evaluateeId: "a", scores: all(2), submitted: true },
  { evaluatorId: "b", evaluateeId: "b", scores: all(4), submitted: true },
  { evaluatorId: "c", evaluateeId: "a", scores: all(4), submitted: true },
  { evaluatorId: "c", evaluateeId: "b", scores: all(5), submitted: false },
];

describe("summarisePeer", () => {
  const s = summarisePeer(["a", "b", "c"], rows);
  it("compares the self-rating with teammates' average (submitted only)", () => {
    expect(s[0]).toMatchObject({ memberId: "a", selfTotal: 50, peerAverage: 30, ratingsReceived: 2 });
    expect(s[0]?.byCriterion.quantity).toBe(3);
    expect(s[1]).toMatchObject({ selfTotal: 40, peerAverage: 30, ratingsReceived: 1 });
    expect(s[2]).toMatchObject({ selfTotal: null, peerAverage: null, ratingsReceived: 0 });
  });
});

describe("peerComplete", () => {
  it("needs a submitted rating for self and every teammate", () => {
    expect(peerComplete("a", ["a", "b"], rows)).toBe(true);
    expect(peerComplete("a", ["a", "b", "c"], rows)).toBe(false);
    expect(peerComplete("c", ["a", "b"], rows)).toBe(false);
  });
});
