export interface DailyLogRecord {
  id?: string;
  stt: number;
  date: string;
  week: string;
  category: string;
  content: string;
  target: string;
  unit: string;
  assignee: string;
  timeWork: string[];
  result: string;
  deadline: string;
  statusPercent: string;
  note: string;
  evaluation?: string;
  year?: number;
}

export const DAILY_LOG_DATA: DailyLogRecord[] = [];
