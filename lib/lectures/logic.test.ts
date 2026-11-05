import { describe, expect, it } from "vitest";
import { countsAsNewOpen, lectureAggregate, lecturesForWeek, markAnswer, planSeriesLoad, resourceKey, REOPEN_WINDOW_MS } from "./logic";
import { SERIES_2026_S1 } from "./series-2026-s1";
import { lectureAnswerSchema, lectureCheckSchema, resourceUrlSchema, seriesLectureSchema } from "../schemas/lectures";

describe("2026/27 S1 series data", () => {
  it("has the nine lectures in order, codes unique", () => {
    expect(SERIES_2026_S1.map((l) => l.code)).toEqual(["L00", "L-TSP", "L-TRELLO", "L01", "L02-03", "L04-05", "L06-07", "L08-09", "L10"]);
    expect(new Set(SERIES_2026_S1.map((l) => l.code)).size).toBe(9);
  });
  it("every entry passes the schema", () => {
    for (const l of SERIES_2026_S1) expect(seriesLectureSchema.safeParse(l).success, l.code).toBe(true);
  });
  it("delivered/current lectures have slides (file, no link) and a check question; planned ones have neither", () => {
    for (const l of SERIES_2026_S1) {
      if (l.status === "PLANNED") {
        expect(l.resources, l.code).toHaveLength(0);
        expect(l.check, l.code).toBeUndefined();
      } else {
        const slides = l.resources.filter((r) => r.kind === "SLIDES");
        expect(slides, l.code).toHaveLength(1);
        expect(slides[0]!.url).toBeUndefined();
        expect(slides[0]!.fileName).toMatch(/\.pptx$/);
        expect(l.check, l.code).toBeDefined();
      }
    }
    expect(SERIES_2026_S1.find((l) => l.code === "L06-07")!.status).toBe("CURRENT");
  });
  it("answer keys match the lecturer's bold answers", () => {
    const key = Object.fromEntries(SERIES_2026_S1.filter((l) => l.check).map((l) => [l.code, l.check!.options[l.check!.answerIndex]]));
    expect(key["L00"]).toBe("A human reviewer, a unit test, and a LOGAI entry");
    expect(key["L-TSP"]).toBe("One milestone, M1 through M4");
    expect(key["L06-07"]).toBe("The app shall display the queue number within 2 seconds of a confirmed booking");
  });
});

describe("lecture rules", () => {
  it("lecturesForWeek finds the lectures of a week", () => {
    expect(lecturesForWeek(SERIES_2026_S1, 7)).toEqual(["L06-07"]);
    expect(lecturesForWeek(SERIES_2026_S1, 2)).toEqual(["L-TSP", "L-TRELLO"]);
    expect(lecturesForWeek(SERIES_2026_S1, 4)).toEqual([]);
  });
  it("markAnswer", () => {
    const c = { answerIndex: 2, options: ["a", "b", "c", "d"] };
    expect(markAnswer(c, 2)).toBe(true);
    expect(markAnswer(c, 1)).toBe(false);
    expect(markAnswer(c, 7)).toBe(false);
    expect(markAnswer(c, -1)).toBe(false);
  });
  it("re-opens within the window do not count again", () => {
    const t = new Date("2026-11-05T02:00:00Z");
    expect(countsAsNewOpen(null, t)).toBe(true);
    expect(countsAsNewOpen(new Date(t.getTime() - 60_000), t)).toBe(false);
    expect(countsAsNewOpen(new Date(t.getTime() - REOPEN_WINDOW_MS), t)).toBe(true);
  });
  it("aggregate counts only students in scope; null when nothing to divide", () => {
    const d = (s: string) => new Date(s);
    const views = [
      { userId: "a", lastOpenedAt: d("2026-11-03"), answeredAt: d("2026-11-03"), correct: true },
      { userId: "b", lastOpenedAt: d("2026-11-04"), answeredAt: d("2026-11-04"), correct: false },
      { userId: "c", lastOpenedAt: d("2026-11-02"), answeredAt: null, correct: null },
      { userId: "outsider", lastOpenedAt: d("2026-11-05"), answeredAt: d("2026-11-05"), correct: true },
    ];
    const a = lectureAggregate([{ userId: "a" }, { userId: "b" }, { userId: "c" }, { userId: "d" }], views);
    expect(a).toMatchObject({ students: 4, opened: 3, openedShare: 0.75, answered: 2, correct: 1, accuracy: 0.5 });
    expect(a.lastOpenedAt).toEqual(d("2026-11-04"));
    const none = lectureAggregate([], views);
    expect(none.openedShare).toBeNull();
    expect(none.accuracy).toBeNull();
    expect(none.lastOpenedAt).toBeNull();
  });
});

describe("planSeriesLoad (idempotent)", () => {
  const series = SERIES_2026_S1;
  it("empty semester: creates everything", () => {
    const p = planSeriesLoad(series, []);
    expect(p.create).toHaveLength(9);
    expect(p.addResources).toHaveLength(0);
  });
  it("loaded semester: nothing to do", () => {
    const existing = series.map((l) => ({ code: l.code, hasCheck: !!l.check, resourceKeys: l.resources.map(resourceKey) }));
    const p = planSeriesLoad(series, existing);
    expect(p).toMatchObject({ create: [], addResources: [], addChecks: [], unchanged: 9 });
  });
  it("adds only what is missing and never re-creates an existing code", () => {
    const existing = series
      .filter((l) => l.code !== "L10")
      .map((l) => ({
        code: l.code,
        hasCheck: l.code === "L00" ? false : !!l.check,
        resourceKeys: l.code === "L06-07" ? [resourceKey(l.resources[0]!)] : l.resources.map(resourceKey),
      }));
    const p = planSeriesLoad(series, existing);
    expect(p.create.map((l) => l.code)).toEqual(["L10"]);
    expect(p.addChecks.map((c) => c.code)).toEqual(["L00"]);
    expect(p.addResources).toEqual([{ code: "L06-07", resources: [series.find((l) => l.code === "L06-07")!.resources[1]] }]);
    expect(p.unchanged).toBe(6);
  });
  it("resource identity ignores case and surrounding spaces of the label", () => {
    expect(resourceKey({ kind: "SLIDES", label: " Lecture Slides " })).toBe(resourceKey({ kind: "SLIDES", label: "lecture slides" }));
  });
});

describe("lecture schemas", () => {
  it("check question: 2–5 options and an answer among them", () => {
    const base = { question: "Q?", options: ["a", "b"], answerIndex: 1, whenRight: "y", whenWrong: "n" };
    expect(lectureCheckSchema.safeParse(base).success).toBe(true);
    expect(lectureCheckSchema.safeParse({ ...base, options: ["a"] }).success).toBe(false);
    expect(lectureCheckSchema.safeParse({ ...base, options: ["a", "b", "c", "d", "e", "f"] }).success).toBe(false);
    expect(lectureCheckSchema.safeParse({ ...base, answerIndex: 2 }).success).toBe(false);
  });
  it("links must be http(s)", () => {
    expect(resourceUrlSchema.safeParse("https://youtu.be/L6zhkoIOSIg").success).toBe(true);
    expect(resourceUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(resourceUrlSchema.safeParse("data:text/html,x").success).toBe(false);
  });
  it("answer body is just an index", () => {
    expect(lectureAnswerSchema.parse({ answerIndex: "2" })).toEqual({ answerIndex: 2 });
    expect(lectureAnswerSchema.safeParse({ answerIndex: 9 }).success).toBe(false);
  });
});
