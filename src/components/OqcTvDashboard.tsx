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
  } else if (trimmed.includes('-')) {
    const p = trimmed.split('-');
    if (p.length >= 3) {
      const y = p[0].length === 2 ? '20' + p[0] : p[0];
      const m = p[1].padStart(2, '0');
      const d = p[2].padStart(2, '0');
      return `${d}/${m}/${y}`;
    }
  }
  return trimmed;
}

export default function OqcTvDashboard({ oqcRecords = [], oqcHandoverList = [] }: OqcTvDashboardProps) {
  // Bộ lọc thời gian trên TV: 'all' (mặc định khớp 100% với dashboard chính) | 'year' | 'month' | 'today'
  const [timeFilter, setTimeFilter] = useState<'all' | 'year' | 'month' | 'today'>('all');
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

  // Tính toán nhanh số liệu chuẩn xác 100% khớp với OQC Dashboard gốc
  const stats = useMemo(() => {
    let totalLsx = 0;
    let lapRapTotal = 0;
    let datCount = 0;
    let loiCount = 0;

    const modelCountMap: Record<string, number> = {};
    const modelPassedMap: Record<string, number> = {};
    const modelFailedMap: Record<string, number> = {};
    const defectCountMap: Record<string, number> = {};

    // Tổng số lượng xe cả năm 2026 để hiển thị thẻ Tiến độ năm 2026
    let yearTotalAssembled = 0;

    for (let i = 0; i < oqcRecords.length; i++) {
      const r = oqcRecords[i];
      let rYear = (r.year && !isNaN(Number(r.year))) ? Number(r.year) : null;
      let rMonth = (r.month && !isNaN(Number(r.month))) ? Number(r.month) : null;
      let stdDate = '';

      if (r.date) {
        stdDate = standardizeDateFast(r.date);
        if (stdDate.includes('/')) {
          const p = stdDate.split('/');
          if (p.length >= 3) {
            if (rMonth === null) rMonth = parseInt(p[1], 10);
            if (rYear === null) rYear = parseInt(p[2], 10);
          }
        }
      }

      if (rYear === null) rYear = currentYear;
      if (rMonth === null) rMonth = currentMonth;

      const hasDefect = (r.status === 'Lỗi') || (r.failedCount && r.failedCount > 0) || Boolean(r.defectDetail && r.defectDetail.trim() && !['không', 'ok', 'pass', 'đạt', 'sạch không lỗi'].includes(r.defectDetail.trim().toLowerCase()));
      const isPassed = r.status === 'Đạt' || (r.passFlag === 1 && !hasDefect);
      const isFailed = !isPassed && hasDefect;
      const isChecked = isPassed || isFailed || Boolean(r.checkTime && r.checkTime !== '--:--' && r.checkTime !== '');

      if (rYear === currentYear && (isPassed || isFailed || isChecked)) {
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
      // 'all' -> lấy toàn bộ dữ liệu

      totalLsx++;

      if (isPassed || isFailed || isChecked) {
        lapRapTotal++;
        if (isPassed) {
          datCount++;
        } else if (isFailed) {
          loiCount++;
        } else {
          if (hasDefect) loiCount++; else datCount++;
        }

        const model = (r.model || 'Chưa rõ').trim();
        if (model && !['đạt', 'lỗi', 'pass', 'fail'].includes(model.toLowerCase())) {
          modelCountMap[model] = (modelCountMap[model] || 0) + 1;
          if (isPassed || (!hasDefect && !isFailed)) {
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
          if (!['không', 'ok', 'pass', 'đạt', 'sạch không lỗi', 'lỗi kcs'].includes(d.toLowerCase())) {
            defectCountMap[d] = (defectCountMap[d] || 0) + (r.failedCount || 1);
          }
        }
      }
    }

    // Top các model lắp ráp nhiều nhất (Top 8 model để hiển thị thanh dày, rõ ràng)
    const topModels = Object.entries(modelCountMap)
      .map(([name, count]) => ({
        name,
        count,
        passed: modelPassedMap[name] || 0,
        failed: modelFailedMap[name] || 0,
        passRate: count > 0 ? Math.round(((modelPassedMap[name] || 0) / count) * 100) : 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

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
      {/* ==================== HEADER KIOSK TIVI (ĐƠN GIẢN, GỌN GÀNG) ==================== */}
      <header className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-700/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md">
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
          {/* Bộ lọc thời gian: Tất cả (mặc định) | Năm 2026 | Tháng | Hôm nay */}
          <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timeFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timeFilter === 'year' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Năm {currentYear}
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timeFilter === 'month' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tháng {currentMonth}
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timeFilter === 'today' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hôm nay
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
            {isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
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

      {/* ==================== 1. HÀNG 6 THẺ KPI TO, RÕ RÀNG TRÊN TV (KHÔNG NEON) ==================== */}
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-4">
        {/* Thẻ 1: Tiến độ lắp ráp năm */}
        <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-md flex flex-col justify-between min-h-[145px]">
          <div className="flex justify-between items-start">
            <span className="text-xs sm:text-sm font-black uppercase text-slate-400 tracking-wider">
              Tiến Độ Năm {currentYear}
            </span>
            <CheckCircle2 className="w-5 h-5 text-blue-400" />
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-blue-400 tabular-nums tracking-tight">
                {stats.yearTotalAssembled.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-bold">xe</span>
            </div>
            <span className="text-xs text-slate-400 font-bold block mt-0.5">lắp ráp cả năm</span>
          </div>
          <div className="pt-2 border-t border-slate-700/60 flex justify-between text-xs text-slate-400 font-bold">
            <span>Thực tế cả năm</span>
            <span className="text-blue-400 font-black">Năm {currentYear}</span>
          </div>
        </div>

        {/* Thẻ 2: Ngày còn lại */}
        <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-md flex flex-col justify-between min-h-[145px]">
          <div className="flex justify-between items-start">
            <span className="text-xs sm:text-sm font-black uppercase text-slate-400 tracking-wider">
              Ngày Còn Lại Tháng {currentMonth}
            </span>
            <Calendar className="w-5 h-5 text-sky-400" />
          </div>
          <div className="flex flex-col items-center justify-center my-1">
            <div className="bg-gradient-to-b from-blue-500 to-indigo-600 text-white font-black text-3xl sm:text-4xl w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center tabular-nums shadow-md">
              {daysRemaining}
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
              Ngày làm việc
            </span>
          </div>
          <div className="pt-2 border-t border-slate-700/60 text-center text-xs text-slate-400 font-bold">
            Tháng {currentMonth}/{currentYear}
          </div>
        </div>

        {/* Thẻ 3: SL xe theo LSX */}
        <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-md flex flex-col justify-between min-h-[145px]">
          <div className="flex justify-between items-start">
            <span className="text-xs sm:text-sm font-black uppercase text-slate-400 tracking-wider">
              SL Xe Theo LSX
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-rose-400 tabular-nums tracking-tight">
                {stats.totalLsx.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-bold">xe</span>
            </div>
            <span className="text-xs text-slate-400 font-bold block mt-0.5">kế hoạch trong lệnh</span>
          </div>
          <div className="pt-2 border-t border-slate-700/60 text-xs text-slate-400 font-bold">
            Theo lệnh sản xuất
          </div>
        </div>

        {/* Thẻ 4: SL xe lắp ráp */}
        <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-md flex flex-col justify-between min-h-[145px]">
          <div className="flex justify-between items-start">
            <span className="text-xs sm:text-sm font-black uppercase text-slate-400 tracking-wider">
              SL Xe Lắp Ráp
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-amber-400 tabular-nums tracking-tight">
                {stats.lapRapTotal.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-bold">xe</span>
            </div>
            <span className="text-xs text-slate-400 font-bold block mt-0.5">đã hoàn thành KCS</span>
          </div>
          <div className="pt-2 border-t border-slate-700/60 text-xs text-slate-400 font-bold">
            Tiến độ thực tế
          </div>
        </div>

        {/* Thẻ 5: SL xe đạt lần 1 */}
        <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-md flex flex-col justify-between min-h-[145px]">
          <div className="flex justify-between items-start">
            <span className="text-xs sm:text-sm font-black uppercase text-slate-400 tracking-wider">
              SL Xe Đạt Lần 1
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-400 tabular-nums tracking-tight">
                {stats.datCount.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-bold">xe</span>
            </div>
            <span className="text-xs text-emerald-400 font-black block mt-0.5">
              {stats.datRate}% Đạt Chuẩn
            </span>
          </div>
          <div className="pt-2 border-t border-slate-700/60 text-xs text-slate-400 font-bold">
            Nghiệm thu đạt lần 1
          </div>
        </div>

        {/* Thẻ 6: SL Báo phẩm bàn giao */}
        <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-md flex flex-col justify-between min-h-[145px]">
          <div className="flex justify-between items-start">
            <span className="text-xs sm:text-sm font-black uppercase text-slate-400 tracking-wider">
              SL Báo Phẩm Bàn Giao
            </span>
            <CheckCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-purple-400 tabular-nums tracking-tight">
                {handoverCount.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-bold">xe</span>
            </div>
            <span className="text-xs text-slate-400 font-bold block mt-0.5">xe đã bàn giao kho</span>
          </div>
          <div className="pt-2 border-t border-slate-700/60 flex justify-between text-xs text-slate-400 font-bold">
            <span>Đã quét kho</span>
            {stats.lapRapTotal > 0 && (
              <span className="text-purple-400 font-black">
                {((handoverCount / stats.lapRapTotal) * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ==================== 2. HÀNG BIỂU ĐỒ (DONUT & SẢN LƯỢNG MODEL THANH DÀY DẶN) ==================== */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        {/* Biểu đồ Donut Tỷ lệ Đạt / Lỗi */}
        <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
            <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              Tình Trạng Kiểm Tra KCS
            </h3>
            <span className="text-xs font-bold text-slate-400">
              Tổng {stats.lapRapTotal.toLocaleString()} xe
            </span>
          </div>

          {/* SVG Donut Chart */}
          <div className="flex-1 flex flex-col items-center justify-center py-4">
            <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
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
                <span className="text-xs font-black uppercase text-slate-400">Đạt Chuẩn</span>
                <span className="text-4xl font-black text-emerald-400 tabular-nums">
                  {stats.datRate}%
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono mt-0.5">
                  {stats.datCount.toLocaleString()} xe
                </span>
              </div>
            </div>

            {/* Chú giải Donut */}
            <div className="flex items-center justify-center gap-5 mt-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-300">Đạt lần 1:</span>
                <span className="text-emerald-400 font-black">{stats.datCount.toLocaleString()} xe ({stats.datRate}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shrink-0" />
                <span className="text-slate-300">Có sai lỗi:</span>
                <span className="text-rose-400 font-black">{stats.loiCount.toLocaleString()} xe ({stats.loiRate}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Biểu đồ Cột Sản Lượng Model Lắp Ráp - Thanh Dày To & Rõ Ràng */}
        <div className="lg:col-span-2 bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
            <div>
              <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-200">
                Sản Lượng Lắp Ráp Theo Dòng Xe (Top Model)
              </h3>
              <span className="text-xs font-bold text-slate-400">
                Xếp theo tổng số lượng xe đã kiểm tra KCS
              </span>
            </div>
            <span className="text-xs text-blue-400 font-mono font-bold bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-400/20">
              {stats.topModels.length} Model chủ lực
            </span>
          </div>

          {/* Bar Chart Danh Sách Model (Thanh to dày h-6, chữ to rõ) */}
          <div className="flex-1 py-3 flex flex-col justify-around gap-2.5">
            {stats.topModels.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">
                Chưa có dữ liệu lắp ráp trong kỳ lọc này.
              </div>
            ) : (
              stats.topModels.map(m => {
                return (
                  <div key={m.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                      <span className="text-slate-200 truncate max-w-[260px]" title={m.name}>
                        {m.name}
                      </span>
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-emerald-400 font-black">
                          {m.passed.toLocaleString()} đạt ({m.passRate}%)
                        </span>
                        {m.failed > 0 && (
                          <span className="text-rose-400 font-bold">
                            {m.failed.toLocaleString()} lỗi
                          </span>
                        )}
                        <span className="text-white font-black text-xs sm:text-sm w-20 text-right">
                          {m.count.toLocaleString()} xe
                        </span>
                      </div>
                    </div>
                    {/* Thanh Bar tỉ lệ dày to (h-5 sm:h-6) */}
                    <div className="w-full h-5 sm:h-6 bg-slate-700/80 rounded-lg overflow-hidden flex shadow-inner">
                      <div
                        style={{ width: `${(m.passed / maxModelCount) * 100}%` }}
                        className="bg-emerald-500 transition-all duration-700 flex items-center justify-end px-2"
                        title={`Đạt: ${m.passed}`}
                      >
                        {m.passed > 0 && (m.passed / maxModelCount) > 0.15 && (
                          <span className="text-[10px] sm:text-xs font-black text-emerald-950 font-mono">
                            {m.passed.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div
                        style={{ width: `${(m.failed / maxModelCount) * 100}%` }}
                        className="bg-rose-500 transition-all duration-700 flex items-center justify-center px-1"
                        title={`Lỗi: ${m.failed}`}
                      >
                        {m.failed > 0 && (
                          <span className="text-[10px] font-black text-white font-mono">
                            {m.failed}
                          </span>
                        )}
                      </div>
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
          <span className="text-xs text-slate-400 font-bold italic">
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
                  <span className="text-xs font-black text-slate-500">#{idx + 1}</span>
                  <span className="bg-rose-500/20 text-rose-400 text-xs font-black px-1.5 py-0.5 rounded font-mono">
                    {def.count}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-200 line-clamp-2 leading-tight" title={def.name}>
                  {def.name}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ==================== FOOTER KIOSK ==================== */}
      <footer className="mt-4 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-bold">
        <span>DKBike QLCL • Hệ thống Quản trị Chất lượng Xe điện DK Việt Nhật</span>
        <span>
          Tự động đồng bộ Realtime • Lần làm mới gần nhất: {lastRefreshedAt.toLocaleTimeString('vi-VN')}
        </span>
      </footer>
    </div>
  );
}
