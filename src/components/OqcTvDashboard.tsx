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
  Clock,
  Timer
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

// Chuyển chuỗi giờ:phút thành số giây trong ngày
function parseTimeToSeconds(timeStr?: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

export default function OqcTvDashboard({ oqcRecords = [], oqcHandoverList = [] }: OqcTvDashboardProps) {
  // Bộ lọc thời gian trên TV: 'all' | 'year' | 'month' | 'today' | 'custom_date'
  const [timeFilter, setTimeFilter] = useState<'all' | 'year' | 'month' | 'today' | 'custom_date'>('all');
  const [customDate, setCustomDate] = useState<string>(''); // YYYY-MM-DD
  const [currentTime, setCurrentTime] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  
  // Thời gian nghỉ trưa (phút), mặc định 90 phút (1h30p) - có thể chỉnh thành 60p, 0p...
  const [breakMinutes, setBreakMinutes] = useState<number>(() => {
    try {
      const saved = safeStorage.getItem('dk_oqc_takt_break_minutes');
      if (saved !== null && saved !== undefined && !isNaN(Number(saved))) {
        return Math.max(0, Number(saved));
      }
    } catch { }
    return 90;
  });

  const handleBreakMinutesChange = (val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : Math.min(val, 360));
    setBreakMinutes(safeVal);
    try {
      safeStorage.setItem('dk_oqc_takt_break_minutes', String(safeVal));
    } catch { }
  };

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

  // Chuẩn hóa ngày chọn tùy chỉnh YYYY-MM-DD -> DD/MM/YYYY
  const customDateStd = useMemo(() => {
    if (!customDate) return '';
    const p = customDate.split('-');
    if (p.length === 3) return `${p[2].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[0]}`;
    return '';
  }, [customDate]);

  // Cờ báo hiệu đang xem theo NGÀY (Hôm nay hoặc 1 ngày cụ thể)
  const isDateFilterActive = timeFilter === 'today' || (timeFilter === 'custom_date' && Boolean(customDateStd));

  // Cho phép cuộn trang trên điện thoại di động khi xem màn hình TV
  useEffect(() => {
    const origBodyOverflow = document.body.style.overflow;
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origBodyHeight = document.body.style.height;
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.style.height = 'auto';
    return () => {
      document.body.style.overflow = origBodyOverflow;
      document.documentElement.style.overflow = origHtmlOverflow;
      document.body.style.height = origBodyHeight;
    };
  }, []);

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

    // Thu thập mốc thời gian trong ngày để đo Takt Time
    const dayCheckTimesInSec: number[] = [];

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
      } else if (timeFilter === 'custom_date') {
        if (stdDate !== customDateStd) continue;
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

        // Thu thập thời gian ghi nhận lắp ráp/kiểm tra trong ngày để đo Takt Time
        if (isDateFilterActive) {
          let sec = parseTimeToSeconds(r.checkTime);
          if (sec === null && (r.createdAt || r.updatedAt)) {
            try {
              const dt = new Date(r.updatedAt || r.createdAt);
              if (!isNaN(dt.getTime())) {
                sec = dt.getHours() * 3600 + dt.getMinutes() * 60 + dt.getSeconds();
              }
            } catch { }
          }
          if (sec !== null) {
            dayCheckTimesInSec.push(sec);
          }
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

    // Top các model lắp ráp nhiều nhất (Top 10 model)
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

    // Tính toán Takt Time dựa trên mốc thời gian đầu tiên và mới nhất trong ngày
    let taktTimeDisplay = '--';
    let taktTimeUnit = '';
    let taktTimeSub = 'Chưa có mốc thời gian';
    let taktEarliestStr = '--:--';
    let taktLatestStr = '--:--';
    let isBreakDeducted = false;

    if (dayCheckTimesInSec.length > 0) {
      const minSec = Math.min(...dayCheckTimesInSec);
      const maxSec = Math.max(...dayCheckTimesInSec);
      const minH = String(Math.floor(minSec / 3600)).padStart(2, '0');
      const minM = String(Math.floor((minSec % 3600) / 60)).padStart(2, '0');
      const maxH = String(Math.floor(maxSec / 3600)).padStart(2, '0');
      const maxM = String(Math.floor((maxSec % 3600) / 60)).padStart(2, '0');
      taktEarliestStr = `${minH}:${minM}`;
      taktLatestStr = `${maxH}:${maxM}`;

      const rawSpanSec = maxSec - minSec;
      const cars = lapRapTotal;

      // Kiểm tra có xe ở cả buổi sáng (< 12h00) và buổi chiều (> 13h00)
      const hasMorningSession = minSec < (12 * 3600);
      const hasAfternoonSession = maxSec > (13 * 3600);
      const hasBothSessions = hasMorningSession && hasAfternoonSession;

      let effectiveSpanSec = rawSpanSec;
      if (hasBothSessions && breakMinutes > 0) {
        effectiveSpanSec = Math.max(0, rawSpanSec - (breakMinutes * 60));
        isBreakDeducted = true;
      }

      const effectiveSpanMin = Math.round(effectiveSpanSec / 60);

      if (cars > 0 && effectiveSpanSec > 0) {
        const taktSecPerCar = Math.round(effectiveSpanSec / cars);
        if (taktSecPerCar < 60) {
          taktTimeDisplay = `${taktSecPerCar}`;
          taktTimeUnit = 'giây / xe';
        } else {
          taktTimeDisplay = (taktSecPerCar / 60).toFixed(1);
          taktTimeUnit = 'phút / xe';
        }

        if (isBreakDeducted) {
          taktTimeSub = `${taktEarliestStr} ➔ ${taktLatestStr} (${effectiveSpanMin}p làm việc / ${cars} xe • trừ ${breakMinutes}p trưa)`;
        } else {
          taktTimeSub = `${taktEarliestStr} ➔ ${taktLatestStr} (${effectiveSpanMin}p / ${cars} xe)`;
        }
      } else if (cars === 1 || minSec === maxSec) {
        taktTimeDisplay = '1 xe';
        taktTimeUnit = 'hoàn thành';
        taktTimeSub = `Thời gian ghi nhận: ${taktEarliestStr}`;
      }
    }

    return {
      yearTotalAssembled,
      totalLsx,
      lapRapTotal,
      datCount,
      loiCount,
      datRate,
      loiRate,
      topModels,
      topDefects,
      taktTimeDisplay,
      taktTimeUnit,
      taktTimeSub,
      taktEarliestStr,
      taktLatestStr,
      isBreakDeducted
    };
  }, [oqcRecords, timeFilter, todayStr, customDateStd, isDateFilterActive, currentMonth, currentYear, breakMinutes]);

  // Đếm số lượng xe quét bàn giao tương ứng với bộ lọc thời gian
  const handoverCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < localHandoverList.length; i++) {
      const item = localHandoverList[i];
      const stdDate = item.date ? standardizeDateFast(item.date) : '';
      if (timeFilter === 'today') {
        if (stdDate !== todayStr) continue;
      } else if (timeFilter === 'custom_date') {
        if (stdDate !== customDateStd) continue;
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
  }, [localHandoverList, timeFilter, todayStr, customDateStd, currentMonth, currentYear]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const maxModelCount = Math.max(1, ...(stats.topModels.map(m => m.count)));
  const peakVal = Math.max(...stats.topModels.map(m => m.count), 0);
  const maxVal = peakVal > 0 ? Math.ceil((peakVal * 1.18) / 20) * 20 : 100;
  const tickStep = maxVal / 4;
  const yTicks = [
    Math.round(tickStep * 4),
    Math.round(tickStep * 3),
    Math.round(tickStep * 2),
    Math.round(tickStep * 1),
    0
  ];

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white font-sans flex flex-col p-3 sm:p-5 antialiased overflow-y-auto overflow-x-hidden">
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
          {/* Bộ lọc thời gian: Tất cả (mặc định) | Năm 2026 | Tháng | Hôm nay | Lịch chọn ngày */}
          <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setTimeFilter('all');
                setCustomDate('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timeFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeFilter('year');
                setCustomDate('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timeFilter === 'year' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Năm {currentYear}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeFilter('month');
                setCustomDate('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timeFilter === 'month' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tháng {currentMonth}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeFilter('today');
                setCustomDate('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timeFilter === 'today' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hôm nay
            </button>

            {/* Ô chọn ngày */}
            <div className="flex items-center pl-1 border-l border-slate-700/80">
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setCustomDate(e.target.value);
                    setTimeFilter('custom_date');
                  } else {
                    setCustomDate('');
                    setTimeFilter('all');
                  }
                }}
                className={`text-xs px-2 py-1 rounded-lg bg-slate-900 border transition cursor-pointer outline-none ${
                  timeFilter === 'custom_date'
                    ? 'border-blue-500 text-white font-bold'
                    : 'border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="Chọn ngày cụ thể để xem Takt Time và tiến độ ngày đó"
              />
            </div>

            {/* Ô chỉnh số phút nghỉ trưa khi xem theo ngày */}
            {isDateFilterActive && (
              <div className="flex items-center gap-1 pl-2 border-l border-slate-700/80 text-xs text-slate-300">
                <span className="text-[11px] text-slate-400 whitespace-nowrap">Nghỉ trưa:</span>
                <input
                  type="number"
                  min="0"
                  max="300"
                  step="5"
                  value={breakMinutes}
                  onChange={(e) => handleBreakMinutesChange(Number(e.target.value))}
                  className="w-12 px-1 py-0.5 text-center font-bold bg-slate-900 border border-slate-700 rounded-lg text-amber-300 focus:border-amber-400 outline-none text-xs"
                  title="Thời gian nghỉ trưa (phút) - Tự động trừ khi có xe cả sáng (<12h) và chiều (>13h)"
                />
                <span className="text-[11px] text-slate-400">p</span>
              </div>
            )}
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

        {/* Thẻ 3: SL xe theo LSX HOẶC TAKT TIME khi chọn ngày */}
        {isDateFilterActive ? (
          <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-md flex flex-col justify-between min-h-[145px]">
            <div className="flex justify-between items-start">
              <span className="text-xs sm:text-sm font-black uppercase text-amber-400 tracking-wider">
                Takt Time (Nhịp Xe)
              </span>
              <Timer className="w-5 h-5 text-amber-400" />
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-amber-300 tabular-nums tracking-tight">
                  {stats.taktTimeDisplay}
                </span>
                {stats.taktTimeUnit && (
                  <span className="text-xs font-bold text-amber-400/90">{stats.taktTimeUnit}</span>
                )}
              </div>
              <span className="text-xs text-slate-400 font-bold block mt-0.5 truncate" title={stats.taktTimeSub}>
                {stats.taktTimeSub}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>{stats.taktEarliestStr} - {stats.taktLatestStr}</span>
              <div className="flex items-center gap-1 text-[11px]" title="Thời gian nghỉ trưa (phút) - Tự động trừ khi làm cả sáng và chiều">
                <span className="text-slate-400">Trưa:</span>
                <input
                  type="number"
                  min="0"
                  max="300"
                  step="5"
                  value={breakMinutes}
                  onChange={(e) => handleBreakMinutesChange(Number(e.target.value))}
                  className="w-11 px-1 py-0.5 text-center font-bold bg-slate-900 border border-slate-700 rounded text-amber-300 focus:border-amber-400 outline-none text-xs"
                />
                <span className="text-slate-400">p</span>
              </div>
            </div>
          </div>
        ) : (
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
        )}

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

        {/* Biểu đồ Cột Sản Lượng Model Lắp Ráp - Biểu đồ cột đứng trực quan */}
        <div className="lg:col-span-2 bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5 mb-2">
            <div>
              <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-200">
                Sản Lượng Model Lắp Ráp
              </h3>
              <span className="text-xs font-bold text-slate-400">
                Biểu đồ cột sản lượng theo dòng xe
              </span>
            </div>
            <span className="text-xs text-blue-400 font-mono font-bold bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-400/20">
              {stats.topModels.length} Model chủ lực
            </span>
          </div>

          {stats.topModels.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 italic">
              Chưa có dữ liệu lắp ráp trong kỳ lọc này.
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-end pt-2 pb-1 relative select-none">
              <div className="h-[210px] sm:h-[230px] w-full relative">
                {/* Horizontal Gridlines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {yTicks.map((tick) => (
                    <div key={tick} className="flex items-center w-full relative h-0">
                      <span className="text-[10px] sm:text-xs text-slate-400 font-bold tabular-nums w-10 shrink-0 pb-1 text-right pr-2">
                        {tick.toLocaleString()}
                      </span>
                      <div className="flex-1 border-t border-dashed border-slate-700/60" />
                    </div>
                  ))}
                </div>

                {/* Vertical Columns Container */}
                <div className="absolute inset-y-0 left-12 right-0 flex justify-around items-end z-10 bottom-[1px]">
                  {stats.topModels.map((item) => {
                    const heightPerc = `${Math.min(100, Math.max(6, (item.count / maxVal) * 100))}%`;
                    const colWidth = Math.max(6, Math.min(15, 85 / Math.max(stats.topModels.length, 1)));

                    return (
                      <div
                        key={item.name}
                        className="flex flex-col items-center h-full justify-end relative group"
                        style={{ width: `${colWidth}%` }}
                      >
                        {/* Vertical Column Bar */}
                        <div
                          className="w-full bg-gradient-to-t from-blue-600 via-blue-500 to-sky-400 rounded-t-lg flex flex-col justify-start items-center pt-1.5 relative shadow-md transition-all duration-500 hover:brightness-110"
                          style={{ height: heightPerc }}
                        >
                          {/* Floating Count Badge on top of column */}
                          <div className="bg-white text-blue-900 font-black text-[10px] sm:text-xs px-1.5 py-0.5 rounded shadow-md tabular-nums tracking-tight select-none">
                            {item.count.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* X-Axis Labels (Model Names) */}
              <div className="flex justify-around items-center pl-12 pt-2 border-t border-slate-700/80 mt-1">
                {stats.topModels.map((item) => {
                  const colWidth = Math.max(6, Math.min(15, 85 / Math.max(stats.topModels.length, 1)));
                  return (
                    <div
                      key={item.name}
                      className="text-[10px] sm:text-xs font-black text-slate-300 uppercase truncate text-center leading-tight tracking-tight px-0.5"
                      style={{ width: `${colWidth}%` }}
                      title={item.name}
                    >
                      {item.name.replace(/^DK\s+/i, '')}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
