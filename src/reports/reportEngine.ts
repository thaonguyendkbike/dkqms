import {
  CAPA,
  COPQMetric,
  ECOChange,
  ImprovementAction,
  MarketDefect,
  PTSPProject,
  PTSPTask,
  PartEvaluation,
  ReportNote,
  Supplier,
  SupplierProductionAudit
} from '../types';
import { DailyLogRecord } from '../dailyLogsData';
import { IQCRecord, OQCRecord, PQCRecord } from '../qualityTestData';

export type ReportPeriodType = 'week' | 'month';

export interface PeriodDescriptor {
  id: string; // 'W-2026-24' | 'M-2026-06'
  type: ReportPeriodType;
  year: number;
  value: number; // isoWeek (1..53) or month (1..12)
  label: string; // 'Tuần 24/2026' or 'Tháng 06/2026'
  rangeLabel: string; // '08/06/2026 – 14/06/2026'
  start: Date;
  end: Date;
  prev: {
    id: string;
    year: number;
    value: number;
    label: string;
    start: Date;
    end: Date;
  };
}

export interface ReportDatasetInput {
  dailyLogs: DailyLogRecord[];
  iqcRecords: IQCRecord[];
  pqcRecords: PQCRecord[];
  oqcRecords: OQCRecord[];
  defects: MarketDefect[];
  partEvaluations: PartEvaluation[];
  capas: CAPA[];
  ecos: ECOChange[];
  improvementActions: ImprovementAction[];
  copqs: COPQMetric[];
  ptspProjects: PTSPProject[];
  ptspTasks: PTSPTask[];
  suppliers: Supplier[];
  supplierProductionAudits: SupplierProductionAudit[];
  reportNotes: ReportNote[];
}

export interface KpiDelta {
  current: number;
  previous: number;
  delta: number;
  trend: 'up' | 'down' | 'flat';
}

export interface QIndexComponent {
  key: 'oqc' | 'iqc' | 'pqc' | 'market' | 'capa' | 'daily';
  label: string;
  weight: number; // nominal weight (sum = 100)
  score: number | null; // null = không phát sinh trong kỳ
  detail: string;
}

export interface RankedItem {
  name: string;
  count: number;
  failed?: number;
  resolved?: number;
  sevA?: number;
  pct: number;
  rate: number;
  cumPct?: number;
  alert?: boolean;
}

export interface CheckSheetMatrix {
  columns: string[];
  rows: { label: string; counts: number[]; total: number }[];
  colTotals: number[];
  grandTotal: number;
}

export interface ControlChartPoint {
  label: string;
  total: number;
  failed: number;
  ratePct: number; // 0..100
  uclPct: number;
  lclPct: number;
  outOfControl: boolean;
}

export interface ControlChartSeries {
  title: string;
  pBarPct: number;
  insufficientData: boolean;
  reason?: string;
  points: ControlChartPoint[];
}

export interface ReportAlert {
  id: string;
  level: 'critical' | 'warning' | 'info' | 'positive';
  category: string;
  title: string;
  detail: string;
  action?: string;
  targetTab?: string;
}

export interface ReportSnapshot {
  period: PeriodDescriptor;
  generatedAt: string;
  missingDateCount: number;
  qIndex: {
    score: number;
    grade: 'Xuất sắc' | 'Đạt chuẩn' | 'Cần cải thiện' | 'Cảnh báo';
    formulaText: string;
    activeWeightSum: number;
    components: QIndexComponent[];
  };
  kpis: {
    oqcYield: KpiDelta & { total: number; passed: number; failed: number };
    iqcPassRate: KpiDelta & { total: number; passed: number; failed: number };
    pqcResolveRate: KpiDelta & { total: number; resolved: number; pending: number };
    marketResolveRate: KpiDelta & { total: number; resolved: number; pending: number; sevA: number };
    partEvalQty: KpiDelta & { records: number; nccPct: number; sxPct: number; khPct: number };
    capaOpen: KpiDelta & { total: number; overdue: number; closedInPeriod: number; effectiveCount: number };
    dailyCompliance: KpiDelta & { total: number; completed: number; pendingCount: number };
    copqAmount: KpiDelta & { byCategory: { category: string; amount: number }[] };
  };
  production: {
    iqcRecords: IQCRecord[];
    iqcBySupplier: RankedItem[];
    deterioratingSuppliers: string[];
    pqcRecords: PQCRecord[];
    pqcByModel: RankedItem[];
    oqcFailedRecords: OQCRecord[];
    oqcByModel: RankedItem[];
    oqcByRootCause: RankedItem[];
    auditsInPeriod: SupplierProductionAudit[];
  };
  market: {
    defectsInPeriod: MarketDefect[];
    defectsByModel: RankedItem[];
    defectsByDealer: RankedItem[];
    defectsByType: RankedItem[];
    repeatedDefects: { label: string; count: number; targetTab: string }[];
    partEvalsInPeriod: PartEvaluation[];
    partsByCause: { cause: string; records: number; qty: number; pct: number }[];
    partsByResolution: { resolution: string; records: number; qty: number; pct: number }[];
    topFailingParts: RankedItem[];
    topFailingPartSuppliers: RankedItem[];
  };
  capaEco: {
    capasAll: CAPA[];
    capasInPeriod: CAPA[];
    overdueCapas: CAPA[];
    ecosInPeriod: ECOChange[];
    ecosAll: ECOChange[];
    improvementsInPeriod: ImprovementAction[];
    improvementsTotal: number;
    improvementsDone: number;
  };
  work: {
    dailyLogsInPeriod: DailyLogRecord[];
    pendingDailyLogs: DailyLogRecord[];
    pendingByAssignee: { assignee: string; count: number; items: DailyLogRecord[] }[];
    ptspTotal: number;
    ptspCompleted: number;
    ptspOverdue: PTSPTask[];
    ptspAvgProgress: number;
  };
  qcTools: {
    checkSheet: CheckSheetMatrix;
    paretoDefects: RankedItem[];
    paretoParts: RankedItem[];
    stratificationByModel: RankedItem[];
    stratificationBySupplier: RankedItem[];
    oqcControlChart: ControlChartSeries;
    iqcControlChart: ControlChartSeries;
  };
  highlights: ReportAlert[];
  warnings: ReportAlert[];
  recommendedActions: ReportAlert[];
  note: ReportNote | null;
}

