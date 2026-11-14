import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Filter,
  MessageSquarePlus,
  Minus,
  Plus,
  Printer,
  Trash2,
  X
} from 'lucide-react';
import { ReportNote } from '../types';
import {
  buildReportSnapshot,
  formatDateShortVi,
  formatDateStrVi,
  getIsoWeekInfo,
  getIsoWeekRange,
  getIsoWeeksInYear,
  getPeriodDescriptor,
  parseFlexibleDate,
  ReportDatasetInput,
  ReportPeriodType,
  stepPeriod
} from './reportEngine';
import { ParetoSvgChart, PChartSvg, QIndexGauge } from './reportCharts';
import { exportReportToExcel } from './reportExportExcel';
import { buildSummaryCopyText, printReportA4 } from './reportExportPrint';

type ReportSubTab = 'overview' | 'production' | 'market' | 'capa_eco' | 'work' | 'qc_tools';

export interface ReportsHubProps {
  initialPeriodType: ReportPeriodType;
  dataset: ReportDatasetInput;
  authorName: string;
  onSaveNote: (note: ReportNote) => boolean;
  onDeleteNote: (id: string) => void;
  onOpenAddWeekTask: () => void;
  onNavigateTab: (tab: string) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const DeltaBadge: React.FC<{
  delta: number;
  unit?: string;
  inverseGood?: boolean;
}> = ({ delta, unit = '%', inverseGood = false }) => {
  if (Math.abs(delta) < 0.05) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-500">
        <Minus className="w-3.5 h-3.5" /> 0{unit} so kỳ trước
      </span>
    );
  }
  const isPositive = delta > 0;
  const isGood = inverseGood ? !isPositive : isPositive;
  const color = isGood ? 'text-emerald-700' : 'text-rose-700';
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {isPositive ? '+' : ''}
      {unit === 'đ' ? Math.round(delta).toLocaleString('vi-VN') : delta.toFixed(1)}
      {unit} so kỳ trước
    </span>
  );
};

