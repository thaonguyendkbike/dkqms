import React, { useState, useEffect, useMemo } from 'react';
import {
  Tv,
  Maximize,
  Minimize,
  RefreshCw,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  CheckCheck,
  TrendingUp,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { OQCRecord } from '../qualityTestData';
import { safeStorage } from '../safeStorage';

interface OqcTvDashboardProps {
  oqcRecords: OQCRecord[];
  oqcHandoverList?: any[];
}

// Hàm chuẩn hóa ngày siêu nhẹ
function standardizeDateFast(dStr: string): string {
  if (!dStr) return '';
  const trimmed = dStr.trim();
  if (trimmed.includes('/')) {
    const p = trimmed.split('/');
    if (p.length >= 3) {
      const d = p[0].padStart(2, '0');
      const m = p[1].padStart(2, '0');
      const y = p[2].length === 2 ? '20' + p[2] : p[2];
      return `${d}/${m}/${y}`;
    }
  }
  return trimmed;
}

export default function OqcTvDashboard({ oqcRecords = [], oqcHandoverList = [] }: OqcTvDashboardProps) {
  // Bộ lọc thời gian trên TV: 'today' | 'month' | 'year'
  const [timeFilter, setTimeFilter] = useState<'today' | 'month' | 'year'>('month');
  const [currentTime, setCurrentTime] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [localHandoverList, setLocalHandoverList] = useState<any[]>(() => {
    if (Array.isArray(oqcHandoverList) && oqcHandoverList.length > 0) return oqcHandoverList;
    try {
      const saved = safeStorage.getItem('dk_oqc_handover_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { }
    return [];
  });

  // Cập nhật đồng hồ và fullscreen status
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('vi-VN'));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);

    // Đồng bộ danh sách bàn giao mới nhất mỗi 20s
    const syncTimer = setInterval(() => {
      try {
        const saved = safeStorage.getItem('dk_oqc_handover_list');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setLocalHandoverList(parsed);
            setLastRefreshedAt(new Date());
          }
        }
      } catch { }
    }, 20000);

    return () => {
      clearInterval(timer);
      clearInterval(syncTimer);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const todayStr = `${String(currentDay).padStart(2, '0')}/${String(currentMonth).padStart(2, '0')}/${currentYear}`;

  // Tính số ngày còn lại trong tháng
  const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysRemaining = Math.max(0, daysInCurrentMonth - currentDay);

  // Tính toán nhanh số liệu 1 lần duyệt (O(N) siêu nhẹ cho CPU của Tivi)
  const stats = useMemo(() => {
    let totalLsx = 0;
    let lapRapTotal = 0;
    let datCount = 0;
    let loiCount = 0;

    const modelCountMap: Record<string, number> = {};
    const modelPassedMap: Record<string, number> = {};
    const modelFailedMap: Record<string, number> = {};
    const defectCountMap: Record<string, number> = {};

    // Tổng số lượng xe cả năm để hiển thị thẻ Tiến độ năm 2026
    let yearTotalAssembled = 0;

    for (let i = 0; i < oqcRecords.length; i++) {
      const r = oqcRecords[i];
      const rYear = r.year ? Number(r.year) : currentYear;
      const rMonth = r.month ? Number(r.month) : 0;
      const stdDate = r.date ? standardizeDateFast(r.date) : '';

      const hasDefect = (r.status === 'Lỗi') || (r.failedCount && r.failedCount > 0) || Boolean(r.defectDetail && r.defectDetail.trim() && !['không', 'ok', 'pass', 'đạt', 'sạch không lỗi'].includes(r.defectDetail.trim().toLowerCase()));
      const isPassed = r.status === 'Đạt' || (r.passFlag === 1 && !hasDefect);
      const isFailed = !isPassed && hasDefect;
      const isChecked = isPassed || isFailed;

      if (rYear === currentYear && isChecked) {
        yearTotalAssembled++;
      }

      // Lọc theo bộ lọc thời gian
      if (timeFilter === 'today') {
        if (stdDate !== todayStr) continue;
      } else if (timeFilter === 'month') {
        if (rMonth !== currentMonth || rYear !== currentYear) continue;
      } else if (timeFilter === 'year') {
        if (rYear !== currentYear) continue;
      }

      totalLsx++;

      if (isChecked) {
        lapRapTotal++;
        if (isPassed) datCount++;
        if (isFailed) loiCount++;

        const model = (r.model || 'Chưa rõ').trim();
        if (model && !['đạt', 'lỗi', 'pass', 'fail'].includes(model.toLowerCase())) {
          modelCountMap[model] = (modelCountMap[model] || 0) + 1;
          if (isPassed) {
            modelPassedMap[model] = (modelPassedMap[model] || 0) + 1;
          } else {
            modelFailedMap[model] = (modelFailedMap[model] || 0) + 1;
          }
        }
      }

      if (hasDefect && r.defectDetail) {
        const parts = r.defectDetail.split(/[,;+\n]/).map(s => s.trim()).filter(Boolean);
        for (let j = 0; j < parts.length; j++) {
          const d = parts[j];
          if (!['không', 'ok', 'pass', 'đạt', 'sạch không lỗi'].includes(d.toLowerCase())) {
            defectCountMap[d] = (defectCountMap[d] || 0) + (r.failedCount || 1);
          }
        }
      }
    }

    // Top các model lắp ráp nhiều nhất
    const topModels = Object.entries(modelCountMap)
      .map(([name, count]) => ({
        name,
        count,
        passed: modelPassedMap[name] || 0,
        failed: modelFailedMap[name] || 0,
        passRate: count > 0 ? Math.round(((modelPassedMap[name] || 0) / count) * 100) : 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top sai lỗi (Pareto)
    const topDefects = Object.entries(defectCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const datRate = lapRapTotal > 0 ? ((datCount / lapRapTotal) * 100).toFixed(1) : '100';
    const loiRate = lapRapTotal > 0 ? ((loiCount / lapRapTotal) * 100).toFixed(1) : '0';

    return {
      yearTotalAssembled,
      totalLsx,
      lapRapTotal,
      datCount,
      loiCount,
      datRate,
      loiRate,
      topModels,
      topDefects
    };
  }, [oqcRecords, timeFilter, todayStr, currentMonth, currentYear]);

  // Đếm số lượng xe quét bàn giao tương ứng với bộ lọc thời gian
  const handoverCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < localHandoverList.length; i++) {
      const item = localHandoverList[i];
      const stdDate = item.date ? standardizeDateFast(item.date) : '';
      if (timeFilter === 'today') {
        if (stdDate !== todayStr) continue;
      } else if (timeFilter === 'month') {
        if (stdDate) {
          const p = stdDate.split('/');
          if (p.length >= 3) {
            const m = parseInt(p[1], 10);
            const y = parseInt(p[2], 10);
            if (m !== currentMonth || y !== currentYear) continue;
          }
        }
      } else if (timeFilter === 'year') {
        if (stdDate) {
          const p = stdDate.split('/');
          if (p.length >= 3 && parseInt(p[2], 10) !== currentYear) continue;
        }
      }
      count++;
    }
    return count;
  }, [localHandoverList, timeFilter, todayStr, currentMonth, currentYear]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const maxModelCount = Math.max(1, ...(stats.topModels.map(m => m.count)));

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col p-3 sm:p-5 select-none antialiased">
      {/* ==================== HEADER KIOSK TIVI ==================== */}
      <header className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-700/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Tv className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-black uppercase tracking-wide text-white">
                Công ty TNHH Xe điện DK Việt Nhật
              </h1>
              <span className="bg-blue-500/20 text-blue-400 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full border border-blue-400/30 font-mono">
                DKBike QLCL
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                LIVE
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-bold mt-0.5">
              Hệ Thống Báo Cáo Xuất Xưởng OQC KCS Thành Phẩm (Màn Hình Giám Sát TV)
            </p>
          </div>
        </div>

        {/* Cụm điều khiển Tivi */}
        <div className="flex items-center gap-2">
          {/* Bộ lọc thời gian 1 chạm cho remote TV */}
          <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTimeFilter('today')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                timeFilter === 'today' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('month')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                timeFilter === 'month' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tháng {currentMonth}
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('year')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                timeFilter === 'year' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Năm {currentYear}
            </button>
          </div>

          {/* Đồng hồ to rõ trên TV */}
          {currentTime && (
            <div className="bg-slate-800/90 border border-slate-700 px-3.5 py-1.5 rounded-xl font-mono text-base font-black text-amber-300 tracking-wider shadow-inner">
              ⏰ {currentTime}
            </div>
          )}

          {/* Nút Toàn màn hình */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 border border-indigo-400/30"
            title="Bật/Tắt chế độ toàn màn hình TV"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            {isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình (F11)'}
          </button>

          {/* Nút Thoát TV */}
          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-700 active:scale-95"
            title="Thoát chế độ Tivi về màn hình thông thường"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Thoát TV
          </button>
        </div>
      </header>

      {/* ==================== 1. HÀNG 6 THẺ KPI SIÊU NÉT TRÊN TV ==================== */}
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-4">
        {/* Thẻ 1: Tiến độ lắp ráp năm */}
        <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-3 sm:p-4 shadow-md flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-slate-400 tracking-wider">
              Tiến Độ Năm {currentYear}
            </span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-blue-400 tabular-nums tracking-tight">
                {stats.yearTotalAssembled.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-bold">xe</span>
            </div>
            <span className="text-[10.5px] text-slate-400 font-bold block mt-0.5">lắp ráp cả năm</span>
          </div>
          <div className="pt-2 border-t border-slate-700/60 flex justify-between text-[10px] text-slate-400 font-bold">
            <span>Thực tế cả năm</span>
            <span className="text-blue-400 font-black">Năm {currentYear}</span>
          </div>
        </div>

        {/* Thẻ 2: Ngày còn lại */}
        <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-3 sm:p-4 shadow-md flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-slate-400 tracking-wider">
              Ngày Còn Lại Tháng {currentMonth}
            </span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex flex-col items-center justify-center my-1">
            <div className="bg-gradient-to-b from-blue-500 to-indigo-600 text-white font-black text-2xl sm:text-3xl w-12 h-12 rounded-xl flex items-center justify-center tabular-nums shadow-md shadow-blue-500/30">
              {daysRemaining}
            </div>
            <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-widest mt-1">
              Ngày làm việc
            </span>
          </div>
          <div className="pt-2 border-t border-slate-700/60 text-center text-[10px] text-slate-400 font-bold">
            Tháng {currentMonth}/{currentYear}
          </div>
        </div>

        {/* Thẻ 3: SL xe theo LSX */}
        <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-3 sm:p-4 shadow-md flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-slate-400 tracking-wider">
              SL Xe Theo LSX
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-rose-400 tabular-nums tracking-tight">
                {stats.totalLsx.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-bold">xe</span>
            </div>
            <span className="text-[10.5px] text-slate-400 font-bold block mt-0.5">kế hoạch trong lệnh</span>
          </div>
          <div className="pt-2 border-t border-slate-700/60 text-[10px] text-slate-400 font-bold">
            Theo lệnh sản xuất
          </div>
        </div>

        {/* Thẻ 4: SL xe lắp ráp */}
        <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-3 sm:p-4 shadow-md flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-slate-400 tracking-wider">
              SL Xe Lắp Ráp
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-amber-400 tabular-nums tracking-tight">
                {stats.lapRapTotal.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-bold">xe</span>
            </div>
            <span className="text-[10.5px] text-slate-400 font-bold block mt-0.5">đã hoàn thành KCS</span>
          </div>
          <div className="pt-2 border-t border-slate-700/60 text-[10px] text-slate-400 font-bold">
            Tiến độ thực tế
          </div>
        </div>

        {/* Thẻ 5: SL xe đạt lần 1 */}
        <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-3 sm:p-4 shadow-md flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-slate-400 tracking-wider">
              SL Xe Đạt Lần 1
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400 tabular-nums tracking-tight">
                {stats.datCount.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-bold">xe</span>
            </div>
            <span className="text-[10.5px] text-emerald-400 font-black block mt-0.5">
              {stats.datRate}% Đạt Chuẩn
            </span>
          </div>
          <div className="pt-2 border-t border-slate-700/60 text-[10px] text-slate-400 font-bold">
            Nghiệm thu đạt lần 1
          </div>
        </div>

        {/* Thẻ 6: SL Báo phẩm bàn giao */}
        <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-3 sm:p-4 shadow-md flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-slate-400 tracking-wider">
              SL Báo Phẩm Bàn Giao
            </span>
            <CheckCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-purple-400 tabular-nums tracking-tight">
                {handoverCount.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-bold">xe</span>
            </div>
            <span className="text-[10.5px] text-slate-400 font-bold block mt-0.5">xe đã bàn giao kho</span>
          </div>
          <div className="pt-2 border-t border-slate-700/60 flex justify-between text-[10px] text-slate-400 font-bold">
            <span>Đã quét kho</span>
            {stats.lapRapTotal > 0 && (
              <span className="text-purple-400 font-black">
                {((handoverCount / stats.lapRapTotal) * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ==================== 2. HÀNG BIỂU ĐỒ TRỰC QUAN ==================== */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        {/* Biểu đồ Donut Tỷ lệ Đạt / Lỗi */}
        <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
            <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              Tình Trạng Kiểm Tra KCS
            </h3>
            <span className="text-[10px] font-bold text-slate-400">
              Tổng {stats.lapRapTotal.toLocaleString()} xe
            </span>
          </div>

          {/* SVG Donut Chart */}
          <div className="flex-1 flex flex-col items-center justify-center py-4">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Vòng nền lỗi (màu đỏ) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#f43f5e"
                  strokeWidth="14"
                />
                {/* Vòng đạt (màu xanh lục) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="14"
                  strokeDasharray={`${(Number(stats.datRate) / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-black uppercase text-slate-400">Đạt Chuẩn</span>
                <span className="text-3xl font-black text-emerald-400 tabular-nums">
                  {stats.datRate}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">
                  {stats.datCount.toLocaleString()} xe
                </span>
              </div>
            </div>

            {/* Chú giải Donut */}
            <div className="flex items-center justify-center gap-5 mt-3 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-300">Đạt lần 1:</span>
                <span className="text-emerald-400 font-black">{stats.datCount.toLocaleString()} xe ({stats.datRate}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                <span className="text-slate-300">Có sai lỗi:</span>
                <span className="text-rose-400 font-black">{stats.loiCount.toLocaleString()} xe ({stats.loiRate}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Biểu đồ Cột Sản Lượng Model Lắp Ráp */}
        <div className="lg:col-span-2 bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
            <div>
              <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-200">
                Sản Lượng Lắp Ráp Theo Dòng Xe (Top 10 Model)
              </h3>
              <span className="text-[10.5px] font-bold text-slate-400">
                Xếp theo tổng số lượng xe đã kiểm tra KCS
              </span>
            </div>
            <span className="text-[10px] text-blue-400 font-mono font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-400/20">
              {stats.topModels.length} Model
            </span>
          </div>

          {/* Bar Chart Danh Sách Model */}
          <div className="flex-1 py-3 flex flex-col justify-around gap-2">
            {stats.topModels.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">
                Chưa có dữ liệu lắp ráp trong kỳ lọc này.
              </div>
            ) : (
              stats.topModels.map(m => {
                const percent = Math.min(100, Math.round((m.count / maxModelCount) * 100));
                return (
                  <div key={m.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-200 truncate max-w-[220px]" title={m.name}>
                        {m.name}
                      </span>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-emerald-400 font-black">
                          {m.passed.toLocaleString()} đạt ({m.passRate}%)
                        </span>
                        {m.failed > 0 && (
                          <span className="text-rose-400 font-bold">
                            {m.failed.toLocaleString()} lỗi
                          </span>
                        )}
                        <span className="text-white font-black text-xs w-16 text-right">
                          {m.count.toLocaleString()} xe
                        </span>
                      </div>
                    </div>
                    {/* Thanh Bar tỉ lệ */}
                    <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${(m.passed / maxModelCount) * 100}%` }}
                        className="bg-emerald-500 transition-all duration-700"
                        title={`Đạt: ${m.passed}`}
                      />
                      <div
                        style={{ width: `${(m.failed / maxModelCount) * 100}%` }}
                        className="bg-rose-500 transition-all duration-700"
                        title={`Lỗi: ${m.failed}`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ==================== 3. HÀNG TOP SAI LỖI (PARETO TRỌNG ĐIỂM) ==================== */}
      <section className="mt-4 bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-rose-300">
              Top Khuyết Phẩm / Sai Lỗi Xuất Xưởng Cần Lưu Ý
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-bold italic">
            * KCS và phân xưởng lắp ráp tập trung giải quyết triệt để các lỗi này trước khi xuất xưởng
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {stats.topDefects.length === 0 ? (
            <div className="col-span-full py-4 text-center text-xs text-emerald-400 font-bold">
              ✓ Không có sai lỗi nào trong kỳ kiểm tra hiện tại.
            </div>
          ) : (
            stats.topDefects.map((def, idx) => (
              <div
                key={def.name}
                className="bg-slate-900/80 border border-slate-700 rounded-xl p-2.5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-slate-500">#{idx + 1}</span>
                  <span className="bg-rose-500/20 text-rose-400 text-xs font-black px-1.5 py-0.2 rounded font-mono">
                    {def.count}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-200 line-clamp-2 leading-tight" title={def.name}>
                  {def.name}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ==================== FOOTER KIOSK ==================== */}
      <footer className="mt-4 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10.5px] text-slate-500 font-bold">
        <span>DKBike QLCL • Hệ thống Quản trị Chất lượng Xe điện DK Việt Nhật</span>
        <span>
          Tự động đồng bộ Realtime • Lần làm mới gần nhất: {lastRefreshedAt.toLocaleTimeString('vi-VN')}
        </span>
      </footer>
    </div>
  );
}
