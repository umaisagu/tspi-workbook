import data from "./workbook-v3.json";

/**
 * The lecturer's TMA3084 TSPi Workbook v3.0 (docs/workbook-v3/), extracted by scripts/extract-reference.py:
 * manual, standards (phases, defect types), guidelines, the member workbook and rows of the worked SAMPLE (fictional team AUV).
 */
type Cell = string | number | null;

export interface WorkbookReference {
  source: string[];
  title: string;
  subtitle: string;
  author: string;
  about: { label: string; text: string }[];
  milestones: { id: string; name: string; week: number; start: string; due: string; weight: number; deliverables: string }[];
  thresholds: { columns: string[]; rows: { label: string; values: Cell[]; note: string | null }[] };
  manual: {
    intro: { label: string; text: string }[];
    stages: { title: string; steps: { n: number; step: string; what: string; form: string; who: string }[] }[];
    forms: { form: string; holds: string; owner: string; feeds: string }[];
    examples: { situation: string; record: string }[];
    troubleshooting: { symptom: string; fix: string }[];
    closing: string;
  };
  roles: { role: string; owns: string }[];
  roleRule: string;
  phases: { code: string; name: string; scope: string; logTime: string; injected: string; removed: string; development: string; sizeBasis: string; belongs: string }[];
  phaseNotes: string[];
  defectTypes: { code: number; name: string; covers: string; example: string }[];
  defectTypeNote: string;
  planGuide: {
    notes: { label: string; text: string }[];
    shares: { group: string; share: string; phases: string }[];
    rates: { activity: string; rate: string; why: string }[];
    aiWarning: string;
  };
  qualGuide: { idea: string; measures: { measure: string; aim: string; below: string }[]; fixOrder: string };
  member: {
    title: string;
    about: { label: string; text: string }[];
    routine: string[];
    sheets: { sheet: string; title: string; purpose: string | null }[];
    consolidation: { label: string; text: string }[];
  };
  sample: {
    note: string;
    team: { demonstrator: string; labGroup: string; name: string; project: string; client: string; repository: string; size: number };
    members: { matric: string; name: string; github: string | null; primaryRole: string | null; secondaryRole: string | null }[];
    charter: { label: string; text: string | null }[];
    task: Cell[][];
    logt: Cell[][];
    logd: Cell[][];
    logtest: Cell[][];
    logai: Cell[][];
    logclient: Cell[][];
    loggit: Cell[][];
    ccr: Cell[][];
    week: Cell[][];
  };
}

export const WORKBOOK: WorkbookReference = data as WorkbookReference;

/** Files served by /api/reference/[file] (signed-in users), from docs/workbook-v3/. */
export const REFERENCE_FILES = {
  workbook: { file: "TSPi_Workbook_TMA3084_v3.0.xlsx", label: "Team master workbook (v3.0)" },
  member: { file: "TSPi_Member_Workbook_TMA3084_v3.0.xlsx", label: "Member workbook (v3.0, one per student)" },
  sample: { file: "TSPi_Workbook_TMA3084_SAMPLE_v3.0.xlsx", label: "Worked sample workbook (team AUV)" },
} as const;
export type ReferenceFileKey = keyof typeof REFERENCE_FILES;

export function isReferenceFile(key: string): key is ReferenceFileKey {
  return Object.hasOwn(REFERENCE_FILES, key);
}