// ==========================================
// DATE & ISO 8601 HELPERS
// ==========================================

export function parseFlexibleDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  if (!clean) return null;

  // YYYY-MM-DD or YYYY/MM/DD (optionally with time)
  const ymd = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    const rawY = dmy[3];
    const y = rawY.length === 2 ? 2000 + Number(rawY) : Number(rawY);
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
  }

  return null;
}

export function formatDateShortVi(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateStrVi(dateStr?: string | null): string {
  const d = parseFlexibleDate(dateStr);
  return d ? formatDateShortVi(d) : (dateStr || '--');
}

export function getIsoWeekInfo(date: Date): { isoYear: number; isoWeek: number } {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utc.getUTCDay() || 7; // Mon=1..Sun=7
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum); // Thursday of current ISO week
  const isoYear = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { isoYear, isoWeek };
}

export function getIsoWeeksInYear(isoYear: number): number {
  const dec28 = new Date(isoYear, 11, 28, 12, 0, 0);
  return getIsoWeekInfo(dec28).isoWeek;
}

export function getIsoWeekRange(isoYear: number, isoWeek: number): { start: Date; end: Date } {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // Mon=1..Sun=7
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  const targetMonday = new Date(week1Monday);
  targetMonday.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);

  const start = new Date(
    targetMonday.getUTCFullYear(),
    targetMonday.getUTCMonth(),
    targetMonday.getUTCDate(),
    0, 0, 0, 0
  );
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getPeriodDescriptor(type: ReportPeriodType, year: number, value: number): PeriodDescriptor {
  if (type === 'week') {
    const maxW = getIsoWeeksInYear(year);
    const safeWeek = Math.max(1, Math.min(maxW, value));
    const { start, end } = getIsoWeekRange(year, safeWeek);

    let prevYear = year;
    let prevWeek = safeWeek - 1;
    if (prevWeek < 1) {
      prevYear = year - 1;
      prevWeek = getIsoWeeksInYear(prevYear);
    }
    const prevRange = getIsoWeekRange(prevYear, prevWeek);

    return {
      id: `W-${year}-${String(safeWeek).padStart(2, '0')}`,
      type: 'week',
      year,
      value: safeWeek,
      label: `Tuần ${safeWeek}/${year} (ISO)`,
      rangeLabel: `${formatDateShortVi(start)} – ${formatDateShortVi(end)}`,
      start,
      end,
      prev: {
        id: `W-${prevYear}-${String(prevWeek).padStart(2, '0')}`,
        year: prevYear,
        value: prevWeek,
        label: `Tuần ${prevWeek}/${prevYear}`,
        start: prevRange.start,
        end: prevRange.end
      }
    };
  }

  const safeMonth = Math.max(1, Math.min(12, value));
  const { start, end } = getMonthRange(year, safeMonth);
  let prevYear = year;
  let prevMonth = safeMonth - 1;
  if (prevMonth < 1) {
    prevYear = year - 1;
    prevMonth = 12;
  }
  const prevRange = getMonthRange(prevYear, prevMonth);

  return {
    id: `M-${year}-${String(safeMonth).padStart(2, '0')}`,
    type: 'month',
    year,
    value: safeMonth,
    label: `Tháng ${String(safeMonth).padStart(2, '0')}/${year}`,
    rangeLabel: `${formatDateShortVi(start)} – ${formatDateShortVi(end)}`,
    start,
    end,
    prev: {
      id: `M-${prevYear}-${String(prevMonth).padStart(2, '0')}`,
      year: prevYear,
      value: prevMonth,
      label: `Tháng ${String(prevMonth).padStart(2, '0')}/${prevYear}`,
      start: prevRange.start,
      end: prevRange.end
    }
  };
}

export function stepPeriod(type: ReportPeriodType, year: number, value: number, delta: -1 | 1): { year: number; value: number } {
  if (type === 'week') {
    let nextW = value + delta;
    let nextY = year;
    if (nextW < 1) {
      nextY -= 1;
      nextW = getIsoWeeksInYear(nextY);
    } else if (nextW > getIsoWeeksInYear(nextY)) {
      nextY += 1;
      nextW = 1;
    }
    return { year: nextY, value: nextW };
  }
  let nextM = value + delta;
  let nextY = year;
  if (nextM < 1) {
    nextY -= 1;
    nextM = 12;
  } else if (nextM > 12) {
    nextY += 1;
    nextM = 1;
  }
  return { year: nextY, value: nextM };
}

