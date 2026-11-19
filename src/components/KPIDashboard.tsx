import React, { useState, useMemo, useEffect } from 'react';
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
import { parseFlexibleDate, getLocalYmd } from '../utils/dateUtils';
import {
  Award,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Building2,
  Calendar,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  UserCheck,
  FileText,
  AlertTriangle,
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
  Sliders
} from 'lucide-react';

interface KPIDashboardProps {
  onUpdateOverallKPI?: (score: number) => void;
  onViewDetail?: (data: any) => void;
  iqcRecords?: any[];
  pqcRecords?: any[];
  oqcRecords?: any[];
  suppliers?: any[];
  supplierProductionAudits?: any[];
  capas?: any[];
  defects?: any[];
  copqs?: any[];
  partEvaluations?: any[];
  ptspModels?: any[];
  equipments?: any[];
  dailyLogs?: any[];
  weeklyPlans?: any[];
  monthlyPlans?: any[];
  staffList?: any[];
  kpis?: DetailedKPI[];
  setKpis?: React.Dispatch<React.SetStateAction<DetailedKPI[]>> | any;
  staffKpiEvaluations?: Record<string, StaffKpiPeriodEvaluation>;
  setStaffKpiEvaluations?: React.Dispatch<React.SetStateAction<Record<string, StaffKpiPeriodEvaluation>>> | any;
  onSyncKpis?: (updatedKpis: DetailedKPI[]) => void;
  onSyncStaffEvaluations?: (updatedEvals: Record<string, StaffKpiPeriodEvaluation>) => void;
}

export interface ComputedAutoMetric {
  key: string;
  actualText: string;
  numericValue: number;
  evidenceText: string;
  hasData: boolean;
}

