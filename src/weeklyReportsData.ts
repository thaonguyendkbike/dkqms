export interface WeeklyOverviewTarget {
  stt: number | string;
  category: string;
  content: string;
  unit: string;
  targetValue: string | number;
  explanation: string;
  assignee: string;
  collaborator: string;
  month?: number;
  year?: number;
}

export interface DetailedProdTask {
  stt: number | string;
  category: string;
  content: string;
  unit: string;
  targetValue: string | number;
  explanation: string;
  assignee: string;
  collaborator: string;
  weight: string;
  timeline: {
    w1: string;
    w2: string;
    w3: string;
    w4: string;
  };
  month?: number;
  year?: number;
}

export interface DetailedQCTask {
  stt: number | string;
  category: string;
  content: string;
  unit: string;
  targetValue: string | number;
  explanation: string;
  assignee: string;
  collaborator: string;
  weight?: string;
  timelineByDate: {
    [date: string]: string;
  };
  month?: number;
  year?: number;
}

export const PROD_OVERVIEW_TARGETS: WeeklyOverviewTarget[] = [];
export const PROD_DETAILED_TASKS: DetailedProdTask[] = [];
export const QC_WEEKLY_TARGETS: WeeklyOverviewTarget[] = [];
export const QC_DETAILED_TASKS: DetailedQCTask[] = [];
export const QC_REPORT_DATES: string[] = [
  "27/04",
  "28/04",
  "29/04",
  "30/04",
  "02/05",
  "03/05",
  "04/05",
  "05/05",
  "06/05",
  "07/05",
  "08/05",
  "09/05"
];
