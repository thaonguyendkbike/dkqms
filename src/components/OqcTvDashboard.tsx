import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Maximize2,
  Minimize2,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart3,
  Clock,
  Layers,
  ArrowUpRight,
  Zap,
  Target,
  RefreshCw
} from 'lucide-react';

interface OqcTvDashboardProps {
  oqcRecords?: any[];
  oqcHandoverList?: any[];
  onBackToApp?: () => void;
}

export default function OqcTvDashboard({
  oqcRecords = [],
  oqcHandoverList = [],
  onBackToApp
}: OqcTvDashboardProps) {
  // Bộ lọc thời gian trên TV: 'today' (mặc định cho kiosk ca làm việc) hoặc 'all' hoặc 'month'
  const [timeFilter, setTimeFilter] = useState<'today' | 'month' | 'year' | 'all'>('month');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Đồng hồ thời gian thực
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Lắng nghe sự kiện toàn màn hình
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Tính ngày hiện tại
  const todayStr = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);

  // Tính số ngày còn lại trong tháng
  const daysLeftInMonth = useMemo(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(0, lastDayOfMonth - now.getDate());
  }, []);

  // Lọc dữ liệu theo bộ lọc thời gian
  const filteredRecords = useMemo(() => {
    if (!oqcRecords || oqcRecords.length === 0) return [];

    return oqcRecords.filter((rec) => {
      if (!rec) return false;
      const recDate = rec.date || rec.createdAt || '';
      if (!recDate) return true;

      if (timeFilter === 'today') {
        return recDate.startsWith(todayStr);
      }
      if (timeFilter === 'month') {
        const ym = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
        return recDate.startsWith(ym);
      }
      if (timeFilter === 'year') {
        return recDate.startsWith(String(currentYear));
      }
      return true;
    });
  }, [oqcRecords, timeFilter, todayStr, currentYear, currentMonth]);

  // Lọc handover theo bộ lọc thời gian
  const filteredHandover = useMemo(() => {
    if (!oqcHandoverList || oqcHandoverList.length === 0) return [];
    return oqcHandoverList.filter((item) => {
      if (!item) return false;
      const d = item.date || item.createdAt || '';
      if (!d) return true;
      if (timeFilter === 'today') return d.startsWith(todayStr);
      if (timeFilter === 'month') {
        const ym = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
        return d.startsWith(ym);
      }
      if (timeFilter === 'year') return d.startsWith(String(currentYear));
      return true;
    });
  }, [oqcHandoverList, timeFilter, todayStr, currentYear, currentMonth]);

  // Các chỉ số KPI tổng hợp
  const stats = useMemo(() => {
    // 1. Tổng xe lắp ráp cả năm 2026 (cố định để đo KPI năm)
    const yearRecords = oqcRecords.filter((r) => {
      const d = r.date || r.createdAt || '';
      return d.startsWith(String(currentYear));
    });
    const totalYearAssembly = yearRecords.reduce((sum, r) => sum + (Number(r.actualQuantity) || Number(r.quantity) || 1), 0);

    // 2. Chỉ số theo bộ lọc hiện tại
    let totalLsx = 0;
    let totalAssembly = 0;
    let totalPass = 0;
    let totalDefects = 0;

    filteredRecords.forEach((r) => {
      const plan = Number(r.planQuantity) || Number(r.quantity) || 0;
      const actual = Number(r.actualQuantity) || Number(r.quantity) || 0;
      const pass = Number(r.passQuantity) || (r.status === 'Pass' || r.status === 'Đạt' ? actual : 0);
      const defect = Number(r.defectQuantity) || (r.defects?.length || 0);

      totalLsx += plan > 0 ? plan : actual;
      totalAssembly += actual;
      totalPass += pass;
      totalDefects += defect;
    });

    // Nếu không có số Pass cụ thể, ước tính dựa trên xe không lỗi
    if (totalPass === 0 && totalAssembly > 0) {
      totalPass = Math.max(0, totalAssembly - totalDefects);
    }

    const passRate = totalAssembly > 0 ? Math.min(100, Math.round((totalPass / totalAssembly) * 1000) / 10) : 0;
    const defectRate = totalAssembly > 0 ? Math.max(0, Math.round((100 - passRate) * 10) / 10) : 0;

    // Tổng số lượng bàn giao báo phẩm
    const totalHandoverBaoPham = filteredHandover.reduce((sum, item) => {
      return sum + (Number(item.quantity) || 1);
    }, 0);

    return {
      totalYearAssembly,
      totalLsx: totalLsx || totalAssembly,
      totalAssembly,
      totalPass,
      totalDefects: Math.max(0, totalAssembly - totalPass),
      passRate,
      defectRate,
      totalHandoverBaoPham
    };
  }, [oqcRecords, filteredRecords, filteredHandover, currentYear]);

  // Phân tích sản lượng theo Model (Top 6 model để biểu đồ to, dày và trực quan)
  const topModels = useMemo(() => {
    const map = new Map<string, { model: string; count: number; pass: number; defect: number }>();

    filteredRecords.forEach((r) => {
      const model = (r.modelName || r.model || r.productName || 'Khác').trim();
      const count = Number(r.actualQuantity) || Number(r.quantity) || 1;
      const isDefect = (r.defects && r.defects.length > 0) || r.status === 'Fail' || r.status === 'Lỗi';

      const prev = map.get(model) || { model, count: 0, pass: 0, defect: 0 };
      prev.count += count;
      if (isDefect) {
        prev.defect += count;
      } else {
        prev.pass += count;
      }
      map.set(model, prev);
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.count - a.count);
    return sorted.slice(0, 6); // Lấy Top 6 model
  }, [filteredRecords]);

  const maxModelCount = useMemo(() => {
    return Math.max(...topModels.map((m) => m.count), 1);
  }, [topModels]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden p-3 sm:p-5 lg:p-6">
      {/* ==================== HEADER THANH LỊCH CHO TIVI ==================== */}
      <header className="flex items-center justify-between pb-4 sm:pb-5 border-b border-slate-800/80 mb-4 sm:mb-6">
        {/* Brand & Tên phân hệ */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-2 ring-sky-400/30">
            <span className="text-white font-black text-xl sm:text-2xl tracking-tighter">DK</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold tracking-widest uppercase text-sky-400">
                DKBike • Xe Cho Cả Gia Đình
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-sky-950 text-sky-300 border border-sky-800/60 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                TV KIOSK LIVE
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              BẢNG ĐIỀU HÀNH CHẤT LƯỢNG XUẤT XƯỞNG (OQC)
            </h1>
          </div>
        </div>

        {/* Bộ lọc thời gian & Đồng hồ */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Quick Filters */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                timeFilter === 'today'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                timeFilter === 'month'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tháng {currentMonth}
            </button>
            <button
              onClick={() => setTimeFilter('year')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                timeFilter === 'year'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Năm {currentYear}
            </button>
          </div>

          {/* Clock */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono text-sm sm:text-base font-bold shadow-sm">
            <Clock className="w-4 h-4 text-sky-400 animate-spin-slow" />
            <span>
              {currentTime.toLocaleDateString('vi-VN')} {currentTime.toLocaleTimeString('vi-VN')}
            </span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all shadow-sm"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình Tivi'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5 text-amber-400" /> : <Maximize2 className="w-5 h-5 text-sky-400" />}
          </button>

          {/* Back button (nếu cần thoát Kiosk về app chính) */}
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-rose-950 border border-slate-800 hover:border-rose-700 text-slate-400 hover:text-rose-300 text-xs sm:text-sm font-bold transition-all"
            >
              Về ứng dụng
            </button>
          )}
        </div>
      </header>

      {/* ==================== 6 THẺ KPI SIÊU TO - RÕ RÀNG CHO TIVI ==================== */}
      <section className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5 mb-5 sm:mb-6">
        {/* THẺ 1: TIẾN ĐỘ LẮP RÁP NĂM */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-sky-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-xl shadow-sky-950/20 backdrop-blur-md flex flex-col justify-between relative overflow-hidden group min-h-[170px] sm:min-h-[190px]">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-sky-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-sky-500/20 transition-all"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-sky-400">
                LẮP RÁP NĂM {currentYear}
              </span>
              <Target className="w-5 h-5 text-sky-400" />
            </div>
            <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tabular-nums tracking-tight leading-none mt-1">
              {stats.totalYearAssembly.toLocaleString('vi-VN')}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400 font-medium">Toàn bộ năm {currentYear}</span>
            <span className="text-sky-300 font-bold bg-sky-950/80 px-2 py-0.5 rounded-lg border border-sky-800/50">
              Lũy kế
            </span>
          </div>
        </div>

        {/* THẺ 2: NGÀY CÒN LẠI THÁNG */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-indigo-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-xl shadow-indigo-950/20 backdrop-blur-md flex flex-col justify-between relative overflow-hidden group min-h-[170px] sm:min-h-[190px]">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/20 transition-all"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-indigo-400">
                NGÀY CÒN LẠI
              </span>
              <Calendar className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <div className="w-16 h-14 sm:w-20 sm:h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-3xl sm:text-5xl font-black text-indigo-300 shadow-inner">
                {daysLeftInMonth}
              </div>
              <span className="text-base sm:text-lg font-bold text-slate-400">ngày</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400 font-medium">Tháng {currentMonth}/{currentYear}</span>
            <span className="text-indigo-300 font-bold bg-indigo-950/80 px-2 py-0.5 rounded-lg border border-indigo-800/50">
              Chu kỳ
            </span>
          </div>
        </div>

        {/* THẺ 3: SL XE THEO KẾ HOẠCH (LSX) */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-purple-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-xl shadow-purple-950/20 backdrop-blur-md flex flex-col justify-between relative overflow-hidden group min-h-[170px] sm:min-h-[190px]">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/20 transition-all"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-purple-400">
                SL XE THEO LSX
              </span>
              <Layers className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tabular-nums tracking-tight leading-none mt-1">
              {stats.totalLsx.toLocaleString('vi-VN')}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400 font-medium">Kế hoạch chỉ tiêu</span>
            <span className="text-purple-300 font-bold bg-purple-950/80 px-2 py-0.5 rounded-lg border border-purple-800/50">
              Mục tiêu
            </span>
          </div>
        </div>

        {/* THẺ 4: SL XE ĐÃ LẮP RÁP (THỰC TẾ) */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-amber-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-xl shadow-amber-950/20 backdrop-blur-md flex flex-col justify-between relative overflow-hidden group min-h-[170px] sm:min-h-[190px]">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400">
                SL XE LẮP RÁP
              </span>
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-amber-300 tabular-nums tracking-tight leading-none mt-1">
              {stats.totalAssembly.toLocaleString('vi-VN')}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400 font-medium">Tiến độ thực tế</span>
            <span className="text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-800/50">
              {stats.totalLsx > 0 ? Math.round((stats.totalAssembly / stats.totalLsx) * 100) : 100}% LSX
            </span>
          </div>
        </div>

        {/* THẺ 5: SL XE ĐẠT LẦN 1 */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-emerald-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-xl shadow-emerald-950/20 backdrop-blur-md flex flex-col justify-between relative overflow-hidden group min-h-[170px] sm:min-h-[190px]">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400">
                SL ĐẠT LẦN 1
              </span>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-emerald-400 tabular-nums tracking-tight leading-none mt-1">
              {stats.totalPass.toLocaleString('vi-VN')}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400 font-medium">Tỷ lệ đạt chuẩn</span>
            <span className="text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-800/50">
              {stats.passRate}%
            </span>
          </div>
        </div>

        {/* THẺ 6: BÁO PHẨM BÀN GIAO */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-rose-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-xl shadow-rose-950/20 backdrop-blur-md flex flex-col justify-between relative overflow-hidden group min-h-[170px] sm:min-h-[190px]">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/20 transition-all"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-400">
                BÁO PHẨM BÀN GIAO
              </span>
              <XCircle className="w-5 h-5 text-rose-400" />
            </div>
            <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-rose-400 tabular-nums tracking-tight leading-none mt-1">
              {stats.totalHandoverBaoPham.toLocaleString('vi-VN')}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400 font-medium">Báo phẩm bàn giao</span>
            <span className="text-rose-300 font-bold bg-rose-950/80 px-2 py-0.5 rounded-lg border border-rose-800/50">
              {stats.totalAssembly > 0 ? (stats.defectRate).toFixed(1) : '0'}% Lỗi
            </span>
          </div>
        </div>
      </section>

      {/* ==================== PHẦN BIỂU ĐỒ TRUNG TÂM (ĐÃ THU GỌN DIỆN TÍCH NHƯNG CỰC DÀY DẶN & DỄ ĐỌC TỪ XA) ==================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 flex-1">
        {/* CỘT TRÁI (4 cols): BIỂU ĐỒ DONUT TỶ LỆ ĐẠT / LỖI TRỰC QUAN */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
              <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                TÌNH TRẠNG KIỂM TRA
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
              {stats.totalAssembly} Xe xuất xưởng
            </span>
          </div>

          {/* Donut Chart SVG */}
          <div className="relative flex items-center justify-center my-auto py-4">
            <svg className="w-48 h-48 sm:w-56 sm:h-56 transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="42%"
                className="text-slate-800"
                strokeWidth="16"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Pass segment */}
              <circle
                cx="50%"
                cy="50%"
                r="42%"
                className="text-emerald-500 transition-all duration-1000 ease-out"
                strokeWidth="16"
                strokeDasharray={`${2 * Math.PI * 80}`}
                strokeDashoffset={`${2 * Math.PI * 80 * (1 - (stats.passRate || 0) / 100)}`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">
                ĐẠT CHUẨN
              </span>
              <span className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight my-0.5">
                {stats.passRate}%
              </span>
              <span className="text-xs font-bold text-slate-400">
                {stats.totalPass.toLocaleString('vi-VN')} xe
              </span>
            </div>
          </div>

          {/* 2 Chân thẻ: Đạt vs Lỗi */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/80">
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-black uppercase mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Đạt chuẩn</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-300">
                {stats.totalPass.toLocaleString('vi-VN')}
              </div>
              <div className="text-[11px] font-bold text-emerald-400/80 mt-0.5">
                {stats.passRate}% tổng số
              </div>
            </div>

            <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-black uppercase mb-1">
                <XCircle className="w-4 h-4" />
                <span>Sai lỗi</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-300">
                {stats.totalDefects.toLocaleString('vi-VN')}
              </div>
              <div className="text-[11px] font-bold text-rose-400/80 mt-0.5">
                {stats.defectRate}% tổng số
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (8 cols): BIỂU ĐỒ SẢN LƯỢNG MODEL - THANH DÀY TO, CỰC KỲ DỄ NHÌN TỪ KHOẢNG CÁCH XA */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-400" />
              <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                SẢN LƯỢNG TOP MODEL LẮP RÁP
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
              Hiển thị {topModels.length} Model chủ lực
            </span>
          </div>

          {/* Danh sách thanh ngang dày to */}
          <div className="space-y-3.5 sm:space-y-4 my-auto">
            {topModels.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-bold">
                Chưa có dữ liệu model lắp ráp trong kỳ này
              </div>
            ) : (
              topModels.map((item, idx) => {
                const percentage = Math.round((item.count / maxModelCount) * 100);
                const passRate = item.count > 0 ? Math.round((item.pass / item.count) * 100) : 100;

                return (
                  <div key={item.model} className="group">
                    {/* Tên model & Số lượng */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-sky-950 text-sky-400 border border-sky-800/80 flex items-center justify-center font-black text-xs">
                          {idx + 1}
                        </span>
                        <span className="text-sm sm:text-base lg:text-lg font-black text-slate-200 group-hover:text-white transition-colors">
                          {item.model}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs sm:text-sm font-semibold text-slate-400">
                          Đạt {passRate}%
                        </span>
                        <span className="text-base sm:text-xl font-black text-sky-300 tabular-nums">
                          {item.count.toLocaleString('vi-VN')} <span className="text-xs font-medium text-slate-400">xe</span>
                        </span>
                      </div>
                    </div>

                    {/* Thanh Bar dày to (h-7 hoặc h-8) chia Đạt / Lỗi */}
                    <div className="h-7 sm:h-8 w-full bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden p-0.5 flex relative shadow-inner">
                      {/* Pass Bar */}
                      <div
                        style={{ width: `${(percentage * (passRate / 100)).toFixed(1)}%` }}
                        className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 rounded-lg flex items-center justify-end px-2 transition-all duration-700 shadow-md shadow-emerald-500/20"
                      >
                        {item.pass > 0 && percentage > 15 && (
                          <span className="text-[11px] font-black text-emerald-950">
                            {item.pass}
                          </span>
                        )}
                      </div>

                      {/* Defect Bar */}
                      {item.defect > 0 && (
                        <div
                          style={{ width: `${(percentage * ((100 - passRate) / 100)).toFixed(1)}%` }}
                          className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-lg flex items-center justify-center px-1 transition-all duration-700 shadow-md shadow-rose-500/20 ml-0.5"
                        >
                          <span className="text-[10px] font-black text-white">
                            {item.defect}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chú thích biểu đồ */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs sm:text-sm font-semibold text-slate-400 mt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-500"></span>
                <span>Đạt chuẩn</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-rose-500"></span>
                <span>Có lỗi (KCS phát hiện)</span>
              </div>
            </div>
            <div className="text-slate-400 font-bold hidden sm:block">
              Tự động cập nhật thời gian thực từ trạm KCS
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="mt-4 sm:mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        <div>
          Công ty TNHH Xe điện DK Việt Nhật • Phòng Quản lý chất lượng (DK QMS)
        </div>
        <div className="flex items-center gap-1.5 text-sky-400 font-medium">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Hệ thống hiển thị trực quan Kiosk TV 4K/FullHD</span>
        </div>
      </footer>
    </div>
  );
}