function isInRange(d: Date | null, start: Date, end: Date): boolean {
  if (!d) return false;
  const t = d.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function makeDelta(current: number, previous: number): KpiDelta {
  const diff = Number((current - previous).toFixed(1));
  return {
    current,
    previous,
    delta: diff,
    trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  };
}

function isIqcPassed(r: IQCRecord): boolean {
  return r.result === 'Đạt' || (r as any).status === 'Đạt' || (r as any).status === 'Thông quan' || (r as any).status === 'Pass';
}

function isIqcFailed(r: IQCRecord): boolean {
  return r.result === 'Lỗi' || (r as any).status === 'Bác bỏ' || (r as any).status === 'Fail';
}

function isOqcPassed(r: OQCRecord): boolean {
  return r.status === 'Đạt';
}

function isOqcFailed(r: OQCRecord): boolean {
  return r.status === 'Lỗi';
}

function isPqcResolved(r: PQCRecord): boolean {
  return r.status === 'Đạt hoàn toàn' || r.status === 'Đã cải tiến';
}

function getCapaStatus(c: CAPA): string {
  return (c.status || c.Status || 'Mở').trim();
}

function getCapaDueDate(c: CAPA): Date | null {
  return parseFlexibleDate(c.targetDate || c.dueDate || c.DueDate);
}

// ==========================================
// CONTROL CHART (p-chart) HELPER
// ==========================================

function buildPChart(
  title: string,
  buckets: { label: string; total: number; failed: number }[]
): ControlChartSeries {
  const valid = buckets.filter(b => b.total > 0);
  if (valid.length < 5) {
    return {
      title,
      pBarPct: 0,
      insufficientData: true,
      reason: `Cần tối thiểu 5 điểm có dữ liệu để tính giới hạn kiểm soát UCL/LCL (hiện có ${valid.length}).`,
      points: valid.map(b => ({
        label: b.label,
        total: b.total,
        failed: b.failed,
        ratePct: Number(((b.failed / b.total) * 100).toFixed(2)),
        uclPct: 0,
        lclPct: 0,
        outOfControl: false
      }))
    };
  }

  const sumTotal = valid.reduce((s, b) => s + b.total, 0);
  const sumFailed = valid.reduce((s, b) => s + b.failed, 0);
  const pBar = sumTotal > 0 ? sumFailed / sumTotal : 0;

  const points: ControlChartPoint[] = valid.map(b => {
    const p = b.failed / b.total;
    const sigma = Math.sqrt((pBar * (1 - pBar)) / b.total);
    const ucl = Math.min(1, pBar + 3 * sigma);
    const lcl = Math.max(0, pBar - 3 * sigma);
    const outOfControl = p > ucl || (lcl > 0 && p < lcl);
    return {
      label: b.label,
      total: b.total,
      failed: b.failed,
      ratePct: Number((p * 100).toFixed(2)),
      uclPct: Number((ucl * 100).toFixed(2)),
      lclPct: Number((lcl * 100).toFixed(2)),
      outOfControl
    };
  });

  return {
    title,
    pBarPct: Number((pBar * 100).toFixed(2)),
    insufficientData: false,
    points
  };
}

// ==========================================
// MAIN ENGINE: BUILD REPORT SNAPSHOT
// ==========================================

export function buildReportSnapshot(
  input: ReportDatasetInput,
  period: PeriodDescriptor
): ReportSnapshot {
  const { start, end, prev } = period;
  const now = new Date();
  let missingDateCount = 0;

  const filterDated = <T,>(items: T[], getDate: (x: T) => string | undefined | null, s: Date, e: Date, countMissing = false): T[] => {
    const out: T[] = [];
    for (const item of items) {
      const d = parseFlexibleDate(getDate(item));
      if (!d) {
        if (countMissing) missingDateCount++;
        continue;
      }
      if (isInRange(d, s, e)) out.push(item);
    }
    return out;
  };

  // Current period slices
  const curDaily = filterDated(input.dailyLogs, x => x.date, start, end, true);
  const curIqc = filterDated(input.iqcRecords, x => x.date, start, end, true);
  const curPqc = filterDated(input.pqcRecords, x => x.date, start, end, true);
  const curOqc = filterDated(input.oqcRecords, x => x.date, start, end, true);
  const curDefects = filterDated(input.defects, x => x.defectDate || x.sourceDate || x.saleDate, start, end, true);
  const curPartEvals = filterDated(input.partEvaluations, x => x.receivedDate, start, end, false);
  const curEcos = filterDated(input.ecos, x => x.applyDate, start, end, false);
  const curImprovements = filterDated(input.improvementActions, x => x.applyDate || x.targetDate, start, end, false);
  const curAudits = filterDated(input.supplierProductionAudits, x => x.requestDate, start, end, false);

  // Previous period slices
  const prevDaily = filterDated(input.dailyLogs, x => x.date, prev.start, prev.end);
  const prevIqc = filterDated(input.iqcRecords, x => x.date, prev.start, prev.end);
  const prevPqc = filterDated(input.pqcRecords, x => x.date, prev.start, prev.end);
  const prevOqc = filterDated(input.oqcRecords, x => x.date, prev.start, prev.end);
  const prevDefects = filterDated(input.defects, x => x.defectDate || x.sourceDate || x.saleDate, prev.start, prev.end);
  const prevPartEvals = filterDated(input.partEvaluations, x => x.receivedDate, prev.start, prev.end);

  // --- 1. IQC ---
  const iqcTotal = curIqc.length;
  const iqcPassed = curIqc.filter(isIqcPassed).length;
  const iqcFailed = curIqc.filter(isIqcFailed).length;
  const iqcRate = iqcTotal > 0 ? Number(((iqcPassed / iqcTotal) * 100).toFixed(1)) : 100;

  const prevIqcTotal = prevIqc.length;
  const prevIqcPassed = prevIqc.filter(isIqcPassed).length;
  const prevIqcRate = prevIqcTotal > 0 ? Number(((prevIqcPassed / prevIqcTotal) * 100).toFixed(1)) : iqcRate;

  const iqcSupplierMap = new Map<string, { total: number; failed: number }>();
  curIqc.forEach(r => {
    const name = (r.supplierName || 'Không rõ NCC').trim();
    const cur = iqcSupplierMap.get(name) || { total: 0, failed: 0 };
    cur.total++;
    if (isIqcFailed(r)) cur.failed++;
    iqcSupplierMap.set(name, cur);
  });
  const prevIqcSupplierMap = new Map<string, { total: number; failed: number }>();
  prevIqc.forEach(r => {
    const name = (r.supplierName || 'Không rõ NCC').trim();
    const cur = prevIqcSupplierMap.get(name) || { total: 0, failed: 0 };
    cur.total++;
    if (isIqcFailed(r)) cur.failed++;
    prevIqcSupplierMap.set(name, cur);
  });

  const deterioratingSuppliers: string[] = [];
  const iqcBySupplier: RankedItem[] = Array.from(iqcSupplierMap.entries())
    .map(([name, st]) => {
      const failRate = st.total > 0 ? Number(((st.failed / st.total) * 100).toFixed(1)) : 0;
      const prevSt = prevIqcSupplierMap.get(name);
      const prevFailRate = prevSt && prevSt.total > 0 ? (prevSt.failed / prevSt.total) * 100 : 0;
      const isDeteriorating = st.failed > 0 && prevSt !== undefined && prevSt.failed > 0 && failRate >= prevFailRate;
      if (isDeteriorating) deterioratingSuppliers.push(name);
      return {
        name,
        count: st.total,
        failed: st.failed,
        resolved: st.total - st.failed,
        pct: iqcTotal > 0 ? Math.round((st.total / iqcTotal) * 100) : 0,
        rate: failRate,
        alert: isDeteriorating || failRate >= 15
      };
    })
    .sort((a, b) => (b.failed || 0) - (a.failed || 0) || b.count - a.count);

  // --- 2. PQC ---
  const pqcTotal = curPqc.length;
  const pqcResolved = curPqc.filter(isPqcResolved).length;
  const pqcPending = pqcTotal - pqcResolved;
  const pqcRate = pqcTotal > 0 ? Number(((pqcResolved / pqcTotal) * 100).toFixed(1)) : 100;

  const prevPqcTotal = prevPqc.length;
  const prevPqcResolved = prevPqc.filter(isPqcResolved).length;
  const prevPqcRate = prevPqcTotal > 0 ? Number(((prevPqcResolved / prevPqcTotal) * 100).toFixed(1)) : pqcRate;

  const pqcModelMap = new Map<string, { total: number; resolved: number }>();
  curPqc.forEach(r => {
    const m = (r.model || 'Khác').trim();
    const cur = pqcModelMap.get(m) || { total: 0, resolved: 0 };
    cur.total++;
    if (isPqcResolved(r)) cur.resolved++;
    pqcModelMap.set(m, cur);
  });
  const pqcByModel: RankedItem[] = Array.from(pqcModelMap.entries())
    .map(([name, st]) => ({
      name,
      count: st.total,
      resolved: st.resolved,
      pct: pqcTotal > 0 ? Math.round((st.total / pqcTotal) * 100) : 0,
      rate: st.total > 0 ? Math.round((st.resolved / st.total) * 100) : 100
    }))
    .sort((a, b) => b.count - a.count);

  // --- 3. OQC ---
  const oqcTotal = curOqc.length;
  const oqcPassed = curOqc.filter(isOqcPassed).length;
  const oqcFailed = curOqc.filter(isOqcFailed).length;
  const oqcYield = oqcTotal > 0 ? Number(((oqcPassed / oqcTotal) * 100).toFixed(1)) : 100;

  const prevOqcTotal = prevOqc.length;
  const prevOqcPassed = prevOqc.filter(isOqcPassed).length;
  const prevOqcYield = prevOqcTotal > 0 ? Number(((prevOqcPassed / prevOqcTotal) * 100).toFixed(1)) : oqcYield;

  const oqcFailedRecords = curOqc.filter(isOqcFailed);
  const oqcModelMap = new Map<string, { total: number; failed: number }>();
  const oqcCauseMap = new Map<string, number>();
  curOqc.forEach(r => {
    const m = (r.model || 'Khác').trim();
    const cur = oqcModelMap.get(m) || { total: 0, failed: 0 };
    cur.total++;
    if (isOqcFailed(r)) {
      cur.failed++;
      const cause = (r.rootCause || r.defectDetail || 'Chưa phân loại').trim();
      oqcCauseMap.set(cause, (oqcCauseMap.get(cause) || 0) + 1);
    }
    oqcModelMap.set(m, cur);
  });
  const oqcByModel: RankedItem[] = Array.from(oqcModelMap.entries())
    .map(([name, st]) => ({
      name,
      count: st.total,
      failed: st.failed,
      resolved: st.total - st.failed,
      pct: oqcTotal > 0 ? Math.round((st.total / oqcTotal) * 100) : 0,
      rate: st.total > 0 ? Number((((st.total - st.failed) / st.total) * 100).toFixed(1)) : 100
    }))
    .sort((a, b) => (b.failed || 0) - (a.failed || 0) || b.count - a.count);
  const oqcByRootCause: RankedItem[] = Array.from(oqcCauseMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      pct: oqcFailed > 0 ? Math.round((count / oqcFailed) * 100) : 0,
      rate: 0
    }))
    .sort((a, b) => b.count - a.count);

  // --- 4. Market Defects ---
  const mktTotal = curDefects.length;
  const mktResolved = curDefects.filter(d => d.status === 'Đã xử lý').length;
  const mktPending = mktTotal - mktResolved;
  const mktSevA = curDefects.filter(d => d.severity === 'A' || d.severity === 'Cao' || d.severity === 'Nghiêm trọng').length;
  const mktRate = mktTotal > 0 ? Number(((mktResolved / mktTotal) * 100).toFixed(1)) : 100;

  const prevMktTotal = prevDefects.length;
  const prevMktResolved = prevDefects.filter(d => d.status === 'Đã xử lý').length;
  const prevMktRate = prevMktTotal > 0 ? Number(((prevMktResolved / prevMktTotal) * 100).toFixed(1)) : mktRate;

  const groupDefects = (getter: (d: MarketDefect) => string): RankedItem[] => {
    const map = new Map<string, { count: number; resolved: number; sevA: number }>();
    curDefects.forEach(d => {
      const k = (getter(d) || 'Khác').trim();
      const cur = map.get(k) || { count: 0, resolved: 0, sevA: 0 };
      cur.count++;
      if (d.status === 'Đã xử lý') cur.resolved++;
      if (d.severity === 'A' || d.severity === 'Cao' || d.severity === 'Nghiêm trọng') cur.sevA++;
      map.set(k, cur);
    });
    return Array.from(map.entries())
      .map(([name, st]) => ({
        name,
        count: st.count,
        resolved: st.resolved,
        sevA: st.sevA,
        pct: mktTotal > 0 ? Math.round((st.count / mktTotal) * 100) : 0,
        rate: st.count > 0 ? Math.round((st.resolved / st.count) * 100) : 100
      }))
      .sort((a, b) => b.count - a.count);
  };
  const defectsByModel = groupDefects(d => d.model);
  const defectsByDealer = groupDefects(d => d.dealer || d.customerName || 'Khách lẻ');
  const defectsByType = groupDefects(d => d.type || 'Chưa phân loại');

  // Repeated defects >= 3 across current period (model + type)
  const repeatKeyMap = new Map<string, number>();
  curDefects.forEach(d => {
    const key = `${d.model || 'Xe'} – ${d.type || 'Lỗi'}`;
    repeatKeyMap.set(key, (repeatKeyMap.get(key) || 0) + 1);
  });
  const repeatedDefects = Array.from(repeatKeyMap.entries())
    .filter(([, count]) => count >= 3)
    .map(([label, count]) => ({ label, count, targetTab: 'defects' }))
    .sort((a, b) => b.count - a.count);

  // --- 5. Part Evaluations (BM-KTTD-01) ---
  const partQty = curPartEvals.reduce((s, e) => s + Math.max(1, Number(e.quantity) || 1), 0);
  const prevPartQty = prevPartEvals.reduce((s, e) => s + Math.max(1, Number(e.quantity) || 1), 0);
  const partCauseCounts: Record<'Lỗi NCC' | 'Lỗi SX' | 'Lỗi KH', { records: number; qty: number }> = {
    'Lỗi NCC': { records: 0, qty: 0 },
    'Lỗi SX': { records: 0, qty: 0 },
    'Lỗi KH': { records: 0, qty: 0 }
  };
  const partResCounts = new Map<string, { records: number; qty: number }>();
  const partNameMap = new Map<string, number>();
  const partSupMap = new Map<string, number>();

  curPartEvals.forEach(e => {
    const q = Math.max(1, Number(e.quantity) || 1);
    if (partCauseCounts[e.rootCauseCategory]) {
      partCauseCounts[e.rootCauseCategory].records++;
      partCauseCounts[e.rootCauseCategory].qty += q;
    }
    const resKey = e.resolution || 'Khác';
    const rCur = partResCounts.get(resKey) || { records: 0, qty: 0 };
    rCur.records++;
    rCur.qty += q;
    partResCounts.set(resKey, rCur);

    const pName = (e.partName || 'Khác').trim();
    partNameMap.set(pName, (partNameMap.get(pName) || 0) + q);
    if (e.supplierName?.trim()) {
      const sName = e.supplierName.trim();
      partSupMap.set(sName, (partSupMap.get(sName) || 0) + q);
    }
  });

  const nccPct = partQty > 0 ? Math.round((partCauseCounts['Lỗi NCC'].qty / partQty) * 100) : 0;
  const sxPct = partQty > 0 ? Math.round((partCauseCounts['Lỗi SX'].qty / partQty) * 100) : 0;
  const khPct = partQty > 0 ? Math.round((partCauseCounts['Lỗi KH'].qty / partQty) * 100) : 0;

  const partsByCause = (Object.keys(partCauseCounts) as ('Lỗi NCC' | 'Lỗi SX' | 'Lỗi KH')[]).map(c => ({
    cause: c,
    records: partCauseCounts[c].records,
    qty: partCauseCounts[c].qty,
    pct: partQty > 0 ? Math.round((partCauseCounts[c].qty / partQty) * 100) : 0
  }));
  const partsByResolution = Array.from(partResCounts.entries()).map(([resolution, st]) => ({
    resolution,
    records: st.records,
    qty: st.qty,
    pct: partQty > 0 ? Math.round((st.qty / partQty) * 100) : 0
  }));
  const topFailingParts: RankedItem[] = Array.from(partNameMap.entries())
    .map(([name, count]) => ({ name, count, pct: partQty > 0 ? Math.round((count / partQty) * 100) : 0, rate: 0 }))
    .sort((a, b) => b.count - a.count);
  const topFailingPartSuppliers: RankedItem[] = Array.from(partSupMap.entries())
    .map(([name, count]) => ({ name, count, pct: partQty > 0 ? Math.round((count / partQty) * 100) : 0, rate: 0 }))
    .sort((a, b) => b.count - a.count);

  // --- 6. CAPA & ECO ---
  const openCapas = input.capas.filter(c => getCapaStatus(c) !== 'Đã đóng');
  const overdueCapas = openCapas.filter(c => {
    const s = getCapaStatus(c);
    if (s === 'Quá hạn') return true;
    const due = getCapaDueDate(c);
    return due ? due.getTime() < now.getTime() : false;
  });
  const closedCapas = input.capas.filter(c => getCapaStatus(c) === 'Đã đóng');
  const effectiveCapas = closedCapas.filter(c => (c.effectiveness || c.Effectiveness) === 'Hiệu quả');
  const capasInPeriod = filterDated(input.capas, c => c.targetDate || c.dueDate || c.DueDate, start, end, false);
  const capaOnTimeScore =
    openCapas.length + closedCapas.length > 0
      ? Math.round(((openCapas.length - overdueCapas.length + closedCapas.length) / (openCapas.length + closedCapas.length)) * 100)
      : 100;

  const improvementsDone = input.improvementActions.filter(a => a.status === 'Đã hoàn thành').length;

  // --- 7. Daily Logs & PTSP ---
  const dailyTotal = curDaily.length;
  const dailyCompleted = curDaily.filter(l => l.statusPercent === '100%').length;
  const dailyRate = dailyTotal > 0 ? Math.round((dailyCompleted / dailyTotal) * 100) : 100;

  const prevDailyTotal = prevDaily.length;
  const prevDailyCompleted = prevDaily.filter(l => l.statusPercent === '100%').length;
  const prevDailyRate = prevDailyTotal > 0 ? Math.round((prevDailyCompleted / prevDailyTotal) * 100) : dailyRate;

  // Công việc tồn đọng: Chỉ ghi lại các công việc chưa hoàn thành 100% của kỳ cũ (tuần trước / tháng trước)
  const pendingDailyLogs = prevDaily.filter(l => l.statusPercent !== '100%');
  const pendingAssigneeMap = new Map<string, DailyLogRecord[]>();
  pendingDailyLogs.forEach(l => {
    const a = (l.assignee || 'Chưa phân công').trim();
    const list = pendingAssigneeMap.get(a) || [];
    list.push(l);
    pendingAssigneeMap.set(a, list);
  });
  const pendingByAssignee = Array.from(pendingAssigneeMap.entries())
    .map(([assignee, items]) => ({ assignee, count: items.length, items }))
    .sort((a, b) => b.count - a.count);

  const ptspTotal = input.ptspTasks.length;
  const ptspCompleted = input.ptspTasks.filter(t => t.progress >= 100).length;
  const ptspOverdue = input.ptspTasks.filter(t => {
    if (t.progress >= 100) return false;
    const d = parseFlexibleDate(t.endDate);
    return d ? d.getTime() < now.getTime() : false;
  });
  const ptspAvgProgress = ptspTotal > 0 ? Math.round(input.ptspTasks.reduce((s, t) => s + (t.progress || 0), 0) / ptspTotal) : 0;

  // --- 8. COPQ ---
  const curCopqs = input.copqs.filter(c => {
    if (c.month && c.year) {
      if (period.type === 'month') return c.month === period.value && c.year === period.year;
      const startM = period.start.getMonth() + 1;
      const endM = period.end.getMonth() + 1;
      return c.year === period.year && (c.month === startM || c.month === endM);
    }
    return false;
  });
  const prevCopqs = input.copqs.filter(c => {
    if (c.month && c.year) {
      if (period.type === 'month') return c.month === prev.value && c.year === prev.year;
      return false;
    }
    return false;
  });
  const copqAmount = curCopqs.reduce((s, c) => s + (Number(c.totalAmount ?? c.amount) || 0), 0);
  const prevCopqAmount = prevCopqs.reduce((s, c) => s + (Number(c.totalAmount ?? c.amount) || 0), 0);
  const copqCatMap = new Map<string, number>();
  curCopqs.forEach(c => {
    const cat = c.category || 'Khác';
    copqCatMap.set(cat, (copqCatMap.get(cat) || 0) + (Number(c.totalAmount ?? c.amount) || 0));
  });
  const copqByCategory = Array.from(copqCatMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  // --- 9. Q-INDEX (Transparent weighted average excluding inactive components) ---
  const components: QIndexComponent[] = [
    {
      key: 'oqc',
      label: 'OQC Xuất xưởng',
      weight: 30,
      score: oqcTotal > 0 ? oqcYield : null,
      detail: oqcTotal > 0 ? `${oqcPassed}/${oqcTotal} xe đạt (${oqcYield}%)` : 'Không phát sinh'
    },
    {
      key: 'iqc',
      label: 'IQC Đầu vào',
      weight: 20,
      score: iqcTotal > 0 ? iqcRate : null,
      detail: iqcTotal > 0 ? `${iqcPassed}/${iqcTotal} lô đạt (${iqcRate}%)` : 'Không phát sinh'
    },
    {
      key: 'pqc',
      label: 'PQC Công đoạn',
      weight: 15,
      score: pqcTotal > 0 ? pqcRate : null,
      detail: pqcTotal > 0 ? `${pqcResolved}/${pqcTotal} đã xử lý (${pqcRate}%)` : 'Không phát sinh'
    },
    {
      key: 'market',
      label: 'Phản ánh Thị trường',
      weight: 15,
      score: mktTotal > 0 ? mktRate : null,
      detail: mktTotal > 0 ? `${mktResolved}/${mktTotal} đã xử lý (${mktRate}%)` : 'Không phát sinh'
    },
    {
      key: 'capa',
      label: 'CAPA đúng hạn',
      weight: 10,
      score: openCapas.length + closedCapas.length > 0 ? capaOnTimeScore : null,
      detail: openCapas.length + closedCapas.length > 0 ? `${overdueCapas.length} quá hạn / ${openCapas.length} đang mở` : 'Không phát sinh'
    },
    {
      key: 'daily',
      label: 'Tuân thủ Báo ngày',
      weight: 10,
      score: dailyTotal > 0 ? dailyRate : null,
      detail: dailyTotal > 0 ? `${dailyCompleted}/${dailyTotal} hoàn thành (${dailyRate}%)` : 'Không phát sinh'
    }
  ];

  const activeComps = components.filter(c => c.score !== null);
  const activeWeightSum = activeComps.reduce((s, c) => s + c.weight, 0);
  const qScore =
    activeWeightSum > 0
      ? Math.round(activeComps.reduce((s, c) => s + (c.score as number) * c.weight, 0) / activeWeightSum)
      : 0;
  const qGrade: ReportSnapshot['qIndex']['grade'] =
    qScore >= 95 ? 'Xuất sắc' : qScore >= 85 ? 'Đạt chuẩn' : qScore >= 70 ? 'Cần cải thiện' : 'Cảnh báo';

  // --- 10. 4 QC TOOLS ---
  // Tool 1: Check Sheet (defect types x time columns)
  const colLabels =
    period.type === 'week'
      ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
      : ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'];
  const getColIdx = (d: Date): number => {
    if (period.type === 'week') {
      const day = d.getDay(); // 0=Sun..6=Sat
      return day === 0 ? 6 : day - 1;
    }
    return Math.min(4, Math.floor((d.getDate() - 1) / 7));
  };
  const csMap = new Map<string, number[]>();
  const addCs = (label: string, dateStr?: string) => {
    const d = parseFlexibleDate(dateStr);
    if (!d) return;
    const idx = getColIdx(d);
    const arr = csMap.get(label) || Array(colLabels.length).fill(0);
    arr[idx] += 1;
    csMap.set(label, arr);
  };
  oqcFailedRecords.forEach(r => addCs(`OQC: ${r.rootCause || r.defectDetail || 'Lỗi khác'}`, r.date));
  curPqc.forEach(r => addCs(`PQC: ${r.findings ? r.findings.slice(0, 32) : r.model || 'Lỗi công đoạn'}`, r.date));
  curDefects.forEach(r => addCs(`Thị trường: ${r.type || 'Chưa phân loại'}`, r.defectDate || r.sourceDate || r.saleDate));

  const csRows = Array.from(csMap.entries())
    .map(([label, counts]) => ({ label, counts, total: counts.reduce((s, v) => s + v, 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);
  const colTotals = colLabels.map((_, ci) => csRows.reduce((s, r) => s + r.counts[ci], 0));
  const checkSheet: CheckSheetMatrix = {
    columns: colLabels,
    rows: csRows,
    colTotals,
    grandTotal: colTotals.reduce((s, v) => s + v, 0)
  };

  // Tool 2: Pareto (with cumulative 80/20%)
  const buildPareto = (items: RankedItem[]): RankedItem[] => {
    const sum = items.reduce((s, i) => s + i.count, 0);
    let acc = 0;
    return items.slice(0, 10).map(item => {
      acc += item.count;
      return {
        ...item,
        pct: sum > 0 ? Math.round((item.count / sum) * 100) : 0,
        cumPct: sum > 0 ? Math.round((acc / sum) * 100) : 0
      };
    });
  };
  const paretoSourceMap = new Map<string, number>();
  oqcFailedRecords.forEach(r => {
    const k = (r.rootCause || r.defectDetail || 'OQC khác').trim();
    paretoSourceMap.set(k, (paretoSourceMap.get(k) || 0) + 1);
  });
  curDefects.forEach(d => {
    const k = (d.type || 'Thị trường khác').trim();
    paretoSourceMap.set(k, (paretoSourceMap.get(k) || 0) + 1);
  });
  const paretoDefects = buildPareto(
    Array.from(paretoSourceMap.entries())
      .map(([name, count]) => ({ name, count, pct: 0, rate: 0 }))
      .sort((a, b) => b.count - a.count)
  );
  const paretoParts = buildPareto(topFailingParts);

  // Tool 3: Stratification (by Model & Supplier across IQC/PQC/OQC/Market)
  const stratModelMap = new Map<string, { issues: number; totalChecks: number }>();
  curOqc.forEach(r => {
    const m = (r.model || 'Khác').trim();
    const cur = stratModelMap.get(m) || { issues: 0, totalChecks: 0 };
    cur.totalChecks++;
    if (isOqcFailed(r)) cur.issues++;
    stratModelMap.set(m, cur);
  });
  curPqc.forEach(r => {
    const m = (r.model || 'Khác').trim();
    const cur = stratModelMap.get(m) || { issues: 0, totalChecks: 0 };
    cur.totalChecks++;
    cur.issues++;
    stratModelMap.set(m, cur);
  });
  curDefects.forEach(d => {
    const m = (d.model || 'Khác').trim();
    const cur = stratModelMap.get(m) || { issues: 0, totalChecks: 0 };
    cur.totalChecks++;
    cur.issues++;
    stratModelMap.set(m, cur);
  });
  const totalStratIssues = Array.from(stratModelMap.values()).reduce((s, v) => s + v.issues, 0);
  const stratificationByModel: RankedItem[] = Array.from(stratModelMap.entries())
    .map(([name, st]) => ({
      name,
      count: st.issues,
      failed: st.issues,
      resolved: st.totalChecks,
      pct: totalStratIssues > 0 ? Math.round((st.issues / totalStratIssues) * 100) : 0,
      rate: st.totalChecks > 0 ? Number(((st.issues / st.totalChecks) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.count - a.count);

  const stratificationBySupplier = iqcBySupplier;

  // Tool 4: Control Chart (p-chart) for OQC daily & IQC lots
  const oqcDayBuckets = new Map<string, { label: string; total: number; failed: number; sortKey: number }>();
  curOqc.forEach(r => {
    const d = parseFlexibleDate(r.date);
    if (!d) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cur = oqcDayBuckets.get(key) || { label, total: 0, failed: 0, sortKey: d.getTime() };
    cur.total++;
    if (isOqcFailed(r)) cur.failed++;
    oqcDayBuckets.set(key, cur);
  });
  const oqcControlChart = buildPChart(
    'Biểu đồ kiểm soát p-chart: Tỷ lệ xe lỗi OQC theo ngày',
    Array.from(oqcDayBuckets.values()).sort((a, b) => a.sortKey - b.sortKey)
  );

  const iqcLotBuckets = curIqc
    .map(r => {
      const d = parseFlexibleDate(r.date);
      const total = Math.max(1, Number(r.checkedQty) || Number(r.totalQty) || 1);
      const failed = Math.min(total, Math.max(0, Number(r.failedQty) || (isIqcFailed(r) ? 1 : 0)));
      return {
        label: `${r.supplierName?.slice(0, 12) || 'NCC'} (${d ? `${d.getDate()}/${d.getMonth() + 1}` : ''})`,
        total,
        failed,
        sortKey: d ? d.getTime() : 0
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(-15);
  const iqcControlChart = buildPChart(
    'Biểu đồ kiểm soát p-chart: Tỷ lệ lỗi IQC theo lô',
    iqcLotBuckets
  );

  // --- 11. RULE-BASED HIGHLIGHTS, WARNINGS & ACTIONS ---
  const highlights: ReportAlert[] = [];
  const warnings: ReportAlert[] = [];
  const recommendedActions: ReportAlert[] = [];

  if (oqcTotal > 0 && oqcYield >= 97) {
    highlights.push({
      id: 'hl-oqc',
      level: 'positive',
      category: 'OQC',
      title: `Tỷ lệ đạt xuất xưởng OQC đạt ${oqcYield}%`,
      detail: `${oqcPassed}/${oqcTotal} xe đạt chuẩn xuất xưởng trong ${period.label}.`,
      targetTab: 'quality_inspection'
    });
  }
  if (iqcTotal > 0 && iqcPassRateCheck(iqcRate)) {
    highlights.push({
      id: 'hl-iqc',
      level: 'positive',
      category: 'IQC',
      title: `Kiểm soát đầu vào IQC đạt ${iqcRate}%`,
      detail: `${iqcPassed}/${iqcTotal} lô linh kiện đạt yêu cầu thông quan.`,
      targetTab: 'quality_inspection'
    });
  }
  if (mktTotal > 0 && mktRate >= 85) {
    highlights.push({
      id: 'hl-mkt',
      level: 'positive',
      category: 'Thị trường',
      title: `Tỷ lệ xử lý phản ánh thị trường đạt ${mktRate}%`,
      detail: `Đã đóng ${mktResolved}/${mktTotal} hồ sơ phản ánh.`,
      targetTab: 'defects'
    });
  }

  if (oqcTotal > 0 && oqcYield < 95) {
    warnings.push({
      id: 'wn-oqc',
      level: oqcYield < 90 ? 'critical' : 'warning',
      category: 'OQC',
      title: `OQC Yield (${oqcYield}%) thấp hơn ngưỡng 95%`,
      detail: `Có ${oqcFailed} xe lỗi trên tổng ${oqcTotal} xe kiểm tra.`,
      action: 'Rà soát lỗi OQC đứng đầu Pareto và khoanh vùng LSX liên quan.',
      targetTab: 'quality_inspection'
    });
  }
  if (deterioratingSuppliers.length > 0) {
    warnings.push({
      id: 'wn-sup',
      level: 'critical',
      category: 'IQC / NCC',
      title: `${deterioratingSuppliers.length} NCC có lỗi IQC 2 kỳ liên tiếp`,
      detail: `NCC: ${deterioratingSuppliers.join(', ')}.`,
      action: 'Mở SCAR/CAPA và tăng cường kiểm tra 100% đầu vào cho các NCC này.',
      targetTab: 'suppliers'
    });
  }
  if (repeatedDefects.length > 0) {
    warnings.push({
      id: 'wn-rep',
      level: 'critical',
      category: 'Thị trường',
      title: `${repeatedDefects.length} lỗi thị trường lặp lại ≥ 3 lần`,
      detail: repeatedDefects.map(r => `${r.label} (${r.count})`).join('; '),
      action: 'Kích hoạt CAPA phòng ngừa hoặc đề xuất ECO thay đổi thiết kế/NCC.',
      targetTab: 'defects'
    });
  }
  if (overdueCapas.length > 0) {
    warnings.push({
      id: 'wn-capa',
      level: 'critical',
      category: 'CAPA',
      title: `Có ${overdueCapas.length} hồ sơ CAPA quá hạn`,
      detail: overdueCapas.slice(0, 3).map(c => `${c.id || c.CAPAID}: ${c.title || c.issue || c.Issue || ''}`).join(' • '),
      action: 'Đôn đốc PIC hoàn thành khắc phục và đánh giá hiệu quả ngay.',
      targetTab: 'capa'
    });
  }
  if (mktSevA > 0) {
    warnings.push({
      id: 'wn-seva',
      level: 'warning',
      category: 'Thị trường',
      title: `Phát sinh ${mktSevA} sự cố thị trường mức độ A/Cao`,
      detail: 'Cần ưu tiên xử lý triệt để tránh lan rộng mạng lưới đại lý.',
      action: 'Kiểm tra danh sách sự cố mức A và gắn CAPA xử lý.',
      targetTab: 'defects'
    });
  }
  if (pendingDailyLogs.length > 0) {
    warnings.push({
      id: 'wn-daily',
      level: 'warning',
      category: 'Công việc',
      title: `${pendingDailyLogs.length} đầu việc tồn đọng từ ${period.type === 'week' ? 'tuần trước' : 'tháng trước'} chưa đạt 100%`,
      detail: pendingByAssignee.slice(0, 3).map(p => `${p.assignee} (${p.count})`).join(', '),
      action: 'Theo dõi nhân sự xử lý dứt điểm công việc tồn của kỳ cũ.',
      targetTab: 'daily_logs'
    });
  }
  if (oqcControlChart.points.some(p => p.outOfControl) || iqcControlChart.points.some(p => p.outOfControl)) {
    warnings.push({
      id: 'wn-spc',
      level: 'warning',
      category: '7QC (p-chart)',
      title: 'Phát hiện điểm vượt giới hạn kiểm soát UCL trên biểu đồ p-chart',
      detail: 'Quá trình kiểm soát có biến động bất thường cần tìm nguyên nhân đặc biệt.',
      action: 'Xem chi tiết tab Công cụ QC → Biểu đồ kiểm soát p-chart.'
    });
  }

  warnings.forEach((w, idx) => {
    if (w.action) {
      recommendedActions.push({
        id: `act-${idx}`,
        level: w.level,
        category: w.category,
        title: w.action,
        detail: `Từ cảnh báo: ${w.title}`,
        targetTab: w.targetTab
      });
    }
  });

  const note = input.reportNotes.find(n => n.id === period.id) || null;

  return {
    period,
    generatedAt: now.toISOString(),
    missingDateCount,
    qIndex: {
      score: qScore,
      grade: qGrade,
      formulaText: 'OQC 30% + IQC 20% + PQC 15% + Thị trường 15% + CAPA 10% + Báo ngày 10% (chuẩn hóa theo các mục có phát sinh)',
      activeWeightSum,
      components
    },
    kpis: {
      oqcYield: { ...makeDelta(oqcYield, prevOqcYield), total: oqcTotal, passed: oqcPassed, failed: oqcFailed },
      iqcPassRate: { ...makeDelta(iqcRate, prevIqcRate), total: iqcTotal, passed: iqcPassed, failed: iqcFailed },
      pqcResolveRate: { ...makeDelta(pqcRate, prevPqcRate), total: pqcTotal, resolved: pqcResolved, pending: pqcPending },
      marketResolveRate: { ...makeDelta(mktRate, prevMktRate), total: mktTotal, resolved: mktResolved, pending: mktPending, sevA: mktSevA },
      partEvalQty: { ...makeDelta(partQty, prevPartQty), records: curPartEvals.length, nccPct, sxPct, khPct },
      capaOpen: { ...makeDelta(openCapas.length, openCapas.length), total: input.capas.length, overdue: overdueCapas.length, closedInPeriod: closedCapas.length, effectiveCount: effectiveCapas.length },
      dailyCompliance: { ...makeDelta(dailyRate, prevDailyRate), total: dailyTotal, completed: dailyCompleted, pendingCount: pendingDailyLogs.length },
      copqAmount: { ...makeDelta(copqAmount, prevCopqAmount), byCategory: copqByCategory }
    },
    production: {
      iqcRecords: curIqc,
      iqcBySupplier,
      deterioratingSuppliers,
      pqcRecords: curPqc,
      pqcByModel,
      oqcFailedRecords,
      oqcByModel,
      oqcByRootCause,
      auditsInPeriod: curAudits
    },
    market: {
      defectsInPeriod: curDefects,
      defectsByModel,
      defectsByDealer,
      defectsByType,
      repeatedDefects,
      partEvalsInPeriod: curPartEvals,
      partsByCause,
      partsByResolution,
      topFailingParts,
      topFailingPartSuppliers
    },
    capaEco: {
      capasAll: input.capas,
      capasInPeriod,
      overdueCapas,
      ecosInPeriod: curEcos,
      ecosAll: input.ecos,
      improvementsInPeriod: curImprovements,
      improvementsTotal: input.improvementActions.length,
      improvementsDone
    },
    work: {
      dailyLogsInPeriod: curDaily,
      pendingDailyLogs,
      pendingByAssignee,
      ptspTotal,
      ptspCompleted,
      ptspOverdue,
      ptspAvgProgress
    },
    qcTools: {
      checkSheet,
      paretoDefects,
      paretoParts,
      stratificationByModel,
      stratificationBySupplier,
      oqcControlChart,
      iqcControlChart
    },
    highlights,
    warnings,
    recommendedActions,
    note
  };
}

function iqcPassRateCheck(rate: number): boolean {
  return rate >= 95;
}