export const ReportsHub: React.FC<ReportsHubProps> = ({
  initialPeriodType,
  dataset,
  authorName,
  onSaveNote,
  onDeleteNote,
  onOpenAddWeekTask,
  onNavigateTab,
  onToast
}) => {
  const now = useMemo(() => new Date(), []);
  const currentIso = useMemo(() => getIsoWeekInfo(now), [now]);

  const [periodType, setPeriodType] = useState<ReportPeriodType>(initialPeriodType);
  const [year, setYear] = useState<number>(
    initialPeriodType === 'week' ? currentIso.isoYear : now.getFullYear()
  );
  const [periodValue, setPeriodValue] = useState<number>(
    initialPeriodType === 'week' ? currentIso.isoWeek : now.getMonth() + 1
  );
  const [subTab, setSubTab] = useState<ReportSubTab>('overview');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync mode when user clicks top sidebar Weekly vs Monthly Reports
  useEffect(() => {
    setPeriodType(initialPeriodType);
    if (initialPeriodType === 'week') {
      setYear(currentIso.isoYear);
      setPeriodValue(currentIso.isoWeek);
    } else {
      setYear(now.getFullYear());
      setPeriodValue(now.getMonth() + 1);
    }
  }, [initialPeriodType, currentIso.isoYear, currentIso.isoWeek, now]);

  // Dynamic year options based on actual data + current year window
  const yearOptions = useMemo(() => {
    const years = new Set<number>([now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]);
    const scan = (dates: (string | undefined)[]) => {
      for (const s of dates) {
        const d = parseFlexibleDate(s);
        if (d) years.add(d.getFullYear());
      }
    };
    scan(dataset.oqcRecords.map((r) => r.date));
    scan(dataset.iqcRecords.map((r) => r.date));
    scan(dataset.defects.map((r) => r.defectDate));
    scan(dataset.partEvaluations.map((r) => r.receivedDate));
    scan(dataset.dailyLogs.map((r) => r.date));
    return Array.from(years).sort((a, b) => b - a);
  }, [dataset, now]);

  const weeksInYear = useMemo(() => {
    const count = getIsoWeeksInYear(year);
    return Array.from({ length: count }, (_, idx) => {
      const week = idx + 1;
      const { start, end } = getIsoWeekRange(year, week);
      return {
        week,
        label: `Tuần ${String(week).padStart(2, '0')} (${formatDateShortVi(start).slice(0, 5)} – ${formatDateShortVi(end).slice(0, 5)})`
      };
    });
  }, [year]);

  const period = useMemo(
    () => getPeriodDescriptor(periodType, year, periodValue),
    [periodType, year, periodValue]
  );

  const snapshot = useMemo(() => buildReportSnapshot(dataset, period), [dataset, period]);

  // Note Modal state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteSummary, setNoteSummary] = useState('');
  const [noteHighlights, setNoteHighlights] = useState('');
  const [noteNextActions, setNoteNextActions] = useState('');

  const openNoteModal = () => {
    setNoteSummary(snapshot.note?.summary || '');
    setNoteHighlights(snapshot.note?.highlights || '');
    setNoteNextActions(snapshot.note?.nextActions || '');
    setShowNoteModal(true);
  };

  const handleSaveNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteSummary.trim()) {
      onToast('Vui lòng nhập nội dung nhận xét chung của QLCL.', 'error');
      return;
    }
    const existing = snapshot.note;
    const payload: ReportNote = {
      id: existing?.id || period.id,
      periodType: period.type,
      year: period.year,
      isoWeek: period.type === 'week' ? period.value : undefined,
      month: period.type === 'month' ? period.value : undefined,
      summary: noteSummary.trim(),
      highlights: noteHighlights.trim(),
      nextActions: noteNextActions.trim(),
      author: authorName || 'QLCL',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const ok = onSaveNote(payload);
    if (ok) {
      setShowNoteModal(false);
      onToast(`Đã lưu nhận xét QLCL cho ${period.label}`, 'success');
    }
  };

  const handleDeleteCurrentNote = () => {
    if (!snapshot.note) return;
    onDeleteNote(snapshot.note.id);
    setShowNoteModal(false);
    onToast(`Đã xóa nhận xét cho ${period.label}`, 'info');
  };

  const handleModeChange = (nextType: ReportPeriodType) => {
    setPeriodType(nextType);
    if (nextType === 'week') {
      setYear(currentIso.isoYear);
      setPeriodValue(currentIso.isoWeek);
    } else {
      setYear(now.getFullYear());
      setPeriodValue(now.getMonth() + 1);
    }
  };

  const handleStep = (delta: -1 | 1) => {
    const next = stepPeriod(periodType, year, periodValue, delta);
    setYear(next.year);
    setPeriodValue(next.value);
  };

  const handleResetCurrent = () => {
    if (periodType === 'week') {
      setYear(currentIso.isoYear);
      setPeriodValue(currentIso.isoWeek);
    } else {
      setYear(now.getFullYear());
      setPeriodValue(now.getMonth() + 1);
    }
  };

  const handleCopySummary = async () => {
    const text = buildSummaryCopyText(snapshot);
    try {
      await navigator.clipboard.writeText(text);
      onToast('Đã copy tóm tắt báo cáo (sẵn sàng dán vào Zalo).', 'success');
    } catch {
      onToast('Không thể truy cập clipboard trên trình duyệt này.', 'error');
    }
  };

  const qFilter = searchQuery.trim().toLowerCase();
  const { qIndex, kpis, production, market, capaEco, work, qcTools } = snapshot;

  const tabs: { id: ReportSubTab; label: string }[] = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'production', label: 'SX & Chất lượng' },
    { id: 'market', label: 'Thị trường & LK' },
    { id: 'capa_eco', label: 'CAPA & ECO' },
    { id: 'work', label: 'Công việc' },
    { id: 'qc_tools', label: 'Công cụ QC (4)' }
  ];

  const renderQlclNoteCard = (extraClass = '') => (
    <div
      className={`bg-white rounded-2xl border-2 border-blue-300 p-5 shadow-sm flex flex-col justify-between ${extraClass}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-base font-extrabold text-slate-900">
              Nhận xét & Kết luận QLCL
            </span>
          </div>
          <button
            type="button"
            onClick={openNoteModal}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
          >
            {snapshot.note ? 'Sửa nhận xét' : 'Viết nhận xét'}
          </button>
        </div>

        {snapshot.note ? (
          <div className="space-y-2 text-sm text-slate-800">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 font-medium">
              {snapshot.note.summary}
            </div>
            {snapshot.note.highlights && (
              <div className="text-xs text-slate-700">
                <span className="font-bold text-emerald-700">Điểm nhấn: </span>
                {snapshot.note.highlights}
              </div>
            )}
            {snapshot.note.nextActions && (
              <div className="text-xs text-slate-700">
                <span className="font-bold text-blue-700">Kế hoạch kỳ tới: </span>
                {snapshot.note.nextActions}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 text-center">
            Chưa có nhận xét QLCL cho {period.label}. Bấm <strong>Viết nhận xét</strong> để bổ sung kết luận trước khi xuất báo cáo.
          </div>
        )}
      </div>

      {snapshot.note && (
        <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Người lập: {snapshot.note.author}</span>
          <span>Cập nhật: {new Date(snapshot.note.updatedAt).toLocaleString('vi-VN')}</span>
        </div>
      )}
    </div>
  );

  return (
    <div
      id={periodType === 'week' ? 'view_weekly_reports_content' : 'view_monthly_reports_content'}
      className="space-y-4 pb-10"
    >
      {/* Top Control & Action Bar */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Mode & Period Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border-2 border-slate-300 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => handleModeChange('week')}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition ${
                  periodType === 'week'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                Theo Tuần
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('month')}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition ${
                  periodType === 'month'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                Theo Tháng
              </button>
            </div>

            <select
              value={year}
              onChange={(e) => {
                const nextY = Number(e.target.value);
                setYear(nextY);
                if (periodType === 'week') {
                  const maxW = getIsoWeeksInYear(nextY);
                  if (periodValue > maxW) setPeriodValue(maxW);
                }
              }}
              aria-label="Chọn năm báo cáo"
              className="px-3 py-2 rounded-xl border-2 border-slate-300 bg-white text-sm font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>

            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStep(-1)}
                title="Kỳ trước"
                className="p-2 rounded-xl border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {periodType === 'week' ? (
                <select
                  value={period.value}
                  onChange={(e) => setPeriodValue(Number(e.target.value))}
                  aria-label="Chọn tuần ISO"
                  className="px-3 py-2 rounded-xl border-2 border-slate-300 bg-white text-sm font-bold text-slate-800 focus:border-blue-600 focus:outline-none max-w-[250px]"
                >
                  {weeksInYear.map((w) => (
                    <option key={w.week} value={w.week}>
                      {w.label}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={period.value}
                  onChange={(e) => setPeriodValue(Number(e.target.value))}
                  aria-label="Chọn tháng"
                  className="px-3 py-2 rounded-xl border-2 border-slate-300 bg-white text-sm font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                    <option key={m} value={m}>
                      Tháng {String(m).padStart(2, '0')}/{year}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => handleStep(1)}
                title="Kỳ sau"
                className="p-2 rounded-xl border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetCurrent}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-slate-300 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              <Calendar className="w-3.5 h-3.5" /> Kỳ hiện tại
            </button>
          </div>

          {/* Right: 1-Click Actions (màu đồng nhất, đơn giản) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportReportToExcel(snapshot, onToast)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold"
            >
              <Download className="w-4 h-4" /> Xuất Excel
            </button>
            <button
              type="button"
              onClick={() => printReportA4(snapshot, onToast)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold"
            >
              <Printer className="w-4 h-4" /> In / PDF
            </button>
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold"
            >
              <Copy className="w-4 h-4" /> Copy
            </button>
            <button
              type="button"
              onClick={openNoteModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold"
            >
              <MessageSquarePlus className="w-4 h-4" /> Nhận xét QLCL
            </button>
            <button
              type="button"
              onClick={onOpenAddWeekTask}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-blue-600 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> Bổ sung việc
            </button>
          </div>
        </div>

        {/* Period Banner & Sub-Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-extrabold text-slate-900 text-sm">{period.label}</span>
            <span>({period.rangeLabel} — Chuẩn ISO 8601)</span>
            {snapshot.missingDateCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300">
                <AlertTriangle className="w-3 h-3" /> {snapshot.missingDateCount} bản ghi thiếu ngày
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`px-3.5 py-1.5 rounded-xl text-sm font-bold border-2 transition ${
                  subTab === t.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== TAB 1: TỔNG QUAN ==================== */}
      {subTab === 'overview' && (
        <div className="space-y-4">
          {/* Q-Index + Note Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Q-Index Card */}
            <div className="lg:col-span-7 bg-white rounded-2xl border-2 border-slate-300 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <QIndexGauge score={qIndex.score} grade={qIndex.grade} />
                <div className="flex-1 w-full space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-extrabold text-slate-900">
                      Chỉ số chất lượng tổng hợp (Q-Index)
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      Trọng số hiệu lực: {qIndex.activeWeightSum}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{qIndex.formulaText}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {qIndex.components.map((c) => (
                      <div
                        key={c.key}
                        className="flex items-center justify-between px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{c.label}</span>
                          <span className="text-slate-500 ml-1">({c.weight}%)</span>
                          <div className="text-[11px] text-slate-500">{c.detail}</div>
                        </div>
                        <span
                          className={`text-sm font-extrabold ${
                            c.score === null
                              ? 'text-slate-400'
                              : c.score >= 85
                                ? 'text-emerald-700'
                                : c.score >= 70
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                          }`}
                        >
                          {c.score === null ? '--' : `${c.score.toFixed(0)}đ`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* QLCL Note Card */}
            {renderQlclNoteCard('lg:col-span-5')}
          </div>

          {/* 8 Large-Number KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-500">Tỷ lệ đạt OQC</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">
                {kpis.oqcYield.total > 0 ? `${kpis.oqcYield.current.toFixed(1)}%` : '--'}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Đạt {kpis.oqcYield.passed}/{kpis.oqcYield.total} xe | Lỗi: {kpis.oqcYield.failed}
              </div>
              <div className="mt-2">
                <DeltaBadge delta={kpis.oqcYield.delta} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-500">Tỷ lệ đạt lô IQC</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">
                {kpis.iqcPassRate.total > 0 ? `${kpis.iqcPassRate.current.toFixed(1)}%` : '--'}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Đạt {kpis.iqcPassRate.passed}/{kpis.iqcPassRate.total} lô | Lỗi: {kpis.iqcPassRate.failed}
              </div>
              <div className="mt-2">
                <DeltaBadge delta={kpis.iqcPassRate.delta} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-500">Xử lý PQC</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">
                {kpis.pqcResolveRate.total > 0 ? `${kpis.pqcResolveRate.current.toFixed(1)}%` : '--'}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Đã xử lý {kpis.pqcResolveRate.resolved}/{kpis.pqcResolveRate.total} điểm
              </div>
              <div className="mt-2">
                <DeltaBadge delta={kpis.pqcResolveRate.delta} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-500">Xử lý Thị trường</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">
                {kpis.marketResolveRate.total > 0
                  ? `${kpis.marketResolveRate.current.toFixed(1)}%`
                  : '--'}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Đóng {kpis.marketResolveRate.resolved}/{kpis.marketResolveRate.total} | Lỗi A:{' '}
                <span className={kpis.marketResolveRate.sevA > 0 ? 'font-bold text-rose-700' : ''}>
                  {kpis.marketResolveRate.sevA}
                </span>
              </div>
              <div className="mt-2">
                <DeltaBadge delta={kpis.marketResolveRate.delta} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-500">LK lỗi thẩm định</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">
                {kpis.partEvalQty.current}
                <span className="text-base font-bold text-slate-500 ml-1">chiếc</span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {kpis.partEvalQty.records} biên bản | NCC {kpis.partEvalQty.nccPct.toFixed(0)}%
              </div>
              <div className="mt-2">
                <DeltaBadge delta={kpis.partEvalQty.delta} unit=" chiếc" inverseGood />
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-500">CAPA mở / Quá hạn</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">
                {kpis.capaOpen.total}
                <span className="text-lg font-extrabold text-rose-600 ml-2">
                  ({kpis.capaOpen.overdue} trễ)
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Đóng kỳ này: {kpis.capaOpen.closedInPeriod} | Hiệu quả: {kpis.capaOpen.effectiveCount}
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">
                Theo dõi khắc phục phòng ngừa
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-500">Tuân thủ Báo ngày</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">
                {kpis.dailyCompliance.total > 0
                  ? `${kpis.dailyCompliance.current.toFixed(1)}%`
                  : '--'}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Xong {kpis.dailyCompliance.completed}/{kpis.dailyCompliance.total} việc | Tồn kỳ trước:{' '}
                {kpis.dailyCompliance.pendingCount}
              </div>
              <div className="mt-2">
                <DeltaBadge delta={kpis.dailyCompliance.delta} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-500">Chi phí COPQ</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">
                {kpis.copqAmount.current.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Kỳ trước: {kpis.copqAmount.previous.toLocaleString('vi-VN')} đ
              </div>
              <div className="mt-2">
                <DeltaBadge delta={kpis.copqAmount.delta} unit="đ" inverseGood />
              </div>
            </div>
          </div>

          {/* Điểm sáng - Cảnh báo - Việc cần làm */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border-2 border-emerald-300 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-800 mb-3">
                <CheckCircle2 className="w-4 h-4" /> Điểm sáng trong kỳ ({snapshot.highlights.length})
              </div>
              <div className="space-y-2">
                {snapshot.highlights.length > 0 ? (
                  snapshot.highlights.map((h) => (
                    <div key={h.id} className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="text-xs font-bold text-emerald-900">{h.title}</div>
                      <div className="text-xs text-emerald-700 mt-0.5">{h.detail}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">Chưa có điểm sáng nổi bật trong kỳ này.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-rose-300 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-extrabold text-rose-800 mb-3">
                <AlertTriangle className="w-4 h-4" /> Cảnh báo chất lượng ({snapshot.warnings.length})
              </div>
              <div className="space-y-2">
                {snapshot.warnings.length > 0 ? (
                  snapshot.warnings.map((w) => (
                    <div key={w.id} className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-rose-900">{w.title}</span>
                        {w.targetTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateTab(w.targetTab!)}
                            className="text-[11px] font-bold text-blue-700 hover:underline inline-flex items-center gap-0.5 shrink-0"
                          >
                            Mở <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-rose-700 mt-0.5">{w.detail}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">Không có cảnh báo bất thường trong kỳ.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-amber-300 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-extrabold text-amber-800 mb-3">
                <ArrowRight className="w-4 h-4" /> Việc cần làm ngay ({snapshot.recommendedActions.length})
              </div>
              <div className="space-y-2">
                {snapshot.recommendedActions.length > 0 ? (
                  snapshot.recommendedActions.map((a) => (
                    <div key={a.id} className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-amber-900">{a.title}</span>
                        {a.targetTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateTab(a.targetTab!)}
                            className="text-[11px] font-bold text-blue-700 hover:underline inline-flex items-center gap-0.5 shrink-0"
                          >
                            Xử lý <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-amber-800 mt-0.5">{a.detail}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">Không có tồn đọng khẩn cấp trong kỳ.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: SX & CHẤT LƯỢNG ==================== */}
      {subTab === 'production' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* OQC by Model */}
            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900 mb-3">
                OQC theo Dòng xe (Tỷ lệ đạt)
              </div>
              {production.oqcByModel.length === 0 ? (
                <p className="text-xs text-slate-500">Không phát sinh dữ liệu OQC trong kỳ.</p>
              ) : (
                <div className="space-y-2">
                  {production.oqcByModel.slice(0, 8).map((m) => (
                    <div
                      key={m.name}
                      className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{m.name}</div>
                        <div className="text-slate-500">
                          Kiểm: {m.count} xe | Lỗi: {m.failed || 0}
                        </div>
                      </div>
                      <span
                        className={`text-sm font-extrabold ${
                          m.rate >= 95
                            ? 'text-emerald-700'
                            : m.rate >= 88
                              ? 'text-amber-700'
                              : 'text-rose-700'
                        }`}
                      >
                        {m.rate.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* OQC Root Causes */}
            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900 mb-3">
                OQC Lỗi theo Nguồn gốc
              </div>
              {production.oqcByRootCause.length === 0 ? (
                <p className="text-xs text-slate-500">Không phát sinh xe lỗi OQC trong kỳ.</p>
              ) : (
                <div className="space-y-2">
                  {production.oqcByRootCause.map((r) => (
                    <div
                      key={r.name}
                      className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <span className="font-bold text-slate-800">{r.name}</span>
                      <span className="font-extrabold text-rose-700">
                        {r.count} xe ({r.pct.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* IQC by Supplier */}
            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900 mb-3">
                IQC theo Nhà cung cấp
              </div>
              {production.iqcBySupplier.length === 0 ? (
                <p className="text-xs text-slate-500">Không phát sinh phiếu IQC trong kỳ.</p>
              ) : (
                <div className="space-y-2">
                  {production.iqcBySupplier.slice(0, 8).map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-slate-500">
                          {s.count} lô | Lỗi: {s.failed || 0}
                        </div>
                      </div>
                      <span
                        className={`text-sm font-extrabold ${
                          s.rate >= 95 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {s.rate.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search Toggle + Failed OQC Table */}
          <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-extrabold text-slate-900">
                Danh sách xe lỗi OQC trong kỳ ({production.oqcFailedRecords.length})
              </div>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Filter className="w-3.5 h-3.5" /> {showFilters ? 'Ẩn lọc' : 'Hiện bộ lọc'}
              </button>
            </div>
            {showFilters && (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo dòng xe, LSX, số khung, lỗi..."
                className="w-full sm:w-80 px-3 py-2 rounded-xl border-2 border-slate-300 text-sm focus:border-blue-600 focus:outline-none"
              />
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                    <th className="p-2 font-bold">Ngày</th>
                    <th className="p-2 font-bold">LSX</th>
                    <th className="p-2 font-bold">Dòng xe</th>
                    <th className="p-2 font-bold">Số khung/Serial</th>
                    <th className="p-2 font-bold">Nguồn gốc</th>
                    <th className="p-2 font-bold">Chi tiết lỗi</th>
                    <th className="p-2 font-bold">Xử lý</th>
                  </tr>
                </thead>
                <tbody>
                  {production.oqcFailedRecords
                    .filter(
                      (r) =>
                        !qFilter ||
                        `${r.model} ${r.lsx} ${r.serialNo} ${r.chassisNo} ${r.defectDetail}`
                          .toLowerCase()
                          .includes(qFilter)
                    )
                    .slice(0, 40)
                    .map((r) => (
                      <tr key={r.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2 whitespace-nowrap">{formatDateStrVi(r.date)}</td>
                        <td className="p-2 font-semibold">{r.lsx || '--'}</td>
                        <td className="p-2 font-bold text-slate-900">{r.model}</td>
                        <td className="p-2 font-mono">{r.serialNo || r.chassisNo || '--'}</td>
                        <td className="p-2">{r.rootCause || '--'}</td>
                        <td className="p-2">{r.defectDetail || r.defectCauseDetail || '--'}</td>
                        <td className="p-2">{r.treatment || '--'}</td>
                      </tr>
                    ))}
                  {production.oqcFailedRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500">
                        Không phát sinh xe lỗi OQC trong kỳ.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: THỊ TRƯỜNG & LINH KIỆN LỖI ==================== */}
      {subTab === 'market' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Market by Model */}
            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900 mb-3">
                Phản ánh thị trường theo Dòng xe
              </div>
              {market.defectsByModel.length === 0 ? (
                <p className="text-xs text-slate-500">Không phát sinh phản ánh trong kỳ.</p>
              ) : (
                <div className="space-y-2">
                  {market.defectsByModel.slice(0, 8).map((m) => (
                    <div
                      key={m.name}
                      className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <span className="font-bold text-slate-900">{m.name}</span>
                      <span className="font-extrabold text-slate-900">
                        {m.count} ({m.pct.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Failing Parts (BM-KTTD-01) */}
            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900 mb-3">
                Top linh kiện lỗi (BM-KTTD-01)
              </div>
              {market.topFailingParts.length === 0 ? (
                <p className="text-xs text-slate-500">Không phát sinh biên bản thẩm định trong kỳ.</p>
              ) : (
                <div className="space-y-2">
                  {market.topFailingParts.slice(0, 8).map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <span className="font-bold text-slate-900">{p.name}</span>
                      <span className="font-extrabold text-blue-700">
                        {p.count} chiếc ({p.pct.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Part Root Cause Breakdown */}
            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900 mb-3">
                Phân loại nguyên nhân gốc & Xử lý
              </div>
              <div className="space-y-2">
                {market.partsByCause.map((c) => (
                  <div
                    key={c.cause}
                    className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                  >
                    <span className="font-bold text-slate-800">{c.cause}</span>
                    <span className="font-extrabold text-slate-900">
                      {c.qty} chiếc ({c.pct.toFixed(1)}%)
                    </span>
                  </div>
                ))}
                {market.partsByCause.length === 0 && (
                  <p className="text-xs text-slate-500">Chưa có dữ liệu thẩm định linh kiện.</p>
                )}
              </div>
            </div>
          </div>

          {/* Part Evaluations Detail Table */}
          <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
            <div className="text-sm font-extrabold text-slate-900 mb-3">
              Chi tiết thẩm định linh kiện lỗi trong kỳ ({market.partEvalsInPeriod.length} biên bản)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                    <th className="p-2 font-bold">Ngày</th>
                    <th className="p-2 font-bold">Mã BB</th>
                    <th className="p-2 font-bold">Linh kiện</th>
                    <th className="p-2 font-bold text-right">SL</th>
                    <th className="p-2 font-bold">Dòng xe / Đại lý / NCC</th>
                    <th className="p-2 font-bold">Nguyên nhân</th>
                    <th className="p-2 font-bold">Phương án XL</th>
                  </tr>
                </thead>
                <tbody>
                  {market.partEvalsInPeriod.slice(0, 40).map((p) => (
                    <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2 whitespace-nowrap">{formatDateStrVi(p.receivedDate)}</td>
                      <td className="p-2 font-mono font-bold">{p.id}</td>
                      <td className="p-2 font-bold text-slate-900">{p.partName}</td>
                      <td className="p-2 text-right font-extrabold">{p.quantity || 1}</td>
                      <td className="p-2">
                        {[p.model, p.dealer, p.supplierName].filter(Boolean).join(' • ') || '--'}
                      </td>
                      <td className="p-2">{p.rootCauseCategory}</td>
                      <td className="p-2">{p.resolution}</td>
                    </tr>
                  ))}
                  {market.partEvalsInPeriod.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500">
                        Không phát sinh biên bản thẩm định linh kiện trong kỳ.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: CAPA & ECO ==================== */}
      {subTab === 'capa_eco' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-extrabold text-slate-900">
                CAPA quá hạn & Đang mở ({capaEco.overdueCapas.length} quá hạn)
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('tasks')}
                className="text-xs font-bold text-blue-700 hover:underline"
              >
                Mở phân hệ CAPA →
              </button>
            </div>
            <div className="space-y-2">
              {capaEco.capasAll
                .filter((c) => c.status !== 'Closed' && c.status !== 'Đã đóng')
                .slice(0, 15)
                .map((c) => {
                  const isOverdue = capaEco.overdueCapas.some((o) => o.id === c.id);
                  const renderQlclNoteCard = (extraClass = '') => (
    <div
      className={`bg-white rounded-2xl border-2 border-blue-300 p-5 shadow-sm flex flex-col justify-between ${extraClass}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-base font-extrabold text-slate-900">
              Nhận xét & Kết luận QLCL
            </span>
          </div>
          <button
            type="button"
            onClick={openNoteModal}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
          >
            {snapshot.note ? 'Sửa nhận xét' : 'Viết nhận xét'}
          </button>
        </div>

        {snapshot.note ? (
          <div className="space-y-2 text-sm text-slate-800">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 font-medium">
              {snapshot.note.summary}
            </div>
            {snapshot.note.highlights && (
              <div className="text-xs text-slate-700">
                <span className="font-bold text-emerald-700">Điểm nhấn: </span>
                {snapshot.note.highlights}
              </div>
            )}
            {snapshot.note.nextActions && (
              <div className="text-xs text-slate-700">
                <span className="font-bold text-blue-700">Kế hoạch kỳ tới: </span>
                {snapshot.note.nextActions}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 text-center">
            Chưa có nhận xét QLCL cho {period.label}. Bấm <strong>Viết nhận xét</strong> để bổ sung kết luận trước khi xuất báo cáo.
          </div>
        )}
      </div>

      {snapshot.note && (
        <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Người lập: {snapshot.note.author}</span>
          <span>Cập nhật: {new Date(snapshot.note.updatedAt).toLocaleString('vi-VN')}</span>
        </div>
      )}
    </div>
  );

  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border text-xs ${
                        isOverdue ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900">
                          {c.CAPAID || c.id} — {c.title || c.issue || '--'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold ${
                            isOverdue ? 'bg-rose-200 text-rose-900' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isOverdue ? 'Quá hạn' : c.status}
                        </span>
                      </div>
                      <div className="text-slate-600 mt-1">
                        Phụ trách: {c.owner || c.assignee || '--'} | Hạn: {formatDateStrVi(c.dueDate || c.targetDate)}
                      </div>
                    </div>
                  );
                })}
              {capaEco.capasAll.filter((c) => c.status !== 'Closed' && c.status !== 'Đã đóng')
                .length === 0 && (
                <p className="text-xs text-slate-500">Không có hồ sơ CAPA đang mở.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-extrabold text-slate-900">
                Thay đổi kỹ thuật (ECO) trong kỳ ({capaEco.ecosInPeriod.length})
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('ecos')}
                className="text-xs font-bold text-blue-700 hover:underline"
              >
                Mở phân hệ ECO →
              </button>
            </div>
            <div className="space-y-2">
              {capaEco.ecosInPeriod.map((e) => (
                <div key={e.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-900">
                      {e.ecrId || e.id} — {e.content || e.component}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold">
                      {e.status}
                    </span>
                  </div>
                  <div className="text-slate-600 mt-1">
                    Nhóm: {e.category || '--'} | Áp dụng: {formatDateStrVi(e.applyDate)}
                  </div>
                </div>
              ))}
              {capaEco.ecosInPeriod.length === 0 && (
                <p className="text-xs text-slate-500">Không phát sinh ECO mới trong kỳ.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 5: CÔNG VIỆC ==================== */}
      {subTab === 'work' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-extrabold text-slate-900">
                Công việc tồn đọng từ {periodType === 'week' ? 'tuần trước' : 'tháng trước'} ({work.pendingDailyLogs.length})
              </div>
              <button
                type="button"
                onClick={onOpenAddWeekTask}
                className="text-xs font-bold text-blue-700 hover:underline"
              >
                + Bổ sung việc
              </button>
            </div>
            {work.pendingByAssignee.length === 0 ? (
              <p className="text-xs text-slate-500">
                Không có công việc tồn đọng từ {periodType === 'week' ? 'tuần trước' : 'tháng trước'}.
              </p>
            ) : (
              <div className="space-y-2">
                {work.pendingByAssignee.map((a) => (
                  <div key={a.assignee} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{a.assignee}</span>
                      <span className="text-rose-700">{a.count} việc tồn</span>
                    </div>
                    <ul className="mt-1 list-disc list-inside text-slate-600 space-y-0.5">
                      {a.items.slice(0, 3).map((item, idx) => (
                        <li key={item.id || `${item.stt}-${idx}`}>
                          [{formatDateStrVi(item.date)}] {item.content}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
            <div className="text-sm font-extrabold text-slate-900 mb-3">
              Tiến độ PTSP ({work.ptspCompleted}/{work.ptspTotal} hoàn thành • TB {work.ptspAvgProgress.toFixed(0)}%)
            </div>
            {work.ptspOverdue.length === 0 ? (
              <p className="text-xs text-emerald-700 font-semibold">
                Không có đầu việc PTSP trễ hạn đến thời điểm hiện tại.
              </p>
            ) : (
              <div className="space-y-2">
                {work.ptspOverdue.slice(0, 10).map((t) => (
                  <div key={t.id} className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-xs">
                    <div className="font-bold text-rose-900">{t.name}</div>
                    <div className="text-rose-700 mt-0.5">
                      Phụ trách: {t.executor || '--'} | Hạn: {formatDateStrVi(t.endDate)} | Tiến độ: {t.progress}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-extrabold text-slate-900">
                  Tác vụ từ Lập kế hoạch Chất lượng ({work.planningTasksInPeriod.length} việc trong kỳ • {work.planningTasksCompleted} hoàn thành
                  {work.planningTasksOverdue.length > 0 ? ` • ${work.planningTasksOverdue.length} tồn quá hạn kỳ trước` : ''})
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đồng bộ tự động từ phân hệ Lập kế hoạch chất lượng (Tồn đọng, CAPA, PTSP, Phối hợp, ECO).
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('quality_planning')}
                className="text-xs font-bold text-blue-700 hover:underline"
              >
                Mở Lập kế hoạch chất lượng →
              </button>
            </div>

            {work.planningTasksInPeriod.length === 0 && work.planningTasksOverdue.length === 0 ? (
              <p className="text-xs text-slate-500">
                Chưa có tác vụ kế hoạch nào được lập cho kỳ báo cáo này.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                      <th className="p-2 text-left font-bold">Nhóm</th>
                      <th className="p-2 text-left font-bold">Nội dung tác vụ</th>
                      <th className="p-2 text-left font-bold">Phụ trách</th>
                      <th className="p-2 text-center font-bold">Hạn</th>
                      <th className="p-2 text-center font-bold">Ưu tiên</th>
                      <th className="p-2 text-center font-bold">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...work.planningTasksInPeriod.map((t) => ({ task: t, isOverduePrev: false })),
                      ...work.planningTasksOverdue
                        .filter((o) => !work.planningTasksInPeriod.some((p) => p.id === o.id))
                        .map((t) => ({ task: t, isOverduePrev: true }))
                    ].map(({ task, isOverduePrev }) => {
                      const sectionLabel: Record<string, string> = {
                        backlog: 'Tồn đọng',
                        capa: 'CAPA',
                        ptsp: 'PTSP',
                        coordination: 'Phối hợp',
                        eco: 'ECO'
                      };
                      const statusLabel =
                        task.status === 'Completed'
                          ? 'Hoàn thành'
                          : task.status === 'In_Progress'
                            ? 'Đang làm'
                            : 'Chờ xử lý';
                      const statusCls =
                        task.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : isOverduePrev
                            ? 'bg-rose-100 text-rose-800'
                            : task.status === 'In_Progress'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700';
                      return (
                        <tr key={task.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-800 whitespace-nowrap">
                            {sectionLabel[task.section] || task.section}
                            {isOverduePrev && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                                Tồn kỳ trước
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-slate-900">
                            <div className="font-semibold">{task.title}</div>
                            {(task.modelOrSupplier || task.notes) && (
                              <div className="text-[11px] text-slate-500">
                                {[task.modelOrSupplier, task.notes].filter(Boolean).join(' • ')}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-slate-700 whitespace-nowrap">{task.assignee || '--'}</td>
                          <td className="p-2 text-center text-slate-700 whitespace-nowrap">
                            {task.deadline ? formatDateStrVi(task.deadline) : task.week || '--'}
                          </td>
                          <td className="p-2 text-center text-slate-700 whitespace-nowrap">{task.priority}</td>
                          <td className="p-2 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${statusCls}`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 6: 4 CÔNG CỤ QC ==================== */}
      {subTab === 'qc_tools' && (
        <div className="space-y-4">
          {/* Tool 1: Phiếu kiểm tra (Check Sheet) */}
          <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
            <div className="text-sm font-extrabold text-slate-900 mb-2">
              1. Phiếu kiểm tra (Check Sheet) — Tần suất lỗi theo {periodType === 'week' ? 'Thứ' : 'Tuần'}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                    <th className="p-2 text-left font-bold">Nhóm lỗi</th>
                    {qcTools.checkSheet.columns.map((col) => (
                      <th key={col} className="p-2 text-right font-bold">
                        {col}
                      </th>
                    ))}
                    <th className="p-2 text-right font-extrabold">Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {qcTools.checkSheet.rows.map((r) => (
                    <tr key={r.label} className="border-b border-slate-200">
                      <td className="p-2 font-bold text-slate-900">{r.label}</td>
                      {r.counts.map((c, i) => (
                        <td
                          key={i}
                          className={`p-2 text-right ${c > 0 ? 'font-bold text-blue-700' : 'text-slate-400'}`}
                        >
                          {c || '-'}
                        </td>
                      ))}
                      <td className="p-2 text-right font-extrabold text-slate-900">{r.total}</td>
                    </tr>
                  ))}
                  {qcTools.checkSheet.rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={qcTools.checkSheet.columns.length + 2}
                        className="p-4 text-center text-slate-500"
                      >
                        Không phát sinh dữ liệu trong kỳ.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tool 2: Biểu đồ Pareto */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900 mb-2">
                2A. Pareto — Nhóm lỗi phát sinh (80/20)
              </div>
              <ParetoSvgChart items={qcTools.paretoDefects} />
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900 mb-2">
                2B. Pareto — Linh kiện lỗi thẩm định (BM-KTTD-01)
              </div>
              <ParetoSvgChart items={qcTools.paretoParts} />
            </div>
          </div>

          {/* Tool 3: Phân tầng (Stratification) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900 mb-3">
                3A. Phân tầng theo Dòng xe (OQC + Thị trường + LK)
              </div>
              {qcTools.stratificationByModel.length === 0 ? (
                <p className="text-xs text-slate-500">Không phát sinh dữ liệu phân tầng.</p>
              ) : (
                <div className="space-y-1.5">
                  {qcTools.stratificationByModel.slice(0, 8).map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <span className="font-bold text-slate-900">{item.name}</span>
                      <span className="font-extrabold text-slate-900">
                        {item.count} lỗi ({item.pct.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900 mb-3">
                3B. Phân tầng theo Nhà cung cấp (IQC + LK lỗi)
              </div>
              {qcTools.stratificationBySupplier.length === 0 ? (
                <p className="text-xs text-slate-500">Không phát sinh dữ liệu phân tầng.</p>
              ) : (
                <div className="space-y-1.5">
                  {qcTools.stratificationBySupplier.slice(0, 8).map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <span className="font-bold text-slate-900">{item.name}</span>
                      <span className="font-extrabold text-slate-900">
                        {item.count} ({item.pct.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tool 4: Biểu đồ kiểm soát (p-chart) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900 mb-2">
                4A. {qcTools.oqcControlChart.title}
              </div>
              <PChartSvg series={qcTools.oqcControlChart} />
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900 mb-2">
                4B. {qcTools.iqcControlChart.title}
              </div>
              <PChartSvg series={qcTools.iqcControlChart} />
            </div>
          </div>
        </div>
      )}

      {/* Thẻ Nhận xét & Kết luận QLCL hiển thị trên mọi tab còn lại */}
      {subTab !== 'overview' && renderQlclNoteCard()}

      {/* ==================== MODAL: NHẬN XÉT QLCL ==================== */}
      {showNoteModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-slate-300 w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-white">
                Nhận xét & Kết luận QLCL — {period.label}
              </h2>
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNoteSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                  Nhận định chung về chất lượng trong kỳ *
                </label>
                <textarea
                  rows={3}
                  value={noteSummary}
                  onChange={(e) => setNoteSummary(e.target.value)}
                  placeholder="VD: Chất lượng OQC ổn định đạt 97.2%, cần tập trung xử lý lỗi IC điều tốc của NCC X..."
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                  Điểm nhấn / Kết quả đạt được
                </label>
                <textarea
                  rows={2}
                  value={noteHighlights}
                  onChange={(e) => setNoteHighlights(e.target.value)}
                  placeholder="VD: Đã đóng 3 CAPA trọng điểm, tỷ lệ đạt IQC tăng 2.1%..."
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                  Đề xuất / Trọng tâm kỳ tới
                </label>
                <textarea
                  rows={2}
                  value={noteNextActions}
                  onChange={(e) => setNoteNextActions(e.target.value)}
                  placeholder="VD: Audit đột xuất dây chuyền lắp ráp, siết kiểm IQC lô bộ sạc..."
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <div>
                  {snapshot.note && (
                    <button
                      type="button"
                      onClick={handleDeleteCurrentNote}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa nhận xét
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNoteModal(false)}
                    className="px-4 py-2 rounded-xl border-2 border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm"
                  >
                    Lưu nhận xét
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
