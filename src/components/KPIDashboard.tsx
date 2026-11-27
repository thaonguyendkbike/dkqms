import React, { useState, useMemo, useEffect } from 'react';
import XLSXStyle from 'xlsx-js-style';
import {
  DEFAULT_DETAILED_KPIS,
  STAFF_BM_KPI_PROFILES,
  DetailedKPI,
  StaffBmKpiProfile,
  StaffKpiPeriodEvaluation
} from '../initialKpis';
export {
  DEFAULT_DETAILED_KPIS,
  STAFF_BM_KPI_PROFILES,
  type DetailedKPI,
  type StaffBmKpiProfile,
  type StaffKpiPeriodEvaluation
} from '../initialKpis';
import { safeStorage } from '../safeStorage';
import { parseFlexibleDate, getLocalYmd, formatDateStrVi } from '../utils/dateUtils';
import { resolveCopqVnd } from '../utils/copqUtils';
import {
  CheckCircle2,
  Plus,
  Search,
  Building2,
  FileSpreadsheet,
  Download,
  UserCheck,
  RefreshCw,
  Zap,
  Target,
  Pencil,
  Trash2,
  Eye,
  Printer,
  ChevronDown,
  Users,
  BookOpen,
  Check,
  X,
  ExternalLink,
  Database,
  Clock,
  Layers
} from 'lucide-react';

interface KPIDashboardProps {
  onUpdateOverallKPI?: (score: number) => void;
  onViewDetail?: (data: any) => void;
  onNavigateToTab?: (tabId: string) => void;
  iqcRecords?: any[];
  pqcRecords?: any[];
  oqcRecords?: any[];
  oqcHandoverList?: any[];
  suppliers?: any[];
  supplierProductionAudits?: any[];
  capas?: any[];
  defects?: any[];
  copqs?: any[];
  partEvaluations?: any[];
  ptspModels?: any[];
  equipments?: any[];
  maintenanceLogs?: any[];
  equipmentIncidents?: any[];
  fabricationJobs?: any[];
  qmsBmRecords?: any[];
  dailyLogs?: any[];
  weeklyPlans?: any[];
  monthlyPlans?: any[];
  planningTasks?: any[];
  staffList?: any[];
  kpis?: DetailedKPI[];
  setKpis?: React.Dispatch<React.SetStateAction<DetailedKPI[]>> | any;
  staffKpiEvaluations?: Record<string, StaffKpiPeriodEvaluation>;
  setStaffKpiEvaluations?: React.Dispatch<React.SetStateAction<Record<string, StaffKpiPeriodEvaluation>>> | any;
  onSyncKpis?: (updatedKpis: DetailedKPI[]) => void;
  onSyncStaffEvaluations?: (updatedEvals: Record<string, StaffKpiPeriodEvaluation>) => void;
}

export interface DrilldownRecordRow {
  id: string;
  date: string;
  title: string;
  actor: string;
  resultText: string;
  isPass: boolean;
}

export interface ComputedAutoMetric {
  key: string;
  actualText: string;
  numericValue: number;
  evidenceText: string;
  hasData: boolean;
  targetTab: string;
  targetTabLabel: string;
  sourceRecords: DrilldownRecordRow[];
}

function normalizePersonKey(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');
}

function personMatchesField(rawField: any, profile: StaffBmKpiProfile): boolean {
  if (!rawField) return false;
  const tokens = String(rawField)
    .split(/[,;/|&+]+/)
    .map(t => normalizePersonKey(t))
    .filter(Boolean);
  if (tokens.length === 0) return false;
  const targetKeys = [
    normalizePersonKey(profile.staffName),
    ...profile.aliases.map(a => normalizePersonKey(a))
  ];
  return tokens.some(tok =>
    targetKeys.some(tk => tok === tk || (tk.length >= 4 && tok.endsWith(' ' + tk)) || tok.includes(tk))
  );
}