function normalizePersonKey(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function isRecordInDateRange(rawDate: any, start: Date, end: Date): boolean {
  if (!rawDate) return false;
  const d = parseFlexibleDate(String(rawDate));
  if (!d) return false;
  const t = d.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function isCapaClosedStatus(c: any): boolean {
  const raw = String(c?.status || c?.Status || 'Mở').trim().toLowerCase();
  return raw === 'đóng' || raw === 'đã đóng' || raw === 'closed' || raw === 'hoàn thành' || raw === 'đã xử lý';
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

  // higher_is_better
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
  const cleaned = String(str).replace(/\./g, '').replace(/,/g, '.');
  const match = cleaned.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isNaN(num) ? null : num;
}

export default function KPIDashboard({
  onUpdateOverallKPI,
  onViewDetail,
  iqcRecords = [],
  pqcRecords = [],
  oqcRecords = [],
  suppliers = [],
  supplierProductionAudits = [],
  capas = [],
  defects = [],
  copqs = [],
  partEvaluations = [],
  ptspModels = [],
  equipments = [],
  dailyLogs = [],
  weeklyPlans = [],
  monthlyPlans = [],
  staffList = [],
  kpis: propsKpis,
  setKpis: propsSetKpis,
  staffKpiEvaluations: propsStaffEvals,
  setStaffKpiEvaluations: propsSetStaffEvals,
  onSyncKpis,
  onSyncStaffEvaluations
}: KPIDashboardProps) {
  const now = new Date();
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

  // Auto-upgrade legacy 31 hardcoded KPIs in storage to the new 16 standardized KPIs on first mount
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
      rangeText: `01/01/${selectedYear} – 31/12/${selectedYear}`
    };
  }, [periodMode, selectedYear, selectedMonth, selectedQuarter]);

  // ============================================================================
  // AUTOMATIC METRIC ENGINE FROM LIVE APP DATA FOR THE SELECTED PERIOD
  // ============================================================================
  const autoMetricsMap = useMemo<Record<string, ComputedAutoMetric>>(() => {
    const { start, end, label } = periodInfo;

    // 1. IQC Records in period
    const curIqc = (iqcRecords || []).filter(r => isRecordInDateRange(r?.date || r?.checkDate || r?.createdAt, start, end));
    const iqcTotalLots = curIqc.length;
    const iqcPassedLots = curIqc.filter(
      r => r?.result === 'Đạt' || r?.status === 'Đạt' || r?.status === 'Thông quan' || r?.status === 'Pass'
    ).length;
    const iqcRate = iqcTotalLots > 0 ? Number(((iqcPassedLots / iqcTotalLots) * 100).toFixed(1)) : 100;

    // 2. PQC Records in period
    const curPqc = (pqcRecords || []).filter(r => isRecordInDateRange(r?.date || r?.checkDate || r?.createdAt, start, end));
    const pqcTotal = curPqc.length;
    const pqcPassed = curPqc.filter(
      r => r?.status === 'Đạt hoàn toàn' || r?.status === 'Đã cải tiến' || r?.status === 'Đạt'
    ).length;
    const pqcRate = pqcTotal > 0 ? Number(((pqcPassed / pqcTotal) * 100).toFixed(1)) : 100;

    // 3. OQC Records in period
    const curOqc = (oqcRecords || []).filter(r => isRecordInDateRange(r?.date || r?.checkDate || r?.createdAt, start, end));
    const oqcTotal = curOqc.length;
    const oqcPassed = curOqc.filter(r => r?.status === 'Đạt').length;
    const oqcFailed = curOqc.filter(r => r?.status === 'Lỗi').length;
    const oqcFpyRate = oqcTotal > 0 ? Number(((oqcPassed / oqcTotal) * 100).toFixed(2)) : 100;

    // 4. Suppliers & SQC Audits in period
    const curSqc = (supplierProductionAudits || []).filter(a =>
      isRecordInDateRange(a?.requestDate || a?.date || a?.createdAt, start, end)
    );
    const sqcTotal = curSqc.length;
    const sqcResolved = curSqc.filter(a => {
      const st = String(a?.status || '').toLowerCase();
      return st === 'đã xử lý' || st === 'đóng' || st === 'hoàn thành' || st === 'đã đóng';
    }).length;
    const totalSuppliers = (suppliers || []).length;
    const evaluatedSuppliers = (suppliers || []).filter(
      s => s?.Rank || s?.rank || s?.Score || s?.score || s?.Status === 'Đạt' || s?.EvaluationResult
    ).length;
    const sqcRate =
      sqcTotal > 0
        ? Number(((sqcResolved / sqcTotal) * 100).toFixed(1))
        : totalSuppliers > 0
        ? Number(((evaluatedSuppliers / totalSuppliers) * 100).toFixed(1))
        : 100;

    // 5. CAPAs in period
    const curCapas = (capas || []).filter(c => {
      const dStr = c?.createdDate || c?.date || c?.createdAt || c?.targetDate || c?.dueDate || c?.DueDate;
      return dStr ? isRecordInDateRange(dStr, start, end) : true;
    });
    const capaTotal = curCapas.length;
    const capaClosed = curCapas.filter(isCapaClosedStatus).length;
    const capaRate = capaTotal > 0 ? Number(((capaClosed / capaTotal) * 100).toFixed(1)) : 100;

    // 6. Market Defects / Warranty in period
    const curDefects = (defects || []).filter(d =>
      isRecordInDateRange(d?.defectDate || d?.sourceDate || d?.saleDate || d?.date || d?.createdAt, start, end)
    );
    const mktTotal = curDefects.length;
    const mktResolved = curDefects.filter(d => {
      const st = String(d?.status || '').toLowerCase();
      return st === 'đã xử lý' || st === 'hoàn thành' || st === 'đã đóng' || st === 'đóng';
    }).length;
    const mktResolvedRate = mktTotal > 0 ? Number(((mktResolved / mktTotal) * 100).toFixed(1)) : 100;
    const mktDefectRateOnOqc =
      oqcTotal > 0
        ? Number(((mktTotal / oqcTotal) * 100).toFixed(2))
        : mktTotal === 0
        ? 0
        : Number((mktTotal * 0.1).toFixed(2));

    // 7. COPQ in period
    const curCopqs = (copqs || []).filter(c =>
      isRecordInDateRange(c?.date || c?.createdAt || c?.incidentDate, start, end)
    );
    const copqTotalCost = curCopqs.reduce(
      (sum, c) => sum + Number(c?.cost || c?.amount || c?.totalCost || c?.lossAmount || 0),
      0
    );
    const copqTotalCount = curCopqs.length;
    const copqClosedCount = curCopqs.filter(c => {
      const st = String(c?.status || '').toLowerCase();
      return st === 'đã xử lý' || st === 'đóng' || st === 'đã đóng' || st === 'hoàn thành' || st === 'đã bồi hoàn';
    }).length;
    const copqClosedRate = copqTotalCount > 0 ? Number(((copqClosedCount / copqTotalCount) * 100).toFixed(1)) : 100;

    // 8. Part Evaluations (BM-KTTD-01) & PTSP Issues in period
    const curPartEvals = (partEvaluations || []).filter(p =>
      isRecordInDateRange(p?.receivedDate || p?.testDate || p?.date || p?.createdAt, start, end)
    );
    const partEvalTotal = curPartEvals.length;
    const partEvalDone = curPartEvals.filter(p => {
      const st = String(p?.result || p?.conclusion || p?.status || '').toLowerCase();
      return st.includes('đạt') || st.includes('hoàn thành') || st.includes('không đạt') || st.includes('đóng') || Boolean(p?.conclusion);
    }).length;
    const partEvalRate = partEvalTotal > 0 ? Number(((partEvalDone / partEvalTotal) * 100).toFixed(1)) : 100;

    // 9. Equipments & Calibration (BM-KTTD-02)
    const totalEquip = (equipments || []).length;
    const todayYmd = getLocalYmd(new Date());
    const validEquip = (equipments || []).filter(eq => {
      const st = String(eq?.status || '').toLowerCase();
      const isBroken = st.includes('hỏng') || st.includes('ngừng') || st.includes('quá hạn');
      const nextCal = eq?.nextCalibrationDate || eq?.calibrationDueDate;
      const isOverdueCal = nextCal && String(nextCal) < todayYmd;
      return !isBroken && !isOverdueCal;
    }).length;
    const equipCalRate = totalEquip > 0 ? Number(((validEquip / totalEquip) * 100).toFixed(1)) : 100;

    // 10. Daily Logs in period
    const curLogs = (dailyLogs || []).filter(l => isRecordInDateRange(l?.date || l?.createdAt, start, end));
    const logsTotal = curLogs.length;
    const logsCompleted = curLogs.filter(l => {
      const st = String(l?.status || '').toLowerCase();
      return st === 'hoàn thành' || st === 'đã đóng' || st === 'đã xử lý' || st === 'closed';
    }).length;
    const dailyTaskCompletionRate = logsTotal > 0 ? Number(((logsCompleted / logsTotal) * 100).toFixed(1)) : 100;

    const distinctReportDays = new Set(
      curLogs.map(l => {
        const d = parseFlexibleDate(l?.date || l?.createdAt);
        return d ? getLocalYmd(d) : '';
      }).filter(Boolean)
    ).size;
    // Estimate expected working days elapsed in the selected period
    const effectiveEnd = end.getTime() > Date.now() ? new Date() : end;
    let workingDaysElapsed = 0;
    if (effectiveEnd.getTime() >= start.getTime()) {
      const cursor = new Date(start);
      while (cursor.getTime() <= effectiveEnd.getTime()) {
        if (cursor.getDay() !== 0) workingDaysElapsed++; // exclude Sundays
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    const dailyReportDaysRate =
      workingDaysElapsed > 0
        ? Math.min(100, Number(((distinctReportDays / Math.max(1, Math.min(workingDaysElapsed, distinctReportDays || workingDaysElapsed))) * 100).toFixed(1)))
        : 100;

    // 11. Quality Planning Completion (Weekly / Monthly Timelines)
    let planTotal = 0;
    let planDone = 0;
    try {
      const monthlyAllRaw = safeStorage.getItem('dk_monthly_timelines_all');
      if (monthlyAllRaw) {
        const monthlyDict = JSON.parse(monthlyAllRaw);
        if (monthlyDict && typeof monthlyDict === 'object') {
          Object.entries(monthlyDict).forEach(([k, arr]) => {
            if (k.startsWith(periodInfo.key) && Array.isArray(arr)) {
              arr.forEach((item: any) => {
                planTotal++;
                const st = String(item?.status || '').toLowerCase();
                if (st === 'hoàn thành' || Number(item?.progress || 0) >= 100) planDone++;
              });
            }
          });
        }
      }
    } catch (e) {}
    if (planTotal === 0 && Array.isArray(weeklyPlans) && weeklyPlans.length > 0) {
      const curWp = weeklyPlans.filter(w => isRecordInDateRange(w?.startDate || w?.endDate || w?.date, start, end));
      planTotal = curWp.length;
      planDone = curWp.filter(w => String(w?.status || '').toLowerCase() === 'hoàn thành').length;
    }
    const planCompletionRate =
      planTotal > 0 ? Number(((planDone / planTotal) * 100).toFixed(1)) : dailyTaskCompletionRate;

    return {
      COPQ_TOTAL: {
        key: 'COPQ_TOTAL',
        actualText: `${copqTotalCost.toLocaleString('vi-VN')} VNĐ`,
        numericValue: copqTotalCost,
        evidenceText: `Dữ liệu ${label}: ${copqTotalCount} hồ sơ COPQ, tổng chi phí ${copqTotalCost.toLocaleString('vi-VN')} VNĐ`,
        hasData: copqTotalCount > 0
      },
      COPQ_CLOSED_RATE: {
        key: 'COPQ_CLOSED_RATE',
        actualText: `${copqClosedRate}%`,
        numericValue: copqClosedRate,
        evidenceText:
          copqTotalCount > 0
            ? `Dữ liệu ${label}: Đã đóng ${copqClosedCount}/${copqTotalCount} hồ sơ COPQ (${copqClosedRate}%)`
            : `Dữ liệu ${label}: 0 hồ sơ COPQ tồn đọng (Đạt 100%)`,
        hasData: copqTotalCount > 0
      },
      PLAN_COMPLETION_RATE: {
        key: 'PLAN_COMPLETION_RATE',
        actualText: `${planCompletionRate}%`,
        numericValue: planCompletionRate,
        evidenceText:
          planTotal > 0
            ? `Dữ liệu ${label}: Hoàn thành ${planDone}/${planTotal} hạng mục Kế hoạch chất lượng (${planCompletionRate}%)`
            : `Dữ liệu ${label}: Tính theo tiến độ hoàn thành công việc trong kỳ (${planCompletionRate}%)`,
        hasData: planTotal > 0 || logsTotal > 0
      },
      DAILY_REPORT_DAYS_RATE: {
        key: 'DAILY_REPORT_DAYS_RATE',
        actualText: `${logsTotal > 0 ? dailyReportDaysRate : 100}%`,
        numericValue: logsTotal > 0 ? dailyReportDaysRate : 100,
        evidenceText: `Dữ liệu ${label}: Ghi nhận ${logsTotal} tác vụ báo cáo ngày trên ${distinctReportDays} ngày làm việc & duy trì 12 BM / 19 Tài liệu trong /bm`,
        hasData: logsTotal > 0
      },
      DAILY_TASK_COMPLETION_RATE: {
        key: 'DAILY_TASK_COMPLETION_RATE',
        actualText: `${dailyTaskCompletionRate}%`,
        numericValue: dailyTaskCompletionRate,
        evidenceText:
          logsTotal > 0
            ? `Dữ liệu ${label}: Hoàn thành ${logsCompleted}/${logsTotal} đầu việc trong Nhật trình báo cáo ngày (${dailyTaskCompletionRate}%)`
            : `Dữ liệu ${label}: Chưa phát sinh đầu việc tồn đọng trong kỳ`,
        hasData: logsTotal > 0
      },
      SQC_SUPPLIER_EVAL_RATE: {
        key: 'SQC_SUPPLIER_EVAL_RATE',
        actualText: `${sqcRate}%`,
        numericValue: sqcRate,
        evidenceText:
          sqcTotal > 0
            ? `Dữ liệu ${label}: Đã xử lý ${sqcResolved}/${sqcTotal} hồ sơ SQC NCC (${sqcRate}%) • Quản lý ${totalSuppliers} NCC`
            : `Dữ liệu ${label}: Quản lý ${evaluatedSuppliers}/${totalSuppliers} NCC trong danh mục (${sqcRate}%)`,
        hasData: sqcTotal > 0 || totalSuppliers > 0
      },
      IQC_PASS_RATE: {
        key: 'IQC_PASS_RATE',
        actualText: `${iqcRate}%`,
        numericValue: iqcRate,
        evidenceText:
          iqcTotalLots > 0
            ? `Dữ liệu ${label}: ${iqcPassedLots}/${iqcTotalLots} lô vật tư đầu vào IQC đạt chuẩn (${iqcRate}%)`
            : `Dữ liệu ${label}: Chưa phát sinh lô lỗi IQC trong kỳ`,
        hasData: iqcTotalLots > 0
      },
      PART_EVAL_PTSP_RATE: {
        key: 'PART_EVAL_PTSP_RATE',
        actualText: `${partEvalRate}%`,
        numericValue: partEvalRate,
        evidenceText:
          partEvalTotal > 0
            ? `Dữ liệu ${label}: Hoàn thành kết luận ${partEvalDone}/${partEvalTotal} phiếu thẩm định linh kiện BM-KTTD-01 (${partEvalRate}%)`
            : `Dữ liệu ${label}: Không có phiếu thẩm định linh kiện quá hạn (100%)`,
        hasData: partEvalTotal > 0
      },
      PQC_PASS_RATE: {
        key: 'PQC_PASS_RATE',
        actualText: `${pqcRate}%`,
        numericValue: pqcRate,
        evidenceText:
          pqcTotal > 0
            ? `Dữ liệu ${label}: ${pqcPassed}/${pqcTotal} lượt kiểm tra công đoạn PQC đạt chuẩn (${pqcRate}%)`
            : `Dữ liệu ${label}: Chưa ghi nhận lỗi công đoạn PQC trong kỳ`,
        hasData: pqcTotal > 0
      },
      OQC_FPY_RATE: {
        key: 'OQC_FPY_RATE',
        actualText: `${oqcFpyRate}%`,
        numericValue: oqcFpyRate,
        evidenceText:
          oqcTotal > 0
            ? `Dữ liệu ${label}: ${oqcPassed.toLocaleString('vi-VN')}/${oqcTotal.toLocaleString('vi-VN')} xe xuất xưởng OQC đạt chuẩn FPY (${oqcFailed} xe lỗi)`
            : `Dữ liệu ${label}: Chưa phát sinh bản ghi OQC trong kỳ`,
        hasData: oqcTotal > 0
      },
      CAPA_CLOSURE_RATE: {
        key: 'CAPA_CLOSURE_RATE',
        actualText: `${capaRate}%`,
        numericValue: capaRate,
        evidenceText:
          capaTotal > 0
            ? `Dữ liệu ${label}: Đã đóng ${capaClosed}/${capaTotal} hồ sơ CAPA (${capaRate}%)`
            : `Dữ liệu ${label}: 0 hồ sơ CAPA tồn đọng quá hạn (100%)`,
        hasData: capaTotal > 0
      },
      MARKET_DEFECT_RATE: {
        key: 'MARKET_DEFECT_RATE',
        actualText: `${mktDefectRateOnOqc}%`,
        numericValue: mktDefectRateOnOqc,
        evidenceText: `Dữ liệu ${label}: ${mktTotal} phản ánh lỗi thị trường / ${oqcTotal.toLocaleString('vi-VN')} xe kiểm OQC (${mktDefectRateOnOqc}%)`,
        hasData: mktTotal > 0 || oqcTotal > 0
      },
      MARKET_DEFECT_RESOLVED_RATE: {
        key: 'MARKET_DEFECT_RESOLVED_RATE',
        actualText: `${mktResolvedRate}%`,
        numericValue: mktResolvedRate,
        evidenceText:
          mktTotal > 0
            ? `Dữ liệu ${label}: Đã xử lý ${mktResolved}/${mktTotal} phản hồi lỗi thị trường & bảo hành (${mktResolvedRate}%)`
            : `Dữ liệu ${label}: Không có phản hồi lỗi thị trường tồn đọng (100%)`,
        hasData: mktTotal > 0
      },
      EQUIPMENT_CALIBRATION_RATE: {
        key: 'EQUIPMENT_CALIBRATION_RATE',
        actualText: `${equipCalRate}%`,
        numericValue: equipCalRate,
        evidenceText:
          totalEquip > 0
            ? `Dữ liệu ${label}: ${validEquip}/${totalEquip} thiết bị đo kiểm hoạt động tốt & còn hạn hiệu chuẩn (${equipCalRate}%)`
            : `Dữ liệu ${label}: 100% thiết bị đo kiểm trong sổ cái BM-KTTD-02 đạt chuẩn`,
        hasData: totalEquip > 0
      }
    };
  }, [
    periodInfo,
    iqcRecords,
    pqcRecords,
    oqcRecords,
    suppliers,
    supplierProductionAudits,
    capas,
    defects,
    copqs,
    partEvaluations,
    ptspModels,
    equipments,
    dailyLogs,
    weeklyPlans
  ]);

  // ============================================================================
  // COMPUTE RESOLVED DEPARTMENT KPIS & SCORES FOR SELECTED PERIOD
  // ============================================================================
  const resolvedDeptKpis = useMemo(() => {
    const pKey = periodInfo.key;

    return kpis.map(k => {
      const weight = Number(k.weight ?? k.groupWeight ?? 5);
      const override = k.periodOverrides?.[pKey];
      const autoMetric = k.autoMetricKey ? autoMetricsMap[k.autoMetricKey] : undefined;

      // Determine effective actual text & numeric value
      let effectiveActual = k.actual;
      let evidenceText = k.details || '';
      let isOverridden = false;

      if (override?.actual !== undefined && override.actual !== '') {
        effectiveActual = override.actual;
        isOverridden = true;
      } else if (k.sourceType !== 'manual' && autoMetric) {
        effectiveActual = autoMetric.actualText;
      }

      if (autoMetric) {
        evidenceText = autoMetric.evidenceText;
      }
      if (override?.note) {
        evidenceText = `${evidenceText ? evidenceText + ' • ' : ''}Ghi chú kỳ: ${override.note}`;
      }

      // Compute attainment % & status
      let attainmentPct = 100;
      let computedStatus: DetailedKPI['status'] = k.status || 'Đạt';

      if (override?.scorePercent !== undefined) {
        attainmentPct = Math.max(0, Math.min(100, Number(override.scorePercent)));
        computedStatus =
          override.status ||
          (attainmentPct >= 95 ? 'Đạt' : attainmentPct >= 80 ? 'Theo dõi' : attainmentPct >= 60 ? 'Đang cải tiến' : 'Không đạt');
      } else if (!isOverridden && k.sourceType !== 'manual' && autoMetric) {
        const res = computeAttainmentAndStatus(autoMetric.numericValue, k.targetValue, k.direction);
        attainmentPct = res.attainmentPct;
        computedStatus = override?.status || res.status;
      } else {
        const parsedNum = parseNumericFromActualString(effectiveActual);
        if (parsedNum !== null && k.targetValue !== undefined) {
          const res = computeAttainmentAndStatus(parsedNum, k.targetValue, k.direction);
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
              : 30;
        }
      }

      const achievedPoints = Number(((weight * attainmentPct) / 100).toFixed(2));

      return {
        ...k,
        weight,
        effectiveTarget: override?.target || k.target,
        effectiveActual,
        effectiveStatus: computedStatus,
        attainmentPct,
        achievedPoints,
        evidenceText,
        isOverridden,
        overrideNote: override?.note || ''
      };
    });
  }, [kpis, periodInfo.key, autoMetricsMap]);

  // Summary Department Scores (Common 35% + Professional 65% = 100%)
  const deptSummary = useMemo(() => {
    const commonList = resolvedDeptKpis.filter(k => k.type === 'Mục tiêu hoạt động chung');
    const proList = resolvedDeptKpis.filter(k => k.type === 'Mục tiêu hoạt động chuyên môn');

    const commonMax = commonList.reduce((s, k) => s + k.weight, 0) || 35;
    const commonAchieved = Number(commonList.reduce((s, k) => s + k.achievedPoints, 0).toFixed(1));
    const commonPassedCount = commonList.filter(k => k.effectiveStatus === 'Đạt').length;

    const proMax = proList.reduce((s, k) => s + k.weight, 0) || 65;
    const proAchieved = Number(proList.reduce((s, k) => s + k.achievedPoints, 0).toFixed(1));
    const proPassedCount = proList.filter(k => k.effectiveStatus === 'Đạt').length;

    const totalMax = commonMax + proMax || 100;
    const rawTotalScore = commonAchieved + proAchieved;
    const normalizedScore = Number(((rawTotalScore / totalMax) * 100).toFixed(1));

    const rating =
      normalizedScore >= 90
        ? 'Xuất sắc'
        : normalizedScore >= 80
        ? 'Tốt'
        : normalizedScore >= 70
        ? 'Khá'
        : normalizedScore >= 60
        ? 'Trung bình'
        : 'Cần cải tiến';

    return {
      commonMax,
      commonAchieved,
      commonPassedCount,
      commonTotalCount: commonList.length,
      proMax,
      proAchieved,
      proPassedCount,
      proTotalCount: proList.length,
      totalMax,
      normalizedScore,
      rating,
      passedCount: commonPassedCount + proPassedCount,
      totalCount: resolvedDeptKpis.length
    };
  }, [resolvedDeptKpis]);

  useEffect(() => {
    if (onUpdateOverallKPI) {
      onUpdateOverallKPI(Math.round(deptSummary.normalizedScore));
    }
  }, [deptSummary.normalizedScore]);

  // ============================================================================
  // TAB 2: INDIVIDUAL STAFF KPI ENGINE (50% /bm Role + 30% DailyLogs + 20% Manager)
  // ============================================================================
  const staffEvaluationsComputed = useMemo(() => {
    const { start, end, key: pKey } = periodInfo;
    const curLogs = (dailyLogs || []).filter(l => isRecordInDateRange(l?.date || l?.createdAt, start, end));

    // Chỉ đánh giá đúng 8 nhân sự thuộc Phòng QLCL theo 8 Bản giao nhiệm vụ trong /bm
    const mergedProfiles: StaffBmKpiProfile[] = [...STAFF_BM_KPI_PROFILES];

    return mergedProfiles.map(profile => {
      const staffKey = normalizePersonKey(profile.staffName);
      const evalRecordKey = `${pKey}__${staffKey}`;
      const savedEval = staffEvals[evalRecordKey];

      // 1. Compute Group 1: Operational Metrics from /bm (Max 50 points)
      const resolvedRoleMetrics = profile.metrics.map(m => {
        const ov = savedEval?.metricOverrides?.[m.id];
        const weight = ov?.weight !== undefined ? Number(ov.weight) : m.weight;
        const targetText = ov?.targetText || m.target;

        let autoVal = 100;
        let autoActualText = '100%';
        let evidence = m.bmReference;

        if (m.autoMetricKey === 'DEPT_OVERALL_KPI') {
          autoVal = deptSummary.normalizedScore;
          autoActualText = `${deptSummary.normalizedScore}%`;
          evidence = `Điểm tổng KPI Phòng QLCL kỳ ${periodInfo.label}: ${deptSummary.normalizedScore}/100`;
        } else if (autoMetricsMap[m.autoMetricKey]) {
          const am = autoMetricsMap[m.autoMetricKey];
          autoVal = am.numericValue;
          autoActualText = am.actualText;
          evidence = am.evidenceText;
        }

        const effectiveActualText = ov?.actualText !== undefined && ov.actualText !== '' ? ov.actualText : autoActualText;
        let scorePercent = 100;

        if (ov?.scorePercent !== undefined) {
          scorePercent = Math.max(0, Math.min(100, Number(ov.scorePercent)));
        } else if (ov?.actualText !== undefined && ov.actualText !== '') {
          const parsed = parseNumericFromActualString(ov.actualText);
          if (parsed !== null) {
            scorePercent = computeAttainmentAndStatus(parsed, m.targetValue, m.direction).attainmentPct;
          }
        } else {
          scorePercent = computeAttainmentAndStatus(autoVal, m.targetValue, m.direction).attainmentPct;
        }

        const points = Number(((weight * scorePercent) / 100).toFixed(2));

        return {
          ...m,
          name: ov?.name || m.name,
          weight,
          targetText,
          actualText: effectiveActualText,
          scorePercent,
          points,
          evidence,
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
          evidence: 'Chỉ tiêu bổ sung trực tiếp bởi Trưởng phòng QLCL',
          note: '',
          isCustom: true
        };
      });

      const allRoleMetrics = [...resolvedRoleMetrics, ...customRoleMetrics];
      const totalRoleWeight = allRoleMetrics.reduce((s, x) => s + x.weight, 0) || 50;
      const rawRolePoints = allRoleMetrics.reduce((s, x) => s + x.points, 0);
      // Normalize Group 1 to 50 points max
      const roleScore50 = Number(((rawRolePoints / totalRoleWeight) * 50).toFixed(1));

      // 2. Compute Group 2: Daily Logs & Task Completion in Period (Max 30 points)
      const engineerLogs = curLogs.filter(log => {
        if (!log?.assignee) return false;
        const assignees = String(log.assignee)
          .split(',')
          .map(x => normalizePersonKey(x));
        return (
          assignees.includes(staffKey) ||
          profile.aliases.some(al => assignees.includes(normalizePersonKey(al)))
        );
      });

      const totalTasks = engineerLogs.length;
      const isLogDone = (l: any) => {
        const st = String(l?.status || '').toLowerCase();
        return st === 'hoàn thành' || st === 'đã đóng' || st === 'đã xử lý' || st === 'closed';
      };
      const completedTasks = engineerLogs.filter(isLogDone).length;
      const todayYmd = getLocalYmd(new Date());
      const overdueTasks = engineerLogs.filter(l => {
        if (isLogDone(l)) return false;
        const due = l?.dueDate || l?.targetDate;
        return due && String(due) < todayYmd;
      }).length;

      const filterByStage = (keywords: string[]) =>
        engineerLogs.filter(l => {
          const cat = String(l?.category || '').toUpperCase();
          const content = String(l?.content || '').toUpperCase();
          return keywords.some(kw => cat.includes(kw) || content.includes(kw));
        });

      const sqcLogs = filterByStage(['SQC', 'NCC', 'NHÀ CUNG CẤP']);
      const iqcLogs = filterByStage(['IQC', 'ĐẦU VÀO']);
      const pqcLogs = filterByStage(['PQC', 'LẮP RÁP', 'CHUYỀN']);
      const oqcLogs = filterByStage(['OQC', 'KCS', 'THÀNH PHẨM', 'XUẤT XƯỞNG']);
      const csLogs = filterByStage(['CS', 'BẢO HÀNH', 'THỊ TRƯỜNG', 'ĐẠI LÝ']);

      const calcStage = (arr: any[]) => {
        const tot = arr.length;
        const comp = arr.filter(isLogDone).length;
        return { total: tot, completed: comp, rate: tot > 0 ? Math.round((comp / tot) * 100) : 0 };
      };

      const sqcStat = calcStage(sqcLogs);
      const iqcStat = calcStage(iqcLogs);
      const pqcStat = calcStage(pqcLogs);
      const oqcStat = calcStage(oqcLogs);
      const csStat = calcStage(csLogs);

      const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
      const distinctDays = new Set(
        engineerLogs
          .map(l => {
            const d = parseFlexibleDate(l?.date || l?.createdAt);
            return d ? getLocalYmd(d) : '';
          })
          .filter(Boolean)
      ).size;

      // 30 points breakdown: 20 pts completion rate + 10 pts timeliness (minus 2 pts per overdue task)
      const baseCompletionPts = totalTasks > 0 ? (taskCompletionRate / 100) * 20 : 18;
      const timelinessPts = Math.max(0, 10 - overdueTasks * 2);
      const dailyScore30 = Number(Math.min(30, baseCompletionPts + timelinessPts).toFixed(1));

      // 3. Compute Group 3: Manager Evaluation (Max 20 points = 10 responsibility + 10 initiative/5S)
      const mgrResp = savedEval?.managerResponsibilityScore !== undefined ? Number(savedEval.managerResponsibilityScore) : 9;
      const mgrInit = savedEval?.managerInitiativeScore !== undefined ? Number(savedEval.managerInitiativeScore) : 9;
      const managerScore20 = Number(Math.min(20, Math.max(0, mgrResp + mgrInit)).toFixed(1));
      const managerComment = savedEval?.managerComment || '';

      const totalScore100 = Number((roleScore50 + dailyScore30 + managerScore20).toFixed(1));
      const rating =
        totalScore100 >= 90
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
        roleScore50,
        dailyScore30,
        managerScore20,
        mgrResp,
        mgrInit,
        managerComment,
        totalScore100,
        rating,
        hasManagerSaved: Boolean(savedEval),
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
    }).sort((a, b) => b.totalScore100 - a.totalScore100);
  }, [periodInfo, dailyLogs, staffList, staffEvals, autoMetricsMap, deptSummary.normalizedScore]);

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

  const [showAddKpiModal, setShowAddKpiModal] = useState<boolean>(false);
  const [newKpiType, setNewKpiType] = useState<DetailedKPI['type']>('Mục tiêu hoạt động chuyên môn');
  const [newKpiCategory, setNewKpiCategory] = useState<DetailedKPI['category']>('Hệ thống & Hồ sơ');
  const [newKpiWeight, setNewKpiWeight] = useState<number>(5);
  const [newKpiIndicator, setNewKpiIndicator] = useState<string>('');
  const [newKpiDefinition, setNewKpiDefinition] = useState<string>('');
  const [newKpiUnit, setNewKpiUnit] = useState<string>('%');
  const [newKpiTarget, setNewKpiTarget] = useState<string>('>= 95%');
  const [newKpiActual, setNewKpiActual] = useState<string>('100%');

  // Selected Staff for Individual Evaluation Sheet Drawer/Modal
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
    setEditActualInput(kpiItem.effectiveActual || kpiItem.actual);
    setEditStatusInput(kpiItem.effectiveStatus || kpiItem.status || 'Đạt');
    setEditNoteInput(kpiItem.overrideNote || '');
  };

  const handleSaveDeptKpiEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeptKpi) return;
    const pKey = periodInfo.key;

    const nextKpis = kpis.map(k => {
      if (k.id !== editingDeptKpi.id) return k;
      const nextOverrides = { ...(k.periodOverrides || {}) };
      nextOverrides[pKey] = {
        actual: editActualInput.trim(),
        target: editTargetInput.trim(),
        status: editStatusInput,
        note: editNoteInput.trim(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...k,
        indicator: editIndicatorName.trim() || k.indicator,
        definition: editDefinitionInput.trim() || k.definition,
        weight: Number(editWeightInput) || k.weight || 5,
        target: editTargetInput.trim() || k.target,
        actual: editActualInput.trim() || k.actual,
        status: editStatusInput,
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
      direction: newKpiTarget.includes('<=') || newKpiTarget.includes('<') ? 'lower_is_better' : 'higher_is_better',
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

  // Staff Evaluation Updates
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
  // EXPORT EXCEL (CSV UTF-8 BOM) & PRINT / PDF FUNCTIONS (CORPORATE BRANDED)
  // ============================================================================
  const handleExportExcel = () => {
    const rows: string[][] = [
      ['CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT'],
      ['Thương hiệu: DKBike — Slogan: Xe cho cả gia đình'],
      ['Phòng ban: Quản lý chất lượng (QLCL / DK QMS)'],
      [`BÁO CÁO ĐÁNH GIÁ CHỈ TIÊU & KPI PHÒNG QLCL — KỲ: ${periodInfo.label.toUpperCase()} (${periodInfo.rangeText})`],
      [`Tổng điểm KPI Phòng QLCL: ${deptSummary.normalizedScore}/100 điểm — Xếp loại: ${deptSummary.rating}`],
      [],
      ['PHẦN I & II: BẢNG CHỈ TIÊU KPI PHÒNG QLCL (35% MỤC TIÊU CHUNG + 65% MỤC TIÊU CHUYÊN MÔN)'],
      ['Mã KPI', 'Phân nhóm', 'Nhóm mục tiêu', 'Tên chỉ tiêu KPI', 'Nguồn đo', 'Trọng số (%)', 'Chỉ tiêu (Target)', 'Thực tế đạt', 'Tỷ lệ hoàn thành (%)', 'Điểm quy đổi', 'Đánh giá', 'Dẫn chứng dữ liệu / Ghi chú']
    ];

    resolvedDeptKpis.forEach(k => {
      rows.push([
        k.id,
        k.type,
        k.category,
        k.indicator,
        k.sourceType === 'manual' ? 'Nhập tay' : 'Tự động từ App',
        String(k.weight),
        k.effectiveTarget,
        k.effectiveActual,
        `${k.attainmentPct}%`,
        String(k.achievedPoints),
        k.effectiveStatus,
        k.evidenceText || ''
      ]);
    });

    rows.push([]);
    rows.push(['PHẦN III: BẢNG TỔNG HỢP ĐÁNH GIÁ KPI NHÂN SỰ PHÒNG QLCL (THEO BẢN GIAO NHIỆM VỤ /bm & BÁO CÁO NGÀY)']);
    rows.push([
      'STT',
      'Họ và tên nhân sự',
      'Chức danh / Vị trí',
      'Mã văn bản /bm',
      'Điểm Nghiệp vụ /bm (50đ)',
      'Điểm Báo cáo ngày (30đ)',
      'Điểm Trưởng phòng chấm (20đ)',
      'Tổng điểm KPI (/100đ)',
      'Xếp loại KPI',
      'Hoàn thành việc trong kỳ',
      'Nhận xét của Trưởng phòng'
    ]);

    staffEvaluationsComputed.forEach((st, idx) => {
      rows.push([
        String(idx + 1),
        st.profile.staffName,
        st.profile.roleTitle,
        `${st.profile.bmDocCode} / ${st.profile.mtcvCode}`,
        String(st.roleScore50),
        String(st.dailyScore30),
        String(st.managerScore20),
        String(st.totalScore100),
        st.rating,
        `${st.dailyStats.completedTasks}/${st.dailyStats.totalTasks} việc (${st.dailyStats.taskCompletionRate}%)`,
        st.managerComment || 'Đảm bảo tiến độ công việc được giao'
      ]);
    });

    const csvContent =
      '\uFEFF' +
      rows
        .map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DK_QMS_Bao_Cao_KPI_${periodInfo.key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handlePrintKpiReport = () => {
    setShowExportMenu(false);
    window.print();
  };

  // Filtered Department KPIs for Display
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
              Tự động kết nối dữ liệu thực tế từ IQC, PQC, OQC, SQC, CAPA, Thị trường, COPQ, Thiết bị đo & Nhật trình ngày • Chuẩn hóa theo 5 Bản MTCV RACI & 8 Bản giao nhiệm vụ trong <code className="font-bold text-indigo-600">/bm</code>
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

            {/* Export Dropdown */}
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
                    Xuất Excel (.CSV UTF-8)
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
          {/* Card 1: Overall Dept KPI */}
          <div className="rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                ĐIỂM KPI PHÒNG QLCL ({periodInfo.label})
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  deptSummary.normalizedScore >= 90
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
                Kỳ: <strong className="text-slate-700">{periodInfo.rangeText}</strong>
              </p>
            </div>
          </div>

          {/* Card 2: Common Goals 35% */}
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

          {/* Card 3: Professional Goals 65% */}
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

          {/* Card 4: Personnel KPI Average */}
          <div className="rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                HIỆU NĂNG KPI NHÂN SỰ (/bm)
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
            2 MAIN SUB-TABS SWITCHER
        ===================================================================== */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-200">
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
            2. KPI Nhân sự (Theo Bản giao nhiệm vụ /bm & Báo cáo ngày)
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
          {/* Toolbar */}
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

          {/* SECTION I: MỤC TIÊU HOẠT ĐỘNG CHUNG (35%) */}
          {commonKpisFiltered.length > 0 && (
            <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-sky-50/70 border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                    PHẦN I: MỤC TIÊU HOẠT ĐỘNG CHUNG (TỔNG TRỌNG SỐ CHUẨN: 35%)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kiểm soát Chi phí chất lượng COPQ & Ngân sách (15%) • Kế hoạch chất lượng & Hồ sơ QMS /bm (10%) • Kỷ luật báo cáo ngày & 5S (10%)
                  </p>
                </div>
                <div className="px-3 py-1 rounded-xl bg-white border border-sky-200 text-xs font-black text-sky-800">
                  Điểm đạt: {deptSummary.commonAchieved} / {deptSummary.commonMax} điểm
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[950px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4 w-28">Mã / Nhóm</th>
                      <th className="py-3 px-4">Chỉ tiêu KPI & Dẫn chứng dữ liệu kỳ ({periodInfo.label})</th>
                      <th className="py-3 px-3 text-center w-28">Nguồn đo</th>
                      <th className="py-3 px-3 text-center w-20">Trọng số</th>
                      <th className="py-3 px-3 text-center w-28">Chỉ tiêu</th>
                      <th className="py-3 px-3 text-center w-32">Thực tế đạt</th>
                      <th className="py-3 px-3 text-center w-28">Điểm KPI</th>
                      <th className="py-3 px-3 text-center w-28">Đánh giá</th>
                      <th className="py-3 px-4 text-right w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                    {commonKpisFiltered.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-mono font-black text-indigo-700 text-xs">{item.id}</div>
                          <div className="text-[10px] font-bold text-slate-500 mt-0.5">{item.category}</div>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-extrabold text-slate-900 text-xs md:text-[13px] leading-snug">
                            {item.indicator}
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal mt-0.5 leading-relaxed">
                            {item.definition}
                          </div>
                          {item.evidenceText && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>{item.evidenceText}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center align-top">
                          {item.sourceType === 'manual' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                              <Pencil className="w-3 h-3" /> Nhập tay
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                              <Zap className="w-3 h-3" /> Tự động
                            </span>
                          )}
                          {item.isOverridden && (
                            <div className="text-[9px] font-bold text-amber-600 mt-1">Đã chỉnh tay kỳ này</div>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center align-top font-mono font-black text-slate-800">
                          {item.weight}%
                        </td>
                        <td className="py-3.5 px-3 text-center align-top font-mono font-bold text-slate-600">
                          {item.effectiveTarget}
                        </td>
                        <td className="py-3.5 px-3 text-center align-top">
                          <button
                            type="button"
                            onClick={() => openEditDeptKpiModal(item)}
                            title="Bấm để cập nhật số liệu thực tế hoặc ghi chú kỳ này"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 border border-slate-300 hover:border-indigo-400 font-mono font-black text-slate-900 text-xs transition cursor-pointer"
                          >
                            {item.effectiveActual}
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-center align-top">
                          <div className="font-mono font-black text-indigo-700">
                            {item.achievedPoints} / {item.weight}
                          </div>
                          <div className="w-16 mx-auto h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full ${
                                item.attainmentPct >= 95
                                  ? 'bg-emerald-500'
                                  : item.attainmentPct >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${item.attainmentPct}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center align-top">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              item.effectiveStatus === 'Đạt'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.effectiveStatus === 'Theo dõi'
                                ? 'bg-amber-100 text-amber-800'
                                : item.effectiveStatus === 'Đang cải tiến'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.effectiveStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right align-top">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditDeptKpiModal(item)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 transition cursor-pointer"
                              title="Chỉnh sửa chỉ tiêu / Nhập kết quả kỳ"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {onViewDetail && (
                              <button
                                type="button"
                                onClick={() => onViewDetail(item)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!item.id.startsWith('KPI-COM-0') && !item.id.startsWith('KPI-PRO-0') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDeptKpi(item.id)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                                title="Xóa chỉ tiêu tùy chỉnh"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          )}

          {/* SECTION II: MỤC TIÊU HOẠT ĐỘNG CHUYÊN MÔN (65%) */}
          {proKpisFiltered.length > 0 && (
            <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-emerald-50/70 border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    PHẦN II: MỤC TIÊU HOẠT ĐỘNG CHUYÊN MÔN QLCL (TỔNG TRỌNG SỐ CHUẨN: 65%)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Chất lượng NCC & IQC (15%) • Kiểm soát lắp ráp PQC & Nghiệm thu OQC/KCS (25%) • Thị trường & Bảo hành (15%) • Thiết bị đo lường (10%)
                  </p>
                </div>
                <div className="px-3 py-1 rounded-xl bg-white border border-emerald-200 text-xs font-black text-emerald-800">
                  Điểm đạt: {deptSummary.proAchieved} / {deptSummary.proMax} điểm
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[950px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4 w-28">Mã / Nhóm</th>
                      <th className="py-3 px-4">Chỉ tiêu KPI Chuyên môn & Dẫn chứng dữ liệu kỳ ({periodInfo.label})</th>
                      <th className="py-3 px-3 text-center w-28">Nguồn đo</th>
                      <th className="py-3 px-3 text-center w-20">Trọng số</th>
                      <th className="py-3 px-3 text-center w-28">Chỉ tiêu</th>
                      <th className="py-3 px-3 text-center w-32">Thực tế đạt</th>
                      <th className="py-3 px-3 text-center w-28">Điểm KPI</th>
                      <th className="py-3 px-3 text-center w-28">Đánh giá</th>
                      <th className="py-3 px-4 text-right w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                    {proKpisFiltered.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-mono font-black text-emerald-700 text-xs">{item.id}</div>
                          <div className="text-[10px] font-bold text-slate-500 mt-0.5">{item.category}</div>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-extrabold text-slate-900 text-xs md:text-[13px] leading-snug">
                            {item.indicator}
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal mt-0.5 leading-relaxed">
                            {item.definition}
                          </div>
                          {item.evidenceText && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 text-[11px] font-bold">
                              <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{item.evidenceText}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center align-top">
                          {item.sourceType === 'manual' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                              <Pencil className="w-3 h-3" /> Nhập tay
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                              <Zap className="w-3 h-3" /> Tự động
                            </span>
                          )}
                          {item.isOverridden && (
                            <div className="text-[9px] font-bold text-amber-600 mt-1">Đã chỉnh tay kỳ này</div>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center align-top font-mono font-black text-slate-800">
                          {item.weight}%
                        </td>
                        <td className="py-3.5 px-3 text-center align-top font-mono font-bold text-slate-600">
                          {item.effectiveTarget}
                        </td>
                        <td className="py-3.5 px-3 text-center align-top">
                          <button
                            type="button"
                            onClick={() => openEditDeptKpiModal(item)}
                            title="Bấm để cập nhật số liệu thực tế hoặc ghi chú kỳ này"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 border border-slate-300 hover:border-emerald-400 font-mono font-black text-slate-900 text-xs transition cursor-pointer"
                          >
                            {item.effectiveActual}
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-center align-top">
                          <div className="font-mono font-black text-emerald-700">
                            {item.achievedPoints} / {item.weight}
                          </div>
                          <div className="w-16 mx-auto h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full ${
                                item.attainmentPct >= 95
                                  ? 'bg-emerald-500'
                                  : item.attainmentPct >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${item.attainmentPct}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center align-top">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              item.effectiveStatus === 'Đạt'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.effectiveStatus === 'Theo dõi'
                                ? 'bg-amber-100 text-amber-800'
                                : item.effectiveStatus === 'Đang cải tiến'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.effectiveStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right align-top">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditDeptKpiModal(item)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 transition cursor-pointer"
                              title="Chỉnh sửa chỉ tiêu / Nhập kết quả kỳ"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {onViewDetail && (
                              <button
                                type="button"
                                onClick={() => onViewDetail(item)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!item.id.startsWith('KPI-COM-0') && !item.id.startsWith('KPI-PRO-0') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDeptKpi(item.id)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                                title="Xóa chỉ tiêu tùy chỉnh"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: KPI NHÂN SỰ (GỘP BẢNG XẾP HẠNG + PHIẾU KPI CÁ NHÂN BÁM SÁT /bm)
      ========================================================================= */}
      {activeSubTab === 'staff_kpi' && (
        <div className="space-y-6">
          {/* Master Ranking & Summary Table for All 8 Personnel */}
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-200 pb-3.5 mb-4">
              <div>
                <h3 className="text-sm md:text-base font-black uppercase text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  BẢNG XẾP HẠNG & ĐÁNH GIÁ TỔNG HỢP KPI NHÂN SỰ PHÒNG QLCL — KỲ {periodInfo.label.toUpperCase()}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tổng điểm 100 = <strong>50đ Chỉ tiêu Nghiệp vụ theo Bản giao nhiệm vụ (<code className="text-indigo-600">/bm</code>)</strong> + <strong>30đ Kỷ luật Báo cáo ngày & Công việc</strong> + <strong>20đ Trưởng phòng Đánh giá</strong>. Bấm vào từng nhân sự để xem và chấm Phiếu KPI chi tiết.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Căn cứ: 5 MTCV RACI & 8 Bản giao nhiệm vụ (/bm)</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[1020px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">Hạng</th>
                    <th className="py-3 px-3">Nhân sự & Chức danh (/bm)</th>
                    <th className="py-3 px-3 text-center">Mã Văn bản /bm</th>
                    <th className="py-3 px-3 text-center bg-indigo-50/40 text-indigo-900">
                      1. Nghiệp vụ /bm (50đ)
                    </th>
                    <th className="py-3 px-3 text-center bg-sky-50/40 text-sky-900">
                      2. Báo cáo ngày (30đ)
                    </th>
                    <th className="py-3 px-3 text-center">Hiệu năng Khâu (SQC/IQC/PQC/OQC)</th>
                    <th className="py-3 px-3 text-center bg-amber-50/40 text-amber-900">
                      3. Trưởng phòng (20đ)
                    </th>
                    <th className="py-3 px-3 text-center font-black text-slate-900">Tổng KPI (/100)</th>
                    <th className="py-3 px-3 text-center">Xếp loại</th>
                    <th className="py-3 px-3 text-right">Phiếu KPI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                  {staffEvaluationsComputed.map((item, idx) => {
                    const isSelected = selectedStaffComputed?.staffKey === item.staffKey;
                    const ds = item.dailyStats;
                    return (
                      <tr
                        key={item.staffKey}
                        onClick={() => setSelectedStaffKey(item.staffKey)}
                        className={`transition cursor-pointer ${
                          isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black ${
                              idx === 0
                                ? 'bg-amber-400 text-slate-950'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-900'
                                : idx === 2
                                ? 'bg-amber-700/20 text-amber-900'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900 text-xs md:text-[13px] flex items-center gap-1.5">
                            {item.profile.staffName}
                            {isSelected && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-black uppercase">
                                Đang mở phiếu
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal">{item.profile.roleTitle}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 font-mono text-[10px] font-extrabold text-slate-800">
                            {item.profile.bmDocCode}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">{item.profile.mtcvCode}</div>
                        </td>
                        <td className="py-3 px-3 text-center bg-indigo-50/20 font-mono font-black text-indigo-700">
                          {item.roleScore50} / 50
                        </td>
                        <td className="py-3 px-3 text-center bg-sky-50/20">
                          <div className="font-mono font-black text-sky-700">{item.dailyScore30} / 30</div>
                          <div className="text-[10px] text-slate-500">
                            {ds.completedTasks}/{ds.totalTasks} việc ({ds.taskCompletionRate}%)
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {ds.sqcStat.total > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                                SQC: {ds.sqcStat.rate}%
                              </span>
                            )}
                            {ds.iqcStat.total > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-bold">
                                IQC: {ds.iqcStat.rate}%
                              </span>
                            )}
                            {ds.pqcStat.total > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold">
                                PQC: {ds.pqcStat.rate}%
                              </span>
                            )}
                            {ds.oqcStat.total > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                OQC: {ds.oqcStat.rate}%
                              </span>
                            )}
                            {ds.csStat.total > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold">
                                BH: {ds.csStat.rate}%
                              </span>
                            )}
                            {ds.totalTasks === 0 && (
                              <span className="text-[10px] text-slate-400 italic">Theo chỉ tiêu /bm</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center bg-amber-50/20">
                          <div className="font-mono font-black text-amber-700">{item.managerScore20} / 20</div>
                          <div className="text-[9px] text-slate-400">
                            {item.hasManagerSaved ? 'Đã chấm kỳ này' : 'Mặc định (18đ)'}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center bg-slate-50 font-mono font-black text-sm text-indigo-800">
                          {item.totalScore100}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              item.rating === 'Xuất sắc'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.rating === 'Tốt'
                                ? 'bg-indigo-100 text-indigo-800'
                                : item.rating === 'Khá'
                                ? 'bg-sky-100 text-sky-800'
                                : item.rating === 'Trung bình'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.rating}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedStaffKey(item.staffKey);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700'
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

          {/* Individual Staff KPI Evaluation Sheet (Phiếu Đánh giá KPI Cá nhân theo /bm) */}
          {selectedStaffComputed && (
            <div className="bg-white border-2 border-indigo-300 rounded-2xl p-5 shadow-sm space-y-5">
              {/* Sheet Header */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black uppercase">
                      PHIẾU ĐÁNH GIÁ KPI CÁ NHÂN • KỲ {periodInfo.label.toUpperCase()}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 font-mono text-[11px] font-extrabold text-slate-800">
                      Văn bản /bm: {selectedStaffComputed.profile.bmDocCode}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 font-mono text-[11px] font-bold text-emerald-800">
                      Ma trận RACI: {selectedStaffComputed.profile.mtcvCode}
                    </span>
                  </div>
                  <h3 className="text-base md:text-lg font-black text-slate-900">
                    {selectedStaffComputed.profile.staffName} —{' '}
                    <span className="text-indigo-700">{selectedStaffComputed.profile.roleTitle}</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">{selectedStaffComputed.profile.summary}</p>
                </div>

                <div className="flex items-center gap-3 bg-indigo-50/70 px-4 py-3 rounded-2xl border border-indigo-200 shrink-0">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase text-indigo-600">
                      TỔNG ĐIỂM KPI CÁ NHÂN
                    </div>
                    <div className="text-2xl font-black text-indigo-900 font-mono">
                      {selectedStaffComputed.totalScore100} <span className="text-xs font-bold">/ 100 điểm</span>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
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
                    <h4 className="text-xs md:text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      I. CHỈ TIÊU NGHIỆP VỤ CHUYÊN MÔN THEO BẢN GIAO NHIỆM VỤ /bm (TRỌNG SỐ: 50 ĐIỂM)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Tự động lấy số liệu từ các phân hệ chuyên môn trong App. Anh Thao có thể chỉnh sửa trực tiếp kết quả thực tế, % hoàn thành hoặc thêm chỉ tiêu riêng cho nhân sự.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 font-mono text-xs font-black text-indigo-800">
                      Đạt: {selectedStaffComputed.roleScore50} / 50 điểm
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddStaffMetricModal(true)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm chỉ tiêu riêng
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs min-w-[820px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[10px] uppercase">
                        <th className="py-2.5 px-3">Chỉ tiêu Nghiệp vụ & Căn cứ (/bm)</th>
                        <th className="py-2.5 px-3 text-center w-24">Trọng số</th>
                        <th className="py-2.5 px-3 text-center w-28">Chỉ tiêu</th>
                        <th className="py-2.5 px-3 text-center w-36">Thực tế đạt (App / Sửa)</th>
                        <th className="py-2.5 px-3 text-center w-32">% Hoàn thành</th>
                        <th className="py-2.5 px-3 text-center w-24">Điểm đạt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                      {selectedStaffComputed.allRoleMetrics.map((m: any) => (
                        <tr key={m.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-3">
                            <div className="font-extrabold text-slate-900">{m.name}</div>
                            <div className="text-[11px] text-indigo-600 font-bold mt-0.5">{m.bmReference}</div>
                            <div className="text-[11px] text-slate-500 font-normal mt-0.5">{m.evidence}</div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-black text-slate-800">
                            {m.weight}đ
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600">{m.targetText}</td>
                          <td className="py-3 px-3 text-center">
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
                              className="w-28 px-2 py-1 text-center bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                            />
                          </td>
                          <td className="py-3 px-3 text-center">
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
                                className="w-16 px-2 py-1 text-center bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs text-indigo-700 focus:outline-none focus:border-indigo-500"
                              />
                              <span className="text-xs font-bold text-slate-500">%</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-mono font-black text-indigo-700">
                                {m.points} / {m.weight}
                              </span>
                              {m.isCustom && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteCustomStaffMetric(selectedStaffComputed.staffKey, m.id)
                                  }
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                                  title="Xóa chỉ tiêu riêng này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
                {/* Group 2: 30% Daily Logs & Task Completion */}
                <div className="bg-sky-50/50 border border-sky-200 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="text-xs font-black uppercase text-sky-950 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-600" />
                        II. ĐIỂM BÁO CÁO NGÀY & CÔNG VIỆC (TỰ ĐỘNG: 30 ĐIỂM)
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-lg bg-white border border-sky-200 font-mono text-xs font-black text-sky-800">
                        {selectedStaffComputed.dailyScore30} / 30 điểm
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mb-3">
                      Tự động tổng hợp từ Nhật trình báo cáo chất lượng hàng ngày (<code className="text-sky-700">dk_daily_logs</code>) trong kỳ {periodInfo.label}:
                    </p>

                    <div className="grid grid-cols-3 gap-2.5 mb-3">
                      <div className="bg-white p-2.5 rounded-lg border border-sky-100 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Tổng việc trong kỳ</div>
                        <div className="text-base font-black text-slate-800 mt-0.5">
                          {selectedStaffComputed.dailyStats.totalTasks} việc
                        </div>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-sky-100 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Đã hoàn thành</div>
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
                        <div className="text-slate-400">SQC</div>
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

                {/* Group 3: 20% Department Head Evaluation */}
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

              <div className="grid grid-cols-3 gap-3">
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
                  <label className="block font-extrabold text-slate-700 mb-1">Mục tiêu (Target)</label>
                  <input
                    type="text"
                    value={editTargetInput}
                    onChange={e => setEditTargetInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Thực tế đạt ({periodInfo.label})
                  </label>
                  <input
                    type="text"
                    value={editActualInput}
                    onChange={e => setEditActualInput(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-indigo-400 rounded-lg font-mono font-black text-indigo-900 bg-indigo-50/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Trạng thái đánh giá</label>
                  <select
                    value={editStatusInput}
                    onChange={e => setEditStatusInput(e.target.value as DetailedKPI['status'])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800"
                  >
                    <option value="Đạt">Đạt</option>
                    <option value="Theo dõi">Theo dõi</option>
                    <option value="Đang cải tiến">Đang cải tiến</option>
                    <option value="Không đạt">Không đạt</option>
                  </select>
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
