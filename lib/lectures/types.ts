/** Plain lecture-series data (the shape of lib/lectures/series-*.ts and of the seed/upsert input). */
export type LectureStatusValue = "DELIVERED" | "CURRENT" | "PLANNED";
export type ResourceKindValue = "SLIDES" | "COMPANION" | "VIDEO" | "QUIZ" | "HANDOUT" | "FILE";

export interface LecturePart {
  title: string;
  detail: string;
}
export interface LectureActivity {
  /** e.g. "Word cloud", "Ranking", "Quiz" */
  kind: string;
  detail: string;
}
export interface SeriesResource {
  kind: ResourceKindValue;
  label: string;
  url?: string;
  fileName?: string;
}
export interface SeriesCheck {
  question: string;
  options: string[];
  answerIndex: number;
  whenRight: string;
  whenWrong: string;
}
export interface SeriesLecture {
  code: string;
  title: string;
  kicker: string;
  summary: string;
  weekLabel: string;
  weekNumber?: number;
  status: LectureStatusValue;
  covers: string[];
  parts?: LecturePart[];
  activities?: LectureActivity[];
  notes?: string;
  resources: SeriesResource[];
  check?: SeriesCheck;
}