function isRecordInDateRange(rawDate: any, start: Date, end: Date): boolean {
  if (!rawDate) return false;
  const d = parseFlexibleDate(String(rawDate));
  if (!d) return false;
  const t = d.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function isDailyLogCompleted(l: any): boolean {
  if (!l) return false;
  const pctStr = String(l.statusPercent || '').trim();
  const pctNum = parseInt(pctStr.replace('%', ''), 10);
  if (pctStr === '100%' || (!Number.isNaN(pctNum) && pctNum >= 100)) return true;
  if (l.target && l.result && String(l.result).trim() !== '' && String(l.result).trim() === String(l.target).trim()) {
    return true;
  }
  const st = String(l.status || '').trim().toLowerCase();
  return st === 'hoàn thành' || st === 'completed' || st === 'đã đóng' || st === 'đã xử lý' || st === 'closed';
}

function isDailyLogOverdue(l: any, todayStartMs: number): boolean {
  if (!l || isDailyLogCompleted(l)) return false;
  const d = parseFlexibleDate(l.deadline || l.dueDate || l.targetDate);
  if (!d) return false;
  return d.getTime() < todayStartMs;
}

function isCapaClosedStatus(c: any): boolean {
  const raw = String(c?.status || c?.Status || 'Mở').trim().toLowerCase();
  return raw === 'đóng' || raw === 'đã đóng' || raw === 'closed' || raw === 'hoàn thành' || raw === 'đã xử lý';
}

function isIqcLotPassed(r: any): boolean {
  const res = String(r?.result || r?.status || '').trim().toLowerCase();
  return res === 'đạt' || res === 'thông quan' || res === 'pass' || res === 'ok';
}

function isPqcRecordPassed(r: any): boolean {
  const st = String(r?.status || '').trim();
  return st === 'Đạt hoàn toàn' || st === 'Đã cải tiến' || st === 'Đạt';
}

function isOqcRecordPassed(r: any): boolean {
  const st = String(r?.status || r?.result || '').trim().toLowerCase();
  return st === 'đạt' || st === 'pass' || st === 'ok' || st === 'thông quan';
}

function isSqcAuditResolved(a: any): boolean {
  const st = String(a?.status || '').trim().toLowerCase();
  return st === 'approved' || st === 'updated' || st === 'đã xử lý' || st === 'đóng' || st === 'hoàn thành' || st === 'đạt';
}

function isMarketDefectResolved(d: any): boolean {
  const st = String(d?.status || '').trim().toLowerCase();
  return st === 'đã xử lý' || st === 'hoàn thành' || st === 'đã đóng' || st === 'đóng' || st === 'resolved';
}

function computeAttainmentAndStatus(
  numericVal: number,
  targetValue: number | undefined,
  direction: 'higher_is_better' | 'lower_is_better' | undefined
): { attainmentPct: number; status: 'Đạt' | 'Theo dõi' | 'Đang cải tiến' | 'Không đạt' } {
  const tVal = typeof targetValue === 'number' && !Number.isNaN(targetValue) ? targetValue : 95;
  const dir = direction || 'higher_is_better';

  if (dir === 'lower_is_better') {
    if (numericVal <= tVal) {
      return { attainmentPct: 100, status: 'Đạt' };
    }
    if (tVal === 0) {
      return { attainmentPct: numericVal === 0 ? 100 : 40, status: numericVal === 0 ? 'Đạt' : 'Không đạt' };
    }
    const ratio = tVal / Math.max(numericVal, 0.0001);
    const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    if (pct >= 80) return { attainmentPct: pct, status: 'Theo dõi' };
    if (pct >= 60) return { attainmentPct: pct, status: 'Đang cải tiến' };
    return { attainmentPct: pct, status: 'Không đạt' };
  }

  if (numericVal >= tVal) {
    return { attainmentPct: 100, status: 'Đạt' };
  }
  const pct = tVal > 0 ? Math.max(0, Math.min(100, Math.round((numericVal / tVal) * 100))) : 100;
  if (pct >= 85) return { attainmentPct: pct, status: 'Theo dõi' };
  if (pct >= 65) return { attainmentPct: pct, status: 'Đang cải tiến' };
  return { attainmentPct: pct, status: 'Không đạt' };
}

function parseNumericFromActualString(str: string): number | null {
  if (!str) return null;
  const raw = String(str).trim();
  // Take first numeric token (supports 20.000.000, 98.5, 98,5, 1.0)
  const tokenMatch = raw.match(/-?\d[\d.,]*/);
  if (!tokenMatch) return null;
  let token = tokenMatch[0];
  // Vietnamese thousand-grouped integers like 20.000.000 or 2.825.000
  if (/^-?\d{1,3}(\.\d{3})+$/.test(token)) {
    token = token.replace(/\./g, '');
  } else if (/^-?\d{1,3}(,\d{3})+$/.test(token)) {
    token = token.replace(/,/g, '');
  } else {
    // Decimal number like 98.5 or 98,5 or 1.0
    token = token.replace(/,/g, '.');
  }
  const num = Number(token);
  return Number.isNaN(num) ? null : num;
}

function parseTargetConstraint(
  targetText: string | undefined,
  fallbackValue: number | undefined,
  fallbackDirection: 'higher_is_better' | 'lower_is_better' | undefined
): { targetValue: number | undefined; direction: 'higher_is_better' | 'lower_is_better' | undefined } {
  if (!targetText) {
    return { targetValue: fallbackValue, direction: fallbackDirection };
  }
  const txt = String(targetText).trim();
  let direction = fallbackDirection;
  if (txt.includes('<=') || txt.startsWith('<')) {
    direction = 'lower_is_better';
  } else if (txt.includes('>=') || txt.startsWith('>')) {
    direction = 'higher_is_better';
  }
  const parsedVal = parseNumericFromActualString(txt);
  return {
    targetValue: parsedVal !== null ? parsedVal : fallbackValue,
    direction
  };
}

export default function KPIDashboard({
  onUpdateOverallKPI,
  onViewDetail,
  onNavigateToTab,
  iqcRecords = [],
  pqcRecords = [],
  oqcRecords = [],
  oqcHandoverList: propsHandoverList,
  suppliers = [],
  supplierProductionAudits = [],
  capas = [],
  defects = [],
  copqs = [],
  partEvaluations = [],
  ptspModels = [],
  equipments = [],
  maintenanceLogs = [],
  equipmentIncidents = [],
  fabricationJobs = [],
  qmsBmRecords = [],
  dailyLogs = [],
  weeklyPlans = [],
  monthlyPlans = [],
  planningTasks = [],
  staffList = [],
  kpis: propsKpis,
  setKpis: propsSetKpis,
  staffKpiEvaluations: propsStaffEvals,
  setStaffKpiEvaluations: propsSetStaffEvals,
  onSyncKpis,
  onSyncStaffEvaluations
}: KPIDashboardProps) {
  const now = new Date();
  const todayStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();

  const [activeSubTab, setActiveSubTab] = useState<'dept_kpi' | 'staff_kpi'>('dept_kpi');

  // Dynamic Period Selection (Month / Quarter / Year)
  const [periodMode, setPeriodMode] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.floor(now.getMonth() / 3) + 1);

  // Filters for Tab 1 (KPI Phòng QLCL)
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Mục tiêu hoạt động chung' | 'Mục tiêu hoạt động chuyên môn'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'auto' | 'manual'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Drill-down modal state for inspecting source records transferred from other modules
  const [drilldownModal, setDrilldownModal] = useState<{
    title: string;
    subtitle: string;
    targetTab: string;
    targetTabLabel: string;
    summaryBadge: string;
    rows: DrilldownRecordRow[];
  } | null>(null);

  // Load handover list from props or safeStorage
  const oqcHandoverList = useMemo(() => {
    if (Array.isArray(propsHandoverList) && propsHandoverList.length > 0) return propsHandoverList;
    try {
      const saved = safeStorage.getItem('dk_oqc_handover_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }, [propsHandoverList]);

  // Local fallbacks if parent doesn't pass state
  const [localKpis, setLocalKpis] = useState<DetailedKPI[]>(() => {
    try {
      const saved = safeStorage.getItem('dk_kpis');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((x: any) => x.id === 'KPI-COM-01')) {
          return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_DETAILED_KPIS;
  });

  const [localStaffEvals, setLocalStaffEvals] = useState<Record<string, StaffKpiPeriodEvaluation>>(() => {
    try {
      const saved = safeStorage.getItem('dk_staff_kpi_evaluations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {}
    return {};
  });

  const kpis = useMemo(() => {
    const raw = propsKpis && propsKpis.length > 0 ? propsKpis : localKpis;
    if (!raw.some((x: any) => x.id === 'KPI-COM-01')) {
      return DEFAULT_DETAILED_KPIS;
    }
    return raw;
  }, [propsKpis, localKpis]);

  const staffEvals = propsStaffEvals || localStaffEvals;

  useEffect(() => {
    if (propsKpis && propsKpis.length > 0 && !propsKpis.some((x: any) => x.id === 'KPI-COM-01')) {
      persistKpis(DEFAULT_DETAILED_KPIS);
    }
  }, []);

  const persistKpis = (nextKpis: DetailedKPI[]) => {
    setLocalKpis(nextKpis);
    if (propsSetKpis) propsSetKpis(nextKpis);
    const serialized = JSON.stringify(nextKpis);
    safeStorage.setItem('dk_kpis', serialized);
    safeStorage.setItem('dk_kpis_is_dirty', 'true');
    try {
      window.localStorage.setItem('dk_kpis', serialized);
      window.localStorage.setItem('dk_kpis_is_dirty', 'true');
    } catch (e) {}
    if (onSyncKpis) onSyncKpis(nextKpis);
  };

  const persistStaffEvaluations = (nextEvals: Record<string, StaffKpiPeriodEvaluation>) => {
    setLocalStaffEvals(nextEvals);
    if (propsSetStaffEvals) propsSetStaffEvals(nextEvals);
    const serialized = JSON.stringify(nextEvals);
    safeStorage.setItem('dk_staff_kpi_evaluations', serialized);
    safeStorage.setItem('dk_staff_kpi_evaluations_is_dirty', 'true');
    try {
      window.localStorage.setItem('dk_staff_kpi_evaluations', serialized);
      window.localStorage.setItem('dk_staff_kpi_evaluations_is_dirty', 'true');
    } catch (e) {}
    if (onSyncStaffEvaluations) onSyncStaffEvaluations(nextEvals);
  };

  // Period Range & Key Computation
  const periodInfo = useMemo(() => {
    if (periodMode === 'month') {
      const start = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0);
      const end = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
      const mm = String(selectedMonth).padStart(2, '0');
      return {
        key: `${selectedYear}-${mm}`,
        label: `Tháng ${mm}/${selectedYear}`,
        start,
        end,
        months: [selectedMonth],
        year: selectedYear,
        rangeText: `01/${mm}/${selectedYear} – ${String(end.getDate()).padStart(2, '0')}/${mm}/${selectedYear}`
      };
    }
    if (periodMode === 'quarter') {
      const startMonth = (selectedQuarter - 1) * 3;
      const endMonth = startMonth + 3;
      const start = new Date(selectedYear, startMonth, 1, 0, 0, 0, 0);
      const end = new Date(selectedYear, endMonth, 0, 23, 59, 59, 999);
      const sm = String(startMonth + 1).padStart(2, '0');
      const em = String(endMonth).padStart(2, '0');
      return {
        key: `${selectedYear}-Q${selectedQuarter}`,
        label: `Quý ${selectedQuarter}/${selectedYear}`,
        start,
        end,
        months: [startMonth + 1, startMonth + 2, startMonth + 3],
        year: selectedYear,
        rangeText: `01/${sm}/${selectedYear} – ${String(end.getDate()).padStart(2, '0')}/${em}/${selectedYear}`
      };
    }
    const start = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
    const end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
    return {
      key: `${selectedYear}`,
      label: `Năm ${selectedYear}`,
      start,
      end,
      months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      year: selectedYear,
      rangeText: `01/01/${selectedYear} – 31/12/${selectedYear}`
    };
  }, [periodMode, selectedYear, selectedMonth, selectedQuarter]);

  // ============================================================================
  // AUTOMATIC METRIC ENGINE FROM LIVE APP DATA FOR THE SELECTED PERIOD
  // ============================================================================
  const periodDataset = useMemo(() => {
    const { start, end, months, year } = periodInfo;

    // 1. IQC Records in period
    const curIqc = (iqcRecords || []).filter(r =>
      isRecordInDateRange(r?.date || r?.checkDate || r?.createdAt, start, end)
    );

    // 2. PQC Records in period
    const curPqc = (pqcRecords || []).filter(r =>
      isRecordInDateRange(r?.date || r?.checkDate || r?.createdAt, start, end)
    );

    // 3. OQC Records & OQC Handover List in period
    const curOqc = (oqcRecords || []).filter(r => {
      if (r?.date || r?.checkDate || r?.createdAt) {
        return isRecordInDateRange(r.date || r.checkDate || r.createdAt, start, end);
      }
      if (r?.month && r?.year) {
        return Number(r.year) === year && months.includes(Number(r.month));
      }
      return false;
    });

    const curHandover = (oqcHandoverList || []).filter(h =>
      isRecordInDateRange(h?.handoverDate || h?.scannedAt || h?.date || h?.createdAt, start, end)
    );

    // 4. SQC Audits in period
    const curSqc = (supplierProductionAudits || []).filter(a =>
      isRecordInDateRange(a?.requestDate || a?.date || a?.createdAt, start, end)
    );

    // 5. CAPAs in period (matching targetDate/dueDate/createdDate in period, or open CAPAs if none dated in period)
    const curCapas = (capas || []).filter(c => {
      const dStr = c?.createdDate || c?.date || c?.createdAt || c?.targetDate || c?.dueDate || c?.DueDate;
      return dStr ? isRecordInDateRange(dStr, start, end) : false;
    });

    // 6. Market Defects in period (chỉ tính Lỗi xe từ khách hàng, không gộp Đề xuất cải tiến)
    const curDefects = (defects || []).filter(d => {
      if (d?.feedbackType && d.feedbackType !== 'Lỗi xe từ khách hàng') return false;
      return isRecordInDateRange(d?.defectDate || d?.sourceDate || d?.saleDate || d?.date || d?.createdAt, start, end);
    });

    // 7. COPQ in period (matches c.month & c.year OR c.date)
    const curCopqs = (copqs || []).filter(c => {
      if (c?.month && c?.year) {
        return Number(c.year) === year && months.includes(Number(c.month));
      }
      return isRecordInDateRange(c?.date || c?.createdAt || c?.incidentDate, start, end);
    });

    // 8. Part Evaluations (BM-KTTD-01) in period
    const curPartEvals = (partEvaluations || []).filter(p =>
      isRecordInDateRange(p?.receivedDate || p?.testDate || p?.date || p?.createdAt, start, end)
    );

    // 9. PTSP Models & Issues / SampleChecks / RoadTests
    const curPtspIssues: any[] = [];
    const curPtspChecks: any[] = [];
    (ptspModels || []).forEach(m => {
      (m?.issues || []).forEach((iss: any) => {
        if (
          !iss?.createdAt ||
          isRecordInDateRange(iss.createdAt || iss.dueDate, start, end)
        ) {
          curPtspIssues.push({ ...iss, modelCode: m.code, modelName: m.modelName });
        }
      });
      (m?.sampleChecks || []).forEach((chk: any) => {
        if (chk?.status && chk.status !== 'Chưa KT') {
          const chkDate = chk?.updatedAt || chk?.checkedDate || m?.updatedAt;
          if (!chkDate || isRecordInDateRange(chkDate, start, end)) {
            curPtspChecks.push({ ...chk, modelCode: m.code, modelName: m.modelName, kind: 'Đánh giá mẫu' });
          }
        }
      });
      (m?.roadTests || []).forEach((rt: any) => {
        if (rt?.result && rt.result !== 'Chưa đo') {
          const rtDate = rt?.updatedAt || rt?.testDate || m?.updatedAt;
          if (!rtDate || isRecordInDateRange(rtDate, start, end)) {
            curPtspChecks.push({
              id: rt.id,
              item: rt.item,
              standard: rt.standard,
              status: rt.result,
              modelCode: m.code,
              modelName: m.modelName,
              kind: 'Chạy thử đường trường'
            });
          }
        }
      });
    });

    // 10. Daily Logs in period
    const curLogs = (dailyLogs || []).filter(l => {
      if (l?.date || l?.createdAt) {
        const matched = isRecordInDateRange(l.date || l.createdAt, start, end);
        if (matched) return true;
      }
      return false;
    });

    // 11. Quality Planning Tasks in period (from dk_weekly_timelines_all, dk_monthly_timelines_all, weeklyPlans, monthlyPlans)
    const curPlanTasks: any[] = [];
    const seenPlanIds = new Set<string>();
    const addPlanTask = (item: any, sourceLabel: string) => {
      if (!item) return;
      const title = String(item.title || item.content || item.task || item.partName || item.modelName || '').trim();
      if (!title) return;
      const uid = `${sourceLabel}|${item.id || ''}|${title}|${item.assignee || item.pic || ''}|${item.deadline || ''}`;
      if (seenPlanIds.has(uid)) return;
      seenPlanIds.add(uid);
      curPlanTasks.push({ ...item, _title: title, _source: sourceLabel });
    };

    try {
      const monthKeys = months.map(m => `${year}-${String(m).padStart(2, '0')}`);
      ['dk_monthly_timelines_all', 'dk_weekly_timelines_all'].forEach(storageKey => {
        const raw = safeStorage.getItem(storageKey);
        if (!raw) return;
        const dict = JSON.parse(raw);
        if (!dict || typeof dict !== 'object') return;
        Object.entries(dict).forEach(([k, arr]) => {
          if (!Array.isArray(arr)) return;
          const keyMatchesMonth = monthKeys.some(mk => k.startsWith(mk));
          arr.forEach((it: any) => {
            const inRangeByDeadline = it?.deadline && isRecordInDateRange(it.deadline, start, end);
            const inRangeByMeta =
              it?.year && it?.month && Number(it.year) === year && months.includes(Number(it.month));
            if (keyMatchesMonth || inRangeByDeadline || inRangeByMeta) {
              addPlanTask(it, storageKey.includes('monthly') ? 'KH Tháng' : 'KH Tuần');
            }
          });
        });
      });
    } catch (e) {}

    (weeklyPlans || []).forEach(wp => {
      if (Number(wp?.year) === year && months.includes(Number(wp?.month))) {
        (wp?.targets || []).forEach((t: any) => addPlanTask(t, `KH Tuần ${wp.week}/${wp.month}`));
      }
    });
    (monthlyPlans || []).forEach(mp => {
      if (Number(mp?.year) === year && months.includes(Number(mp?.month))) {
        (mp?.targets || []).forEach((t: any) => addPlanTask(t, `KH Tháng ${mp.month}/${mp.year}`));
      }
    });
    // Đồng bộ thêm nguồn tác vụ từ QualityPlanning (dk_qms_quality_planning_tasks) giống ReportsHub
    (planningTasks || []).forEach((pt: any) => {
      const inRangeByMeta = pt?.year && pt?.month && Number(pt.year) === year && months.includes(Number(pt.month));
      const inRangeByDate = pt?.deadline && isRecordInDateRange(pt.deadline, start, end);
      if (inRangeByMeta || inRangeByDate) {
        addPlanTask(pt, 'Lập kế hoạch CL');
      }
    });

    // 12. Fabrication & Specialized Repair Jobs (NV-KTTĐ-05) in period
    const curFabJobs = (fabricationJobs || []).filter((j: any) => {
      const refDate = j?.completedDate || j?.dueDate || j?.requestDate;
      if (!refDate) return true;
      return isRecordInDateRange(refDate, start, end);
    });

    return {
      curIqc,
      curPqc,
      curOqc,
      curHandover,
      curSqc,
      curCapas,
      curDefects,
      curCopqs,
      curPartEvals,
      curPtspIssues,
      curPtspChecks,
      curLogs,
      curPlanTasks,
      curFabJobs
    };
  }, [
    periodInfo,
    iqcRecords,
    pqcRecords,
    oqcRecords,
    oqcHandoverList,
    supplierProductionAudits,
    capas,
    defects,
    copqs,
    partEvaluations,
    ptspModels,
    dailyLogs,
    weeklyPlans,
    monthlyPlans,
    fabricationJobs
  ]);

  const autoMetricsMap = useMemo<Record<string, ComputedAutoMetric>>(() => {
    const { label, start, end } = periodInfo;
    const {
      curIqc,
      curPqc,
      curOqc,
      curHandover,
      curSqc,
      curCapas,
      curDefects,
      curCopqs,
      curPartEvals,
      curPtspIssues,
      curPtspChecks,
      curLogs,
      curPlanTasks
    } = periodDataset;

    // 1. IQC
    const iqcTotalLots = curIqc.length;
    const iqcPassedLots = curIqc.filter(isIqcLotPassed).length;
    const iqcTotalSampleQty = curIqc.reduce((s, r) => s + Number(r?.checkedQty || 0), 0);
    const iqcTotalFailQty = curIqc.reduce((s, r) => s + Number(r?.failedQty || 0), 0);
    const iqcRate = iqcTotalLots > 0 ? Number(((iqcPassedLots / iqcTotalLots) * 100).toFixed(1)) : 0;
    const iqcRows: DrilldownRecordRow[] = curIqc.slice(0, 60).map(r => ({
      id: r.id || r.ecountVoucherNo || '--',
      date: formatDateStrVi(r.date),
      title: `${r.supplierName || 'NCC'} • ${r.itemSummary || r.content || '--'} (Mẫu: ${r.checkedQty || 0}, Lỗi: ${r.failedQty || 0})`,
      actor: r.checkedBy || 'Tổ IQC',
      resultText: r.result || r.status || 'Đạt',
      isPass: isIqcLotPassed(r)
    }));

    // 2. PQC
    const pqcTotal = curPqc.length;
    const pqcPassed = curPqc.filter(isPqcRecordPassed).length;
    const pqcRate = pqcTotal > 0 ? Number(((pqcPassed / pqcTotal) * 100).toFixed(1)) : 0;
    const pqcRows: DrilldownRecordRow[] = curPqc.slice(0, 60).map(r => ({
      id: r.id || r.lsx || '--',
      date: formatDateStrVi(r.date),
      title: `Model ${r.model || '--'} (LSX: ${r.lsx || '--'}) • ${r.findings || 'Kiểm tra công đoạn'}`,
      actor: r.checkedBy || 'Tổ PQC',
      resultText: r.status || '--',
      isPass: isPqcRecordPassed(r)
    }));

    // 3. OQC
    const oqcTotal = curOqc.length;
    const oqcPassed = curOqc.filter(isOqcRecordPassed).length;
    const oqcFailed = curOqc.filter(r => !isOqcRecordPassed(r)).length;
    const oqcFpyRate = oqcTotal > 0 ? Number(((oqcPassed / oqcTotal) * 100).toFixed(2)) : 0;
    const oqcRows: DrilldownRecordRow[] = curOqc.slice(0, 60).map(r => ({
      id: r.serialNo || r.chassisNo || r.id || '--',
      date: formatDateStrVi(r.date),
      title: `${r.model || '--'} (${r.color || '--'}) • ${r.defectDetail || 'Kiểm tra xuất xưởng KCS'}`,
      actor: r.checkedBy || 'Tổ OQC',
      resultText: r.status || '--',
      isPass: isOqcRecordPassed(r)
    }));

    // 4. Suppliers & SQC
    const sqcTotal = curSqc.length;
    const sqcResolved = curSqc.filter(isSqcAuditResolved).length;
    const totalSuppliers = (suppliers || []).length;
    const ratedSuppliers = (suppliers || []).filter(s => {
      const rating = String(s?.qualityRating || s?.QualityRating || '').toUpperCase();
      const st = String(s?.status || s?.Status || '').toLowerCase();
      return ['A', 'B', 'C', 'D'].includes(rating) || st === 'active' || st === 'đạt';
    }).length;
    const sqcHasData = sqcTotal > 0 || totalSuppliers > 0;
    const sqcRate =
      sqcTotal > 0
        ? Number(((sqcResolved / sqcTotal) * 100).toFixed(1))
        : totalSuppliers > 0
        ? Number(((ratedSuppliers / totalSuppliers) * 100).toFixed(1))
        : 0;
    const sqcRows: DrilldownRecordRow[] =
      sqcTotal > 0
        ? curSqc.map(a => ({
            id: a.id || '--',
            date: formatDateStrVi(a.requestDate),
            title: `${a.supplierName || '--'} • ${a.componentName || '--'}: ${a.targetSpecification || ''}`,
            actor: a.checkedBy || 'QA/SQC',
            resultText:
              a.status === 'approved'
                ? 'Đạt yêu cầu'
                : a.status === 'updated'
                ? 'NCC đã phản hồi'
                : a.status === 'rejected'
                ? 'Sai lệch KT'
                : String(a.status || 'Chờ phản hồi'),
            isPass: isSqcAuditResolved(a)
          }))
        : (suppliers || []).slice(0, 50).map(s => ({
            id: s.id || s.SupplierID || '--',
            date: formatDateStrVi(s.lastAuditDate || s.LastAuditDate) || label,
            title: `${s.name || s.SupplierName || '--'} • Linh kiện: ${s.componentType || s.ComponentType || '--'} (PPM: ${s.ppm ?? s.PPM ?? 0})`,
            actor: 'Phòng QLCL',
            resultText: `Hạng ${s.qualityRating || s.QualityRating || 'A'} (${s.status || s.Status || 'Active'})`,
            isPass: true
          }));

    // 5. CAPA
    const activeCapaPool = curCapas.length > 0 ? curCapas : (capas || []);
    const capaTotal = activeCapaPool.length;
    const capaClosed = activeCapaPool.filter(isCapaClosedStatus).length;
    const capaOverdue = activeCapaPool.filter(c => {
      if (isCapaClosedStatus(c)) return false;
      const due = parseFlexibleDate(c?.targetDate || c?.dueDate || c?.DueDate);
      return due ? due.getTime() < todayStartMs : false;
    }).length;
    const capaRate =
      capaTotal > 0
        ? Number((((capaClosed + Math.max(0, capaTotal - capaClosed - capaOverdue) * 0.8) / capaTotal) * 100).toFixed(1))
        : 0;
    const capaRows: DrilldownRecordRow[] = activeCapaPool.slice(0, 60).map(c => ({
      id: c.id || c.CAPAID || '--',
      date: formatDateStrVi(c.targetDate || c.dueDate || c.DueDate),
      title: `${c.title || c.issue || c.Issue || '--'} (${c.modelName || c.supplierName || c.source || 'Nội bộ'})`,
      actor: c.assignee || c.owner || c.Owner || 'QLCL',
      resultText: c.status || c.Status || 'Mở',
      isPass: isCapaClosedStatus(c)
    }));

    // 6. Market Defects
    const mktTotal = curDefects.length;
    const mktResolved = curDefects.filter(isMarketDefectResolved).length;
    const mktResolvedRate = mktTotal > 0 ? Number(((mktResolved / mktTotal) * 100).toFixed(1)) : 0;
    const mktDefectRateOnOqc =
      oqcTotal > 0
        ? Number(((mktTotal / oqcTotal) * 100).toFixed(2))
        : mktTotal > 0
        ? Number((mktTotal * 0.1).toFixed(2))
        : 0;
    const mktRows: DrilldownRecordRow[] = curDefects.slice(0, 60).map(d => ({
      id: d.id || '--',
      date: formatDateStrVi(d.defectDate || d.sourceDate || d.saleDate),
      title: `${d.model || 'Xe'} • ${d.dealer || d.customerName || 'Đại lý'}: ${d.description || d.type || '--'}`,
      actor: d.assignee || 'BP KTTĐ / Bảo hành',
      resultText: d.status || 'Chưa xử lý',
      isPass: isMarketDefectResolved(d)
    }));

    // 7. COPQ (chuẩn hóa đơn vị VNĐ thống nhất qua resolveCopqVnd)
    const copqTotalCount = curCopqs.length;
    const copqTotalCost = curCopqs.reduce(
      (sum, c) => sum + resolveCopqVnd(c),
      0
    );
    const copqClosedCount = curCopqs.filter(c => {
      const st = String(c?.status || '').toLowerCase();
      if (st) {
        return st === 'đã xử lý' || st === 'đóng' || st === 'đã đóng' || st === 'hoàn thành' || st === 'đã bồi hoàn';
      }
      return Boolean(c?.accountingCode || c?.notes || c?.costOrigin || c?.amount !== undefined);
    }).length;
    const copqClosedRate = copqTotalCount > 0 ? Number(((copqClosedCount / copqTotalCount) * 100).toFixed(1)) : 0;
    const copqRows: DrilldownRecordRow[] = curCopqs.map(c => ({
      id: c.id || c.accountingCode || '--',
      date: c.month && c.year ? `T${String(c.month).padStart(2, '0')}/${c.year}` : label,
      title: `${c.category || 'COPQ'} • ${c.title || c.description || c.details || '--'} (${c.model || 'Chung'})`,
      actor: c.costOrigin || 'Phòng QLCL',
      resultText: `${resolveCopqVnd(c).toLocaleString('vi-VN')} VNĐ`,
      isPass: true
    }));

    // 8. Part Evaluations (BM-KTTD-01) & PTSP
    const partEvalTotal = curPartEvals.length;
    const partEvalQty = curPartEvals.reduce((s, p) => s + Math.max(1, Number(p?.quantity) || 1), 0);
    const partEvalDone = curPartEvals.filter(p =>
      Boolean(p?.resolution || p?.rootCauseCategory || p?.findingNote)
    ).length;

    const ptspIssueTotal = curPtspIssues.length;
    const ptspIssueDone = curPtspIssues.filter(i => i?.status === 'Đã chốt' || i?.status === 'Đang xử lý').length;
    const combinedEvalTotal = partEvalTotal + ptspIssueTotal;
    const combinedEvalDone = partEvalDone + ptspIssueDone;
    const partEvalPtspRate =
      combinedEvalTotal > 0 ? Number(((combinedEvalDone / combinedEvalTotal) * 100).toFixed(1)) : 0;

    const partEvalRows: DrilldownRecordRow[] = [
      ...curPartEvals.map(p => ({
        id: p.id || '--',
        date: formatDateStrVi(p.receivedDate),
        title: `[BM-KTTD-01] ${p.partName || '--'} (SL: ${p.quantity || 1}) • Nguyên nhân: ${p.rootCauseCategory || '--'}`,
        actor: p.inspector || 'BP KTTĐ',
        resultText: p.resolution || 'Đã giám định',
        isPass: true
      })),
      ...curPtspIssues.map(iss => ({
        id: iss.id || '--',
        date: formatDateStrVi(iss.createdAt || iss.dueDate),
        title: `[PTSP ${iss.modelName || iss.modelCode}] ${iss.partOrArea}: ${iss.description}`,
        actor: iss.ownerDept || 'PTSP',
        resultText: iss.status || 'Mở',
        isPass: iss.status === 'Đã chốt'
      }))
    ];

    // 9. Equipments & Calibration (BM-KTTD-02)
    const totalEquip = (equipments || []).length;
    const validEquip = (equipments || []).filter(eq => {
      const st = String(eq?.status || '').toLowerCase();
      const calSt = String(eq?.calibrationStatus || '').toLowerCase();
      const isSuspended = calSt.includes('đình chỉ') || calSt.includes('quá hạn');
      const isOperational = st === 'running' || st === 'hoạt động tốt' || st === 'đạt' || st === 'active';
      const nextDate = parseFlexibleDate(eq?.nextCalibrationDate || eq?.nextMaintenanceDate);
      const isOverdue = nextDate ? nextDate.getTime() < todayStartMs : false;
      return isOperational && !isSuspended && !isOverdue;
    }).length;
    const equipCalRate = totalEquip > 0 ? Number(((validEquip / totalEquip) * 100).toFixed(1)) : 0;
    const equipRows: DrilldownRecordRow[] = (equipments || []).map(eq => {
      const calSt = eq?.calibrationStatus ? ` • ${eq.calibrationStatus}` : '';
      const isSuspendedOrBad = String(eq?.calibrationStatus || '').toLowerCase().includes('đình chỉ') || eq.status !== 'Running';
      return {
        id: eq.id || '--',
        date: formatDateStrVi(eq.nextCalibrationDate || eq.nextMaintenanceDate || eq.lastMaintenanceDate),
        title: `${eq.name || '--'} (${eq.category || '--'})${eq.measureRange ? ` • Dải đo: ${eq.measureRange}` : ''} • Vị trí: ${eq.location || '--'}`,
        actor: eq.responsiblePerson || 'Đoàn Anh Hùng',
        resultText: `${eq.status === 'Running' ? 'Hoạt động tốt' : eq.status}${calSt} (${eq.healthRate ?? 100}%)`,
        isPass: !isSuspendedOrBad
      };
    });

    // 10. Daily Logs
    const logsTotal = curLogs.length;
    const logsCompleted = curLogs.filter(isDailyLogCompleted).length;
    const logsOverdue = curLogs.filter(l => isDailyLogOverdue(l, todayStartMs)).length;
    const dailyTaskCompletionRate = logsTotal > 0 ? Number(((logsCompleted / logsTotal) * 100).toFixed(1)) : 0;
    const distinctReportDays = new Set(
      curLogs
        .map(l => {
          const d = parseFlexibleDate(l?.date || l?.createdAt);
          return d ? getLocalYmd(d) : '';
        })
        .filter(Boolean)
    ).size;

    const effectiveEnd = end.getTime() > Date.now() ? new Date() : end;
    let workingDaysElapsed = 0;
    if (effectiveEnd.getTime() >= start.getTime()) {
      const cursor = new Date(start);
      while (cursor.getTime() <= effectiveEnd.getTime()) {
        if (cursor.getDay() !== 0) workingDaysElapsed++;
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    const dailyReportDaysRate =
      logsTotal > 0
        ? Math.min(
            100,
            Number(
              ((distinctReportDays / Math.max(1, workingDaysElapsed)) * 100).toFixed(1)
            )
          )
        : 0;

    const dailyLogRows: DrilldownRecordRow[] = curLogs.slice(0, 60).map(l => ({
      id: l.id || `STT-${l.stt}`,
      date: formatDateStrVi(l.date),
      title: `[${l.category || 'QLCL'}] ${l.content || '--'} (Mục tiêu: ${l.target || '--'} ${l.unit || ''})`,
      actor: l.assignee || '--',
      resultText: `${l.statusPercent || '0%'} ${l.result ? `(${l.result})` : ''}`,
      isPass: isDailyLogCompleted(l)
    }));

    // 11. Quality Planning Completion
    const planTotal = curPlanTasks.length;
    const planDone = curPlanTasks.filter(item => {
      const st = String(item?.status || '').trim().toLowerCase();
      return (
        st === 'completed' ||
        st === 'hoàn thành' ||
        st === 'đạt' ||
        Number(item?.progress || 0) >= 100 ||
        item?.achieved === true
      );
    }).length;
    const planHasData = planTotal > 0 || logsTotal > 0;
    const planCompletionRate =
      planTotal > 0
        ? Number(((planDone / planTotal) * 100).toFixed(1))
        : logsTotal > 0
        ? dailyTaskCompletionRate
        : 0;
    const planRows: DrilldownRecordRow[] =
      planTotal > 0
        ? curPlanTasks.map((pt, idx) => {
            const st = String(pt?.status || '').trim().toLowerCase();
            const done =
              st === 'completed' ||
              st === 'hoàn thành' ||
              st === 'đạt' ||
              Number(pt?.progress || 0) >= 100 ||
              pt?.achieved === true;
            return {
              id: pt.id || `KH-${idx + 1}`,
              date: formatDateStrVi(pt.deadline) || label,
              title: `[${pt._source || pt.section || 'Kế hoạch'}] ${pt._title}`,
              actor: pt.assignee || pt.pic || 'Phòng QLCL',
              resultText: done ? 'Hoàn thành' : pt.status || 'Đang thực hiện',
              isPass: done
            };
          })
        : dailyLogRows;

    return {
      COPQ_TOTAL: {
        key: 'COPQ_TOTAL',
        actualText: copqTotalCount > 0 ? `${copqTotalCost.toLocaleString('vi-VN')} VNĐ` : 'Chưa có dữ liệu (0)',
        numericValue: copqTotalCost,
        evidenceText:
          copqTotalCount > 0
            ? `Dữ liệu ${label}: ${copqTotalCount} khoản COPQ • Tổng chi phí ${copqTotalCost.toLocaleString('vi-VN')} VNĐ`
            : `Chưa phát sinh bản ghi COPQ trong ${label}`,
        hasData: copqTotalCount > 0,
        targetTab: 'copq',
        targetTabLabel: 'Chi phí Chất lượng (COPQ)',
        sourceRecords: copqRows
      },
      COPQ_CLOSED_RATE: {
        key: 'COPQ_CLOSED_RATE',
        actualText: copqTotalCount > 0 ? `${copqClosedRate}%` : 'Chưa có dữ liệu (0)',
        numericValue: copqClosedRate,
        evidenceText:
          copqTotalCount > 0
            ? `Dữ liệu ${label}: Đã hạch toán & xử lý ${copqClosedCount}/${copqTotalCount} khoản COPQ (${copqClosedRate}%)`
            : `Chưa phát sinh hồ sơ COPQ trong ${label}`,
        hasData: copqTotalCount > 0,
        targetTab: 'copq',
        targetTabLabel: 'Chi phí Chất lượng (COPQ)',
        sourceRecords: copqRows
      },
      PLAN_COMPLETION_RATE: {
        key: 'PLAN_COMPLETION_RATE',
        actualText: planHasData ? `${planCompletionRate}%` : 'Chưa có dữ liệu (0)',
        numericValue: planCompletionRate,
        evidenceText:
          planTotal > 0
            ? `Dữ liệu ${label}: Hoàn thành ${planDone}/${planTotal} hạng mục Kế hoạch chất lượng (${planCompletionRate}%)`
            : logsTotal > 0
            ? `Dữ liệu ${label}: Tính theo tiến độ công việc Báo cáo ngày ${logsCompleted}/${logsTotal} việc (${planCompletionRate}%)`
            : `Chưa có hạng mục Kế hoạch chất lượng trong ${label}`,
        hasData: planHasData,
        targetTab: 'quality_planning',
        targetTabLabel: 'Lập kế hoạch Chất lượng Tổng thể',
        sourceRecords: planRows
      },
      DAILY_REPORT_DAYS_RATE: {
        key: 'DAILY_REPORT_DAYS_RATE',
        actualText: logsTotal > 0 ? `${dailyReportDaysRate}%` : 'Chưa có dữ liệu (0)',
        numericValue: dailyReportDaysRate,
        evidenceText:
          logsTotal > 0
            ? `Dữ liệu ${label}: Ghi nhận ${logsTotal} đầu việc trên ${distinctReportDays} ngày làm việc • Duy trì 11 BM & 20 Tài liệu trong /bm`
            : `Chưa có bản ghi Nhật trình báo cáo ngày trong ${label}`,
        hasData: logsTotal > 0,
        targetTab: 'daily_logs',
        targetTabLabel: 'Báo cáo ngày QLCL',
        sourceRecords: dailyLogRows
      },
      DAILY_TASK_COMPLETION_RATE: {
        key: 'DAILY_TASK_COMPLETION_RATE',
        actualText: logsTotal > 0 ? `${dailyTaskCompletionRate}%` : 'Chưa có dữ liệu (0)',
        numericValue: dailyTaskCompletionRate,
        evidenceText:
          logsTotal > 0
            ? `Dữ liệu ${label}: Hoàn thành (100%) ${logsCompleted}/${logsTotal} đầu việc Báo cáo ngày (${dailyTaskCompletionRate}%) • Quá hạn: ${logsOverdue}`
            : `Chưa có đầu việc Báo cáo ngày trong ${label}`,
        hasData: logsTotal > 0,
        targetTab: 'daily_logs',
        targetTabLabel: 'Báo cáo ngày QLCL',
        sourceRecords: dailyLogRows
      },
      SQC_SUPPLIER_EVAL_RATE: {
        key: 'SQC_SUPPLIER_EVAL_RATE',
        actualText: sqcHasData ? `${sqcRate}%` : 'Chưa có dữ liệu (0)',
        numericValue: sqcRate,
        evidenceText:
          sqcTotal > 0
            ? `Dữ liệu ${label}: Đã duyệt/xử lý ${sqcResolved}/${sqcTotal} hồ sơ giám sát SQC (${sqcRate}%) • Quản lý ${totalSuppliers} NCC`
            : totalSuppliers > 0
            ? `Dữ liệu ${label}: Đánh giá & phân hạng ${ratedSuppliers}/${totalSuppliers} Nhà cung cấp trong danh mục (${sqcRate}%)`
            : `Chưa có dữ liệu đánh giá NCC / SQC trong ${label}`,
        hasData: sqcHasData,
        targetTab: 'suppliers',
        targetTabLabel: 'Nhà cung cấp & SQC',
        sourceRecords: sqcRows
      },
      IQC_PASS_RATE: {
        key: 'IQC_PASS_RATE',
        actualText: iqcTotalLots > 0 ? `${iqcRate}%` : 'Chưa có dữ liệu (0)',
        numericValue: iqcRate,
        evidenceText:
          iqcTotalLots > 0
            ? `Dữ liệu ${label}: ${iqcPassedLots}/${iqcTotalLots} lô IQC đạt (${iqcRate}%) • Tổng mẫu kiểm: ${iqcTotalSampleQty.toLocaleString('vi-VN')} (Lỗi: ${iqcTotalFailQty.toLocaleString('vi-VN')})`
            : `Chưa phát sinh phiếu kiểm tra đầu vào IQC trong ${label}`,
        hasData: iqcTotalLots > 0,
        targetTab: 'quality_inspection_records',
        targetTabLabel: 'Nhập liệu IQC - PQC - OQC',
        sourceRecords: iqcRows
      },
      PART_EVAL_PTSP_RATE: {
        key: 'PART_EVAL_PTSP_RATE',
        actualText: combinedEvalTotal > 0 ? `${partEvalPtspRate}%` : 'Chưa có dữ liệu (0)',
        numericValue: partEvalPtspRate,
        evidenceText:
          combinedEvalTotal > 0
            ? `Dữ liệu ${label}: ${partEvalDone}/${partEvalTotal} phiếu giám định BM-KTTD-01 (${partEvalQty} LK) & ${ptspIssueDone}/${ptspIssueTotal} vấn đề PTSP đã xử lý (${partEvalPtspRate}%)`
            : `Chưa phát sinh phiếu thẩm định linh kiện BM-KTTD-01 hoặc vấn đề PTSP trong ${label}`,
        hasData: combinedEvalTotal > 0,
        targetTab: 'ptsp',
        targetTabLabel: 'Phát triển SP (PTSP) & Thẩm định',
        sourceRecords: partEvalRows
      },
      PQC_PASS_RATE: {
        key: 'PQC_PASS_RATE',
        actualText: pqcTotal > 0 ? `${pqcRate}%` : 'Chưa có dữ liệu (0)',
        numericValue: pqcRate,
        evidenceText:
          pqcTotal > 0
            ? `Dữ liệu ${label}: ${pqcPassed}/${pqcTotal} lượt kiểm tra công đoạn PQC đạt / đã cải tiến (${pqcRate}%)`
            : `Chưa phát sinh bản ghi kiểm tra công đoạn PQC trong ${label}`,
        hasData: pqcTotal > 0,
        targetTab: 'quality_inspection_records',
        targetTabLabel: 'Nhập liệu IQC - PQC - OQC',
        sourceRecords: pqcRows
      },
      OQC_FPY_RATE: {
        key: 'OQC_FPY_RATE',
        actualText: oqcTotal > 0 ? `${oqcFpyRate}%` : 'Chưa có dữ liệu (0)',
        numericValue: oqcFpyRate,
        evidenceText:
          oqcTotal > 0
            ? `Dữ liệu ${label}: ${oqcPassed.toLocaleString('vi-VN')}/${oqcTotal.toLocaleString('vi-VN')} xe OQC đạt chuẩn FPY (${oqcFailed} xe lỗi) • Đã quét mã bàn giao Kho: ${curHandover.length} xe`
            : `Chưa phát sinh bản ghi nghiệm thu OQC trong ${label}`,
        hasData: oqcTotal > 0,
        targetTab: 'quality_inspection_records',
        targetTabLabel: 'Nhập liệu IQC - PQC - OQC',
        sourceRecords: oqcRows
      },
      CAPA_CLOSURE_RATE: {
        key: 'CAPA_CLOSURE_RATE',
        actualText: capaTotal > 0 ? `${capaRate}%` : 'Chưa có dữ liệu (0)',
        numericValue: capaRate,
        evidenceText:
          capaTotal > 0
            ? `Dữ liệu ${label}: Đã đóng ${capaClosed}/${capaTotal} hồ sơ CAPA • Quá hạn: ${capaOverdue} hồ sơ (Tỷ lệ kiểm soát: ${capaRate}%)`
            : `Chưa có hồ sơ CAPA trong ${label}`,
        hasData: capaTotal > 0,
        targetTab: 'tasks',
        targetTabLabel: 'Hồ sơ khắc phục CAPA',
        sourceRecords: capaRows
      },
      MARKET_DEFECT_RATE: {
        key: 'MARKET_DEFECT_RATE',
        actualText: mktTotal > 0 || oqcTotal > 0 ? `${mktDefectRateOnOqc}%` : 'Chưa có dữ liệu (0)',
        numericValue: mktDefectRateOnOqc,
        evidenceText:
          mktTotal > 0 || oqcTotal > 0
            ? `Dữ liệu ${label}: ${mktTotal} vụ phản ánh thị trường / ${oqcTotal.toLocaleString('vi-VN')} xe xuất xưởng OQC (${mktDefectRateOnOqc}%)`
            : `Chưa có dữ liệu đối chiếu lỗi thị trường & sản lượng OQC trong ${label}`,
        hasData: mktTotal > 0 || oqcTotal > 0,
        targetTab: 'defects',
        targetTabLabel: 'Phản ánh Thị trường',
        sourceRecords: mktRows
      },
      MARKET_DEFECT_RESOLVED_RATE: {
        key: 'MARKET_DEFECT_RESOLVED_RATE',
        actualText: mktTotal > 0 ? `${mktResolvedRate}%` : 'Chưa có dữ liệu (0)',
        numericValue: mktResolvedRate,
        evidenceText:
          mktTotal > 0
            ? `Dữ liệu ${label}: Đã xử lý dứt điểm ${mktResolved}/${mktTotal} phản ánh chất lượng thị trường & bảo hành (${mktResolvedRate}%)`
            : `Chưa phát sinh phản ánh lỗi thị trường trong ${label}`,
        hasData: mktTotal > 0,
        targetTab: 'defects',
        targetTabLabel: 'Phản ánh Thị trường',
        sourceRecords: mktRows
      },
      EQUIPMENT_CALIBRATION_RATE: {
        key: 'EQUIPMENT_CALIBRATION_RATE',
        actualText: totalEquip > 0 ? `${equipCalRate}%` : 'Chưa có dữ liệu (0)',
        numericValue: equipCalRate,
        evidenceText:
          totalEquip > 0
            ? `Dữ liệu ${label}: ${validEquip}/${totalEquip} thiết bị đo lường & CCDC đạt chuẩn tem BM-KTTD-02, đúng hạn hiệu chuẩn/bảo dưỡng (${equipCalRate}%)`
            : `Chưa khai báo danh mục thiết bị đo kiểm (dk_equipments)`,
        hasData: totalEquip > 0,
        targetTab: 'machinery_maintenance',
        targetTabLabel: 'Thiết bị',
        sourceRecords: equipRows
      }
    };
  }, [periodInfo, periodDataset, suppliers, capas, equipments, todayStartMs]);

  // ============================================================================
  // 10-MODULE LIVE DATA TRANSFER STRIP SUMMARY
  // ============================================================================
  const moduleTransferCards = useMemo(() => {
    const {
      curIqc,
      curPqc,
      curOqc,
      curHandover,
      curSqc,
      curDefects,
      curCopqs,
      curPartEvals,
      curPtspIssues,
      curPtspChecks,
      curLogs,
      curPlanTasks
    } = periodDataset;

    return [
      {
        id: 'mod-iqc',
        name: '1. IQC Đầu vào',
        countText: `${curIqc.length} lô kiểm`,
        subText: autoMetricsMap.IQC_PASS_RATE.hasData
          ? `Đạt: ${autoMetricsMap.IQC_PASS_RATE.actualText}`
          : 'Chờ dữ liệu kỳ',
        hasData: curIqc.length > 0,
        metric: autoMetricsMap.IQC_PASS_RATE
      },
      {
        id: 'mod-pqc',
        name: '2. PQC Công đoạn',
        countText: `${curPqc.length} lượt tuần tra`,
        subText: autoMetricsMap.PQC_PASS_RATE.hasData
          ? `Đạt: ${autoMetricsMap.PQC_PASS_RATE.actualText}`
          : 'Chờ dữ liệu kỳ',
        hasData: curPqc.length > 0,
        metric: autoMetricsMap.PQC_PASS_RATE
      },
      {
        id: 'mod-oqc',
        name: '3. OQC & Bàn giao Kho',
        countText: `${curOqc.length.toLocaleString('vi-VN')} xe KCS`,
        subText: `FPY: ${autoMetricsMap.OQC_FPY_RATE.hasData ? autoMetricsMap.OQC_FPY_RATE.actualText : '--'} • Scan Kho: ${curHandover.length}`,
        hasData: curOqc.length > 0 || curHandover.length > 0,
        metric: autoMetricsMap.OQC_FPY_RATE
      },
      {
        id: 'mod-sqc',
        name: '4. SQC & Nhà cung cấp',
        countText: `${curSqc.length} hồ sơ SQC`,
        subText: `${(suppliers || []).length} NCC đang quản lý`,
        hasData: curSqc.length > 0 || (suppliers || []).length > 0,
        metric: autoMetricsMap.SQC_SUPPLIER_EVAL_RATE
      },
      {
        id: 'mod-capa',
        name: '5. Hồ sơ CAPA (8D)',
        countText: `${(capas || []).length} hồ sơ`,
        subText: `Kiểm soát: ${autoMetricsMap.CAPA_CLOSURE_RATE.actualText}`,
        hasData: (capas || []).length > 0,
        metric: autoMetricsMap.CAPA_CLOSURE_RATE
      },
      {
        id: 'mod-market',
        name: '6. Lỗi Thị trường / ĐL',
        countText: `${curDefects.length} phản ánh`,
        subText: curDefects.length > 0 ? `Xử lý: ${autoMetricsMap.MARKET_DEFECT_RESOLVED_RATE.actualText}` : '0 phản ánh kỳ này',
        hasData: curDefects.length > 0,
        metric: autoMetricsMap.MARKET_DEFECT_RESOLVED_RATE
      },
      {
        id: 'mod-kttd',
        name: '7. Giám định BM-KTTD-01',
        countText: `${curPartEvals.length} biên bản`,
        subText: `${curPartEvals.reduce((s, p) => s + Math.max(1, Number(p?.quantity) || 1), 0)} linh kiện bảo hành`,
        hasData: curPartEvals.length > 0,
        metric: autoMetricsMap.PART_EVAL_PTSP_RATE
      },
      {
        id: 'mod-ptsp',
        name: '8. PTSP & Thử nghiệm mẫu',
        countText: `${(ptspModels || []).length} model`,
        subText: `${curPtspIssues.length} vấn đề • ${curPtspChecks.length} hạng mục thử`,
        hasData: curPtspIssues.length > 0 || curPtspChecks.length > 0,
        metric: autoMetricsMap.PART_EVAL_PTSP_RATE
      },
      {
        id: 'mod-equip',
        name: '9. Thiết bị & CCDC',
        countText: `${(equipments || []).length} TB • ${(fabricationJobs || []).length} đồ gá`,
        subText: `Chuẩn HC: ${autoMetricsMap.EQUIPMENT_CALIBRATION_RATE.actualText}`,
        hasData: (equipments || []).length > 0 || (fabricationJobs || []).length > 0,
        metric: autoMetricsMap.EQUIPMENT_CALIBRATION_RATE
      },
      {
        id: 'mod-daily-copq',
        name: '10. Báo cáo ngày & COPQ',
        countText: `${curLogs.length} việc • ${curPlanTasks.length} KH`,
        subText: `Hoàn thành: ${curLogs.length > 0 ? autoMetricsMap.DAILY_TASK_COMPLETION_RATE.actualText : '--'} • ${curCopqs.length} COPQ`,
        hasData: curLogs.length > 0 || curPlanTasks.length > 0 || curCopqs.length > 0,
        metric: autoMetricsMap.DAILY_TASK_COMPLETION_RATE
      }
    ];
  }, [periodDataset, autoMetricsMap, suppliers, capas, ptspModels, equipments, fabricationJobs]);

  // ============================================================================
  // COMPUTE RESOLVED DEPARTMENT KPIS & SCORES FOR SELECTED PERIOD
  // ============================================================================
  const resolvedDeptKpis = useMemo(() => {
    const pKey = periodInfo.key;

    return kpis.map(k => {
      const weight = Number(k.weight ?? k.groupWeight ?? 5);
      const override = k.periodOverrides?.[pKey];
      const autoMetric = k.autoMetricKey ? autoMetricsMap[k.autoMetricKey] : undefined;
      const effectiveTarget = override?.target || k.target;
      const { targetValue: resolvedTargetVal, direction: resolvedDirection } = parseTargetConstraint(
        effectiveTarget,
        k.targetValue,
        k.direction
      );

      let effectiveActual = k.actual;
      let evidenceText = k.details || '';
      let isOverridden = false;
      let isWaitingData = false;

      if (override?.actual !== undefined && override.actual !== '') {
        effectiveActual = override.actual;
        isOverridden = true;
      } else if (k.sourceType !== 'manual' && autoMetric) {
        effectiveActual = autoMetric.actualText;
        if (!autoMetric.hasData) {
          isWaitingData = true;
        }
      }

      if (autoMetric) {
        evidenceText = autoMetric.evidenceText;
      }
      if (override?.note) {
        evidenceText = `${evidenceText ? evidenceText + ' • ' : ''}Ghi chú kỳ: ${override.note}`;
      }

      let attainmentPct = 100;
      let computedStatus: DetailedKPI['status'] = k.status || 'Đạt';

      if (isWaitingData && !isOverridden && override?.scorePercent === undefined) {
        attainmentPct = 0;
        computedStatus = 'Chờ dữ liệu';
      } else if (override?.scorePercent !== undefined) {
        attainmentPct = Math.max(0, Math.min(100, Number(override.scorePercent)));
        computedStatus =
          override.status ||
          (attainmentPct >= 95 ? 'Đạt' : attainmentPct >= 80 ? 'Theo dõi' : attainmentPct >= 60 ? 'Đang cải tiến' : 'Không đạt');
      } else if (!isOverridden && k.sourceType !== 'manual' && autoMetric) {
        const res = computeAttainmentAndStatus(autoMetric.numericValue, resolvedTargetVal, resolvedDirection);
        attainmentPct = res.attainmentPct;
        computedStatus = override?.status || res.status;
      } else {
        const parsedNum = parseNumericFromActualString(effectiveActual);
        if (parsedNum !== null && resolvedTargetVal !== undefined) {
          const res = computeAttainmentAndStatus(parsedNum, resolvedTargetVal, resolvedDirection);
          attainmentPct = res.attainmentPct;
          computedStatus = override?.status || res.status;
        } else {
          computedStatus = override?.status || k.status || 'Đạt';
          attainmentPct =
            computedStatus === 'Đạt'
              ? 100
              : computedStatus === 'Theo dõi'
              ? 80
              : computedStatus === 'Đang cải tiến'
              ? 60
              : computedStatus === 'Chờ dữ liệu'
              ? 0
              : 30;
        }
      }

      const achievedPoints =
        computedStatus === 'Chờ dữ liệu' ? 0 : Number(((weight * attainmentPct) / 100).toFixed(2));

      return {
        ...k,
        weight,
        effectiveTarget,
        effectiveActual,
        effectiveStatus: computedStatus,
        attainmentPct,
        achievedPoints,
        evidenceText,
        isOverridden,
        isWaitingData: computedStatus === 'Chờ dữ liệu',
        overrideNote: override?.note || '',
        autoMetric
      };
    });
  }, [kpis, periodInfo.key, autoMetricsMap]);

  // Summary Department Scores (Excludes 'Chờ dữ liệu' from active weight denominator so score is 100% real!)
  const deptSummary = useMemo(() => {
    const commonList = resolvedDeptKpis.filter(k => k.type === 'Mục tiêu hoạt động chung');
    const proList = resolvedDeptKpis.filter(k => k.type === 'Mục tiêu hoạt động chuyên môn');

    const commonNominalMax = commonList.reduce((s, k) => s + k.weight, 0) || 35;
    const commonActiveList = commonList.filter(k => !k.isWaitingData);
    const commonActiveMax = commonActiveList.reduce((s, k) => s + k.weight, 0);
    const commonRawAchieved = commonActiveList.reduce((s, k) => s + k.achievedPoints, 0);
    const commonAchieved =
      commonActiveMax > 0
        ? Number(((commonRawAchieved / commonActiveMax) * commonNominalMax).toFixed(1))
        : Number(commonRawAchieved.toFixed(1));
    const commonPassedCount = commonList.filter(k => k.effectiveStatus === 'Đạt').length;

    const proNominalMax = proList.reduce((s, k) => s + k.weight, 0) || 65;
    const proActiveList = proList.filter(k => !k.isWaitingData);
    const proActiveMax = proActiveList.reduce((s, k) => s + k.weight, 0);
    const proRawAchieved = proActiveList.reduce((s, k) => s + k.achievedPoints, 0);
    const proAchieved =
      proActiveMax > 0
        ? Number(((proRawAchieved / proActiveMax) * proNominalMax).toFixed(1))
        : Number(proRawAchieved.toFixed(1));
    const proPassedCount = proList.filter(k => k.effectiveStatus === 'Đạt').length;

    const activeIndicatorsCount = commonActiveList.length + proActiveList.length;
    const waitingIndicatorsCount = resolvedDeptKpis.length - activeIndicatorsCount;

    const totalActiveMax = commonActiveMax + proActiveMax;
    const totalRawAchieved = commonRawAchieved + proRawAchieved;
    const normalizedScore =
      totalActiveMax > 0 ? Number(((totalRawAchieved / totalActiveMax) * 100).toFixed(1)) : 0;

    const rating =
      activeIndicatorsCount === 0
        ? 'Chờ dữ liệu'
        : normalizedScore >= 90
        ? 'Xuất sắc'
        : normalizedScore >= 80
        ? 'Tốt'
        : normalizedScore >= 70
        ? 'Khá'
        : normalizedScore >= 60
        ? 'Trung bình'
        : 'Cần cải tiến';

    return {
      commonMax: commonNominalMax,
      commonAchieved,
      commonPassedCount,
      commonTotalCount: commonList.length,
      proMax: proNominalMax,
      proAchieved,
      proPassedCount,
      proTotalCount: proList.length,
      totalMax: commonNominalMax + proNominalMax,
      normalizedScore,
      rating,
      passedCount: commonPassedCount + proPassedCount,
      activeIndicatorsCount,
      waitingIndicatorsCount,
      totalCount: resolvedDeptKpis.length
    };
  }, [resolvedDeptKpis]);

  useEffect(() => {
    if (onUpdateOverallKPI) {
      onUpdateOverallKPI(Math.round(deptSummary.normalizedScore));
    }
  }, [deptSummary.normalizedScore]);

  // ============================================================================
  // TAB 2: INDIVIDUAL STAFF KPI ENGINE (PERSON-SPECIFIC + RACI ROLE-SPECIFIC)
  // ============================================================================
  const staffEvaluationsComputed = useMemo(() => {
    const { key: pKey, label } = periodInfo;
    const {
      curIqc,
      curPqc,
      curOqc,
      curHandover,
      curSqc,
      curCapas,
      curDefects,
      curPartEvals,
      curPtspIssues,
      curPtspChecks,
      curLogs,
      curPlanTasks
    } = periodDataset;

    // Helper: compute person-specific + role-specific metric for a staff member
    const computePersonRoleMetric = (
      profile: StaffBmKpiProfile,
      metricKey: string
    ): {
      actualText: string;
      numericValue: number;
      hasData: boolean;
      evidence: string;
      targetTab: string;
      targetTabLabel: string;
      rows: DrilldownRecordRow[];
    } => {
      // Person's own daily logs
      const personLogs = curLogs.filter(l => personMatchesField(l?.assignee, profile));

      // 1. IQC_PASS_RATE (Hà Khắc Việt, Hoàng Văn Phấn, Đoàn Anh Hùng)
      if (metricKey === 'IQC_PASS_RATE') {
        const myIqc = curIqc.filter(r => personMatchesField(r?.checkedBy, profile));
        const myIqcLogs = personLogs.filter(l => String(l?.category || '').toUpperCase().includes('IQC'));
        const pool = myIqc.length > 0 ? myIqc : curIqc;
        const tot = pool.length;
        const passed = pool.filter(isIqcLotPassed).length;
        if (tot > 0) {
          const rate = Number(((passed / tot) * 100).toFixed(1));
          const personalNote =
            myIqc.length > 0
              ? `Cá nhân trực tiếp đứng tên kiểm: ${myIqc.length} lô`
              : `Phối hợp tổ IQC kiểm: ${tot} lô`;
          return {
            actualText: `${rate}% (${passed}/${tot} lô)`,
            numericValue: rate,
            hasData: true,
            evidence: `${personalNote} • Đạt ${passed}/${tot} lô (${rate}%) • Báo cáo ngày IQC: ${myIqcLogs.length} việc`,
            targetTab: 'quality_inspection_records',
            targetTabLabel: 'Nhập liệu IQC - PQC - OQC',
            rows: pool.slice(0, 50).map(r => ({
              id: r.id || r.ecountVoucherNo || '--',
              date: formatDateStrVi(r.date),
              title: `${r.supplierName || 'NCC'} • ${r.itemSummary || r.content || '--'}`,
              actor: r.checkedBy || profile.staffName,
              resultText: r.result || 'Đạt',
              isPass: isIqcLotPassed(r)
            }))
          };
        }
        if (myIqcLogs.length > 0) {
          const done = myIqcLogs.filter(isDailyLogCompleted).length;
          const rate = Number(((done / myIqcLogs.length) * 100).toFixed(1));
          return {
            actualText: `${rate}% (${done}/${myIqcLogs.length} việc)`,
            numericValue: rate,
            hasData: true,
            evidence: `Thực hiện ${done}/${myIqcLogs.length} công việc kiểm tra IQC trong Báo cáo ngày (${rate}%)`,
            targetTab: 'daily_logs',
            targetTabLabel: 'Báo cáo ngày QLCL',
            rows: myIqcLogs.map(l => ({
              id: l.id || `STT-${l.stt}`,
              date: formatDateStrVi(l.date),
              title: l.content || '--',
              actor: l.assignee || profile.staffName,
              resultText: l.statusPercent || '0%',
              isPass: isDailyLogCompleted(l)
            }))
          };
        }
        return {
          actualText: 'Chưa có dữ liệu (0)',
          numericValue: 0,
          hasData: false,
          evidence: `Chưa phát sinh phiếu kiểm tra IQC trong ${label}`,
          targetTab: 'quality_inspection_records',
          targetTabLabel: 'Nhập liệu IQC - PQC - OQC',
          rows: []
        };
      }

      // 2. PQC_PASS_RATE (Hoàng Văn Phấn, Liễu Tùng Lâm, Hà Khắc Việt)
      if (metricKey === 'PQC_PASS_RATE') {
        const myPqc = curPqc.filter(r => personMatchesField(r?.checkedBy, profile));
        const myPqcLogs = personLogs.filter(l => String(l?.category || '').toUpperCase().includes('PQC'));
        const pool = myPqc.length > 0 ? myPqc : curPqc;
        const tot = pool.length;
        const passed = pool.filter(isPqcRecordPassed).length;
        if (tot > 0) {
          const rate = Number(((passed / tot) * 100).toFixed(1));
          const personalNote =
            myPqc.length > 0
              ? `Cá nhân trực tiếp tuần tra: ${myPqc.length} lượt`
              : `Tổ QC tuần tra dây chuyền: ${tot} lượt`;
          return {
            actualText: `${rate}% (${passed}/${tot} lượt)`,
            numericValue: rate,
            hasData: true,
            evidence: `${personalNote} • Đạt/đã cải tiến ${passed}/${tot} lượt (${rate}%) • Báo cáo ngày PQC: ${myPqcLogs.length} việc`,
            targetTab: 'quality_inspection_records',
            targetTabLabel: 'Nhập liệu IQC - PQC - OQC',
            rows: pool.slice(0, 50).map(r => ({
              id: r.id || r.lsx || '--',
              date: formatDateStrVi(r.date),
              title: `Model ${r.model || '--'} (LSX: ${r.lsx || '--'}) • ${r.findings || ''}`,
              actor: r.checkedBy || profile.staffName,
              resultText: r.status || '--',
              isPass: isPqcRecordPassed(r)
            }))
          };
        }
        if (myPqcLogs.length > 0) {
          const done = myPqcLogs.filter(isDailyLogCompleted).length;
          const rate = Number(((done / myPqcLogs.length) * 100).toFixed(1));
          return {
            actualText: `${rate}% (${done}/${myPqcLogs.length} việc)`,
            numericValue: rate,
            hasData: true,
            evidence: `Thực hiện ${done}/${myPqcLogs.length} tác vụ tuần tra PQC trong Báo cáo ngày (${rate}%)`,
            targetTab: 'daily_logs',
            targetTabLabel: 'Báo cáo ngày QLCL',
            rows: myPqcLogs.map(l => ({
              id: l.id || `STT-${l.stt}`,
              date: formatDateStrVi(l.date),
              title: l.content || '--',
              actor: l.assignee || profile.staffName,
              resultText: l.statusPercent || '0%',
              isPass: isDailyLogCompleted(l)
            }))
          };
        }
        return {
          actualText: 'Chưa có dữ liệu (0)',
          numericValue: 0,
          hasData: false,
          evidence: `Chưa phát sinh lượt tuần tra PQC trong ${label}`,
          targetTab: 'quality_inspection_records',
          targetTabLabel: 'Nhập liệu IQC - PQC - OQC',
          rows: []
        };
      }

      // 3. OQC_FPY_RATE (Liễu Tùng Lâm, Lành Xuân Hải, Hà Khắc Việt)
      if (metricKey === 'OQC_FPY_RATE') {
        const myOqc = curOqc.filter(r => personMatchesField(r?.checkedBy, profile));
        const pool = myOqc.length > 0 ? myOqc : curOqc;
        const tot = pool.length;
        const passed = pool.filter(isOqcRecordPassed).length;
        const failed = tot - passed;
        if (tot > 0) {
          const rate = Number(((passed / tot) * 100).toFixed(2));
          const personalNote =
            myOqc.length > 0
              ? `Trực tiếp đứng tên kiểm: ${myOqc.length.toLocaleString('vi-VN')} xe`
              : `Chốt OQC/KCS nghiệm thu: ${tot.toLocaleString('vi-VN')} xe`;
          return {
            actualText: `${rate}% (${tot.toLocaleString('vi-VN')} xe)`,
            numericValue: rate,
            hasData: true,
            evidence: `${personalNote} • Đạt chuẩn FPY: ${passed.toLocaleString('vi-VN')} xe (Phát hiện chặn lại ${failed} xe lỗi)`,
            targetTab: 'quality_inspection_records',
            targetTabLabel: 'Nhập liệu IQC - PQC - OQC',
            rows: pool.slice(0, 50).map(r => ({
              id: r.serialNo || r.chassisNo || r.id || '--',
              date: formatDateStrVi(r.date),
              title: `${r.model || '--'} (${r.color || '--'}) • ${r.defectDetail || 'Đạt chuẩn KCS'}`,
              actor: r.checkedBy || profile.staffName,
              resultText: r.status || 'Đạt',
              isPass: isOqcRecordPassed(r)
            }))
          };
        }
        return {
          actualText: 'Chưa có dữ liệu (0)',
          numericValue: 0,
          hasData: false,
          evidence: `Chưa phát sinh bản ghi nghiệm thu xe thành phẩm OQC trong ${label}`,
          targetTab: 'quality_inspection_records',
          targetTabLabel: 'Nhập liệu IQC - PQC - OQC',
          rows: []
        };
      }

      // 4. OQC_DIGITIZATION_RATE (Lành Xuân Hải — NV-QC-07 Số hóa nhập liệu lỗi OQC)
      if (metricKey === 'OQC_DIGITIZATION_RATE') {
        const totOqc = curOqc.length;
        const myOqcLogs = personLogs.filter(l => String(l?.category || '').toUpperCase().includes('OQC'));
        if (totOqc > 0 || myOqcLogs.length > 0) {
          const failedOqc = curOqc.filter(r => !isOqcRecordPassed(r));
          const documentedFailed = failedOqc.filter(r => Boolean(r?.defectDetail || r?.rootCause)).length;
          const docRate =
            failedOqc.length > 0
              ? Number(((documentedFailed / failedOqc.length) * 100).toFixed(1))
              : 100;
          return {
            actualText: `${docRate}% (${totOqc.toLocaleString('vi-VN')} xe)`,
            numericValue: docRate,
            hasData: true,
            evidence: `Đã số hóa nhập phần mềm ${totOqc.toLocaleString('vi-VN')} bản ghi OQC • Ghi nhận chi tiết mã lỗi ${documentedFailed}/${failedOqc.length} xe lỗi (${docRate}%)`,
            targetTab: 'quality_inspection_records',
            targetTabLabel: 'Nhập liệu IQC - PQC - OQC',
            rows: (failedOqc.length > 0 ? failedOqc : curOqc).slice(0, 50).map(r => ({
              id: r.serialNo || r.chassisNo || r.id || '--',
              date: formatDateStrVi(r.date),
              title: `${r.model || '--'} • Chi tiết lỗi: ${r.defectDetail || 'Đạt chuẩn'} (Nguyên nhân: ${r.rootCause || '--'})`,
              actor: r.checkedBy || 'Lành Xuân Hải',
              resultText: r.status || 'Đạt',
              isPass: Boolean(r.defectDetail || r.rootCause || isOqcRecordPassed(r))
            }))
          };
        }
        return {
          actualText: 'Chưa có dữ liệu (0)',
          numericValue: 0,
          hasData: false,
          evidence: `Chưa có bản ghi nhập liệu OQC trong ${label}`,
          targetTab: 'quality_inspection_records',
          targetTabLabel: 'Nhập liệu IQC - PQC - OQC',
          rows: []
        };
      }

      // 5. OQC_HANDOVER_SCAN_RATE (Lành Xuân Hải — Quét mã Barcode bàn giao Kho thành phẩm)
      if (metricKey === 'OQC_HANDOVER_SCAN_RATE') {
        const handoverCount = curHandover.length;
        const passedOqcCount = curOqc.filter(isOqcRecordPassed).length;
        if (handoverCount > 0 || passedOqcCount > 0) {
          const validScanCount = curHandover.filter(h => h?.status !== 'Lỗi').length;
          const denominator = passedOqcCount > 0 ? passedOqcCount : handoverCount;
          const rate =
            handoverCount > 0 && denominator > 0
              ? Math.min(100, Number(((validScanCount / denominator) * 100).toFixed(1)))
              : 0;
          return {
            actualText:
              handoverCount > 0
                ? `${handoverCount.toLocaleString('vi-VN')}/${Math.max(handoverCount, passedOqcCount).toLocaleString('vi-VN')} xe Scan (${rate}%)`
                : `0/${passedOqcCount.toLocaleString('vi-VN')} xe Scan (0%)`,
            numericValue: rate,
            hasData: true,
            evidence:
              handoverCount > 0
                ? `Đã quét mã Barcode bàn giao Kho thành phẩm ${validScanCount.toLocaleString('vi-VN')}/${denominator.toLocaleString('vi-VN')} xe PASS (${rate}%)`
                : `Có ${passedOqcCount.toLocaleString('vi-VN')} xe PASS nhưng chưa phát sinh lượt quét bàn giao Kho (0%)`,
            targetTab: 'quality_inspection_records',
            targetTabLabel: 'Nhập liệu OQC & Bàn giao Kho',
            rows: (handoverCount > 0 ? curHandover : curOqc.filter(isOqcRecordPassed)).slice(0, 50).map((h: any) => ({
              id: h.chassisNo || h.serialNo || h.id || '--',
              date: formatDateStrVi(h.handoverDate || h.scannedAt || h.date),
              title: `${h.model || '--'} (${h.color || '--'}) • Số máy: ${h.engineNo || '--'}`,
              actor: h.scannedBy || h.checkedBy || 'Lành Xuân Hải',
              resultText: 'PASS - Đã bàn giao Kho',
              isPass: true
            }))
          };
        }
        return {
          actualText: 'Chưa có dữ liệu (0)',
          numericValue: 0,
          hasData: false,
          evidence: `Chưa phát sinh lượt quét mã bàn giao Kho trong ${label}`,
          targetTab: 'quality_inspection_records',
          targetTabLabel: 'Nhập liệu OQC & Bàn giao Kho',
          rows: []
        };
      }

      // 6. OQC_TRACEABILITY_RATE (Liễu Tùng Lâm — Truy xuất hồ sơ lỗi OQC & chặn lỗi lọt thị trường)
      if (metricKey === 'OQC_TRACEABILITY_RATE') {
        const totOqc = curOqc.length;
        const failedOqc = curOqc.filter(r => !isOqcRecordPassed(r));
        const tracedFailed = failedOqc.filter(r => Boolean(r?.defectDetail || r?.rootCause)).length;
        if (totOqc > 0) {
          const traceRate =
            failedOqc.length > 0 ? Number(((tracedFailed / failedOqc.length) * 100).toFixed(1)) : 100;
          return {
            actualText: `${traceRate}% (${tracedFailed}/${failedOqc.length} xe lỗi)`,
            numericValue: traceRate,
            hasData: true,
            evidence: `Đã lập hồ sơ truy xuất & cách ly ${tracedFailed}/${failedOqc.length} xe lỗi tại trạm OQC (${traceRate}%) • Tổng kiểm: ${totOqc.toLocaleString('vi-VN')} xe`,
            targetTab: 'quality_inspection_records',
            targetTabLabel: 'Nhập liệu IQC - PQC - OQC',
            rows: (failedOqc.length > 0 ? failedOqc : curOqc).slice(0, 50).map(r => ({
              id: r.serialNo || r.chassisNo || r.id || '--',
              date: formatDateStrVi(r.date),
              title: `${r.model || '--'} • Lỗi: ${r.defectDetail || 'Không lỗi'} • Nguồn: ${r.rootCause || '--'}`,
              actor: r.checkedBy || 'Liễu Tùng Lâm',
              resultText: r.status || 'Đạt',
              isPass: Boolean(r.defectDetail || r.rootCause || isOqcRecordPassed(r))
            }))
          };
        }
        return {
          actualText: 'Chưa có dữ liệu (0)',
          numericValue: 0,
          hasData: false,
          evidence: `Chưa có bản ghi truy xuất OQC trong ${label}`,
          targetTab: 'quality_inspection_records',
          targetTabLabel: 'Nhập liệu IQC - PQC - OQC',
          rows: []
        };
      }

      // 7. PART_EVAL_BM_KTTD_01 (Nguyễn Văn Diệm & Đoàn Anh Hùng — Giám định kỹ thuật bảo hành BM-KTTD-01)
      if (metricKey === 'PART_EVAL_BM_KTTD_01') {
        const myEvals = curPartEvals.filter(p => personMatchesField(p?.inspector, profile));
        const myWarrantyDefects = curDefects.filter(d => personMatchesField(d?.assignee, profile));
        const evalPool = myEvals.length > 0 ? myEvals : curPartEvals;
        const defectPool = myWarrantyDefects.length > 0 ? myWarrantyDefects : curDefects;

        const totalItems = evalPool.length + defectPool.length;
        if (totalItems > 0) {
          const doneEvals = evalPool.filter(p => Boolean(p?.resolution || p?.rootCauseCategory)).length;
          const doneDefects = defectPool.filter(isMarketDefectResolved).length;
          const rate = Number((((doneEvals + doneDefects) / totalItems) * 100).toFixed(1));
          const evalQty = evalPool.reduce((s, p) => s + Math.max(1, Number(p?.quantity) || 1), 0);
          return {
            actualText: `${rate}% (${evalPool.length} phiếu / ${evalQty} LK)`,
            numericValue: rate,
            hasData: true,
            evidence: `Giám định ${doneEvals}/${evalPool.length} biên bản BM-KTTD-01 (${evalQty} linh kiện) & xử lý ${doneDefects}/${defectPool.length} hồ sơ bảo hành đại lý (${rate}%)`,
            targetTab: 'defects',
            targetTabLabel: 'Giám định Bảo hành & Thị trường',
            rows: [
              ...evalPool.map(p => ({
                id: p.id || '--',
                date: formatDateStrVi(p.receivedDate),
                title: `[BM-KTTD-01] ${p.partName || '--'} (SL: ${p.quantity || 1}) • Nguyên nhân: ${p.rootCauseCategory || '--'}`,
                actor: p.inspector || profile.staffName,
                resultText: p.resolution || 'Đã giám định',
                isPass: true
              })),
              ...defectPool.slice(0, 30).map(d => ({
                id: d.id || '--',
                date: formatDateStrVi(d.defectDate || d.sourceDate),
                title: `[Bảo hành] ${d.model || 'Xe'} (${d.dealer || 'Đại lý'}): ${d.description || d.type || '--'}`,
                actor: d.assignee || profile.staffName,
                resultText: d.status || 'Chưa xử lý',
                isPass: isMarketDefectResolved(d)
              }))
            ]
          };
        }
        return {
          actualText: 'Chưa có dữ liệu (0)',
          numericValue: 0,
          hasData: false,
          evidence: `Chưa phát sinh phiếu giám định BM-KTTD-01 hoặc hồ sơ bảo hành trong ${label}`,
          targetTab: 'defects',
          targetTabLabel: 'Giám định Bảo hành & Thị trường',
          rows: []
        };
      }

      // 8. PTSP_SAMPLE_AND_ROAD_TEST (Nguyễn Văn Diệm, Hà Khắc Việt, Hoàng Văn Phấn — Thử nghiệm xe mẫu R&D/PTSP)
      if (metricKey === 'PTSP_SAMPLE_AND_ROAD_TEST') {
        const myPtspLogs = personLogs.filter(l => {
          const cat = String(l?.category || '').toUpperCase();
          const txt = String(l?.content || '').toUpperCase();
          return (
            cat.includes('PHÁT TRIỂN') ||
            cat.includes('PTSP') ||
            txt.includes('MẪU') ||
            txt.includes('ĐĂNG KIỂM') ||
            txt.includes('THỬ NGHIỆM')
          );
        });
        const totalChecks = curPtspChecks.length + curPtspIssues.length + myPtspLogs.length;
        if (totalChecks > 0) {
          const passedChecks = curPtspChecks.filter(c => c.status === 'Đạt').length;
          const resolvedIssues = curPtspIssues.filter(i => i.status === 'Đã chốt' || i.status === 'Đang xử lý').length;
          const doneLogs = myPtspLogs.filter(isDailyLogCompleted).length;
          const rate = Number((((passedChecks + resolvedIssues + doneLogs) / totalChecks) * 100).toFixed(1));
          return {
            actualText: `${rate}% (${totalChecks} hạng mục)`,
            numericValue: rate,
            hasData: true,
            evidence: `Thực hiện ${curPtspChecks.length} hạng mục đo kiểm/chạy thử mẫu PTSP, xử lý ${resolvedIssues}/${curPtspIssues.length} vấn đề model mới & ${doneLogs}/${myPtspLogs.length} việc thử nghiệm (${rate}%)`,
            targetTab: 'ptsp',
            targetTabLabel: 'Phát triển SP (PTSP)',
            rows: [
              ...myPtspLogs.map(l => ({
                id: l.id || `STT-${l.stt}`,
                date: formatDateStrVi(l.date),
                title: `[Báo cáo ngày] ${l.content || '--'}`,
                actor: l.assignee || profile.staffName,
                resultText: l.statusPercent || '0%',
                isPass: isDailyLogCompleted(l)
              })),
              ...curPtspIssues.map(iss => ({
                id: iss.id || '--',
                date: formatDateStrVi(iss.createdAt || iss.dueDate),
                title: `[PTSP ${iss.modelName}] ${iss.partOrArea}: ${iss.description}`,
                actor: iss.ownerDept || profile.staffName,
                resultText: iss.status || 'Mở',
                isPass: iss.status === 'Đã chốt'
              })),
              ...curPtspChecks.slice(0, 30).map(chk => ({
                id: chk.id || '--',
                date: label,
                title: `[${chk.kind} - ${chk.modelName}] ${chk.item}: ${chk.standard || ''}`,
                actor: profile.staffName,
                resultText: chk.status || 'Đạt',
                isPass: true
              }))
            ]
          };
        }
        return {
          actualText: 'Chưa có dữ liệu (0)',
          numericValue: 0,
          hasData: false,
          evidence: `Chưa phát sinh hạng mục thử nghiệm mẫu PTSP trong ${label}`,
          targetTab: 'ptsp',
          targetTabLabel: 'Phát triển SP (PTSP)',
          rows: []
        };
      }

      // 9. QA_SOP_AUDIT_TRAINING (Trần Thế Quảng — Soạn thảo SOP/biểu mẫu /bm, Internal Audit & Đào tạo)
      if (metricKey === 'QA_SOP_AUDIT_TRAINING') {
        const myQaLogs = personLogs;
        const myPlanTasks = curPlanTasks.filter(pt => personMatchesField(pt?.assignee || pt?.pic, profile));
        const bmCount = (qmsBmRecords || []).length;
        const totalItems = myQaLogs.length + myPlanTasks.length;
        if (totalItems > 0 || bmCount > 0) {
          const doneLogs = myQaLogs.filter(isDailyLogCompleted).length;
          const donePlans = myPlanTasks.filter(pt => {
            const st = String(pt?.status || '').toLowerCase();
            return st === 'completed' || st === 'hoàn thành' || Number(pt?.progress || 0) >= 100;
          }).length;
          const rate =
            totalItems > 0 ? Number((((doneLogs + donePlans) / totalItems) * 100).toFixed(1)) : 100;
          return {
            actualText: `${rate}% (11 BM & 20 TL /bm)`,
            numericValue: rate,
            hasData: true,
            evidence: `Kiểm soát lưu hành 11 Biểu mẫu & 20 Tài liệu SOP trong /bm (${bmCount} bản ghi đồng bộ) • Hoàn thành ${doneLogs + donePlans}/${totalItems} đầu việc QA/Đào tạo`,
            targetTab: 'qms_forms',
            targetTabLabel: 'Biểu mẫu & Hồ sơ Quy trình (/bm)',
            rows: [
              ...myQaLogs.map(l => ({
                id: l.id || `STT-${l.stt}`,
                date: formatDateStrVi(l.date),
                title: `[${l.category}] ${l.content}`,
                actor: l.assignee || 'Trần Thế Quảng',
                resultText: l.statusPercent || '0%',
                isPass: isDailyLogCompleted(l)
              })),
              ...myPlanTasks.map((pt, idx) => ({
                id: pt.id || `KH-${idx + 1}`,
                date: formatDateStrVi(pt.deadline) || label,
                title: `[${pt._source}] ${pt._title}`,
                actor: pt.assignee || 'Trần Thế Quảng',
                resultText: pt.status || 'Đang thực hiện',
                isPass: String(pt.status || '').toLowerCase() === 'completed'
              }))
            ]
          };
        }
        return {
          actualText: 'Chưa có dữ liệu (0)',
          numericValue: 0,
          hasData: false,
          evidence: `Chưa phát sinh bản ghi công việc QA / Đào tạo trong ${label}`,
          targetTab: 'qms_forms',
          targetTabLabel: 'Biểu mẫu & Hồ sơ Quy trình (/bm)',
          rows: []
        };
      }

      // 10. DEPT_OVERALL_KPI (Nguyễn Xuân Thao)
      if (metricKey === 'DEPT_OVERALL_KPI') {
        const hasAny = deptSummary.activeIndicatorsCount > 0;
        return {
          actualText: hasAny ? `${deptSummary.normalizedScore}%` : 'Chưa có dữ liệu (0)',
          numericValue: deptSummary.normalizedScore,
          hasData: hasAny,
          evidence: hasAny
            ? `Điểm tổng KPI toàn Phòng QLCL kỳ ${label}: ${deptSummary.normalizedScore}/100 điểm (${deptSummary.passedCount}/${deptSummary.activeIndicatorsCount} chỉ tiêu có dữ liệu Đạt)`
            : `Chưa có chỉ tiêu nào phát sinh dữ liệu trong ${label}`,
          targetTab: 'kpi_dashboard',
          targetTabLabel: 'KPI Phòng QLCL',
          rows: resolvedDeptKpis
            .filter(k => !k.isWaitingData)
            .map(k => ({
              id: k.id,
              date: label,
              title: `${k.indicator} (Mục tiêu: ${k.effectiveTarget})`,
              actor: 'Phòng QLCL',
              resultText: `${k.effectiveActual} (${k.achievedPoints}/${k.weight}đ)`,
              isPass: k.effectiveStatus === 'Đạt'
            }))
        };
      }

      // 11. EQUIPMENT_CALIBRATION_RATE + FABRICATION JOBS (Đoàn Anh Hùng — BM-KTTD-H02: CCDC/TB Đo lường & Gia công đồ gá/mẫu)
      if (metricKey === 'EQUIPMENT_CALIBRATION_RATE') {
        const am = autoMetricsMap.EQUIPMENT_CALIBRATION_RATE;
        const fabJobs = periodDataset.curFabJobs || [];
        const myFabJobs = fabJobs.filter((j: any) => !j?.assignee || personMatchesField(j.assignee, profile));
        const activeFabPool = myFabJobs.length > 0 ? myFabJobs : fabJobs;

        const eqTotal = (equipments || []).length;
        const eqValid = (equipments || []).filter(eq => {
          const st = String(eq?.status || '').toLowerCase();
          const calSt = String(eq?.calibrationStatus || '').toLowerCase();
          const isSuspended = calSt.includes('đình chỉ') || calSt.includes('quá hạn');
          const isOp = st === 'running' || st === 'hoạt động tốt' || st === 'đạt' || st === 'active';
          const nextDate = parseFlexibleDate(eq?.nextCalibrationDate || eq?.nextMaintenanceDate);
          const isOverdue = nextDate ? nextDate.getTime() < todayStartMs : false;
          return isOp && !isSuspended && !isOverdue;
        }).length;

        const fabTotal = activeFabPool.length;
        const fabPassed = activeFabPool.filter((j: any) => {
          if (j?.status === 'Hoàn thành & Bàn giao') {
            const due = parseFlexibleDate(j?.dueDate);
            const comp = parseFlexibleDate(j?.completedDate);
            if (due && comp) return comp.getTime() <= due.getTime() + 86400000;
            return true;
          }
          // Pending / in-progress but still before dueDate counts as on-track unless overdue
          const due = parseFlexibleDate(j?.dueDate);
          if (due && due.getTime() < todayStartMs) return false;
          return j?.status === 'Đang thực hiện';
        }).length;
        const fabDoneCount = activeFabPool.filter((j: any) => j?.status === 'Hoàn thành & Bàn giao').length;

        if (eqTotal > 0 || fabTotal > 0) {
          const combinedRate = Number((((eqValid + fabPassed) / (eqTotal + fabTotal)) * 100).toFixed(1));
          const fabRows: DrilldownRecordRow[] = activeFabPool.map((j: any) => ({
            id: j.id || '--',
            date: formatDateStrVi(j.completedDate || j.dueDate || j.requestDate),
            title: `[${j.jobType || 'Đồ gá'}] ${j.title || '--'}${j.modelName ? ` • Xe: ${j.modelName}` : ''} (${j.requestDept || '--'})`,
            actor: j.assignee || profile.staffName,
            resultText: j.status || 'Chờ thực hiện',
            isPass: j.status === 'Hoàn thành & Bàn giao'
          }));

          return {
            actualText:
              fabTotal > 0
                ? `${combinedRate}% (${eqValid}/${eqTotal} TB • ${fabDoneCount}/${fabTotal} Đồ gá)`
                : am.actualText,
            numericValue: fabTotal > 0 ? combinedRate : am.numericValue,
            hasData: true,
            evidence:
              fabTotal > 0
                ? `Hiệu chuẩn TB/CCDC (BM-KTTD-02): ${eqValid}/${eqTotal} đạt chuẩn • Gia công đồ gá/mẫu/sửa chữa (NV-KTTĐ-05): ${fabDoneCount}/${fabTotal} hoàn thành (${combinedRate}%)`
                : am.evidenceText,
            targetTab: 'machinery_maintenance',
            targetTabLabel: 'Thiết bị',
            rows: [...fabRows, ...(am.sourceRecords || [])]
          };
        }
      }

      // Default fallback to autoMetricsMap
      const am = autoMetricsMap[metricKey];
      if (am) {
        return {
          actualText: am.actualText,
          numericValue: am.numericValue,
          hasData: am.hasData,
          evidence: am.evidenceText,
          targetTab: am.targetTab,
          targetTabLabel: am.targetTabLabel,
          rows: am.sourceRecords
        };
      }

      return {
        actualText: 'Chưa có dữ liệu (0)',
        numericValue: 0,
        hasData: false,
        evidence: `Chưa có dữ liệu trong ${label}`,
        targetTab: 'daily_logs',
        targetTabLabel: 'Báo cáo ngày QLCL',
        rows: []
      };
    };

    // Bắt đầu từ 8 Bản giao nhiệm vụ chuẩn trong /bm và tự động bổ sung nhân sự mới thêm trong dk_staff (nếu có)
    const mergedProfiles: StaffBmKpiProfile[] = [...STAFF_BM_KPI_PROFILES];
    const existingKeys = new Set(mergedProfiles.map(p => normalizePersonKey(p.staffName)));
    (staffList || []).forEach((s: any) => {
      const name = String(s?.name || '').trim();
      if (!name) return;
      const nk = normalizePersonKey(name);
      if (existingKeys.has(nk)) return;
      existingKeys.add(nk);
      mergedProfiles.push({
        staffName: name,
        aliases: [name],
        roleTitle: s.role || 'Nhân sự QLCL',
        bmDocCode: 'BM-QLCL',
        mtcvCode: 'MTCV-QLCL',
        summary: `Nhiệm vụ chuyên môn — ${s.role || 'Phòng Quản lý chất lượng'}`,
        metrics: [
          {
            id: `dyn-daily-${nk}`,
            name: 'Tỷ lệ hoàn thành công việc báo cáo ngày',
            bmReference: 'BM-QLCL',
            unit: '%',
            weight: 30,
            target: '>= 90%',
            targetValue: 90,
            direction: 'higher_is_better',
            autoMetricKey: 'DAILY_TASK_COMPLETION'
          },
          {
            id: `dyn-capa-${nk}`,
            name: 'Tỷ lệ đóng CAPA / xử lý sự cố đúng hạn',
            bmReference: 'BM-QLCL',
            unit: '%',
            weight: 20,
            target: '>= 90%',
            targetValue: 90,
            direction: 'higher_is_better',
            autoMetricKey: 'CAPA_ON_TIME_RATE'
          }
        ]
      });
    });

    return mergedProfiles
      .map(profile => {
        const staffKey = normalizePersonKey(profile.staffName);
        const evalRecordKey = `${pKey}__${staffKey}`;
        const savedEval = staffEvals[evalRecordKey];

        // 1. Compute Group 1: Operational Metrics from /bm (Max 50 points)
        const resolvedRoleMetrics = profile.metrics.map(m => {
          const ov = savedEval?.metricOverrides?.[m.id];
          const weight = ov?.weight !== undefined ? Number(ov.weight) : m.weight;
          const targetText = ov?.targetText !== undefined && ov.targetText !== '' ? ov.targetText : m.target;
          const { targetValue: resolvedTargetVal, direction: resolvedDirection } = parseTargetConstraint(
            targetText,
            m.targetValue,
            m.direction
          );

          const computed = computePersonRoleMetric(profile, m.autoMetricKey);
          const hasActualOverride =
            (ov?.actualText !== undefined && ov.actualText !== '') || ov?.scorePercent !== undefined;
          const hasAnyOverride = Boolean(
            ov &&
              (ov.name !== undefined ||
                ov.weight !== undefined ||
                ov.targetText !== undefined ||
                ov.actualText !== undefined ||
                ov.scorePercent !== undefined)
          );

          const effectiveActualText =
            ov?.actualText !== undefined && ov.actualText !== '' ? ov.actualText : computed.actualText;
          const isWaitingData = !computed.hasData && !hasActualOverride;

          let scorePercent = 0;
          if (ov?.scorePercent !== undefined) {
            scorePercent = Math.max(0, Math.min(100, Number(ov.scorePercent)));
          } else if (ov?.actualText !== undefined && ov.actualText !== '') {
            const parsed = parseNumericFromActualString(ov.actualText);
            scorePercent =
              parsed !== null
                ? computeAttainmentAndStatus(parsed, resolvedTargetVal, resolvedDirection).attainmentPct
                : 100;
          } else if (computed.hasData) {
            scorePercent = computeAttainmentAndStatus(
              computed.numericValue,
              resolvedTargetVal,
              resolvedDirection
            ).attainmentPct;
          }

          const points = isWaitingData ? 0 : Number(((weight * scorePercent) / 100).toFixed(2));

          return {
            ...m,
            name: ov?.name !== undefined ? ov.name : m.name,
            weight,
            targetText,
            actualText: effectiveActualText,
            scorePercent,
            points,
            isWaitingData,
            hasAnyOverride,
            evidence: computed.evidence,
            targetTab: computed.targetTab,
            targetTabLabel: computed.targetTabLabel,
            sourceRows: computed.rows,
            note: ov?.note || ''
          };
        });

        const customRoleMetrics = (savedEval?.customMetrics || []).map(cm => {
          const pct = Math.max(0, Math.min(100, Number(cm.scorePercent ?? 100)));
          const pts = Number(((Number(cm.weight || 0) * pct) / 100).toFixed(2));
          return {
            id: cm.id,
            name: cm.name,
            bmReference: cm.bmReference || 'Chỉ tiêu bổ sung theo kỳ',
            weight: Number(cm.weight || 0),
            targetText: cm.targetText,
            actualText: cm.actualText,
            scorePercent: pct,
            points: pts,
            isWaitingData: false,
            evidence: 'Chỉ tiêu bổ sung trực tiếp bởi Trưởng phòng QLCL',
            targetTab: 'kpi_dashboard',
            targetTabLabel: 'KPI Nhân sự',
            sourceRows: [] as DrilldownRecordRow[],
            note: '',
            isCustom: true
          };
        });

        const allRoleMetrics = [...resolvedRoleMetrics, ...customRoleMetrics];
        const activeRoleMetrics = allRoleMetrics.filter(x => !x.isWaitingData);
        const activeRoleWeight = activeRoleMetrics.reduce((s, x) => s + x.weight, 0);
        const rawRolePoints = activeRoleMetrics.reduce((s, x) => s + x.points, 0);
        const roleScore50 =
          activeRoleWeight > 0 ? Number(((rawRolePoints / activeRoleWeight) * 50).toFixed(1)) : 0;

        // 2. Compute Group 2: Daily Logs & Task Completion in Period (Max 30 points)
        const engineerLogs = curLogs.filter(log => personMatchesField(log?.assignee, profile));
        const engineerPlans = curPlanTasks.filter(pt =>
          personMatchesField(pt?.assignee || pt?.pic, profile)
        );

        const totalTasks = engineerLogs.length;
        const completedTasks = engineerLogs.filter(isDailyLogCompleted).length;
        const overdueTasks = engineerLogs.filter(l => isDailyLogOverdue(l, todayStartMs)).length;

        const filterByStage = (keywords: string[]) =>
          engineerLogs.filter(l => {
            const cat = String(l?.category || '').toUpperCase();
            const content = String(l?.content || '').toUpperCase();
            return keywords.some(kw => cat.includes(kw) || content.includes(kw));
          });

        const calcStage = (arr: any[]) => {
          const tot = arr.length;
          const comp = arr.filter(isDailyLogCompleted).length;
          return { total: tot, completed: comp, rate: tot > 0 ? Math.round((comp / tot) * 100) : 0 };
        };

        const sqcStat = calcStage(filterByStage(['SQC', 'NCC', 'NHÀ CUNG CẤP', 'QA']));
        const iqcStat = calcStage(filterByStage(['IQC', 'ĐẦU VÀO']));
        const pqcStat = calcStage(filterByStage(['PQC', 'LẮP RÁP', 'CHUYỀN']));
        const oqcStat = calcStage(filterByStage(['OQC', 'KCS', 'THÀNH PHẨM', 'XUẤT XƯỞNG']));
        const csStat = calcStage(filterByStage(['CS', 'BẢO HÀNH', 'THỊ TRƯỜNG', 'ĐẠI LÝ', 'KHÁCH HÀNG']));

        const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const distinctDays = new Set(
          engineerLogs
            .map(l => {
              const d = parseFlexibleDate(l?.date || l?.createdAt);
              return d ? getLocalYmd(d) : '';
            })
            .filter(Boolean)
        ).size;

        // If the staff member has daily logs in period, score out of 30 (20 pts completion + 10 pts timeliness)
        let dailyScore30 = 0;
        if (totalTasks > 0) {
          const baseCompletionPts = (taskCompletionRate / 100) * 20;
          const timelinessPts = Math.max(0, 10 - overdueTasks * 2);
          dailyScore30 = Number(Math.min(30, baseCompletionPts + timelinessPts).toFixed(1));
        } else if (engineerPlans.length > 0) {
          const donePlans = engineerPlans.filter(
            pt => String(pt?.status || '').toLowerCase() === 'completed'
          ).length;
          const planRate = Math.round((donePlans / engineerPlans.length) * 100);
          dailyScore30 = Number(((planRate / 100) * 30).toFixed(1));
        }

        const dailySourceRows: DrilldownRecordRow[] = engineerLogs.map(l => ({
          id: l.id || `STT-${l.stt}`,
          date: formatDateStrVi(l.date),
          title: `[${l.category || 'QLCL'}] ${l.content || '--'} (Hạn: ${formatDateStrVi(l.deadline)})`,
          actor: l.assignee || profile.staffName,
          resultText: `${l.statusPercent || '0%'} ${l.result ? `• KQ: ${l.result}` : ''}`,
          isPass: isDailyLogCompleted(l)
        }));

        // 3. Compute Group 3: Manager Evaluation (Max 20 points = 10 responsibility + 10 initiative/5S)
        const mgrResp =
          savedEval?.managerResponsibilityScore !== undefined
            ? Number(savedEval.managerResponsibilityScore)
            : 9;
        const mgrInit =
          savedEval?.managerInitiativeScore !== undefined ? Number(savedEval.managerInitiativeScore) : 9;
        const managerScore20 = Number(Math.min(20, Math.max(0, mgrResp + mgrInit)).toFixed(1));
        const managerComment = savedEval?.managerComment || '';

        const totalScore100 = Number((roleScore50 + dailyScore30 + managerScore20).toFixed(1));
        const rating =
          activeRoleMetrics.length === 0 && totalTasks === 0
            ? 'Chờ dữ liệu'
            : totalScore100 >= 90
            ? 'Xuất sắc'
            : totalScore100 >= 80
            ? 'Tốt'
            : totalScore100 >= 70
            ? 'Khá'
            : totalScore100 >= 60
            ? 'Trung bình'
            : 'Cần cải tiến';

        return {
          profile,
          staffKey,
          evalRecordKey,
          allRoleMetrics,
          activeRoleMetricsCount: activeRoleMetrics.length,
          roleScore50,
          dailyScore30,
          managerScore20,
          mgrResp,
          mgrInit,
          managerComment,
          totalScore100,
          rating,
          hasManagerSaved: Boolean(savedEval),
          dailySourceRows,
          dailyStats: {
            totalTasks,
            completedTasks,
            overdueTasks,
            taskCompletionRate,
            distinctDays,
            sqcStat,
            iqcStat,
            pqcStat,
            oqcStat,
            csStat
          }
        };
      })
      .sort((a, b) => b.totalScore100 - a.totalScore100);
  }, [
    periodInfo,
    periodDataset,
    staffEvals,
    autoMetricsMap,
    deptSummary,
    resolvedDeptKpis,
    qmsBmRecords,
    equipments,
    todayStartMs
  ]);

  const staffSummary = useMemo(() => {
    if (staffEvaluationsComputed.length === 0) {
      return { avgScore: 0, topPerformer: '--', goodOrAboveCount: 0, totalStaff: 0 };
    }
    const sum = staffEvaluationsComputed.reduce((s, x) => s + x.totalScore100, 0);
    const avgScore = Number((sum / staffEvaluationsComputed.length).toFixed(1));
    const topPerformer = staffEvaluationsComputed[0]?.profile.staffName || '--';
    const goodOrAboveCount = staffEvaluationsComputed.filter(x => x.totalScore100 >= 80).length;
    return {
      avgScore,
      topPerformer,
      goodOrAboveCount,
      totalStaff: staffEvaluationsComputed.length
    };
  }, [staffEvaluationsComputed]);

  // ============================================================================
  // MODALS & INTERACTIVE EDITING STATES
  // ============================================================================
  const [editingDeptKpi, setEditingDeptKpi] = useState<any | null>(null);
  const [editActualInput, setEditActualInput] = useState<string>('');
  const [editTargetInput, setEditTargetInput] = useState<string>('');
  const [editWeightInput, setEditWeightInput] = useState<number>(5);
  const [editStatusInput, setEditStatusInput] = useState<DetailedKPI['status']>('Đạt');
  const [editNoteInput, setEditNoteInput] = useState<string>('');
  const [editIndicatorName, setEditIndicatorName] = useState<string>('');
  const [editDefinitionInput, setEditDefinitionInput] = useState<string>('');
  const [editActualOverrideEnabled, setEditActualOverrideEnabled] = useState<boolean>(false);

  const [showAddKpiModal, setShowAddKpiModal] = useState<boolean>(false);
  const [newKpiType, setNewKpiType] = useState<DetailedKPI['type']>('Mục tiêu hoạt động chuyên môn');
  const [newKpiCategory, setNewKpiCategory] = useState<DetailedKPI['category']>('Hệ thống & Hồ sơ');
  const [newKpiWeight, setNewKpiWeight] = useState<number>(5);
  const [newKpiIndicator, setNewKpiIndicator] = useState<string>('');
  const [newKpiDefinition, setNewKpiDefinition] = useState<string>('');
  const [newKpiUnit, setNewKpiUnit] = useState<string>('%');
  const [newKpiTarget, setNewKpiTarget] = useState<string>('>= 95%');
  const [newKpiActual, setNewKpiActual] = useState<string>('100%');

  const [selectedStaffKey, setSelectedStaffKey] = useState<string>(() =>
    normalizePersonKey(STAFF_BM_KPI_PROFILES[0].staffName)
  );
  const [showAddStaffMetricModal, setShowAddStaffMetricModal] = useState<boolean>(false);
  const [newStaffMetricName, setNewStaffMetricName] = useState<string>('');
  const [newStaffMetricBmRef, setNewStaffMetricBmRef] = useState<string>('Giao nhiệm vụ bổ sung trong kỳ');
  const [newStaffMetricWeight, setNewStaffMetricWeight] = useState<number>(10);
  const [newStaffMetricTarget, setNewStaffMetricTarget] = useState<string>('100%');
  const [newStaffMetricActual, setNewStaffMetricActual] = useState<string>('100%');
  const [newStaffMetricScorePct, setNewStaffMetricScorePct] = useState<number>(100);

  const selectedStaffComputed = useMemo(() => {
    return (
      staffEvaluationsComputed.find(s => s.staffKey === selectedStaffKey) ||
      staffEvaluationsComputed[0] ||
      null
    );
  }, [staffEvaluationsComputed, selectedStaffKey]);

  const openEditDeptKpiModal = (kpiItem: any) => {
    setEditingDeptKpi(kpiItem);
    setEditIndicatorName(kpiItem.indicator);
    setEditDefinitionInput(kpiItem.definition);
    setEditWeightInput(Number(kpiItem.weight || 5));
    setEditTargetInput(kpiItem.effectiveTarget || kpiItem.target);
    setEditActualInput(kpiItem.isWaitingData ? '' : kpiItem.effectiveActual || kpiItem.actual);
    setEditStatusInput(
      kpiItem.effectiveStatus === 'Chờ dữ liệu' ? 'Đạt' : kpiItem.effectiveStatus || kpiItem.status || 'Đạt'
    );
    setEditNoteInput(kpiItem.overrideNote || '');
    setEditActualOverrideEnabled(kpiItem.sourceType === 'manual' || Boolean(kpiItem.isOverridden));
  };

  const handleSaveDeptKpiEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeptKpi) return;
    const pKey = periodInfo.key;

    const nextKpis = kpis.map(k => {
      if (k.id !== editingDeptKpi.id) return k;
      const nextTargetText = editTargetInput.trim() || k.target;
      const { targetValue: parsedTargetVal, direction: parsedDirection } = parseTargetConstraint(
        nextTargetText,
        k.targetValue,
        k.direction
      );
      const nextOverrides = { ...(k.periodOverrides || {}) };
      const shouldOverrideActual = k.sourceType === 'manual' || editActualOverrideEnabled;

      if (shouldOverrideActual) {
        nextOverrides[pKey] = {
          actual: editActualInput.trim(),
          target: nextTargetText,
          status: editStatusInput,
          note: editNoteInput.trim(),
          updatedAt: new Date().toISOString()
        };
      } else {
        // Giữ nguyên chế độ tự động lấy số liệu từ App: chỉ lưu lại Target mới và Ghi chú kỳ (nếu có)
        if (nextOverrides[pKey]) {
          delete nextOverrides[pKey].actual;
          delete nextOverrides[pKey].status;
          delete nextOverrides[pKey].scorePercent;
        }
        nextOverrides[pKey] = {
          ...(nextOverrides[pKey] || {}),
          target: nextTargetText,
          note: editNoteInput.trim(),
          updatedAt: new Date().toISOString()
        };
      }

      return {
        ...k,
        indicator: editIndicatorName.trim() || k.indicator,
        definition: editDefinitionInput.trim() || k.definition,
        weight: Number(editWeightInput) || k.weight || 5,
        target: nextTargetText,
        targetValue: parsedTargetVal,
        direction: parsedDirection,
        actual: shouldOverrideActual ? editActualInput.trim() || k.actual : k.actual,
        status: shouldOverrideActual ? editStatusInput : k.status,
        periodOverrides: nextOverrides
      };
    });

    persistKpis(nextKpis);
    setEditingDeptKpi(null);
  };

  const handleClearPeriodOverride = (kpiId: string) => {
    const pKey = periodInfo.key;
    const nextKpis = kpis.map(k => {
      if (k.id !== kpiId) return k;
      const nextOverrides = { ...(k.periodOverrides || {}) };
      delete nextOverrides[pKey];
      return { ...k, periodOverrides: nextOverrides };
    });
    persistKpis(nextKpis);
    setEditingDeptKpi(null);
  };

  const handleResetStaffMetricOverride = (staffKey: string, metricId: string) => {
    updateStaffEvaluation(staffKey, prev => {
      const nextMetricOverrides = { ...(prev.metricOverrides || {}) };
      delete nextMetricOverrides[metricId];
      return {
        ...prev,
        metricOverrides: nextMetricOverrides
      };
    });
  };

  const handleAddCustomDeptKpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKpiIndicator.trim()) return;
    const prefix = newKpiType === 'Mục tiêu hoạt động chung' ? 'KPI-COM' : 'KPI-PRO';
    const newItem: DetailedKPI = {
      id: `${prefix}-${Date.now().toString().slice(-4)}`,
      category: newKpiCategory,
      type: newKpiType,
      groupWeight: Number(newKpiWeight) || 5,
      weight: Number(newKpiWeight) || 5,
      indicator: newKpiIndicator.trim(),
      definition: newKpiDefinition.trim() || 'Chỉ tiêu bổ sung theo yêu cầu quản lý chất lượng.',
      unit: newKpiUnit.trim() || '%',
      target: newKpiTarget.trim() || '100%',
      targetValue: parseNumericFromActualString(newKpiTarget) ?? 100,
      direction:
        newKpiTarget.includes('<=') || newKpiTarget.includes('<') ? 'lower_is_better' : 'higher_is_better',
      sourceType: 'manual',
      actual: newKpiActual.trim() || '100%',
      status: 'Đạt',
      details: `Chỉ tiêu bổ sung trong kỳ ${periodInfo.label}`
    };

    persistKpis([...kpis, newItem]);
    setNewKpiIndicator('');
    setNewKpiDefinition('');
    setShowAddKpiModal(false);
  };

  const handleDeleteDeptKpi = (id: string) => {
    const next = kpis.filter(k => k.id !== id);
    persistKpis(next);
  };

  const handleRestoreDefault16Kpis = () => {
    persistKpis(DEFAULT_DETAILED_KPIS);
  };

  const updateStaffEvaluation = (
    staffKey: string,
    updater: (prev: StaffKpiPeriodEvaluation) => StaffKpiPeriodEvaluation
  ) => {
    const pKey = periodInfo.key;
    const evalRecordKey = `${pKey}__${staffKey}`;
    const existing: StaffKpiPeriodEvaluation = staffEvals[evalRecordKey] || {
      staffKey,
      periodKey: pKey,
      metricOverrides: {},
      customMetrics: [],
      managerResponsibilityScore: 9,
      managerInitiativeScore: 9,
      managerComment: '',
      updatedAt: new Date().toISOString()
    };
    const updated = {
      ...updater(existing),
      updatedAt: new Date().toISOString()
    };
    persistStaffEvaluations({
      ...staffEvals,
      [evalRecordKey]: updated
    });
  };

  const handleAddCustomStaffMetric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffComputed || !newStaffMetricName.trim()) return;
    updateStaffEvaluation(selectedStaffComputed.staffKey, prev => ({
      ...prev,
      customMetrics: [
        ...(prev.customMetrics || []),
        {
          id: `CM-${Date.now().toString().slice(-4)}`,
          name: newStaffMetricName.trim(),
          bmReference: newStaffMetricBmRef.trim() || 'Giao nhiệm vụ bổ sung',
          weight: Number(newStaffMetricWeight) || 10,
          targetText: newStaffMetricTarget.trim() || '100%',
          actualText: newStaffMetricActual.trim() || '100%',
          scorePercent: Number(newStaffMetricScorePct) || 100
        }
      ]
    }));
    setNewStaffMetricName('');
    setShowAddStaffMetricModal(false);
  };

  const handleDeleteCustomStaffMetric = (staffKey: string, metricId: string) => {
    updateStaffEvaluation(staffKey, prev => ({
      ...prev,
      customMetrics: (prev.customMetrics || []).filter(m => m.id !== metricId)
    }));
  };

  // ============================================================================
  // EXPORT EXCEL (.XLSX MULTI-SHEET WITH FULL STYLING, ALIGNMENT & 8 STAFF)
  // ============================================================================
  const handleExportExcel = () => {
    try {
      const wb = XLSXStyle.utils.book_new();
      const BRAND_TITLE = 'CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT';
      const BRAND_SUB = 'Thương hiệu: DKBike — Slogan: Xe cho cả gia đình | Phòng Quản lý chất lượng (QLCL / DK QMS)';

      const HEADER_FILL = { fgColor: { rgb: '1E3A8A' } };
      const SUBHEADER_FILL = { fgColor: { rgb: 'EFF6FF' } };
      const SECTION_FILL = { fgColor: { rgb: 'E0E7FF' } };
      const TH_FILL = { fgColor: { rgb: '1E40AF' } };
      const ZEBRA_FILL = { fgColor: { rgb: 'F8FAFC' } };
      const TOTAL_FILL = { fgColor: { rgb: 'E2E8F0' } };
      const POSITIVE_FILL = { fgColor: { rgb: 'ECFDF5' } };
      const NEGATIVE_FILL = { fgColor: { rgb: 'FFF1F2' } };
      const WARN_FILL = { fgColor: { rgb: 'FFFBEB' } };
      const MUTED_FILL = { fgColor: { rgb: 'F1F5F9' } };

      const BORDER_THIN = {
        top: { style: 'thin', color: { rgb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } }
      };
      const BORDER_SECTION = {
        top: { style: 'thin', color: { rgb: '93C5FD' } },
        bottom: { style: 'thin', color: { rgb: '93C5FD' } },
        left: { style: 'medium', color: { rgb: '1D4ED8' } },
        right: { style: 'thin', color: { rgb: '93C5FD' } }
      };
      const BORDER_TOTAL = {
        top: { style: 'medium', color: { rgb: '475569' } },
        bottom: { style: 'medium', color: { rgb: '475569' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } }
      };

      const getColAlign = (header: string): 'center' | 'right' | 'left' => {
        const h = (header || '').trim().toLowerCase();
        if (
          h === 'stt' ||
          h === 'hạng' ||
          h.includes('mã') ||
          h.includes('nguồn đo') ||
          h.includes('đơn vị') ||
          h.includes('chỉ tiêu') ||
          h.includes('thực tế') ||
          h.includes('hoàn thành') ||
          h.includes('đánh giá') ||
          h.includes('xếp loại') ||
          h.includes('trạng thái') ||
          h.includes('tỷ lệ') ||
          h.includes('ngày')
        ) {
          return 'center';
        }
        if (
          h.includes('trọng số') ||
          h.includes('điểm') ||
          h.includes('tổng kpi') ||
          h.includes('số lượng')
        ) {
          return 'center';
        }
        return 'left';
      };

      const getBadgeStyle = (valStr: string) => {
        const v = (valStr || '').trim().toLowerCase();
        if (v === 'đạt' || v === 'xuất sắc' || v === 'tốt' || v === 'hoàn thành' || v === 'pass - đã bàn giao kho') {
          return { fill: POSITIVE_FILL, color: '065F46', bold: true };
        }
        if (v === 'không đạt' || v === 'cần cải tiến' || v === 'quá hạn' || v === 'lỗi') {
          return { fill: NEGATIVE_FILL, color: '9F1239', bold: true };
        }
        if (v === 'theo dõi' || v === 'đang cải tiến' || v === 'khá' || v === 'trung bình') {
          return { fill: WARN_FILL, color: '92400E', bold: true };
        }
        if (v === 'chờ dữ liệu' || v.includes('chưa có dữ liệu')) {
          return { fill: MUTED_FILL, color: '64748B', bold: false };
        }
        return null;
      };

      const buildStyledSheet = (
        sheetTitle: string,
        subtitleInfo: string,
        sections: { title: string; headers: string[]; rows: (string | number)[][] }[],
        colWidths: number[]
      ) => {
        const maxCols = Math.max(4, colWidths.length, ...sections.map(s => s.headers.length));
        const aoa: (string | number)[][] = [
          [BRAND_TITLE],
          [BRAND_SUB],
          [`${sheetTitle} — KỲ: ${periodInfo.label.toUpperCase()} (${periodInfo.rangeText})`],
          [subtitleInfo],
          []
        ];

        const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: maxCols - 1 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: maxCols - 1 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: maxCols - 1 } },
          { s: { r: 3, c: 0 }, e: { r: 3, c: maxCols - 1 } }
        ];

        const sectionRowMeta: { rowIdx: number; colCount: number }[] = [];
        const headerRowMeta: { rowIdx: number; headers: string[] }[] = [];
        const dataRowMeta: { rowIdx: number; headers: string[]; zebra: boolean; isTotal: boolean }[] = [];

        for (const sec of sections) {
          const secColSpan = Math.max(sec.headers.length, maxCols);
          const secRowIdx = aoa.length;
          aoa.push([sec.title]);
          merges.push({ s: { r: secRowIdx, c: 0 }, e: { r: secRowIdx, c: secColSpan - 1 } });
          sectionRowMeta.push({ rowIdx: secRowIdx, colCount: secColSpan });

          const thRowIdx = aoa.length;
          aoa.push(sec.headers);
          headerRowMeta.push({ rowIdx: thRowIdx, headers: sec.headers });

          sec.rows.forEach((row, idx) => {
            const absR = aoa.length;
            aoa.push(row);
            const firstCells = `${row[0] ?? ''} ${row[1] ?? ''} ${row[2] ?? ''}`.toLowerCase();
            const isTotal =
              firstCells.includes('tổng cộng') ||
              firstCells.includes('tổng điểm') ||
              firstCells.includes('điểm trung bình');
            dataRowMeta.push({ rowIdx: absR, headers: sec.headers, zebra: idx % 2 === 1, isTotal });
          });

          aoa.push([]);
        }

        // Signature block at bottom of sheet
        const sigRowIdx = aoa.length;
        const sigColMid = Math.floor(maxCols / 2);
        const sigColRight = Math.max(sigColMid + 1, maxCols - 2);
        const sigHeaderRow = Array(maxCols).fill('');
        const sigNameRow = Array(maxCols).fill('');
        sigHeaderRow[1] = 'NGƯỜI LẬP BÁO CÁO';
        sigHeaderRow[sigColMid] = 'TRƯỞNG PHÒNG QLCL';
        sigHeaderRow[sigColRight] = 'BAN GIÁM ĐỐC PHÊ DUYỆT';
        sigNameRow[1] = 'Trần Thế Quảng (Chuyên viên QA)';
        sigNameRow[sigColMid] = 'Nguyễn Xuân Thao';
        sigNameRow[sigColRight] = '(Ký, đóng dấu & phê duyệt)';
        aoa.push(sigHeaderRow);
        aoa.push(sigNameRow);

        const ws = XLSXStyle.utils.aoa_to_sheet(aoa);
        ws['!merges'] = merges;

        const setCellStyle = (r: number, c: number, s: Record<string, unknown>) => {
          const addr = XLSXStyle.utils.encode_cell({ r, c });
          if (!ws[addr]) ws[addr] = { t: 's', v: '' };
          ws[addr].s = s;
        };

        for (let c = 0; c < maxCols; c++) {
          setCellStyle(0, c, {
            font: { name: 'Arial', bold: true, sz: 13, color: { rgb: 'FFFFFF' } },
            fill: HEADER_FILL,
            alignment: { horizontal: 'left', vertical: 'center' }
          });
          setCellStyle(1, c, {
            font: { name: 'Arial', italic: true, sz: 10, color: { rgb: '1E3A8A' } },
            fill: SUBHEADER_FILL,
            border: { bottom: { style: 'thin', color: { rgb: '93C5FD' } } },
            alignment: { horizontal: 'left', vertical: 'center' }
          });
          setCellStyle(2, c, {
            font: { name: 'Arial', bold: true, sz: 11.5, color: { rgb: '0F172A' } },
            alignment: { horizontal: 'left', vertical: 'center' }
          });
          setCellStyle(3, c, {
            font: { name: 'Arial', bold: true, sz: 9.5, color: { rgb: '334155' } },
            border: { bottom: { style: 'thin', color: { rgb: 'CBD5E1' } } },
            alignment: { horizontal: 'left', vertical: 'center' }
          });
        }

        for (const { rowIdx, colCount } of sectionRowMeta) {
          for (let c = 0; c < colCount; c++) {
            setCellStyle(rowIdx, c, {
              font: { name: 'Arial', bold: true, sz: 10.5, color: { rgb: '1E3A8A' } },
              fill: SECTION_FILL,
              border: {
                ...BORDER_SECTION,
                left: c === 0 ? BORDER_SECTION.left : { style: 'thin', color: { rgb: '93C5FD' } }
              },
              alignment: { horizontal: 'left', vertical: 'center' }
            });
          }
        }

        for (const { rowIdx, headers } of headerRowMeta) {
          for (let c = 0; c < headers.length; c++) {
            setCellStyle(rowIdx, c, {
              font: { name: 'Arial', bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
              fill: TH_FILL,
              border: BORDER_THIN,
              alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
            });
          }
        }

        const rowHeights: { hpt: number }[] = [
          { hpt: 28 },
          { hpt: 20 },
          { hpt: 24 },
          { hpt: 20 },
          { hpt: 10 }
        ];
        const setRowHeight = (r: number, hpt: number) => {
          while (rowHeights.length <= r) rowHeights.push({ hpt: 20 });
          rowHeights[r] = { hpt: Math.max(rowHeights[r]?.hpt || 0, hpt) };
        };
        sectionRowMeta.forEach(({ rowIdx }) => setRowHeight(rowIdx, 24));
        headerRowMeta.forEach(({ rowIdx }) => setRowHeight(rowIdx, 28));

        for (const { rowIdx, headers, zebra, isTotal } of dataRowMeta) {
          let maxLines = 1;
          for (let c = 0; c < headers.length; c++) {
            const addr = XLSXStyle.utils.encode_cell({ r: rowIdx, c });
            const cell = ws[addr];
            const rawVal = cell ? String(cell.v ?? '') : '';
            const colW = Math.max((colWidths[c] || 16) - 2, 10);
            const explicitLines = rawVal.split(/\r?\n/);
            const wrappedCount = explicitLines.reduce(
              (sum, part) => sum + Math.max(1, Math.ceil(part.length / colW)),
              0
            );
            if (wrappedCount > maxLines) maxLines = wrappedCount;

            const horizontal = getColAlign(headers[c] || '');
            const badge = !isTotal ? getBadgeStyle(rawVal) : null;

            setCellStyle(rowIdx, c, {
              font: {
                name: 'Arial',
                sz: 10,
                bold: isTotal || Boolean(badge?.bold) || c === 1,
                color: { rgb: badge ? badge.color : '0F172A' }
              },
              fill: isTotal ? TOTAL_FILL : badge ? badge.fill : zebra ? ZEBRA_FILL : undefined,
              border: isTotal ? BORDER_TOTAL : BORDER_THIN,
              alignment: {
                horizontal,
                vertical: 'center',
                wrapText: true
              }
            });
          }
          setRowHeight(rowIdx, Math.min(115, Math.max(22, maxLines * 14.5 + 6)));
        }

        setRowHeight(sigRowIdx, 24);
        setRowHeight(sigRowIdx + 1, 45);
        for (let c = 0; c < maxCols; c++) {
          setCellStyle(sigRowIdx, c, {
            font: { name: 'Arial', bold: true, sz: 10, color: { rgb: '0F172A' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          });
          setCellStyle(sigRowIdx + 1, c, {
            font: { name: 'Arial', italic: true, sz: 9.5, color: { rgb: '334155' } },
            alignment: { horizontal: 'center', vertical: 'bottom' }
          });
        }

        ws['!cols'] = colWidths.map(wch => ({ wch }));
        ws['!rows'] = rowHeights;
        ws['!views'] = [{ state: 'frozen', ySplit: 4 }];
        ws['!pageSetup'] = { paperSize: 9, orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 };
        return ws;
      };

      const exportTimestamp = new Date().toLocaleString('vi-VN');
      const commonList = resolvedDeptKpis.filter(k => k.type === 'Mục tiêu hoạt động chung');
      const proList = resolvedDeptKpis.filter(k => k.type === 'Mục tiêu hoạt động chuyên môn');

      // =======================================================================
      // SHEET 1: BÁO CÁO CHỈ TIÊU & KPI PHÒNG QLCL (35% CHUNG + 65% CHUYÊN MÔN)
      // =======================================================================
      const deptKpiHeaders = [
        'STT',
        'Mã KPI',
        'Nhóm danh mục',
        'Tên chỉ tiêu KPI Phòng QLCL',
        'Định nghĩa & Phương pháp đo lường',
        'Nguồn đo',
        'Trọng số (%)',
        'Chỉ tiêu (Target)',
        'Thực tế đạt (Trong App)',
        'Tỷ lệ hoàn thành',
        'Điểm KPI đạt',
        'Đánh giá',
        'Dẫn chứng dữ liệu thực tế truyền từ App / Ghi chú'
      ];

      const mapDeptKpiRows = (list: typeof resolvedDeptKpis) =>
        list.map((k, idx) => [
          idx + 1,
          k.id,
          k.category,
          k.indicator,
          k.definition,
          k.sourceType === 'manual' ? 'Nhập tay' : 'Tự động từ App',
          `${k.weight}%`,
          k.effectiveTarget,
          k.effectiveActual,
          k.isWaitingData ? 'Chờ dữ liệu' : `${k.attainmentPct}%`,
          k.isWaitingData ? 'Không tính mẫu' : `${k.achievedPoints} / ${k.weight}`,
          k.effectiveStatus,
          k.evidenceText || ''
        ]);

      const sheet1Sections = [
        {
          title: 'I. TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ KPI PHÒNG QUẢN LÝ CHẤT LƯỢNG TRONG KỲ',
          headers: deptKpiHeaders,
          rows: [
            [
              1,
              'KPI-DEPT-ALL',
              'Toàn Phòng QLCL',
              `ĐIỂM TỔNG KPI PHÒNG QUẢN LÝ CHẤT LƯỢNG (${periodInfo.label})`,
              'Tổng hợp từ Phần I: Mục tiêu hoạt động chung (35%) + Phần II: Mục tiêu hoạt động chuyên môn (65%)',
              'Tự động tổng hợp',
              '100%',
              '>= 90 điểm',
              `${deptSummary.normalizedScore} / 100 điểm`,
              `${deptSummary.normalizedScore}%`,
              `${deptSummary.normalizedScore} / 100`,
              deptSummary.rating,
              `Tính trên ${deptSummary.activeIndicatorsCount}/${deptSummary.totalCount} chỉ tiêu có dữ liệu trong kỳ (${deptSummary.passedCount} chỉ tiêu Đạt, ${deptSummary.waitingIndicatorsCount} chỉ tiêu Chờ dữ liệu)`
            ],
            [
              2,
              'KPI-DEPT-COM',
              'I. Mục tiêu chung',
              'Điểm quy đổi Khối I — Mục tiêu Hoạt động Chung (Tỷ trọng chuẩn 35%)',
              'Chi phí & COPQ (15%) • Kế hoạch chất lượng & Hồ sơ QMS /bm (10%) • Kỷ luật báo cáo ngày & 5S (10%)',
              'Tự động + Nhập tay',
              '35%',
              '35.0 điểm',
              `${deptSummary.commonAchieved} / ${deptSummary.commonMax} điểm`,
              `${Math.round((deptSummary.commonAchieved / (deptSummary.commonMax || 35)) * 100)}%`,
              `${deptSummary.commonAchieved} / ${deptSummary.commonMax}`,
              deptSummary.commonAchieved >= 28 ? 'Đạt' : 'Theo dõi',
              `Đạt ${deptSummary.commonPassedCount}/${deptSummary.commonTotalCount} chỉ tiêu thuộc Khối Mục tiêu hoạt động chung`
            ],
            [
              3,
              'KPI-DEPT-PRO',
              'II. Chuyên môn QLCL',
              'Điểm quy đổi Khối II — Mục tiêu Hoạt động Chuyên môn QLCL (Tỷ trọng chuẩn 65%)',
              'Chất lượng NCC & IQC (15%) • Kiểm soát PQC & OQC/KCS (25%) • Thị trường & Bảo hành (15%) • Thiết bị đo (10%)',
              'Tự động 100% từ App',
              '65%',
              '65.0 điểm',
              `${deptSummary.proAchieved} / ${deptSummary.proMax} điểm`,
              `${Math.round((deptSummary.proAchieved / (deptSummary.proMax || 65)) * 100)}%`,
              `${deptSummary.proAchieved} / ${deptSummary.proMax}`,
              deptSummary.proAchieved >= 52 ? 'Đạt' : 'Theo dõi',
              `Đạt ${deptSummary.proPassedCount}/${deptSummary.proTotalCount} chỉ tiêu thuộc Khối Mục tiêu chuyên môn QLCL`
            ],
            [
              4,
              'KPI-STAFF-AVG',
              '8 Nhân sự Phòng QLCL',
              'Điểm KPI Trung bình của 8 Nhân sự Phòng Quản lý Chất lượng (Theo Bản giao nhiệm vụ /bm)',
              'Trung bình cộng điểm KPI cá nhân (50đ Nghiệp vụ /bm + 30đ Báo cáo ngày + 20đ Trưởng phòng đánh giá)',
              'Tự động + TP chấm',
              '100đ',
              '>= 80 điểm',
              `${staffSummary.avgScore} / 100 điểm`,
              `${staffSummary.avgScore}%`,
              `${staffSummary.avgScore} / 100`,
              staffSummary.avgScore >= 90 ? 'Xuất sắc' : staffSummary.avgScore >= 80 ? 'Tốt' : 'Khá',
              `${staffSummary.goodOrAboveCount}/${staffSummary.totalStaff} nhân sự đạt loại Tốt trở lên • Nhân sự dẫn đầu kỳ: ${staffSummary.topPerformer}`
            ]
          ]
        },
        {
          title: 'II. PHẦN I — BẢNG CHỈ TIÊU MỤC TIÊU HOẠT ĐỘNG CHUNG (TỔNG TRỌNG SỐ CHUẨN: 35%)',
          headers: deptKpiHeaders,
          rows: [
            ...mapDeptKpiRows(commonList),
            [
              '',
              'TỔNG CỘNG PHẦN I',
              'Mục tiêu chung',
              'TỔNG ĐIỂM QUY ĐỔI PHẦN I — MỤC TIÊU HOẠT ĐỘNG CHUNG',
              '',
              '',
              `${deptSummary.commonMax}%`,
              '35.0 điểm',
              `${deptSummary.commonAchieved} điểm`,
              `${Math.round((deptSummary.commonAchieved / (deptSummary.commonMax || 35)) * 100)}%`,
              `${deptSummary.commonAchieved} / ${deptSummary.commonMax}`,
              deptSummary.commonAchieved >= 28 ? 'Đạt' : 'Theo dõi',
              `Đạt chuẩn ${deptSummary.commonPassedCount}/${deptSummary.commonTotalCount} chỉ tiêu`
            ]
          ]
        },
        {
          title: 'III. PHẦN II — BẢNG CHỈ TIÊU MỤC TIÊU HOẠT ĐỘNG CHUYÊN MÔN QLCL (TỔNG TRỌNG SỐ CHUẨN: 65%)',
          headers: deptKpiHeaders,
          rows: [
            ...mapDeptKpiRows(proList),
            [
              '',
              'TỔNG CỘNG PHẦN II',
              'Mục tiêu chuyên môn',
              'TỔNG ĐIỂM QUY ĐỔI PHẦN II — MỤC TIÊU HOẠT ĐỘNG CHUYÊN MÔN QLCL',
              '',
              '',
              `${deptSummary.proMax}%`,
              '65.0 điểm',
              `${deptSummary.proAchieved} điểm`,
              `${Math.round((deptSummary.proAchieved / (deptSummary.proMax || 65)) * 100)}%`,
              `${deptSummary.proAchieved} / ${deptSummary.proMax}`,
              deptSummary.proAchieved >= 52 ? 'Đạt' : 'Theo dõi',
              `Đạt chuẩn ${deptSummary.proPassedCount}/${deptSummary.proTotalCount} chỉ tiêu`
            ],
            [
              '',
              'TỔNG ĐIỂM KPI PHÒNG',
              'Toàn Phòng QLCL',
              `TỔNG ĐIỂM KPI PHÒNG QUẢN LÝ CHẤT LƯỢNG KỲ ${periodInfo.label.toUpperCase()} (PHẦN I + PHẦN II QUY ĐỔI THANG 100)`,
              '',
              '',
              '100%',
              '100 điểm',
              `${deptSummary.normalizedScore} / 100 điểm`,
              `${deptSummary.normalizedScore}%`,
              `${deptSummary.normalizedScore} / 100`,
              deptSummary.rating,
              `Xếp loại chung Phòng QLCL: ${deptSummary.rating.toUpperCase()}`
            ]
          ]
        }
      ];

      XLSXStyle.utils.book_append_sheet(
        wb,
        buildStyledSheet(
          'BÁO CÁO CHỈ TIÊU & KPI PHÒNG QUẢN LÝ CHẤT LƯỢNG',
          `Xuất lúc: ${exportTimestamp} | Điểm KPI Phòng QLCL: ${deptSummary.normalizedScore}/100 (${deptSummary.rating}) | Điểm TB 8 Nhân sự: ${staffSummary.avgScore}/100`,
          sheet1Sections,
          [6, 15, 22, 38, 44, 15, 13, 16, 20, 16, 16, 15, 52]
        ),
        '1_KPI_Phong_QLCL'
      );

      // =======================================================================
      // SHEET 2: BẢNG XẾP HẠNG & TỔNG HỢP KPI 8 NHÂN SỰ PHÒNG QLCL
      // =======================================================================
      const staffRankingHeaders = [
        'Hạng',
        'Họ và tên nhân sự',
        'Chức danh / Vị trí thực tế (Theo Bản giao nhiệm vụ /bm)',
        'Mã Văn bản /bm',
        'Mã Chức năng RACI',
        '1. Điểm Nghiệp vụ /bm (50đ)',
        '2. Điểm Báo cáo ngày (30đ)',
        'Hoàn thành việc (100%)',
        'Việc quá hạn',
        'Tỷ lệ QA/SQC',
        'Tỷ lệ IQC',
        'Tỷ lệ PQC',
        'Tỷ lệ OQC',
        'Tỷ lệ CS/BH',
        '3. Điểm Trưởng phòng (20đ)',
        'Chi tiết điểm TP (TN + CT)',
        'TỔNG KPI (/100đ)',
        'Xếp loại KPI',
        'Nhận xét & Đánh giá của Trưởng phòng QLCL'
      ];

      const staffRankingRows: (string | number)[][] = staffEvaluationsComputed.map((item, idx) => {
        const ds = item.dailyStats;
        return [
          idx + 1,
          item.profile.staffName,
          item.profile.roleTitle,
          item.profile.bmDocCode,
          item.profile.mtcvCode,
          `${item.roleScore50} / 50`,
          `${item.dailyScore30} / 30`,
          `${ds.completedTasks}/${ds.totalTasks} việc (${ds.taskCompletionRate}%)`,
          `${ds.overdueTasks} việc`,
          ds.sqcStat.total > 0 ? `${ds.sqcStat.rate}% (${ds.sqcStat.completed}/${ds.sqcStat.total})` : '-',
          ds.iqcStat.total > 0 ? `${ds.iqcStat.rate}% (${ds.iqcStat.completed}/${ds.iqcStat.total})` : '-',
          ds.pqcStat.total > 0 ? `${ds.pqcStat.rate}% (${ds.pqcStat.completed}/${ds.pqcStat.total})` : '-',
          ds.oqcStat.total > 0 ? `${ds.oqcStat.rate}% (${ds.oqcStat.completed}/${ds.oqcStat.total})` : '-',
          ds.csStat.total > 0 ? `${ds.csStat.rate}% (${ds.csStat.completed}/${ds.csStat.total})` : '-',
          `${item.managerScore20} / 20`,
          `TN: ${item.mgrResp}/10 + CT: ${item.mgrInit}/10`,
          `${item.totalScore100} / 100`,
          item.rating,
          item.managerComment || 'Đảm bảo tiến độ & chất lượng công việc theo Bản giao nhiệm vụ /bm'
        ];
      });

      const avgRole50 =
        staffEvaluationsComputed.length > 0
          ? Number(
              (
                staffEvaluationsComputed.reduce((s, x) => s + x.roleScore50, 0) /
                staffEvaluationsComputed.length
              ).toFixed(1)
            )
          : 0;
      const avgDaily30 =
        staffEvaluationsComputed.length > 0
          ? Number(
              (
                staffEvaluationsComputed.reduce((s, x) => s + x.dailyScore30, 0) /
                staffEvaluationsComputed.length
              ).toFixed(1)
            )
          : 0;
      const avgMgr20 =
        staffEvaluationsComputed.length > 0
          ? Number(
              (
                staffEvaluationsComputed.reduce((s, x) => s + x.managerScore20, 0) /
                staffEvaluationsComputed.length
              ).toFixed(1)
            )
          : 0;
      const totalStaffTasks = staffEvaluationsComputed.reduce((s, x) => s + x.dailyStats.totalTasks, 0);
      const totalStaffCompleted = staffEvaluationsComputed.reduce(
        (s, x) => s + x.dailyStats.completedTasks,
        0
      );
      const totalStaffOverdue = staffEvaluationsComputed.reduce(
        (s, x) => s + x.dailyStats.overdueTasks,
        0
      );

      staffRankingRows.push([
        '',
        'ĐIỂM TRUNG BÌNH 8 NHÂN SỰ',
        'Tổng hợp toàn bộ 8 nhân sự Phòng Quản lý Chất lượng (BG-NV-01 đến BG-NV-08)',
        'BG-NV-01..08',
        'Toàn Phòng QLCL',
        `${avgRole50} / 50`,
        `${avgDaily30} / 30`,
        `${totalStaffCompleted}/${totalStaffTasks} lượt việc`,
        `${totalStaffOverdue} việc`,
        '-',
        '-',
        '-',
        '-',
        '-',
        `${avgMgr20} / 20`,
        'TB toàn phòng',
        `${staffSummary.avgScore} / 100`,
        staffSummary.avgScore >= 90 ? 'Xuất sắc' : staffSummary.avgScore >= 80 ? 'Tốt' : 'Khá',
        `Dẫn đầu kỳ: ${staffSummary.topPerformer} (${staffSummary.goodOrAboveCount}/${staffSummary.totalStaff} nhân sự đạt Tốt trở lên)`
      ]);

      XLSXStyle.utils.book_append_sheet(
        wb,
        buildStyledSheet(
          'BẢNG XẾP HẠNG & ĐÁNH GIÁ TỔNG HỢP KPI 8 NHÂN SỰ PHÒNG QLCL',
          `Xuất lúc: ${exportTimestamp} | Tổng điểm 100 = 50đ Nghiệp vụ (/bm) + 30đ Báo cáo ngày + 20đ Trưởng phòng đánh giá | Điểm TB: ${staffSummary.avgScore}/100`,
          [
            {
              title: `I. BẢNG XẾP HẠNG TỔNG HỢP KPI 8 NHÂN SỰ PHÒNG QUẢN LÝ CHẤT LƯỢNG — KỲ ${periodInfo.label.toUpperCase()}`,
              headers: staffRankingHeaders,
              rows: staffRankingRows
            }
          ],
          [7, 22, 42, 14, 22, 16, 16, 20, 13, 14, 14, 14, 14, 14, 16, 20, 16, 15, 46]
        ),
        '2_Xep_Hang_8_Nhan_Su'
      );

      // =======================================================================
      // SHEET 3: CHI TIẾT PHIẾU ĐÁNH GIÁ KPI CÁ NHÂN CỦA CẢ 8 NHÂN SỰ (/bm)
      // =======================================================================
      const staffDetailHeaders = [
        'STT',
        'Họ tên Nhân sự',
        'Mã Văn bản /bm',
        'Nhóm đánh giá KPI cá nhân',
        'Tên chỉ tiêu / Hạng mục đánh giá chi tiết',
        'Căn cứ Văn bản /bm & Quy trình SOP',
        'Trọng số tối đa',
        'Chỉ tiêu (Target)',
        'Thực tế đạt (Trong App)',
        'Tỷ lệ hoàn thành',
        'Điểm KPI đạt',
        'Trạng thái',
        'Dẫn chứng bản ghi gốc từ App / Nhận xét của Trưởng phòng'
      ];

      const staffDetailSections = staffEvaluationsComputed.map((item, sIdx) => {
        const ds = item.dailyStats;
        const rows: (string | number)[][] = [];

        // 1. Role Metrics (50đ)
        item.allRoleMetrics.forEach((m: any, mIdx: number) => {
          rows.push([
            `I.${mIdx + 1}`,
            item.profile.staffName,
            item.profile.bmDocCode,
            'I. Nghiệp vụ chuyên môn /bm (50đ)',
            m.name,
            m.bmReference,
            `${m.weight} điểm`,
            m.targetText,
            m.actualText,
            m.isWaitingData ? 'Chờ dữ liệu' : `${m.scorePercent}%`,
            m.isWaitingData ? 'Chờ dữ liệu' : `${m.points} / ${m.weight}`,
            m.isWaitingData ? 'Chờ dữ liệu' : m.scorePercent >= 95 ? 'Đạt' : m.scorePercent >= 80 ? 'Theo dõi' : 'Cần cải tiến',
            m.evidence || ''
          ]);
        });

        rows.push([
          'I.TỔNG',
          item.profile.staffName,
          item.profile.bmDocCode,
          'Tổng Nhóm I (Quy đổi chuẩn 50đ)',
          `Cộng điểm Chỉ tiêu Nghiệp vụ chuyên môn theo Bản giao nhiệm vụ ${item.profile.bmDocCode}`,
          item.profile.mtcvCode,
          '50 điểm',
          '50.0 điểm',
          `${item.roleScore50} / 50 điểm`,
          `${Math.round((item.roleScore50 / 50) * 100)}%`,
          `${item.roleScore50} / 50`,
          item.roleScore50 >= 40 ? 'Đạt' : 'Theo dõi',
          `Tính trên ${item.activeRoleMetricsCount}/${item.allRoleMetrics.length} chỉ tiêu nghiệp vụ có phát sinh dữ liệu trong kỳ`
        ]);

        // 2. Daily Logs & Task Completion (30đ)
        rows.push([
          'II.1',
          item.profile.staffName,
          item.profile.bmDocCode,
          'II. Báo cáo ngày & Công việc (30đ)',
          'Kỷ luật thực hiện & hoàn thành công việc trong Nhật trình báo cáo chất lượng hàng ngày (statusPercent = 100%)',
          'Chế độ Báo cáo ngày P.QLCL (KSX-QLCL-01)',
          '30 điểm',
          '100% đúng hạn',
          `${ds.completedTasks}/${ds.totalTasks} việc (${ds.taskCompletionRate}%)`,
          `${ds.taskCompletionRate}%`,
          `${item.dailyScore30} / 30`,
          ds.totalTasks === 0 ? 'Chờ dữ liệu' : ds.taskCompletionRate >= 90 && ds.overdueTasks === 0 ? 'Đạt' : 'Theo dõi',
          `Tổng việc: ${ds.totalTasks} • Hoàn thành (100%): ${ds.completedTasks} • Quá hạn: ${ds.overdueTasks} • Số ngày có báo cáo: ${ds.distinctDays} ngày (QA/SQC: ${ds.sqcStat.rate}%, IQC: ${ds.iqcStat.rate}%, PQC: ${ds.pqcStat.rate}%, OQC: ${ds.oqcStat.rate}%, BH: ${ds.csStat.rate}%)`
        ]);

        // 3. Manager Evaluation (20đ)
        rows.push([
          'III.1',
          item.profile.staffName,
          item.profile.bmDocCode,
          'III. Trưởng phòng đánh giá (20đ)',
          '1. Tinh thần trách nhiệm, kỷ luật báo cáo & thái độ phối hợp liên phòng ban',
          'Trưởng phòng QLCL (Nguyễn Xuân Thao) chấm điểm',
          '10 điểm',
          '>= 8.5 / 10',
          `${item.mgrResp} / 10 điểm`,
          `${Math.round(item.mgrResp * 10)}%`,
          `${item.mgrResp} / 10`,
          item.mgrResp >= 8 ? 'Đạt' : 'Theo dõi',
          item.managerComment || 'Tuân thủ kỷ luật và phối hợp tốt trong công việc'
        ]);
        rows.push([
          'III.2',
          item.profile.staffName,
          item.profile.bmDocCode,
          'III. Trưởng phòng đánh giá (20đ)',
          '2. Năng lực giải quyết vấn đề, sáng kiến cải tiến chất lượng & duy trì 5S',
          'Trưởng phòng QLCL (Nguyễn Xuân Thao) chấm điểm',
          '10 điểm',
          '>= 8.5 / 10',
          `${item.mgrInit} / 10 điểm`,
          `${Math.round(item.mgrInit * 10)}%`,
          `${item.mgrInit} / 10`,
          item.mgrInit >= 8 ? 'Đạt' : 'Theo dõi',
          item.managerComment || 'Thực hiện tốt nhiệm vụ chuyên môn và duy trì 5S'
        ]);

        // Total row for this staff member
        rows.push([
          'TỔNG KPI',
          item.profile.staffName,
          item.profile.bmDocCode,
          'TỔNG CỘNG ĐIỂM KPI CÁ NHÂN (I + II + III)',
          `TỔNG ĐIỂM KPI CÁ NHÂN: ${item.profile.staffName.toUpperCase()} (${item.profile.roleTitle})`,
          `${item.profile.bmDocCode} / ${item.profile.mtcvCode}`,
          '100 điểm',
          '>= 80 điểm',
          `${item.totalScore100} / 100 điểm`,
          `${item.totalScore100}%`,
          `${item.totalScore100} / 100`,
          item.rating,
          `Nghiệp vụ /bm: ${item.roleScore50}/50đ + Báo cáo ngày: ${item.dailyScore30}/30đ + Trưởng phòng chấm: ${item.managerScore20}/20đ => Xếp loại: ${item.rating.toUpperCase()}`
        ]);

        return {
          title: `PHIẾU KPI #${sIdx + 1}: ${item.profile.staffName.toUpperCase()} — ${item.profile.roleTitle.toUpperCase()} [${item.profile.bmDocCode} | TỔNG ĐIỂM: ${item.totalScore100}/100 (${item.rating.toUpperCase()})]`,
          headers: staffDetailHeaders,
          rows
        };
      });

      XLSXStyle.utils.book_append_sheet(
        wb,
        buildStyledSheet(
          'CHI TIẾT PHIẾU ĐÁNH GIÁ KPI CÁ NHÂN 8 NHÂN SỰ PHÒNG QLCL (THEO /bm)',
          `Xuất lúc: ${exportTimestamp} | Đầy đủ 8 Phiếu đánh giá KPI cá nhân (Nguyễn Xuân Thao, Trần Thế Quảng, Nguyễn Văn Diệm, Hoàng Văn Phấn, Hà Khắc Việt, Lành Xuân Hải, Liễu Tùng Lâm, Đoàn Anh Hùng)`,
          staffDetailSections,
          [9, 20, 13, 28, 42, 34, 14, 15, 22, 15, 15, 14, 54]
        ),
        '3_Chi_Tiet_KPI_8_Nhan_Su'
      );

      // =======================================================================
      // SHEET 4: BẢNG ĐỐI SOÁT DỮ LIỆU GỐC TRUYỀN TỪ 10 PHÂN HỆ SANG KPI
      // =======================================================================
      const moduleOverviewRows: (string | number)[][] = moduleTransferCards.map((card, idx) => [
        idx + 1,
        card.name,
        card.metric.targetTabLabel,
        card.countText,
        card.metric.actualText,
        card.hasData ? 'Đạt' : 'Chờ dữ liệu',
        card.metric.evidenceText
      ]);

      const sourceRecordRows: (string | number)[][] = [];
      moduleTransferCards.forEach(card => {
        card.metric.sourceRecords.slice(0, 15).forEach(r => {
          sourceRecordRows.push([
            sourceRecordRows.length + 1,
            card.name,
            r.id,
            r.date,
            r.title,
            r.actor,
            r.resultText
          ]);
        });
      });

      XLSXStyle.utils.book_append_sheet(
        wb,
        buildStyledSheet(
          'BẢNG ĐỐI SOÁT NGUỒN DỮ LIỆU TỰ ĐỘNG TỪ 10 PHÂN HỆ NGHIỆP VỤ',
          `Xuất lúc: ${exportTimestamp} | Minh chứng dữ liệu gốc cấu thành các chỉ số KPI tự động trong kỳ ${periodInfo.label}`,
          [
            {
              title: `I. TỔNG HỢP TRẠNG THÁI TRUYỀN DỮ LIỆU TỰ ĐỘNG TỪ 10 PHÂN HỆ TRONG KỲ ${periodInfo.label.toUpperCase()}`,
              headers: [
                'STT',
                'Phân hệ nguồn dữ liệu',
                'Tên phân hệ trên App',
                'Số lượng bản ghi kỳ',
                'Chỉ số KPI tính tự động',
                'Trạng thái dữ liệu',
                'Chi tiết dẫn chứng tổng hợp từ phân hệ'
              ],
              rows: moduleOverviewRows
            },
            {
              title: 'II. TRÍCH LỤC CÁC BẢN GHI GỐC TIÊU BIỂU CẤU THÀNH CHỈ SỐ KPI TRONG KỲ',
              headers: [
                'STT',
                'Phân hệ nguồn',
                'Mã bản ghi / Số hiệu',
                'Ngày ghi nhận',
                'Nội dung chi tiết bản ghi gốc',
                'Người thực hiện / Phụ trách',
                'Kết quả / Trạng thái'
              ],
              rows:
                sourceRecordRows.length > 0
                  ? sourceRecordRows
                  : [['1', 'Toàn hệ thống', '--', periodInfo.label, 'Chưa phát sinh bản ghi trong kỳ này', '--', 'Chờ dữ liệu']]
            }
          ],
          [7, 24, 28, 20, 52, 24, 48]
        ),
        '4_Doi_Soat_10_Phan_He'
      );

      XLSXStyle.writeFile(wb, `DK_QMS_Bao_Cao_KPI_Phong_QLCL_${periodInfo.key}.xlsx`);
      setShowExportMenu(false);
    } catch (err) {
      console.error('Lỗi xuất file Excel KPI:', err);
      setShowExportMenu(false);
    }
  };

  const handlePrintKpiReport = () => {
    setShowExportMenu(false);
    window.print();
  };

  const filteredDeptKpis = useMemo(() => {
    return resolvedDeptKpis.filter(k => {
      if (typeFilter !== 'ALL' && k.type !== typeFilter) return false;
      if (sourceFilter === 'auto' && k.sourceType === 'manual') return false;
      if (sourceFilter === 'manual' && k.sourceType !== 'manual') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          k.id.toLowerCase().includes(q) ||
          k.indicator.toLowerCase().includes(q) ||
          k.category.toLowerCase().includes(q) ||
          (k.evidenceText || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [resolvedDeptKpis, typeFilter, sourceFilter, searchQuery]);

  const commonKpisFiltered = filteredDeptKpis.filter(k => k.type === 'Mục tiêu hoạt động chung');
  const proKpisFiltered = filteredDeptKpis.filter(k => k.type === 'Mục tiêu hoạt động chuyên môn');

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-300" id="view_kpi_dashboard_panel">
      {/* =========================================================================
          HEADER & DYNAMIC PERIOD FILTER BAR (BRANDED DK VIỆT NHẬT - DKBIKE)
      ========================================================================= */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-[11px] font-black uppercase tracking-wider">
                DKBike • Xe cho cả gia đình
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-bold">
                Công ty TNHH Xe điện DK Việt Nhật
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                Phòng Quản lý chất lượng (QLCL / DK QMS)
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600 shrink-0" />
              HỆ THỐNG ĐÁNH GIÁ CHỈ TIÊU & KPI PHÒNG QUẢN LÝ CHẤT LƯỢNG
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động truyền số liệu thời gian thực từ 10 phân hệ nghiệp vụ • Bấm vào bất kỳ chỉ số tự động nào để đối soát danh sách bản ghi gốc • Chuẩn hóa theo 8 Bản giao nhiệm vụ trong{' '}
              <code className="font-bold text-indigo-600">/bm</code>
            </p>
          </div>

          {/* Dynamic Period Selector */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div className="flex items-center bg-white rounded-lg border border-slate-300 p-0.5">
              <button
                type="button"
                onClick={() => setPeriodMode('month')}
                className={`px-3 py-1.5 rounded-md text-xs font-extrabold transition cursor-pointer ${
                  periodMode === 'month' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-indigo-600'
                }`}
              >
                Theo Tháng
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('quarter')}
                className={`px-3 py-1.5 rounded-md text-xs font-extrabold transition cursor-pointer ${
                  periodMode === 'quarter' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-indigo-600'
                }`}
              >
                Theo Quý
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('year')}
                className={`px-3 py-1.5 rounded-md text-xs font-extrabold transition cursor-pointer ${
                  periodMode === 'year' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-indigo-600'
                }`}
              >
                Theo Năm
              </button>
            </div>

            {periodMode === 'month' && (
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>
                    Tháng {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
            )}

            {periodMode === 'quarter' && (
              <select
                value={selectedQuarter}
                onChange={e => setSelectedQuarter(Number(e.target.value))}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>Quý 1 (T01 - T03)</option>
                <option value={2}>Quý 2 (T04 - T06)</option>
                <option value={3}>Quý 3 (T07 - T09)</option>
                <option value={4}>Quý 4 (T10 - T12)</option>
              </select>
            )}

            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(prev => !prev)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Xuất KPI
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border-2 border-slate-200 py-1.5 z-30">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Xuất Excel (.xlsx 4 Sheet)
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintKpiReport}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-indigo-600" />
                    In / Xuất PDF Báo cáo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================================
            4 TOP SUMMARY CARDS (MATCHING REPORTS HUB CARD STYLE)
        ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
          <div className="rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                ĐIỂM KPI PHÒNG QLCL ({periodInfo.label})
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  deptSummary.rating === 'Chờ dữ liệu'
                    ? 'bg-slate-200 text-slate-700'
                    : deptSummary.normalizedScore >= 90
                    ? 'bg-emerald-100 text-emerald-800'
                    : deptSummary.normalizedScore >= 80
                    ? 'bg-indigo-100 text-indigo-800'
                    : deptSummary.normalizedScore >= 70
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {deptSummary.rating}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tight text-indigo-700">
                {deptSummary.normalizedScore}
              </span>
              <span className="text-xs font-bold text-slate-400">/ 100 điểm</span>
            </div>
            <div className="mt-2">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, deptSummary.normalizedScore)}%` }}
                />
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-1.5">
                Tính trên <strong className="text-slate-800">{deptSummary.activeIndicatorsCount}/{deptSummary.totalCount} chỉ tiêu</strong> có dữ liệu ({deptSummary.waitingIndicatorsCount} chờ dữ liệu)
              </p>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                I. MỤC TIÊU HOẠT ĐỘNG CHUNG (35%)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800">
                {deptSummary.commonPassedCount}/{deptSummary.commonTotalCount} chỉ tiêu Đạt
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tight text-sky-700">
                {deptSummary.commonAchieved}
              </span>
              <span className="text-xs font-bold text-slate-400">/ {deptSummary.commonMax} điểm</span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-2">
              Chi phí & COPQ (15%) • Hệ thống & KH (10%) • Nhân sự & 5S (10%)
            </p>
          </div>

          <div className="rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                II. MỤC TIÊU CHUYÊN MÔN QLCL (65%)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                {deptSummary.proPassedCount}/{deptSummary.proTotalCount} chỉ tiêu Đạt
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tight text-emerald-700">
                {deptSummary.proAchieved}
              </span>
              <span className="text-xs font-bold text-slate-400">/ {deptSummary.proMax} điểm</span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-2">
              NCC & IQC (15%) • PQC & OQC (25%) • Bảo hành (15%) • Thiết bị (10%)
            </p>
          </div>

          <div className="rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                HIỆU NĂNG 8 NHÂN SỰ QLCL (/bm)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                {staffSummary.goodOrAboveCount}/{staffSummary.totalStaff} đạt Tốt trở lên
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tight text-amber-600">
                {staffSummary.avgScore}
              </span>
              <span className="text-xs font-bold text-slate-400">/ 100 điểm TB</span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-2">
              Dẫn đầu kỳ: <strong className="text-slate-800">{staffSummary.topPerformer}</strong>
            </p>
          </div>
        </div>

        {/* =====================================================================
            10-MODULE LIVE DATA TRANSFER STRIP (BẢNG ĐỐI SOÁT NGUỒN DỮ LIỆU TỰ ĐỘNG)
        ===================================================================== */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              ĐỐI SOÁT DỮ LIỆU TỰ ĐỘNG TRUYỀN VỀ TỪ 10 PHÂN HỆ TRONG KỲ {periodInfo.label.toUpperCase()} (BẤM ĐỂ XEM BẢN GHI GỐC):
            </div>
            <span className="text-[11px] font-bold text-slate-500">
              {moduleTransferCards.filter(m => m.hasData).length}/10 phân hệ có phát sinh bản ghi
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-2">
            {moduleTransferCards.map(card => (
              <button
                key={card.id}
                type="button"
                onClick={() =>
                  setDrilldownModal({
                    title: `Đối soát dữ liệu nguồn: ${card.name}`,
                    subtitle: card.metric.evidenceText,
                    targetTab: card.metric.targetTab,
                    targetTabLabel: card.metric.targetTabLabel,
                    summaryBadge: card.countText,
                    rows: card.metric.sourceRecords
                  })
                }
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  card.hasData
                    ? 'bg-slate-50/90 hover:bg-indigo-50/80 border-slate-300 hover:border-indigo-400'
                    : 'bg-slate-50/40 border-dashed border-slate-200 opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-extrabold text-slate-700 truncate">{card.name}</span>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      card.hasData ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                </div>
                <div className="font-mono font-black text-xs text-slate-900 mt-1 truncate">
                  {card.countText}
                </div>
                <div className="text-[10px] font-semibold text-indigo-700 truncate mt-0.5">
                  {card.subText}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* =====================================================================
            2 MAIN SUB-TABS SWITCHER
        ===================================================================== */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('dept_kpi')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'dept_kpi'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            1. KPI Phòng QLCL (35% Chung + 65% Chuyên môn)
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeSubTab === 'dept_kpi' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {resolvedDeptKpis.length} chỉ tiêu
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('staff_kpi')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'staff_kpi'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            2. KPI Nhân sự (8 Nhân sự QLCL theo Bản giao nhiệm vụ /bm)
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeSubTab === 'staff_kpi' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {staffEvaluationsComputed.length} nhân sự
            </span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: KPI PHÒNG QLCL (35% HOẠT ĐỘNG CHUNG + 65% CHUYÊN MÔN)
      ========================================================================= */}
      {activeSubTab === 'dept_kpi' && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTypeFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  typeFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({resolvedDeptKpis.length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('Mục tiêu hoạt động chung')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  typeFilter === 'Mục tiêu hoạt động chung'
                    ? 'bg-sky-600 text-white'
                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                }`}
              >
                I. Mục tiêu chung (35%)
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('Mục tiêu hoạt động chuyên môn')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  typeFilter === 'Mục tiêu hoạt động chuyên môn'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                II. Mục tiêu chuyên môn (65%)
              </button>

              <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block" />

              <button
                type="button"
                onClick={() => setSourceFilter(sourceFilter === 'auto' ? 'ALL' : 'auto')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  sourceFilter === 'auto'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Tự động từ App
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter(sourceFilter === 'manual' ? 'ALL' : 'manual')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  sourceFilter === 'manual'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                Nhập tay
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm mã hoặc tên chỉ tiêu KPI..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAddKpiModal(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm chỉ tiêu
              </button>

              <button
                type="button"
                onClick={handleRestoreDefault16Kpis}
                title="Khôi phục bộ 16 chỉ tiêu chuẩn Phòng QLCL"
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Chuẩn hóa 16 KPI
              </button>
            </div>
          </div>

          {/* Helper renderer for Department KPI Tables */}
          {[
            {
              key: 'common',
              title: 'PHẦN I: MỤC TIÊU HOẠT ĐỘNG CHUNG (TỔNG TRỌNG SỐ CHUẨN: 35%)',
              subtitle:
                'Kiểm soát Chi phí chất lượng COPQ & Ngân sách (15%) • Kế hoạch chất lượng & Hồ sơ QMS /bm (10%) • Kỷ luật báo cáo ngày & 5S (10%)',
              headerBg: 'bg-sky-50/70',
              dotColor: 'bg-sky-600',
              badgeBorder: 'border-sky-200 text-sky-800',
              achieved: deptSummary.commonAchieved,
              max: deptSummary.commonMax,
              list: commonKpisFiltered
            },
            {
              key: 'pro',
              title: 'PHẦN II: MỤC TIÊU HOẠT ĐỘNG CHUYÊN MÔN QLCL (TỔNG TRỌNG SỐ CHUẨN: 65%)',
              subtitle:
                'Chất lượng NCC & IQC (15%) • Kiểm soát lắp ráp PQC & Nghiệm thu OQC/KCS (25%) • Thị trường & Bảo hành (15%) • Thiết bị đo lường (10%)',
              headerBg: 'bg-emerald-50/70',
              dotColor: 'bg-emerald-600',
              badgeBorder: 'border-emerald-200 text-emerald-800',
              achieved: deptSummary.proAchieved,
              max: deptSummary.proMax,
              list: proKpisFiltered
            }
          ].map(
            sec =>
              sec.list.length > 0 && (
                <div
                  key={sec.key}
                  className="bg-white border-2 border-slate-300 rounded-2xl shadow-sm overflow-hidden"
                >
                  <div
                    className={`${sec.headerBg} border-b-2 border-slate-300 px-5 py-4 flex flex-wrap items-center justify-between gap-2`}
                  >
                    <div>
                      <h3 className="text-base font-black uppercase text-slate-950 flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${sec.dotColor}`} />
                        {sec.title}
                      </h3>
                      <p className="text-xs md:text-[13px] font-semibold text-slate-700 mt-1">{sec.subtitle}</p>
                    </div>
                    <div
                      className={`px-3.5 py-1.5 rounded-xl bg-white border-2 ${sec.badgeBorder} text-xs md:text-sm font-black shadow-xs`}
                    >
                      Điểm quy đổi nhóm: {sec.achieved} / {sec.max} điểm
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[980px]">
                      <thead>
                        <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-800 font-black text-xs uppercase tracking-wider">
                          <th className="py-3.5 px-4 w-32">Mã / Nhóm</th>
                          <th className="py-3.5 px-4">
                            Chỉ tiêu KPI & Phương pháp đánh giá ({periodInfo.label})
                          </th>
                          <th className="py-3.5 px-3 text-center w-28">Nguồn đo</th>
                          <th className="py-3.5 px-3 text-center w-24">Trọng số</th>
                          <th className="py-3.5 px-3 text-center w-32">Chỉ tiêu</th>
                          <th className="py-3.5 px-3 text-center w-40">Thực tế đạt</th>
                          <th className="py-3.5 px-3 text-center w-28">Điểm KPI</th>
                          <th className="py-3.5 px-3 text-center w-32">Đánh giá</th>
                          <th className="py-3.5 px-4 text-right w-28">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                        {sec.list.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/90 transition">
                            <td className="py-4 px-4 align-top">
                              <div className="font-mono font-black text-indigo-800 text-sm">{item.id}</div>
                              <div className="text-xs font-bold text-slate-700 mt-1">
                                {item.category}
                              </div>
                            </td>
                            <td className="py-4 px-4 align-top">
                              <div className="font-black text-slate-950 text-sm md:text-[15px] leading-snug">
                                {item.indicator}
                              </div>
                              <div className="text-xs md:text-[13px] text-slate-700 font-medium mt-1 leading-relaxed">
                                {item.definition}
                              </div>
                            </td>
                            <td className="py-4 px-3 text-center align-top">
                              {item.sourceType === 'manual' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                                  <Pencil className="w-3.5 h-3.5" /> Nhập tay
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-900 border border-indigo-300">
                                  <Zap className="w-3.5 h-3.5" /> Tự động
                                </span>
                              )}
                              {item.isOverridden && (
                                <div className="text-[11px] font-extrabold text-amber-700 mt-1">
                                  Đã ghi đè kỳ này
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-3 text-center align-top font-mono font-black text-sm text-slate-950">
                              {item.weight}%
                            </td>
                            <td className="py-4 px-3 text-center align-top font-mono font-extrabold text-sm text-slate-800">
                              {item.effectiveTarget}
                            </td>
                            <td className="py-4 px-3 text-center align-top">
                              <button
                                type="button"
                                onClick={() => openEditDeptKpiModal(item)}
                                title="Bấm để cập nhật số liệu thực tế hoặc ghi chú kỳ này"
                                className={`px-3 py-1.5 rounded-lg border-2 font-mono font-black text-sm transition cursor-pointer ${
                                  item.isWaitingData
                                    ? 'bg-slate-50 border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-800'
                                    : 'bg-slate-100 hover:bg-indigo-50 border-slate-300 hover:border-indigo-500 text-slate-950 shadow-2xs'
                                }`}
                              >
                                {item.effectiveActual}
                              </button>
                            </td>
                            <td className="py-4 px-3 text-center align-top">
                              {item.isWaitingData ? (
                                <span className="text-xs font-extrabold text-slate-500 italic">
                                  Không tính mẫu
                                </span>
                              ) : (
                                <>
                                  <div className="font-mono font-black text-sm text-indigo-800">
                                    {item.achievedPoints} / {item.weight}
                                  </div>
                                  <div className="w-20 mx-auto h-2 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                                    <div
                                      className={`h-full rounded-full ${
                                        item.attainmentPct >= 95
                                          ? 'bg-emerald-600'
                                          : item.attainmentPct >= 80
                                          ? 'bg-amber-500'
                                          : 'bg-rose-600'
                                      }`}
                                      style={{ width: `${item.attainmentPct}%` }}
                                    />
                                  </div>
                                </>
                              )}
                            </td>
                            <td className="py-4 px-3 text-center align-top">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase border ${
                                  item.effectiveStatus === 'Đạt'
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : item.effectiveStatus === 'Theo dõi'
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : item.effectiveStatus === 'Đang cải tiến'
                                    ? 'bg-sky-100 text-sky-900 border-sky-300'
                                    : item.effectiveStatus === 'Chờ dữ liệu'
                                    ? 'bg-slate-200 text-slate-700 border-slate-300'
                                    : 'bg-rose-100 text-rose-900 border-rose-300'
                                }`}
                              >
                                {item.effectiveStatus}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right align-top">
                              <div className="flex items-center justify-end gap-1.5">
                                {item.autoMetric && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDrilldownModal({
                                        title: `${item.id}: ${item.indicator}`,
                                        subtitle: item.evidenceText,
                                        targetTab: item.autoMetric!.targetTab,
                                        targetTabLabel: item.autoMetric!.targetTabLabel,
                                        summaryBadge: item.effectiveActual,
                                        rows: item.autoMetric!.sourceRecords
                                      })
                                    }
                                    className="p-2 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border border-indigo-300 transition cursor-pointer"
                                    title="Đối soát danh sách bản ghi gốc"
                                  >
                                    <Layers className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEditDeptKpiModal(item)}
                                  className="p-2 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-800 hover:text-indigo-800 border border-slate-300 transition cursor-pointer"
                                  title="Chỉnh sửa chỉ tiêu / Nhập kết quả kỳ"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                {!item.id.startsWith('KPI-COM-0') && !item.id.startsWith('KPI-PRO-0') && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDeptKpi(item.id)}
                                    className="p-2 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 transition cursor-pointer"
                                    title="Xóa chỉ tiêu tùy chỉnh"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: KPI NHÂN SỰ (GỘP BẢNG XẾP HẠNG + PHIẾU KPI CÁ NHÂN BÁM SÁT /bm)
      ========================================================================= */}
      {activeSubTab === 'staff_kpi' && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-200 pb-3.5 mb-4">
              <div>
                <h3 className="text-sm md:text-base font-black uppercase text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  BẢNG XẾP HẠNG & ĐÁNH GIÁ TỔNG HỢP KPI 8 NHÂN SỰ PHÒNG QLCL — KỲ {periodInfo.label.toUpperCase()}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tổng điểm 100 = <strong>50đ Chỉ tiêu Nghiệp vụ theo Bản giao nhiệm vụ (<code className="text-indigo-600">/bm</code>)</strong> + <strong>30đ Kỷ luật Báo cáo ngày & Công việc (<code className="text-sky-700">statusPercent = 100%</code>)</strong> + <strong>20đ Trưởng phòng Đánh giá</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Chuẩn hóa theo 8 Bản giao nhiệm vụ BG-NV-01..08 (/bm)</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[1060px]">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-800 font-black text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-3 text-center w-14">Hạng</th>
                    <th className="py-3.5 px-3">Nhân sự & Chức danh thực tế (/bm)</th>
                    <th className="py-3.5 px-3 text-center">Mã Văn bản /bm</th>
                    <th className="py-3.5 px-3 text-center bg-indigo-50/60 text-indigo-950">
                      1. Nghiệp vụ /bm (50đ)
                    </th>
                    <th className="py-3.5 px-3 text-center bg-sky-50/60 text-sky-950">
                      2. Báo cáo ngày (30đ)
                    </th>
                    <th className="py-3.5 px-3 text-center">Hiệu năng Khâu (SQC/IQC/PQC/OQC/BH)</th>
                    <th className="py-3.5 px-3 text-center bg-amber-50/60 text-amber-950">
                      3. Trưởng phòng (20đ)
                    </th>
                    <th className="py-3.5 px-3 text-center font-black text-slate-950">Tổng KPI (/100)</th>
                    <th className="py-3.5 px-3 text-center">Xếp loại</th>
                    <th className="py-3.5 px-3 text-right">Phiếu KPI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                  {staffEvaluationsComputed.map((item, idx) => {
                    const isSelected = selectedStaffComputed?.staffKey === item.staffKey;
                    const ds = item.dailyStats;
                    return (
                      <tr
                        key={item.staffKey}
                        onClick={() => setSelectedStaffKey(item.staffKey)}
                        className={`transition cursor-pointer ${
                          isSelected ? 'bg-indigo-50/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                              idx === 0
                                ? 'bg-amber-400 text-slate-950'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-950'
                                : idx === 2
                                ? 'bg-amber-700/20 text-amber-950'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-black text-slate-950 text-sm md:text-[15px] flex items-center gap-1.5">
                            {item.profile.staffName}
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-black uppercase">
                                Đang mở phiếu
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-700 font-medium mt-0.5">{item.profile.roleTitle}</div>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 font-mono text-xs font-black text-slate-900">
                            {item.profile.bmDocCode}
                          </span>
                          <div className="text-[11px] font-semibold text-slate-600 mt-0.5">{item.profile.mtcvCode}</div>
                        </td>
                        <td className="py-3.5 px-3 text-center bg-indigo-50/30">
                          <div className="font-mono font-black text-sm text-indigo-800">{item.roleScore50} / 50</div>
                          <div className="text-[11px] font-semibold text-slate-600">
                            {item.activeRoleMetricsCount}/{item.allRoleMetrics.length} chỉ tiêu có dữ liệu
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center bg-sky-50/30">
                          <div className="font-mono font-black text-sm text-sky-800">{item.dailyScore30} / 30</div>
                          <div className="text-[11px] font-semibold text-slate-600">
                            {ds.totalTasks > 0
                              ? `${ds.completedTasks}/${ds.totalTasks} việc (${ds.taskCompletionRate}%)`
                              : '0 việc kỳ này'}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {ds.sqcStat.total > 0 && (
                              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 text-[11px] font-extrabold">
                                QA/SQC: {ds.sqcStat.rate}% ({ds.sqcStat.completed}/{ds.sqcStat.total})
                              </span>
                            )}
                            {ds.iqcStat.total > 0 && (
                              <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-900 text-[11px] font-extrabold">
                                IQC: {ds.iqcStat.rate}% ({ds.iqcStat.completed}/{ds.iqcStat.total})
                              </span>
                            )}
                            {ds.pqcStat.total > 0 && (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-extrabold">
                                PQC: {ds.pqcStat.rate}% ({ds.pqcStat.completed}/{ds.pqcStat.total})
                              </span>
                            )}
                            {ds.oqcStat.total > 0 && (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[11px] font-extrabold">
                                OQC: {ds.oqcStat.rate}% ({ds.oqcStat.completed}/{ds.oqcStat.total})
                              </span>
                            )}
                            {ds.csStat.total > 0 && (
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 text-[11px] font-extrabold">
                                BH: {ds.csStat.rate}% ({ds.csStat.completed}/{ds.csStat.total})
                              </span>
                            )}
                            {ds.totalTasks === 0 && (
                              <span className="text-xs font-semibold text-slate-500 italic">Chưa có báo cáo ngày</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center bg-amber-50/30">
                          <div className="font-mono font-black text-sm text-amber-800">{item.managerScore20} / 20</div>
                          <div className="text-[11px] font-semibold text-slate-600">
                            {item.hasManagerSaved ? 'Đã chấm kỳ này' : 'Mặc định (18đ)'}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center bg-slate-100/80 font-mono font-black text-base text-indigo-900">
                          {item.totalScore100}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase border ${
                              item.rating === 'Xuất sắc'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : item.rating === 'Tốt'
                                ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                : item.rating === 'Khá'
                                ? 'bg-sky-100 text-sky-900 border-sky-300'
                                : item.rating === 'Trung bình'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : item.rating === 'Chờ dữ liệu'
                                ? 'bg-slate-200 text-slate-700 border-slate-300'
                                : 'bg-rose-100 text-rose-900 border-rose-300'
                            }`}
                          >
                            {item.rating}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedStaffKey(item.staffKey);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-indigo-100 text-slate-800 hover:text-indigo-800 border border-slate-300'
                            }`}
                          >
                            Chấm / Xem Phiếu
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Individual Staff KPI Evaluation Sheet */}
          {selectedStaffComputed && (
            <div className="bg-white border-2 border-indigo-300 rounded-2xl p-5 shadow-sm space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-xs font-black uppercase">
                      PHIẾU ĐÁNH GIÁ KPI CÁ NHÂN • KỲ {periodInfo.label.toUpperCase()}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 font-mono text-xs font-black text-slate-900">
                      Văn bản /bm: {selectedStaffComputed.profile.bmDocCode}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 font-mono text-xs font-extrabold text-emerald-900">
                      Mã chức năng: {selectedStaffComputed.profile.mtcvCode}
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-slate-950">
                    {selectedStaffComputed.profile.staffName} —{' '}
                    <span className="text-indigo-700">{selectedStaffComputed.profile.roleTitle}</span>
                  </h3>
                  <p className="text-xs md:text-[13px] font-medium text-slate-700 mt-1 leading-relaxed">
                    {selectedStaffComputed.profile.summary}
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-indigo-50/80 px-4 py-3 rounded-2xl border-2 border-indigo-200 shrink-0">
                  <div>
                    <div className="text-xs font-black uppercase text-indigo-700">
                      TỔNG ĐIỂM KPI CÁ NHÂN
                    </div>
                    <div className="text-2xl font-black text-indigo-950 font-mono">
                      {selectedStaffComputed.totalScore100} <span className="text-xs font-bold">/ 100 điểm</span>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase ${
                      selectedStaffComputed.rating === 'Xuất sắc'
                        ? 'bg-emerald-600 text-white'
                        : selectedStaffComputed.rating === 'Tốt'
                        ? 'bg-indigo-600 text-white'
                        : selectedStaffComputed.rating === 'Khá'
                        ? 'bg-sky-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {selectedStaffComputed.rating}
                  </span>
                </div>
              </div>

              {/* Group 1: 50% Operational Metrics from /bm */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-sm md:text-base font-black uppercase text-slate-950 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      I. CHỈ TIÊU NGHIỆP VỤ CHUYÊN MÔN THEO BẢN GIAO NHIỆM VỤ /bm (TRỌNG SỐ: 50 ĐIỂM)
                    </h4>
                    <p className="text-xs font-medium text-slate-700 mt-0.5">
                      Tự động lấy số liệu từ các phân hệ chuyên môn trong App theo tên người thực hiện & vai trò RACI.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-lg bg-indigo-50 border-2 border-indigo-200 font-mono text-xs md:text-sm font-black text-indigo-900">
                      Đạt: {selectedStaffComputed.roleScore50} / 50 điểm
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddStaffMetricModal(true)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm chỉ tiêu riêng
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border-2 border-slate-300 rounded-xl">
                  <table className="w-full text-left text-sm min-w-[880px]">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-800 font-black text-xs uppercase">
                        <th className="py-3 px-4">Chỉ tiêu Nghiệp vụ & Căn cứ (/bm)</th>
                        <th className="py-3 px-3 text-center w-24">Trọng số</th>
                        <th className="py-3 px-3 text-center w-28">Chỉ tiêu</th>
                        <th className="py-3 px-3 text-center w-44">Thực tế đạt (App / Sửa)</th>
                        <th className="py-3 px-3 text-center w-32">% Hoàn thành</th>
                        <th className="py-3 px-3 text-center w-28">Điểm đạt</th>
                        <th className="py-3 px-4 text-right w-24">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                      {selectedStaffComputed.allRoleMetrics.map((m: any) => (
                        <tr key={m.id} className="hover:bg-slate-50/90">
                          <td className="py-3.5 px-4">
                            <input
                              type="text"
                              value={m.name}
                              onChange={e => {
                                const val = e.target.value;
                                if (m.isCustom) {
                                  updateStaffEvaluation(selectedStaffComputed.staffKey, prev => ({
                                    ...prev,
                                    customMetrics: (prev.customMetrics || []).map(cm =>
                                      cm.id === m.id ? { ...cm, name: val } : cm
                                    )
                                  }));
                                } else {
                                  updateStaffEvaluation(selectedStaffComputed.staffKey, prev => ({
                                    ...prev,
                                    metricOverrides: {
                                      ...(prev.metricOverrides || {}),
                                      [m.id]: {
                                        ...(prev.metricOverrides?.[m.id] || {}),
                                        name: val
                                      }
                                    }
                                  }));
                                }
                              }}
                              title="Bấm để sửa trực tiếp tên chỉ tiêu nghiệp vụ"
                              className="w-full px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-lg font-black text-slate-950 text-sm md:text-[15px] leading-snug focus:outline-none transition"
                            />
                            <div className="text-xs text-indigo-800 font-extrabold mt-1 px-2.5">{m.bmReference}</div>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={m.weight}
                                onChange={e => {
                                  const w = Math.max(1, Math.min(50, Number(e.target.value) || 1));
                                  if (m.isCustom) {
                                    updateStaffEvaluation(selectedStaffComputed.staffKey, prev => ({
                                      ...prev,
                                      customMetrics: (prev.customMetrics || []).map(cm =>
                                        cm.id === m.id ? { ...cm, weight: w } : cm
                                      )
                                    }));
                                  } else {
                                    updateStaffEvaluation(selectedStaffComputed.staffKey, prev => ({
                                      ...prev,
                                      metricOverrides: {
                                        ...(prev.metricOverrides || {}),
                                        [m.id]: {
                                          ...(prev.metricOverrides?.[m.id] || {}),
                                          weight: w
                                        }
                                      }
                                    }));
                                  }
                                }}
                                title="Sửa trọng số điểm của chỉ tiêu"
                                className="w-16 px-2 py-1.5 text-center bg-white border-2 border-slate-300 focus:border-indigo-500 rounded-lg font-mono font-black text-sm text-slate-950 focus:outline-none"
                              />
                              <span className="text-xs font-black text-slate-700">đ</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <input
                              type="text"
                              value={m.targetText}
                              onChange={e => {
                                const val = e.target.value;
                                if (m.isCustom) {
                                  updateStaffEvaluation(selectedStaffComputed.staffKey, prev => ({
                                    ...prev,
                                    customMetrics: (prev.customMetrics || []).map(cm =>
                                      cm.id === m.id ? { ...cm, targetText: val } : cm
                                    )
                                  }));
                                } else {
                                  updateStaffEvaluation(selectedStaffComputed.staffKey, prev => ({
                                    ...prev,
                                    metricOverrides: {
                                      ...(prev.metricOverrides || {}),
                                      [m.id]: {
                                        ...(prev.metricOverrides?.[m.id] || {}),
                                        targetText: val
                                      }
                                    }
                                  }));
                                }
                              }}
                              title="Sửa ngưỡng chỉ tiêu (Target) — tự động chấm lại % đạt"
                              className="w-24 px-2 py-1.5 text-center bg-white border-2 border-slate-300 focus:border-indigo-500 rounded-lg font-mono font-extrabold text-sm text-slate-900 focus:outline-none"
                            />
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <input
                              type="text"
                              value={m.actualText}
                              onChange={e => {
                                const val = e.target.value;
                                if (m.isCustom) {
                                  updateStaffEvaluation(selectedStaffComputed.staffKey, prev => ({
                                    ...prev,
                                    customMetrics: (prev.customMetrics || []).map(cm =>
                                      cm.id === m.id ? { ...cm, actualText: val } : cm
                                    )
                                  }));
                                } else {
                                  updateStaffEvaluation(selectedStaffComputed.staffKey, prev => ({
                                    ...prev,
                                    metricOverrides: {
                                      ...(prev.metricOverrides || {}),
                                      [m.id]: {
                                        ...(prev.metricOverrides?.[m.id] || {}),
                                        actualText: val
                                      }
                                    }
                                  }));
                                }
                              }}
                              className="w-40 px-2.5 py-1.5 text-center bg-white border-2 border-slate-300 rounded-lg font-mono font-black text-sm text-slate-950 focus:outline-none focus:border-indigo-500"
                            />
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={m.scorePercent}
                                onChange={e => {
                                  const pct = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                  if (m.isCustom) {
                                    updateStaffEvaluation(selectedStaffComputed.staffKey, prev => ({
                                      ...prev,
                                      customMetrics: (prev.customMetrics || []).map(cm =>
                                        cm.id === m.id ? { ...cm, scorePercent: pct } : cm
                                      )
                                    }));
                                  } else {
                                    updateStaffEvaluation(selectedStaffComputed.staffKey, prev => ({
                                      ...prev,
                                      metricOverrides: {
                                        ...(prev.metricOverrides || {}),
                                        [m.id]: {
                                          ...(prev.metricOverrides?.[m.id] || {}),
                                          scorePercent: pct
                                        }
                                      }
                                    }));
                                  }
                                }}
                                className="w-18 px-2 py-1.5 text-center bg-white border-2 border-slate-300 rounded-lg font-mono font-black text-sm text-indigo-800 focus:outline-none focus:border-indigo-500"
                              />
                              <span className="text-xs font-black text-slate-700">%</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {m.isWaitingData ? (
                              <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-black">
                                Chờ dữ liệu
                              </span>
                            ) : (
                              <span className="font-mono font-black text-sm text-indigo-800">
                                {m.points} / {m.weight}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!m.isCustom && m.hasAnyOverride && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleResetStaffMetricOverride(selectedStaffComputed.staffKey, m.id)
                                  }
                                  className="p-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition cursor-pointer"
                                  title="Khôi phục tên, trọng số, chỉ tiêu mặc định /bm & tự động tính từ App"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setDrilldownModal({
                                    title: `${selectedStaffComputed.profile.staffName} • ${m.name}`,
                                    subtitle: m.evidence,
                                    targetTab: m.targetTab || 'daily_logs',
                                    targetTabLabel: m.targetTabLabel || 'Phân hệ gốc',
                                    summaryBadge: m.actualText,
                                    rows: m.sourceRows || []
                                  })
                                }
                                className="p-2 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border border-indigo-300 transition cursor-pointer"
                                title="Đối soát danh sách bản ghi gốc"
                              >
                                <Layers className="w-4 h-4" />
                              </button>
                              {m.isCustom && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteCustomStaffMetric(selectedStaffComputed.staffKey, m.id)
                                  }
                                  className="p-2 text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded-lg cursor-pointer"
                                  title="Xóa chỉ tiêu riêng này"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Group 2 & Group 3 Side-by-Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-sky-50/50 border border-sky-200 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="text-xs font-black uppercase text-sky-950 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-600" />
                        II. ĐIỂM BÁO CÁO NGÀY & CÔNG VIỆC (TỰ ĐỘNG: 30 ĐIỂM)
                      </h4>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setDrilldownModal({
                              title: `Nhật trình Báo cáo ngày • ${selectedStaffComputed.profile.staffName}`,
                              subtitle: `Tổng hợp công việc trong kỳ ${periodInfo.label}: Hoàn thành ${selectedStaffComputed.dailyStats.completedTasks}/${selectedStaffComputed.dailyStats.totalTasks} việc (${selectedStaffComputed.dailyStats.taskCompletionRate}%)`,
                              targetTab: 'daily_logs',
                              targetTabLabel: 'Báo cáo ngày QLCL',
                              summaryBadge: `${selectedStaffComputed.dailyScore30}/30đ`,
                              rows: selectedStaffComputed.dailySourceRows
                            })
                          }
                          className="px-2 py-0.5 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 text-[10px] font-extrabold cursor-pointer"
                        >
                          Đối soát {selectedStaffComputed.dailyStats.totalTasks} việc
                        </button>
                        <span className="px-2.5 py-0.5 rounded-lg bg-white border border-sky-200 font-mono text-xs font-black text-sky-800">
                          {selectedStaffComputed.dailyScore30} / 30 điểm
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 mb-3">
                      Tự động đọc trường <code className="text-sky-700">statusPercent = 100%</code> và hạn hoàn thành <code className="text-sky-700">deadline</code> từ Nhật trình báo cáo chất lượng hàng ngày trong kỳ {periodInfo.label}:
                    </p>

                    <div className="grid grid-cols-3 gap-2.5 mb-3">
                      <div className="bg-white p-2.5 rounded-lg border border-sky-100 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Tổng việc trong kỳ</div>
                        <div className="text-base font-black text-slate-800 mt-0.5">
                          {selectedStaffComputed.dailyStats.totalTasks} việc
                        </div>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-sky-100 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Hoàn thành (100%)</div>
                        <div className="text-base font-black text-emerald-600 mt-0.5">
                          {selectedStaffComputed.dailyStats.completedTasks} ({selectedStaffComputed.dailyStats.taskCompletionRate}%)
                        </div>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-sky-100 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Tồn quá hạn</div>
                        <div className="text-base font-black text-rose-600 mt-0.5">
                          {selectedStaffComputed.dailyStats.overdueTasks} việc
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-sky-100 text-[11px] text-slate-600">
                    <div className="font-bold text-slate-700 mb-1">Phân rã tỷ lệ hoàn thành theo khâu chuyên môn:</div>
                    <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-[10px]">
                      <div className="p-1.5 rounded bg-slate-50">
                        <div className="text-slate-400">QA/SQC</div>
                        <div className="font-black text-indigo-700">
                          {selectedStaffComputed.dailyStats.sqcStat.total > 0
                            ? `${selectedStaffComputed.dailyStats.sqcStat.rate}%`
                            : '-'}
                        </div>
                      </div>
                      <div className="p-1.5 rounded bg-slate-50">
                        <div className="text-slate-400">IQC</div>
                        <div className="font-black text-sky-700">
                          {selectedStaffComputed.dailyStats.iqcStat.total > 0
                            ? `${selectedStaffComputed.dailyStats.iqcStat.rate}%`
                            : '-'}
                        </div>
                      </div>
                      <div className="p-1.5 rounded bg-slate-50">
                        <div className="text-slate-400">PQC</div>
                        <div className="font-black text-amber-700">
                          {selectedStaffComputed.dailyStats.pqcStat.total > 0
                            ? `${selectedStaffComputed.dailyStats.pqcStat.rate}%`
                            : '-'}
                        </div>
                      </div>
                      <div className="p-1.5 rounded bg-slate-50">
                        <div className="text-slate-400">OQC</div>
                        <div className="font-black text-emerald-700">
                          {selectedStaffComputed.dailyStats.oqcStat.total > 0
                            ? `${selectedStaffComputed.dailyStats.oqcStat.rate}%`
                            : '-'}
                        </div>
                      </div>
                      <div className="p-1.5 rounded bg-slate-50">
                        <div className="text-slate-400">CS/BH</div>
                        <div className="font-black text-rose-700">
                          {selectedStaffComputed.dailyStats.csStat.total > 0
                            ? `${selectedStaffComputed.dailyStats.csStat.rate}%`
                            : '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-black uppercase text-amber-950 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-600" />
                      III. ĐÁNH GIÁ CỦA TRƯỞNG PHÒNG QLCL (20 ĐIỂM)
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-lg bg-white border border-amber-200 font-mono text-xs font-black text-amber-800">
                      {selectedStaffComputed.managerScore20} / 20 điểm
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-amber-200">
                      <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                        1. Trách nhiệm, kỷ luật & phối hợp (0 - 10đ)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={0.5}
                          value={selectedStaffComputed.mgrResp}
                          onChange={e => {
                            const val = Number(e.target.value);
                            updateStaffEvaluation(selectedStaffComputed.staffKey, prev => ({
                              ...prev,
                              managerResponsibilityScore: val
                            }));
                          }}
                          className="flex-1 accent-amber-600 cursor-pointer"
                        />
                        <span className="font-mono font-black text-sm text-amber-800 w-12 text-right">
                          {selectedStaffComputed.mgrResp}/10
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-amber-200">
                      <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                        2. Cải tiến, năng lực xử lý & 5S (0 - 10đ)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={0.5}
                          value={selectedStaffComputed.mgrInit}
                          onChange={e => {
                            const val = Number(e.target.value);
                            updateStaffEvaluation(selectedStaffComputed.staffKey, prev => ({
                              ...prev,
                              managerInitiativeScore: val
                            }));
                          }}
                          className="flex-1 accent-amber-600 cursor-pointer"
                        />
                        <span className="font-mono font-black text-sm text-amber-800 w-12 text-right">
                          {selectedStaffComputed.mgrInit}/10
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                      Nhận xét & Đánh giá của Trưởng phòng QLCL (anh Nguyễn Xuân Thao) — Kỳ {periodInfo.label}:
                    </label>
                    <textarea
                      rows={2}
                      value={selectedStaffComputed.managerComment}
                      onChange={e => {
                        const val = e.target.value;
                        updateStaffEvaluation(selectedStaffComputed.staffKey, prev => ({
                          ...prev,
                          managerComment: val
                        }));
                      }}
                      placeholder="Nhập nhận xét ưu điểm, điểm cần khắc phục hoặc chỉ đạo giao việc kỳ tới cho nhân sự này (tự động lưu & đồng bộ Cloud)..."
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: ĐỐI SOÁT BẢN GHI GỐC CẤU THÀNH CHỈ SỐ KPI TỰ ĐỘNG
      ========================================================================= */}
      {drilldownModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-black uppercase">
                    ĐỐI SOÁT DỮ LIỆU GỐC • {periodInfo.label}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-xs font-black">
                    Kết quả: {drilldownModal.summaryBadge}
                  </span>
                </div>
                <h3 className="text-sm md:text-base font-black text-slate-900 mt-1">
                  {drilldownModal.title}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">{drilldownModal.subtitle}</p>
              </div>

              <div className="flex items-center gap-2">
                {onNavigateToTab && drilldownModal.targetTab && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = drilldownModal.targetTab;
                      setDrilldownModal(null);
                      onNavigateToTab(target);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Mở {drilldownModal.targetTabLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDrilldownModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {drilldownModal.rows.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <div className="text-sm font-extrabold text-slate-700">
                    Chưa có bản ghi nào phát sinh trong kỳ {periodInfo.label}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Khi anh cập nhật dữ liệu tại phân hệ <strong>{drilldownModal.targetTabLabel}</strong>, chỉ số KPI kỳ này sẽ tự động tính toán tức thì.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs min-w-[680px]">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-extrabold text-[10px] uppercase">
                        <th className="py-2.5 px-3 w-28">Mã / Số hiệu</th>
                        <th className="py-2.5 px-3 w-24">Ngày</th>
                        <th className="py-2.5 px-3">Nội dung chi tiết bản ghi gốc</th>
                        <th className="py-2.5 px-3 w-36">Người thực hiện</th>
                        <th className="py-2.5 px-3 text-center w-36">Kết quả / Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                      {drilldownModal.rows.map((row, idx) => (
                        <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{row.id}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{row.date}</td>
                          <td className="py-2.5 px-3 text-slate-900">{row.title}</td>
                          <td className="py-2.5 px-3 text-slate-600">{row.actor}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                row.isPass
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {row.resultText}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-between text-xs text-slate-500">
              <span>Hiển thị tối đa 60 bản ghi tiêu biểu trong kỳ {periodInfo.label}</span>
              <button
                type="button"
                onClick={() => setDrilldownModal(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold cursor-pointer"
              >
                Đóng bảng đối soát
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CHỈNH SỬA CHỈ TIÊU KPI PHÒNG / CẬP NHẬT SỐ LIỆU KỲ
      ========================================================================= */}
      {editingDeptKpi && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xl max-w-lg w-full p-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  {editingDeptKpi.id} • Kỳ {periodInfo.label}
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-1">
                  Cập nhật Chỉ tiêu & Kết quả KPI Phòng QLCL
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDeptKpi(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDeptKpiEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Tên chỉ tiêu KPI</label>
                <input
                  type="text"
                  value={editIndicatorName}
                  onChange={e => setEditIndicatorName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Định nghĩa / Phương pháp đo</label>
                <textarea
                  rows={2}
                  value={editDefinitionInput}
                  onChange={e => setEditDefinitionInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Trọng số (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editWeightInput}
                    onChange={e => setEditWeightInput(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Mục tiêu / Ngưỡng chấm (Target)
                  </label>
                  <input
                    type="text"
                    value={editTargetInput}
                    onChange={e => setEditTargetInput(e.target.value)}
                    placeholder="VD: >= 95% hoặc <= 15.000.000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              {editingDeptKpi.sourceType !== 'manual' && (
                <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold text-indigo-950">
                    {editActualOverrideEnabled
                      ? 'Đang bật chế độ ghi đè tay: số Thực tế đạt kỳ này sẽ dùng giá trị bạn nhập bên dưới.'
                      : 'Đang giữ chế độ Tự động từ App: hệ thống vẫn tự cập nhật số liệu mới và chấm Đạt/Không đạt theo Mục tiêu vừa sửa.'}
                  </div>
                  <label className="inline-flex items-center gap-1.5 shrink-0 cursor-pointer font-extrabold text-indigo-800">
                    <input
                      type="checkbox"
                      checked={editActualOverrideEnabled}
                      onChange={e => setEditActualOverrideEnabled(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                    <span>Ghi đè tay</span>
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Thực tế đạt ({periodInfo.label})
                  </label>
                  <input
                    type="text"
                    value={editActualInput}
                    disabled={editingDeptKpi.sourceType !== 'manual' && !editActualOverrideEnabled}
                    onChange={e => setEditActualInput(e.target.value)}
                    placeholder={
                      editingDeptKpi.sourceType !== 'manual' && !editActualOverrideEnabled
                        ? 'Tự động lấy từ dữ liệu App'
                        : 'VD: 98.5%'
                    }
                    className={`w-full px-3 py-2 border-2 rounded-lg font-mono font-black ${
                      editingDeptKpi.sourceType !== 'manual' && !editActualOverrideEnabled
                        ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                        : 'border-indigo-400 bg-indigo-50/40 text-indigo-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Trạng thái đánh giá</label>
                  <select
                    value={editStatusInput}
                    disabled={editingDeptKpi.sourceType !== 'manual' && !editActualOverrideEnabled}
                    onChange={e => setEditStatusInput(e.target.value as DetailedKPI['status'])}
                    className={`w-full px-3 py-2 border rounded-lg font-bold ${
                      editingDeptKpi.sourceType !== 'manual' && !editActualOverrideEnabled
                        ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                        : 'border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="Đạt">Đạt</option>
                    <option value="Theo dõi">Theo dõi</option>
                    <option value="Đang cải tiến">Đang cải tiến</option>
                    <option value="Không đạt">Không đạt</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Ghi chú giải trình kỳ này</label>
                <input
                  type="text"
                  value={editNoteInput}
                  onChange={e => setEditNoteInput(e.target.value)}
                  placeholder="Nhập ghi chú dẫn chứng..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                {editingDeptKpi.sourceType !== 'manual' && editingDeptKpi.isOverridden ? (
                  <button
                    type="button"
                    onClick={() => handleClearPeriodOverride(editingDeptKpi.id)}
                    className="px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Khôi phục tính tự động từ App
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDeptKpi(null)}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Lưu & Đồng bộ
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: THÊM CHỈ TIÊU KPI PHÒNG MỚI
      ========================================================================= */}
      {showAddKpiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xl max-w-lg w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-sm font-black text-slate-900">Thêm Chỉ tiêu KPI Phòng QLCL Mới</h3>
              <button
                type="button"
                onClick={() => setShowAddKpiModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomDeptKpi} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Khối mục tiêu</label>
                  <select
                    value={newKpiType}
                    onChange={e => setNewKpiType(e.target.value as DetailedKPI['type'])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Mục tiêu hoạt động chung">I. Mục tiêu hoạt động chung</option>
                    <option value="Mục tiêu hoạt động chuyên môn">II. Mục tiêu hoạt động chuyên môn</option>
                  </select>
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Nhóm danh mục</label>
                  <select
                    value={newKpiCategory}
                    onChange={e => setNewKpiCategory(e.target.value as DetailedKPI['category'])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Chi phí bộ phận">Chi phí bộ phận & COPQ</option>
                    <option value="Báo cáo kế hoạch">Báo cáo kế hoạch</option>
                    <option value="Hệ thống & Hồ sơ">Hệ thống & Hồ sơ / Thiết bị</option>
                    <option value="Nhân sự">Nhân sự</option>
                    <option value="6S, Cải tiến">6S, Cải tiến</option>
                    <option value="Chất lượng NCC">Chất lượng NCC (SQC)</option>
                    <option value="IQC - Chất lượng đầu vào">IQC - Chất lượng đầu vào</option>
                    <option value="PQC - Chất lượng quá trình">PQC - Chất lượng quá trình</option>
                    <option value="OQC - Chất lượng đầu ra">OQC - Chất lượng đầu ra & Bảo hành</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Tên chỉ tiêu KPI *</label>
                <input
                  type="text"
                  required
                  value={newKpiIndicator}
                  onChange={e => setNewKpiIndicator(e.target.value)}
                  placeholder="Ví dụ: Tỷ lệ hoàn thành đánh giá nội bộ ISO 9001..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Định nghĩa & Cách đo lường</label>
                <textarea
                  rows={2}
                  value={newKpiDefinition}
                  onChange={e => setNewKpiDefinition(e.target.value)}
                  placeholder="Mô tả phương pháp ghi nhận và đánh giá chỉ tiêu..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Trọng số (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newKpiWeight}
                    onChange={e => setNewKpiWeight(Number(e.target.value))}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Đơn vị</label>
                  <input
                    type="text"
                    value={newKpiUnit}
                    onChange={e => setNewKpiUnit(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Chỉ tiêu</label>
                  <input
                    type="text"
                    value={newKpiTarget}
                    onChange={e => setNewKpiTarget(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Thực tế đạt</label>
                  <input
                    type="text"
                    value={newKpiActual}
                    onChange={e => setNewKpiActual(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddKpiModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold cursor-pointer"
                >
                  Thêm chỉ tiêu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: THÊM CHỈ TIÊU NGHIỆP VỤ RIÊNG CHO NHÂN SỰ
      ========================================================================= */}
      {showAddStaffMetricModal && selectedStaffComputed && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xl max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600">
                  {selectedStaffComputed.profile.staffName} • Kỳ {periodInfo.label}
                </span>
                <h3 className="text-sm font-black text-slate-900">
                  Thêm Chỉ tiêu Nghiệp vụ Riêng cho Nhân sự
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffMetricModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomStaffMetric} className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Tên chỉ tiêu / Nhiệm vụ giao *</label>
                <input
                  type="text"
                  required
                  value={newStaffMetricName}
                  onChange={e => setNewStaffMetricName(e.target.value)}
                  placeholder="Ví dụ: Hoàn thành bộ dưỡng kiểm khung xe Roma-X..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Căn cứ văn bản /bm hoặc Quyết định</label>
                <input
                  type="text"
                  value={newStaffMetricBmRef}
                  onChange={e => setNewStaffMetricBmRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Trọng số điểm</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newStaffMetricWeight}
                    onChange={e => setNewStaffMetricWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">% Hoàn thành (0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newStaffMetricScorePct}
                    onChange={e => setNewStaffMetricScorePct(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Chỉ tiêu (Target)</label>
                  <input
                    type="text"
                    value={newStaffMetricTarget}
                    onChange={e => setNewStaffMetricTarget(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Thực tế đạt</label>
                  <input
                    type="text"
                    value={newStaffMetricActual}
                    onChange={e => setNewStaffMetricActual(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddStaffMetricModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold cursor-pointer"
                >
                  Lưu chỉ tiêu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
