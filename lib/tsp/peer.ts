/**
 * PEER: the 10 criteria of the Peer/Individual Evaluation rubric
 * (docs/rubrics/5_RUBRIC_TMA3084_Peer_IndividualEvaluation_10.pdf), each rated 1–5, 50 marks in total.
 * Each member rates themselves and every teammate once per milestone.
 */
export const PEER_CRITERIA = [
  { key: "quantity", label: "Quantity of work", hint: "Work that is accurate and complete; meets or exceeds requirements" },
  { key: "timeliness", label: "Timeliness of work", hint: "Meets deadlines set by the group; completes work ahead of schedule" },
  { key: "taskSupport", label: "Task support", hint: "Task support given to other members" },
  { key: "interaction", label: "Interaction", hint: "How the member relates and communicates with others" },
  { key: "attendance", label: "Attendance", hint: "Attendance at group and client meetings (1: none … 5: 100%)" },
  { key: "responsibility", label: "Responsibility", hint: "Carries out assigned tasks reliably; volunteers for others" },
  { key: "involvement", label: "Involvement", hint: "Takes part in discussions; brings outside research and knowledge" },
  { key: "leadership", label: "Leadership", hint: "Engages in leadership activities" },
  { key: "roleAssignment", label: "Role assignment", hint: "Establishes their assigned role (developer, designer, quality manager, tester …)" },
  { key: "overall", label: "Overall performance", hint: "Overall performance of the member in the group" },
] as const;
export type PeerCriterion = (typeof PEER_CRITERIA)[number]["key"];
export type PeerScores = Record<PeerCriterion, number>;

export const PEER_MAX = PEER_CRITERIA.length * 5;

export function peerTotal(scores: Partial<Record<string, number>>): number {
  return PEER_CRITERIA.reduce((s, c) => s + (scores[c.key] ?? 0), 0);
}

export interface PeerRow {
  evaluatorId: string;
  evaluateeId: string;
  scores: Partial<Record<string, number>>;
  submitted: boolean;
}

export interface PeerSummary {
  memberId: string;
  /** Self-rating total (out of 50), null if not submitted. */
  selfTotal: number | null;
  /** Average total given by teammates (excluding self), null if none. */
  peerAverage: number | null;
  ratingsReceived: number;
  /** Average per criterion from teammates. */
  byCriterion: Record<string, number | null>;
}

/** Self-rating vs teammates' average for each member (only submitted evaluations count). */
export function summarisePeer(memberIds: readonly string[], rows: readonly PeerRow[]): PeerSummary[] {
  const submitted = rows.filter((r) => r.submitted);
  return memberIds.map((id) => {
    const self = submitted.find((r) => r.evaluatorId === id && r.evaluateeId === id);
    const received = submitted.filter((r) => r.evaluateeId === id && r.evaluatorId !== id);
    const avg = (f: (r: PeerRow) => number) => (received.length ? Math.round((received.reduce((s, r) => s + f(r), 0) / received.length) * 100) / 100 : null);
    return {
      memberId: id,
      selfTotal: self ? peerTotal(self.scores) : null,
      peerAverage: avg((r) => peerTotal(r.scores)),
      ratingsReceived: received.length,
      byCriterion: Object.fromEntries(PEER_CRITERIA.map((c) => [c.key, avg((r) => r.scores[c.key] ?? 0)])),
    };
  });
}

/** An evaluator has finished when they have submitted a rating for themselves and every teammate. */
export function peerComplete(evaluatorId: string, memberIds: readonly string[], rows: readonly PeerRow[]): boolean {
  return memberIds.every((id) => rows.some((r) => r.evaluatorId === evaluatorId && r.evaluateeId === id && r.submitted));
}
