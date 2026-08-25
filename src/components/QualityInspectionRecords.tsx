import React, { useState, useEffect, FormEvent, useMemo, useCallback, useRef } from 'react';
import XLSXStyle from 'xlsx-js-style';
import { 
  Wrench, 
  Plus, 
  Download, 
  Building2, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  Search, 
  Target,
  AlertTriangle, 
  Sliders, 
  AlertOctagon,
  Calendar,
  Upload,
  FileText,
  FileSpreadsheet,
  Printer,
  Check,
  Pencil,
  Trash2,
  Eye,
  Camera,
  CheckSquare,
  XCircle,
  AlertCircle,
  Users,
  Settings,
  RefreshCw,
  Truck,
  MoreVertical,
  Filter,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Zap,
  Copy,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Tag,
  QrCode,
  ArrowRight,
  Palette,
  Layers,
  Save
} from 'lucide-react';
import { IQCRecord, PQCRecord, OQCRecord, OqcColorChangeRecord, OqcPartCodeItem, INITIAL_OQC_PART_CODES } from '../qualityTestData';
import { safeStorage } from '../safeStorage';
import { trackDeletedId } from '../App';
import { compressImageFile } from '../imageCompressor';
import { Supplier, PTSPTask, MarketDefect, CAPA, SupplierProductionAudit, MonthlyPlan } from '../types';
import { DailyLogRecord } from '../dailyLogsData';
import { db, auth } from '../firebase';
import { doc, setDoc, getDocFromServer } from 'firebase/firestore';
import { sanitizeFirestorePayload } from '../safeStorage';
import { calculateAQLSample, AQLLevel, InspectionLevel, getAQLCodeLetter, CODE_LETTER_SAMPLE_SIZE, AQL_AC_RE_TABLE } from '../utils/aqlUtils';

const COLOR_KEYWORDS = [
  'trắng', 'đỏ', 'đen', 'xanh', 'ghi', 'xám', 'cam', 'vàng', 'tím', 'bạc', 'hồng', 'nâu',
  'đồng', 'rêu', 'ngọc', 'xi măng', 'cửu long', 'bộ đội', 'pha lê', 'rubi', 'sần', 'bóng',
  'nhám', 'mờ', 'tiêu chuẩn', 'khác', 'dòng khác', 'cherry', 'ánh tím', 'ngọc trinh', 'nfc',
  '2 màu', 'phối màu', 'chuyển màu', 'đổi màu', 'đổi', 'màu', 'matte', 'gloss', 'white',
  'black', 'red', 'blue', 'gray', 'grey', 'silver', 'gold', 'yellow', 'green', 'pink',
  'purple', 'brown', 'cyan', 'orange'
];

const KNOWN_MODEL_KEYWORDS = [
  'roma', 'gogo', 'd2', 'nova', 'ez3', 'samurai', 'xmen', 'xman', 'crea', 's1', 's2', 's3',
  'z-mtp', 'zmtp', 'zmt', 'v2', 'miku', 'priti', 'temdd', 'temdv'
];

export const isColorOnlyString = (str: string): boolean => {
  if (!str) return false;
  const sLow = str.trim().toLowerCase();
  
  if (sLow.startsWith('dk ') || KNOWN_MODEL_KEYWORDS.some(k => sLow.includes(k))) {
    return false;
  }
  
  const parts = sLow.split(/[\-\/]/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return false;
  
  const allPartsAreColors = parts.every(p => 
    COLOR_KEYWORDS.some(c => p === c || p.startsWith(c) || p.endsWith(c) || p.includes(c))
  );
  
  return allPartsAreColors;
};

export const isKnownModelString = (str: string): boolean => {
  if (!str) return false;
  const sLow = str.trim().toLowerCase();
  return sLow.startsWith('dk ') || KNOWN_MODEL_KEYWORDS.some(k => sLow.includes(k));
};

export interface EcountRow {
  date: string;
  supplierCode: string;
  supplierName: string;
  content: string;
  quantity: number;
  amountText: string;
  locationCode: string;
  locationName: string;
  picName: string;
  itemSummary?: string;
  checked?: boolean;
  sampleQty?: number;
  failedQty?: number;
  defectDetail?: string;
}

export const ECOUNT_PRELOADED_DATA: EcountRow[] = [
  {
    date: "04/06/2026",
    supplierCode: "NCC00912",
    supplierName: "Zhejiang Miheng Technology Co., Ltd. (Thiên Bình)",
    content: "PNK 06001 Thiên Bình nhập tay ga, tay phanh",
    quantity: 60,
    amountText: "760.00",
    locationCode: "Kbhdk",
    locationName: "BH - Kho Phụ tùng bảo hành công ty",
    picName: "Hà Phương Th...",
    checked: true,
    sampleQty: 6,
    failedQty: 0,
    defectDetail: ""
  },
  {
    date: "04/06/2026",
    supplierCode: "DLDL00019",
    supplierName: "ĐL XANH XANH - HỘ KINH DOANH XE ĐIỆN XANH",
    content: "4/6 Nhập AQBH",
    quantity: 1,
    amountText: "",
    locationCode: "Kbhl1",
    locationName: "BH - Kho Phụ tùng lỗi Đại lý chuyển về",
    picName: "Lăng Văn Trườn...",
    checked: false,
    sampleQty: 1,
    failedQty: 0,
    defectDetail: ""
  },
  {
    date: "03/06/2026",
    supplierCode: "NV049",
    supplierName: "Đinh Văn Long",
    content: "PNK 06005 Đinh Văn Long _ đổi trạng thái sạc",
    quantity: -40,
    amountText: "",
    locationCode: "Klksx",
    locationName: "Kho Phụ tùng sản xuất",
    picName: "Bùi Quang Đạo...",
    checked: false,
    sampleQty: 0,
    failedQty: 0,
    defectDetail: ""
  },
  {
    date: "03/06/2026",
    supplierCode: "NCC00781",
    supplierName: "Công ty TNHH TM và SX Thành Đạt",
    content: "PNK 0276 Thành Đạt _ lốp NOVA",
    quantity: 271,
    amountText: "71,502,799.00",
    locationCode: "Klksx",
    locationName: "Kho Phụ tùng sản xuất",
    picName: "Hoàng Văn Xuy...",
    checked: true,
    sampleQty: 27,
    failedQty: 0,
    defectDetail: ""
  },
  {
    date: "03/06/2026",
    supplierCode: "NV194",
    supplierName: "Hoàng Thị Thủy",
    content: "5/5 Phiếu nhập kiểm kê kho bán 5/5->9/5 kiểm Lite 23",
    quantity: -215,
    amountText: "",
    locationCode: "Kbhdk",
    locationName: "BH - Kho Phụ tùng bảo hành công ty",
    picName: "Hoàng Thị Thủy",
    checked: false,
    sampleQty: 0,
    failedQty: 0,
    defectDetail: ""
  },
  {
    date: "03/06/2026",
    supplierCode: "NCC02193",
    supplierName: "Công ty TNHH LICHUANG VIỆT NAM",
    content: "PNK 0275 LICHUANG _khung GO",
    quantity: 1201,
    amountText: "239,750,000.00",
    locationCode: "Klksx",
    locationName: "Kho Phụ tùng sản xuất",
    picName: "Hoàng Văn Xuy...",
    checked: true,
    sampleQty: 120,
    failedQty: 1,
    defectDetail: "Xước sơn nhẹ ở sườn máy xe"
  },
  {
    date: "02/06/2026",
    supplierCode: "NCC00194",
    supplierName: "CÔNG TY LIN HA (NHU BÌNH)",
    content: "PNK 0277 NHU BÌNH _ căn bạc",
    quantity: 6920,
    amountText: "21,100,000.00",
    locationCode: "Klksx",
    locationName: "Kho Phụ tùng sản xuất",
    picName: "Hoàng Văn Xuy...",
    checked: true,
    sampleQty: 200,
    failedQty: 0,
    defectDetail: ""
  },
  {
    date: "02/06/2026",
    supplierCode: "NCC00912",
    supplierName: "Zhejiang Miheng Technology Co., Ltd. (Thiên Bình)",
    content: "PNK 05033 Thiên Bình điều chỉnh hàng về thiếu Nova PNK 05033",
    quantity: -19,
    amountText: "-355.50",
    locationCode: "Klksx",
    locationName: "Kho Phụ tùng sản xuất",
    picName: "Hà Phương Th...",
    checked: false,
    sampleQty: 0,
    failedQty: 0,
    defectDetail: ""
  },
  {
    date: "02/06/2026",
    supplierCode: "NV049",
    supplierName: "Đinh Văn Long",
    content: "PNK 06004 Đinh Văn Long _ nhập tem chữ Nova do sai đơn vị tính (Mến)",
    quantity: 740,
    amountText: "3,330.00",
    locationCode: "Klksx",
    locationName: "Kho Phụ tùng sản xuất",
    picName: "Bùi Quang Đạo...",
    checked: true,
    sampleQty: 74,
    failedQty: 0,
    defectDetail: ""
  },
  {
    date: "02/06/2026",
    supplierCode: "NCC00176",
    supplierName: "Công ty CP UNITED MOTOR Việt Nam (UMV)",
    content: "PNK 0274 UMV _khung EZ5",
    quantity: 2052,
    amountText: "206,568,000.00",
    locationCode: "Klksx",
    locationName: "Kho Phụ tùng sản xuất",
    picName: "Hoàng Văn Xuy...",
    checked: true,
    sampleQty: 125,
    failedQty: 2,
    defectDetail: "Sai lệch dung sai lỗ gá ắc quy"
  },
  {
    date: "02/06/2026",
    supplierCode: "DLLS00071",
    supplierName: "Cửa hàng xe điện 21 Phái Vệ",
    content: "2/6 Nhập LKBH, LKTL (VC)",
    quantity: 6,
    amountText: "",
    locationCode: "Kbhl1",
    locationName: "BH - Kho Phụ tùng lỗi Đại lý chuyển về",
    picName: "Lăng Văn Trườn...",
    checked: false,
    sampleQty: 1,
    failedQty: 0,
    defectDetail: ""
  },
  {
    date: "02/06/2026",
    supplierCode: "DLTH00065",
    supplierName: "ĐL BẰNG HƯƠNG - DOANH NGHIỆP TƯ NHÂN DỊCH VỤ THƯƠNG MẠI BẰNG HƯƠNG K&M",
    content: "2/6 Nhập LKBH (XH)",
    quantity: 1,
    amountText: "",
    locationCode: "Kbhl1",
    locationName: "BH - Kho Phụ tùng lỗi Đại lý chuyển về",
    picName: "Lăng Văn Trườn...",
    checked: false,
    sampleQty: 1,
    failedQty: 0,
    defectDetail: ""
  },
  {
    date: "01/06/2026",
    supplierCode: "DLHT00021",
    supplierName: "HKD Nguyễn Văn Giang (Liêu Giang - Hà Tĩnh)",
    content: "2/6 Nhập LKBH, LKTL (XH)",
    quantity: 50,
    amountText: "",
    locationCode: "Kbhl1",
    locationName: "BH - Kho Phụ tùng lỗi Đại lý chuyển về",
    picName: "Lăng Văn Trườn...",
    checked: false,
    sampleQty: 5,
    failedQty: 0,
    defectDetail: ""
  },
  {
    date: "02/06/2026",
    supplierCode: "DLđN10004.11",
    supplierName: "Trường Hiền giao Quang Luân - Đồng Nai",
    content: "2/6 Nhập LKBH, LKTL (BĐ)",
    quantity: 5,
    amountText: "",
    locationCode: "Kbhl1",
    locationName: "BH - Kho Phụ tùng lỗi Đại lý chuyển về",
    picName: "Lăng Văn Trườn...",
    checked: false,
    sampleQty: 1,
    failedQty: 0,
    defectDetail: ""
  },
  {
    date: "02/06/2026",
    supplierCode: "DLQB00002",
    supplierName: "Cty TNHH Thương Mại Hùng Hồng (Hồng Quảng Bình)",
    content: "2/6 Nhập LKBH (BĐ)",
    quantity: 4,
    amountText: "",
    locationCode: "Kbhl1",
    locationName: "BH - Kho Phụ tùng lỗi Đại lý chuyển về",
    picName: "Lăng Văn Trườn...",
    checked: false,
    sampleQty: 1,
    failedQty: 0,
    defectDetail: ""
  },
  {
    date: "02/06/2026",
    supplierCode: "DLNA00029",
    supplierName: "Công ty TNHH ML Đức Cường (Thảo Cửa Lò)",
    content: "2/6 Nhập LKBH, LKTL (XH)",
    quantity: 125,
    amountText: "",
    locationCode: "Kbhl1",
    locationName: "BH - Kho Phụ tùng lỗi Đại lý chuyển về",
    picName: "Lăng Văn Trườn...",
    checked: false,
    sampleQty: 12,
    failedQty: 0,
    defectDetail: ""
  }
];

interface GroupedOqcRow {
  id: string;
  model: string;
  status: 'Đạt' | 'Lỗi' | 'Chưa kiểm tra';
  isPassed: boolean;
  defectDetail: string;
  rootCause: string;
  totalLlr: number;
  count: number;
  evaluation?: string;
  treatment?: string;
  ids: string[];
  originalRecord: OQCRecord;
}

interface QualityInspectionRecordsProps {
  iqcRecords: IQCRecord[];
  setIqcRecords: (recs: IQCRecord[]) => void;
  pqcRecords: PQCRecord[];
  setPqcRecords: (recs: PQCRecord[]) => void;
  oqcRecords: OQCRecord[];
  setOqcRecords: (recs: OQCRecord[]) => void;
  supplierProductionAudits?: SupplierProductionAudit[];
  setSupplierProductionAudits?: (recs: SupplierProductionAudit[]) => void;
  suppliers: Supplier[];
  dailyLogs?: DailyLogRecord[];
  ptspTasks?: PTSPTask[];
  defects?: MarketDefect[];
  capas?: CAPA[];
  setViewDetailModal?: (modal: { type: string; data: any } | null) => void;
  models?: any[];
  monthlyPlans?: MonthlyPlan[];
  weeklyPlans?: any[];
  setWeeklyPlans?: (plans: any[]) => void;
  setMonthlyPlans?: (plans: any[]) => void;
  initialSubTab?: 'iqc' | 'pqc' | 'oqc' | 'supplier_monitoring' | 'reports';
  initialOqcSearch?: string;
  initialPqcSearch?: string;
  onClearInitialValues?: () => void;
  oqcColorChanges?: OqcColorChangeRecord[];
  setOqcColorChanges?: (changes: OqcColorChangeRecord[]) => void;
  oqcHandoverList?: any[];
  setOqcHandoverList?: (list: any[]) => void;
}

export const isOqcRecordPassed = (r: any): boolean => {
  if (!r) return false;
  const statusStr = String(r.status || r.result || '').trim().toLowerCase();
  if (statusStr === 'đạt' || statusStr === 'pass' || statusStr === 'thông quan' || statusStr === 'ok' || statusStr === 'đã đạt') {
    return true;
  }
  if (statusStr === 'lỗi' || statusStr === 'fail' || statusStr === 'bác bỏ' || statusStr === 'hỏng') {
    return false;
  }
  if (r.failedCount !== undefined && r.failedCount !== null) {
    return Number(r.failedCount) === 0;
  }
  return false;
};

/* ==================== SUB-COMPONENTS FOR KCS/OQC SCREENSHOT-PERFECT DASHBOARD ==================== */

interface PieChartProps {
  datPercentage: number;
  loiPercentage: number;
  datCount: number;
  loiCount: number;
}

function PieChartComponent({ datPercentage, loiPercentage, datCount, loiCount }: PieChartProps) {
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  // Let's compute stroke offset for Dat (Green) slice starting at the end of Loi (Red) slice
  const datStroke = (datPercentage / 100) * circumference;
  const loiStroke = (loiPercentage / 100) * circumference;
  const datOffset = circumference - datStroke;

  return (
    <div className="relative flex items-center justify-center p-3 h-[240px]">
      <svg width="220" height="220" viewBox="0 0 160 160" className="transform -rotate-90">
        {/* Background track */}
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="20" />
        
        {/* Lỗi (Red) slice */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#ff4d4d"
          strokeWidth="20"
          strokeDasharray={circumference}
          strokeDashoffset={0}
          className="transition-all duration-500"
        />

        {/* Đạt (Green) slice */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth="20"
          strokeDasharray={circumference}
          strokeDashoffset={loiStroke}
          className="transition-all duration-500"
        />
      </svg>

      {/* Embedded central summary */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center pointer-events-none select-none">
        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Tổng xe lắp ráp</span>
        <strong className="text-xl font-black text-slate-800 font-mono block">{(datCount + loiCount).toLocaleString()}</strong>
        <span className="text-[10.5px] text-emerald-600 font-extrabold">{datPercentage}% Đạt</span>
      </div>

      {/* Floating indicators */}
      <div className="absolute top-[16%] left-[4%] text-xs bg-white/95 border border-slate-200/80 shadow-md p-1.5 rounded-lg flex flex-col items-start select-none">
        <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Đạt lần 1
        </span>
        <strong className="text-emerald-600 text-xs font-black font-mono mt-0.5">{datCount.toLocaleString()} ({datPercentage}%)</strong>
      </div>
      <div className="absolute bottom-[16%] right-[4%] text-xs bg-white/95 border border-slate-200/80 shadow-md p-1.5 rounded-lg flex flex-col items-end select-none">
        <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Nhóm Lỗi xe
        </span>
        <strong className="text-red-500 text-xs font-black font-mono mt-0.5">{loiCount.toLocaleString()} ({loiPercentage}%)</strong>
      </div>
    </div>
  );
}

interface BarChartProps {
  data: { name: string; count: number }[];
  onBarClick?: (modelName: string) => void;
}

function BarChartComponent({ data, onBarClick }: BarChartProps) {
  const peakVal = Math.max(...data.map(item => item.count), 0);
  // Guarantee a minimum of 100 on the scale or dynamically increase to match maximum model counts
  const maxVal = peakVal > 0 ? Math.ceil(peakVal / 20) * 20 : 100;
  
  const tickStep = maxVal / 4;
  const yTicks = [
    Math.round(tickStep * 4),
    Math.round(tickStep * 3),
    Math.round(tickStep * 2),
    Math.round(tickStep * 1),
    0
  ];

  return (
    <div className="flex flex-col h-[260px] w-full pt-4 relative select-none font-sans">
      <div className="flex-1 relative">
        {/* Horizontal Gridlines */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {yTicks.map((tick) => (
            <div key={tick} className="flex items-center w-full relative h-0">
              <span className="text-[10px] text-slate-400 font-bold font-mono w-8 shrink-0 pb-1 select-none text-right pr-2">{tick}</span>
              <div className="flex-1 border-t border-dashed border-slate-200/80" />
            </div>
          ))}
        </div>

        {/* Vertical Bars Container */}
        <div className="absolute inset-y-0 left-10 right-0 flex justify-around items-end z-10 bottom-[1px]">
          {data.map((item, idx) => {
            const heightPerc = `${Math.min(100, Math.max(4, (item.count / maxVal) * 100))}%`;
            return (
              <div 
                key={item.name} 
                onClick={() => onBarClick?.(item.name)}
                className="flex flex-col items-center h-full justify-end group cursor-pointer relative" 
                style={{ width: '15%' }}
              >
                
                {/* Visual Blue Bar standing vertically */}
                <div 
                  className="w-full bg-[#02a6ff] hover:bg-sky-400 rounded-t-lg transition-all duration-500 flex flex-col justify-start items-center pt-2.5 relative shadow-xs group-hover:scale-105 active:scale-95 group-hover:shadow-md"
                  style={{ height: heightPerc }}
                >
                  {/* Floating count box inside top part of the bar */}
                  <div className="bg-white/95 text-sky-655 font-black text-[10.5px] px-1.5 py-0.5 rounded shadow-sm scale-90 sm:scale-100 select-none font-mono tracking-tighter">
                    {item.count}
                  </div>
                </div>

                {/* Micro-interacting Tooltip */}
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white text-[10px] font-bold p-2 rounded-xl shadow-lg pointer-events-none whitespace-nowrap z-50">
                  <span className="block font-black text-slate-300 uppercase tracking-widest text-[8px]">Dòng xe (Model) - Click xem chi tiết</span>
                  <span className="block text-[11px] text-white font-extrabold mt-0.5">{item.name}</span>
                  <span className="text-sky-305 block font-mono mt-0.5 border-t border-slate-800 pt-0.5">Sản lượng: {item.count} xe (Bấm để xem danh sách)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X-Axis Labels */}
      <div className="flex justify-around items-center pl-10 pt-2 border-t border-slate-200 mt-1 select-none">
        {data.map((item) => (
          <div 
            key={item.name} 
            onClick={() => onBarClick?.(item.name)}
            className="text-[10px] font-black text-slate-500 uppercase truncate text-center leading-tight tracking-tight scale-90 cursor-pointer hover:text-[#02a6ff]" 
            style={{ width: '15%' }} 
            title={item.name}
          >
            {item.name.replace('DK ', '')}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ModelDefectCardProps {
  key?: string | React.Key;
  modelName: string;
  defects: { name: string; count: number }[];
  onDefectClick?: (defectName: string, count: number) => void;
}

function ModelDefectCard({ modelName, defects, onDefectClick }: ModelDefectCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 hover:shadow-md transition-all duration-300 flex flex-col h-full bg-cover">
      <div className="flex justify-between items-center border-b border-rose-50 pb-2.5 mb-3 select-none">
        <h4 className="font-extrabold text-xs text-rose-500 font-mono tracking-tight uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          {modelName}
        </h4>
        <button type="button" className="text-slate-300 hover:text-slate-500 rounded p-1 transition cursor-pointer">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-1.5 flex-1 flex flex-col justify-start">
        {defects.length === 0 ? (
          <div className="py-12 text-center text-[11.5px] text-slate-400 italic font-medium my-auto select-none">
            ✓ Không ghi nhận lỗi KCS
          </div>
        ) : (
          defects.map((defect, idx) => (
            <div 
              key={defect.name} 
              onClick={() => onDefectClick?.(defect.name, defect.count)}
              className="flex justify-between items-center px-2.5 py-2 rounded-xl bg-slate-50/60 border border-slate-100 hover:bg-rose-50/50 hover:border-rose-200 hover:text-rose-950 transition-all font-sans text-xs cursor-pointer active:scale-98 select-none"
              title="Nhấp để xem biện pháp khắc phục & đánh giá"
            >
              <div className="flex items-center gap-2 min-w-0 pr-1.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-black bg-amber-500 shrink-0 font-mono shadow-xs select-none">
                  {idx + 1}
                </span>
                <span className="text-slate-705 font-bold truncate tracking-wide text-[10.5px] uppercase group-hover:text-rose-900" title={defect.name}>
                  {defect.name}
                </span>
              </div>
              <span className="text-red-500 font-black font-mono text-xs shadow-3xs px-2 py-0.5 rounded bg-red-50/50 border border-red-100/30 shrink-0">
                {defect.count}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface AutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  onCommit?: (val: string) => void;
  onFocus?: () => void;
  disabled?: boolean;
}

function AutocompleteInput({
  id,
  value,
  onChange,
  options,
  placeholder = '',
  className = '',
  onCommit,
  onFocus,
  disabled = false
}: AutocompleteInputProps) {
  const [localValue, setLocalValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const normalize = (str: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd');

  const filteredOptions = useMemo(() => {
    if (!localValue || !localValue.trim()) return options.slice(0, 10);
    const normQuery = normalize(localValue.trim());
    const queryTokens = normQuery.split(/\s+/).filter(Boolean);
    return options
      .filter(opt => {
        const normOpt = normalize(opt);
        return queryTokens.every(token => normOpt.includes(token));
      })
      .slice(0, 10);
  }, [localValue, options]);

  const handleSelect = (opt: string) => {
    setLocalValue(opt);
    onChange(opt);
    if (onCommit) onCommit(opt);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
      if (onCommit) onCommit(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }
    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex(prev => (prev + 1 < filteredOptions.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex(prev => (prev - 1 >= 0 ? prev - 1 : filteredOptions.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightIndex]);
        } else {
          setIsOpen(false);
          onChange(localValue);
          if (onCommit) onCommit(localValue);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    } else if (e.key === 'Enter') {
      onChange(localValue);
      if (onCommit) onCommit(localValue);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        id={id}
        ref={inputRef}
        type="text"
        value={localValue}
        disabled={disabled}
        placeholder={placeholder}
        onChange={e => {
          setLocalValue(e.target.value);
          setIsOpen(true);
          setHighlightIndex(-1);
        }}
        onBlur={handleBlur}
        onFocus={() => {
          setIsOpen(true);
          if (onFocus) onFocus();
        }}
        onKeyDown={handleKeyDown}
        className={className}
      />
      {isOpen && filteredOptions.length > 0 && !disabled && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[200px] max-w-[340px] bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-52 overflow-y-auto py-1 animate-in fade-in duration-100">
          <div className="px-2 py-1 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 flex justify-between items-center bg-slate-50/80 select-none">
            <span>Gợi ý lỗi / nguyên nhân</span>
            <span className="font-mono">{filteredOptions.length} kết quả</span>
          </div>
          {filteredOptions.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                handleSelect(opt);
              }}
              onMouseEnter={() => setHighlightIndex(idx)}
              className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                highlightIndex === idx ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="text-slate-400 text-[10px]">✦</span>
              <span className="truncate">{opt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const getDefectAnalysisAndCorrection = (name: string, model: string) => {
  const n = name.toLowerCase();
  
  if (n.includes('khung') || n.includes('xước') || n.includes('trầy') || n.includes('sườn') || n.includes('sơn')) {
    return {
      severity: 'Trung bình (Major - Ngoại quan)',
      severityColor: 'text-amber-600 bg-amber-50 border-amber-200/50',
      category: 'Khung sườn & Thẩm mỹ vỏ ngoài',
      impact: 'Suy giảm nghiêm trọng cảm quan thẩm mỹ xe cao cấp DKBike; phát sinh nguy cơ rỉ sét sớm tại các mối dập hàn kim loại.',
      rootCause: 'Sự va đập, ma sát cơ học giữa các tấm khung sắt trong khâu lưu kho hoặc do bọc mút xốp góc sườn mỏng khi tải trên băng truyền lắp ráp.',
      emergency: [
        'Trạm kiểm tra KCS lập tức dập sơn/xịt phủ bù khuyết điểm xước bằng bút sơn sấy nhiệt dẻo.',
        'Yêu cầu công nhân quấn thêm mút xốp EVA bảo vệ dày 10mm tại các điểm góc nhọn sườn xe trên băng chuyền.'
      ],
      preventative: [
        'Làm việc chính thức với nhà cung ứng khuôn sườn sắt để chuẩn hóa quy trình bọc gói màng xốp chống sốc riêng biệt từng chi tiết trước khi hạ xe tải.',
        'Cân chỉnh lại tay robot gá sườn và thiết kế rãnh đệm cao su tại xe đẩy pallet trượt.'
      ],
      owner: 'Tổ trưởng Ca lắp ráp & Giám sát KCS ngoại sườn',
      due: 'Trong vòng 48 giờ'
    };
  }
  
  if (n.includes('yên')) {
    return {
      severity: 'Nghiêm trọng (Critical - Chức năng)',
      severityColor: 'text-red-600 bg-red-50 border-red-200/50',
      category: 'Cơ cấu Khóa & Bản lề cơ học',
      impact: 'Khách hàng không thể sập khóa cốp để bảo vệ mũ bảo hành/vật dụng cá nhân hoặc cực kỳ khó khăn khi kéo lẫy tiếp nhiên liệu.',
      rootCause: 'Dung sai khoan dập tai khóa và bản lề cản yên trên thân xe bị lệch 1.5mm so với hướng đối xứng tâm ổ khóa sườn.',
      emergency: [
        'Sử dụng dưỡng căn chỉnh nhanh (Jig định vị ổ khóa) làm chuẩn cố định trước khi thợ súng búa hơi bắt lực siết dứt điểm.',
        'Nới lỏng vít định vị bản lề dầm yên và bôi trơn bổ sung mỡ bò bôi trơn kỹ thuật cho lò xo kéo khoá.'
      ],
      preventative: [
        'Yêu cầu tổ sản xuất hàn sườn điều chỉnh lại định biên dưỡng ráp ổ khóa yên trên dưỡng chính.',
        'Nhập bổ sung dưỡng kiểm nhanh Go/No-Go tại khâu phụ thô sườn xe trước khi chuyển sang phòng sơn.'
      ],
      owner: 'Kỹ sư cơ cấu gá ráp tĩnh & Trưởng ca QC Hoàn thiện',
      due: 'Trong vòng 24 giờ'
    };
  }
  
  if (n.includes('điện') || n.includes('nguồn') || n.includes('giắc')) {
    return {
      severity: 'Nguy hại (Critical - Hệ thống điện)',
      severityColor: 'text-rose-600 bg-rose-50 border-rose-200/50',
      category: 'Hệ thống Mạch điện & Giắc sạc nguồn',
      impact: 'Xe mất nguồn điều khiển DC-DC hoàn toàn, hệ thống SMARTKEY không phản hồi, xe không thể cuộn ga khởi động trên bàn thử Dyno.',
      rootCause: 'Lẫy khoá ngạnh giắc cắm sườn xe bị bẻ cong nhẹ hoặc thợ gắn tì bóp ép quá góc làm gãy lẫy nhựa ôm giắc nguồn ắc-quy.',
      emergency: [
        'Dùng đồng hồ vạn năng VOM đo thông mạch và độ sụt áp 72V tại từng ngách cầu chì tổng chính.',
        'Rút hẳn giắc lỏng ra và giũ sạch bavia nhựa bụi, dập ôm chặt nghe đủ tiếp "tạch" kịch khóa ngàm.'
      ],
      preventative: [
        'Thực hiện đào tạo trực quan hệ thống dây điện (Poka-Yoke) định kỳ cho công nhân lắp ráp trạm sườn xe.',
        'Tăng độ khít của bao nhựa giắc chống thấm sương muối để tăng độ bền oxy hóa dây.'
      ],
      owner: 'Kỹ sư trưởng Điện tử điều khiển & Trạm kiểm tra KCS Điện',
      due: 'Lập tức xử lý trong ca'
    };
  }
  
  if (n.includes('kẹt') || n.includes('bánh')) {
    return {
      severity: 'Nguy hại (Critical - An toàn vận hành)',
      severityColor: 'text-rose-600 bg-rose-50 border-rose-200/50',
      category: 'Hệ thống phanh dầm & Truyền động lực',
      impact: 'Bánh trước sượng cứng, cản lực quay cực lớn gây nguy cơ bó kẹt bất ngờ khi đi thử đường thử thực tế, gây mất kiểm soát lái xe.',
      rootCause: 'Dầu phanh thủy lực dồn nén có bọt khí bị kẹt hoặc đĩa phanh bị uốn cong do kích siết ốc trục trước vượt vạch dải súng hơi (>40Nm).',
      emergency: [
        'Điều chỉnh lực siết dứt khoát của ốc trục bằng súng kiểm soát moment giới hạn ở dải tiêu chuẩn 30-35Nm.',
        'Thực hiện xả gió, hút chân không dầu dầm phanh đĩa để cân bằng hành trình piston phanh.'
      ],
      preventative: [
        'Chuẩn hóa hướng dẫn công việc tiêu chuẩn tại trạm bánh-phanh trước với sơ đồ súng lực định vị lực hơi.',
        'Mở phiếu theo dõi định kỳ độ biến dạng của moay-ơ đĩa thắng từ nhà cung ứng.'
      ],
      owner: 'Kỹ sư Ráp máy gầm & Giám sát KCS Bàn lăn',
      due: 'Trong vòng 12 giờ'
    };
  }
  
  if (n.includes('gương') || n.includes('kính')) {
    return {
      severity: 'Nhẹ (Minor - Thẩm mỹ phụ trợ)',
      severityColor: 'text-blue-600 bg-blue-50 border-blue-200/50',
      category: 'Phụ kiện ngoại thất & Căn chỉnh ráp gương',
      impact: 'Góc nhìn chiếu hậu bị lệch xéo, ren ốc lỏng lẻo gây rung lắc mạnh khi sục tải làm xoay vặn mất kiểm soát gương chiếu hậu.',
      rootCause: 'Thợ dùng súng gác siết ren nghiêng trực tiếp làm mòn bước ren dầm răng đồng trên cụm tay tì ghi đông lái.',
      emergency: [
        'Tháo bỏ ốc răng bị giập bể mòn ren, gá bằng dụng cụ dưỡng taro lại bước ren nhuyễn lỗ ghi đông.',
        'Quy định công nhân bắt bu-lông gá tay bằng tay sạch sâu nhất 3 vòng mới đưa súng hơi vào ép nhẹ.'
      ],
      preventative: [
        'Chế tạo đồ gá ôm bảo vệ chân gương khi nén lực, tránh sứt đầu mạ crom màu bạc.',
        'Thực hiện hệ thống tem nhận diện màu dán (Color-Coding) cho tai trái/phải để tránh bắt ngược ren xoắn.'
      ],
      owner: 'Tổ trưởng tổ phụ kiện ngoài & KCS Trạm Đóng thùng',
      due: 'Trong ngày làm việc'
    };
  }
  
  if (n.includes('hở') || n.includes('đầu') || n.includes('ngàm') || n.includes('ốp') || n.includes('nhựa')) {
    return {
      severity: 'Trung bình (Major - Thẩm mỹ lắp ráp)',
      severityColor: 'text-amber-600 bg-amber-50 border-amber-200/50',
      category: 'Vỏ nhựa Thân xe & Bộ ốp mũ nhựa',
      impact: 'Tạo khe hở lớn mất mỹ quan, dễ lọt nước rửa xe trực tiếp vào cuộn sạc trong; phát ra âm thanh rè rè từ vỏ nhựa khi đi tốc độ cao.',
      rootCause: 'Các búp ngàm ép dẻo bị sứt mẻ góc ăn khớp, hoặc thợ lắp đè vỏ nhựa không đúng trình tự gá ráp, ép chặt ốc trước khi sập ngàm nhựa sườn.',
      emergency: [
        'Lập tức dỡ bọc tháo nhẹ các ốc kẹp vỏ sườn quanh phạm vi hở để định vị lại khớp ngàm ôm cho khít khịt.',
        'Ép sát mí vỏ nghe kịch âm thanh khớp sau đó mới siết dải vít nhựa với lực tay bóp nhỏ đạt chuẩn.'
      ],
      preventative: [
        'Đặt màng ép xốp EVA mỏng 1mm tại các rãnh khớp ngàm nhựa tiếp xúc của vỏ trước để triệt tiêu tiếng rung rè rè.',
        'Làm việc cùng nhà cung ứng nhựa dập sườn nâng cao kiểm duyệt độ dày thành vách nhựa sườn từ 2.2mm lên 2.5mm.'
      ],
      owner: 'Tổ trưởng Ca ráp vỏ sườn & Nhân viên QA kiểm tra ngoại quan nhựa',
      due: 'Trong vòng 24 giờ'
    };
  }

  // Fallback
  return {
    severity: 'Trung bình (Major - Nghi ngờ dung sai)',
    severityColor: 'text-amber-600 bg-amber-50 border-amber-200/50',
    category: 'Tổng bộ gá ráp & Quy trình vận hành dây chuyền',
    impact: 'Làm suy giảm chỉ số vượt KCS đạt lần đầu của dây chuyền lắp ráp máy DKBike.',
    rootCause: 'Sai số tích lũy của kích thước gá ép linh kiện nhập ngoại kết hợp lực siết búa công nhân chưa đều tay.',
    emergency: [
      'Cách ly hoặc chuyển xe lỗi về khu chế xuất vá khuyết phẩm để chuyên viên giàu kinh nghiệm rà soát.',
      'Sử dụng dầu taro, dung dịch tẩy bụi mạt tẩy rửa mịn màng chi tiết bị lỗi.'
    ],
    preventative: [
      'Gửi văn bản cảnh báo chất lượng CAPA khẩn cấp lên Group chỉ đạo sản xuất của Nhà máy.',
      'Tăng tần suất kiểm tra mẫu đầu ca lắp ráp đạt chuẩn tối thiểu.'
    ],
    owner: 'Trưởng bộ phận Quản lý chất lượng QA/QC DKBike',
    due: 'Trong vòng 48 giờ'
  };
};

function standardizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  let day = 1;
  let month = 7;
  let year = 2026;
  const today = new Date();
  const currentYear = today.getFullYear() || 2026;
  const currentMonth = today.getMonth() + 1;

  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = Number(parts[0]) || currentYear;
      month = Number(parts[1]) || currentMonth;
      day = Number(parts[2]) || 1;
    } else {
      // DD-MM-YYYY or DD-MM
      day = Number(parts[0]) || 1;
      month = Number(parts[1]) || currentMonth;
      year = parts[2] ? (Number(parts[2]) || currentYear) : currentYear;
    }
  } else if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts[0].length === 4) {
      // YYYY/MM/DD
      year = Number(parts[0]) || currentYear;
      month = Number(parts[1]) || currentMonth;
      day = Number(parts[2]) || 1;
    } else {
      // DD/MM/YYYY or DD/MM
      day = Number(parts[0]) || 1;
      month = Number(parts[1]) || currentMonth;
      const yrPart = parts[2] ? parts[2].trim() : '';
      year = yrPart ? (yrPart.length === 2 ? 2000 + Number(yrPart) : Number(yrPart)) : currentYear;
    }
  } else {
    const num = Number(trimmed);
    if (!isNaN(num) && num > 0 && num <= 31) {
      day = num;
      month = currentMonth;
      year = currentYear;
    } else {
      return trimmed;
    }
  }

  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  return `${dd}/${mm}/${year}`;
}

function getMondayOfWeek(year: number, month: number, weekNum: number): Date {
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const dow = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  
  let mon1Day: number;
  if (dow === 1) mon1Day = 1;
  else if (dow === 2) mon1Day = 0;
  else if (dow === 3) mon1Day = -1;
  else if (dow === 4) mon1Day = -2;
  else if (dow === 5) mon1Day = 4;
  else if (dow === 6) mon1Day = 3;
  else if (dow === 0) mon1Day = 2;
  else mon1Day = 1;

  return new Date(year, month - 1, mon1Day + (weekNum - 1) * 7);
}

const dateWeekMonthCache = new Map<string, { week: string; month: number; year: number }>();

function getWeekAndMonthFromDate(dateStr: string): { week: string; month: number; year: number } {
  if (!dateStr || typeof dateStr !== 'string') {
    const today = new Date();
    return { week: 'T1', month: today.getMonth() + 1, year: today.getFullYear() };
  }

  const clean = dateStr.trim();
  const cached = dateWeekMonthCache.get(clean);
  if (cached) return cached;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  let day = 1;
  let month = currentMonth;
  let year = currentYear;

  const matchesYMD = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  const matchesDMY = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);

  if (matchesYMD) {
    year = Number(matchesYMD[1]) || currentYear;
    month = Number(matchesYMD[2]) || currentMonth;
    day = Number(matchesYMD[3]) || 1;
  } else if (matchesDMY) {
    day = Number(matchesDMY[1]) || 1;
    month = Number(matchesDMY[2]) || currentMonth;
    const yrPart = matchesDMY[3];
    year = yrPart ? (yrPart.length === 2 ? 2000 + Number(yrPart) : Number(yrPart)) : currentYear;
  } else {
    const parts = clean.split(/[-/. ]+/);
    if (parts.length >= 3) {
      if (parts[0].length === 4) {
        year = Number(parts[0]) || currentYear;
        month = Number(parts[1]) || currentMonth;
        day = Number(parts[2]) || 1;
      } else {
        day = Number(parts[0]) || 1;
        month = Number(parts[1]) || currentMonth;
        const yrPart = parts[2];
        year = yrPart ? (yrPart.length === 2 ? 2000 + Number(yrPart) : Number(yrPart)) : currentYear;
      }
    }
  }

  const targetDate = new Date(year, month - 1, day);

  let weekStr = 'T1';
  for (let w = 1; w <= 5; w++) {
    const mon = getMondayOfWeek(year, month, w);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    if (w === 1 && targetDate < mon) {
      weekStr = 'T1';
      break;
    }
    if (w === 5 && targetDate > sun) {
      weekStr = 'T5';
      break;
    }
    if (targetDate >= mon && targetDate <= sun) {
      weekStr = `T${w}`;
      break;
    }
  }

  const result = { week: weekStr, month, year };
  if (dateWeekMonthCache.size > 3000) dateWeekMonthCache.clear();
  dateWeekMonthCache.set(clean, result);
  return result;
}

function getWeekDatesForReporting(year: number, month: number, weekNum: number): string {
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const dow = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  
  let mon1Day: number;
  if (dow === 1) mon1Day = 1;
  else if (dow === 2) mon1Day = 0;
  else if (dow === 3) mon1Day = -1;
  else if (dow === 4) mon1Day = -2;
  else if (dow === 5) mon1Day = 4;
  else if (dow === 6) mon1Day = 3;
  else if (dow === 0) mon1Day = 2;
  else mon1Day = 1;

  const monTarget = new Date(year, month - 1, mon1Day + (weekNum - 1) * 7);
  const sunTarget = new Date(monTarget);
  sunTarget.setDate(monTarget.getDate() + 6);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const startStr = pad(monTarget.getDate());
  const endStr = pad(sunTarget.getDate());
  const mStr = pad(monTarget.getMonth() + 1);

  return `${startStr}-${endStr}/${mStr}`;
}

export default function QualityInspectionRecords({
  iqcRecords,
  setIqcRecords,
  pqcRecords,
  setPqcRecords,
  oqcRecords,
  setOqcRecords,
  supplierProductionAudits = [],
  setSupplierProductionAudits = () => {},
  suppliers,
  dailyLogs = [],
  ptspTasks = [],
  defects = [],
  capas = [],
  setViewDetailModal,
  models = [],
  monthlyPlans = [],
  weeklyPlans = [],
  setWeeklyPlans,
  setMonthlyPlans,
  initialSubTab,
  initialOqcSearch,
  initialPqcSearch,
  onClearInitialValues,
  oqcColorChanges = [],
  setOqcColorChanges,
  oqcHandoverList = [],
  setOqcHandoverList
}: QualityInspectionRecordsProps) {
  const [qcMainSubTab, setQcMainSubTab] = useState<'iqc' | 'pqc' | 'oqc' | 'color_change' | 'supplier_monitoring' | 'reports'>('iqc');
  const [selectedDashboardDefect, setSelectedDashboardDefect] = useState<{ name: string; count: number; modelName: string } | null>(null);
  const [oqcDetailModalModel, setOqcDetailModalModel] = useState<string | null>(null);
  const [localZoomImage, setLocalZoomImage] = useState<string | null>(null);
  const [stackedMode, setStackedMode] = useState<'rate' | 'volume'>('volume');

  const [planLinkMonth, setPlanLinkMonth] = useState<number>(new Date().getMonth() + 1);
  const [planLinkWeek, setPlanLinkWeek] = useState<string>('T1');

  const [isIqcFilterExpanded, setIsIqcFilterExpanded] = useState<boolean>(false);
  const [isPqcFilterExpanded, setIsPqcFilterExpanded] = useState<boolean>(false);
  const [isOqcFilterExpanded, setIsOqcFilterExpanded] = useState<boolean>(false);

  // Multi-Defect Touch Picker Modal State
  const [activeMultiDefectModalRecord, setActiveMultiDefectModalRecord] = useState<OQCRecord | null>(null);
  const [selectedModalDefects, setSelectedModalDefects] = useState<string[]>([]);

  // High-Performance Zero-Latency Optimistic State Overrides for KCS Station
  const [localOqcOverrides, setLocalOqcOverrides] = useState<Record<string, Partial<OQCRecord>>>({});

  // Auto reconcile local overrides when global oqcRecords updates
  useEffect(() => {
    if (Object.keys(localOqcOverrides).length === 0) return;
    setLocalOqcOverrides(prev => {
      let changed = false;
      const next = { ...prev };
      for (const id in next) {
        const globalRec = oqcRecords.find(r => r.id === id);
        if (globalRec) {
          const override = next[id];
          if (
            (!override.status || override.status === globalRec.status) &&
            (override.defectDetail === undefined || override.defectDetail === globalRec.defectDetail) &&
            (override.rootCause === undefined || override.rootCause === globalRec.rootCause)
          ) {
            delete next[id];
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [oqcRecords]);

  // High-Performance Zero-Latency Save Helper for OQC Quick Pass / Defect Entry
  // Immediate UI (<1ms) & LocalStorage (<5ms) save; Debounced 3s Batch Cloud Push
  const asyncOqcSaveTimer = useRef<any>(null);
  const latestOqcRecordsRef = useRef<OQCRecord[]>(oqcRecords);

  useEffect(() => {
    latestOqcRecordsRef.current = oqcRecords;
  }, [oqcRecords]);

  const flushOqcSaveToCloud = useCallback(() => {
    if (asyncOqcSaveTimer.current) {
      clearTimeout(asyncOqcSaveTimer.current);
      asyncOqcSaveTimer.current = null;
    }
    const currentList = latestOqcRecordsRef.current;
    if (currentList && currentList.length > 0) {
      if (typeof (window as any).syncToServer === 'function') {
        (window as any).syncToServer('dk_oqc_records', currentList);
      }
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (asyncOqcSaveTimer.current) {
        flushOqcSaveToCloud();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [flushOqcSaveToCloud]);

  const asyncLocalStorageTimer = useRef<NodeJS.Timeout | null>(null);

  const saveOqcRecordsOptimized = useCallback((updated: OQCRecord[]) => {
    try { localStorage.setItem('dk_oqc_records_is_dirty', 'true'); } catch (e) {}

    // 1. Ghi đĩa cục bộ an toàn ngầm (Debounced 150ms - Không gây giật lag)
    if (asyncLocalStorageTimer.current) clearTimeout(asyncLocalStorageTimer.current);
    asyncLocalStorageTimer.current = setTimeout(() => {
      safeStorage.setItem('dk_oqc_records', JSON.stringify(updated));
    }, 150);

    // 2. Gom đẩy Cloud ngầm sau 3 giây (Debounced 3s Batch Push)
    if (asyncOqcSaveTimer.current) clearTimeout(asyncOqcSaveTimer.current);
    asyncOqcSaveTimer.current = setTimeout(() => {
      if (typeof (window as any).syncToServer === 'function') {
        (window as any).syncToServer('dk_oqc_records', updated);
      }
    }, 3000);

    // 3. Hoãn cập nhật State toàn cục (App.tsx) và các thuật toán nặng ngầm để UI paint tức thì 0ms
    setTimeout(() => {
      setOqcRecords(updated);
    }, 0);
  }, [setOqcRecords]);

  // Check if there is an active IQC plan in Lập kế hoạch (weeklyPlans)
  const hasIqcPlanInSystem = useMemo(() => {
    return (weeklyPlans || []).some(plan => 
      (plan.targets || []).some((t: any) => 
        t.category === 'IQC' || 
        t.category?.toUpperCase() === 'IQC' || 
        (t.content || '').toUpperCase().includes('IQC')
      )
    );
  }, [weeklyPlans]);

  // Check if any error/defect exists in inspection databases (IQC, PQC, OQC)
  const hasQualityErrorInSystem = useMemo(() => {
    const hasIqcError = iqcRecords.some(r => r.result === 'Lỗi' || (r.failedQty !== undefined && r.failedQty > 0));
    const hasPqcError = pqcRecords.some(r => r.status === 'Đang cải tiến' || (r.findings && r.findings.toLowerCase().includes('lỗi')));
    const hasOqcError = oqcRecords.some(r => r.status === 'Lỗi' || (r.failedCount !== undefined && r.failedCount > 0));
    return hasIqcError || hasPqcError || hasOqcError;
  }, [iqcRecords, pqcRecords, oqcRecords]);

  const filterDailyLogsForSqc = useCallback((log: any) => {
    const content = (log.content || '').toLowerCase();
    const note = (log.note || '').toLowerCase();
    const basicMatches = log.category === 'IQC' || log.category === 'SQC/QA' || 
                         content.includes('ncc') || content.includes('nhà cung cấp') || 
                         content.includes('đối tác') || content.includes('việt nhật') || 
                         content.includes('gia công') || note.includes('ncc') || note.includes('đối tác');
    return basicMatches;
  }, []);

  // Bidirectional automated linkage: Update weekly plans based on real-time IQC/PQC/OQC/SQC records
  React.useEffect(() => {
    if (!weeklyPlans || !setWeeklyPlans || weeklyPlans.length === 0) return;

    let planChanged = false;
    const updatedWeeklyPlans = weeklyPlans.map(plan => {
      let targetsChanged = false;
      const updatedTargets = plan.targets.map(target => {
        const isIqc = target.category === 'IQC' || target.content.includes('[IQC]');
        const isPqc = target.category === 'PQC' || target.content.includes('[PQC]');
        const isOqc = target.category === 'OQC' || target.content.includes('[OQC]');
        const isSqc = target.category === 'SQC/QA' || target.content.includes('[SQC]');

        let newActual = target.actualValue;
        let newAchieved = target.achieved;

        if (isIqc) {
          const supCandidate = suppliers.find(s => 
            target.content.toLowerCase().includes(s.name.toLowerCase()) || 
            target.explanation.toLowerCase().includes(s.name.toLowerCase())
          );
          
          if (supCandidate) {
            const matchedRecords = iqcRecords.filter(r => {
              if (!r.date) return false;
              const info = getWeekAndMonthFromDate(r.date);
              return info.week === plan.week && info.month === plan.month && info.year === plan.year && 
                     (r.supplierId === supCandidate.id || r.supplierName.toLowerCase().includes(supCandidate.name.toLowerCase()));
            });

            if (matchedRecords.length > 0) {
              const totalLotes = matchedRecords.length;
              const failedLotes = matchedRecords.filter(r => r.result === 'Lỗi' || (r.failedQty !== undefined && r.failedQty > 0)).length;
              const passedLotes = totalLotes - failedLotes;
              const autoActual = `${passedLotes}/${totalLotes} lô Đạt`;
              const autoAchieved = failedLotes === 0;

              if (newActual !== autoActual || newAchieved !== autoAchieved) {
                newActual = autoActual;
                newAchieved = autoAchieved;
                targetsChanged = true;
              }
            }
          }
        } else if (isPqc) {
          const modelCandidate = models.find(m => 
            target.content.toLowerCase().includes(m.name.toLowerCase()) ||
            target.explanation.toLowerCase().includes(m.name.toLowerCase())
          );
          
          if (modelCandidate) {
            const matchedRecords = pqcRecords.filter(r => {
              if (!r.date) return false;
              const info = getWeekAndMonthFromDate(r.date);
              return info.week === plan.week && info.month === plan.month && info.year === plan.year && 
                     (r.model === modelCandidate.name || (r.model && r.model.toLowerCase().includes(modelCandidate.name.toLowerCase())));
            });

            if (matchedRecords.length > 0) {
              const totalChecks = matchedRecords.length;
              const passedChecks = matchedRecords.filter(r => r.status === 'Đạt hoàn toàn').length;
              const autoActual = `${passedChecks}/${totalChecks} ca Đạt`;
              const autoAchieved = passedChecks === totalChecks;

              if (newActual !== autoActual || newAchieved !== autoAchieved) {
                newActual = autoActual;
                newAchieved = autoAchieved;
                targetsChanged = true;
              }
            }
          }
        } else if (isOqc) {
          const modelCandidate = models.find(m => 
            target.content.toLowerCase().includes(m.name.toLowerCase())
          );

          if (modelCandidate) {
            const matchedRecords = oqcRecords.filter(r => {
              if (!r.date) return false;
              const info = getWeekAndMonthFromDate(r.date);
              return info.week === plan.week && info.month === plan.month && info.year === plan.year && 
                     (r.model === modelCandidate.name);
            });

            if (matchedRecords.length > 0) {
              const totalQty = matchedRecords.length;
              const failedQty = matchedRecords.filter(r => r.status === 'Lỗi').length;
              const passedQty = totalQty - failedQty;
              const rate = totalQty > 0 ? ((passedQty / totalQty) * 100).toFixed(1) : '100';
              const autoActual = `FPY: ${rate}% (${passedQty}/${totalQty} xe)`;
              const autoAchieved = Number(rate) >= 95.0;

              if (newActual !== autoActual || newAchieved !== autoAchieved) {
                newActual = autoActual;
                newAchieved = autoAchieved;
                targetsChanged = true;
              }
            }
          }
        } else if (isSqc) {
          const supCandidate = suppliers.find(s => 
            target.content.toLowerCase().includes(s.name.toLowerCase()) || 
            target.explanation.toLowerCase().includes(s.name.toLowerCase())
          );

          if (supCandidate && supplierProductionAudits && supplierProductionAudits.length > 0) {
            const matchedAudits = supplierProductionAudits.filter(r => {
              if (!r.requestDate) return false;
              const info = getWeekAndMonthFromDate(r.requestDate);
              return info.week === plan.week && info.month === plan.month && info.year === plan.year && 
                     (r.supplierName.toLowerCase().includes(supCandidate.name.toLowerCase()));
            });

            if (matchedAudits.length > 0) {
              const auditCount = matchedAudits.length;
              const closedCount = matchedAudits.filter(a => a.status === 'approved').length;
              const autoActual = `Đã kiểm: ${auditCount} lần (${closedCount} hoàn thành)`;
              const autoAchieved = closedCount === auditCount;

              if (newActual !== autoActual || newAchieved !== autoAchieved) {
                newActual = autoActual;
                newAchieved = autoAchieved;
                targetsChanged = true;
              }
            }
          }
        }

        if (targetsChanged) {
          return { ...target, actualValue: newActual, achieved: newAchieved };
        }
        return target;
      });

      if (targetsChanged) {
        planChanged = true;
        return { ...plan, targets: updatedTargets };
      }
      return plan;
    });

    if (planChanged) {
      setWeeklyPlans(updatedWeeklyPlans);
    }
  }, [iqcRecords, pqcRecords, oqcRecords, supplierProductionAudits, weeklyPlans, setWeeklyPlans, suppliers, models]);

  // Automated linkage for monthly plans
  React.useEffect(() => {
    if (!monthlyPlans || !setMonthlyPlans || monthlyPlans.length === 0) return;

    let planChanged = false;
    const updatedMonthlyPlans = monthlyPlans.map(plan => {
      let targetsChanged = false;
      const updatedTargets = plan.targets.map(target => {
        const isIqc = target.category === 'IQC' || target.content.includes('[IQC]');
        const isPqc = target.category === 'PQC' || target.content.includes('[PQC]');
        const isOqc = target.category === 'OQC' || target.content.includes('[OQC]');
        const isSqc = target.category === 'SQC/QA' || target.content.includes('[SQC]');

        let newActual = target.actualValue;
        let newAchieved = target.achieved;

        if (isIqc) {
          const supCandidate = suppliers.find(s => 
            target.content.toLowerCase().includes(s.name.toLowerCase()) || 
            target.explanation.toLowerCase().includes(s.name.toLowerCase())
          );
          
          if (supCandidate) {
            const matchedRecords = iqcRecords.filter(r => {
              if (!r.date) return false;
              const info = getWeekAndMonthFromDate(r.date);
              return info.month === plan.month && info.year === plan.year && 
                     (r.supplierId === supCandidate.id || r.supplierName.toLowerCase().includes(supCandidate.name.toLowerCase()));
            });

            if (matchedRecords.length > 0) {
              const totalLotes = matchedRecords.length;
              const failedLotes = matchedRecords.filter(r => r.result === 'Lỗi' || (r.failedQty !== undefined && r.failedQty > 0)).length;
              const passedLotes = totalLotes - failedLotes;
              const autoActual = `${passedLotes}/${totalLotes} lô Đạt`;
              const autoAchieved = failedLotes === 0;

              if (newActual !== autoActual || newAchieved !== autoAchieved) {
                newActual = autoActual;
                newAchieved = autoAchieved;
                targetsChanged = true;
              }
            }
          }
        } else if (isPqc) {
          const modelCandidate = models.find(m => 
            target.content.toLowerCase().includes(m.name.toLowerCase()) ||
            target.explanation.toLowerCase().includes(m.name.toLowerCase())
          );
          
          if (modelCandidate) {
            const matchedRecords = pqcRecords.filter(r => {
              if (!r.date) return false;
              const info = getWeekAndMonthFromDate(r.date);
              return info.month === plan.month && info.year === plan.year && 
                     (r.model === modelCandidate.name || (r.model && r.model.toLowerCase().includes(modelCandidate.name.toLowerCase())));
            });

            if (matchedRecords.length > 0) {
              const totalChecks = matchedRecords.length;
              const passedChecks = matchedRecords.filter(r => r.status === 'Đạt hoàn toàn').length;
              const autoActual = `${passedChecks}/${totalChecks} lần Đạt`;
              const autoAchieved = passedChecks === totalChecks;

              if (newActual !== autoActual || newAchieved !== autoAchieved) {
                newActual = autoActual;
                newAchieved = autoAchieved;
                targetsChanged = true;
              }
            }
          }
        } else if (isOqc) {
          const modelCandidate = models.find(m => 
            target.content.toLowerCase().includes(m.name.toLowerCase())
          );

          if (modelCandidate) {
            const matchedRecords = oqcRecords.filter(r => {
              if (!r.date) return false;
              const info = getWeekAndMonthFromDate(r.date);
              return info.month === plan.month && info.year === plan.year && 
                     (r.model === modelCandidate.name);
            });

            if (matchedRecords.length > 0) {
              const totalQty = matchedRecords.length;
              const failedQty = matchedRecords.filter(r => r.status === 'Lỗi').length;
              const passedQty = totalQty - failedQty;
              const rate = totalQty > 0 ? ((passedQty / totalQty) * 100).toFixed(1) : '100';
              const autoActual = `FPY: ${rate}% (${passedQty}/${totalQty} xe)`;
              const autoAchieved = Number(rate) >= 95.0;

              if (newActual !== autoActual || newAchieved !== autoAchieved) {
                newActual = autoActual;
                newAchieved = autoAchieved;
                targetsChanged = true;
              }
            }
          }
        } else if (isSqc) {
          const supCandidate = suppliers.find(s => 
            target.content.toLowerCase().includes(s.name.toLowerCase()) || 
            target.explanation.toLowerCase().includes(s.name.toLowerCase())
          );

          if (supCandidate && supplierProductionAudits && supplierProductionAudits.length > 0) {
            const matchedAudits = supplierProductionAudits.filter(r => {
              if (!r.requestDate) return false;
              const info = getWeekAndMonthFromDate(r.requestDate);
              return info.month === plan.month && info.year === plan.year && 
                     (r.supplierName.toLowerCase().includes(supCandidate.name.toLowerCase()));
            });

            if (matchedAudits.length > 0) {
              const auditCount = matchedAudits.length;
              const closedCount = matchedAudits.filter(a => a.status === 'approved').length;
              const autoActual = `Đã kiểm: ${auditCount} lần (${closedCount} hoàn thành)`;
              const autoAchieved = closedCount === auditCount;

              if (newActual !== autoActual || newAchieved !== autoAchieved) {
                newActual = autoActual;
                newAchieved = autoAchieved;
                targetsChanged = true;
              }
            }
          }
        }

        if (targetsChanged) {
          return { ...target, actualValue: newActual, achieved: newAchieved };
        }
        return target;
      });

      if (targetsChanged) {
        planChanged = true;
        return { ...plan, targets: updatedTargets };
      }
      return plan;
    });

    if (planChanged) {
      setMonthlyPlans(updatedMonthlyPlans);
    }
  }, [iqcRecords, pqcRecords, oqcRecords, supplierProductionAudits, monthlyPlans, setMonthlyPlans, suppliers, models]);

  // States for defect analyses custom additions & editing
  const [customDefectAnalyses, setCustomDefectAnalyses] = useState<Record<string, {
    severity: string;
    severityColor: string;
    category: string;
    impact: string;
    rootCause: string;
    emergency: string[];
    preventative: string[];
    owner: string;
    due: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem('dk_custom_defect_analyses');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  React.useEffect(() => {
    const docRef = doc(db, 'dk_db_sync', 'dk_custom_defect_analyses');
    getDocFromServer(docRef)
      .then((snap) => {
        if (snap.exists()) {
          const remoteData = snap.data()?.data;
          if (remoteData) {
            setCustomDefectAnalyses(remoteData);
            localStorage.setItem('dk_custom_defect_analyses', JSON.stringify(remoteData));
          }
        }
      })
      .catch((err) => {
        console.warn("[Firestore Warning] Lỗi tải phân tích lỗi tùy chỉnh từ Cloud Firestore:", err);
      });
  }, []);

  const [draftSeverity, setDraftSeverity] = useState('');
  const [draftCategory, setDraftCategory] = useState('');
  const [draftImpact, setDraftImpact] = useState('');
  const [draftRootCause, setDraftRootCause] = useState('');
  const [draftEmergency, setDraftEmergency] = useState('');
  const [draftPreventative, setDraftPreventative] = useState('');
  const [draftOwner, setDraftOwner] = useState('');
  const [draftDue, setDraftDue] = useState('');

  React.useEffect(() => {
    if (selectedDashboardDefect) {
      const key = `${selectedDashboardDefect.modelName}_#_${selectedDashboardDefect.name}`.toLowerCase();
      const currentAnalysis = customDefectAnalyses[key] || getDefectAnalysisAndCorrection(selectedDashboardDefect.name, selectedDashboardDefect.modelName);
      
      setDraftSeverity(currentAnalysis.severity || 'Trung bình (Major - Nghi ngờ dung sai)');
      setDraftCategory(currentAnalysis.category || 'Chưa phân nhóm');
      setDraftImpact(currentAnalysis.impact || '');
      setDraftRootCause(currentAnalysis.rootCause || '');
      setDraftEmergency(Array.isArray(currentAnalysis.emergency) ? currentAnalysis.emergency.join('\n') : String(currentAnalysis.emergency || ''));
      setDraftPreventative(Array.isArray(currentAnalysis.preventative) ? currentAnalysis.preventative.join('\n') : String(currentAnalysis.preventative || ''));
      setDraftOwner(currentAnalysis.owner || 'Tổ trưởng QA/QC');
      setDraftDue(currentAnalysis.due || 'Lập tức xử lý');
    }
  }, [selectedDashboardDefect, customDefectAnalyses]);

  const handleSaveCustomAnalysis = () => {
    if (!selectedDashboardDefect) return;
    
    let color = 'text-amber-600 bg-amber-50 border-amber-200/50';
    const s = draftSeverity.toLowerCase();
    if (s.includes('nhẹ') || s.includes('minor')) {
      color = 'text-blue-600 bg-blue-50 border-blue-200/50';
    } else if (s.includes('nghiêm trọng') || s.includes('nguy hại') || s.includes('critical') || s.includes('fatal')) {
      color = 'text-rose-600 bg-rose-50 border-rose-200/50';
    }

    const key = `${selectedDashboardDefect.modelName}_#_${selectedDashboardDefect.name}`.toLowerCase();
    const updated = {
      ...customDefectAnalyses,
      [key]: {
        severity: draftSeverity,
        severityColor: color,
        category: draftCategory,
        impact: draftImpact,
        rootCause: draftRootCause,
        emergency: draftEmergency.split('\n').map(l => l.trim()).filter(Boolean),
        preventative: draftPreventative.split('\n').map(l => l.trim()).filter(Boolean),
        owner: draftOwner,
        due: draftDue
      }
    };
    
    setCustomDefectAnalyses(updated);
    localStorage.setItem('dk_custom_defect_analyses', JSON.stringify(updated));

    // Async server side backup - only sync to Firestore if there is a real Google Firebase login session
    if (auth.currentUser) {
      const docRef = doc(db, 'dk_db_sync', 'dk_custom_defect_analyses');
      setDoc(docRef, sanitizeFirestorePayload({
        data: updated,
        updatedBy: auth.currentUser?.email || 'System Public Session',
        updatedAt: new Date().toISOString()
      }))
      .catch((err: any) => {
        console.error("Lỗi đồng bộ phân tích lỗi tùy chỉnh lên Cloud Firestore:", err);
      });
    } else {
      console.log("[Local Storage Sync]: Phiên làm việc offline/chuyển quyền hoạt động. Đã lưu phân tích lỗi cục bộ.");
    }

    alert(`Đã lưu Đánh giá và Ban hành Chỉ thị Khắc phục Lỗi (CAPA) khẩn cấp thành công!\nHệ thống QMS DKBike đã đồng bộ và thông báo tới: "${draftOwner}".`);
    setSelectedDashboardDefect(null);
  };
  const [iqcSearch, setIqcSearch] = useState('');
  const [pqcSearch, setPqcSearch] = useState('');
  const [oqcSearch, setOqcSearch] = useState('');
  const [reportTimeFilter, setReportTimeFilter] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [reportPeriod, setReportPeriod] = useState('All');

  // New Filters state
  const [iqcFilterResult, setIqcFilterResult] = useState<string>('All');
  const [iqcFilterSupplier, setIqcFilterSupplier] = useState<string>('All');
  const [pqcFilterStatus, setPqcFilterStatus] = useState<string>('All');
  const [pqcFilterModel, setPqcFilterModel] = useState<string>('All');
  const [oqcFilterStatus, setOqcFilterStatus] = useState<string>('All');
  const [oqcFilterModel, setOqcFilterModel] = useState<string>('All');
  const [oqcFilterColor, setOqcFilterColor] = useState<string>('All');
  const [oqcFilterDate, setOqcFilterDate] = useState<string>('All');
  const [oqcFilterMonth, setOqcFilterMonth] = useState<string>('All');
  const [iqcFilterMonth, setIqcFilterMonth] = useState<string>('All');
  const [pqcFilterMonth, setPqcFilterMonth] = useState<string>('All');
  const [oqcFilterYear, setOqcFilterYear] = useState<string>('All');
  const [oqcListFilter, setOqcListFilter] = useState<'all' | 'fail'>('fail');
  const [iqcFilterWeek, setIqcFilterWeek] = useState<string>('All');
  const [pqcFilterWeek, setPqcFilterWeek] = useState<string>('All');
  const [oqcFilterWeek, setOqcFilterWeek] = useState<string>('All');

  const [iqcCurrentPage, setIqcCurrentPage] = useState<number>(1);
  const [selectedIqcIds, setSelectedIqcIds] = useState<string[]>([]);
  const [selectedOqcIds, setSelectedOqcIds] = useState<string[]>([]);

  useEffect(() => {
    setIqcCurrentPage(1);
  }, [iqcSearch, iqcFilterSupplier, iqcFilterResult, iqcFilterWeek, iqcFilterMonth]);

  // Supplier Production Audits state
  const [supplierAuditSearch, setSupplierAuditSearch] = useState('');
  const [supplierAuditFilterStatus, setSupplierAuditFilterStatus] = useState<string>('All');
  const [supplierAuditFilterSupplier, setSupplierAuditFilterSupplier] = useState<string>('All');

  // Local state for ignored daily logs in supplier monitoring
  const [ignoredDailyLogStts, setIgnoredDailyLogStts] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('dk_ignored_daily_log_stts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [hideIgnoredLogs, setHideIgnoredLogs] = useState<boolean>(false);

  const lastSyncSubTabRef = React.useRef<string | undefined>(undefined);

  // Sync parent jump values to local states
  React.useEffect(() => {
    let changed = false;
    if (initialSubTab && initialSubTab !== lastSyncSubTabRef.current) {
      setQcMainSubTab(initialSubTab);
      lastSyncSubTabRef.current = initialSubTab;
      changed = true;
    }
    if (initialOqcSearch) {
      setOqcSearch(initialOqcSearch);
      setOqcSubView('station');
      setOqcListFilter('all');
      changed = true;
    }
    if (initialPqcSearch) {
      setPqcSearch(initialPqcSearch);
      changed = true;
    }
    if (changed && onClearInitialValues) {
      onClearInitialValues();
    }
  }, [initialSubTab, initialOqcSearch, initialPqcSearch, onClearInitialValues, qcMainSubTab]);

  const handleIgnoreDailyLog = (stt: number) => {
    const updated = [...ignoredDailyLogStts, stt];
    setIgnoredDailyLogStts(updated);
    localStorage.setItem('dk_ignored_daily_log_stts', JSON.stringify(updated));
  };

  const handleUndoIgnoreDailyLog = (stt: number) => {
    const updated = ignoredDailyLogStts.filter(id => id !== stt);
    setIgnoredDailyLogStts(updated);
    localStorage.setItem('dk_ignored_daily_log_stts', JSON.stringify(updated));
  };

  const renderActivePlanTargetsBanner = (_category: string) => {
    return null;
  };

  // Modal to add a request
  const [showAddSupplierAuditModal, setShowAddSupplierAuditModal] = useState(false);
  const [newAuditSupplierName, setNewAuditSupplierName] = useState(() => suppliers[0]?.name || suppliers[0]?.SupplierName || 'Công ty Việt Nhật Precision');
  const [newAuditComponentName, setNewAuditComponentName] = useState('');
  const [newAuditSpec, setNewAuditSpec] = useState('');
  const [newAuditReqType, setNewAuditReqType] = useState<'image_only' | 'spec_only' | 'both'>('both');
  const [newAuditNote, setNewAuditNote] = useState('');
  const [newAuditLinkedDailyLogStt, setNewAuditLinkedDailyLogStt] = useState<number | undefined>(undefined);

  // Local state to simulate supplier responses (submitting images and values)
  const [supplierResponseAudit, setSupplierResponseAudit] = useState<SupplierProductionAudit | null>(null);
  const [responseValueStr, setResponseValueStr] = useState('');
  const [responseImageUrl, setResponseImageUrl] = useState('');
  const [responseSupplierNote, setResponseSupplierNote] = useState('');

  // Local state to evaluate/approve/reject as DKBike QMS
  const [evaluateAudit, setEvaluateAudit] = useState<SupplierProductionAudit | null>(null);
  const [evalDkNote, setEvalDkNote] = useState('');
  const [evalStatus, setEvalStatus] = useState<'approved' | 'rejected'>('approved');

  // Editing state for Supplier Production Audits
  const [editingSupplierAudit, setEditingSupplierAudit] = useState<SupplierProductionAudit | null>(null);
  const [editAuditSupplierName, setEditAuditSupplierName] = useState('');
  const [editAuditComponentName, setEditAuditComponentName] = useState('');
  const [editAuditSpec, setEditAuditSpec] = useState('');
  const [editAuditNote, setEditAuditNote] = useState('');
  const [editAuditReqType, setEditAuditReqType] = useState<'image_only' | 'spec_only' | 'both'>('both');
  const [editAuditStatus, setEditAuditStatus] = useState<'pending' | 'updated' | 'approved' | 'rejected'>('pending');
  const [editAuditActualValue, setEditAuditActualValue] = useState('');
  const [editAuditDkNote, setEditAuditDkNote] = useState('');
  const [editAuditImageUrl, setEditAuditImageUrl] = useState('');
  const [editAuditDragOver, setEditAuditDragOver] = useState(false);

  const [supplierAuditViewMode, setSupplierAuditViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedSupplierAuditForDetail, setSelectedSupplierAuditForDetail] = useState<SupplierProductionAudit | null>(null);

  const handleOpenEditSupplierAuditModal = (aud: SupplierProductionAudit) => {
    setEditingSupplierAudit(aud);
    setEditAuditSupplierName(aud.supplierName);
    setEditAuditComponentName(aud.componentName);
    setEditAuditSpec(aud.targetSpecification);
    setEditAuditNote(aud.supplierNote || '');
    setEditAuditReqType(aud.requirementType);
    setEditAuditStatus(aud.status);
    setEditAuditActualValue(aud.actualValueStr || '');
    setEditAuditDkNote(aud.dkNote || '');
    setEditAuditImageUrl(aud.imageUrl || '');
  };

  const handleUpdateSupplierAudit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingSupplierAudit) return;

    const updated = supplierProductionAudits.map(aud => {
      if (aud.id === editingSupplierAudit.id) {
        const item = {
          ...aud,
          supplierName: editAuditSupplierName,
          componentName: editAuditComponentName,
          targetSpecification: editAuditSpec,
          supplierNote: editAuditNote,
          requirementType: editAuditReqType,
          status: editAuditStatus,
          actualValueStr: editAuditActualValue,
          dkNote: editAuditDkNote,
          imageUrl: editAuditImageUrl
        };
        return item;
      }
      return aud;
    });

    setSupplierProductionAudits(updated);
    setEditingSupplierAudit(null);
    alert('Đã cập nhật chỉ thị giám sát thành công!');

    const found = updated.find(a => a.id === editingSupplierAudit.id);
    if (found && selectedSupplierAuditForDetail?.id === editingSupplierAudit.id) {
      setSelectedSupplierAuditForDetail(found);
    }
  };

  const handleDeleteSupplierAudit = (id: string) => {
    if (window.confirm(`Xác nhận xóa bỏ vĩnh viễn chỉ thị giám sát [${id}] này?`)) {
      const updated = supplierProductionAudits.filter(a => a.id !== id);
      setSupplierProductionAudits(updated);
      if (selectedSupplierAuditForDetail?.id === id) {
        setSelectedSupplierAuditForDetail(null);
      }
    }
  };

  const handleQuickApproveAudit = (id: string) => {
    if (window.confirm("Xác nhận Đạt yêu cầu & Hoàn thành chỉ thị giám sát này ngay lập tức?")) {
      const updated = supplierProductionAudits.map(aud => {
        if (aud.id === id) {
          return {
            ...aud,
            status: 'approved' as const,
            dkNote: 'Báo cáo chất lượng hoàn thành & đạt kiểm tra mẫu trên dây chuyền.',
            actualValueStr: aud.actualValueStr || 'Đạt chuẩn mẫu',
            imageUrl: aud.imageUrl || ''
          };
        }
        return aud;
      });
      setSupplierProductionAudits(updated);

      const found = updated.find(a => a.id === id);
      if (found && selectedSupplierAuditForDetail?.id === id) {
        setSelectedSupplierAuditForDetail(found);
      }
    }
  };

  const handleQuickRejectAudit = (id: string) => {
    if (window.confirm("Bác có chắc chắn muốn báo lỗi/Từ chối chỉ thị giám sát này không?")) {
      const updated = supplierProductionAudits.map(aud => {
        if (aud.id === id) {
          return {
            ...aud,
            status: 'rejected' as const,
            dkNote: 'Hệ thống báo cáo phát hiện dung sai không đạt chuẩn dập mẫu. Yêu cầu NCC dừng gia công xưởng và sửa khuôn ngay.',
            actualValueStr: aud.actualValueStr || 'Không đạt chuẩn kỹ thuật'
          };
        }
        return aud;
      });
      setSupplierProductionAudits(updated);

      const found = updated.find(a => a.id === id);
      if (found && selectedSupplierAuditForDetail?.id === id) {
        setSelectedSupplierAuditForDetail(found);
      }
    }
  };

  const handleSelectLinkedDailyLogForAudit = (stt: number) => {
    setNewAuditLinkedDailyLogStt(stt);
    const log = dailyLogs.find(l => l.stt === stt);
    if (log) {
      // Set values based on log content
      let comp = '';
      let spec = '';
      let supp = newAuditSupplierName;

      const lowerCont = log.content.toLowerCase();
      if (lowerCont.includes('rắc sạc') || lowerCont.includes('sạc')) {
        comp = 'Rắc sạc nhanh Shin-Etsu';
        spec = 'Chỉ số cách điện Megohm sấy lò đạt chuẩn 65 độ C';
      } else if (lowerCont.includes('khung') || lowerCont.includes('chén bi') || lowerCont.includes('bavia')) {
        comp = 'Khung sườn mộc model DK Roma V2';
        spec = 'Đo độ bavia dập cơ khí và lực ép chén bi, độ rơ cổ phuốc < 0.03mm';
      } else if (lowerCont.includes('chạy thử') || lowerCont.includes('sát hạch') || lowerCont.includes('roman')) {
        comp = 'Thành phẩm xe điện DK Roman SX v2';
        spec = 'Sát hạch chạy thử thực tế trước xuất xưởng, phanh dốc & đèn còi';
      } else if (lowerCont.includes('lốp') || lowerCont.includes('săm lốp') || lowerCont.includes('kenda')) {
        comp = 'Lốp săm xe điện KENDA cao cấp';
        spec = 'Đường kính ngoài lò lưu hóa cao su và độ mòn ép lực';
      } else if (lowerCont.includes('nhựa') || lowerCont.includes('sơn tĩnh điện')) {
        comp = 'Mặt nạ nhựa (ABS) Gogo Cross';
        spec = 'Bề mặt sơn tĩnh điện láng bóng đồng đều màu nhẵn, không gai sần';
      } else if (lowerCont.includes('đối tác việt nhật') || lowerCont.includes('việt nhật') || lowerCont.includes('dăm móng') || lowerCont.includes('khuôn dập')) {
        comp = 'Khuôn dập bán thành phẩm sườn xe (Việt Nhật Precision)';
        spec = 'Độ dốc móng cơ khí khuôn dập, tinh chỉnh bavia dập loạt';
      } else {
        comp = log.content.length > 50 ? log.content.substring(0, 50) + "..." : log.content;
        spec = log.note || 'Sát sao chỉ tiêu kỹ thuật chất lượng đạt 100%.';
      }

      const lowerSuppName = log.content.toLowerCase() + " " + log.note.toLowerCase();
      if (lowerSuppName.includes('việt nhật')) {
        supp = 'Công ty Việt Nhật Precision';
      } else if (lowerSuppName.includes('kenda')) {
        supp = 'Công ty Cao Su KENDA Việt Nam';
      } else if (lowerSuppName.includes('tia sáng')) {
        supp = 'Công ty Ắc quy Tia Sáng';
      } else if (lowerSuppName.includes('shin-etsu') || lowerSuppName.includes('shinets') || lowerSuppName.includes('bàn giao ca sáng')) {
        supp = 'Công ty Việt Nhật Precision';
      }

      setNewAuditComponentName(comp);
      setNewAuditSpec(spec);
      setNewAuditSupplierName(supp);
    }
  };

  // Compute unique dynamic values for selects with useMemo
  const uniqueIqcSuppliers = useMemo(() => Array.from(new Set(iqcRecords.map(r => r.supplierName ? r.supplierName.trim() : ''))).filter(Boolean), [iqcRecords]);
  const uniquePqcModels = useMemo(() => Array.from(new Set(pqcRecords.map(r => r.model ? r.model.trim() : ''))).filter(Boolean), [pqcRecords]);
  const uniqueOqcColors = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < oqcRecords.length; i++) {
      const c = oqcRecords[i].color;
      if (c && c.trim()) set.add(c.trim());
    }
    return Array.from(set);
  }, [oqcRecords]);

  const uniqueOqcDates = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < oqcRecords.length; i++) {
      const r = oqcRecords[i];
      if (!r.date) continue;

      const stdDate = standardizeDate(r.date.trim());
      if (!stdDate) continue;

      const parts = stdDate.split('/');
      if (parts.length < 3) continue;

      const mNum = parseInt(parts[1], 10) || (r.month ? Number(r.month) : 0);
      const yNum = parseInt(parts[2], 10) || (r.year ? Number(r.year) : 0);

      // Lọc theo Tháng nếu được chọn
      if (oqcFilterMonth !== 'All' && String(mNum) !== String(oqcFilterMonth)) {
        continue;
      }
      // Lọc theo Năm nếu được chọn
      if (oqcFilterYear !== 'All' && String(yNum) !== String(oqcFilterYear)) {
        continue;
      }

      set.add(stdDate);
    }

    return Array.from(set).sort((a, b) => {
      const pA = a.split('/');
      const pB = b.split('/');
      const da = parseInt(pA[0], 10) || 1;
      const ma = parseInt(pA[1], 10) || 1;
      const ya = parseInt(pA[2], 10) || 2026;
      const db = parseInt(pB[0], 10) || 1;
      const mb = parseInt(pB[1], 10) || 1;
      const yb = parseInt(pB[2], 10) || 2026;
      if (ya !== yb) return yb - ya;
      if (ma !== mb) return mb - ma;
      return db - da;
    });
  }, [oqcRecords, oqcFilterMonth, oqcFilterYear]);

  // Tự động đặt lại bộ lọc Ngày về Tất cả nếu Ngày đã chọn không thuộc Tháng/Năm mới chọn
  React.useEffect(() => {
    if (oqcFilterDate !== 'All' && uniqueOqcDates.length > 0 && !uniqueOqcDates.includes(oqcFilterDate)) {
      setOqcFilterDate('All');
    }
  }, [uniqueOqcDates, oqcFilterDate]);

  const uniqueOqcMonths = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < oqcRecords.length; i++) {
      const m = oqcRecords[i].month;
      if (m && !isNaN(Number(m))) set.add(Number(m));
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [oqcRecords]);

  const uniqueOqcYears = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < oqcRecords.length; i++) {
      const y = oqcRecords[i].year;
      if (y && !isNaN(Number(y))) set.add(Number(y));
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [oqcRecords]);
  
  // Unique inspection dates for KCS Line Station (sorted)
  const uniqueKcsDates = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < oqcRecords.length; i++) {
      const d = oqcRecords[i].date;
      if (d && d.trim()) set.add(d.trim());
    }
    return Array.from(set).sort((a, b) => {
      const partsA = a.split('/');
      const partsB = b.split('/');
      const da = parseInt(partsA[0], 10) || 1;
      const ma = parseInt(partsA[1], 10) || 1;
      const ya = parseInt(partsA[2], 10) || 2026;
      const db = parseInt(partsB[0], 10) || 1;
      const mb = parseInt(partsB[1], 10) || 1;
      const yb = parseInt(partsB[2], 10) || 2026;
      if (ya !== yb) return yb - ya;
      if (ma !== mb) return mb - ma;
      return db - da;
    });
  }, [oqcRecords]);

  const uniqueKcsMonths = useMemo(() => {
    const set = new Set<number>();
    oqcRecords.forEach(r => {
      if (r.month) {
        set.add(Number(r.month));
      } else if (r.date && r.date.includes('/')) {
        const m = Number(r.date.split('/')[1]);
        if (m >= 1 && m <= 12) set.add(m);
      }
    });
    const arr = Array.from(set).sort((a, b) => a - b);
    return arr.length > 0 ? arr : Array.from({ length: 12 }, (_, i) => i + 1);
  }, [oqcRecords]);

  const uniqueKcsYears = useMemo(() => {
    const set = new Set<number>();
    oqcRecords.forEach(r => {
      if (r.year) {
        set.add(Number(r.year));
      } else if (r.date && r.date.includes('/')) {
        const y = Number(r.date.split('/')[2]);
        if (y >= 2020) set.add(y);
      }
    });
    const arr = Array.from(set).sort((a, b) => b - a);
    return arr.length > 0 ? arr : [2026];
  }, [oqcRecords]);
  
  // Unique LSX list & fast O(1) count map for OQC Line Station
  const { uniqueOqcLsxs, oqcLsxCountsMap } = useMemo(() => {
    const countsMap = new Map<string, number>();
    for (let i = 0; i < oqcRecords.length; i++) {
      const lsx = (oqcRecords[i].lsx || '26-10').trim();
      countsMap.set(lsx, (countsMap.get(lsx) || 0) + 1);
    }
    const list = Array.from(countsMap.keys()).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    return {
      uniqueOqcLsxs: list.length > 0 ? list : ['26-10', '26-15', '26-20'],
      oqcLsxCountsMap: countsMap
    };
  }, [oqcRecords]);

  // Defect autocomplete dictionary (aggregated from OQC, PQC, CAPA, and standard industry defects)
  const defectDictionary = useMemo(() => {
    const set = new Set<string>();
    oqcRecords.forEach(r => {
      if (r.defectDetail && r.defectDetail.trim()) {
        r.defectDetail.split(/[,;\n+]/).forEach(d => {
          const clean = d.trim();
          if (clean.length >= 2) set.add(clean);
        });
      }
    });
    pqcRecords.forEach(r => {
      if (r.findings && r.findings.trim()) {
        r.findings.split(/[,;\n+]/).forEach(d => {
          const clean = d.trim();
          if (clean.length >= 2) set.add(clean);
        });
      }
    });
    const standardDefects = [
      "Xước sơn sườn xe", "Xước dàn áo nhựa", "Lệch ngàm nhựa ốp sườn",
      "Hở khe lắp ráp cụm đèn", "Độ rơ tay ga lớn", "Kẹt phanh đĩa trước",
      "Kẹt phanh cơ sau", "Lệch tâm bánh xe trước", "Lỏng ốc gá động cơ",
      "Tiếng kêu bất thường giảm xóc", "Lỏng giắc cắm dây điện", "Đèn pha không sáng",
      "Đèn xi nhan không nháy", "Còi không kêu", "Khóa smartkey không nhận",
      "Lỗi màn hình LCD đồng hồ", "Chảy dầu giảm xóc", "Lệch ghi đông lái",
      "Bọt sơn / trầy xước tem dán", "Thiếu ốc cố định tấm sàn", "Chân chống nghiêng cạ sườn",
      "Yên xe đóng không khít", "Lắp ngược lốp xe", "Áp suất lốp không chuẩn",
      "Chưa siết chặt ốc phanh", "Lỗi cổng sạc ắc quy / pin", "Mất tín hiệu cảm biến phanh ngắt điện"
    ];
    standardDefects.forEach(d => set.add(d));
    return Array.from(set);
  }, [oqcRecords, pqcRecords]);

  // Root cause autocomplete dictionary
  const causeDictionary = useMemo(() => {
    const set = new Set<string>();
    oqcRecords.forEach(r => {
      if (r.rootCause && r.rootCause.trim()) {
        r.rootCause.split(/[,;\n+]/).forEach(c => {
          const clean = c.trim();
          if (clean.length >= 2) set.add(clean);
        });
      }
    });
    const standardCauses = [
      "Công nhân lắp ráp sai cữ gá", "Bốc xếp va đập trong chuyền", "Lỗi linh kiện nhà cung cấp",
      "Khuôn ép nhựa sai dung sai", "Sơn dặm lại chưa khô", "Chưa siết đủ lực siết ốc",
      "Luồn dây điện cọ xát khung", "Gá kẹp phanh bị nghiêng", "Tem dán bị bọt khí do thao tác tay",
      "Lỗi module điều khiển ECU", "Dây cáp phanh bị căng quá mức", "Lắp ráp ép khớp nhựa quá lực làm gãy chấu",
      "Công nhân thao tác cẩu thả", "Không bọc xốp đệm chống trầy sườn", "Sai quy trình lắp ráp"
    ];
    standardCauses.forEach(c => set.add(c));
    return Array.from(set);
  }, [oqcRecords]);

  // Master Part Codes (Bảng mã xe / Mã quy cách) states
  const [oqcPartCodes, setOqcPartCodes] = useState<OqcPartCodeItem[]>(() => {
    try {
      const saved = safeStorage.getItem('dk_oqc_part_codes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_OQC_PART_CODES;
  });

  const saveOqcPartCodes = (list: OqcPartCodeItem[]) => {
    setOqcPartCodes(list);
    safeStorage.setItem('dk_oqc_part_codes', JSON.stringify(list));
  };

  const lookupPartCode = useCallback((code: string): OqcPartCodeItem | null => {
    if (!code) return null;
    const clean = code.trim().toUpperCase();
    return oqcPartCodes.find(p => p.partCode.trim().toUpperCase() === clean) || null;
  }, [oqcPartCodes]);

  const getCleanModelName = useCallback((r: { model?: string; color?: string; partCode?: string }): string => {
    // 1. Authoritative lookup from partCode dictionary if available
    if (r.partCode) {
      const matched = lookupPartCode(r.partCode);
      if (matched && matched.model) return matched.model.trim();
    }

    let m = (r.model || '').trim();
    const mLow = m.toLowerCase();

    // Check if model string is empty, status text, or a vehicle color name
    const isInvalidModel = !m || 
      mLow === 'đạt' || mLow === 'lỗi' || mLow === 'chưa kiểm tra' || 
      mLow === 'pass' || mLow === 'fail' || mLow === '0' || mLow === '1' || 
      mLow === 'tiêu chuẩn' || mLow === 'dòng khác' || mLow === 'khác' ||
      isColorOnlyString(m);

    if (isInvalidModel) {
      m = '';
      // Try to extract model from color if color string format is "DK Roma SX - Đỏ"
      if (r.color && (r.color.includes(' - ') || (r.color.includes('-') && !/^\d/.test(r.color)))) {
        const delim = r.color.includes(' - ') ? ' - ' : '-';
        const parts = r.color.split(delim).map(s => s.trim());
        if (parts[0] && isKnownModelString(parts[0]) && !isColorOnlyString(parts[0])) {
          m = parts[0];
        }
      }
    }

    // 2. Fallback lookup by partCode prefix
    if (!m && r.partCode) {
      const pUp = r.partCode.toUpperCase();
      if (pUp.includes('TEMDD') || pUp.includes('D2')) m = 'DK D2';
      else if (pUp.includes('TEMDV') || pUp.includes('V2')) m = 'DK V2';
      else if (pUp.includes('ROM') || pUp.includes('ROMA')) m = 'DK Roma SX V2';
      else if (pUp.includes('GOGO') || pUp.includes('GG')) m = 'DK Gogo';
      else if (pUp.includes('SAM')) m = 'DK Samurai';
      else if (pUp.includes('XMEN') || pUp.includes('XMAN')) m = 'DK Xmen';
      else if (pUp.includes('CREA')) m = 'DK Crea Mono';
      else if (pUp.includes('EZ')) m = 'DK EZ3';
      else if (pUp.includes('S1')) m = 'DK S1';
      else if (pUp.includes('S2')) m = 'DK S2';
      else if (pUp.includes('S3')) m = 'DK S3';
      else if (pUp.includes('NOVA')) m = 'DK Nova';
      else if (pUp.includes('ZMTP') || pUp.includes('ZMT')) m = 'DK Z-MTP';
    }

    if (!m || isColorOnlyString(m)) {
      m = 'DK D2';
    }

    return m;
  }, [lookupPartCode]);

  const isOqcRecordPassed = useCallback((r: OQCRecord) => {
    if (r.status === 'Đạt') return true;
    if (r.status === 'Lỗi' || r.status === 'Chưa kiểm tra') return false;
    if (r.passFlag === 1) return true;
    if (r.failedCount && r.failedCount > 0) return false;
    const text = ((r.defectDetail || '') + ' ' + (r.rootCause || '')).trim().toLowerCase();
    if (!text || text === 'không' || text === 'ok' || text === 'pass' || text === 'đạt' || text === 'sạch không lỗi') {
      return true;
    }
    return false;
  }, []);

  const getRowCapaData = useCallback((defectDetail: string | undefined, evaluation: string | undefined, rootCause: string | undefined, treatment: string | undefined) => {
    const txt = (defectDetail || '').toLowerCase();
    let defaultImpact = evaluation || 'Suy giảm chất lượng ngoại quan hoặc hiệu suất vận hành lắp ráp.';
    let defaultRoot = rootCause || 'Công nhân thao tác chưa đúng dải lực thiết lập tiêu chuẩn.';
    let defaultTreatment = treatment || 'Yêu cầu hiệu chuẩn gá định vị định kỳ và đào tạo kỹ năng SOP.';
    
    if (txt.includes('bms') || txt.includes('sụt áp') || txt.includes('nguồn')) {
      defaultImpact = evaluation || 'Nguy cơ sụt áp đột ngột gây tắt máy giữa hành trình lên dốc, đe dọa an toàn tính mạng nghiêm trọng.';
      defaultRoot = rootCause || 'Cơ cấu chân giắc lỏng lẻo phát sinh hồ quang điện, hoặc bong mối hàn bảo vệ rơ-le BMS do buồng sấy nhiệt vượt quá 65°C.';
      defaultTreatment = treatment || 'Gia tăng lực kẹp chốt bảo vệ đầu giắc, khống chế nhiệt độ lò sấy dán tem tối đa 60°C và áp dụng keo bảo vệ chuyên dụng.';
    } else if (txt.includes('tem') || txt.includes('lệch')) {
      defaultImpact = evaluation || 'Mất mỹ quan bề mặt thành phẩm cao cấp, ảnh hưởng trực tiếp đến hình ảnh dán tem chính hãng dán của DKBike.';
      defaultRoot = rootCause || 'Cữ gá dán tem định vị thủ công bị rơ lỏng mài mòn dải chặn căn mép.';
      defaultTreatment = treatment || 'Chấn chỉnh và thay thế cữ định vị chặn dán cơ khí mới, bổ sung thước laser định hướng dán tem chuẩn chỉ.';
    } else if (txt.includes('phanh') || txt.includes('bó cứng') || txt.includes('bó')) {
      defaultImpact = evaluation || 'Kẹt phanh bó đĩa tăng sinh nhiệt ma sát cao, làm mòn má đĩa phanh nhanh và tiêu hao năng lượng pin lớn.';
      defaultRoot = rootCause || 'Hành trình tay bóp phanh xiết quá mức dải tự do hành trình tay, pittông xilanh kẹt bẩn dầu thủy lực hồi trễ.';
      defaultTreatment = treatment || 'Căn chỉnh khe hở má phanh và dải bóp phanh tự do đạt 10-15mm tiêu chuẩn, xả gió bọt khí đường ống phanh dầu.';
    }
    
    return {
      impact: defaultImpact,
      rootCause: defaultRoot,
      treatment: defaultTreatment
    };
  }, []);

  // Helper to compare dates of IQC records
  const parseDateToNumber = (dateStr: string): number => {
    if (!dateStr) return 0;
    let year = 2026;
    let month = 1;
    let day = 1;
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      year = Number(parts[0]) || 2026;
      month = Number(parts[1]) || 1;
      day = Number(parts[2]) || 1;
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      day = Number(parts[0]) || 1;
      month = Number(parts[1]) || 1;
      year = Number(parts[2]) || 2026;
    }
    return year * 10000 + month * 100 + day;
  };

  // Filtered lists (automatically sorted from newest to oldest)
  const filteredIqc = useMemo(() => {
    const sLower = iqcSearch.trim().toLowerCase();
    const isWeekAll = iqcFilterWeek === 'All';
    const isMonthAll = iqcFilterMonth === 'All';

    return iqcRecords.filter(r => {
      const matchesSearch = sLower === '' || 
        (r.supplierName || '').toLowerCase().includes(sLower) ||
        (r.content || '').toLowerCase().includes(sLower) ||
        (r.checkedBy || '').toLowerCase().includes(sLower) ||
        (r.id || '').toLowerCase().includes(sLower);
      if (!matchesSearch) return false;

      const matchesSupplier = iqcFilterSupplier === 'All' || r.supplierName === iqcFilterSupplier;
      if (!matchesSupplier) return false;

      const matchesResult = iqcFilterResult === 'All' || r.result === iqcFilterResult;
      if (!matchesResult) return false;

      if (isWeekAll && isMonthAll) return true;

      const dateInfo = r.date ? getWeekAndMonthFromDate(r.date) : null;
      const recordWeek = dateInfo ? dateInfo.week : 'T1';
      const recordMonth = dateInfo ? dateInfo.month : 1;

      const matchesWeek = isWeekAll || recordWeek === iqcFilterWeek;
      if (!matchesWeek) return false;

      const matchesMonth = isMonthAll || String(recordMonth) === iqcFilterMonth;
      return matchesMonth;
    }).sort((a, b) => {
      const dateA = parseDateToNumber(a.date);
      const dateB = parseDateToNumber(b.date);
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [iqcRecords, iqcSearch, iqcFilterSupplier, iqcFilterResult, iqcFilterWeek, iqcFilterMonth]);

  const iqcPageSize = 20;
  const iqcTotalPages = useMemo(() => Math.max(1, Math.ceil(filteredIqc.length / iqcPageSize)), [filteredIqc.length]);
  const safeIqcPage = Math.min(iqcCurrentPage, iqcTotalPages);
  const paginatedIqc = useMemo(() => {
    return filteredIqc.slice((safeIqcPage - 1) * iqcPageSize, safeIqcPage * iqcPageSize);
  }, [filteredIqc, safeIqcPage]);
  const selectedIqcSet = useMemo(() => new Set(selectedIqcIds), [selectedIqcIds]);
  const selectedOqcSet = useMemo(() => new Set(selectedOqcIds), [selectedOqcIds]);

  const filteredPqc = useMemo(() => {
    return pqcRecords.filter(r => {
      const matchesSearch = pqcSearch === '' || 
        (r.lsx || '').toLowerCase().includes(pqcSearch.toLowerCase()) ||
        (r.model || '').toLowerCase().includes(pqcSearch.toLowerCase()) ||
        (r.findings || '').toLowerCase().includes(pqcSearch.toLowerCase()) ||
        (r.checkedBy || '').toLowerCase().includes(pqcSearch.toLowerCase());
        
      const matchesStatus = pqcFilterStatus === 'All' || r.status === pqcFilterStatus;
      const matchesModel = pqcFilterModel === 'All' || r.model === pqcFilterModel;
      
      // Week filter
      const recordWeek = r.date ? getWeekAndMonthFromDate(r.date).week : 'T1';
      const matchesWeek = pqcFilterWeek === 'All' || recordWeek === pqcFilterWeek;

      // Month filter
      const recordMonth = r.date ? getWeekAndMonthFromDate(r.date).month : 1;
      const matchesMonth = pqcFilterMonth === 'All' || String(recordMonth) === pqcFilterMonth;
      
      return matchesSearch && matchesStatus && matchesModel && matchesWeek && matchesMonth;
    });
  }, [pqcRecords, pqcSearch, pqcFilterStatus, pqcFilterModel, pqcFilterWeek, pqcFilterMonth]);

  const filteredOqc = useMemo(() => {
    const sLower = oqcSearch.trim().toLowerCase();
    const isWeekAll = oqcFilterWeek === 'All';
    const isMonthAll = oqcFilterMonth === 'All';
    const isYearAll = oqcFilterYear === 'All';
    const isDateAll = oqcFilterDate === 'All';
    const isModelAll = oqcFilterModel === 'All';
    const isColorAll = oqcFilterColor === 'All';

    const stdFilterDate = isDateAll ? '' : standardizeDate(oqcFilterDate);

    return oqcRecords.filter(r => {
      // 1. Search text matching
      if (sLower !== '') {
        const matchesSearch = 
          (r.serialNo && r.serialNo.toLowerCase().includes(sLower)) ||
          (r.chassisNo && r.chassisNo.toLowerCase().includes(sLower)) ||
          (r.engineNo && r.engineNo.toLowerCase().includes(sLower)) ||
          (r.partCode && r.partCode.toLowerCase().includes(sLower)) ||
          (r.model && r.model.toLowerCase().includes(sLower)) ||
          (r.color && r.color.toLowerCase().includes(sLower)) ||
          (r.lsx && r.lsx.toLowerCase().includes(sLower)) ||
          (r.defectDetail && r.defectDetail.toLowerCase().includes(sLower));
        if (!matchesSearch) return false;
      }
        
      // 2. Model matching
      if (!isModelAll) {
        const cleanModel = getCleanModelName(r);
        const matchesModel = 
          r.model === oqcFilterModel || 
          cleanModel === oqcFilterModel ||
          (r.model && r.model.toLowerCase().includes(oqcFilterModel.toLowerCase())) ||
          (cleanModel && cleanModel.toLowerCase().includes(oqcFilterModel.toLowerCase()));
        if (!matchesModel) return false;
      }

      // 3. Color matching
      if (!isColorAll && r.color !== oqcFilterColor) return false;

      // 4. Date filter matching
      if (!isDateAll) {
        const stdRecordDate = r.date ? standardizeDate(r.date) : '';
        if (stdRecordDate !== stdFilterDate) return false;
      }

      // 5. Month filter
      if (!isMonthAll) {
        const recMonth = String(r.month || '');
        if (recMonth && recMonth !== oqcFilterMonth && recMonth !== 'NaN') return false;
      }

      // 6. Year filter
      if (!isYearAll) {
        const recYear = String(r.year || '');
        if (recYear && recYear !== oqcFilterYear && recYear !== 'NaN') return false;
      }

      // 7. Week filter (Chỉ gọi dateInfo khi thực sự cần lọc theo tuần)
      if (!isWeekAll) {
        const stdRecordDate = r.date ? standardizeDate(r.date) : '';
        const dateInfo = stdRecordDate ? getWeekAndMonthFromDate(stdRecordDate) : null;
        const recordWeek = dateInfo ? dateInfo.week : 'T1';
        if (recordWeek !== oqcFilterWeek) return false;
      }

      return true;
    }).sort((a, b) => {
      const sA = (a.serialNo || a.id || '').trim();
      const sB = (b.serialNo || b.id || '').trim();
      if (sA === sB) return 0;
      return sA < sB ? -1 : 1;
    });
  }, [oqcRecords, oqcSearch, oqcFilterModel, oqcFilterColor, oqcFilterDate, oqcFilterMonth, oqcFilterYear, oqcFilterWeek, getCleanModelName]);



  const oqcDashboardStats = useMemo(() => {
    const liveLapRapTotal = filteredOqc.length;
    let datVal = 0;
    let loiVal = 0;
    let chuaKiemVal = 0;

    const liveModelsMap: Record<string, number> = {};
    const liveModelDefects: Record<string, { name: string; count: number }[]> = {};
    const modelStatsMap: Record<string, { total: number; passed: number; failed: number; pending: number }> = {};

    for (let i = 0; i < filteredOqc.length; i++) {
      const r = filteredOqc[i];
      
      const hasDefect = (r.status === 'Lỗi') || (r.failedCount && r.failedCount > 0) || Boolean(r.defectDetail && r.defectDetail.trim() && !['không', 'ok', 'pass', 'đạt', 'sạch không lỗi'].includes(r.defectDetail.trim().toLowerCase()));
      const isPassed = r.status === 'Đạt' || (r.passFlag === 1 && !hasDefect);
      const isFailed = !isPassed && hasDefect;
      const isPending = !isPassed && !isFailed;

      if (isPassed) {
        datVal++;
      } else if (isFailed) {
        loiVal++;
      } else {
        chuaKiemVal++;
      }

      const modelName = getCleanModelName(r);
      if (modelName && modelName.toLowerCase() !== 'đạt' && modelName.toLowerCase() !== 'lỗi' && modelName.toLowerCase() !== 'chưa kiểm tra' && modelName.toLowerCase() !== 'pass' && modelName.toLowerCase() !== 'fail') {
        liveModelsMap[modelName] = (liveModelsMap[modelName] || 0) + 1;

        if (!modelStatsMap[modelName]) {
          modelStatsMap[modelName] = { total: 0, passed: 0, failed: 0, pending: 0 };
        }
        modelStatsMap[modelName].total++;
        if (isPassed) {
          modelStatsMap[modelName].passed++;
        } else if (isFailed) {
          modelStatsMap[modelName].failed++;
        } else {
          modelStatsMap[modelName].pending++;
        }

        if (isFailed && r.defectDetail) {
          if (!liveModelDefects[modelName]) {
            liveModelDefects[modelName] = [];
          }
          const items = r.defectDetail.split(/[,;+\n]/).map(s => s.trim()).filter(Boolean);
          for (let j = 0; j < items.length; j++) {
            const defect = items[j];
            const existing = liveModelDefects[modelName].find(d => d.name === defect);
            if (existing) {
              existing.count += (r.failedCount || 1);
            } else {
              liveModelDefects[modelName].push({ name: defect, count: (r.failedCount || 1) });
            }
          }
        }
      }
    }

    const checkedTotal = datVal + loiVal;
    const pieDatPercent = checkedTotal > 0 ? Math.round((datVal / checkedTotal) * 100) : (liveLapRapTotal > 0 ? Math.round((datVal / liveLapRapTotal) * 100) : 0);
    const pieLoiPercent = checkedTotal > 0 ? Math.round((loiVal / checkedTotal) * 100) : 0;

    let activeBarData = Object.entries(liveModelsMap).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    if (activeBarData.length === 0) {
      activeBarData = [
        { name: 'DK Roma SX V2', count: 0 },
        { name: 'DK Nova', count: 0 },
        { name: 'DK Gogo', count: 0 },
        { name: 'DK EZ3', count: 0 },
        { name: 'DK D2', count: 0 }
      ];
    }

    const assembledModels = Object.keys(modelStatsMap).sort();

    const modelStats = assembledModels.map(model => {
      const st = modelStatsMap[model];
      const total = st.total;
      const passed = st.passed;
      const failed = st.failed;
      const pending = st.pending;
      const checked = passed + failed;

      const passRate = checked > 0 ? Math.round((passed / checked) * 100) : (passed > 0 ? Math.round((passed / total) * 100) : 0);
      const failRate = checked > 0 ? Math.round((failed / checked) * 100) : 0;
      return {
        model,
        total,
        passed,
        failed,
        pending,
        checked,
        passRate,
        failRate,
      };
    }).sort((a, b) => b.total - a.total);

    const maxTotal = Math.max(1, ...modelStats.map(s => s.total));

    return {
      liveLapRapTotal,
      datVal,
      loiVal,
      chuaKiemVal,
      checkedTotal,
      pieDatPercent,
      pieLoiPercent,
      activeBarData,
      liveModelDefects,
      assembledModels,
      modelStats,
      maxTotal,
    };
  }, [filteredOqc, getCleanModelName]);



  // Auto-clean any legacy records with 'Lỗi', 'Đạt' or color names as model name
  React.useEffect(() => {
    if (!oqcRecords || oqcRecords.length === 0) return;
    let hasDirtyModel = false;
    const cleaned = oqcRecords.map(r => {
      const cleanM = getCleanModelName(r);
      if (r.model !== cleanM) {
        hasDirtyModel = true;
        return {
          ...r,
          model: cleanM
        };
      }
      return r;
    });

    if (hasDirtyModel) {
      setOqcRecords(cleaned);
      safeStorage.setItem('dk_oqc_records', JSON.stringify(cleaned));
      try {
        localStorage.setItem('dk_oqc_records_is_dirty', 'true');
      } catch (e) {}
      if (typeof (window as any).syncToServer === 'function') {
        (window as any).syncToServer('dk_oqc_records', cleaned);
      }
    }
  }, [oqcRecords, getCleanModelName, setOqcRecords]);

  const uniqueOqcModels = useMemo(() => Array.from(new Set(oqcRecords.map(r => getCleanModelName(r)).filter(Boolean))).sort(), [oqcRecords, getCleanModelName]);

  const defectModelTokenCounts = useMemo(() => {
    const counts: { [model: string]: { [token: string]: number } } = {};
    oqcRecords.forEach(r => {
      if (r.status === 'Lỗi' && !isOqcRecordPassed(r) && r.defectDetail) {
        const m = getCleanModelName(r);
        if (!counts[m]) {
          counts[m] = {};
        }
        const parts = r.defectDetail.split(/[,;+\n]/).map(x => x.trim().toLowerCase()).filter(Boolean);
        parts.forEach(p => {
          counts[m][p] = (counts[m][p] || 0) + 1;
        });
      }
    });
    return counts;
  }, [oqcRecords, isOqcRecordPassed, getCleanModelName]);

  const getRecordMaxDefectCount = useCallback((r: OQCRecord) => {
    if (r.status !== 'Lỗi' || isOqcRecordPassed(r) || !r.defectDetail) return 0;
    const m = getCleanModelName(r);
    const modelCounts = defectModelTokenCounts[m];
    if (!modelCounts) return 0;
    
    const parts = r.defectDetail.split(/[,;+\n]/).map(x => x.trim().toLowerCase()).filter(Boolean);
    let maxCount = 0;
    parts.forEach(p => {
      const pCount = modelCounts[p] || 0;
      if (pCount > maxCount) {
        maxCount = pCount;
      }
    });
    return maxCount;
  }, [defectModelTokenCounts, isOqcRecordPassed, getCleanModelName]);

  const oqcPivotReport = useMemo(() => {
    const groups: {
      [model: string]: {
        model: string;
        total: number;
        passed: number;
        failed: number;
        errors: { [error: string]: number };
      }
    } = {};

    filteredOqc.forEach(r => {
      const m = getCleanModelName(r);
      if (!groups[m]) {
        groups[m] = {
          model: m,
          total: 0,
          passed: 0,
          failed: 0,
          errors: {}
        };
      }
      
      const g = groups[m];
      g.total += 1;
      if (r.status === 'Đạt' || isOqcRecordPassed(r)) {
        g.passed += 1;
      } else if (r.status === 'Lỗi') {
        g.failed += 1;
        
        // Phân tách lỗi
        if (r.defectDetail) {
          const parts = r.defectDetail.split(/[,;+]/).map(x => x.trim()).filter(Boolean);
          parts.forEach(p => {
            const formattedName = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
            g.errors[formattedName] = (g.errors[formattedName] || 0) + 1;
          });
        }
      }
    });

    return Object.values(groups).map(g => {
      const sortedErrors = Object.entries(g.errors)
        .filter(([_, count]) => count > 10)
        .sort((a, b) => b[1] - a[1])
        .map(([err, count]) => `${err} (x${count})`);

      return {
        model: g.model,
        total: g.total,
        passed: g.passed,
        failed: g.failed,
        topErrors: sortedErrors.length > 0 ? sortedErrors.join(', ') : '✓ Không có lỗi > 10 lần'
      };
    });
  }, [filteredOqc, isOqcRecordPassed, getCleanModelName]);

  const oqcErrorsByModelReport = useMemo(() => {
    // Group failure details by model
    const groups: {
      [model: string]: {
        model: string;
        errorDetails: { [errorText: string]: number };
        totalErrorCount: number;
      }
    } = {};

    filteredOqc.forEach(r => {
      if (r.status === 'Lỗi' && !isOqcRecordPassed(r) && r.defectDetail) {
        const m = getCleanModelName(r);
        if (!groups[m]) {
          groups[m] = {
            model: m,
            errorDetails: {},
            totalErrorCount: 0
          };
        }
        const g = groups[m];
        
        // Split defectDetail by comma, semicolon, plus or newline
        const parts = r.defectDetail.split(/[,;+\n]/).map(x => x.trim()).filter(Boolean);
        parts.forEach(p => {
          const formattedName = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
          g.errorDetails[formattedName] = (g.errorDetails[formattedName] || 0) + 1;
          g.totalErrorCount += 1;
        });
      }
    });

    // Flatten to an array
    const result: {
      model: string;
      errors: { text: string; count: number }[];
      totalCount: number;
    }[] = [];

    Object.values(groups).forEach(g => {
      // Sort errors by count descending and take up to top 5 errors
      const sortedErrors = Object.entries(g.errorDetails)
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      if (sortedErrors.length > 0) {
        const filteredTotalCount = sortedErrors.reduce((sum, item) => sum + item.count, 0);
        result.push({
          model: g.model,
          errors: sortedErrors,
          totalCount: filteredTotalCount
        });
      }
    });

    // Sort models by total error count descending
    return result.sort((a, b) => b.totalCount - a.totalCount);
  }, [filteredOqc, isOqcRecordPassed]);

  const topOqcErrorsOverall = useMemo(() => {
    const counts: { [error: string]: number } = {};
    filteredOqc.forEach(r => {
      if (r.status === 'Lỗi' && !isOqcRecordPassed(r) && r.defectDetail) {
        const parts = r.defectDetail.split(/[,;+\n]/).map(x => x.trim()).filter(Boolean);
        parts.forEach(p => {
          const formattedName = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
          counts[formattedName] = (counts[formattedName] || 0) + 1;
        });
      }
    });

    return Object.entries(counts)
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredOqc, isOqcRecordPassed]);

  const displayOqcList = useMemo(() => {
    if (oqcListFilter === 'fail') {
      return filteredOqc.filter(r => r.status === 'Lỗi' && !isOqcRecordPassed(r));
    }
    if (oqcListFilter === 'heavy_fail') {
      return filteredOqc.filter(r => r.status === 'Lỗi' && !isOqcRecordPassed(r) && getRecordMaxDefectCount(r) > 10);
    }
    return filteredOqc;
  }, [filteredOqc, oqcListFilter, getRecordMaxDefectCount, isOqcRecordPassed]);

  const groupedOqcList = useMemo(() => {
    const groups: { [key: string]: GroupedOqcRow } = {};
    
    displayOqcList.forEach(r => {
      const isPassed = isOqcRecordPassed(r);
      const isLoi = r.status === 'Lỗi' && !isPassed;
      
      if (!isLoi) {
        // For passed rows, display as a single unified entry
        const label = isPassed 
          ? (r.defectDetail?.trim() || 'Lỗi xước/thiếu tự loại trừ')
          : '✓ Hoàn hảo';
        
        const key = `${r.model || 'Chưa phân loại'}||Pass||${label.toLowerCase()}`;
        if (!groups[key]) {
          groups[key] = {
            id: r.id,
            model: r.model || 'Chưa phân loại',
            status: 'Đạt',
            isPassed: true,
            defectDetail: label,
            rootCause: r.rootCause || '',
            totalLlr: r.totalLlr || 1,
            count: 1,
            evaluation: r.evaluation || '',
            treatment: r.treatment || '',
            ids: [r.id],
            originalRecord: r
          };
        } else {
          const g = groups[key];
          if (!g.ids.includes(r.id)) {
            g.ids.push(r.id);
            g.count += 1;
            g.totalLlr += (r.totalLlr || 1);
          }
        }
      } else {
        // Splitting actual hard defects into separate rows by separators (comma, semicolon, plus, or newline)
        const parts = (r.defectDetail || 'Chưa mô tả lỗi')
          .split(/[,;+\n]/)
          .map(x => x.trim())
          .filter(Boolean);
        
        const errorParts = parts.length > 0 ? parts : ['Chưa mô tả lỗi'];
        
        errorParts.forEach(part => {
          const partLower = part.toLowerCase();
          const partIsPassed = partLower.includes('xước') || partLower.includes('xuoc') || partLower.includes('thiếu') || partLower.includes('thieu');
          
          const key = `${r.model || 'Chưa phân loại'}||${partIsPassed ? 'Pass' : 'Fail'}||${partLower}`;
          
          if (!groups[key]) {
            groups[key] = {
              id: `${r.id}-${part}`,
              model: r.model || 'Chưa phân loại',
              status: partIsPassed ? 'Đạt' : 'Lỗi',
              isPassed: partIsPassed,
              defectDetail: part,
              rootCause: r.rootCause || '',
              totalLlr: r.totalLlr || 1,
              count: 1,
              evaluation: r.evaluation || '',
              treatment: r.treatment || '',
              ids: [r.id],
              originalRecord: r
            };
          } else {
            const g = groups[key];
            if (!g.ids.includes(r.id)) {
              g.ids.push(r.id);
              g.count += 1;
              g.totalLlr += (r.totalLlr || 1);
            }
            if (!g.evaluation && r.evaluation) {
              g.evaluation = r.evaluation;
            }
            if (!g.treatment && r.treatment) {
              g.treatment = r.treatment;
            }
            if (!g.rootCause && r.rootCause) {
              g.rootCause = r.rootCause;
            }
          }
        });
      }
    });
    
    return Object.values(groups);
  }, [displayOqcList, isOqcRecordPassed]);

  const uniqueAuditSuppliers = Array.from(new Set(supplierProductionAudits.map(r => r.supplierName))).filter(Boolean);

  const filteredSupplierAudits = supplierProductionAudits.filter(r => {
    const matchesSearch = supplierAuditSearch === '' || 
      (r.supplierName || '').toLowerCase().includes(supplierAuditSearch.toLowerCase()) ||
      (r.componentName || '').toLowerCase().includes(supplierAuditSearch.toLowerCase()) ||
      (r.targetSpecification || '').toLowerCase().includes(supplierAuditSearch.toLowerCase()) ||
      (r.id || '').toLowerCase().includes(supplierAuditSearch.toLowerCase());
      
    const matchesSupplier = supplierAuditFilterSupplier === 'All' || r.supplierName === supplierAuditFilterSupplier;
    const matchesStatus = supplierAuditFilterStatus === 'All' || r.status === supplierAuditFilterStatus;
    
    return matchesSearch && matchesSupplier && matchesStatus;
  });

  // Modals visibility
  const [showAddIqcModal, setShowAddIqcModal] = useState(false);
  const [showAddPqcModal, setShowAddPqcModal] = useState(false);
  const [showAddOqcModal, setShowAddOqcModal] = useState(false);
  const [showImportOqcModal, setShowImportOqcModal] = useState(false);
  const [oqcImportText, setOqcImportText] = useState('');
  const [oqcImportError, setOqcImportError] = useState('');

  // OQC Color Change states, scanning & persistence
  const [showColorChangeModal, setShowColorChangeModal] = useState(false);
  const [colorChangeText, setColorChangeText] = useState('');
  const [colorChangeError, setColorChangeError] = useState('');
  const [colorChangeDefaultDate, setColorChangeDefaultDate] = useState(() => new Date().toLocaleDateString('vi-VN'));
  
  // Scanner Mode States (In-Memory Staging, zero disk spam during continuous scan)
  const [showScanColorChangeModal, setShowScanColorChangeModal] = useState(false);
  const [scanSerialInput, setScanSerialInput] = useState('');
  const [scanDate, setScanDate] = useState(() => new Date().toLocaleDateString('vi-VN'));
  const [stagedScans, setStagedScans] = useState<Array<{
    serialNo: string;
    model: string;
    oldModel: string;
    newModel: string;
    oldColor: string;
    newColor: string;
    changeType: 'color' | 'status' | 'both';
    date: string;
    lsx?: string;
    partCode?: string;
    isNewInOqc?: boolean;
  }>>([]);
  const [scanError, setScanError] = useState('');
  const [scanLastSuccess, setScanLastSuccess] = useState<string | null>(null);
  const scannerInputRef = React.useRef<HTMLInputElement>(null);

  // Edit Color Change Record State
  const [editingColorChangeRecord, setEditingColorChangeRecord] = useState<OqcColorChangeRecord | null>(null);
  const [showEditColorChangeModal, setShowEditColorChangeModal] = useState(false);
  const [editCcSerialNo, setEditCcSerialNo] = useState('');
  const [editCcOldModel, setEditCcOldModel] = useState('');
  const [editCcNewModel, setEditCcNewModel] = useState('');
  const [editCcOldColor, setEditCcOldColor] = useState('');
  const [editCcNewColor, setEditCcNewColor] = useState('');
  const [editCcDate, setEditCcDate] = useState('');
  const [editCcError, setEditCcError] = useState('');

  // Multi-dimensional filters for Color Change Subtab
  const [colorChangeSearchText, setColorChangeSearchText] = useState('');
  const [colorChangeFilterModel, setColorChangeFilterModel] = useState('Tất cả');
  const [colorChangeFilterOldColor, setColorChangeFilterOldColor] = useState('Tất cả');
  const [colorChangeFilterNewColor, setColorChangeFilterNewColor] = useState('Tất cả');
  const [colorChangeFilterDate, setColorChangeFilterDate] = useState('Tất cả');
  const [colorChangeFilterMonth, setColorChangeFilterMonth] = useState('Tất cả');
  const [colorChangeFilterYear, setColorChangeFilterYear] = useState('Tất cả');
  const [isColorChangeFilterExpanded, setIsColorChangeFilterExpanded] = useState(false);
  const [colorChangeCurrentPage, setColorChangeCurrentPage] = useState<number>(1);

  const [localColorChanges, setLocalColorChanges] = useState<OqcColorChangeRecord[]>(() => {
    if (oqcColorChanges && oqcColorChanges.length > 0) return oqcColorChanges;
    const saved = safeStorage.getItem('dk_oqc_color_changes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    if (oqcColorChanges && Array.isArray(oqcColorChanges)) {
      setLocalColorChanges(oqcColorChanges);
    }
  }, [oqcColorChanges]);

  const activeColorChanges = oqcColorChanges && oqcColorChanges.length > 0 ? oqcColorChanges : localColorChanges;
  const updateColorChanges = (newChanges: OqcColorChangeRecord[]) => {
    if (setOqcColorChanges) {
      setOqcColorChanges(newChanges);
    }
    setLocalColorChanges(newChanges);
    safeStorage.setItem('dk_oqc_color_changes', JSON.stringify(newChanges));
    try {
      localStorage.setItem('dk_oqc_color_changes', JSON.stringify(newChanges));
      localStorage.setItem('dk_oqc_color_changes_is_dirty', 'true');
    } catch (e) {}
    if (typeof (window as any).syncToServer === 'function') {
      (window as any).syncToServer('dk_oqc_color_changes', newChanges);
    }
    try {
      window.dispatchEvent(new CustomEvent('dk_color_changes_updated', { detail: newChanges }));
    } catch (e) {}
  };

  // IQC Import & Edit states
  const [showImportIqcModal, setShowImportIqcModal] = useState(false);
  const [iqcImportText, setIqcImportText] = useState('');
  const [iqcImportError, setIqcImportError] = useState('');
  
  const [editingIqcRecord, setEditingIqcRecord] = useState<IQCRecord | null>(null);
  const [showEditIqcModal, setShowEditIqcModal] = useState(false);

  const [editingPqcRecord, setEditingPqcRecord] = useState<PQCRecord | null>(null);
  const [showEditPqcModal, setShowEditPqcModal] = useState(false);

  const [editingOqcRecord, setEditingOqcRecord] = useState<OQCRecord | null>(null);
  const [editingOqcGroupIds, setEditingOqcGroupIds] = useState<string[]>([]);
  const [showEditOqcModal, setShowEditOqcModal] = useState(false);
  const [editOqcStatus, setEditOqcStatus] = useState<'Đạt' | 'Lỗi' | 'Chưa kiểm tra'>('Lỗi');
  const [editOqcDefectDetail, setEditOqcDefectDetail] = useState('');
  const [editOqcRootCause, setEditOqcRootCause] = useState('');
  const [editOqcEvaluation, setEditOqcEvaluation] = useState('');
  const [editOqcTreatment, setEditOqcTreatment] = useState('');

  // Ecount integration states
  const [showEcountSyncModal, setShowEcountSyncModal] = useState(false);
  const [ecountDataList, setEcountDataList] = useState<EcountRow[]>(() => 
    ECOUNT_PRELOADED_DATA.map(item => ({ ...item }))
  );
  const [ecountPasteText, setEcountPasteText] = useState('');
  const [ecountPasteRows, setEcountPasteRows] = useState<EcountRow[]>([]);
  const [ecountSyncTab, setEcountSyncTab] = useState<'snapshot' | 'paste'>('snapshot');
  const [ecountSearchQuery, setEcountSearchQuery] = useState('');
  const [ecountConfig, setEcountConfig] = useState({
    enabled: true,
    comCode: "DKBIKE_CORP",
    userId: "thaonguyen_qc",
    apiKey: "ecount_demo_key_951f496d0acb",
    zoneCode: "ia",
    isSimulation: true,
    syncInterval: "30",
    lastSyncTime: ""
  });
  const [isSyncingEngine, setIsSyncingEngine] = useState(false);
  const [syncHistory, setSyncHistory] = useState<{time: string, count: number, source: string}[]>([]);

  // Export KCS Report states
  const [showExportKcsReportModal, setShowExportKcsReportModal] = useState(false);
  const [exportKcsPeriod, setExportKcsPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [exportKcsMonth, setExportKcsMonth] = useState<number>(new Date().getMonth() + 1);
  const [exportKcsWeek, setExportKcsWeek] = useState<string>('T1');
  const [exportKcsYear, setExportKcsYear] = useState<number>(2026);
  const [exportKcsModel, setExportKcsModel] = useState<string>('All');

  // OQC Sub-view state: 'station' (Trạm KCS) | 'handover' (Báo phẩm bàn giao) | 'part_codes' (Bảng mã xe) | 'dashboard' (Đồ thị báo cáo)
  const [oqcSubView, setOqcSubView] = useState<'station' | 'handover' | 'part_codes' | 'dashboard'>('station');

  const [partCodeSearch, setPartCodeSearch] = useState('');
  const [partCodeModelFilter, setPartCodeModelFilter] = useState('All');
  const [partCodeCurrentPage, setPartCodeCurrentPage] = useState<number>(1);
  const [partCodePageSize, setPartCodePageSize] = useState<number>(50);

  const [showAddPartCodeModal, setShowAddPartCodeModal] = useState(false);
  const [editingPartCode, setEditingPartCode] = useState<OqcPartCodeItem | null>(null);
  const [partCodeFormCode, setPartCodeFormCode] = useState('');
  const [partCodeFormNameWithColor, setPartCodeFormNameWithColor] = useState('');
  const [partCodeFormModel, setPartCodeFormModel] = useState('');
  const [partCodeFormColor, setPartCodeFormColor] = useState('');
  const [partCodeFormError, setPartCodeFormError] = useState('');

  const [showPastePartCodesModal, setShowPastePartCodesModal] = useState(false);
  const [pastePartCodesText, setPastePartCodesText] = useState('');
  const [pastePartCodesMode, setPastePartCodesMode] = useState<'merge' | 'replace'>('merge');
  const [pastePartCodesError, setPastePartCodesError] = useState('');

  // KCS Realtime Line Station states
  const [kcsSelectedLsx, setKcsSelectedLsx] = useState<string>('All');
  const [kcsSearch, setKcsSearch] = useState('');
  const [kcsStatusFilter, setKcsStatusFilter] = useState<'All' | 'Chưa kiểm tra' | 'Đạt' | 'Lỗi'>('All');
  const [kcsFilterDate, setKcsFilterDate] = useState<string>('All');
  const [kcsFilterMonth, setKcsFilterMonth] = useState<string>('All');
  const [kcsFilterYear, setKcsFilterYear] = useState<string>('All');
  const [isKcsFilterExpanded, setIsKcsFilterExpanded] = useState<boolean>(false);
  const [kcsCurrentPage, setKcsCurrentPage] = useState<number>(1);
  const [showImportLsxModal, setShowImportLsxModal] = useState(false);
  const [lsxImportText, setLsxImportText] = useState('');
  const [lsxImportDefaultLsx, setLsxImportDefaultLsx] = useState('26-10');
  const [lsxImportError, setLsxImportError] = useState('');
  const [showAddCarToLsxModal, setShowAddCarToLsxModal] = useState(false);
  const [newCarLsx, setNewCarLsx] = useState('26-10');
  const [newCarSerialNo, setNewCarSerialNo] = useState('');
  const [newCarPartCode, setNewCarPartCode] = useState('TEM-GEN');
  const [newCarModel, setNewCarModel] = useState('DK Gogo');
  const [newCarColor, setNewCarColor] = useState('Trắng');
  const [oqcImportReplaceAll, setOqcImportReplaceAll] = useState(false);

  // Fast & optimized KCS Station data pipeline (Single Pass O(N) calculation)
  const kcsStationStats = useMemo(() => {
    const isAllLsx = kcsSelectedLsx === 'All';
    const cleanLsx = (kcsSelectedLsx || '26-10').trim();
    const cleanSearch = kcsSearch.trim().toLowerCase();
    const hasSearch = cleanSearch.length > 0;

    let passedCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    const filtered: OQCRecord[] = [];

    for (let i = 0; i < oqcRecords.length; i++) {
      const rawR = oqcRecords[i];
      const override = localOqcOverrides[rawR.id];
      const r = override ? { ...rawR, ...override } : rawR;
      // 1. LSX filter
      if (!isAllLsx && (r.lsx || '26-10').trim() !== cleanLsx) {
        continue;
      }
      // 2. Date/Month/Year filters
      if (kcsFilterDate !== 'All' && (r.date ? standardizeDate(r.date) : '') !== kcsFilterDate) {
        continue;
      }
      if (kcsFilterMonth !== 'All' && String(r.month) !== kcsFilterMonth) {
        continue;
      }
      if (kcsFilterYear !== 'All' && String(r.year) !== kcsFilterYear) {
        continue;
      }
      // 3. Status filter
      if (kcsStatusFilter !== 'All') {
        if (kcsStatusFilter === 'Chưa kiểm tra' && (r.status === 'Đạt' || r.status === 'Lỗi')) continue;
        if (kcsStatusFilter === 'Đạt' && r.status !== 'Đạt') continue;
        if (kcsStatusFilter === 'Lỗi' && r.status !== 'Lỗi') continue;
      }
      // 4. Search text
      if (hasSearch) {
        const matchSerial = (r.serialNo || '').toLowerCase().includes(cleanSearch);
        const matchChassis = (r.chassisNo || '').toLowerCase().includes(cleanSearch);
        const matchEngine = (r.engineNo || '').toLowerCase().includes(cleanSearch);
        const matchModel = (r.model || '').toLowerCase().includes(cleanSearch);
        const matchColor = (r.color || '').toLowerCase().includes(cleanSearch);
        const matchDefect = (r.defectDetail || '').toLowerCase().includes(cleanSearch);
        const matchLsx = (r.lsx || '').toLowerCase().includes(cleanSearch);
        if (!matchSerial && !matchChassis && !matchEngine && !matchModel && !matchColor && !matchDefect && !matchLsx) {
          continue;
        }
      }

      // Single-pass count
      if (r.status === 'Đạt') {
        passedCount++;
      } else if (r.status === 'Lỗi') {
        failedCount++;
      } else {
        pendingCount++;
      }

      filtered.push(r);
    }

    // Fast natural sort for serial numbers
    filtered.sort((a, b) => {
      const sA = (a.serialNo || a.id || '').trim();
      const sB = (b.serialNo || b.id || '').trim();
      if (sA === sB) return 0;
      return sA < sB ? -1 : 1;
    });

    const totalCars = filtered.length;
    const yieldRate = totalCars > 0 ? Math.round((passedCount / totalCars) * 100) : 100;

    return {
      displayRecords: filtered,
      totalCars,
      passedCars: passedCount,
      failedCars: failedCount,
      pendingCars: pendingCount,
      yieldRate
    };
  }, [oqcRecords, localOqcOverrides, kcsSelectedLsx, kcsFilterDate, kcsFilterMonth, kcsFilterYear, kcsStatusFilter, kcsSearch]);

  // Finished Goods Handover (Báo phẩm bàn giao kho) states
  const [handoverScanInput, setHandoverScanInput] = useState('');
  const [showPasteHandoverModal, setShowPasteHandoverModal] = useState(false);
  const [editingHandoverItem, setEditingHandoverItem] = useState<any | null>(null);
  const [handoverPasteText, setHandoverPasteText] = useState('');
  const [handoverFilterDate, setHandoverFilterDate] = useState('All');
  const [handoverFilterModel, setHandoverFilterModel] = useState('All');
  const [handoverSearch, setHandoverSearch] = useState('');
  const [handoverScannedList, setHandoverScannedList] = useState<Array<{
    id: string;
    serialNo: string;
    chassisNo?: string;
    engineNo?: string;
    partCode: string;
    model: string;
    color: string;
    lsx: string;
    status: string;
    checkTime: string;
    date: string;
    scannedAt: string;
  }>>(() => {
    if (Array.isArray(oqcHandoverList) && oqcHandoverList.length > 0) {
      return oqcHandoverList;
    }
    try {
      const saved = safeStorage.getItem('dk_oqc_handover_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Keep handoverScannedList synchronized in real-time when other devices scan or cloud updates
  useEffect(() => {
    if (Array.isArray(oqcHandoverList)) {
      setHandoverScannedList(oqcHandoverList);
    }
  }, [oqcHandoverList]);

  const saveHandoverList = (list: any[]) => {
    setHandoverScannedList(list);
    safeStorage.setItem('dk_oqc_handover_list', JSON.stringify(list));
    try {
      localStorage.setItem('dk_oqc_handover_list', JSON.stringify(list));
      localStorage.setItem('dk_oqc_handover_list_is_dirty', 'true');
    } catch (e) {}
    if (setOqcHandoverList) {
      setOqcHandoverList(list);
    }
    if (typeof (window as any).syncToServer === 'function') {
      (window as any).syncToServer('dk_oqc_handover_list', list);
    }
    try {
      window.dispatchEvent(new CustomEvent('dk_handover_updated', { detail: list }));
    } catch (e) {}
  };

  // Distinct dates in scanned handover records for date filtering (Sorted newest first)
  const handoverAvailableDates = useMemo(() => {
    const dates = new Set<string>();
    handoverScannedList.forEach(item => {
      if (item.date) {
        dates.add(standardizeDate(item.date));
      }
    });
    return Array.from(dates).sort((a, b) => {
      const p1 = a.split('/');
      const p2 = b.split('/');
      const d1 = Number(p1[0]) || 1;
      const m1 = Number(p1[1]) || 1;
      const y1 = Number(p1[2]) || 2026;
      const d2 = Number(p2[0]) || 1;
      const m2 = Number(p2[1]) || 1;
      const y2 = Number(p2[2]) || 2026;
      const time1 = new Date(y1, m1 - 1, d1).getTime();
      const time2 = new Date(y2, m2 - 1, d2).getTime();
      return time2 - time1;
    });
  }, [handoverScannedList]);

  const handoverDistinctModels = useMemo(() => {
    return Array.from(new Set(handoverScannedList.map(x => x.model).filter(Boolean))).sort();
  }, [handoverScannedList]);

  const filteredHandoverList = useMemo(() => {
    return handoverScannedList.filter(item => {
      if (handoverFilterDate !== 'All') {
        const itemDate = item.date ? standardizeDate(item.date) : '';
        if (itemDate !== handoverFilterDate) return false;
      }
      if (handoverFilterModel !== 'All' && item.model !== handoverFilterModel) {
        return false;
      }
      if (handoverSearch.trim()) {
        const q = handoverSearch.trim().toLowerCase();
        const matchSerial = (item.serialNo || '').toLowerCase().includes(q);
        const matchChassis = (item.chassisNo || '').toLowerCase().includes(q);
        const matchEngine = (item.engineNo || '').toLowerCase().includes(q);
        const matchModel = (item.model || '').toLowerCase().includes(q);
        const matchColor = (item.color || '').toLowerCase().includes(q);
        const matchLsx = (item.lsx || '').toLowerCase().includes(q);
        const matchPart = (item.partCode || '').toLowerCase().includes(q);
        if (!matchSerial && !matchChassis && !matchEngine && !matchModel && !matchColor && !matchLsx && !matchPart) {
          return false;
        }
      }
      return true;
    });
  }, [handoverScannedList, handoverFilterDate, handoverFilterModel, handoverSearch]);

  const handleExportKcsReportCSV = (
    type: 'weekly' | 'monthly',
    month: number,
    week: string,
    year: number,
    modelFilter: string
  ) => {
    // 1. Filter OQC records for the selected period & model
    const filtered = oqcRecords.filter(r => {
      if (!r.date) return false;
      const info = getWeekAndMonthFromDate(r.date);
      const mMatches = info.month === month;
      const yMatches = info.year === year;
      const wMatches = type === 'weekly' ? info.week === week : true;
      const modelMatches = modelFilter === 'All' || r.model === modelFilter;
      return mMatches && yMatches && wMatches && modelMatches;
    });

    const isWeekly = type === 'weekly';
    const periodLabelText = isWeekly ? `Tuần ${week} - Tháng ${month}/${year}` : `Tháng ${month}/${year}`;
    const filename = `Bao_Cao_KCS_OQC_${isWeekly ? `Tuan_${week}_Thang_${month}` : `Thang_${month}`}_${year}.xlsx`;

    const total = filtered.length;
    const passed = filtered.filter(isOqcRecordPassed).length;
    const failed = total - passed;
    const yieldRate = total > 0 ? Math.round((passed / total) * 100) : 100;

    // Compile model summary
    const modelsMap: Record<string, { total: number; passed: number; failed: number }> = {};
    filtered.forEach(r => {
      const m = r.model || 'Dòng khác';
      if (!modelsMap[m]) modelsMap[m] = { total: 0, passed: 0, failed: 0 };
      modelsMap[m].total += 1;
      if (isOqcRecordPassed(r)) {
        modelsMap[m].passed += 1;
      } else {
        modelsMap[m].failed += 1;
      }
    });

    const aoaData: any[] = [];
    const rowTracker: { type: string }[] = [];
    const merges: any[] = [];

    const addRow = (cells: any[], rType: string) => {
      const row = [...cells];
      while (row.length < 7) {
        row.push("");
      }
      aoaData.push(row);
      rowTracker.push({ type: rType });
      return aoaData.length - 1;
    };

    // Header company & dept
    const r0 = addRow(["CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT"], 'header-company');
    merges.push({ s: { r: r0, c: 0 }, e: { r: r0, c: 6 } });

    const r1 = addRow(["PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL) - DK QMS"], 'header-department');
    merges.push({ s: { r: r1, c: 0 }, e: { r: r1, c: 6 } });

    addRow([], 'spacer');

    // Title
    const r3 = addRow(["BÁO CÁO KIỂM SOÁT CHẤT LƯỢNG THÀNH PHẨM (KCS / OQC)"], 'header-title');
    merges.push({ s: { r: r3, c: 0 }, e: { r: r3, c: 6 } });

    const r4 = addRow([`Chu kỳ: ${periodLabelText}`], 'header-subtitle');
    merges.push({ s: { r: r4, c: 0 }, e: { r: r4, c: 6 } });

    const r5 = addRow([`Ngày lập báo cáo: ${new Date().toLocaleDateString('vi-VN')}`], 'header-date');
    merges.push({ s: { r: r5, c: 0 }, e: { r: r5, c: 6 } });

    addRow([], 'spacer');

    // Section I
    const rI = addRow(["I. SỐ LIỆU CHẤT LƯỢNG TỔNG QUAN"], 'section-header');
    merges.push({ s: { r: rI, c: 0 }, e: { r: rI, c: 6 } });

    addRow(["Chỉ số", "Số lượng", "Tỷ lệ (%)"], 'column-header');
    addRow(["Tổng số xe kiểm tra", total, "100%"], 'data-row');
    addRow(["Số xe Đạt tiêu chuẩn lần 1", passed, `${yieldRate}%`], 'data-row-success');
    addRow(["Số xe phát sinh lỗi (Khuyết tật)", failed, `${100 - yieldRate}%`], 'data-row-danger');

    addRow([], 'spacer');

    // Section II
    const rII = addRow(["II. BÁO CÁO CHẤT LƯỢNG CHI TIẾT THEO DÒNG XE (MODEL)"], 'section-header');
    merges.push({ s: { r: rII, c: 0 }, e: { r: rII, c: 6 } });

    addRow(["Tên dòng xe", "Tổng kiểm tra", "Số xe đạt", "Số xe lỗi", "Tỷ lệ FTR (%)"], 'column-header');
    Object.entries(modelsMap).forEach(([name, stats]) => {
      const rate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 100;
      addRow([name, stats.total, stats.passed, stats.failed, `${rate}%`], 'data-row');
    });

    addRow([], 'spacer');

    // Section III
    const rIII = addRow(["III. PHÂN TÍCH CHUYÊN SÂU TOP 3 LỖI PHỔ BIẾN NHẤT & BIỆN PHÁP CAPA THEO TỪNG DÒNG XE (MODEL)"], 'section-header');
    merges.push({ s: { r: rIII, c: 0 }, e: { r: rIII, c: 6 } });

    addRow([
      "Dòng Xe",
      "Hạng Lỗi",
      "Khuyết Tật / Lỗi",
      "Tần Suất (SL)",
      "Đánh Giá Ảnh Hưởng Chất Lượng",
      "Nhận Định Nguyên Nhân Cốt Lõi",
      "Phương Án Xử Lý Kỹ Thuật & CAPA"
    ], 'column-header');

    const uniqueModels = Array.from(new Set(filtered.map(r => r.model).filter(Boolean))).sort();
    uniqueModels.forEach(mName => {
      const modelRecords = filtered.filter(r => r.model === mName);
      const defectCounts: Record<string, { count: number; rawRecords: any[] }> = {};

      modelRecords.forEach(r => {
        if (r.status === 'Lỗi' && !isOqcRecordPassed(r) && r.defectDetail) {
          const parts = r.defectDetail.split(/[,;+\n]/).map(x => x.trim()).filter(Boolean);
          parts.forEach(p => {
            const formattedName = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
            if (!defectCounts[formattedName]) {
              defectCounts[formattedName] = { count: 0, rawRecords: [] };
            }
            defectCounts[formattedName].count += (r.failedCount || 1);
            defectCounts[formattedName].rawRecords.push(r);
          });
        }
      });

      const top3ForModel = Object.entries(defectCounts)
        .map(([text, data]) => {
          const firstWithDetails = data.rawRecords.find(x => x.evaluation || x.rootCause || x.treatment);
          const cleanText = text.toLowerCase();
          
          let defaultImpact = 'Suy giảm chất lượng ngoại quan hoặc hiệu suất vận hành lắp ráp.';
          let defaultRoot = 'Công nhân thao tác chưa đúng dải lực thiết lập tiêu chuẩn.';
          let defaultTreatment = 'Yêu cầu hiệu chuẩn gá định vị định kỳ và đào tạo kỹ năng SOP.';
          
          if (cleanText.includes('bms') || cleanText.includes('sụt áp') || cleanText.includes('nguồn')) {
            defaultImpact = 'Nguy cơ sụt áp đột ngột gây tắt máy giữa hành trình lên dốc, đe dọa an toàn tính mạng nghiêm trọng.';
            defaultRoot = 'Cơ cấu chân giắc lỏng lẻo phát sinh hồ quang điện, hoặc bong mối hàn bảo vệ rơ-le BMS do buồng sấy nhiệt vượt quá 65°C.';
            defaultTreatment = 'Gia tăng lực kẹp chốt bảo vệ đầu giắc, khống chế nhiệt độ lò sấy dán tem tối đa 60°C và áp dụng keo bảo vệ chuyên dụng.';
          } else if (cleanText.includes('tem') || cleanText.includes('lệch')) {
            defaultImpact = 'Mất mỹ quan bề mặt thành phẩm cao cấp, ảnh hưởng trực tiếp đến hình ảnh dán tem chính hãng dán của DKBike.';
            defaultRoot = 'Cữ gá dán tem định vị thủ công bị rơ lỏng mài mòn dải chặn căn mép.';
            defaultTreatment = 'Chấn chỉnh và thay thế cữ định vị chặn dán cơ khí mới, bổ sung thước laser định hướng dán tem chuẩn chỉ.';
          } else if (cleanText.includes('phanh') || cleanText.includes('bó cứng') || cleanText.includes('bó')) {
            defaultImpact = 'Kẹt phanh bó đĩa tăng sinh nhiệt ma sát cao, làm mòn má đĩa phanh nhanh và tiêu hao năng lượng pin lớn.';
            defaultRoot = 'Hành trình tay bóp phanh xiết quá mức dải tự do hành trình tay, pittông xilanh kẹt bẩn dầu thủy lực hồi trễ.';
            defaultTreatment = 'Căn chỉnh khe hở má phanh và dải bóp phanh tự do đạt 10-15mm tiêu chuẩn, xả gió bọt khí đường ống phanh dầu.';
          }

          return {
            text,
            count: data.count,
            evaluation: firstWithDetails?.evaluation || defaultImpact,
            rootCause: firstWithDetails?.rootCause || defaultRoot,
            treatment: firstWithDetails?.treatment || defaultTreatment
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      if (top3ForModel.length > 0) {
        top3ForModel.forEach((item, idx) => {
          addRow([
            mName,
            `#${idx + 1}`,
            item.text,
            `${item.count} xe`,
            item.evaluation,
            item.rootCause,
            item.treatment
          ], 'data-row');
        });
      } else {
        addRow([mName, "-", "Không có lỗi ghi nhận", "0 xe", "-", "-", "-"], 'data-row');
      }
    });

    const wb = XLSXStyle.utils.book_new();
    const ws = XLSXStyle.utils.aoa_to_sheet(aoaData);

    const styleSheet = (wsTarget: any, trackerList: any[]) => {
      const decodedRange = XLSXStyle.utils.decode_range(wsTarget['!ref'] || 'A1:A1');
      const totalRows = decodedRange.e.r + 1;
      const totalCols = decodedRange.e.c + 1;

      const borderThinGray = { style: "thin", color: { rgb: "E2E8F0" } };
      const borderMediumGray = { style: "medium", color: { rgb: "94A3B8" } };
      const cellBordersNormal = {
        top: borderThinGray, bottom: borderThinGray,
        left: borderThinGray, right: borderThinGray
      };

      for (let r = 0; r < totalRows; r++) {
        const tracker = trackerList[r];
        const rType = tracker?.type;

        for (let c = 0; c < totalCols; c++) {
          const cellRef = XLSXStyle.utils.encode_cell({ r, c });
          let cell = wsTarget[cellRef];
          if (!cell) {
            cell = wsTarget[cellRef] = { t: 's', v: '' };
          }

          // Default styling
          cell.s = {
            font: { name: "Segoe UI", sz: 10, color: { rgb: "334155" } },
            alignment: { vertical: "center", wrapText: true }
          };

          if (rType === 'header-company') {
            cell.s = {
              font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "1E3A8A" } },
              alignment: { horizontal: "left", vertical: "center" }
            };
          } else if (rType === 'header-department') {
            cell.s = {
              font: { name: "Segoe UI", sz: 9.5, italic: true, color: { rgb: "475569" } },
              alignment: { horizontal: "left", vertical: "center" }
            };
          } else if (rType === 'header-title') {
            cell.s = {
              font: { name: "Segoe UI", sz: 14, bold: true, color: { rgb: "1E3A8A" } },
              alignment: { horizontal: "center", vertical: "center" }
            };
          } else if (rType === 'header-subtitle') {
            cell.s = {
              font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "475569" } },
              alignment: { horizontal: "center", vertical: "center" }
            };
          } else if (rType === 'header-date') {
            cell.s = {
              font: { name: "Segoe UI", sz: 9.5, italic: true, color: { rgb: "64748B" } },
              alignment: { horizontal: "center", vertical: "center" }
            };
          } else if (rType === 'section-header') {
            cell.s = {
              fill: { fgColor: { rgb: "F1F5F9" } },
              font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "1E3A8A" } },
              alignment: { horizontal: "left", vertical: "center" },
              border: { bottom: borderMediumGray, top: borderThinGray }
            };
          } else if (rType === 'column-header') {
            cell.s = {
              fill: { fgColor: { rgb: "1E3A8A" } },
              font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
              alignment: { horizontal: "center", vertical: "center", wrapText: true },
              border: cellBordersNormal
            };
          } else if (rType === 'data-row') {
            cell.s = {
              font: { name: "Segoe UI", sz: 10, color: { rgb: "334155" } },
              alignment: { 
                horizontal: c === 0 || c >= 4 ? "left" : "center", 
                vertical: "center",
                wrapText: true 
              },
              border: cellBordersNormal
            };
          } else if (rType === 'data-row-success') {
            cell.s = {
              fill: { fgColor: { rgb: "ECFDF5" } },
              font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "047857" } },
              alignment: { horizontal: c === 0 ? "left" : "center", vertical: "center" },
              border: cellBordersNormal
            };
          } else if (rType === 'data-row-danger') {
            cell.s = {
              fill: { fgColor: { rgb: "FCE8E6" } },
              font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "A51D24" } },
              alignment: { horizontal: c === 0 ? "left" : "center", vertical: "center" },
              border: cellBordersNormal
            };
          }
        }
      }
    };

    styleSheet(ws, rowTracker);
    ws['!merges'] = merges;

    // Set row heights
    const heights: any[] = [];
    rowTracker.forEach((tracker) => {
      const typeStr = tracker.type;
      if (typeStr === 'header-company') heights.push({ hpt: 24 });
      else if (typeStr === 'header-department') heights.push({ hpt: 18 });
      else if (typeStr === 'header-title') heights.push({ hpt: 30 });
      else if (typeStr === 'header-subtitle') heights.push({ hpt: 18 });
      else if (typeStr === 'header-date') heights.push({ hpt: 18 });
      else if (typeStr === 'section-header') heights.push({ hpt: 24 });
      else if (typeStr === 'column-header') heights.push({ hpt: 24 });
      else if (typeStr === 'data-row' || typeStr === 'data-row-success' || typeStr === 'data-row-danger') {
        heights.push({ hpt: 22 });
      } else {
        heights.push({ hpt: 12 });
      }
    });
    ws['!rows'] = heights;

    // Set column widths
    ws['!cols'] = [
      { wch: 18 }, // Dòng Xe
      { wch: 10 }, // Hạng Lỗi
      { wch: 25 }, // Khuyết tật
      { wch: 12 }, // Tần suất
      { wch: 35 }, // Đánh giá
      { wch: 40 }, // Nguyên nhân
      { wch: 45 }  // Phương án CAPA
    ];

    XLSXStyle.utils.book_append_sheet(wb, ws, "Báo cáo OQC");
    XLSXStyle.writeFile(wb, filename);
  };

  // Local form states for Ecount API
  const [configComCode, setConfigComCode] = useState("DKBIKE_CORP");
  const [configUserId, setConfigUserId] = useState("thaonguyen_qc");
  const [configApiKey, setConfigApiKey] = useState("ecount_demo_key_951f496d0acb");
  const [configZone, setConfigZone] = useState("ia");
  const [configEnabled, setConfigEnabled] = useState(true);
  const [configSimulation, setConfigSimulation] = useState(true);
  const [configInterval, setConfigInterval] = useState("30");

  React.useEffect(() => {
    if (showEcountSyncModal) {
      setConfigComCode(ecountConfig.comCode);
      setConfigUserId(ecountConfig.userId);
      setConfigApiKey(ecountConfig.apiKey);
      setConfigZone(ecountConfig.zoneCode ?? "ia");
      setConfigEnabled(ecountConfig.enabled);
      setConfigSimulation(ecountConfig.isSimulation);
      setConfigInterval(ecountConfig.syncInterval ?? "30");
    }
  }, [showEcountSyncModal, ecountConfig]);

  // Synchronized Master Model Names
  const modelNames = React.useMemo(() => {
    return models && models.length > 0 
      ? models.map((m: any) => m.name) 
      : ['DK D2', 'DK EZ3', 'DK Gogo Smart', 'DK Nova', 'DK Roma SX V2', 'DK S3', 'DK V1', 'DK V2'];
  }, [models]);

  // New IQC Form State
  const [newIqcSupplierId, setNewIqcSupplierId] = useState('');
  const [newIqcContent, setNewIqcContent] = useState('');
  const [newIqcTotalQty, setNewIqcTotalQty] = useState(1000);
  const [newIqcAqlLevel, setNewIqcAqlLevel] = useState<AQLLevel>(1.5);
  const [newIqcInspectionLevel, setNewIqcInspectionLevel] = useState<InspectionLevel>('II');
  const [newIqcCheckedQty, setNewIqcCheckedQty] = useState(() => calculateAQLSample(1000, 0, 1.5, 'II').sampleSize);
  const [newIqcFailedQty, setNewIqcFailedQty] = useState(0);
  const [newIqcCheckedBy, setNewIqcCheckedBy] = useState('Đoàn Anh Hùng');
  const [newIqcItemSummary, setNewIqcItemSummary] = useState('');
  const [newIqcResult, setNewIqcResult] = useState<'Đạt' | 'Lỗi'>('Đạt');
  const [newIqcDefectDetail, setNewIqcDefectDetail] = useState('');
  const [newIqcDate, setNewIqcDate] = useState(() => {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  });
  const [newIqcImageUrl, setNewIqcImageUrl] = useState('');
  const [newIqcImageUrls, setNewIqcImageUrls] = useState<string[]>([]);

  // AQL Interactive Quick Calculator Tool State
  const [showAqlCalculator, setShowAqlCalculator] = useState(false);
  const [calcAqlLotSize, setCalcAqlLotSize] = useState<number>(1000);
  const [calcAqlLevel, setCalcAqlLevel] = useState<AQLLevel>(1.5);
  const [calcAqlInspectionLevel, setCalcAqlInspectionLevel] = useState<InspectionLevel>('II');

  // New PQC Form State
  const [newPqcLsx, setNewPqcLsx] = useState('26-90');
  const [newPqcModel, setNewPqcModel] = useState('DK Roma SX V2');
  const [newPqcDate, setNewPqcDate] = useState(() => {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  });
  const [newPqcQty, setNewPqcQty] = useState(100);
  const [newPqcCheckedBy, setNewPqcCheckedBy] = useState('Nguyễn Xuân Thao');
  const [newPqcFindings, setNewPqcFindings] = useState('');
  const [newPqcStatus, setNewPqcStatus] = useState<'Đang cải tiến' | 'Đã cải tiến' | 'Đạt hoàn toàn'>('Đang cải tiến');
  const [newPqcImageUrl, setNewPqcImageUrl] = useState('');
  const [newPqcImageUrls, setNewPqcImageUrls] = useState<string[]>([]);

  // New OQC Form State
  const [newOqcPartCode, setNewOqcPartCode] = useState('TEMDV11202');
  const [newOqcSerialNo, setNewOqcSerialNo] = useState('');
  const [newOqcModel, setNewOqcModel] = useState('DK Roma SX V2');
  const [newOqcColor, setNewOqcColor] = useState('Đen khói');
  const [newOqcStatus, setNewOqcStatus] = useState<'Đạt' | 'Lỗi' | 'Chưa kiểm tra'>('Đạt');
  const [newOqcDefectDetail, setNewOqcDefectDetail] = useState('');
  const [newOqcFailedCount, setNewOqcFailedCount] = useState(0);
  const [newOqcRootCause, setNewOqcRootCause] = useState('');
  const [newOqcLsx, setNewOqcLsx] = useState('26-15');
  const [newOqcCheckTime, setNewOqcCheckTime] = useState('14:30');
  const [newOqcDate, setNewOqcDate] = useState(() => {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  });
  const [newOqcCheckedBy, setNewOqcCheckedBy] = useState('Liễu Tùng Lâm');
  const [newOqcImageUrl, setNewOqcImageUrl] = useState('');
  const [newOqcEvaluation, setNewOqcEvaluation] = useState('');
  const [newOqcTreatment, setNewOqcTreatment] = useState('');

  // Sực dỡ đồng bộ hóa ban đầu với Master Models
  React.useEffect(() => {
    if (modelNames && modelNames.length > 0) {
      if (!modelNames.includes(newPqcModel)) {
        setNewPqcModel(modelNames[0]);
      }
      if (!modelNames.includes(newOqcModel)) {
        setNewOqcModel(modelNames[4] || modelNames[0]);
      }
    }
  }, [modelNames]);

  // Fetch Ecount ERP integration configuration on mount
  React.useEffect(() => {
    fetch('/api/ecount/config')
      .then(res => res.json())
      .then(data => {
        if (data && data.comCode) {
          setEcountConfig(data);
        }
      })
      .catch(err => console.error("Error fetching Ecount integration config on mount:", err));
  }, []);

  // Mặc định không chạy quét tự động ngầm để tránh gây loạn giao diện và giật lag cho người dùng.
  // Đồng bộ hoàn toàn chủ động bằng nút bấm tích hợp thủ công.

  const renderImageUploadField = (
    imageUrl: string,
    setImageUrl: (url: string) => void,
    labelText: string = "Hình ảnh minh họa"
  ) => {
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          // Tự động nén ảnh xuống tối đa 800px và mức chất lượng 0.5 để tiết kiệm tối đa bộ nhớ & băng thông đám mây
          const compressed = await compressImageFile(file, 800, 800, 0.5);
          if (compressed) {
            setImageUrl(compressed);
          } else {
            // fallback
            const reader = new FileReader();
            reader.onloadend = () => {
              setImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
          }
        } catch (err) {
          console.error("[Image Compression Error]:", err);
          const reader = new FileReader();
          reader.onloadend = () => {
            setImageUrl(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    };

    const clearImage = () => {
      setImageUrl('');
    };

    return (
      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">{labelText}</label>
        
        {imageUrl ? (
          <div className="relative border border-slate-200 rounded p-2 bg-slate-50 flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <img src={imageUrl} alt="Preview" className="w-10 h-10 object-cover rounded border border-slate-350 shadow-sm" />
              <span className="text-[10px] text-slate-500 font-bold max-w-[200px] truncate">✓ Đã đính kèm ảnh minh họa</span>
            </div>
            <button
              type="button"
              onClick={clearImage}
              className="text-red-500 hover:text-red-700 text-[10px] font-black uppercase px-2 py-1 rounded hover:bg-red-50"
            >
              Gỡ bỏ
            </button>
          </div>
        ) : (
          <div className="border border-dashed border-slate-300 hover:border-indigo-500 rounded p-4 bg-slate-50/50 flex flex-col items-center justify-center text-center transition cursor-pointer relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Kéo thả hoặc Click chọn tệp ảnh minh hoạ"
            />
            <Upload className="w-5 h-5 text-slate-400 mb-1" />
            <p className="text-[10px] font-bold text-slate-500">Đính kèm ảnh khuyết điểm lỗi</p>
            <p className="text-[9px] text-slate-400">Click chọn hoặc kéo thả tệp tại đây (JPEG, PNG dưới 2MB)</p>
          </div>
        )}
      </div>
    );
  };

  // handlers
  const handleCreateSupplierAuditRequest = (e: FormEvent) => {
    e.preventDefault();
    if (!newAuditComponentName.trim()) {
      alert('Vui lòng nhập tên linh kiện cần giám sát!');
      return;
    }
    if (!newAuditSpec.trim()) {
      alert('Vui lòng nhập chỉ tiêu / thông số kỹ thuật yêu cầu!');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const linkedLog = dailyLogs.find(log => log.stt === newAuditLinkedDailyLogStt);
    const newAudit: SupplierProductionAudit = {
      id: `SPA-${Date.now().toString().slice(-4)}`,
      supplierName: newAuditSupplierName,
      componentName: newAuditComponentName,
      requestDate: today,
      targetSpecification: newAuditSpec,
      requirementType: newAuditReqType,
      status: 'pending',
      supplierNote: newAuditNote || '',
      checkedBy: 'Mr. Thao',
      dailyLogStt: newAuditLinkedDailyLogStt,
      dailyLogTitle: linkedLog ? linkedLog.content : undefined
    };
    setSupplierProductionAudits([newAudit, ...supplierProductionAudits]);
    setShowAddSupplierAuditModal(false);
    setNewAuditComponentName('');
    setNewAuditSpec('');
    setNewAuditNote('');
    setNewAuditLinkedDailyLogStt(undefined);
  };

  const handleSupplierSubmitResponseSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!supplierResponseAudit) return;
    
    const updated = supplierProductionAudits.map(aud => {
      if (aud.id === supplierResponseAudit.id) {
        return {
          ...aud,
          status: 'updated' as const,
          actualValueStr: responseValueStr,
          imageUrl: responseImageUrl || "",
          supplierNote: responseSupplierNote
        };
      }
      return aud;
    });
    setSupplierProductionAudits(updated);
    setSupplierResponseAudit(null);
    setResponseValueStr('');
    setResponseImageUrl('');
    setResponseSupplierNote('');

    const found = updated.find(a => a.id === supplierResponseAudit.id);
    if (found && selectedSupplierAuditForDetail?.id === supplierResponseAudit.id) {
      setSelectedSupplierAuditForDetail(found);
    }
  };

  const handleDkAuditEvaluationSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!evaluateAudit) return;
    
    const updated = supplierProductionAudits.map(aud => {
      if (aud.id === evaluateAudit.id) {
        return {
          ...aud,
          status: evalStatus,
          dkNote: evalDkNote
        };
      }
      return aud;
    });
    setSupplierProductionAudits(updated);
    setEvaluateAudit(null);
    setEvalDkNote('');

    const found = updated.find(a => a.id === evaluateAudit.id);
    if (found && selectedSupplierAuditForDetail?.id === evaluateAudit.id) {
      setSelectedSupplierAuditForDetail(found);
    }
  };
  const handleAddIqcRecord = (e: FormEvent) => {
    e.preventDefault();
    if (!newIqcContent.trim()) {
      alert('Vui lòng nhập nội dung phiếu nhập kiểm!');
      return;
    }
    const targetId = newIqcSupplierId || suppliers[0]?.id || 'NCC00174';
    const selectedSup = suppliers.find(s => s.id === targetId);
    const newRecord: IQCRecord = {
      id: `IQC-${Date.now().toString().slice(-4)}`,
      date: newIqcDate,
      supplierId: targetId,
      supplierName: selectedSup?.name || 'Công ty Cao Su KENDA Việt Nam',
      content: newIqcContent,
      totalQty: Number(newIqcTotalQty),
      checkedQty: Number(newIqcCheckedQty),
      checkedBy: newIqcCheckedBy,
      failedQty: Number(newIqcFailedQty),
      defectRate: Number(newIqcTotalQty) > 0 ? Number(((Number(newIqcFailedQty) / Number(newIqcTotalQty)) * 100).toFixed(2)) : 0,
      itemSummary: newIqcItemSummary || newIqcContent,
      result: Number(newIqcFailedQty) > 0 ? 'Lỗi' : 'Đạt',
      defectDetail: newIqcDefectDetail,
      imageUrl: newIqcImageUrls[0] || '',
      imageUrls: newIqcImageUrls
    };
    setIqcRecords([newRecord, ...iqcRecords]);
    setShowAddIqcModal(false);
    setNewIqcContent('');
    setNewIqcSupplierId('');
    setNewIqcTotalQty(1000);
    setNewIqcCheckedQty(calculateAQLSample(1000, 0, newIqcAqlLevel, newIqcInspectionLevel).sampleSize);
    setNewIqcFailedQty(0);
    setNewIqcItemSummary('');
    setNewIqcDefectDetail('');
    setNewIqcImageUrl('');
    setNewIqcImageUrls([]);
    alert('Thêm bản ghi kiểm nhập IQC thành công!');
  };

  const parsePastedEcountText = (text: string): EcountRow[] => {
    if (!text.trim()) return [];
    const lines = text.split('\n');
    const rows: EcountRow[] = [];
    
    // Dynamic column index map with original fallbacks
    let colIndices = {
      date: 0,
      supplierCode: 1,
      supplierName: 2,
      content: 3,
      quantity: 4,
      amountText: 5,
      locationCode: 6,
      locationName: 7,
      picName: 9,
      itemSummary: -1
    };

    let hasParsedHeader = false;

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx].trim();
      if (!line) continue;
      
      const cols = line.includes('\t') ? line.split('\t') : line.split(',');
      
      const isHeader = cols.some(c => {
        const cl = c.toLowerCase();
        return cl.includes('ngày') || cl.includes('nhà cung cấp') || cl.includes('nội dung') || cl.includes('tên mặt hàng') || cl.includes('tóm tắt');
      });

      if (isHeader) {
        cols.forEach((col, cIdx) => {
          const cl = col.toLowerCase().trim();
          if (cl.includes('ngày') || cl.includes('date')) colIndices.date = cIdx;
          else if (cl.includes('mã khách') || cl.includes('mã nhà cung') || cl.includes('mã ncc') || cl.includes('supplier code') || (cl.includes('mã') && cl.includes('cung cấp'))) colIndices.supplierCode = cIdx;
          else if (cl.includes('nhà cung cấp') || cl.includes('supplier name') || cl === 'ncc') colIndices.supplierName = cIdx;
          else if (cl === 'nội dung' || cl === 'content' || cl.includes('nội dung')) colIndices.content = cIdx;
          else if (cl.includes('số lượng') || cl.includes('quantity') || cl === 'qty') colIndices.quantity = cIdx;
          else if (cl.includes('số tiền') || cl.includes('amount')) colIndices.amountText = cIdx;
          else if (cl.includes('mã địa điểm') || cl.includes('location code')) colIndices.locationCode = cIdx;
          else if (cl.includes('tên địa điểm') || cl.includes('location name')) colIndices.locationName = cIdx;
          else if (cl.includes('tên người phụ trách') || cl.includes('người phụ trách') || cl.includes('pic')) colIndices.picName = cIdx;
          else if (cl.includes('tên mặt hàng') || cl.includes('tóm tắt') || cl.includes('mặt hàng')) colIndices.itemSummary = cIdx;
        });
        hasParsedHeader = true;
        continue;
      }
      
      if (cols.length < 3) continue;
      
      const rawDate = cols[colIndices.date]?.trim() || '';
      const cleanDate = rawDate.split(' ')[0] || rawDate;
      const supplierCode = cols[colIndices.supplierCode]?.trim() || '';
      const supplierName = cols[colIndices.supplierName]?.trim() || '';
      const content = cols[colIndices.content]?.trim() || '';
      
      let rawQtyStr = cols[colIndices.quantity]?.trim() || '1';
      rawQtyStr = rawQtyStr.replace(/,/g, '').replace(/\.00$/, '');
      const quantity = parseInt(rawQtyStr) || 1;
      
      const amountText = cols[colIndices.amountText]?.trim() || '';
      const locationCode = cols[colIndices.locationCode]?.trim() || '';
      const locationName = cols[colIndices.locationName]?.trim() || '';
      const picName = cols[colIndices.picName]?.trim() || '';
      const itemSummary = colIndices.itemSummary !== -1 ? cols[colIndices.itemSummary]?.trim() || '' : '';
      
      const absQty = Math.abs(quantity);
      const sampleQty = absQty > 0 ? calculateAQLSample(absQty, 0, 1.5, 'II').sampleSize : 1;
      
      rows.push({
        date: cleanDate,
        supplierCode,
        supplierName,
        content,
        quantity,
        amountText,
        locationCode,
        locationName,
        picName,
        itemSummary,
        checked: absQty > 0,
        sampleQty,
        failedQty: 0,
        defectDetail: ''
      });
    }
    return rows;
  };

  const handleEcountPasteChange = (val: string) => {
    setEcountPasteText(val);
    try {
      const parsed = parsePastedEcountText(val);
      setEcountPasteRows(parsed);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncEcountToIqc = (targetRows: EcountRow[]) => {
    const selected = targetRows.filter(r => r.checked);
    if (selected.length === 0) {
      alert("Vui lòng chọn ít nhất một lô hàng (đánh dấu tích chọn bên trái) để đồng bộ!");
      return;
    }

    const newRecords: IQCRecord[] = selected.map((row, index) => {
      const matchedSup = suppliers.find(s => 
        (s.id || '').toUpperCase() === (row.supplierCode || '').toUpperCase() || 
        (s.name || '').toLowerCase().includes((row.supplierName || '').toLowerCase()) ||
        (row.supplierName || '').toLowerCase().includes((s.name || '').toLowerCase())
      );
      const finalSupplierId = matchedSup ? matchedSup.id : (row.supplierCode || `NCC${Math.floor(10000 + Math.random() * 90000)}`);
      const finalSupplierName = matchedSup ? matchedSup.name : row.supplierName;

      const totalQty = Math.max(1, Math.abs(row.quantity));
      const checkedQty = Number(row.sampleQty) || calculateAQLSample(totalQty, Number(row.failedQty) || 0, 1.5, 'II').sampleSize;
      const failedQty = Number(row.failedQty) || 0;
      const defectRate = checkedQty > 0 ? Number(((failedQty / checkedQty) * 100).toFixed(2)) : 0;
      const result = failedQty > 0 ? 'Lỗi' : 'Đạt';

      return {
        id: `IQC-EC-${Date.now().toString().slice(-4)}${index}`,
        date: row.date,
        supplierId: finalSupplierId,
        supplierName: finalSupplierName,
        content: row.content,
        totalQty,
        checkedQty,
        checkedBy: (row.picName || 'Trưởng nhóm IQC').replace(/\./g, '').trim(),
        failedQty,
        defectRate,
        itemSummary: row.itemSummary || row.content,
        result,
        defectDetail: row.defectDetail || '',
        imageUrl: ''
      };
    });

    setIqcRecords([...newRecords, ...iqcRecords]);
    setShowEcountSyncModal(false);
    
    // Reset paste state
    setEcountPasteText('');
    setEcountPasteRows([]);
    // Reset checked preloaded state
    setEcountDataList(ECOUNT_PRELOADED_DATA.map(item => ({ ...item })));

    alert(`🎉 Đã đồng bộ thành công ${newRecords.length} phiếu kiểm nhập IQC từ Ecount.com vào kho dữ liệu quy trình!`);
  };

  const handleImportIqcSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIqcImportError('');
    if (!iqcImportText.trim()) {
      setIqcImportError('Vui lòng dán dữ liệu kiểm nhập IQC!');
      return;
    }

    try {
      const lines = iqcImportText.split('\n');
      const parsedRecords: IQCRecord[] = [];
      let skippedCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by tab or comma
        const cols = line.includes('\t') ? line.split('\t') : line.split(',');

        // Detect and skip headers
        if (i === 0 && (
          cols[0].toLowerCase().includes('ngày') || 
          cols[0].toLowerCase().includes('date') || 
          cols[1]?.toLowerCase().includes('nhà cung cấp') || 
          cols[1]?.toLowerCase().includes('supplier')
        )) {
          skippedCount++;
          continue;
        }

        if (cols.length < 3) {
          skippedCount++;
          continue;
        }

        const dateVal = cols[0]?.trim() || '23/05/2026';
        const supplierNameVal = cols[1]?.trim() || 'Công ty Cao Su KENDA Việt Nam';
        const contentVal = cols[2]?.trim() || 'Linh kiện xe điện';
        const totalQtyVal = Number(cols[3]?.trim()) || 1000;
        const failedQtyVal = Number(cols[5]?.trim()) || 0;
        const checkedQtyVal = Number(cols[4]?.trim()) || calculateAQLSample(totalQtyVal, failedQtyVal, 1.5, 'II').sampleSize;
        const checkedByVal = cols[6]?.trim() || 'Đoàn Anh Hùng';
        const defectDetailVal = cols[7]?.trim() || '';
        const itemSummaryVal = cols[8]?.trim() || contentVal;

        const defectRateVal = totalQtyVal > 0 ? Number(((failedQtyVal / totalQtyVal) * 100).toFixed(2)) : 0;
        const resultVal = failedQtyVal > 0 ? 'Lỗi' : 'Đạt';

        // Match supplier from master list to avoid unmatched names or IDs
        const matchedSupplier = suppliers.find(s => 
          s.name.toLowerCase().replace(/[\s,.-]/g, '') === supplierNameVal.toLowerCase().replace(/[\s,.-]/g, '') ||
          s.name.toLowerCase().includes(supplierNameVal.toLowerCase()) || 
          supplierNameVal.toLowerCase().includes(s.name.toLowerCase()) ||
          s.id.toLowerCase() === supplierNameVal.toLowerCase()
        );

        const finalSupplierId = matchedSupplier ? matchedSupplier.id : (suppliers[0]?.id || 'NCC00174');
        const finalSupplierName = matchedSupplier ? matchedSupplier.name : supplierNameVal;

        parsedRecords.push({
          id: `IQC-${Date.now().toString().slice(-4)}${i}`,
          date: dateVal,
          supplierId: finalSupplierId,
          supplierName: finalSupplierName,
          content: contentVal,
          totalQty: totalQtyVal,
          checkedQty: checkedQtyVal,
          checkedBy: checkedByVal,
          failedQty: failedQtyVal,
          defectRate: defectRateVal,
          itemSummary: itemSummaryVal,
          result: resultVal,
          defectDetail: defectDetailVal
        });
      }

      if (parsedRecords.length === 0) {
        setIqcImportError('Không tìm thấy bản ghi hợp lệ nào! Vui lòng kiểm tra định dạng dán.');
        return;
      }

      setIqcRecords([...parsedRecords, ...iqcRecords]);
      setIqcImportText('');
      setShowImportIqcModal(false);
      alert(`Nhập thành công ${parsedRecords.length} phiếu IQC nhập kiểm đầu vào! (Bỏ qua: ${skippedCount} dòng)`);
    } catch (err: any) {
      setIqcImportError(`Lỗi phân rã dữ liệu: ${err.message || err}`);
    }
  };

  const handleEditIqcClick = (record: IQCRecord) => {
    setEditingIqcRecord({ ...record });
    setShowEditIqcModal(true);
  };

  const handleSaveEditIqc = (e: FormEvent) => {
    e.preventDefault();
    if (!editingIqcRecord) return;
    
    // Recalculate result & rate
    const totalQty = Number(editingIqcRecord.totalQty);
    const failedQty = Number(editingIqcRecord.failedQty);
    const defectRate = totalQty > 0 ? Number(((failedQty / totalQty) * 100).toFixed(2)) : 0;
    const result = failedQty > 0 ? 'Lỗi' : 'Đạt';

    const updated = {
      ...editingIqcRecord,
      totalQty,
      checkedQty: Number(editingIqcRecord.checkedQty),
      failedQty,
      defectRate,
      result
    };

    setIqcRecords(iqcRecords.map(r => r.id === updated.id ? updated : r));
    setShowEditIqcModal(false);
    setEditingIqcRecord(null);
    alert('Cập nhật phiếu nhập kiểm IQC thành công!');
  };

  const handleDeleteIqcClick = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phiếu kiểm nhập IQC này không? Hành động này không thể khôi phục.')) {
      trackDeletedId('dk_iqc_records', id);
      const updated = iqcRecords.filter(r => r.id !== id);
      setIqcRecords(updated);
      safeStorage.setItem('dk_iqc_records', JSON.stringify(updated));
      try { localStorage.setItem('dk_iqc_records_is_dirty', 'true'); } catch (e) {}
      if (typeof (window as any).syncToServer === 'function') {
        (window as any).syncToServer('dk_iqc_records', updated);
      }
      alert('Đã xóa phiếu kiểm nhập IQC thành công! Hệ thống đang đồng bộ tự động lên Cloud...');
    }
  };

  const handleEditPqcClick = (record: PQCRecord) => {
    setEditingPqcRecord({ ...record });
    setShowEditPqcModal(true);
  };

  const handleSaveEditPqc = (e: FormEvent) => {
    e.preventDefault();
    if (!editingPqcRecord) return;
    if (!editingPqcRecord.findings.trim()) {
      alert('Vui lòng nhập nội dung đánh giá vấn đề công đoạn!');
      return;
    }

    setPqcRecords(pqcRecords.map(r => r.id === editingPqcRecord.id ? editingPqcRecord : r));
    setShowEditPqcModal(false);
    setEditingPqcRecord(null);
    alert('Cập nhật bản ghi kiểm soát công đoạn PQC thành công!');
  };

  const handleDeletePqcClick = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi kiểm soát công đoạn PQC này không? Hành động này không thể khôi phục.')) {
      trackDeletedId('dk_pqc_records', id);
      const updated = pqcRecords.filter(r => r.id !== id);
      setPqcRecords(updated);
      safeStorage.setItem('dk_pqc_records', JSON.stringify(updated));
      try { localStorage.setItem('dk_pqc_records_is_dirty', 'true'); } catch (e) {}
      if (typeof (window as any).syncToServer === 'function') {
        (window as any).syncToServer('dk_pqc_records', updated);
      }
      alert('Đã xóa bản ghi PQC thành công! Hệ thống đang đồng bộ tự động lên Cloud...');
    }
  };

  const handleDeleteOqcClick = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi đóng thùng OQC này không? Hành động này không thể khôi phục.')) {
      trackDeletedId('dk_oqc_records', id);
      const updated = oqcRecords.filter(r => r.id !== id);
      saveOqcRecordsOptimized(updated);
      alert('Đã xóa bản ghi OQC thành công! Hệ thống đang đồng bộ tự động lên Cloud...');
    }
  };

  const handleBulkDeleteIqc = () => {
    if (selectedIqcIds.length === 0) {
      alert('Vui lòng chọn ít nhất một phiếu IQC để xóa!');
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa hàng loạt ${selectedIqcIds.length} phiếu IQC đã chọn không?`)) {
      selectedIqcIds.forEach(id => trackDeletedId('dk_iqc_records', id));
      const updated = iqcRecords.filter(r => !selectedIqcIds.includes(r.id));
      setIqcRecords(updated);
      safeStorage.setItem('dk_iqc_records', JSON.stringify(updated));
      try { localStorage.setItem('dk_iqc_records_is_dirty', 'true'); } catch (e) {}
      if (typeof (window as any).syncToServer === 'function') {
        (window as any).syncToServer('dk_iqc_records', updated);
      }
      setSelectedIqcIds([]);
      alert(`Đã xóa thành công ${selectedIqcIds.length} phiếu IQC! Hệ thống đang đồng bộ tự động lên Cloud...`);
    }
  };

  const handleBulkDeleteOqc = () => {
    if (selectedOqcIds.length === 0) {
      alert('Vui lòng chọn ít nhất một bản ghi OQC để xóa!');
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa hàng loạt ${selectedOqcIds.length} bản ghi OQC đã chọn không?`)) {
      selectedOqcIds.forEach(id => trackDeletedId('dk_oqc_records', id));
      const updated = oqcRecords.filter(r => !selectedOqcIds.includes(r.id));
      saveOqcRecordsOptimized(updated);
      setSelectedOqcIds([]);
      alert(`Đã xóa thành công ${selectedOqcIds.length} bản ghi OQC! Hệ thống đang đồng bộ tự động lên Cloud...`);
    }
  };

  const handleExportIqcCSV = () => {
    const csvHeaders = ["Mã IQC", "Ngày kiểm tra", "Nhà cung cấp", "Nội dung", "Tổng số lượng", "Số lượng kiểm", "Người kiểm", "Số lượng lỗi", "Tỷ lệ lỗi (%)", "Kết quả"];
    const csvContent = iqcRecords.map(r => [
      r.id,
      r.date,
      r.supplierName,
      r.content,
      r.totalQty,
      r.checkedQty,
      r.checkedBy,
      r.failedQty,
      r.defectRate + "%",
      r.result
    ]);
    
    let csvString = "\uFEFF" + [csvHeaders.join(","), ...csvContent.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Bao_cao_IQC_Thang_4_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddPqcRecord = (e: FormEvent) => {
    e.preventDefault();
    if (!newPqcFindings.trim()) {
      alert('Vui lòng nhập nội dung đánh giá vấn đề công đoạn!');
      return;
    }
    const newRecord: PQCRecord = {
      id: `PQC-${Date.now().toString().slice(-4)}`,
      lsx: newPqcLsx,
      model: newPqcModel,
      date: newPqcDate,
      qty: Number(newPqcQty),
      checkedBy: newPqcCheckedBy,
      findings: newPqcFindings,
      status: newPqcStatus,
      imageUrl: newPqcImageUrls[0] || '',
      imageUrls: newPqcImageUrls
    };
    setPqcRecords([newRecord, ...pqcRecords]);
    setShowAddPqcModal(false);
    setNewPqcFindings('');
    setNewPqcQty(100);
    setNewPqcImageUrl('');
    setNewPqcImageUrls([]);
    alert('Thêm bản ghi kiểm soát công đoạn PQC thành công!');
  };

  const handleExportPqcCSV = () => {
    const csvHeaders = ["Mã PQC", "Lệnh sản xuất", "Model", "Ngày kiểm tra", "SLLR xe", "Nhân sự kiểm tra", "Đánh giá vấn đề công đoạn", "Trạng thái"];
    const csvContent = pqcRecords.map(r => [
      r.id,
      r.lsx,
      r.model,
      r.date,
      r.qty,
      r.checkedBy,
      r.findings,
      r.status
    ]);
    
    let csvString = "\uFEFF" + [csvHeaders.join(","), ...csvContent.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Bao_cao_PQC_Lap_rap_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddOqcRecord = (e: FormEvent) => {
    e.preventDefault();
    if (!newOqcSerialNo.trim()) {
      alert('Vui lòng nhập số Sêri!');
      return;
    }
    
    const finalStatus = newOqcStatus;

    const newRecord: OQCRecord & { checkedBy?: string } = {
      id: `OQC-${newOqcSerialNo.trim().toUpperCase().replace(/[\/\s.#$\[\]]/g, '_')}`,
      partCode: newOqcPartCode,
      serialNo: newOqcSerialNo,
      model: newOqcModel,
      color: newOqcColor,
      status: finalStatus,
      defectDetail: newOqcDefectDetail,
      failedCount: finalStatus === 'Đạt' ? 0 : Number(newOqcFailedCount),
      rootCause: newOqcRootCause,
      lsx: newOqcLsx,
      checkTime: newOqcCheckTime,
      date: newOqcDate,
      month: Number(newOqcDate.split('/')[1]) || 5,
      year: Number(newOqcDate.split('/')[2]) || 2026,
      totalLlr: 1,
      checkedBy: newOqcCheckedBy,
      imageUrl: newOqcImageUrl,
      evaluation: newOqcEvaluation,
      treatment: newOqcTreatment
    };

    // Khi nhập tay dữ liệu mới: Tự động gộp các bản ghi trùng lặp
    const existingIndex = oqcRecords.findIndex(r => r.serialNo.trim().toLowerCase() === newOqcSerialNo.trim().toLowerCase());
    if (existingIndex > -1) {
      const updatedOqcRecords = [...oqcRecords];
      const existing = updatedOqcRecords[existingIndex];
      if (newRecord.status === 'Lỗi' || existing.status === 'Lỗi') {
        existing.status = 'Lỗi';
      }
      if (newRecord.defectDetail && newRecord.defectDetail !== existing.defectDetail) {
        existing.defectDetail = existing.defectDetail 
          ? `${existing.defectDetail}, ${newRecord.defectDetail}`
          : newRecord.defectDetail;
      }
      if (newRecord.rootCause && newRecord.rootCause !== existing.rootCause) {
        existing.rootCause = existing.rootCause 
          ? `${existing.rootCause}, ${newRecord.rootCause}`
          : newRecord.rootCause;
      }
      if (newRecord.evaluation && newRecord.evaluation !== existing.evaluation) {
        existing.evaluation = existing.evaluation
          ? `${existing.evaluation}, ${newRecord.evaluation}`
          : newRecord.evaluation;
      }
      if (newRecord.treatment && newRecord.treatment !== existing.treatment) {
        existing.treatment = existing.treatment
          ? `${existing.treatment}, ${newRecord.treatment}`
          : newRecord.treatment;
      }
      existing.failedCount = (existing.failedCount || 0) + (newRecord.failedCount || 0);
      if (newRecord.model) existing.model = newRecord.model;
      if (newRecord.color) existing.color = newRecord.color;
      if (newRecord.lsx) existing.lsx = newRecord.lsx;
      setOqcRecords(updatedOqcRecords);
    } else {
      setOqcRecords([newRecord, ...oqcRecords]);
    }

    setShowAddOqcModal(false);
    setNewOqcSerialNo('');
    setNewOqcDefectDetail('');
    setNewOqcFailedCount(0);
    setNewOqcRootCause('');
    setNewOqcImageUrl('');
    setNewOqcEvaluation('');
    setNewOqcTreatment('');
    alert('Thêm bản ghi kiểm định KCS thành phẩm OQC thành công!');
  };

  const handleStartEditOqc = (record: OQCRecord, groupIds: string[]) => {
    setEditingOqcRecord(record);
    setEditingOqcGroupIds(groupIds);
    setEditOqcStatus(record.status);
    setEditOqcDefectDetail(record.defectDetail || '');
    setEditOqcRootCause(record.rootCause || '');
    setEditOqcEvaluation(record.evaluation || '');
    setEditOqcTreatment(record.treatment || '');
    setShowEditOqcModal(true);
  };

  const handleSaveOqcEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingOqcRecord) return;

    const now = new Date();
    const nowTime = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const nowDate = now.toLocaleDateString('vi-VN');
    const nowMonth = now.getMonth() + 1;
    const nowYear = now.getFullYear();

    const updated = oqcRecords.map(r => {
      if (r.id === editingOqcRecord.id || editingOqcGroupIds.includes(r.id)) {
        return {
          ...r,
          status: editOqcStatus,
          defectDetail: editOqcDefectDetail,
          rootCause: editOqcRootCause,
          evaluation: editOqcEvaluation,
          treatment: editOqcTreatment,
          checkTime: nowTime,
          date: nowDate,
          month: nowMonth,
          year: nowYear
        };
      }
      return r;
    });

    setOqcRecords(updated);
    safeStorage.setItem('dk_oqc_records', JSON.stringify(updated));
    try { localStorage.setItem('dk_oqc_records_is_dirty', 'true'); } catch (e) {}
    if (typeof (window as any).syncToServer === 'function') {
      (window as any).syncToServer('dk_oqc_records', updated);
    }
    setShowEditOqcModal(false);
    setEditingOqcRecord(null);
    setEditingOqcGroupIds([]);
    alert('Cập nhật thông tin & thời gian chỉnh sửa KCS thành công!');
  };

  const handleClearAllOqcData = () => {
    const totalCount = oqcRecords.length;
    if (totalCount === 0) {
      alert('ℹ️ Cơ sở dữ liệu KCS hiện đang trống, không có bản ghi nào để xóa.');
      setShowImportOqcModal(true);
      return;
    }

    const confirmMsg = `⚠️ CẢNH BÁO XÓA TOÀN BỘ DỮ LIỆU KCS:\n\nAnh Thao có chắc chắn muốn XÓA SẠCH TOÀN BỘ ${totalCount.toLocaleString('vi-VN')} xe trong cơ sở dữ liệu KCS không?\n\n• Thao tác này sẽ làm sạch toàn bộ dữ liệu trên thiết bị và đồng bộ làm sạch lên Cloud Firebase.\n• Sau khi xóa, anh Thao có thể nạp ngay bộ dữ liệu Excel mới tinh.`;
    
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setOqcRecords([]);
    safeStorage.setItem('dk_oqc_records', JSON.stringify([]));
    try {
      localStorage.setItem('dk_oqc_records_is_dirty', 'true');
    } catch (e) {}

    if (typeof (window as any).syncToServer === 'function') {
      (window as any).syncToServer('dk_oqc_records', []);
    }

    alert(`✓ Đã xóa sạch toàn bộ ${totalCount.toLocaleString('vi-VN')} xe KCS cũ thành công!\n\nHệ thống sẽ tự động mở cửa sổ 'Dán Excel KCS' để anh Thao nạp bộ dữ liệu mới.`);
    setOqcImportReplaceAll(false);
    setShowImportOqcModal(true);
  };

  const handleImportOqcSubmit = (e: FormEvent) => {
    e.preventDefault();
    setOqcImportError('');
    if (!oqcImportText.trim()) {
      setOqcImportError('Vui lòng dán dữ liệu hoặc nhập văn bản từ file Excel!');
      return;
    }

    try {
      const lines = oqcImportText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const parsedRecords: OQCRecord[] = [];
      let skippedCount = 0;

      // --- STANDARD 17-COLUMN LAYOUT DEFAULTS ---
      // 0: Mã quy cách | 1: Số Sêri | 2: Màu xe | 3: Tình trạng | 4: Đạt | 5: Chi tiết lỗi | 6: Số lỗi | 7: Nguyên nhân | 8: Chi tiết nguyên nhân | 9: LSX | 10: Model | 11: Tính toán giờ ngày | 12: Giờ kiểm tra x | 13: Ngày | 14: Tháng | 15: Năm | 16: SLLR
      let partCodeColIdx = 0;
      let serialNoColIdx = 1;
      let colorColIdx = 2;
      let statusColIdx = 3;
      let passColIdx = 4;
      let defectColIdx = 5;
      let failedCountColIdx = 6;
      let causeColIdx1 = 7;
      let causeColIdx2 = 8;
      let lsxColIdx = 9;
      let modelColIdx = 10;
      let checkTimeColIdx = 12;
      let dColIdx = 13;
      let mColIdx = 14;
      let yColIdx = 15;
      let totalLlrColIdx = 16;
      let chassisNoColIdx = -1;
      let engineNoColIdx = -1;
      let fullDateColIdx = -1;

      // Detect header row if present
      const firstLine = lines[0];
      let isHeader = false;
      if (firstLine) {
        const firstCols = firstLine.includes('\t') 
          ? firstLine.split('\t') 
          : (firstLine.includes(';') && !firstLine.includes(',') ? firstLine.split(';') : firstLine.split(','));
        
        isHeader = firstCols.some(col => {
          const l = col.replace(/\u00a0/g, ' ').toLowerCase().trim();
          return l === 'mã quy cách' || l === 'số sêri' || l === 'số seri' || l === 'màu xe' || l === 'tình trạng' || l === 'chi tiết lỗi' || l === 'số lỗi' || l === 'nguyên nhân' || l === 'lsx' || l === 'sllr';
        });

        if (isHeader) {
          firstCols.forEach((col, idx) => {
            const cleanCol = col.replace(/\u00a0/g, ' ').trim().toLowerCase();
            if (cleanCol.includes('khung') || cleanCol.includes('chassis') || cleanCol.includes('vin')) {
              chassisNoColIdx = idx;
            } else if (cleanCol.includes('động cơ') || cleanCol.includes('dong co') || cleanCol.includes('engine') || cleanCol.includes('motor')) {
              engineNoColIdx = idx;
            } else if (
              cleanCol === 'số sêri' || cleanCol === 'sêri' || cleanCol === 'số seri' || cleanCol === 'seri' || 
              cleanCol === 'serial' || cleanCol === 'serial no' || cleanCol === 'số serial' || cleanCol.startsWith('số sê') || cleanCol.startsWith('số se')
            ) {
              serialNoColIdx = idx;
            } else if (cleanCol.includes('mã quy') || cleanCol.includes('mã qc') || cleanCol.includes('mã tem') || cleanCol === 'mã' || cleanCol.includes('part')) {
              partCodeColIdx = idx;
            } else if (cleanCol === 'màu xe' || cleanCol === 'màu' || cleanCol.includes('màu sắc') || cleanCol.includes('sơn') || cleanCol.includes('color')) {
              colorColIdx = idx;
            } else if (cleanCol === 'model' || cleanCol === 'mẫu xe' || cleanCol.includes('dòng xe') || cleanCol.includes('tên xe')) {
              modelColIdx = idx;
            } else if (cleanCol.includes('tình trạng') || cleanCol === 'trạng thái' || cleanCol === 'status') {
              statusColIdx = idx;
            } else if (cleanCol === 'đạt' || cleanCol === 'có đạt' || cleanCol === 'pass' || cleanCol === 'kết quả đạt' || cleanCol === 'ok') {
              passColIdx = idx;
            } else if (cleanCol.includes('chi tiết lỗi') || cleanCol.includes('nội dung lỗi') || cleanCol.includes('khuyết tật') || cleanCol.includes('tên lỗi') || cleanCol === 'lỗi' || cleanCol.includes('defect')) {
              defectColIdx = idx;
            } else if (cleanCol.includes('số lỗi') || cleanCol.includes('số lượng lỗi') || cleanCol.includes('vết lỗi') || cleanCol.includes('qty fail')) {
              failedCountColIdx = idx;
            } else if (cleanCol === 'nguyên nhân' || cleanCol === 'nguyên nhân 1' || cleanCol.includes('root cause') || cleanCol.includes('lý do')) {
              causeColIdx1 = idx;
            } else if (cleanCol.includes('chi tiết nguyên nhân') || cleanCol.includes('nguyên nhân 2')) {
              causeColIdx2 = idx;
            } else if (cleanCol === 'lsx' || cleanCol.includes('lệnh sản') || cleanCol.includes('lệnh sx') || cleanCol.includes('số lsx')) {
              lsxColIdx = idx;
            } else if (cleanCol.includes('giờ kiểm tra') || cleanCol === 'giờ' || cleanCol === 'thời gian' || cleanCol.includes('time')) {
              checkTimeColIdx = idx;
            } else if (cleanCol === 'ngày' && idx >= 2) {
              dColIdx = idx;
            } else if (cleanCol === 'tháng' && idx >= 2) {
              mColIdx = idx;
            } else if (cleanCol === 'năm' && idx >= 2) {
              yColIdx = idx;
            } else if (cleanCol.includes('ngày kiểm') || cleanCol.includes('ngày kcs') || cleanCol.includes('ngày/tháng') || cleanCol === 'date' || cleanCol.includes('ngày tháng')) {
              fullDateColIdx = idx;
            } else if (cleanCol === 'sllr' || cleanCol.includes('lắp ráp')) {
              totalLlrColIdx = idx;
            }
          });
        }
      }

      const startRow = isHeader ? 1 : 0;
      const now = new Date();
      const currentDayStr = String(now.getDate()).padStart(2, '0');
      const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
      const currentYearStr = String(now.getFullYear());
      const defaultDateStr = `${currentDayStr}/${currentMonthStr}/${currentYearStr}`;
      const defaultMonth = now.getMonth() + 1;
      const defaultYear = now.getFullYear();

      for (let i = startRow; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        let cols: string[] = [];
        if (line.includes('\t')) {
          cols = line.split('\t');
        } else if (line.includes(';') && !line.includes(',')) {
          cols = line.split(';');
        } else {
          cols = line.split(',');
        }

        // Clean every cell
        cols = cols.map(c => c.replace(/\u00a0/g, ' ').replace(/^["']|["']$/g, '').trim());
        if (cols.length < 2) {
          skippedCount++;
          continue;
        }

        const rawPartCode = (partCodeColIdx !== -1 && cols[partCodeColIdx] !== undefined) ? cols[partCodeColIdx] : (cols[0] || '');
        let rawSerial = (serialNoColIdx !== -1 && cols[serialNoColIdx] !== undefined) ? cols[serialNoColIdx] : (cols[1] || '');
        let rawColorCol = (colorColIdx !== -1 && cols[colorColIdx] !== undefined) ? cols[colorColIdx] : (cols[2] || '');
        let rawStatusCol = (statusColIdx !== -1 && cols[statusColIdx] !== undefined) ? cols[statusColIdx] : (cols[3] || '');
        let rawPassCol = (passColIdx !== -1 && cols[passColIdx] !== undefined) ? cols[passColIdx] : (cols[4] || '');
        let rawDefectCol = (defectColIdx !== -1 && cols[defectColIdx] !== undefined) ? cols[defectColIdx] : (cols[5] || '');
        let rawFailedCountCol = (failedCountColIdx !== -1 && cols[failedCountColIdx] !== undefined) ? cols[failedCountColIdx] : (cols[6] || '');
        let rawCause1Col = (causeColIdx1 !== -1 && cols[causeColIdx1] !== undefined) ? cols[causeColIdx1] : (cols[7] || '');
        let rawCause2Col = (causeColIdx2 !== -1 && cols[causeColIdx2] !== undefined) ? cols[causeColIdx2] : (cols[8] || '');
        let rawLsxCol = (lsxColIdx !== -1 && cols[lsxColIdx] !== undefined) ? cols[lsxColIdx] : (cols[9] || '');
        let rawModelCol = (modelColIdx !== -1 && cols[modelColIdx] !== undefined) ? cols[modelColIdx] : (cols[10] || '');
        let rawChassisCol = (chassisNoColIdx !== -1 && cols[chassisNoColIdx] !== undefined) ? cols[chassisNoColIdx] : '';
        let rawEngineCol = (engineNoColIdx !== -1 && cols[engineNoColIdx] !== undefined) ? cols[engineNoColIdx] : '';
        let rawTimeCol = (checkTimeColIdx !== -1 && cols[checkTimeColIdx] !== undefined) ? cols[checkTimeColIdx] : (cols[12] || '');

        // 1. SERIAL NUMBER INTELLIGENCE:
        let serialNoVal = rawSerial;
        // If rawSerial is not a serial or contains status words, scan all cols for serial pattern (26DK... or 7+ alphanumeric)
        if (!serialNoVal || serialNoVal.toLowerCase() === 'đạt' || serialNoVal.toLowerCase() === 'lỗi' || serialNoVal.toLowerCase() === 'chưa kiểm tra') {
          for (let c = 0; c < cols.length; c++) {
            const cell = cols[c];
            if (/^26[A-Z0-9]{5,}/i.test(cell) || /^[A-Z0-9]{7,18}$/i.test(cell)) {
              serialNoVal = cell;
              break;
            }
          }
        }
        if (!serialNoVal) {
          serialNoVal = `XE-${i + 1}-${Date.now().toString(36)}`;
        }

        let partCodeVal = rawPartCode || 'TEM-GEN';
        let chassisNoVal = rawChassisCol;
        let engineNoVal = rawEngineCol;
        let lsxVal = rawLsxCol || '26-10';

        // 2. MODEL AND COLOR INTELLIGENCE:
        // Never allow status strings in Model or Color
        if (rawModelCol.toLowerCase() === 'đạt' || rawModelCol.toLowerCase() === 'lỗi' || rawModelCol.toLowerCase() === 'chưa kiểm tra') {
          rawModelCol = '';
        }
        if (rawColorCol.toLowerCase() === 'đạt' || rawColorCol.toLowerCase() === 'lỗi' || rawColorCol.toLowerCase() === 'chưa kiểm tra') {
          rawColorCol = '';
        }

        let modelVal = rawModelCol;
        let colorVal = rawColorCol;

        // If color contains "DK D2 - Ghi đen", split into Model and Color ONLY IF prefix is a known model name
        if (colorVal.includes(' - ') || (colorVal.includes('-') && !modelVal)) {
          const delim = colorVal.includes(' - ') ? ' - ' : '-';
          const parts = colorVal.split(delim);
          if (!modelVal && isKnownModelString(parts[0]) && !isColorOnlyString(parts[0])) {
            modelVal = parts[0].trim();
            colorVal = parts.slice(1).join(delim).trim();
          }
        }

        // If model still empty, lookup from OQC Part Codes dictionary
        if (!modelVal || modelVal === 'DK Gogo') {
          const matchedPart = lookupPartCode(partCodeVal);
          if (matchedPart) {
            modelVal = matchedPart.model;
            if (!colorVal && matchedPart.color) colorVal = matchedPart.color;
          }
        }

        // Fallback Model from prefix
        if (!modelVal) {
          const pUp = partCodeVal.toUpperCase();
          if (pUp.includes('TEMDD') || pUp.includes('D2')) modelVal = 'DK D2';
          else if (pUp.includes('TEMDV') || pUp.includes('V2')) modelVal = 'DK V2';
          else if (pUp.includes('ROM') || pUp.includes('ROMA')) modelVal = 'DK Roma SX V2';
          else if (pUp.includes('GOGO') || pUp.includes('GG')) modelVal = 'DK Gogo';
          else if (pUp.includes('SAM')) modelVal = 'DK Samurai';
          else if (pUp.includes('XMEN') || pUp.includes('XMAN')) modelVal = 'DK Xmen';
          else if (pUp.includes('CREA')) modelVal = 'DK Crea Mono';
          else if (pUp.includes('EZ')) modelVal = 'DK EZ3';
          else if (pUp.includes('S1')) modelVal = 'DK S1';
          else if (pUp.includes('S2')) modelVal = 'DK S2';
          else if (pUp.includes('S3')) modelVal = 'DK S3';
          else if (pUp.includes('NOVA')) modelVal = 'DK Nova';
          else if (pUp.includes('ZMTP') || pUp.includes('ZMT')) modelVal = 'DK Z-MTP';
          else modelVal = 'DK D2';
        }

        if (!colorVal) colorVal = 'Tiêu chuẩn';

        // 3. DEFECT AND CAUSE EXTRACTION:
        let defectDetailVal = rawDefectCol;
        if (
          defectDetailVal === '0' || 
          defectDetailVal === '-' || 
          defectDetailVal.toLowerCase() === 'không' || 
          defectDetailVal.toLowerCase() === 'ok' || 
          defectDetailVal.toLowerCase() === 'pass' || 
          defectDetailVal.toLowerCase() === 'none'
        ) {
          defectDetailVal = '';
        }

        let rootCauseVal = '';
        if (rawCause1Col && rawCause2Col && rawCause1Col !== rawCause2Col) {
          rootCauseVal = `${rawCause1Col} - ${rawCause2Col}`;
        } else {
          rootCauseVal = rawCause1Col || rawCause2Col || '';
        }

        // 4. PASS / FAIL STATUS INTELLIGENCE:
        const sNorm = rawStatusCol.toLowerCase();
        const pNorm = rawPassCol.toLowerCase();
        const parsedFailedNum = parseInt(rawFailedCountCol, 10);

        let statusVal: 'Đạt' | 'Lỗi' | 'Chưa kiểm tra' = 'Đạt';
        if (
          sNorm === 'lỗi' || sNorm === 'fail' || sNorm === 'ng' ||
          pNorm === '0' ||
          (!isNaN(parsedFailedNum) && parsedFailedNum > 0) ||
          (defectDetailVal && defectDetailVal.length > 0)
        ) {
          statusVal = 'Lỗi';
        } else if (
          sNorm === 'đạt' || sNorm === 'pass' || sNorm === 'ok' ||
          pNorm === '1' || pNorm === 'đạt' || pNorm === 'pass'
        ) {
          statusVal = 'Đạt';
        } else if (sNorm.includes('chưa') || pNorm.includes('chưa')) {
          statusVal = 'Chưa kiểm tra';
        } else {
          statusVal = 'Đạt';
        }

        let failedCountVal = 0;
        if (statusVal === 'Lỗi') {
          failedCountVal = (!isNaN(parsedFailedNum) && parsedFailedNum > 0) ? parsedFailedNum : 1;
        }

        // 5. DATE AND TIME INTELLIGENCE:
        let dateVal = defaultDateStr;
        let monthVal = defaultMonth;
        let yearVal = defaultYear;

        const dVal = (dColIdx !== -1 && cols[dColIdx] !== undefined) ? cols[dColIdx] : (cols[13] || '');
        const mVal = (mColIdx !== -1 && cols[mColIdx] !== undefined) ? cols[mColIdx] : (cols[14] || '');
        const yVal = (yColIdx !== -1 && cols[yColIdx] !== undefined) ? cols[yColIdx] : (cols[15] || '');

        if (dVal && mVal) {
          const dayNum = parseInt(dVal, 10) || 1;
          const monthNum = parseInt(mVal, 10) || defaultMonth;
          const yearNum = parseInt(yVal, 10) || defaultYear;
          dateVal = `${String(dayNum).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/${yearNum}`;
          monthVal = monthNum;
          yearVal = yearNum;
        } else {
          let rawDateStr = (fullDateColIdx !== -1 && cols[fullDateColIdx] !== undefined) ? cols[fullDateColIdx] : '';
          if (!rawDateStr) {
            for (const cell of cols) {
              if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(cell) || /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(cell)) {
                rawDateStr = cell;
                break;
              }
            }
          }
          if (rawDateStr) {
            const dateMatch = rawDateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/) || rawDateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (dateMatch) {
              if (dateMatch[1].length === 4) {
                yearVal = parseInt(dateMatch[1], 10) || defaultYear;
                monthVal = parseInt(dateMatch[2], 10) || defaultMonth;
                const dayVal = String(parseInt(dateMatch[3], 10) || 1).padStart(2, '0');
                dateVal = `${dayVal}/${String(monthVal).padStart(2, '0')}/${yearVal}`;
              } else {
                const dayVal = String(parseInt(dateMatch[1], 10) || 1).padStart(2, '0');
                monthVal = parseInt(dateMatch[2], 10) || defaultMonth;
                yearVal = parseInt(dateMatch[3], 10) || defaultYear;
                dateVal = `${dayVal}/${String(monthVal).padStart(2, '0')}/${yearVal}`;
              }
            }
          }
        }

        // Check Time
        let checkTimeVal = rawTimeCol || '08:30';
        if (checkTimeVal.includes(' ') && !/^\d{1,2}:\d{2}/.test(checkTimeVal)) {
          const timeParts = checkTimeVal.split(' ');
          const potentialTime = timeParts[timeParts.length - 1];
          if (/^\d{1,2}:\d{2}/.test(potentialTime)) {
            checkTimeVal = potentialTime;
          }
        }

        const totalLlrVal = Number(totalLlrColIdx !== -1 && cols[totalLlrColIdx] !== undefined ? cols[totalLlrColIdx] : (cols[16] || '')) || 1;

        parsedRecords.push({
          id: `OQC-${serialNoVal.toUpperCase().replace(/[\/\s.#$\[\]]/g, '_')}`,
          date: dateVal,
          partCode: partCodeVal,
          serialNo: serialNoVal,
          chassisNo: chassisNoVal,
          engineNo: engineNoVal,
          model: getCleanModelName({ model: modelVal, color: colorVal, partCode: partCodeVal }),
          color: colorVal,
          status: statusVal,
          lsx: lsxVal,
          failedCount: failedCountVal,
          defectDetail: defectDetailVal,
          rootCause: rootCauseVal,
          checkTime: checkTimeVal,
          month: monthVal,
          year: yearVal,
          totalLlr: totalLlrVal,
          evaluation: '',
          treatment: ''
        });
      }

      if (parsedRecords.length === 0) {
        setOqcImportError('Không tìm thấy bản ghi hợp lệ nào! Vui lòng kiểm tra lại định dạng file Excel.');
        return;
      }

      // Deduplicate parsed records (last row in import text takes precedence)
      const mergedParsed: { [serial: string]: OQCRecord } = {};
      for (const r of parsedRecords) {
        const serial = r.serialNo.trim().toUpperCase();
        mergedParsed[serial] = { ...r };
      }
      const finalParsed = Object.values(mergedParsed);

      let finalUpdatedList: OQCRecord[] = [];
      let updatedCount = 0;
      let addedCount = 0;

      if (oqcImportReplaceAll) {
        // GHI ĐÈ THAY THẾ TOÀN BỘ (REPLACE ALL): Xóa sạch dữ liệu cũ, chỉ lấy dữ liệu mới vừa dán
        finalUpdatedList = finalParsed;
        addedCount = finalParsed.length;
      } else {
        // Multi-key lookup map for existing records
        const finalParsedLookupMap = new Map<string, OQCRecord>();
        finalParsed.forEach(r => {
          if (r.serialNo) finalParsedLookupMap.set(r.serialNo.trim().toUpperCase(), r);
          if (r.chassisNo) finalParsedLookupMap.set(r.chassisNo.trim().toUpperCase(), r);
          if (r.id) finalParsedLookupMap.set(r.id.trim().toUpperCase().replace(/^OQC-/, ''), r);
        });

        const updatedExistingRecords: OQCRecord[] = [];
        const matchedImportedSerials = new Set<string>();

        oqcRecords.forEach(oldRec => {
          const sKey = (oldRec.serialNo || '').trim().toUpperCase();
          const cKey = (oldRec.chassisNo || '').trim().toUpperCase();
          const idKey = (oldRec.id || '').trim().toUpperCase().replace(/^OQC-/, '');

          const newRec = (sKey && finalParsedLookupMap.get(sKey)) || 
                         (cKey && finalParsedLookupMap.get(cKey)) || 
                         (idKey && finalParsedLookupMap.get(idKey));

          if (newRec) {
            updatedCount++;
            // GHI ĐÈ ƯU TIÊN 100% CÁC TRƯỜNG DỮ LIỆU TỪ FILE EXCEL
            updatedExistingRecords.push({
              ...oldRec,
              status: newRec.status,
              defectDetail: newRec.defectDetail,
              failedCount: newRec.failedCount,
              rootCause: newRec.rootCause,
              model: newRec.model || oldRec.model,
              color: newRec.color || oldRec.color,
              lsx: newRec.lsx || oldRec.lsx,
              partCode: (newRec.partCode && newRec.partCode !== 'TEM-GEN') ? newRec.partCode : (oldRec.partCode || newRec.partCode),
              chassisNo: newRec.chassisNo || oldRec.chassisNo,
              engineNo: newRec.engineNo || oldRec.engineNo,
              date: newRec.date || oldRec.date,
              month: newRec.month || oldRec.month,
              year: newRec.year || oldRec.year,
              checkTime: newRec.checkTime || oldRec.checkTime || '08:30'
            });
            if (newRec.serialNo) matchedImportedSerials.add(newRec.serialNo.trim().toUpperCase());
          } else {
            updatedExistingRecords.push(oldRec);
          }
        });

        // Add any brand new serials that were not in oqcRecords before
        const brandNewRecords: OQCRecord[] = [];
        finalParsed.forEach(newRec => {
          const sUpper = (newRec.serialNo || '').trim().toUpperCase();
          if (!matchedImportedSerials.has(sUpper)) {
            brandNewRecords.push(newRec);
            addedCount++;
          }
        });

        finalUpdatedList = [...brandNewRecords, ...updatedExistingRecords];
      }

      // GHI ĐÈ AN TOÀN VÀO SAFE STORAGE & ĐẨY LÊN CLOUD FIREBASE
      setOqcRecords(finalUpdatedList);
      safeStorage.setItem('dk_oqc_records', JSON.stringify(finalUpdatedList));
      try {
        localStorage.setItem('dk_oqc_records_is_dirty', 'true');
      } catch (e) {}

      // Trigger immediate synchronization to Firebase
      if (typeof (window as any).syncToServer === 'function') {
        (window as any).syncToServer('dk_oqc_records', finalUpdatedList);
      }

      // Automatically reset LSX filter to 'All' so that all imported cars are immediately visible
      const firstImportedLsx = finalParsed[0]?.lsx;
      if (firstImportedLsx && kcsSelectedLsx !== 'All' && kcsSelectedLsx !== firstImportedLsx) {
        setKcsSelectedLsx('All');
      }

      const finalPassedCount = finalParsed.filter(r => r.status === 'Đạt').length;
      const finalFailedCount = finalParsed.filter(r => r.status === 'Lỗi').length;

      setOqcImportText('');
      setShowImportOqcModal(false);
      setOqcImportReplaceAll(false);

      if (oqcImportReplaceAll) {
        alert(`🎉 NẠP MỚI TOÀN BỘ KCS THÀNH CÔNG!\n\nĐã thay thế toàn bộ CSDL bằng ${finalParsed.length} xe vừa nạp:\n• Số xe ĐẠT: ${finalPassedCount} xe\n• Số xe LỖI: ${finalFailedCount} xe\n\n(Dữ liệu đã tự động lưu an toàn và đồng bộ lên Cloud Firebase)`);
      } else {
        alert(`🎉 Nhập KCS & Ghi đè thành công!\n\nChi tiết file Excel vừa nạp (${finalParsed.length} xe):\n• Số xe ĐẠT: ${finalPassedCount} xe\n• Số xe LỖI: ${finalFailedCount} xe\n\nĐối chiếu theo Số Sêri:\n• Đã ghi đè cập nhật: ${updatedCount} xe\n• Thêm mới: ${addedCount} xe\n\n(Dữ liệu đã tự động lưu an toàn và đồng bộ lên Cloud Firebase)`);
      }
    } catch (err: any) {
      setOqcImportError(`Lỗi phân rã dữ liệu: ${err.message || err}`);
    }
  };

  const handleExportOqcCSV = () => {
    const csvHeaders = ["STT", "Mã quy cách", "Số Sêri", "Model & Màu sắc", "Tình trạng", "Chi tiết lỗi", "Số lỗi", "Nguyên nhân", "LSX", "Giờ kiểm", "Ngày"];
    const csvContent = oqcRecords.map((r, i) => [
      i + 1,
      r.partCode,
      r.serialNo,
      `${r.model} - ${r.color}`,
      r.status,
      r.defectDetail,
      r.failedCount,
      r.rootCause,
      r.lsx,
      r.checkTime,
      r.date
    ]);
    
    let csvString = "\uFEFF" + [csvHeaders.join(","), ...csvContent.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Bao_cao_OQC_KCS_Thanh_pham_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Audio Beep Feedback for Barcode Scanner
  const playScanBeep = useCallback((isError = false) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = isError ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isError ? 220 : 960, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isError ? 0.25 : 0.09));
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + (isError ? 0.25 : 0.09));
    } catch (e) {}
  }, []);

  // Parser helper for Color & Status Shift rows (Số seri | Tên cũ (Model - Màu) | Tên mới (Model - Màu) | Ngày đổi)
  const parseColorChangeRows = useCallback((text: string, defaultDate: string) => {
    if (!text || !text.trim()) return [];
    const lines = text.split(/\r?\n/);
    const results: Array<{
      serialNo: string;
      model: string;
      oldModel: string;
      newModel: string;
      oldColor: string;
      newColor: string;
      changeType: 'color' | 'status' | 'both';
      date: string;
      flag: string | boolean;
      isValid: boolean;
      error?: string;
    }> = [];

    const splitModelAndColor = (combined: string): { model: string; color: string } => {
      if (!combined) return { model: '', color: '' };
      const raw = combined.trim();
      if (raw.includes(' - ') || (raw.includes('-') && !/^\d{1,2}[\/\-]/.test(raw))) {
        const delim = raw.includes(' - ') ? ' - ' : '-';
        const parts = raw.split(delim);
        if (isKnownModelString(parts[0]) && !isColorOnlyString(parts[0])) {
          return { model: parts[0].trim(), color: parts.slice(1).join(delim).trim() };
        }
      }
      if (isColorOnlyString(raw)) {
        return { model: '', color: raw };
      }
      return { model: raw, color: '' };
    };

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i].trim();
      if (!rawLine) continue;

      const lower = rawLine.toLowerCase();
      if (
        (lower.includes('seri') || lower.includes('sêri') || lower.includes('serial')) && 
        (lower.includes('model') || lower.includes('màu') || lower.includes('color') || lower.includes('ngày') || lower.includes('trước') || lower.includes('sau'))
      ) {
        continue;
      }

      let cols: string[] = [];
      if (rawLine.includes('\t')) {
        cols = rawLine.split('\t').map(c => c.replace(/^["']|["']$/g, '').trim());
      } else if (rawLine.includes('|')) {
        cols = rawLine.split('|').map(c => c.replace(/^["']|["']$/g, '').trim());
      } else if (rawLine.includes(';') && (rawLine.match(/;/g) || []).length >= 2) {
        cols = rawLine.split(';').map(c => c.replace(/^["']|["']$/g, '').trim());
      } else if (rawLine.includes(',') && (rawLine.match(/,/g) || []).length >= 2) {
        cols = rawLine.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
      } else {
        cols = rawLine.split(/\s{2,}|\t/).map(c => c.replace(/^["']|["']$/g, '').trim());
      }

      if (cols.length < 2) {
        continue;
      }

      const serialNo = (cols[0] || '').trim();
      let oldModel = '';
      let newModel = '';
      let oldColor = '';
      let newColor = '';
      let dateVal = defaultDate || new Date().toLocaleDateString('vi-VN');
      let flagVal: string | boolean = true;

      // Date detection across columns
      const dateRegex = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/;
      const dateColIdx = cols.findIndex((c, idx) => idx >= 2 && dateRegex.test(c));
      if (dateColIdx !== -1) {
        const match = cols[dateColIdx].match(dateRegex);
        if (match) {
          const d = match[1].padStart(2, '0');
          const m = match[2].padStart(2, '0');
          const y = match[3];
          dateVal = `${d}/${m}/${y}`;
        }
      }

      // Check format style:
      // Format 1 (Standard 4 columns):
      // Col 0: Serial | Col 1: Old (Model - Color) | Col 2: New (Model - Color) | Col 3: Date
      if (cols.length <= 4 || cols[1]?.includes('-') || cols[2]?.includes('-')) {
        const oldParsed = splitModelAndColor(cols[1] || '');
        const newParsed = splitModelAndColor(cols[2] || '');

        oldModel = oldParsed.model;
        oldColor = oldParsed.color;
        newModel = newParsed.model;
        newColor = newParsed.color;
      } else if (cols.length >= 4) {
        // Format 2 (Legacy 5 columns: Serial | Model | OldColor | NewColor | Date)
        oldModel = (cols[1] || '').trim();
        newModel = (cols[1] || '').trim();
        oldColor = (cols[2] || '').trim();
        newColor = (cols[3] || '').trim();
      }

      // Look up existing OQC record to fill in missing parts
      const existingOqc = oqcRecords.find(r => r.serialNo && r.serialNo.trim().toUpperCase() === serialNo.toUpperCase());
      if (existingOqc) {
        if (!oldModel) oldModel = existingOqc.model || '';
        if (!newModel) newModel = oldModel;
        if (!oldColor) oldColor = existingOqc.color || '';
        if (!newColor) newColor = oldColor;
      }

      if (!newModel && oldModel) newModel = oldModel;
      if (!oldModel && newModel) oldModel = newModel;
      if (!newColor && oldColor) newColor = oldColor;
      if (!oldColor && newColor) oldColor = newColor;

      const isModelChanged = Boolean(oldModel && newModel && oldModel.toLowerCase().trim() !== newModel.toLowerCase().trim());
      const isColorChanged = Boolean(oldColor && newColor && oldColor.toLowerCase().trim() !== newColor.toLowerCase().trim());

      let changeType: 'color' | 'status' | 'both' = 'color';
      if (isModelChanged && isColorChanged) changeType = 'both';
      else if (isModelChanged) changeType = 'status';
      else changeType = 'color';

      const isValid = Boolean(serialNo && (newModel || newColor) && (isModelChanged || isColorChanged || oldColor || oldModel));

      results.push({
        serialNo,
        model: newModel || oldModel || 'DK D2',
        oldModel: oldModel || newModel || 'DK D2',
        newModel: newModel || oldModel || 'DK D2',
        oldColor: oldColor || 'Tiêu chuẩn',
        newColor: newColor || oldColor || 'Tiêu chuẩn',
        changeType,
        date: dateVal,
        flag: flagVal,
        isValid,
        error: !serialNo ? 'Thiếu số sêri' : (!isValid ? 'Không phát hiện thay đổi' : undefined)
      });
    }

    return results;
  }, [oqcRecords]);

  const liveParsedColorChanges = useMemo(() => {
    return parseColorChangeRows(colorChangeText, colorChangeDefaultDate);
  }, [colorChangeText, colorChangeDefaultDate, parseColorChangeRows]);

  // High-performance barcode scanner in-memory handler (O(1) in RAM, zero disk write during scanning)
  const handleProcessScanSerial = () => {
    setScanError('');
    setScanLastSuccess(null);
    const clean = scanSerialInput.trim().toUpperCase();
    if (!clean) {
      setScanError('Vui lòng quét hoặc nhập số sêri!');
      playScanBeep(true);
      return;
    }

    // Check if already in current staged session
    if (stagedScans.some(s => s.serialNo.toUpperCase() === clean)) {
      setScanError(`Xe có số sêri [${clean}] đã được quét trong phiên này rồi!`);
      playScanBeep(true);
      return;
    }

    // In-memory RAM lookup from oqcRecords
    const existingOqc = oqcRecords.find(r => r.serialNo && r.serialNo.trim().toUpperCase() === clean);
    let oldModel = existingOqc?.model || '';
    let oldColor = existingOqc?.color || '';
    let lsx = existingOqc?.lsx || '26-10';
    let partCode = existingOqc?.partCode || 'TEM-GEN';
    let isNewInOqc = false;

    if (!oldModel || !oldColor) {
      const matchedPart = lookupPartCode(partCode);
      if (matchedPart) {
        if (!oldModel) oldModel = matchedPart.model || '';
        if (!oldColor) oldColor = matchedPart.color || '';
      }
      if (!existingOqc) isNewInOqc = true;
    }

    if (!oldModel) oldModel = modelNames[0] || 'DK Roma SX V2';
    if (!oldColor) oldColor = 'Đen';

    const newEntry = {
      serialNo: clean,
      model: oldModel,
      oldModel: oldModel,
      newModel: oldModel,
      oldColor: oldColor,
      newColor: '',
      changeType: 'color' as const,
      date: scanDate || new Date().toLocaleDateString('vi-VN'),
      lsx,
      partCode,
      isNewInOqc
    };

    // Staged into RAM list only - NO Firebase or localStorage write here!
    setStagedScans(prev => [newEntry, ...prev]);
    if (isNewInOqc) {
      setScanLastSuccess(`✓ Đã quét: ${clean} (Sêri mới chưa có trong KCS ➔ Có thể chọn/sửa Model & Màu gốc và Model & Màu mới ở bảng bên dưới)`);
    } else {
      setScanLastSuccess(`✓ Đã quét: ${clean} (${oldModel} | Màu gốc: ${oldColor}) ➔ Mời chọn/sửa Model & Màu mới ở bảng bên dưới`);
    }
    playScanBeep(false);
    setScanSerialInput('');
    setTimeout(() => {
      scannerInputRef.current?.focus();
    }, 50);
  };

  const handleUpdateStagedItem = (
    index: number,
    field: 'oldModel' | 'newModel' | 'oldColor' | 'newColor' | 'date',
    val: string
  ) => {
    setStagedScans(prev => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: val };
      if (field === 'newModel') current.model = val;
      const isMDiff = (current.oldModel || '').toLowerCase().trim() !== (current.newModel || '').toLowerCase().trim();
      const isCDiff = (current.oldColor || '').toLowerCase().trim() !== (current.newColor || '').toLowerCase().trim();
      if (isMDiff && isCDiff) current.changeType = 'both';
      else if (isMDiff) current.changeType = 'status';
      else current.changeType = 'color';
      updated[index] = current;
      return updated;
    });
  };

  const handleApplyColorToAllStaged = (targetColor: string) => {
    if (!targetColor.trim()) return;
    setStagedScans(prev => prev.map(item => {
      const isMDiff = (item.oldModel || '').toLowerCase().trim() !== (item.newModel || '').toLowerCase().trim();
      const isCDiff = (item.oldColor || '').toLowerCase().trim() !== targetColor.trim().toLowerCase();
      let changeType: 'color' | 'status' | 'both' = 'color';
      if (isMDiff && isCDiff) changeType = 'both';
      else if (isMDiff) changeType = 'status';
      else changeType = 'color';
      return { ...item, newColor: targetColor.trim(), changeType };
    }));
  };

  const handleApplyModelToAllStaged = (targetModel: string) => {
    if (!targetModel.trim()) return;
    setStagedScans(prev => prev.map(item => {
      const isMDiff = (item.oldModel || '').toLowerCase().trim() !== targetModel.trim().toLowerCase();
      const isCDiff = (item.oldColor || '').toLowerCase().trim() !== (item.newColor || '').toLowerCase().trim();
      let changeType: 'color' | 'status' | 'both' = 'color';
      if (isMDiff && isCDiff) changeType = 'both';
      else if (isMDiff) changeType = 'status';
      else changeType = 'color';
      return { ...item, newModel: targetModel.trim(), model: targetModel.trim(), changeType };
    }));
  };

  // Commit all staged scans to database & cloud in a SINGLE ATOMIC BATCH
  const handleSaveStagedScans = () => {
    if (stagedScans.length === 0) return;

    // Validate that all scanned cars have a target specified (newColor or newModel changed)
    const invalidItems = stagedScans.filter(s => (!s.newColor || !s.newColor.trim()) && (!s.newModel || s.newModel === s.oldModel));
    if (invalidItems.length > 0) {
      setScanError(`Có ${invalidItems.length} xe chưa được chọn/nhập Màu mới hoặc Model mới (Ví dụ: ${invalidItems.slice(0, 3).map(x => x.serialNo).join(', ')}). Anh Thao vui lòng chọn hoặc gõ Màu mới/Model mới cho các xe này trước khi Lưu!`);
      playScanBeep(true);
      return;
    }

    try {
      const serialChangeMap = new Map<string, typeof stagedScans[0]>();
      stagedScans.forEach(item => {
        serialChangeMap.set(item.serialNo.trim().toUpperCase(), item);
      });

      // 1. Update OQC records in RAM
      const existingSerials = new Set<string>();
      const updatedOqc = oqcRecords.map(r => {
        const sUpper = (r.serialNo || '').trim().toUpperCase();
        existingSerials.add(sUpper);
        const change = serialChangeMap.get(sUpper);
        if (change) {
          const isStatusChanged = Boolean(change.oldModel && change.newModel && change.oldModel.toLowerCase().trim() !== change.newModel.toLowerCase().trim());
          const isColorChanged = Boolean(change.oldColor && change.newColor && change.oldColor.toLowerCase().trim() !== change.newColor.toLowerCase().trim());
          return {
            ...r,
            model: change.newModel || change.model || r.model,
            color: change.newColor || r.color,
            oldModel: change.oldModel || r.oldModel || r.model,
            oldColor: change.oldColor || r.oldColor || r.color,
            isColorChanged: isColorChanged || r.isColorChanged,
            isStatusChanged: isStatusChanged || r.isStatusChanged,
            colorChangeDate: change.date
          };
        }
        return r;
      });

      // Insert any serials that did not exist yet in OQC
      const newOqcFromChanges: OQCRecord[] = [];
      stagedScans.forEach(item => {
        const sUpper = item.serialNo.trim().toUpperCase();
        if (!existingSerials.has(sUpper)) {
          const isStatusChanged = Boolean(item.oldModel && item.newModel && item.oldModel.toLowerCase().trim() !== item.newModel.toLowerCase().trim());
          const isColorChanged = Boolean(item.oldColor && item.newColor && item.oldColor.toLowerCase().trim() !== item.newColor.toLowerCase().trim());
          newOqcFromChanges.push({
            id: `OQC-${sUpper.replace(/[\/\s.#$\[\]]/g, '_')}`,
            partCode: item.partCode || 'TEM-GEN',
            serialNo: item.serialNo.trim(),
            model: item.newModel || item.model,
            color: item.newColor || item.oldColor,
            oldModel: item.oldModel || item.model,
            oldColor: item.oldColor,
            isColorChanged: isColorChanged,
            isStatusChanged: isStatusChanged,
            colorChangeDate: item.date,
            status: 'Đạt',
            defectDetail: '',
            failedCount: 0,
            rootCause: '',
            lsx: item.lsx || '26-10',
            checkTime: '08:30',
            date: item.date,
            month: parseInt(item.date.split('/')[1] || '5', 10),
            year: parseInt(item.date.split('/')[2] || '2026', 10),
            totalLlr: 1
          });
        }
      });

      const finalOqc = [...newOqcFromChanges, ...updatedOqc];

      // 2. Add records to oqcColorChanges
      const newColorChangeRecords: OqcColorChangeRecord[] = stagedScans.map(item => {
        const isModelDiff = (item.oldModel || '').toLowerCase().trim() !== (item.newModel || '').toLowerCase().trim();
        const isColorDiff = (item.oldColor || '').toLowerCase().trim() !== (item.newColor || '').toLowerCase().trim();
        let changeType: 'color' | 'status' | 'both' = 'color';
        if (isModelDiff && isColorDiff) changeType = 'both';
        else if (isModelDiff) changeType = 'status';
        else changeType = 'color';

        return {
          id: `CC-${item.serialNo.trim().toUpperCase()}-${item.date.replace(/\//g, '')}-${Date.now()}`,
          serialNo: item.serialNo.trim(),
          model: item.newModel || item.model,
          oldModel: item.oldModel || item.model,
          newModel: item.newModel || item.model,
          oldColor: item.oldColor,
          newColor: item.newColor || item.oldColor,
          changeType,
          date: item.date,
          flag: true,
          createdAt: new Date().toISOString()
        };
      });

      const mergedChanges = [
        ...newColorChangeRecords,
        ...activeColorChanges.filter(c => 
          !stagedScans.some(v => v.serialNo.trim().toUpperCase() === c.serialNo.trim().toUpperCase() && v.date === c.date)
        )
      ];

      // 3. PERSIST ONCE: Single disk write & Single Cloud sync
      setOqcRecords(finalOqc);
      updateColorChanges(mergedChanges);
      safeStorage.setItem('dk_oqc_records', JSON.stringify(finalOqc));
      try {
        localStorage.setItem('dk_oqc_records_is_dirty', 'true');
      } catch (e) {}

      if (typeof (window as any).syncToServer === 'function') {
        (window as any).syncToServer('dk_oqc_records', finalOqc);
      }

      const count = stagedScans.length;
      setStagedScans([]);
      setShowScanColorChangeModal(false);
      alert(`🎉 Đã quét & lưu thành công ${count} xe chuyển đổi vào hệ thống KCS!\n\n(Dữ liệu đã tự động cập nhật vào OQC và đẩy lên Cloud an toàn)`);
    } catch (err: any) {
      setScanError(`Lỗi khi lưu dữ liệu: ${err.message || err}`);
    }
  };

  // Open Edit Modal for a single color/status change record
  const handleOpenEditColorChange = (record: OqcColorChangeRecord) => {
    const cls = getChangeClassification(record);
    setEditingColorChangeRecord(record);
    setEditCcSerialNo(record.serialNo);
    setEditCcOldModel(cls.displayOldModel);
    setEditCcNewModel(cls.displayNewModel);
    setEditCcOldColor(cls.displayOldColor);
    setEditCcNewColor(cls.displayNewColor);
    setEditCcDate(record.date);
    setEditCcError('');
    setShowEditColorChangeModal(true);
  };

  // Save changes from Edit Modal
  const handleSaveEditColorChange = (e: FormEvent) => {
    e.preventDefault();
    if (!editingColorChangeRecord) return;
    setEditCcError('');

    const cleanSerial = editCcSerialNo.trim().toUpperCase();
    const oldM = editCcOldModel.trim() || 'DK D2';
    const newM = editCcNewModel.trim() || oldM;
    const oldC = editCcOldColor.trim() || 'Tiêu chuẩn';
    const newC = editCcNewColor.trim() || oldC;
    const dateVal = editCcDate.trim() || new Date().toLocaleDateString('vi-VN');

    if (!cleanSerial) {
      setEditCcError('Số sêri không được để trống!');
      return;
    }

    const isModelDiff = oldM.toLowerCase() !== newM.toLowerCase();
    const isColorDiff = oldC.toLowerCase() !== newC.toLowerCase();
    let changeType: 'color' | 'status' | 'both' = 'color';
    if (isModelDiff && isColorDiff) changeType = 'both';
    else if (isModelDiff) changeType = 'status';
    else changeType = 'color';

    // 1. Update in activeColorChanges
    const updatedChanges = activeColorChanges.map(c => {
      if (c.id === editingColorChangeRecord.id || (c.serialNo.trim().toUpperCase() === editingColorChangeRecord.serialNo.trim().toUpperCase() && c.date === editingColorChangeRecord.date)) {
        return {
          ...c,
          serialNo: cleanSerial,
          model: newM,
          oldModel: oldM,
          newModel: newM,
          oldColor: oldC,
          newColor: newC,
          changeType,
          date: dateVal
        };
      }
      return c;
    });

    // 2. Update in oqcRecords
    let hasMatchedOqc = false;
    const updatedOqc = oqcRecords.map(r => {
      if (r.serialNo && (r.serialNo.trim().toUpperCase() === editingColorChangeRecord.serialNo.trim().toUpperCase() || r.serialNo.trim().toUpperCase() === cleanSerial)) {
        hasMatchedOqc = true;
        return {
          ...r,
          serialNo: cleanSerial,
          model: newM,
          color: newC,
          oldModel: oldM,
          oldColor: oldC,
          isColorChanged: isColorDiff || r.isColorChanged,
          isStatusChanged: isModelDiff || r.isStatusChanged,
          colorChangeDate: dateVal
        };
      }
      return r;
    });

    let finalOqc = updatedOqc;
    if (!hasMatchedOqc) {
      finalOqc = [{
        id: `OQC-${cleanSerial.replace(/[\/\s.#$\[\]]/g, '_')}`,
        partCode: 'TEM-GEN',
        serialNo: cleanSerial,
        model: newM,
        color: newC,
        oldModel: oldM,
        oldColor: oldC,
        isColorChanged: isColorDiff,
        isStatusChanged: isModelDiff,
        colorChangeDate: dateVal,
        status: 'Đạt',
        defectDetail: '',
        failedCount: 0,
        rootCause: '',
        lsx: '26-10',
        checkTime: '08:30',
        date: dateVal,
        month: parseInt(dateVal.split('/')[1] || '5', 10),
        year: parseInt(dateVal.split('/')[2] || '2026', 10),
        totalLlr: 1
      }, ...updatedOqc];
    }

    // 3. Persist & Sync
    updateColorChanges(updatedChanges);
    setOqcRecords(finalOqc);
    safeStorage.setItem('dk_oqc_records', JSON.stringify(finalOqc));
    try { localStorage.setItem('dk_oqc_records_is_dirty', 'true'); } catch (e) {}
    if (typeof (window as any).syncToServer === 'function') {
      (window as any).syncToServer('dk_oqc_records', finalOqc);
    }

    setShowEditColorChangeModal(false);
    setEditingColorChangeRecord(null);
    alert(`✓ Đã cập nhật thành công thông tin chuyển đổi cho xe [${cleanSerial}]!`);
  };

  // Revert & Delete a single color change record
  const handleDeleteColorChange = (record: OqcColorChangeRecord) => {
    if (!confirm(`Anh Thao có chắc chắn muốn xóa bản ghi đổi màu/trạng thái xe [${record.serialNo}] không?\n\n(Dữ liệu xe trong OQC sẽ được hoàn tác về Model/Màu gốc: ${record.oldModel || record.model} - ${record.oldColor || 'Màu gốc'})`)) {
      return;
    }

    const newChanges = activeColorChanges.filter(c => c.id !== record.id && !(c.serialNo === record.serialNo && c.date === record.date));
    updateColorChanges(newChanges);

    // Revert in OQC records
    const updatedOqc = oqcRecords.map(r => {
      if (r.serialNo && r.serialNo.trim().toUpperCase() === record.serialNo.trim().toUpperCase()) {
        return {
          ...r,
          color: record.oldColor || r.color,
          oldColor: undefined,
          isColorChanged: false,
          colorChangeDate: undefined
        };
      }
      return r;
    });

    setOqcRecords(updatedOqc);
    safeStorage.setItem('dk_oqc_records', JSON.stringify(updatedOqc));
    try {
      localStorage.setItem('dk_oqc_records_is_dirty', 'true');
    } catch (e) {}
    if (typeof (window as any).syncToServer === 'function') {
      (window as any).syncToServer('dk_oqc_records', updatedOqc);
    }
  };

  // Export Color Change CSV
  const handleExportColorChangeCSV = () => {
    const csvHeaders = ["STT", "Số Sêri", "Dòng xe (Model)", "Màu gốc (Cũ)", "Màu mới (Sau đổi)", "Ngày đổi màu", "Trạng thái"];
    const csvContent = filteredColorChanges.map((r, i) => [
      i + 1,
      r.serialNo,
      r.model,
      r.oldColor,
      r.newColor,
      r.date,
      r.flag ? 'Đã đổi' : 'Đang xử lý'
    ]);
    let csvString = "\uFEFF" + [csvHeaders.join(","), ...csvContent.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Danh_Sach_Xe_Doi_Mau_KCS_DKBike_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Bulk Excel import submit handler
  const handleImportColorChangeSubmit = (e: FormEvent) => {
    e.preventDefault();
    setColorChangeError('');

    const validItems = liveParsedColorChanges.filter(p => p.isValid);
    if (validItems.length === 0) {
      setColorChangeError('Không tìm thấy dòng dữ liệu hợp lệ nào. Vui lòng kiểm tra lại định dạng: Số Sêri | Model & Màu Cũ | Model & Màu Mới | Ngày đổi');
      return;
    }

    try {
      const serialChangeMap = new Map<string, typeof validItems[0]>();
      validItems.forEach(item => {
        serialChangeMap.set(item.serialNo.trim().toUpperCase(), item);
      });

      // 1. Update OQC records
      const existingSerials = new Set<string>();
      const updatedOqc = oqcRecords.map(r => {
        const sUpper = (r.serialNo || '').trim().toUpperCase();
        existingSerials.add(sUpper);
        const change = serialChangeMap.get(sUpper);
        if (change) {
          const isStatusChanged = Boolean(change.oldModel && change.newModel && change.oldModel.toLowerCase().trim() !== change.newModel.toLowerCase().trim());
          const isColorChanged = Boolean(change.oldColor && change.newColor && change.oldColor.toLowerCase().trim() !== change.newColor.toLowerCase().trim());
          return {
            ...r,
            model: change.newModel || change.model || r.model,
            color: change.newColor || r.color,
            oldModel: change.oldModel || r.oldModel || r.model,
            oldColor: change.oldColor || r.oldColor || r.color,
            isColorChanged: isColorChanged || r.isColorChanged,
            isStatusChanged: isStatusChanged || r.isStatusChanged,
            colorChangeDate: change.date
          };
        }
        return r;
      });

      // Insert any serials that did not exist yet in OQC
      const newOqcFromChanges: OQCRecord[] = [];
      validItems.forEach(item => {
        const sUpper = item.serialNo.trim().toUpperCase();
        if (!existingSerials.has(sUpper)) {
          const isStatusChanged = Boolean(item.oldModel && item.newModel && item.oldModel.toLowerCase().trim() !== item.newModel.toLowerCase().trim());
          const isColorChanged = Boolean(item.oldColor && item.newColor && item.oldColor.toLowerCase().trim() !== item.newColor.toLowerCase().trim());
          newOqcFromChanges.push({
            id: `OQC-${sUpper.replace(/[\/\s.#$\[\]]/g, '_')}`,
            partCode: 'TEM-GEN',
            serialNo: item.serialNo.trim(),
            model: item.newModel || item.model,
            color: item.newColor,
            oldModel: item.oldModel || item.model,
            oldColor: item.oldColor,
            isColorChanged: isColorChanged,
            isStatusChanged: isStatusChanged,
            colorChangeDate: item.date,
            status: 'Đạt',
            defectDetail: '',
            failedCount: 0,
            rootCause: '',
            lsx: '26-10',
            checkTime: '08:30',
            date: item.date,
            month: parseInt(item.date.split('/')[1] || '5', 10),
            year: parseInt(item.date.split('/')[2] || '2026', 10),
            totalLlr: 1
          });
        }
      });

      const finalOqc = [...newOqcFromChanges, ...updatedOqc];

      // 2. Add records to oqcColorChanges
      const newColorChangeRecords: OqcColorChangeRecord[] = validItems.map(item => ({
        id: `CC-${item.serialNo.trim().toUpperCase()}-${item.date.replace(/\//g, '')}-${Date.now()}`,
        serialNo: item.serialNo.trim(),
        model: item.newModel || item.model,
        oldModel: item.oldModel || item.model,
        newModel: item.newModel || item.model,
        oldColor: item.oldColor,
        newColor: item.newColor,
        changeType: item.changeType,
        date: item.date,
        flag: item.flag,
        createdAt: new Date().toISOString()
      }));

      const mergedChanges = [
        ...newColorChangeRecords,
        ...activeColorChanges.filter(c => 
          !validItems.some(v => v.serialNo.trim().toUpperCase() === c.serialNo.trim().toUpperCase() && v.date === c.date)
        )
      ];

      // 3. PERSIST ONCE: Single disk write & Single Cloud sync
      setOqcRecords(finalOqc);
      updateColorChanges(mergedChanges);
      safeStorage.setItem('dk_oqc_records', JSON.stringify(finalOqc));
      try {
        localStorage.setItem('dk_oqc_records_is_dirty', 'true');
      } catch (e) {}

      if (typeof (window as any).syncToServer === 'function') {
        (window as any).syncToServer('dk_oqc_records', finalOqc);
      }

      const statusChangesCount = validItems.filter(v => v.changeType === 'status' || v.changeType === 'both').length;
      const colorChangesCount = validItems.filter(v => v.changeType === 'color' || v.changeType === 'both').length;

      setShowColorChangeModal(false);
      setColorChangeText('');
      alert(`✓ Đã nạp & lưu thành công ${validItems.length} xe chuyển đổi!\n\n• Đổi trạng thái / Model: ${statusChangesCount} xe\n• Đổi màu sơn: ${colorChangesCount} xe\n\n(Dữ liệu đã tự động cập nhật vào OQC và đẩy lên Cloud an toàn)`);
    } catch (err: any) {
      setColorChangeError(`Lỗi khi lưu dữ liệu: ${err.message || err}`);
    }
  };

  // Robust classification helper for color vs status shifts (with fallbacks for legacy records)
  const getChangeClassification = useCallback((item: OqcColorChangeRecord) => {
    const oldModel = (item.oldModel || '').trim();
    const newModel = (item.newModel || item.model || '').trim();
    const oldColor = (item.oldColor || '').trim();
    const newColor = (item.newColor || '').trim();

    const isModelDiff = Boolean(oldModel && newModel && oldModel.toLowerCase() !== newModel.toLowerCase());
    const isColorDiff = Boolean(oldColor && newColor && oldColor.toLowerCase() !== newColor.toLowerCase());

    let isStatusShift = false;
    let isColorShift = false;

    if (item.changeType === 'both') {
      isStatusShift = true;
      isColorShift = true;
    } else if (item.changeType === 'status') {
      isStatusShift = true;
      isColorShift = isColorDiff;
    } else if (item.changeType === 'color') {
      isColorShift = true;
      isStatusShift = isModelDiff;
    } else if (isModelDiff && isColorDiff) {
      isStatusShift = true;
      isColorShift = true;
    } else if (isModelDiff) {
      isStatusShift = true;
      isColorShift = false;
    } else if (isColorDiff) {
      isColorShift = true;
      isStatusShift = false;
    } else if (oldColor && newColor && oldColor.toLowerCase() === newColor.toLowerCase()) {
      // Same color but has record -> it was a status/model change!
      isStatusShift = true;
      isColorShift = false;
    } else {
      isColorShift = true;
    }

    return {
      isStatusShift,
      isColorShift,
      displayOldModel: oldModel || item.model,
      displayNewModel: newModel || item.model,
      displayOldColor: oldColor || 'Tiêu chuẩn',
      displayNewColor: newColor || oldColor || 'Tiêu chuẩn'
    };
  }, []);

  // Filtered color & status changes for the Subtab
  const filteredColorChanges = useMemo(() => {
    return activeColorChanges.filter(c => {
      if (colorChangeSearchText.trim()) {
        const q = colorChangeSearchText.trim().toLowerCase();
        const match = (c.serialNo || '').toLowerCase().includes(q) ||
                      (c.model || '').toLowerCase().includes(q) ||
                      (c.oldModel || '').toLowerCase().includes(q) ||
                      (c.newModel || '').toLowerCase().includes(q) ||
                      (c.oldColor || '').toLowerCase().includes(q) ||
                      (c.newColor || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (colorChangeFilterModel !== 'Tất cả') {
        const itemModel = c.newModel || c.model || c.oldModel;
        if (itemModel !== colorChangeFilterModel && c.oldModel !== colorChangeFilterModel && c.model !== colorChangeFilterModel) {
          return false;
        }
      }
      if (colorChangeFilterOldColor !== 'Tất cả' && c.oldColor !== colorChangeFilterOldColor) return false;
      if (colorChangeFilterNewColor !== 'Tất cả' && c.newColor !== colorChangeFilterNewColor) return false;
      if (colorChangeFilterDate !== 'Tất cả' && c.date !== colorChangeFilterDate) return false;
      if (colorChangeFilterMonth !== 'Tất cả') {
        const m = c.date ? c.date.split('/')[1] : '';
        if (parseInt(m, 10) !== parseInt(colorChangeFilterMonth, 10)) return false;
      }
      if (colorChangeFilterYear !== 'Tất cả') {
        const y = c.date ? c.date.split('/')[2] : '';
        if (y !== colorChangeFilterYear) return false;
      }
      return true;
    });
  }, [activeColorChanges, colorChangeSearchText, colorChangeFilterModel, colorChangeFilterOldColor, colorChangeFilterNewColor, colorChangeFilterDate, colorChangeFilterMonth, colorChangeFilterYear]);

  // Unique filter options for Color Change subtab
  const uniqueColorChangeModels = useMemo(() => {
    const set = new Set<string>();
    activeColorChanges.forEach(c => {
      if (c.newModel) set.add(c.newModel);
      if (c.oldModel) set.add(c.oldModel);
      if (c.model) set.add(c.model);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [activeColorChanges]);

  const uniqueColorChangeOldColors = useMemo(() => Array.from(new Set(activeColorChanges.map(c => c.oldColor).filter(Boolean))).sort(), [activeColorChanges]);
  const uniqueColorChangeNewColors = useMemo(() => Array.from(new Set(activeColorChanges.map(c => c.newColor).filter(Boolean))).sort(), [activeColorChanges]);
  const uniqueColorChangeDates = useMemo(() => {
    const dates = Array.from(new Set(activeColorChanges.map(c => c.date).filter(Boolean))) as string[];
    return dates.sort((a, b) => {
      const pA = a.split('/');
      const pB = b.split('/');
      if (pA.length === 3 && pB.length === 3) {
        const tA = new Date(parseInt(pA[2], 10), parseInt(pA[1], 10) - 1, parseInt(pA[0], 10)).getTime();
        const tB = new Date(parseInt(pB[2], 10), parseInt(pB[1], 10) - 1, parseInt(pB[0], 10)).getTime();
        return tB - tA; // Newest first
      }
      return b.localeCompare(a);
    });
  }, [activeColorChanges]);
  const uniqueColorChangeMonths = useMemo(() => Array.from(new Set(activeColorChanges.map(c => c.date ? parseInt(c.date.split('/')[1] || '0', 10) : null).filter(Boolean))).sort((a, b) => Number(a) - Number(b)), [activeColorChanges]);
  const uniqueColorChangeYears = useMemo(() => Array.from(new Set(activeColorChanges.map(c => c.date ? c.date.split('/')[2] : null).filter(Boolean))).sort(), [activeColorChanges]);

  // Color & Status Shift Dashboard KPI Stats (Dynamically re-calculated based on filteredColorChanges)
  const colorChangeDashboardStats = useMemo(() => {
    const total = filteredColorChanges.length;
    let colorShiftCount = 0;
    let statusShiftCount = 0;
    let bothShiftCount = 0;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    let thisMonthCount = 0;
    const modelsSet = new Set<string>();

    filteredColorChanges.forEach(item => {
      const cls = getChangeClassification(item);

      if (cls.isStatusShift && cls.isColorShift) {
        bothShiftCount++;
        colorShiftCount++;
        statusShiftCount++;
      } else if (cls.isStatusShift) {
        statusShiftCount++;
      } else {
        colorShiftCount++;
      }

      const m = cls.displayNewModel || cls.displayOldModel;
      if (m) modelsSet.add(m);

      if (item.date) {
        const parts = item.date.split('/');
        if (parts.length >= 3) {
          const mPart = parseInt(parts[1], 10);
          const yPart = parseInt(parts[2], 10);
          if (mPart === currentMonth && yPart === currentYear) {
            thisMonthCount++;
          }
        }
      }
    });

    return {
      total,
      colorShiftCount,
      statusShiftCount,
      bothShiftCount,
      uniqueModels: modelsSet.size,
      thisMonthCount
    };
  }, [filteredColorChanges, getChangeClassification]);

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-10rem)] pr-2 animate-in fade-in duration-300" id="view_quality_inspection_content">
      
      {/* Header Action panel */}
      <div className="bg-white p-3 sm:p-3.5 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <Wrench className="w-4 h-4 text-emerald-600 animate-pulse" />
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-800">
              Hồ Sơ Nghiệp Vụ & Nhập Liệu Chất Lượng IQC - PQC - OQC
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Cơ sở dữ liệu kiểm nhập linh kiện đầu vào, giám sát lắp ráp công đoạn và nghiệm thu xe thành phẩm KCS liên kết báo cáo chu kỳ thông minh.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {qcMainSubTab === 'iqc' && (
            <div className="flex flex-wrap gap-1.5">
              <button 
                onClick={() => setShowAddIqcModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] sm:text-xs px-3 py-1.5 rounded-lg transition shadow flex items-center gap-1.5 shadow-emerald-200 cursor-pointer border border-emerald-600"
              >
                <Plus className="w-3.5 h-3.5 text-white" /> Thêm Phiếu IQC Mới
              </button>
              <button 
                onClick={() => setShowAqlCalculator(!showAqlCalculator)}
                className={`font-bold text-[11px] sm:text-xs px-2.5 py-1.5 rounded-lg transition shadow flex items-center gap-1.5 cursor-pointer border ${
                  showAqlCalculator ? 'bg-indigo-800 text-amber-300 border-amber-400' : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> 📊 Tra Cứu AQL ISO 2859-1
              </button>
              <button 
                onClick={() => setShowEcountSyncModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] sm:text-xs px-2.5 py-1.5 rounded-lg transition shadow flex items-center gap-1.5 shadow-indigo-200 animate-pulse cursor-pointer border border-indigo-500"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-ping"></span>
                🔗 Nhập từ Ecount.com
              </button>
            </div>
          )}
          {qcMainSubTab === 'pqc' && (
            <button 
              onClick={() => setShowAddPqcModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] sm:text-xs px-2.5 py-1.5 rounded-lg transition shadow flex items-center gap-1.5 shadow-indigo-200 cursor-pointer border border-indigo-600"
            >
              <Plus className="w-3.5 h-3.5" /> Ghi Nhận Sự Cố PQC
            </button>
          )}
          {qcMainSubTab === 'color_change' && (
            <div className="flex items-center gap-2">
              <button 
                id="btn-scan-color-change"
                onClick={() => {
                  setScanError('');
                  setScanLastSuccess(null);
                  setShowScanColorChangeModal(true);
                  setTimeout(() => scannerInputRef.current?.focus(), 150);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs shadow-purple-200"
                title="Bật chế độ quét mã sêri bằng máy quét hoặc camera"
              >
                <QrCode className="w-3.5 h-3.5 text-white" /> 🔫 Quét mã Sêri
              </button>
              <button 
                id="btn-import-color-change-excel"
                onClick={() => {
                  setColorChangeError('');
                  setShowColorChangeModal(true);
                }}
                className="bg-white hover:bg-purple-50 text-purple-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-purple-200 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Dán danh sách xe đổi màu hàng loạt từ file Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" /> 📋 Nhập từ Excel
              </button>
            </div>
          )}
          {qcMainSubTab === 'supplier_monitoring' && (
            <button 
              onClick={() => {
                if (suppliers && suppliers.length > 0) {
                  setNewAuditSupplierName(suppliers[0].name || suppliers[0].SupplierName || 'Công ty Việt Nhật Precision');
                }
                setShowAddSupplierAuditModal(true);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] sm:text-xs px-2.5 py-1.5 rounded-lg transition shadow flex items-center gap-1.5 shadow-orange-200 animate-pulse cursor-pointer border border-orange-600"
            >
              <Plus className="w-3.5 h-3.5" /> Kích hoạt Giám sát NCC
            </button>
          )}
          <button 
            onClick={() => {
              if (qcMainSubTab === 'reports') {
                setShowExportKcsReportModal(true);
              } else if (qcMainSubTab === 'iqc') {
                handleExportIqcCSV();
              } else if (qcMainSubTab === 'pqc') {
                handleExportPqcCSV();
              } else if (qcMainSubTab === 'oqc') {
                handleExportOqcCSV();
              } else if (qcMainSubTab === 'color_change') {
                handleExportColorChangeCSV();
              } else {
                alert('Hồ sơ xuất Excel giám sát nhà cung cấp đang đồng bộ trực tiếp lên server.');
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] sm:text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-emerald-500"
            title="Xuất dữ liệu hoặc mở popup kết xuất báo cáo"
          >
            <Download className="w-3.5 h-3.5 text-white" /> {qcMainSubTab === 'reports' ? 'Xuất & In Báo Cáo' : 'Xuất Excel dữ liệu'}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs Switch */}
      <div className="flex border-b border-slate-200 gap-1 sm:gap-1.5 bg-slate-100/90 p-1 sm:p-1.5 rounded-xl shadow-xs">
        <button
          id="subtab-btn-iqc"
          onClick={() => setQcMainSubTab('iqc')}
          className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-3 text-center text-xs sm:text-sm font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            qcMainSubTab === 'iqc'
              ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100'
              : 'text-slate-600 hover:text-emerald-900 hover:bg-white/50'
          }`}
        >
          <Building2 className="w-4 h-4 text-emerald-600" />
          <span>IQC ({iqcRecords.length})</span>
        </button>
        <button
          id="subtab-btn-pqc"
          onClick={() => setQcMainSubTab('pqc')}
          className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-3 text-center text-xs sm:text-sm font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            qcMainSubTab === 'pqc'
              ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100'
              : 'text-slate-600 hover:text-indigo-900 hover:bg-white/50'
          }`}
        >
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>PQC ({pqcRecords.length})</span>
        </button>
        <button
          id="subtab-btn-oqc"
          onClick={() => setQcMainSubTab('oqc')}
          className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-3 text-center text-xs sm:text-sm font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            qcMainSubTab === 'oqc'
              ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
              : 'text-slate-600 hover:text-blue-900 hover:bg-white/50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>OQC ({oqcRecords.length})</span>
        </button>
        <button
          id="subtab-btn-color-change"
          onClick={() => setQcMainSubTab('color_change')}
          className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-3 text-center text-xs sm:text-sm font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            qcMainSubTab === 'color_change'
              ? 'bg-white text-purple-700 shadow-sm border border-purple-100'
              : 'text-slate-600 hover:text-purple-900 hover:bg-white/50'
          }`}
        >
          <RefreshCw className="w-4 h-4 text-purple-600" />
          <span>Đổi màu xe ({activeColorChanges.length})</span>
        </button>
        <button
          id="subtab-btn-sqc"
          onClick={() => setQcMainSubTab('supplier_monitoring')}
          className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-3 text-center text-xs sm:text-sm font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            qcMainSubTab === 'supplier_monitoring'
              ? 'bg-white text-orange-700 shadow-sm border border-orange-100'
              : 'text-slate-600 hover:text-orange-900 hover:bg-white/50'
          }`}
        >
          <Users className="w-4 h-4 text-orange-600 animate-pulse" />
          <span>SQC ({supplierProductionAudits.length})</span>
        </button>
        <button
          id="subtab-btn-reports"
          onClick={() => setQcMainSubTab('reports')}
          className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-3 text-center text-xs sm:text-sm font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            qcMainSubTab === 'reports'
              ? 'bg-indigo-650 text-white shadow-sm border border-indigo-500'
              : 'text-slate-600 hover:text-indigo-900 hover:bg-white/50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          <span>Báo cáo chu kỳ</span>
        </button>
      </div>

      {/* ==================== SUBTAB: IQC ==================== */}
      {qcMainSubTab === 'iqc' && (
        <div className="space-y-4">
          {renderActivePlanTargetsBanner('IQC')}

          {/* Interactive AQL Quick Calculator Panel */}
          {showAqlCalculator && (
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xl border border-indigo-500/30 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between items-center pb-3 border-b border-indigo-800/60 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-600/30 rounded-lg border border-indigo-400/40">
                    <ShieldCheck className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white tracking-wide uppercase flex items-center gap-2">
                      Công cụ Tra Cứu & Tính Toán Lấy Mẫu IQC theo AQL ISO 2859-1 / ANSI Z1.4
                    </h3>
                    <p className="text-[11px] text-indigo-200">
                      Tra cứu mã chữ cái, cỡ mẫu trích kiểm tiêu chuẩn và ngưỡng chấp nhận (Ac) / bác bỏ (Re) cho linh kiện đầu vào DKBike.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAqlCalculator(false)}
                  className="text-slate-400 hover:text-white p-1.5 text-xs font-bold rounded-lg border border-slate-700 hover:border-slate-500 transition cursor-pointer"
                >
                  ✕ Đóng
                </button>
              </div>

              {(() => {
                const calcResult = calculateAQLSample(calcAqlLotSize, 0, calcAqlLevel, calcAqlInspectionLevel);
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/60 p-3 rounded-xl border border-indigo-900/50">
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1">1. Nhập Quy Mô Lô Hàng (SL Lô)</label>
                        <input
                          type="number"
                          value={calcAqlLotSize}
                          onChange={(e) => setCalcAqlLotSize(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-slate-800 border border-indigo-700/60 rounded-lg p-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-indigo-400"
                        />
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {[50, 100, 250, 500, 1000, 2500, 5000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setCalcAqlLotSize(preset)}
                              className={`text-[9.5px] px-2 py-0.5 rounded font-mono font-bold cursor-pointer transition ${
                                calcAqlLotSize === preset ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                            >
                              {preset.toLocaleString('vi-VN')}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1">2. Chọn Cấp Kiểm Tra (Inspection Level)</label>
                        <select
                          value={calcAqlInspectionLevel}
                          onChange={(e) => setCalcAqlInspectionLevel(e.target.value as InspectionLevel)}
                          className="w-full bg-slate-800 border border-indigo-700/60 rounded-lg p-2 text-white font-bold text-xs focus:outline-none focus:border-indigo-400 cursor-pointer"
                        >
                          <option value="I">Cấp I - Lấy mẫu giảm (Linh kiện chất lượng cao)</option>
                          <option value="II">Cấp II - Kiểm tra thường (Mặc định DKBike QMS)</option>
                          <option value="III">Cấp III - Kiểm tra thắt chặt (NCC rủi ro cao)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1">3. Ngưỡng AQL Chấp Nhận (Acceptable Quality Limit)</label>
                        <select
                          value={calcAqlLevel}
                          onChange={(e) => setCalcAqlLevel(Number(e.target.value) as AQLLevel)}
                          className="w-full bg-slate-800 border border-indigo-700/60 rounded-lg p-2 text-white font-bold text-xs focus:outline-none focus:border-indigo-400 cursor-pointer"
                        >
                          <option value={0.65}>AQL 0.65 - Rất nghiêm ngặt (Linh kiện an toàn)</option>
                          <option value={1.0}>AQL 1.0 - Nghiêm ngặt (Động cơ, Pin, IC, Cụm phanh)</option>
                          <option value={1.5}>AQL 1.5 - Chuẩn DK QMS (Sườn, Lốp, Còi, Dây điện)</option>
                          <option value={2.5}>AQL 2.5 - Phổ thông (Nhựa mạ, Tem nhãn, Ốc vít)</option>
                          <option value={4.0}>AQL 4.0 - Cho phép phế phẩm nhẹ (Bao bì, Carton)</option>
                        </select>
                      </div>
                    </div>

                    {/* Result Card */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 p-3.5 rounded-xl border border-indigo-500/40">
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-indigo-500/30 text-center">
                        <span className="text-[10px] text-indigo-300 block uppercase font-sans font-bold">Mã Chữ Cái AQL</span>
                        <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">Mã {calcResult.codeLetter}</span>
                      </div>

                      <div className="bg-slate-900/80 p-3 rounded-lg border border-emerald-500/30 text-center">
                        <span className="text-[10px] text-emerald-300 block uppercase font-sans font-bold">Số Lượng Mẫu Lấy Kiểm</span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">{calcResult.sampleSize.toLocaleString('vi-VN')} <span className="text-xs font-normal">sp</span></span>
                      </div>

                      <div className="bg-slate-900/80 p-3 rounded-lg border border-emerald-500/30 text-center">
                        <span className="text-[10px] text-emerald-300 block uppercase font-sans font-bold">Chấp Nhận (Ac)</span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">Ac ≤ {calcResult.ac}</span>
                        <span className="text-[9px] text-emerald-300 block font-sans">≤ {calcResult.ac} lỗi ➔ Lô Đạt</span>
                      </div>

                      <div className="bg-slate-900/80 p-3 rounded-lg border border-red-500/30 text-center">
                        <span className="text-[10px] text-red-300 block uppercase font-sans font-bold">Bác Bỏ (Re)</span>
                        <span className="text-xl sm:text-2xl font-black text-red-400 font-mono">Re ≥ {calcResult.re}</span>
                        <span className="text-[9px] text-red-300 block font-sans">≥ {calcResult.re} lỗi ➔ Bác bỏ lô</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          {(() => {
            const isIqcFiltered = iqcFilterMonth !== 'All' || iqcFilterSupplier !== 'All' || iqcFilterResult !== 'All' || iqcFilterWeek !== 'All' || iqcSearch.trim() !== '';
            const totalFilteredLots = filteredIqc.length;
            const totalLotsAll = iqcRecords.length;
            
            // Defective lots in filtered set
            const failedFilteredLots = filteredIqc.filter(r => r.result === 'Lỗi' || (r.failedQty !== undefined && r.failedQty > 0)).length;
            const passedFilteredLots = totalFilteredLots - failedFilteredLots;
            
            // 1. Calculate pass rate by lot/ticket
            const passRateLot = totalFilteredLots > 0 ? Math.round((passedFilteredLots / totalFilteredLots) * 100) : 100;

            // Total components checked and total defective components in filtered set
            const totalQtySum = filteredIqc.reduce((sum, r) => sum + (r.totalQty || 0), 0);
            const failedQtySum = filteredIqc.reduce((sum, r) => sum + (r.failedQty || 0), 0);
            const passedQtySum = Math.max(0, totalQtySum - failedQtySum);

            // 2. Calculate pass rate by piece quantity (chi tiết)
            const passRateQty = totalQtySum > 0 ? (Math.round((passedQtySum / totalQtySum) * 1000) / 10) : 100;

            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {/* Card 1: Total Lots */}
                <div className="bg-white p-3 sm:p-4.5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:border-slate-300">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase leading-tight block">
                      Tổng số lô hàng nhập kiểm
                    </span>
                    {isIqcFiltered && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                        Đã lọc
                      </span>
                    )}
                  </div>
                  <span className="text-lg sm:text-xl font-black text-slate-800 font-mono mt-0.5 sm:mt-1 block">
                    {totalFilteredLots.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-500">phiếu</span>
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 flex justify-between items-center">
                    <span>Quy mô: <strong className="font-mono text-slate-700">{totalQtySum.toLocaleString('vi-VN')}</strong> sp</span>
                    {isIqcFiltered && (
                      <span className="text-[9.5px] text-emerald-600 font-bold">({totalFilteredLots}/{totalLotsAll} tổng lô)</span>
                    )}
                  </p>
                </div>

                {/* Card 2: Defective Lots / Defective Components */}
                <div className="bg-white p-3 sm:p-4.5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:border-red-200">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase leading-tight block">
                      Linh kiện có lỗi
                    </span>
                    {failedFilteredLots > 0 && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                        Phát hiện lỗi
                      </span>
                    )}
                  </div>
                  <span className="text-lg sm:text-xl font-black text-red-500 font-mono mt-0.5 sm:mt-1 block">
                    {failedFilteredLots.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-red-400">lô hàng</span>
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 flex justify-between items-center">
                    <span>Số linh kiện hỏng: <strong className="font-mono text-red-600">{failedQtySum.toLocaleString('vi-VN')}</strong> sp</span>
                    {failedFilteredLots === 0 && (
                      <span className="text-[9.5px] text-emerald-600 font-bold">✓ 0 lô lỗi</span>
                    )}
                  </p>
                </div>

                {/* Card 3: Pass rate by Lot / Ticket */}
                <div className="bg-white p-3 sm:p-4.5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:border-emerald-200">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase leading-tight block">
                      Tỉ lệ Đạt IQC (theo Lô)
                    </span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${passRateLot >= 95 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {passRateLot >= 95 ? 'Đạt chỉ tiêu' : 'Cần cải thiện'}
                    </span>
                  </div>
                  <span className={`text-lg sm:text-xl font-black font-mono mt-0.5 sm:mt-1 block ${passRateLot >= 95 ? 'text-emerald-600' : passRateLot >= 85 ? 'text-amber-600' : 'text-red-500'}`}>
                    {passRateLot}%
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 flex justify-between items-center">
                    <span>Nghiệm thu: <strong className="font-mono text-emerald-600">{passedFilteredLots}</strong>/{totalFilteredLots} lô Đạt</span>
                    <span className="text-[9.5px] font-bold text-slate-400">
                      Target: ≥95%
                    </span>
                  </p>
                </div>

                {/* Card 4: Pass rate by Piece Quantity (Số lượng chi tiết) */}
                <div className="bg-white p-3 sm:p-4.5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:border-indigo-200">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase leading-tight block">
                      Tỉ lệ Đạt IQC (theo Chi tiết)
                    </span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${passRateQty >= 98 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {passRateQty >= 98 ? 'Đạt tiêu chuẩn' : 'Cần kiểm soát'}
                    </span>
                  </div>
                  <span className={`text-lg sm:text-xl font-black font-mono mt-0.5 sm:mt-1 block ${passRateQty >= 98 ? 'text-indigo-600' : passRateQty >= 95 ? 'text-amber-600' : 'text-red-500'}`}>
                    {passRateQty}%
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 flex justify-between items-center">
                    <span>Số lượng: <strong className="font-mono text-indigo-600">{passedQtySum.toLocaleString('vi-VN')}</strong>/{totalQtySum.toLocaleString('vi-VN')} sp</span>
                    <span className="text-[9.5px] font-bold text-slate-400">
                      Target: ≥98%
                    </span>
                  </p>
                </div>
              </div>
            );
          })()}

          <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-slate-200 space-y-3 sm:space-y-4">
            {/* Elegant QC Filter Controls Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                <h4 className="text-[11px] font-black uppercase text-slate-700 tracking-wider">Bộ lọc tìm kiếm IQC</h4>
              </div>
              <div className="flex items-center gap-2">
                {(iqcFilterMonth !== 'All' || iqcFilterSupplier !== 'All' || iqcFilterResult !== 'All' || iqcFilterWeek !== 'All' || iqcSearch !== '') && (
                  <button
                     type="button"
                     onClick={() => {
                       setIqcFilterMonth('All');
                       setIqcFilterSupplier('All');
                       setIqcFilterResult('All');
                       setIqcFilterWeek('All');
                       setIqcSearch('');
                     }}
                     className="text-[9px] sm:text-[10px] bg-red-50 text-red-655 hover:bg-red-100 border border-red-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 mr-2"
                  >
                    ✕ Nhập lại bộ lọc (Reset)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsIqcFilterExpanded(!isIqcFilterExpanded)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {isIqcFilterExpanded ? (
                    <>Thu nhỏ bộ lọc <ChevronUp className="w-3.5 h-3.5" /></>
                  ) : (
                    <>Mở rộng bộ lọc <ChevronDown className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>
            </div>

            {isIqcFilterExpanded && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 bg-slate-50 p-2.5 sm:p-4 rounded-xl border border-slate-100 transition-all">
                <div className="col-span-2 md:col-span-1 space-y-0.5 sm:space-y-1">
                  <label className="text-[8.5px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Search className="w-3 h-3 text-emerald-500" /> Từ khóa tìm kiếm
                  </label>
                  <input 
                    type="text"
                    value={iqcSearch}
                    onChange={(e) => setIqcSearch(e.target.value)}
                    placeholder="Tra cứu nhà cung cấp, nội dung, mã..."
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 sm:py-2 text-xs focus:outline-none focus:border-emerald-600 font-bold"
                  />
                </div>

                <div className="col-span-1 space-y-0.5 sm:space-y-1">
                  <label className="text-[8.5px] sm:text-[10px] font-bold text-slate-550 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-500" /> Tháng kiểm tra
                  </label>
                  <select
                    value={iqcFilterMonth}
                    onChange={(e) => setIqcFilterMonth(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 sm:py-2 text-xs focus:outline-none focus:border-emerald-600 font-bold text-slate-700 pointer-events-auto cursor-pointer"
                  >
                    <option value="All">Tất cả các tháng</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m.toString()}>Tháng {m}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 space-y-0.5 sm:space-y-1">
                  <label className="text-[8.5px] sm:text-[10px] font-bold text-slate-550 uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-emerald-500" /> Nhà cung cấp ({uniqueIqcSuppliers.length})
                  </label>
                  <select
                    value={iqcFilterSupplier}
                    onChange={(e) => setIqcFilterSupplier(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 sm:py-2 text-xs focus:outline-none focus:border-emerald-600 font-bold text-slate-700 pointer-events-auto cursor-pointer"
                  >
                    <option value="All">Tất cả nhà cung cấp</option>
                    {uniqueIqcSuppliers.map((sup, idx) => (
                      <option key={`${sup}-${idx}`} value={sup}>{sup}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 space-y-0.5 sm:space-y-1">
                  <label className="text-[8.5px] sm:text-[10px] font-bold text-slate-550 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" /> Kết quả kiểm tra
                  </label>
                  <select
                    value={iqcFilterResult}
                    onChange={(e) => setIqcFilterResult(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 sm:py-2 text-xs focus:outline-none focus:border-emerald-600 font-bold text-slate-700 pointer-events-auto cursor-pointer"
                  >
                    <option value="All">Tất cả kết quả</option>
                    <option value="Đạt">Lô hàng Đạt</option>
                    <option value="Lỗi">Chỉ lô có Lỗi</option>
                  </select>
                </div>

                <div className="col-span-1 space-y-0.5 sm:space-y-1">
                  <label className="text-[8.5px] sm:text-[10px] font-bold text-slate-550 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-500" /> Tuần làm việc
                  </label>
                  <select
                    value={iqcFilterWeek}
                    onChange={(e) => setIqcFilterWeek(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 sm:py-2 text-xs focus:outline-none focus:border-emerald-600 font-bold text-slate-700 pointer-events-auto cursor-pointer"
                  >
                    <option value="All">Tất cả các tuần (T1-T5)</option>
                    <option value="T1">Tuần 1 (T1)</option>
                    <option value="T2">Tuần 2 (T2)</option>
                    <option value="T3">Tuần 3 (T3)</option>
                    <option value="T4">Tuần 4 (T4)</option>
                    <option value="T5">Tuần 5 (T5)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* IQC Bulk Action Indicator Bar */}
          {selectedIqcIds.length > 0 && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl p-3 text-red-900 font-sans shadow-xs animate-in fade-in duration-200 mt-4 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-bold">Đang chọn {selectedIqcIds.length} bản ghi IQC</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIqcIds([])}
                  className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer"
                >
                  Bỏ chọn
                </button>
                <button
                  type="button"
                  onClick={handleBulkDeleteIqc}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa hàng loạt ({selectedIqcIds.length})
                </button>
              </div>
            </div>
          )}

          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10.5px] sm:text-[11px] md:text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b text-slate-500 font-extrabold text-[9px] sm:text-[9.5px] md:text-[10px] uppercase">
                    <th className="py-2 px-1.5 md:p-2.5 w-8 md:w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredIqc.length > 0 && filteredIqc.every(r => selectedIqcIds.includes(r.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const allFilteredIds = filteredIqc.map(r => r.id);
                            setSelectedIqcIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
                          } else {
                            const allFilteredIds = filteredIqc.map(r => r.id);
                            setSelectedIqcIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                      />
                    </th>
                    <th className="py-2 px-1.5 md:p-2.5 w-10 md:w-12 text-center">Mã</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-16 md:w-20 text-center">Ngày</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-36 md:w-56 lg:w-64 min-w-[130px] md:min-w-[180px]">Nhà cung cấp</th>
                    <th className="py-2 px-1.5 md:p-2.5 min-w-[170px] md:min-w-[260px]">Quy cách hàng hóa</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-12 md:w-16 text-right">Tổng SL</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-12 md:w-16 text-right">Mẫu</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-14 md:w-20 text-center">KCS</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-12 md:w-16 text-right text-red-500">Lỗi</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-10 md:w-14 text-right">% Lỗi</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-32 md:w-48 lg:w-56 min-w-[120px] md:min-w-[180px] text-left">Tên mặt hàng (Tóm tắt)</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-14 md:w-18 text-center">Kết Quả</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-14 md:w-18 text-center">T.tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIqc.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-6 text-center text-slate-400 italic">
                        Không tìm thấy bản ghi kiểm nhập IQC nào tương ứng với bộ lọc đã chọn.
                      </td>
                    </tr>
                  ) : (
                    paginatedIqc.map((r, i) => (
                      <tr key={r.id || i} className="hover:bg-slate-50/60 transition">
                        <td className="py-2 px-1.5 md:p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIqcSet.has(r.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIqcIds(prev => [...prev, r.id]);
                              } else {
                                setSelectedIqcIds(prev => prev.filter(id => id !== r.id));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                          />
                        </td>
                        <td className="py-2 px-1.5 md:p-2.5 text-center font-bold text-slate-500 font-mono text-[10px] md:text-xs">
                          <button
                            type="button"
                            onClick={() => setViewDetailModal?.({ type: 'iqc_record', data: r })}
                            className="text-indigo-650 hover:underline hover:text-indigo-800 font-bold font-mono cursor-pointer text-[10px] md:text-xs"
                            title="Click xem chi tiết"
                          >
                            {r.id}
                          </button>
                        </td>
                        <td className="py-2 px-1.5 md:p-2.5 text-slate-600 font-semibold text-center whitespace-nowrap text-[10px] md:text-xs">{r.date}</td>
                        <td className="py-2 px-1.5 md:p-2.5">
                          <span className="font-extrabold text-slate-850 block leading-tight text-[10.5px] sm:text-[11px] md:text-xs">{r.supplierName}</span>
                          <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold tracking-wider">{r.supplierId}</span>
                        </td>
                        <td className="py-2 px-1.5 md:p-2.5 space-y-0.5">
                          <p className="font-semibold text-slate-700 leading-tight text-[10.5px] sm:text-[11px] md:text-xs">{r.content}</p>
                          {r.defectDetail && (
                            <span className="text-[9px] sm:text-[10px] text-red-500 block bg-red-50/50 p-1 rounded border border-red-100 leading-normal">
                              <b>Phát hiện:</b> {r.defectDetail}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-1.5 md:p-2.5 text-right font-bold text-slate-700 font-mono whitespace-nowrap text-[10px] md:text-xs">{r.totalQty.toLocaleString('vi-VN')}</td>
                        <td className="py-2 px-1.5 md:p-2.5 text-right font-semibold text-slate-600 font-mono whitespace-nowrap text-[10px] md:text-xs">{r.checkedQty.toLocaleString('vi-VN')}</td>
                        <td className="py-2 px-1.5 md:p-2.5 text-center font-semibold text-slate-600 whitespace-nowrap text-[10px] md:text-xs">{r.checkedBy}</td>
                        <td className="py-2 px-1.5 md:p-2.5 text-right font-bold text-red-650 font-mono whitespace-nowrap text-[10px] md:text-xs">{r.failedQty > 0 ? r.failedQty.toLocaleString('vi-VN') : '-'}</td>
                        <td className={`py-2 px-1.5 md:p-2.5 text-right font-bold font-mono whitespace-nowrap text-[10px] md:text-xs ${r.failedQty > 0 ? 'text-red-500' : 'text-slate-400'}`}>{r.defectRate}%</td>
                        <td className="py-2 px-1.5 md:p-2.5 text-left font-bold text-slate-700 italic text-[10px] sm:text-[11px] md:text-xs break-words whitespace-normal line-clamp-2">{r.itemSummary || r.content}</td>
                        <td className="py-2 px-1.5 md:p-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-extrabold uppercase whitespace-nowrap ${r.result === 'Đạt' ? 'bg-emerald-50 text-emerald-750' : 'bg-red-50 text-red-600 animate-pulse'}`}>
                            {r.result}
                          </span>
                        </td>
                        <td className="py-2 px-1.5 md:p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewDetailModal?.({ type: 'iqc_record', data: r })}
                              className="text-emerald-600 hover:text-emerald-800 p-0.5 cursor-pointer"
                              title="Xác định chi tiết"
                            >
                              <Eye className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditIqcClick(r)}
                              className="text-indigo-600 hover:text-indigo-800 p-0.5 cursor-pointer"
                              title="Sửa phiếu"
                            >
                              <Pencil className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteIqcClick(r.id)}
                              className="text-rose-600 hover:text-rose-800 p-0.5 cursor-pointer"
                              title="Xóa phiếu"
                            >
                              <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* IQC Pagination Toolbar */}
            {filteredIqc.length > iqcPageSize && (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 font-sans">
                <span>
                  Hiển thị {(safeIqcPage - 1) * iqcPageSize + 1} - {Math.min(safeIqcPage * iqcPageSize, filteredIqc.length)} / {filteredIqc.length} phiếu IQC
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safeIqcPage === 1}
                    onClick={() => setIqcCurrentPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-bold cursor-pointer"
                  >
                    Trước
                  </button>
                  <span className="px-2 font-mono font-bold text-slate-800">
                    {safeIqcPage} / {iqcTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeIqcPage === iqcTotalPages}
                    onClick={() => setIqcCurrentPage(p => Math.min(iqcTotalPages, p + 1))}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-bold cursor-pointer"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== SUBTAB: PQC ==================== */}
      {qcMainSubTab === 'pqc' && (
        <div className="space-y-4">
          {renderActivePlanTargetsBanner('PQC')}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
            <div className="bg-white p-3 sm:p-4.5 rounded-xl border border-slate-200 shadow-sm col-span-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 block uppercase leading-tight">Sự cố công đoạn phát hiện</span>
              <span className="text-lg sm:text-xl font-black text-slate-800 font-mono mt-0.5 sm:mt-1 block">{pqcRecords.length} vụ việc</span>
            </div>
            <div className="bg-white p-3 sm:p-4.5 rounded-xl border border-slate-200 shadow-sm col-span-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 block uppercase leading-tight">Đang khắc phục cải tiến</span>
              <span className="text-lg sm:text-xl font-black text-amber-500 font-mono mt-0.5 sm:mt-1 block">
                {pqcRecords.filter(r => r.status === 'Đang cải tiến').length} vụ việc
              </span>
            </div>
            <div className="bg-white p-3 sm:p-4.5 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 block uppercase leading-tight">Tỷ lệ cải tiến thành công</span>
              <span className="text-lg sm:text-xl font-black text-emerald-600 font-mono mt-0.5 sm:mt-1 block">
                {Math.round((pqcRecords.filter(r => r.status === 'Đạt hoàn toàn' || r.status === 'Đã cải tiến').length / pqcRecords.length) * 100)}%
              </span>
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-slate-200 space-y-3 sm:space-y-4">
            {/* Elegant PQC Filter Controls Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Bộ lọc tìm kiếm nâng cao (PQC)</span>
              </div>
              <div className="flex items-center gap-2">
                {(pqcFilterMonth !== 'All' || pqcFilterStatus !== 'All' || pqcFilterModel !== 'All' || pqcFilterWeek !== 'All' || pqcSearch !== '') && (
                  <button
                     type="button"
                     onClick={() => {
                       setPqcFilterMonth('All');
                       setPqcFilterStatus('All');
                       setPqcFilterModel('All');
                       setPqcFilterWeek('All');
                       setPqcSearch('');
                     }}
                     className="text-[9px] sm:text-[10px] bg-red-50 text-red-650 hover:bg-red-100 border border-red-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 mr-2"
                  >
                    ✕ Nhập lại bộ lọc (Reset)
                  </button>
                )}
                <button
                  onClick={() => setIsPqcFilterExpanded(!isPqcFilterExpanded)}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg transition-all cursor-pointer"
                >
                  {isPqcFilterExpanded ? (
                    <>Thu gọn <ChevronUp className="w-3.5 h-3.5" /></>
                  ) : (
                    <>Mở rộng <ChevronDown className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>
            </div>

            {isPqcFilterExpanded && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 bg-slate-50 p-2.5 sm:p-4 rounded-xl border border-slate-100 transition-all">
                <div className="col-span-2 md:col-span-1 space-y-0.5 sm:space-y-1">
                  <label className="text-[8.5px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Search className="w-3 h-3 text-indigo-505" /> Từ khóa tìm kiếm
                  </label>
                  <input 
                    type="text"
                    value={pqcSearch}
                    onChange={(e) => setPqcSearch(e.target.value)}
                    placeholder="Lệnh LSX, model xe, lỗi, PIC phụ trách..."
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 sm:py-2 text-xs focus:outline-none focus:border-indigo-650 font-bold"
                  />
                </div>

                <div className="col-span-1 space-y-0.5 sm:space-y-1">
                  <label className="text-[8.5px] sm:text-[10px] font-bold text-slate-550 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-505" /> Tháng ghi nhận
                  </label>
                  <select
                    value={pqcFilterMonth}
                    onChange={(e) => setPqcFilterMonth(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 sm:py-2 text-xs focus:outline-none focus:border-indigo-650 font-bold text-slate-705 pointer-events-auto cursor-pointer"
                  >
                    <option value="All">Tất cả các tháng</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m.toString()}>Tháng {m}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 space-y-0.5 sm:space-y-1">
                  <label className="text-[8.5px] sm:text-[10px] font-bold text-slate-550 uppercase tracking-wider flex items-center gap-1">
                    <Truck className="w-3 h-3 text-indigo-505" /> Dòng xe Model ({uniquePqcModels.length})
                  </label>
                  <select
                    value={pqcFilterModel}
                    onChange={(e) => setPqcFilterModel(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 sm:py-2 text-xs focus:outline-none focus:border-indigo-650 font-bold text-slate-705 pointer-events-auto cursor-pointer"
                  >
                    <option value="All">Tất cả các dòng xe (Model)</option>
                    {uniquePqcModels.map((mdl, idx) => (
                      <option key={`${mdl}-${idx}`} value={mdl}>{mdl}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 space-y-0.5 sm:space-y-1">
                  <label className="text-[8.5px] sm:text-[10px] font-bold text-slate-550 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-indigo-505" /> Trạng thái cải tiến
                  </label>
                  <select
                    value={pqcFilterStatus}
                    onChange={(e) => setPqcFilterStatus(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 sm:py-2 text-xs focus:outline-none focus:border-indigo-650 font-bold text-slate-705 pointer-events-auto cursor-pointer"
                  >
                    <option value="All">Tất cả trạng thái</option>
                    <option value="Đạt hoàn toàn">Đạt hoàn toàn</option>
                    <option value="Đã cải tiến">Đã cải tiến</option>
                    <option value="Đang cải tiến">Đang cải tiến</option>
                  </select>
                </div>

                <div className="col-span-1 space-y-0.5 sm:space-y-1">
                  <label className="text-[8.5px] sm:text-[10px] font-bold text-slate-550 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-550" /> Tuần làm việc
                  </label>
                  <select
                    value={pqcFilterWeek}
                    onChange={(e) => setPqcFilterWeek(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 sm:py-2 text-xs focus:outline-none focus:border-indigo-650 font-bold text-slate-705 pointer-events-auto cursor-pointer"
                  >
                    <option value="All">Tất cả các tuần (T1-T5)</option>
                    <option value="T1">Tuần 1 (T1)</option>
                    <option value="T2">Tuần 2 (T2)</option>
                    <option value="T3">Tuần 3 (T3)</option>
                    <option value="T4">Tuần 4 (T4)</option>
                    <option value="T5">Tuần 5 (T5)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px] md:text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b text-slate-500 font-extrabold text-[9.5px] md:text-[10px] uppercase">
                    <th className="py-2 px-1.5 md:p-2.5 w-10 md:w-12 text-center">ID</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-16 md:w-20 text-center">Lệnh LSX</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-24 md:w-32">Dòng xe (Model)</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-18 md:w-24 text-center">Ngày kiểm</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-16 md:w-20 text-right">Quy cách</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-24 md:w-28">Người rà soát</th>
                    <th className="py-2 px-1.5 md:p-2.5 min-w-[260px] md:min-w-[340px]">Nội dung lỗi phát hiện & Chỉ đạo xử lý</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-20 md:w-26 text-center">Trạng thái</th>
                    <th className="py-2 px-1.5 md:p-2.5 w-16 md:w-20 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPqc.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                        Không tìm thấy sự cố công đoạn nào tương ứng với bộ lọc đã chọn.
                      </td>
                    </tr>
                  ) : (
                    filteredPqc.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-1.5 md:p-2.5 text-center font-bold text-slate-400">
                        <button
                          type="button"
                          onClick={() => setViewDetailModal?.({ type: 'pqc_record', data: r })}
                          className="text-indigo-650 hover:underline hover:text-indigo-800 font-bold font-mono cursor-pointer"
                          title="Click xem chi tiết"
                        >
                          {r.id}
                        </button>
                      </td>
                      <td className="py-2 px-1.5 md:p-2.5 text-center">
                        <span className="bg-slate-150 text-slate-700 font-extrabold px-1.5 py-0.5 rounded font-mono text-[9px] md:text-[10px]">{r.lsx}</span>
                      </td>
                      <td className="py-2 px-1.5 md:p-2.5 font-extrabold text-slate-800">{r.model}</td>
                      <td className="py-2 px-1.5 md:p-2.5 text-slate-600 text-center font-medium">{r.date}</td>
                      <td className="py-2 px-1.5 md:p-2.5 text-right font-bold text-slate-700 font-mono">{r.qty.toLocaleString('vi-VN')}</td>
                      <td className="py-2 px-1.5 md:p-2.5 font-semibold text-slate-600">{r.checkedBy}</td>
                      <td className="py-2 px-1.5 md:p-2.5 text-slate-600 font-medium leading-relaxed break-words whitespace-normal">{r.findings}</td>
                      <td className="py-2 px-1.5 md:p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[8.5px] md:text-[9px] font-black uppercase border ${
                          r.status === 'Đạt hoàn toàn' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          r.status === 'Đã cải tiến' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 px-1.5 md:p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewDetailModal?.({ type: 'pqc_record', data: r })}
                            className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer"
                            title="Xác định chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditPqcClick(r)}
                            className="text-indigo-650 hover:text-indigo-805 p-1 cursor-pointer"
                            title="Chỉnh sửa phiếu PQC"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePqcClick(r.id)}
                            className="text-rose-605 hover:text-rose-800 p-1 cursor-pointer"
                            title="Xóa phiếu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUBTAB: OQC ==================== */}
      {qcMainSubTab === 'oqc' && (
        <div className="space-y-4">
          {renderActivePlanTargetsBanner('OQC')}
          
          {/* Sub-view switcher bar inside OQC */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100 p-1 sm:p-1.5 rounded-xl shadow-xs">
              <button
                id="oqc-subview-station"
                type="button"
                onClick={() => setOqcSubView('station')}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  oqcSubView === 'station'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Zap className="w-4 h-4 text-blue-600" />
                Trạm KCS (LSX)
              </button>
              <button
                id="oqc-subview-handover"
                type="button"
                onClick={() => setOqcSubView('handover')}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  oqcSubView === 'handover'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Báo phẩm bàn giao
                {handoverScannedList.length > 0 && (
                  <span className="ml-1 bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                    {handoverScannedList.length}
                  </span>
                )}
              </button>
              <button
                id="oqc-subview-partcodes"
                type="button"
                onClick={() => setOqcSubView('part_codes')}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  oqcSubView === 'part_codes'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Tag className="w-4 h-4 text-amber-600" />
                Bảng mã xe
                <span className="ml-1 bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                  {oqcPartCodes.length}
                </span>
              </button>
              <button
                id="oqc-subview-dashboard"
                type="button"
                onClick={() => setOqcSubView('dashboard')}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  oqcSubView === 'dashboard'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                Báo cáo &amp; Đồ thị
              </button>
            </div>
          </div>

          {/* ================================== 1. TRẠM KIỂM ĐỊNH KCS REALTIME THEO LSX ================================== */}
          {oqcSubView === 'station' && (() => {
            const isAllLsx = kcsSelectedLsx === 'All';
            const {
              displayRecords: displayLsxRecords,
              totalCars: totalLsxCars,
              passedCars: passedLsxCars,
              failedCars: failedLsxCars,
              pendingCars: pendingLsxCars,
              yieldRate: lsxYield
            } = kcsStationStats;

            // Active filter count
            let activeKcsFilterCount = 0;
            if (kcsFilterDate !== 'All') activeKcsFilterCount++;
            if (kcsFilterMonth !== 'All') activeKcsFilterCount++;
            if (kcsFilterYear !== 'All') activeKcsFilterCount++;
            if (kcsStatusFilter !== 'All') activeKcsFilterCount++;
            if (kcsSelectedLsx !== 'All') activeKcsFilterCount++;

            const pageSize = 50;
            const totalPages = Math.max(1, Math.ceil(displayLsxRecords.length / pageSize));
            const safeCurrentPage = Math.min(kcsCurrentPage, totalPages);
            const paginatedRecords = displayLsxRecords.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

            const TOP_COMMON_DEFECTS = [
              '🎨 Xước sơn sườn',
              '⚡ Lỏng rắc cắm nguồn',
              '🧱 Hở bavia nhựa',
              '🚲 Phanh đĩa bó',
              '💡 Đèn pha không sáng',
              '🔊 Tiếng kêu lạ động cơ',
              '⚡ Đồng hồ không lên',
              '🔧 Lệch cổ phốt',
              '🔋 Pin / Ắc quy ngắt'
            ];

            const DEFECT_CATEGORIES = [
              {
                category: '🎨 Sơn & Thân Vỏ',
                items: ['Xước sơn sườn', 'Bong tróc sơn', 'Lệch màu nhựa', 'Hở bavia mộc', 'Bạc màu sơn', 'Móp sườn khung']
              },
              {
                category: '⚡ Hệ Thống Điện & Cảm Biến',
                items: ['Lỏng rắc cắm nguồn', 'Đèn pha không sáng', 'Đồng hồ không lên', 'Còi không kêu', 'Pin / Ắc quy ngắt', 'Động cơ ngắt chập chờn', 'Xi nhan không nháy']
              },
              {
                category: '🔩 Cơ Khí & Khung Gầm',
                items: ['Phanh đĩa bó', 'Lệch cổ phốt', 'Tiếng kêu lạ động cơ', 'Giảm xóc kêu', 'Lỏng ốc bánh xe', 'Cần phanh nặng', 'Xích tải chùng']
              }
            ];

            const parseDefects = (str?: string): string[] => {
              if (!str || !str.trim()) return [];
              return str
                .split(/[,;\n]/)
                .map(s => s.trim())
                .filter(Boolean);
            };

            const stringifyDefects = (list: string[]): string => {
              const unique = Array.from(new Set(list.filter(Boolean)));
              return unique.join(', ');
            };

            const handleAddDefectToCar = (record: OQCRecord, newDefect: string) => {
              if (!newDefect || !newDefect.trim()) return;
              const current = parseDefects(record.defectDetail);
              const updatedList = Array.from(new Set([...current, newDefect.trim()]));
              const updatedStr = stringifyDefects(updatedList);
              handleQuickFail(record, updatedStr, record.rootCause || '');
            };

            const handleRemoveDefectFromCar = (record: OQCRecord, defectIndex: number) => {
              const current = parseDefects(record.defectDetail);
              const updatedList = current.filter((_, idx) => idx !== defectIndex);
              const updatedStr = stringifyDefects(updatedList);
              if (updatedList.length === 0) {
                handleQuickPass(record);
              } else {
                handleQuickFail(record, updatedStr, record.rootCause || '');
              }
            };

            const handleClearAllDefectsFromCar = (record: OQCRecord) => {
              handleQuickPass(record);
            };

            const handleQuickPass = (record: OQCRecord) => {
              const now = new Date();
              const nowTime = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
              const nowDate = standardizeDate(now.toLocaleDateString('vi-VN'));
              const dateParts = nowDate.split('/');
              const nowMonth = Number(dateParts[1]) || (now.getMonth() + 1);
              const nowYear = Number(dateParts[2]) || now.getFullYear();

              const override: Partial<OQCRecord> = {
                status: 'Đạt' as const,
                defectDetail: '',
                rootCause: '',
                failedCount: 0,
                checkTime: nowTime,
                date: nowDate,
                month: nowMonth,
                year: nowYear,
                updatedAt: new Date().toISOString(),
                checkedBy: 'Liễu Tùng Lâm'
              };

              // 1. Phản hồi tức thì giao diện (< 1ms UI update)
              if (record.id) {
                setLocalOqcOverrides(prev => ({ ...prev, [record.id]: { ...record, ...override } }));
              }

              // 2. Cập nhật mảng toàn cục và hoãn thuật toán nặng ngầm đằng sau
              const targetSerial = record.serialNo ? record.serialNo.trim().toUpperCase() : '';
              const updated = [...oqcRecords];
              const index = updated.findIndex(r => r.id === record.id || (targetSerial && r.serialNo && r.serialNo.trim().toUpperCase() === targetSerial));
              if (index !== -1) {
                updated[index] = {
                  ...updated[index],
                  ...override
                };
              }

              saveOqcRecordsOptimized(updated);
            };

            const handleUpdateDefectNote = (record: OQCRecord, defectDetail: string, rootCause?: string) => {
              const now = new Date();
              const nowTime = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
              const nowDate = standardizeDate(now.toLocaleDateString('vi-VN'));
              const dateParts = nowDate.split('/');
              const nowMonth = Number(dateParts[1]) || (now.getMonth() + 1);
              const nowYear = Number(dateParts[2]) || now.getFullYear();

              const override: Partial<OQCRecord> = {
                defectDetail: defectDetail,
                rootCause: typeof rootCause === 'string' ? rootCause : (record.rootCause || ''),
                checkTime: nowTime,
                date: nowDate,
                month: nowMonth,
                year: nowYear,
                updatedAt: new Date().toISOString()
              };

              if (record.id) {
                setLocalOqcOverrides(prev => ({ ...prev, [record.id]: { ...record, ...override } }));
              }

              const targetSerial = record.serialNo ? record.serialNo.trim().toUpperCase() : '';
              const updated = [...oqcRecords];
              const index = updated.findIndex(r => r.id === record.id || (targetSerial && r.serialNo && r.serialNo.trim().toUpperCase() === targetSerial));
              if (index !== -1) {
                updated[index] = {
                  ...updated[index],
                  ...override
                };
              }
              saveOqcRecordsOptimized(updated);
            };

            const handleQuickFail = (record: OQCRecord, defectDetail: string, rootCause?: string) => {
              const now = new Date();
              const nowTime = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
              const nowDate = standardizeDate(now.toLocaleDateString('vi-VN'));
              const dateParts = nowDate.split('/');
              const nowMonth = Number(dateParts[1]) || (now.getMonth() + 1);
              const nowYear = Number(dateParts[2]) || now.getFullYear();

              const isClear = !defectDetail || !defectDetail.trim();
              const override: Partial<OQCRecord> = isClear ? {
                status: 'Đạt' as const,
                defectDetail: '',
                rootCause: '',
                failedCount: 0,
                checkTime: nowTime,
                date: nowDate,
                month: nowMonth,
                year: nowYear,
                updatedAt: new Date().toISOString(),
                checkedBy: 'Liễu Tùng Lâm'
              } : {
                status: 'Lỗi' as const,
                defectDetail: defectDetail,
                rootCause: rootCause || '',
                failedCount: 1,
                checkTime: nowTime,
                date: nowDate,
                month: nowMonth,
                year: nowYear,
                updatedAt: new Date().toISOString(),
                checkedBy: 'Liễu Tùng Lâm'
              };

              if (record.id) {
                setLocalOqcOverrides(prev => ({ ...prev, [record.id]: { ...record, ...override } }));
              }

              const targetSerial = record.serialNo ? record.serialNo.trim().toUpperCase() : '';
              const updated = [...oqcRecords];
              const index = updated.findIndex(r => r.id === record.id || (targetSerial && r.serialNo && r.serialNo.trim().toUpperCase() === targetSerial));
              if (index !== -1) {
                updated[index] = {
                  ...updated[index],
                  ...override
                };
              }

              saveOqcRecordsOptimized(updated);
            };

            const handleDeleteCar = (record: OQCRecord) => {
              if (!window.confirm(`Xóa xe Sêri ${record.serialNo} khỏi hệ thống?`)) return;
              if (record.id) {
                trackDeletedId('dk_oqc_records', record.id);
              }
              const targetSerial = record.serialNo ? record.serialNo.trim().toUpperCase() : '';
              const updated = oqcRecords.filter(r => r.id !== record.id && (!targetSerial || !r.serialNo || r.serialNo.trim().toUpperCase() !== targetSerial));
              saveOqcRecordsOptimized(updated);
            };

            const handleBatchPassAllPending = () => {
              if (pendingLsxCars === 0) {
                alert(isAllLsx ? 'Tất cả xe trong danh sách lọc đều đã được kiểm tra!' : `Tất cả xe trong LSX ${kcsSelectedLsx} đều đã được kiểm tra!`);
                return;
              }
              const confirmMsg = isAllLsx 
                ? `Xác nhận đánh dấu tất cả ${pendingLsxCars} xe chưa kiểm tra đang lọc thành ĐẠT?`
                : `Xác nhận đánh dấu tất cả ${pendingLsxCars} xe chưa kiểm trong LSX ${kcsSelectedLsx} thành ĐẠT?`;
              if (!window.confirm(confirmMsg)) return;

              const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
              const nowDate = new Date().toLocaleDateString('vi-VN');
              const nowMonth = new Date().getMonth() + 1;
              const nowYear = new Date().getFullYear();

              const pendingIds = new Set(displayLsxRecords.filter(r => r.status !== 'Đạt' && r.status !== 'Lỗi').map(r => r.id));

              const updated = oqcRecords.map(r => {
                if (pendingIds.has(r.id)) {
                  return {
                    ...r,
                    status: 'Đạt' as const,
                    defectDetail: '',
                    rootCause: '',
                    failedCount: 0,
                    checkTime: nowTime,
                    date: nowDate,
                    month: nowMonth,
                    year: nowYear,
                    checkedBy: 'Liễu Tùng Lâm'
                  };
                }
                return r;
              });
              saveOqcRecordsOptimized(updated);
            };

            return (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* Clean Toolbar */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Lệnh SX:</span>
                    <select
                      value={kcsSelectedLsx}
                      onChange={e => {
                        setKcsSelectedLsx(e.target.value);
                        setKcsCurrentPage(1);
                      }}
                      className="bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-slate-400 outline-hidden cursor-pointer"
                    >
                      <option value="All">Tất cả Lệnh SX ({oqcRecords.length} xe)</option>
                      {uniqueOqcLsxs.map(lsx => {
                        const count = oqcLsxCountsMap.get(lsx) || 0;
                        return (
                          <option key={lsx} value={lsx}>
                            LSX {lsx} ({count} xe)
                          </option>
                        );
                      })}
                    </select>

                    <div className="relative w-44 sm:w-56">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={kcsSearch}
                        onChange={e => {
                          setKcsSearch(e.target.value);
                          setKcsCurrentPage(1);
                        }}
                        placeholder="Tìm sêri, số khung, model..."
                        className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-slate-400 outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      {(['All', 'Chưa kiểm tra', 'Đạt', 'Lỗi'] as const).map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            setKcsStatusFilter(st);
                            setKcsCurrentPage(1);
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                            kcsStatusFilter === st
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {st === 'All' ? 'Tất cả' : st === 'Chưa kiểm tra' ? 'Chưa kiểm' : st}
                        </button>
                      ))}
                    </div>

                    {/* Toggle Button Bộ Lọc Nâng Cao (Mặc định ẩn) */}
                    <button
                      type="button"
                      onClick={() => setIsKcsFilterExpanded(!isKcsFilterExpanded)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        isKcsFilterExpanded || activeKcsFilterCount > 0
                          ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-2xs'
                      }`}
                      title="Ẩn / Hiện bộ lọc thời gian & chi tiết"
                    >
                      <Filter className="w-3.5 h-3.5 text-blue-600" />
                      <span>Bộ lọc</span>
                      {activeKcsFilterCount > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                          {activeKcsFilterCount}
                        </span>
                      )}
                      {isKcsFilterExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </button>

                    {(kcsFilterDate !== 'All' || kcsFilterMonth !== 'All' || kcsFilterYear !== 'All' || kcsStatusFilter !== 'All' || kcsSearch !== '' || kcsSelectedLsx !== 'All') && (
                      <button
                        type="button"
                        onClick={() => {
                          setKcsFilterDate('All');
                          setKcsFilterMonth('All');
                          setKcsFilterYear('All');
                          setKcsStatusFilter('All');
                          setKcsSearch('');
                          setKcsSelectedLsx('All');
                          setKcsCurrentPage(1);
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        title="Đặt lại toàn bộ bộ lọc về mặc định"
                      >
                        ✕ Đặt lại
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setLsxImportDefaultLsx(kcsSelectedLsx === 'All' ? (uniqueOqcLsxs[0] || '26-10') : kcsSelectedLsx);
                        setLsxImportError('');
                        setShowImportLsxModal(true);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Nạp danh sách xe từ file Lệnh Sản Xuất vào QMS để KCS kiểm tra"
                    >
                      <Upload className="w-3.5 h-3.5" /> Nạp từ LSX
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCarLsx(kcsSelectedLsx === 'All' ? (uniqueOqcLsxs[0] || '26-10') : kcsSelectedLsx);
                        setNewCarSerialNo('');
                        setShowAddCarToLsxModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Thêm 1 xe lẻ vào Lệnh Sản Xuất"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm xe
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOqcImportError('');
                        setShowImportOqcModal(true);
                      }}
                      className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Nhập dữ liệu KCS hàng loạt từ bảng tính Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Nhập KCS từ Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleBatchPassAllPending}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                      title="Đánh dấu tất cả xe chưa kiểm tra thành ĐẠT"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-slate-600" /> ✓ Đạt toàn bộ
                    </button>
                  </div>
                </div>

                {/* Collapsible Filter Panel (Gọn gàng - Mặc định ẩn) */}
                {isKcsFilterExpanded && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 shadow-2xs grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-600" /> Ngày kiểm tra
                      </label>
                      <select
                        value={kcsFilterDate}
                        onChange={e => {
                          setKcsFilterDate(e.target.value);
                          setKcsCurrentPage(1);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                      >
                        <option value="All">Tất cả các ngày ({uniqueKcsDates.length})</option>
                        {uniqueKcsDates.map(d => (
                          <option key={d} value={d}>Ngày {d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-600" /> Tháng kiểm tra
                      </label>
                      <select
                        value={kcsFilterMonth}
                        onChange={e => {
                          setKcsFilterMonth(e.target.value);
                          setKcsCurrentPage(1);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                      >
                        <option value="All">Tất cả các tháng</option>
                        {uniqueKcsMonths.map(m => (
                          <option key={m} value={String(m)}>Tháng {m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-600" /> Năm kiểm tra
                      </label>
                      <select
                        value={kcsFilterYear}
                        onChange={e => {
                          setKcsFilterYear(e.target.value);
                          setKcsCurrentPage(1);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                      >
                        <option value="All">Tất cả các năm</option>
                        {uniqueKcsYears.map(y => (
                          <option key={y} value={String(y)}>Năm {y}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" /> Lệnh Sản Xuất (LSX)
                      </label>
                      <select
                        value={kcsSelectedLsx}
                        onChange={e => {
                          setKcsSelectedLsx(e.target.value);
                          setKcsCurrentPage(1);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                      >
                        <option value="All">Tất cả Lệnh SX ({oqcRecords.length} xe)</option>
                        {uniqueOqcLsxs.map(lsx => {
                          const count = oqcLsxCountsMap.get(lsx) || 0;
                          return (
                            <option key={lsx} value={lsx}>LSX {lsx} ({count} xe)</option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}

                {/* Minimalist Summary Strip */}
                <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-600">Tổng: <strong className="text-slate-900 font-mono font-bold">{totalLsxCars}</strong> xe</span>
                    <span className="text-emerald-700">Đạt: <strong className="font-mono font-bold">{passedLsxCars}</strong></span>
                    <span className="text-rose-700">Lỗi: <strong className="font-mono font-bold">{failedLsxCars}</strong></span>
                    <span className="text-slate-500">Chờ: <strong className="font-mono font-bold">{pendingLsxCars}</strong></span>
                    <span className="text-blue-700 font-bold">Tỉ lệ đạt: <strong className="font-mono font-bold">{lsxYield}%</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-500 font-medium">
                      ⚡ Bấm nút <strong className="text-emerald-700 font-bold">✓ Đạt</strong> hoặc <strong className="text-rose-700 font-bold">🔴 Lỗi</strong> để đổi trạng thái tức thì (0ms)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        flushOqcSaveToCloud();
                        alert('Đã đẩy ép đồng bộ toàn bộ dữ liệu OQC lên Cloud thành công!');
                      }}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 text-[11px] font-bold transition cursor-pointer flex items-center gap-1 active:scale-95"
                      title="Gom đẩy toàn bộ dữ liệu OQC chưa đồng bộ lên Cloud lập tức"
                    >
                      ☁️ Đồng bộ Cloud ngay
                    </button>
                  </div>
                </div>


                {/* Batch Action Bar for Selected OQC Station Items */}
                {selectedOqcIds.length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 px-4 flex items-center justify-between shadow-xs mb-3 animate-fade-in font-sans select-none">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="text-xs font-bold text-rose-950">
                        Đang chọn <strong className="font-mono text-rose-700 text-sm font-black">{selectedOqcIds.length}</strong> xe trong Trạm KCS
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOqcIds([])}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`⚠️ ANH THAO XÁC NHẬN: Bạn có chắc chắn muốn XÓA HÀNG LOẠT ${selectedOqcIds.length} xe KCS đã chọn khỏi CSDL không?\nHành động này sẽ cập nhật tức thì lên Cloud.`)) {
                            selectedOqcIds.forEach(id => trackDeletedId('dk_oqc_records', id));
                            const updated = oqcRecords.filter(r => !selectedOqcIds.includes(r.id));
                            saveOqcRecordsOptimized(updated);
                            setSelectedOqcIds([]);
                            alert(`✓ Đã xóa thành công ${selectedOqcIds.length} xe KCS đã chọn!`);
                          }
                        }}
                        className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa hàng loạt ({selectedOqcIds.length})
                      </button>
                    </div>
                  </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  {paginatedRecords.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      Không có xe nào khớp bộ lọc.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-800 text-white font-bold text-[10.5px] uppercase tracking-wider select-none">
                          <tr>
                            <th scope="col" className="px-2 py-2.5 text-center w-8 select-none">
                              <input
                                type="checkbox"
                                checked={displayLsxRecords.length > 0 && displayLsxRecords.every(r => selectedOqcSet.has(r.id))}
                                onChange={e => {
                                  const allFilteredIds = displayLsxRecords.map(r => r.id).filter(Boolean);
                                  if (e.target.checked) {
                                    setSelectedOqcIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
                                  } else {
                                    setSelectedOqcIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                title="Chọn tất cả xe trong danh sách hiển thị"
                              />
                            </th>
                            <th scope="col" className="px-3 py-2.5 text-center w-10">STT</th>
                            <th scope="col" className="px-3 py-2.5 text-left">Mã quy cách</th>
                            <th scope="col" className="px-3 py-2.5 text-left">Số Sêri</th>
                            <th scope="col" className="px-3 py-2.5 text-left">Số khung</th>
                            <th scope="col" className="px-3 py-2.5 text-left">Model</th>
                            <th scope="col" className="px-3 py-2.5 text-left">Màu sắc</th>
                            <th scope="col" className="px-3 py-2.5 text-center w-36">KCS / Trạng thái</th>
                            <th scope="col" className="px-3 py-2.5 text-left min-w-[260px]">Chi tiết lỗi (Thẻ lỗi 1, 2, 3)</th>
                            <th scope="col" className="px-3 py-2.5 text-left min-w-[150px]">Nguyên nhân</th>
                            <th scope="col" className="px-3 py-2.5 text-center w-20">Giờ</th>
                            <th scope="col" className="px-3 py-2.5 text-center w-14">Xóa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                          {paginatedRecords.map((r, rowIdx) => {
                            const globalIdx = (safeCurrentPage - 1) * pageSize + rowIdx + 1;
                            const isPassed = r.status === 'Đạt';
                            const isFailed = r.status === 'Lỗi';
                            const carDefects = parseDefects(r.defectDetail);

                            return (
                              <tr
                                key={r.id || r.serialNo || rowIdx}
                                className={`hover:bg-slate-50 transition-colors ${
                                  selectedOqcSet.has(r.id) ? 'bg-indigo-50/50' : isPassed ? 'bg-emerald-50/20' : isFailed ? 'bg-rose-50/25' : ''
                                }`}
                              >
                                <td className="px-2 py-2 text-center select-none">
                                  <input
                                    type="checkbox"
                                    checked={selectedOqcSet.has(r.id)}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setSelectedOqcIds(prev => [...prev, r.id]);
                                      } else {
                                        setSelectedOqcIds(prev => prev.filter(id => id !== r.id));
                                      }
                                    }}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center font-mono text-slate-400">{globalIdx}</td>
                                <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{r.partCode || '--'}</td>
                                <td className="px-3 py-2">
                                  <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 select-all">
                                    {r.serialNo}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{r.chassisNo || '--'}</td>
                                <td className="px-3 py-2 font-bold text-slate-850">
                                  <span>{r.model}</span>
                                  {isAllLsx && (
                                    <span className="ml-1.5 text-[9.5px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">
                                      LSX {r.lsx || '--'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-slate-600">{r.color}</td>

                                {/* KCS Action Cell: Instant 0ms Buttons */}
                                <td className="px-3 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleQuickPass(r)}
                                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 ${
                                        isPassed
                                          ? 'bg-emerald-600 text-white border border-emerald-700 shadow-xs'
                                          : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200'
                                      }`}
                                      title="Đánh dấu xe ĐẠT nghiệm thu KCS tức thì"
                                    >
                                      ✓ Đạt
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickFail(r, r.defectDetail || 'Lỗi KCS')}
                                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 ${
                                        isFailed
                                          ? 'bg-rose-600 text-white border border-rose-700 shadow-xs'
                                          : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200'
                                      }`}
                                      title="Đánh dấu xe LỖI nghiệm thu KCS tức thì"
                                    >
                                      🔴 Lỗi
                                    </button>
                                  </div>
                                </td>

                                {/* Multi-Defect Tag Cell */}
                                <td className="px-3 py-2 min-w-[260px]">
                                  <div className="flex flex-wrap items-center gap-1.5 min-h-[30px]">
                                    {carDefects.map((dItem, dIdx) => (
                                      <span
                                        key={dIdx}
                                        className="inline-flex items-center gap-1 bg-rose-50 text-rose-900 border border-rose-300 text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs group transition hover:bg-rose-100"
                                      >
                                        <span>🔴 {dItem}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveDefectFromCar(r, dIdx)}
                                          className="text-rose-400 hover:text-rose-900 font-extrabold ml-0.5 cursor-pointer leading-none text-xs"
                                          title="Xóa lỗi này"
                                        >
                                          ×
                                        </button>
                                      </span>
                                    ))}

                                    {carDefects.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleClearAllDefectsFromCar(r)}
                                        className="text-[10px] bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold px-1.5 py-0.5 rounded border border-rose-300 transition cursor-pointer shrink-0"
                                        title="Xóa sạch toàn bộ lỗi của xe này và đặt lại thành Đạt"
                                      >
                                        🧹 Xóa hết
                                      </button>
                                    )}

                                    <div className="flex items-center gap-1 flex-1 min-w-[130px]">
                                      <AutocompleteInput
                                        id={`kcs-defect-input-${rowIdx}`}
                                        value=""
                                        placeholder={
                                          carDefects.length > 0
                                            ? '+ Thêm lỗi...'
                                            : (isPassed ? '-- Không lỗi --' : 'Gõ từ khóa lỗi...')
                                        }
                                        disabled={false}
                                        options={defectDictionary}
                                        onCommit={val => {
                                          if (val && val.trim()) {
                                            handleAddDefectToCar(r, val.trim());
                                          }
                                        }}
                                        onChange={() => {}}
                                        className={`w-full text-xs px-2 py-1 rounded border outline-hidden transition ${
                                          isPassed
                                            ? (r.defectDetail ? 'bg-amber-50/70 text-amber-900 border-amber-300 font-semibold' : 'bg-slate-50 text-slate-400 border-slate-200 focus:bg-white text-center')
                                            : isFailed
                                            ? 'bg-rose-50 text-rose-900 border-rose-300 focus:bg-white font-semibold'
                                            : 'bg-slate-50 text-slate-700 border-slate-200 focus:bg-white'
                                        }`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMultiDefectModalRecord(r);
                                          setSelectedModalDefects(parseDefects(r.defectDetail));
                                        }}
                                        className="px-1.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded border border-rose-300 text-[10.5px] font-bold transition cursor-pointer flex items-center gap-0.5 shrink-0 active:scale-95"
                                        title="Mở bảng nút chọn nhiều lỗi"
                                      >
                                        ⚡
                                      </button>
                                    </div>
                                  </div>
                                </td>

                                {/* Root Cause Autocomplete */}
                                <td className="px-3 py-2">
                                  <AutocompleteInput
                                    value={r.rootCause || ''}
                                    placeholder={isPassed ? (r.rootCause ? r.rootCause : '--') : 'Nguyên nhân...'}
                                    disabled={false}
                                    options={causeDictionary}
                                    onCommit={val => {
                                      if (r.status === 'Đạt') {
                                        handleUpdateDefectNote(r, r.defectDetail || '', val);
                                      } else {
                                        handleQuickFail(r, r.defectDetail || 'Lỗi KCS', val);
                                      }
                                    }}
                                    onChange={() => {}}
                                    className={`w-full text-xs px-2 py-1 rounded border outline-hidden transition ${
                                      isPassed
                                        ? (r.rootCause ? 'bg-amber-50/70 text-amber-900 border-amber-300 font-semibold' : 'bg-slate-50 text-slate-400 border-slate-200 focus:bg-white text-center')
                                        : 'bg-slate-50 text-slate-700 border-slate-200 focus:bg-white'
                                    }`}
                                  />
                                </td>

                                {/* Check Time & Date */}
                                <td className="px-3 py-2.5 text-center">
                                  {r.checkTime || r.date ? (
                                    <div className="text-[10.5px] font-mono leading-tight">
                                      <strong className="text-blue-900 block font-black">{r.checkTime || '--:--'}</strong>
                                      <span className="text-slate-400 text-[9.5px]">{r.date}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 text-[10px] italic">Chưa kiểm</span>
                                  )}
                                </td>

                                {/* Photo & Delete */}
                                <td className="px-3 py-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <label className="cursor-pointer text-slate-400 hover:text-blue-600 transition p-1 rounded hover:bg-blue-50" title="Chụp / đính kèm ảnh lỗi">
                                      <Camera className={`w-3.5 h-3.5 ${r.imageUrl ? 'text-blue-600 fill-blue-100' : ''}`} />
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async e => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          const compressed = await compressImageFile(file, 500, 500, 0.4);
                                          const updated = oqcRecords.map(item => {
                                            if (item.id === r.id || item.serialNo.toUpperCase() === r.serialNo.toUpperCase()) {
                                              return { ...item, imageUrl: compressed };
                                            }
                                            return item;
                                          });
                                          setOqcRecords(updated);
                                          safeStorage.setItem('dk_oqc_records', JSON.stringify(updated));
                                        }}
                                      />
                                    </label>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCar(r)}
                                      className="text-slate-300 hover:text-rose-600 transition p-1 rounded hover:bg-rose-50"
                                      title="Xóa xe khỏi danh sách"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-500">
                        Trang <strong>{safeCurrentPage}</strong> / <strong>{totalPages}</strong> ({displayLsxRecords.length} xe)
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={safeCurrentPage <= 1}
                          onClick={() => setKcsCurrentPage(prev => Math.max(1, prev - 1))}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={safeCurrentPage >= totalPages}
                          onClick={() => setKcsCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* BOTTOM ACTION BAR: Xóa sạch dữ liệu cũ & Nhập dữ liệu mới */}
                  <div className="p-3 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-lg border border-slate-800 mt-2">
                    <div className="flex items-center gap-3">
                      <span className="p-1.5 px-2.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border border-slate-700">
                        📊 Tổng cơ sở dữ liệu KCS: <strong className="text-white text-sm">{oqcRecords.length.toLocaleString('vi-VN')}</strong> xe
                      </span>
                      <span className="text-[11px] text-slate-400 hidden md:inline">
                        (Đạt: <strong className="text-emerald-400 font-mono">{oqcRecords.filter(r => r.status === 'Đạt').length}</strong> | Lỗi: <strong className="text-rose-400 font-mono">{oqcRecords.filter(r => r.status === 'Lỗi').length}</strong>)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClearAllOqcData}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-lg text-xs transition flex items-center gap-1.5 shadow-md shadow-rose-950/50 cursor-pointer active:scale-95 border border-rose-400/40"
                        title="Xóa sạch toàn bộ dữ liệu KCS cũ trên máy và Cloud để nạp dữ liệu mới tinh"
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa Hết Dữ Liệu KCS Cũ
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOqcImportReplaceAll(false);
                          setShowImportOqcModal(true);
                        }}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-lg text-xs transition flex items-center gap-1.5 shadow-md shadow-blue-950/50 cursor-pointer active:scale-95 border border-blue-400/40"
                      >
                        <Upload className="w-4 h-4" />
                        Dán Excel KCS Mới
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ================================== 2. KHÔNG GIAN BÁO PHẨM BÀN GIAO KHO ================================== */}
          {oqcSubView === 'handover' && (() => {
            const handoverModelSummary = (() => {
              const map: Record<string, { model: string; color: string; count: number }> = {};
              filteredHandoverList.forEach(item => {
                const key = `${item.model}___${item.color}`;
                if (!map[key]) {
                  map[key] = { model: item.model, color: item.color, count: 0 };
                }
                map[key].count++;
              });
              return Object.values(map).sort((a, b) => b.count - a.count);
            })();

            const todayFormatted = standardizeDate(new Date().toLocaleDateString('vi-VN'));
            const isFilterActive = handoverFilterDate !== 'All' || handoverFilterModel !== 'All' || handoverSearch.trim() !== '';

            const handleExportHandoverExcelLocal = () => {
              if (filteredHandoverList.length === 0) {
                alert('Không có bản ghi quét bàn giao nào khớp với bộ lọc để xuất Excel!');
                return;
              }
              const today = new Date().toLocaleDateString('vi-VN');
              const displayDate = handoverFilterDate !== 'All' ? handoverFilterDate : today;
              const aoaData: any[][] = [];
              const rowTracker: { type: string; isZebra?: boolean }[] = [];
              const merges: any[] = [];

              const addRow = (row: any[], type: string, isZebra: boolean = false) => {
                const fullRow = [...row];
                while (fullRow.length < 11) {
                  fullRow.push("");
                }
                aoaData.push(fullRow);
                rowTracker.push({ type, isZebra });
                return aoaData.length - 1;
              };

              // 1. Header Company & Title
              const r0 = addRow(["CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT - PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL)"], 'header-company');
              merges.push({ s: { r: r0, c: 0 }, e: { r: r0, c: 10 } });

              const r1 = addRow(["DKBike - Xe cho cả gia đình | Hệ thống Quản lý Chất lượng DK QMS"], 'header-department');
              merges.push({ s: { r: r1, c: 0 }, e: { r: r1, c: 10 } });

              const r2 = addRow(["BẢNG BÀN GIAO XE THÀNH PHẨM CHO BỘ PHẬN KHO"], 'header-title');
              merges.push({ s: { r: r2, c: 0 }, e: { r: r2, c: 10 } });

              const r3 = addRow([`Ngày quét bàn giao: ${displayDate}   |   Tổng số lượng: ${filteredHandoverList.length} xe   |   Số dòng xe (Model): ${handoverModelSummary.length}`], 'header-date');
              merges.push({ s: { r: r3, c: 0 }, e: { r: r3, c: 10 } });

              addRow([], 'empty');

              // 2. Section 1: Summary by Model & Color
              const rSec1 = addRow(["I. TỔNG HỢP SỐ LƯỢNG BÀN GIAO THEO DÒNG XE & MÀU SẮC"], 'section-header');
              merges.push({ s: { r: rSec1, c: 0 }, e: { r: rSec1, c: 10 } });

              addRow(["STT", "Dòng xe (Model)", "Màu sơn", "Số lượng bàn giao", "Ghi chú đối soát", "", "", "", "", "", ""], 'summary-header');

              handoverModelSummary.forEach((s, idx) => {
                addRow([
                  idx + 1,
                  s.model,
                  s.color,
                  `${s.count} xe`,
                  "",
                  "", "", "", "", "", ""
                ], 'summary-row', idx % 2 === 1);
              });

              const rTotal = addRow([
                "TỔNG CỘNG",
                "",
                "",
                `${filteredHandoverList.length} xe`,
                "Hoàn tất kiểm tra KCS",
                "", "", "", "", "", ""
              ], 'summary-total');
              merges.push({ s: { r: rTotal, c: 0 }, e: { r: rTotal, c: 2 } });

              addRow([], 'empty');

              // 3. Section 2: Detailed List of Handed-over Vehicles
              const rSec2 = addRow(["II. CHI TIẾT DANH SÁCH SỐ KHUNG / SÊRI BÀN GIAO (ĐỐI SOÁT & ĐÓNG DẤU NHẬN)"], 'section-header');
              merges.push({ s: { r: rSec2, c: 0 }, e: { r: rSec2, c: 10 } });

              addRow([
                "STT",
                "Số Sêri (Tem ĐT)",
                "Số Khung",
                "Số Động Cơ",
                "Mã Quy Cách",
                "Dòng xe (Model)",
                "Màu Sắc",
                "Lệnh Sản Xuất",
                "Ngày Quét",
                "Giờ Kiểm KCS",
                "Giờ Bàn Giao"
              ], 'detail-header');

              filteredHandoverList.forEach((item, idx) => {
                addRow([
                  idx + 1,
                  item.serialNo,
                  item.chassisNo && item.chassisNo !== '--' ? item.chassisNo : '--',
                  item.engineNo && item.engineNo !== '--' ? item.engineNo : '--',
                  item.partCode || 'TEM-GEN',
                  item.model,
                  item.color,
                  item.lsx,
                  item.date || displayDate,
                  item.checkTime || '--:--',
                  item.scannedAt
                ], 'detail-row', idx % 2 === 1);
              });

              addRow([], 'empty');

              // 4. Section 3: Signature Block
              const rSec3 = addRow(["III. XÁC NHẬN BÀN GIAO & TIẾP NHẬN"], 'section-header');
              merges.push({ s: { r: rSec3, c: 0 }, e: { r: rSec3, c: 10 } });

              addRow([], 'empty');
              const rSigTitles = addRow([
                "ĐẠI DIỆN PHÒNG QUẢN LÝ CHẤT LƯỢNG (BÀN GIAO)", "", "", "",
                "ĐẠI DIỆN BỘ PHẬN KHO THÀNH PHẨM (TIẾP NHẬN)", "", "", "", "", "", ""
              ], 'signature-title');
              merges.push({ s: { r: rSigTitles, c: 0 }, e: { r: rSigTitles, c: 3 } });
              merges.push({ s: { r: rSigTitles, c: 4 }, e: { r: rSigTitles, c: 10 } });

              const rSigNotes = addRow([
                "(Ký, ghi rõ họ tên và đóng dấu KCS)", "", "", "",
                "(Ký, ghi rõ họ tên và kiểm đếm thực tế)", "", "", "", "", "", ""
              ], 'signature-note');
              merges.push({ s: { r: rSigNotes, c: 0 }, e: { r: rSigNotes, c: 3 } });
              merges.push({ s: { r: rSigNotes, c: 4 }, e: { r: rSigNotes, c: 10 } });

              for (let i = 0; i < 4; i++) {
                addRow([], 'empty');
              }

              // Professional Styling Palette
              const PALETTE = {
                headerCompanyFill: "1E293B",   // Slate-800
                headerCompanyFont: "F8FAFC",   // Slate-50
                headerDeptFill: "0F172A",      // Slate-900
                headerDeptFont: "38BDF8",      // Sky-400
                headerTitleFill: "1E3A8A",     // Blue-900
                headerTitleFont: "FFFFFF",     // White
                headerDateFill: "F1F5F9",      // Slate-100
                headerDateFont: "475569",      // Slate-600
                sectionFill: "0284C7",         // Sky-600
                sectionFont: "FFFFFF",         // White
                thFill: "334155",              // Slate-700
                thFont: "FFFFFF",              // White
                zebraEven: "FFFFFF",
                zebraOdd: "F8FAFC",           // Slate-50
                totalFill: "FEF08A",           // Yellow-200
                totalFont: "854D0E",           // Yellow-800
                borderColor: "CBD5E1"          // Slate-300
              };

              const ws = XLSXStyle.utils.aoa_to_sheet(aoaData);
              ws['!merges'] = merges;

              const borderThin = {
                top: { style: 'thin', color: { rgb: PALETTE.borderColor } },
                bottom: { style: 'thin', color: { rgb: PALETTE.borderColor } },
                left: { style: 'thin', color: { rgb: PALETTE.borderColor } },
                right: { style: 'thin', color: { rgb: PALETTE.borderColor } }
              };

              // Apply Styles
              rowTracker.forEach((info, rIdx) => {
                for (let cIdx = 0; cIdx <= 10; cIdx++) {
                  const cellRef = XLSXStyle.utils.encode_cell({ r: rIdx, c: cIdx });
                  if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
                  const cell = ws[cellRef];

                  switch (info.type) {
                    case 'header-company':
                      cell.s = {
                        font: { name: 'Arial', sz: 12, bold: true, color: { rgb: PALETTE.headerCompanyFont } },
                        fill: { fgColor: { rgb: PALETTE.headerCompanyFill } },
                        alignment: { horizontal: 'center', vertical: 'center' }
                      };
                      break;
                    case 'header-department':
                      cell.s = {
                        font: { name: 'Arial', sz: 10, italic: true, bold: true, color: { rgb: PALETTE.headerDeptFont } },
                        fill: { fgColor: { rgb: PALETTE.headerDeptFill } },
                        alignment: { horizontal: 'center', vertical: 'center' }
                      };
                      break;
                    case 'header-title':
                      cell.s = {
                        font: { name: 'Arial', sz: 14, bold: true, color: { rgb: PALETTE.headerTitleFont } },
                        fill: { fgColor: { rgb: PALETTE.headerTitleFill } },
                        alignment: { horizontal: 'center', vertical: 'center' }
                      };
                      break;
                    case 'header-date':
                      cell.s = {
                        font: { name: 'Arial', sz: 10, italic: true, color: { rgb: PALETTE.headerDateFont } },
                        fill: { fgColor: { rgb: PALETTE.headerDateFill } },
                        alignment: { horizontal: 'center', vertical: 'center' },
                        border: borderThin
                      };
                      break;
                    case 'section-header':
                      cell.s = {
                        font: { name: 'Arial', sz: 11, bold: true, color: { rgb: PALETTE.sectionFont } },
                        fill: { fgColor: { rgb: PALETTE.sectionFill } },
                        alignment: { horizontal: 'left', vertical: 'center' },
                        border: borderThin
                      };
                      break;
                    case 'summary-header':
                    case 'detail-header':
                      cell.s = {
                        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: PALETTE.thFont } },
                        fill: { fgColor: { rgb: PALETTE.thFill } },
                        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                        border: borderThin
                      };
                      break;
                    case 'summary-row':
                    case 'detail-row':
                      cell.s = {
                        font: { name: 'Arial', sz: 9.5, color: { rgb: '1E293B' } },
                        fill: { fgColor: { rgb: info.isZebra ? PALETTE.zebraOdd : PALETTE.zebraEven } },
                        alignment: { 
                          horizontal: cIdx === 0 || cIdx === 8 || cIdx === 9 || cIdx === 10 ? 'center' : (cIdx === 3 ? 'center' : 'left'), 
                          vertical: 'center' 
                        },
                        border: borderThin
                      };
                      break;
                    case 'summary-total':
                      cell.s = {
                        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: PALETTE.totalFont } },
                        fill: { fgColor: { rgb: PALETTE.totalFill } },
                        alignment: { horizontal: 'center', vertical: 'center' },
                        border: borderThin
                      };
                      break;
                    case 'signature-title':
                      cell.s = {
                        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '0F172A' } },
                        alignment: { horizontal: 'center', vertical: 'center' }
                      };
                      break;
                    case 'signature-note':
                      cell.s = {
                        font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } },
                        alignment: { horizontal: 'center', vertical: 'center' }
                      };
                      break;
                    default:
                      break;
                  }
                }
              });

              // Column Widths (11 columns)
              ws['!cols'] = [
                { wch: 6 },   // 0: STT
                { wch: 18 },  // 1: Số Sêri
                { wch: 22 },  // 2: Số Khung
                { wch: 18 },  // 3: Số Động Cơ
                { wch: 15 },  // 4: Mã Quy Cách
                { wch: 22 },  // 5: Model
                { wch: 16 },  // 6: Màu Sắc
                { wch: 16 },  // 7: LSX
                { wch: 14 },  // 8: Ngày Quét
                { wch: 14 },  // 9: Giờ Kiểm KCS
                { wch: 14 }   // 10: Giờ Bàn Giao
              ];

              const safeDateStr = displayDate.replace(/\//g, '_');
              const wb = XLSXStyle.utils.book_new();
              XLSXStyle.utils.book_append_sheet(wb, ws, "Ban_Giao_Kho");
              XLSXStyle.writeFile(wb, `DKBike_Ban_Giao_Kho_${safeDateStr}.xlsx`);
            };

            const handleCopyHandoverTextLocal = () => {
              if (filteredHandoverList.length === 0) return;
              const headers = "STT\tSố Sêri (Tem ĐT)\tSố Khung\tSố Động Cơ\tMã Quy Cách\tDòng xe (Model)\tMàu Sắc\tLệnh Sản Xuất\tNgày Quét\tGiờ Bàn Giao";
              const rows = filteredHandoverList.map((item, i) => `${i + 1}\t${item.serialNo}\t${item.chassisNo || '--'}\t${item.engineNo || '--'}\t${item.partCode || 'TEM-GEN'}\t${item.model}\t${item.color}\t${item.lsx}\t${item.date || ''}\t${item.scannedAt}`).join('\n');
              const text = `${headers}\n${rows}`;
              navigator.clipboard.writeText(text).then(() => {
                alert(`Đã sao chép danh sách ${filteredHandoverList.length} xe bàn giao vào clipboard!`);
              });
            };

            return (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* Clean Scanner Toolbar */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      const raw = handoverScanInput.trim();
                      if (!raw) return;
                      const serial = raw.toUpperCase();
                      const found = oqcRecords.find(r => 
                        (r.serialNo && r.serialNo.trim().toUpperCase() === serial) ||
                        (r.chassisNo && r.chassisNo.trim().toUpperCase() === serial) ||
                        (r.engineNo && r.engineNo.trim().toUpperCase() === serial)
                      );

                      // Lookup in master part codes if found has partCode
                      const pCode = found ? (found.partCode || 'TEM-GEN') : 'TEM-GEN';
                      const matchedPart = lookupPartCode(pCode);
                      const now = new Date();
                      const currentDateStr = standardizeDate(now.toLocaleDateString('vi-VN'));
                      const currentTimeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

                      const newItem = {
                        id: `HO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                        serialNo: found ? found.serialNo : serial,
                        chassisNo: found ? (found.chassisNo || '--') : '--',
                        engineNo: found ? (found.engineNo || '--') : '--',
                        partCode: pCode,
                        model: found ? (found.model || (matchedPart ? matchedPart.model : 'Chưa rõ')) : (matchedPart ? matchedPart.model : 'Chưa có trong OQC'),
                        color: found ? (found.color || (matchedPart ? matchedPart.color : 'Chưa rõ')) : (matchedPart ? matchedPart.color : 'Chưa rõ'),
                        lsx: found ? (found.lsx || 'Ngoại bảng') : 'Ngoại bảng',
                        status: found ? (found.status || 'Chưa kiểm tra') : 'Chưa có dữ liệu KCS',
                        checkTime: found ? (found.checkTime || '--:--') : '--:--',
                        date: currentDateStr,
                        scannedAt: currentTimeStr
                      };

                      const filtered = handoverScannedList.filter(x => x.serialNo.toUpperCase() !== (found ? found.serialNo.toUpperCase() : serial));
                      saveHandoverList([newItem, ...filtered]);
                      setHandoverScanInput('');
                    }}
                    className="flex items-center gap-2 flex-1 min-w-[280px] max-w-lg"
                  >
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="handover-barcode-scanner-input"
                        type="text"
                        value={handoverScanInput}
                        onChange={e => setHandoverScanInput(e.target.value)}
                        placeholder="Quét mã hoặc nhập sêri / số khung rồi Enter..."
                        className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-slate-400 outline-hidden"
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
                    >
                      Thêm
                    </button>
                  </form>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setHandoverPasteText('');
                        setShowPasteHandoverModal(true);
                      }}
                      className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Dán sêri
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyHandoverTextLocal}
                      className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                      title="Sao chép danh sách đang lọc vào clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" /> Sao chép
                    </button>
                    <button
                      type="button"
                      onClick={handleExportHandoverExcelLocal}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Xuất Excel
                    </button>
                    {handoverScannedList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Xóa danh sách quét bàn giao hiện tại để bắt đầu phiên mới?')) {
                            saveHandoverList([]);
                          }
                        }}
                        className="bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 font-bold text-xs px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                        title="Làm mới danh sách quét"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* BỘ LỌC NGÀY THÁNG, DÒNG XE & TÌM KIẾM BÁO PHẨM BÀN GIAO */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2.5 flex-1">
                    {/* Bộ lọc ngày quét */}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Ngày quét:</span>
                      <select
                        value={handoverFilterDate}
                        onChange={e => setHandoverFilterDate(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-400 outline-hidden cursor-pointer"
                      >
                        <option value="All">📅 Tất cả các ngày ({handoverScannedList.length} xe)</option>
                        {handoverAvailableDates.map(d => {
                          const count = handoverScannedList.filter(x => (x.date ? standardizeDate(x.date) : '') === d).length;
                          const isToday = d === todayFormatted;
                          return (
                            <option key={d} value={d}>
                              {isToday ? `⭐ Hôm nay - ${d}` : `Ngày ${d}`} ({count} xe)
                            </option>
                          );
                        })}
                      </select>

                      {/* Date Picker Input */}
                      <input
                        type="date"
                        onChange={e => {
                          if (e.target.value) {
                            const [y, m, d] = e.target.value.split('-');
                            setHandoverFilterDate(`${d}/${m}/${y}`);
                          }
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-xs text-slate-700 focus:bg-white outline-hidden cursor-pointer w-32"
                        title="Chọn ngày cụ thể từ lịch"
                      />

                      {/* Quick preset buttons */}
                      <button
                        type="button"
                        onClick={() => setHandoverFilterDate(todayFormatted)}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                          handoverFilterDate === todayFormatted 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        Hôm nay
                      </button>
                      <button
                        type="button"
                        onClick={() => setHandoverFilterDate('All')}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                          handoverFilterDate === 'All' 
                            ? 'bg-slate-800 text-white shadow-xs' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        Tất cả
                      </button>
                    </div>

                    {/* Bộ lọc dòng xe */}
                    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                      <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Dòng xe:</span>
                      <select
                        value={handoverFilterModel}
                        onChange={e => setHandoverFilterModel(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-400 outline-hidden cursor-pointer max-w-[160px]"
                      >
                        <option value="All">Tất cả ({handoverDistinctModels.length} dòng xe)</option>
                        {handoverDistinctModels.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    {/* Ô tìm kiếm */}
                    <div className="relative min-w-[160px] max-w-xs flex-1">
                      <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={handoverSearch}
                        onChange={e => setHandoverSearch(e.target.value)}
                        placeholder="Tìm sêri, khung, động cơ, LSX..."
                        className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-indigo-400 outline-hidden"
                      />
                      {handoverSearch && (
                        <button
                          type="button"
                          onClick={() => setHandoverSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {isFilterActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setHandoverFilterDate('All');
                        setHandoverFilterModel('All');
                        setHandoverSearch('');
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition cursor-pointer shrink-0"
                    >
                      ✕ Bỏ lọc
                    </button>
                  )}
                </div>

                {/* Minimalist Summary Strip */}
                <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-4">
                      <span className="text-slate-600">
                        Đang hiển thị: <strong className="text-slate-900 font-mono font-bold">{filteredHandoverList.length}</strong> / <span className="font-mono text-slate-500">{handoverScannedList.length}</span> xe
                      </span>
                      <span className="text-slate-600">Dòng xe: <strong className="font-mono font-bold">{new Set(filteredHandoverList.map(x => x.model)).size}</strong></span>
                      <span className="text-slate-600">Lệnh SX: <strong className="font-mono font-bold">{new Set(filteredHandoverList.map(x => x.lsx)).size}</strong></span>
                      {handoverFilterDate !== 'All' && (
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[11px] border border-indigo-200/60">
                          📅 Ngày: {handoverFilterDate}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Súng quét Barcode / QR tự động nhận diện thông tin và đồng bộ thời gian thực
                    </span>
                  </div>

                  {handoverModelSummary.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                      {handoverModelSummary.map(item => (
                        <span key={`${item.model}-${item.color}`} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium">
                          {item.model} ({item.color}): <strong>{item.count}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  {filteredHandoverList.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      {handoverScannedList.length === 0 ? (
                        'Chưa có số Sêri / Số khung nào được quét. Bắn mã vạch vào ô trên để bắt đầu.'
                      ) : (
                        `Không tìm thấy xe bàn giao nào khớp với bộ lọc ngày (${handoverFilterDate}) hoặc từ khóa tìm kiếm.`
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[520px]">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-800 text-white font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 select-none">
                          <tr>
                            <th scope="col" className="px-3 py-2.5 text-center w-10">STT</th>
                            <th scope="col" className="px-3 py-2.5 text-left">Số Sêri</th>
                            <th scope="col" className="px-3 py-2.5 text-left">Số Khung</th>
                            <th scope="col" className="px-3 py-2.5 text-left">Số Động Cơ</th>
                            <th scope="col" className="px-3 py-2.5 text-left">Mã Quy Cách</th>
                            <th scope="col" className="px-3 py-2.5 text-left">Model</th>
                            <th scope="col" className="px-3 py-2.5 text-left">Màu Sắc</th>
                            <th scope="col" className="px-3 py-2.5 text-left">LSX</th>
                            <th scope="col" className="px-3 py-2.5 text-center">Ngày Quét</th>
                            <th scope="col" className="px-3 py-2.5 text-center">Giờ Bàn Giao</th>
                            <th scope="col" className="px-3 py-2.5 text-center w-20">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                          {filteredHandoverList.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3 py-2 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="px-3 py-2 font-mono font-bold text-slate-900">{item.serialNo}</td>
                              <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{item.chassisNo || '--'}</td>
                              <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{item.engineNo || '--'}</td>
                              <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{item.partCode}</td>
                              <td className="px-3 py-2 font-bold text-slate-850">{item.model}</td>
                              <td className="px-3 py-2 text-slate-600">{item.color}</td>
                              <td className="px-3 py-2 font-mono text-slate-600">{item.lsx}</td>
                              <td className="px-3 py-2 text-center font-mono text-slate-500">{item.date || '--'}</td>
                              <td className="px-3 py-2 text-center font-mono text-slate-500">{item.scannedAt}</td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingHandoverItem({ ...item })}
                                    className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                    title="Chỉnh sửa thông tin xe này"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm(`Xóa xe Sêri "${item.serialNo}" khỏi danh sách bàn giao?`)) {
                                        saveHandoverList(handoverScannedList.filter(x => x.id !== item.id));
                                      }
                                    }}
                                    className="p-1 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                    title="Xóa xe này khỏi danh sách bàn giao"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ================================== 3. BẢNG MÃ QUY CÁCH XE (MASTER PART CODES) ================================== */}
          {oqcSubView === 'part_codes' && (() => {
            const filteredPartCodes = oqcPartCodes.filter(item => {
              if (partCodeModelFilter !== 'All' && item.model !== partCodeModelFilter) {
                return false;
              }
              if (partCodeSearch.trim()) {
                const s = partCodeSearch.trim().toLowerCase();
                const mCode = (item.partCode || '').toLowerCase().includes(s);
                const mName = (item.nameWithColor || '').toLowerCase().includes(s);
                const mModel = (item.model || '').toLowerCase().includes(s);
                const mColor = (item.color || '').toLowerCase().includes(s);
                return mCode || mName || mModel || mColor;
              }
              return true;
            });

            const uniquePartCodeModels = Array.from(new Set(oqcPartCodes.map(x => x.model).filter(Boolean))).sort();
            const totalPages = Math.max(1, Math.ceil(filteredPartCodes.length / partCodePageSize));
            const safeCurrentPage = Math.min(partCodeCurrentPage, totalPages);
            const paginatedList = partCodePageSize === 0 
              ? filteredPartCodes 
              : filteredPartCodes.slice((safeCurrentPage - 1) * partCodePageSize, safeCurrentPage * partCodePageSize);

            const handleExportPartCodesExcel = () => {
              if (oqcPartCodes.length === 0) {
                alert('Bảng mã quy cách hiện đang trống!');
                return;
              }
              const today = new Date().toLocaleDateString('vi-VN');
              const aoaData: any[][] = [];
              const rowTracker: { type: string; isZebra?: boolean }[] = [];
              const merges: any[] = [];

              const addRow = (row: any[], type: string, isZebra: boolean = false) => {
                const fullRow = [...row];
                while (fullRow.length < 6) {
                  fullRow.push("");
                }
                aoaData.push(fullRow);
                rowTracker.push({ type, isZebra });
                return aoaData.length - 1;
              };

              // Header
              const r0 = addRow(["CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT - PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL)"], 'header-company');
              merges.push({ s: { r: r0, c: 0 }, e: { r: r0, c: 5 } });

              const r1 = addRow(["DKBike - Xe cho cả gia đình | Hệ thống Quản lý Chất lượng DK QMS"], 'header-department');
              merges.push({ s: { r: r1, c: 0 }, e: { r: r1, c: 5 } });

              const r2 = addRow(["DANH MỤC MÃ QUY CÁCH XE THÀNH PHẨM (MASTER CODES)"], 'header-title');
              merges.push({ s: { r: r2, c: 0 }, e: { r: r2, c: 5 } });

              const r3 = addRow([`Ngày xuất: ${today}   |   Tổng số mã quy cách: ${oqcPartCodes.length} mã   |   Số dòng xe (Model): ${uniquePartCodeModels.length}`], 'header-date');
              merges.push({ s: { r: r3, c: 0 }, e: { r: r3, c: 5 } });

              addRow([], 'empty');

              addRow(["STT", "Mã Quy Cách", "Tên Model Kèm Màu", "Dòng Xe (Model)", "Màu Sắc", "Ngày Cập Nhật"], 'detail-header');

              oqcPartCodes.forEach((item, idx) => {
                addRow([
                  idx + 1,
                  item.partCode,
                  item.nameWithColor,
                  item.model,
                  item.color,
                  item.updatedAt || today
                ], 'detail-row', idx % 2 === 1);
              });

              const wb = XLSXStyle.utils.book_new();
              const ws = XLSXStyle.utils.aoa_to_sheet(aoaData);

              // Styling
              const decodedRange = XLSXStyle.utils.decode_range(ws['!ref'] || 'A1:A1');
              const totalRows = decodedRange.e.r + 1;
              const totalCols = decodedRange.e.c + 1;

              const borderThin = { style: "thin", color: { rgb: "CBD5E1" } };
              const cellBordersNormal = {
                top: borderThin, bottom: borderThin,
                left: borderThin, right: borderThin
              };

              for (let r = 0; r < totalRows; r++) {
                const tracker = rowTracker[r];
                const rType = tracker?.type;
                const isZebra = tracker?.isZebra;

                for (let c = 0; c < totalCols; c++) {
                  const cellRef = XLSXStyle.utils.encode_cell({ r, c });
                  let cell = ws[cellRef];
                  if (!cell) {
                    cell = ws[cellRef] = { t: 's', v: '' };
                  }

                  if (rType === 'header-company') {
                    cell.s = {
                      font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "1E3A8A" } },
                      alignment: { horizontal: "left", vertical: "center" }
                    };
                  } else if (rType === 'header-department') {
                    cell.s = {
                      font: { name: "Segoe UI", sz: 9.5, italic: true, color: { rgb: "475569" } },
                      alignment: { horizontal: "left", vertical: "center" }
                    };
                  } else if (rType === 'header-title') {
                    cell.s = {
                      font: { name: "Segoe UI", sz: 14, bold: true, color: { rgb: "1E3A8A" } },
                      alignment: { horizontal: "center", vertical: "center" }
                    };
                  } else if (rType === 'header-date') {
                    cell.s = {
                      font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "475569" } },
                      alignment: { horizontal: "center", vertical: "center" }
                    };
                  } else if (rType === 'detail-header') {
                    cell.s = {
                      fill: { fgColor: { rgb: "1E3A8A" } },
                      font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
                      alignment: { horizontal: "center", vertical: "center" },
                      border: cellBordersNormal
                    };
                  } else if (rType === 'detail-row') {
                    cell.s = {
                      fill: isZebra ? { fgColor: { rgb: "F8FAFC" } } : undefined,
                      font: { 
                        name: c === 1 ? "Consolas" : "Segoe UI", 
                        sz: 10, 
                        bold: c === 1,
                        color: c === 1 ? { rgb: "1E3A8A" } : { rgb: "1E293B" } 
                      },
                      alignment: { 
                        horizontal: (c === 2 || c === 3 || c === 4) ? "left" : "center", 
                        vertical: "center" 
                      },
                      border: cellBordersNormal
                    };
                  }
                }
              }

              ws['!merges'] = merges;
              ws['!cols'] = [
                { wch: 6 },   // STT
                { wch: 18 },  // Mã Quy Cách
                { wch: 38 },  // Tên Model Kèm Màu
                { wch: 22 },  // Dòng Xe
                { wch: 22 },  // Màu Sắc
                { wch: 14 }   // Ngày Cập Nhật
              ];

              XLSXStyle.utils.book_append_sheet(wb, ws, "Bang_Ma_Xe");
              XLSXStyle.writeFile(wb, `DKBike_Bang_Ma_Quy_Cach_Xe_${today.replace(/\//g, '_')}.xlsx`);
            };

            const handleStartEditPartCode = (item: OqcPartCodeItem) => {
              setEditingPartCode(item);
              setPartCodeFormCode(item.partCode);
              setPartCodeFormNameWithColor(item.nameWithColor);
              setPartCodeFormModel(item.model);
              setPartCodeFormColor(item.color);
              setPartCodeFormError('');
              setShowAddPartCodeModal(true);
            };

            const handleDeletePartCode = (item: OqcPartCodeItem) => {
              if (!window.confirm(`Xác nhận xóa mã quy cách "${item.partCode}" (${item.nameWithColor})?`)) return;
              const updated = oqcPartCodes.filter(x => x.id !== item.id && x.partCode !== item.partCode);
              saveOqcPartCodes(updated);
            };

            const handleResetDefaultPartCodes = () => {
              if (!window.confirm(`Khôi phục lại toàn bộ ${INITIAL_OQC_PART_CODES.length} mã quy cách xe gốc từ nhà máy? Các thay đổi tùy biến trước đó sẽ được làm mới.`)) return;
              saveOqcPartCodes(INITIAL_OQC_PART_CODES);
              alert(`Đã khôi phục thành công ${INITIAL_OQC_PART_CODES.length} mã quy cách gốc!`);
            };

            return (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* Minimalist Toolbar */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-56 sm:w-72">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={partCodeSearch}
                        onChange={e => {
                          setPartCodeSearch(e.target.value);
                          setPartCodeCurrentPage(1);
                        }}
                        placeholder="Tìm theo mã, tên model, màu xe..."
                        className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-slate-400 outline-hidden"
                      />
                    </div>

                    <select
                      value={partCodeModelFilter}
                      onChange={e => {
                        setPartCodeModelFilter(e.target.value);
                        setPartCodeCurrentPage(1);
                      }}
                      className="bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-slate-400 outline-hidden cursor-pointer"
                    >
                      <option value="All">Tất cả model ({uniquePartCodeModels.length})</option>
                      {uniquePartCodeModels.map(m => {
                        const count = oqcPartCodes.filter(x => x.model === m).length;
                        return (
                          <option key={m} value={m}>
                            {m} ({count} màu)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPartCode(null);
                        setPartCodeFormCode('');
                        setPartCodeFormNameWithColor('');
                        setPartCodeFormModel('');
                        setPartCodeFormColor('');
                        setPartCodeFormError('');
                        setShowAddPartCodeModal(true);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm mã xe
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPastePartCodesText('');
                        setPastePartCodesError('');
                        setShowPastePartCodesModal(true);
                      }}
                      className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer shadow-xs"
                      title="Dán danh sách mã quy cách hàng loạt từ bảng tính Excel"
                    >
                      <Copy className="w-3.5 h-3.5 text-blue-600" /> Dán hàng loạt
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPartCodesExcel}
                      className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer shadow-xs"
                      title="Tải bảng mã xe thành phẩm (Excel)"
                    >
                      <Download className="w-3.5 h-3.5" /> Xuất Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleResetDefaultPartCodes}
                      className="text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2 py-1.5 rounded-lg transition cursor-pointer"
                      title="Khôi phục danh mục mã xe gốc"
                    >
                      Khôi phục gốc
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  {filteredPartCodes.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      Không tìm thấy mã quy cách phù hợp.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[550px]">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-800 text-white font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 select-none">
                          <tr>
                            <th scope="col" className="px-3 py-2.5 text-center w-10">STT</th>
                            <th scope="col" className="px-3 py-2.5 text-left">Mã Quy Cách</th>
                            <th scope="col" className="px-3 py-2.5 text-left">Tên Model Kèm Màu</th>
                            <th scope="col" className="px-3 py-2.5 text-left">Dòng Xe (Model)</th>
                            <th scope="col" className="px-3 py-2.5 text-left">Màu Sắc</th>
                            <th scope="col" className="px-3 py-2.5 text-center">Cập Nhật</th>
                            <th scope="col" className="px-3 py-2.5 text-center w-20">Thao Tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                          {paginatedList.map((item, idx) => {
                            const globalIdx = partCodePageSize === 0 ? idx : (safeCurrentPage - 1) * partCodePageSize + idx;
                            return (
                              <tr key={item.id || item.partCode} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-2 text-center font-mono text-slate-400">{globalIdx + 1}</td>
                                <td className="px-3 py-2 font-mono font-bold text-blue-700">{item.partCode}</td>
                                <td className="px-3 py-2 font-bold text-slate-900">{item.nameWithColor}</td>
                                <td className="px-3 py-2 text-slate-700">{item.model}</td>
                                <td className="px-3 py-2 text-slate-600">{item.color}</td>
                                <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-400">{item.updatedAt || '--'}</td>
                                <td className="px-3 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditPartCode(item)}
                                      className="text-slate-400 hover:text-blue-600 p-1 rounded transition cursor-pointer"
                                      title="Chỉnh sửa"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePartCode(item)}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                                      title="Xóa"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {filteredPartCodes.length > partCodePageSize && partCodePageSize > 0 && (
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                    <span>
                      Hiển thị {(safeCurrentPage - 1) * partCodePageSize + 1} - {Math.min(safeCurrentPage * partCodePageSize, filteredPartCodes.length)} / {filteredPartCodes.length} mã
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={safeCurrentPage === 1}
                        onClick={() => setPartCodeCurrentPage(p => Math.max(1, p - 1))}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-bold cursor-pointer"
                      >
                        Trước
                      </button>
                      <span className="px-2 font-mono font-bold text-slate-800">
                        {safeCurrentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={safeCurrentPage === totalPages}
                        onClick={() => setPartCodeCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-bold cursor-pointer"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ================================== 4. VISUAL KCS/OQC DASHBOARD ================================== */}
          {oqcSubView === 'dashboard' && (() => {
              const {
                liveLapRapTotal,
                datVal,
                loiVal,
                pieDatPercent,
                pieLoiPercent,
                activeBarData,
                liveModelDefects,
                assembledModels,
                modelStats,
                maxTotal
              } = oqcDashboardStats;

              const today = new Date();
              let targetMonth = today.getMonth() + 1;
              let targetYear = today.getFullYear();
              
              if (oqcFilterMonth !== 'All') {
                targetMonth = parseInt(oqcFilterMonth, 10);
              } else if (filteredOqc.length > 0) {
                const monthCounts: Record<number, number> = {};
                filteredOqc.forEach(r => {
                  if (r.month) monthCounts[r.month] = (monthCounts[r.month] || 0) + 1;
                });
                const sortedMonths = Object.keys(monthCounts).sort((a, b) => monthCounts[parseInt(b, 10)] - monthCounts[parseInt(a, 10)]);
                if (sortedMonths.length > 0) {
                  targetMonth = parseInt(sortedMonths[0], 10);
                }
              }

              if (oqcFilterYear !== 'All') {
                targetYear = parseInt(oqcFilterYear, 10);
              } else if (filteredOqc.length > 0) {
                const yearCounts: Record<number, number> = {};
                filteredOqc.forEach(r => {
                  if (r.year) yearCounts[r.year] = (yearCounts[r.year] || 0) + 1;
                });
                const sortedYears = Object.keys(yearCounts).sort((a, b) => yearCounts[parseInt(b, 10)] - yearCounts[parseInt(a, 10)]);
                if (sortedYears.length > 0) {
                  targetYear = parseInt(sortedYears[0], 10);
                }
              }

              const isWeekFilterActive = oqcFilterWeek !== 'All' || oqcFilterDate !== 'All';
              const selectedWeek = oqcFilterWeek !== 'All' ? oqcFilterWeek : (oqcFilterDate !== 'All' ? getWeekAndMonthFromDate(oqcFilterDate).week : 'T1');
              
              const currentMonthStr = isWeekFilterActive ? `Tuần ${selectedWeek} - Tháng ${targetMonth}` : `Tháng ${targetMonth}`;

              let targetAssembled = 7200;

              if (isWeekFilterActive) {
                let activeWeeklyPlans = weeklyPlans;
                if (!activeWeeklyPlans || activeWeeklyPlans.length === 0) {
                  try {
                    const saved = localStorage.getItem('dk_weekly_plans');
                    if (saved) activeWeeklyPlans = JSON.parse(saved);
                  } catch (e) {}
                }
                if (!activeWeeklyPlans) activeWeeklyPlans = [];

                const planForWeek = activeWeeklyPlans.find(p => 
                  p.week === selectedWeek && 
                  p.month === targetMonth && 
                  p.year === targetYear
                );

                let foundValue: number | null = null;
                if (planForWeek && planForWeek.targets) {
                  const lrTarget = planForWeek.targets.find(t => {
                    const contentLower = t.content.toLowerCase();
                    return (
                      (contentLower.includes('lắp ráp') || contentLower.includes('lap rap')) &&
                      (contentLower.includes('số lượng') || contentLower.includes('so luong') || contentLower.includes('sl') || t.unit.toLowerCase() === 'xe')
                    );
                  }) || planForWeek.targets.find(t => {
                    const contentLower = t.content.toLowerCase();
                    return contentLower.includes('lắp ráp') || contentLower.includes('lap rap');
                  });

                  if (lrTarget) {
                    const parsed = parseInt(String(lrTarget.targetValue).replace(/[^0-9]/g, ''), 10);
                    if (parsed && parsed > 0) {
                      foundValue = parsed;
                    }
                  }
                }
                targetAssembled = foundValue !== null ? foundValue : 1800;
              } else {
                let activeMonthlyPlans = monthlyPlans;
                if (!activeMonthlyPlans || activeMonthlyPlans.length === 0) {
                  try {
                    const saved = localStorage.getItem('dk_monthly_plans');
                    if (saved) activeMonthlyPlans = JSON.parse(saved);
                  } catch (e) {}
                }
                if (!activeMonthlyPlans) activeMonthlyPlans = [];

                const planForMonth = activeMonthlyPlans.find(p => 
                  p.month === targetMonth && 
                  p.year === targetYear
                );

                let foundValue: number | null = null;
                if (planForMonth && planForMonth.targets) {
                  const lrTarget = planForMonth.targets.find(t => {
                    const contentLower = t.content.toLowerCase();
                    return (
                      (contentLower.includes('lắp ráp') || contentLower.includes('lap rap')) &&
                      (contentLower.includes('số lượng') || contentLower.includes('so luong') || contentLower.includes('sl') || t.unit.toLowerCase() === 'xe')
                    );
                  }) || planForMonth.targets.find(t => {
                    const contentLower = t.content.toLowerCase();
                    return contentLower.includes('lắp ráp') || contentLower.includes('lap rap');
                  });

                  if (lrTarget) {
                    const parsed = parseInt(String(lrTarget.targetValue).replace(/[^0-9]/g, ''), 10);
                    if (parsed && parsed > 0) {
                      foundValue = parsed;
                    }
                  }
                }
                targetAssembled = foundValue !== null ? foundValue : 7200;
              }

              const targetProgress = targetAssembled > 0 ? Math.min(100, Math.round((liveLapRapTotal / targetAssembled) * 100)) : 0;

              const lastDayDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
              const daysRemaining = lastDayDate - today.getDate();

              const lsxVal = filteredOqc.length;
              const laprapVal = liveLapRapTotal;

              const pieDatCount = datVal;
              const pieLoiCount = loiVal;
              const currentAssembled = liveLapRapTotal;

              return (
                <div className="space-y-6 animate-in fade-in duration-300">
                  
                  {/* INTERACTIVE DASHBOARD FILTER BAR */}
                  <div className="bg-slate-50 p-2.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5 sm:space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/40">
                      <div className="flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                        <h4 className="text-[10px] sm:text-[10.5px] font-black uppercase text-slate-700 tracking-wider">Bộ lọc dữ liệu chất lượng KCS (OQC Dashboard)</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {(oqcFilterMonth !== 'All' || oqcFilterYear !== 'All' || oqcFilterDate !== 'All' || oqcFilterModel !== 'All' || oqcFilterWeek !== 'All' || oqcSearch !== '') && (
                          <button
                             type="button"
                             onClick={() => {
                               setOqcFilterMonth('All');
                               setOqcFilterYear('All');
                               setOqcFilterDate('All');
                               setOqcFilterModel('All');
                               setOqcFilterWeek('All');
                               setOqcSearch('');
                             }}
                             className="text-[9px] sm:text-[10px] bg-red-50 text-red-650 hover:bg-red-100 border border-red-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                          >
                            ✕ Nhập lại bộ lọc (Reset)
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsOqcFilterExpanded(!isOqcFilterExpanded)}
                          className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-blue-700 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg transition-all cursor-pointer"
                        >
                          {isOqcFilterExpanded ? (
                            <>Thu gọn <ChevronUp className="w-3 h-3" /></>
                          ) : (
                            <>Mở rộng <ChevronDown className="w-3 h-3" /></>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {isOqcFilterExpanded && (
                      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
                        {/* Search */}
                        <div className="col-span-2 lg:col-span-1 space-y-0.5 sm:space-y-1">
                          <label className="text-[8.5px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 font-sans">
                            <Search className="w-2.5 h-2.5 text-indigo-500" /> Tìm nhanh
                          </label>
                          <input
                            type="text"
                            value={oqcSearch}
                            onChange={(e) => setOqcSearch(e.target.value)}
                            placeholder="Số khung, mã phụ tùng, màu..."
                            className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2 sm:p-2 text-xs focus:outline-none focus:border-blue-500 font-bold text-slate-700"
                          />
                        </div>

                        {/* Month */}
                        <div className="col-span-1 space-y-0.5 sm:space-y-1">
                          <label className="text-[8.5px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 font-sans">
                            <Calendar className="w-2.5 h-2.5 text-blue-500" /> Lọc theo Tháng
                          </label>
                          <select
                            value={oqcFilterMonth}
                            onChange={(e) => setOqcFilterMonth(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2 sm:p-2 text-xs focus:outline-none focus:border-blue-500 font-bold text-slate-700 cursor-pointer"
                          >
                            <option value="All">Tất cả tháng</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                              <option key={month} value={String(month)}>Tháng {month}</option>
                            ))}
                          </select>
                        </div>

                        {/* Year */}
                        <div className="col-span-1 space-y-0.5 sm:space-y-1">
                          <label className="text-[8.5px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 font-sans">
                            <Calendar className="w-2.5 h-2.5 text-blue-500" /> Lọc theo Năm
                          </label>
                          <select
                            value={oqcFilterYear}
                            onChange={(e) => setOqcFilterYear(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2 sm:p-2 text-xs focus:outline-none focus:border-blue-500 font-bold text-slate-700 cursor-pointer"
                          >
                            <option value="All">Tất cả năm</option>
                            {uniqueOqcYears.map(year => (
                              <option key={year} value={String(year)}>Năm {year}</option>
                            ))}
                          </select>
                        </div>

                        {/* Week */}
                        <div className="col-span-1 space-y-0.5 sm:space-y-1">
                          <label className="text-[8.5px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 font-sans">
                            <Calendar className="w-2.5 h-2.5 text-blue-500" /> Lọc theo Tuần
                          </label>
                          <select
                            value={oqcFilterWeek}
                            onChange={(e) => setOqcFilterWeek(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2 sm:p-2 text-xs focus:outline-none focus:border-blue-500 font-bold text-slate-700 cursor-pointer animate-none"
                          >
                            <option value="All">Tất cả tuần</option>
                            <option value="T1">Tuần 1</option>
                            <option value="T2">Tuần 2</option>
                            <option value="T3">Tuần 3</option>
                            <option value="T4">Tuần 4</option>
                            <option value="T5">Tuần 5</option>
                          </select>
                        </div>

                        {/* Date */}
                        <div className="col-span-1 space-y-0.5 sm:space-y-1">
                          <label className="text-[8.5px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 font-sans">
                            <Clock className="w-2.5 h-2.5 text-blue-500" /> Lọc theo Ngày
                          </label>
                          <select
                            value={oqcFilterDate}
                            onChange={(e) => setOqcFilterDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2 sm:p-2 text-xs focus:outline-none focus:border-blue-500 font-bold text-slate-700 cursor-pointer"
                          >
                            <option value="All">Tất cả ngày</option>
                            {uniqueOqcDates.map(date => (
                              <option key={date} value={date}>{date}</option>
                            ))}
                          </select>
                        </div>

                        {/* Model */}
                        <div className="col-span-2 lg:col-span-1 space-y-0.5 sm:space-y-1">
                          <label className="text-[8.5px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 font-sans">
                            <Truck className="w-2.5 h-2.5 text-blue-500" /> Dòng xe (Model)
                          </label>
                          <select
                            value={oqcFilterModel}
                            onChange={(e) => setOqcFilterModel(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2 sm:p-2 text-xs focus:outline-none focus:border-blue-500 font-bold text-slate-700 cursor-pointer"
                          >
                            <option value="All">Tất cả Dòng xe</option>
                            {uniqueOqcModels.map((mdl, idx) => (
                              <option key={`${mdl}-${idx}`} value={mdl}>{mdl}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 1. TOP CARDS GRID */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 sm:gap-4 animate-in slide-in-from-top-1 px-0.5">
                    {/* TIẾN ĐỘ LẮP RÁP THÁNG HIỆN TẠI */}
                    <div className="col-span-2 md:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-5 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                      <div className="flex justify-between items-start select-none">
                        <div>
                          <h4 className="text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider">Tiến độ lắp ráp {currentMonthStr}</h4>
                          <span className="text-2xl sm:text-3xl font-black text-rose-500 font-mono block mt-1">{targetProgress}%</span>
                        </div>
                        <button type="button" className="text-slate-350 hover:text-slate-500 p-1 transition cursor-pointer">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-2 mt-3 sm:mt-4 select-none">
                        <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="absolute top-0 left-0 h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${targetProgress}%` }} />
                        </div>
                        <span className="text-[9.5px] sm:text-[10.5px] font-bold text-slate-550 block">
                          Hiện tại <strong className="text-slate-800 font-mono">{currentAssembled.toLocaleString()}</strong> | Mục tiêu <strong className="text-slate-800 font-mono">{targetAssembled.toLocaleString()}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Ngày còn lại Tháng Hiện Tại */}
                    <div className="col-span-1 bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-5 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                      <div className="flex justify-between items-start select-none">
                        <h4 className="text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider leading-tight font-sans">Ngày còn lại<br />{currentMonthStr}</h4>
                        <button type="button" className="text-slate-350 hover:text-slate-500 p-1 transition cursor-pointer font-bold">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex flex-col items-center justify-center p-1 sm:p-2 mb-1 select-none">
                        <div className="bg-blue-500 text-white font-black text-lg sm:text-2xl w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-mono shadow-md shadow-blue-100/50 transition-all duration-500">
                          {daysRemaining}
                        </div>
                        <span className="text-[8.5px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1 sm:mt-1.5 font-sans">Ngày</span>
                      </div>
                    </div>

                    {/* SL xe theo LSX */}
                    <div className="col-span-1 bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-5 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                      <div className="flex justify-between items-start select-none">
                        <div>
                          <h4 className="text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider leading-none">SL xe theo LSX</h4>
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-[8px] sm:text-[9px] font-black text-amber-600 border border-amber-200/40 px-1.5 py-0.5 rounded-lg mt-1 select-none shrink-0">
                            ✧ Smart LSX
                          </span>
                        </div>
                        <button type="button" className="text-slate-350 hover:text-slate-500 p-1 transition cursor-pointer">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-3 sm:mt-4 select-none">
                        <span className="text-xl sm:text-3xl font-black text-red-500 font-mono block tracking-tight">{lsxVal.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* SL xe lắp ráp */}
                    <div className="col-span-1 bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-5 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                      <div className="flex justify-between items-start select-none">
                        <div>
                          <h4 className="text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider leading-none">SL xe lắp ráp</h4>
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-[8px] sm:text-[9px] font-black text-amber-600 border border-amber-200/40 px-1.5 py-0.5 rounded-lg mt-1 select-none shrink-0">
                            ✦ Smart ráp
                          </span>
                        </div>
                        <button type="button" className="text-slate-350 hover:text-slate-500 p-1 transition cursor-pointer">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-3 sm:mt-4 select-none">
                        <span className="text-xl sm:text-3xl font-black text-amber-500 font-mono block tracking-tight">{laprapVal.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* SL xe đạt lần 1 */}
                    <div className="col-span-1 bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-5 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                      <div className="flex justify-between items-start select-none">
                        <div>
                          <h4 className="text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider leading-none">SL xe đạt lần 1</h4>
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-[8px] sm:text-[9px] font-black text-blue-600 border border-blue-200/40 px-1.5 py-0.5 rounded-lg mt-1 select-none shrink-0">
                            ✦ Smart Đạt
                          </span>
                        </div>
                        <button type="button" className="text-slate-355 hover:text-slate-505 p-1 transition cursor-pointer">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-3 sm:mt-4 select-none">
                        <span className="text-xl sm:text-3xl font-black text-sky-500 font-mono block tracking-tight">{datVal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. BLUE LINE SEPARATOR WITH DOTS */}
                  <div className="w-full h-[3px] bg-blue-500/10 rounded-full relative my-1 select-none">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />
                  </div>

                  {/* 3. GRAPHS ROW */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Graph: Tình trạng kiểm tra */}
                    <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 hover:shadow-md transition-all duration-300 flex flex-col justify-between h-[340px]">
                      <div className="flex justify-between items-center select-none border-b border-slate-100 pb-2.5">
                        <div>
                          <h4 className="font-extrabold text-xs uppercase text-slate-755 flex items-center gap-1.5">
                            Tình trạng kiểm tra
                          </h4>
                          <span className="inline-flex items-center gap-1 bg-purple-50 text-[9px] font-black text-purple-600 border border-purple-200/30 px-2 py-0.5 rounded-md mt-1 select-none">
                            ✦ Phân tích thông minh
                          </span>
                        </div>
                        <button type="button" className="text-slate-300 hover:text-slate-500 rounded p-1 transition cursor-pointer">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-grow flex items-center justify-center">
                        <PieChartComponent 
                          datPercentage={Math.round(pieDatPercent)} 
                          loiPercentage={Math.round(pieLoiPercent)} 
                          datCount={pieDatCount} 
                          loiCount={pieLoiCount} 
                        />
                      </div>
                    </div>

                    {/* Right Graph: Model Lắp ráp */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 hover:shadow-md transition-all duration-300 flex flex-col justify-between h-[340px]">
                      <div className="flex justify-between items-center select-none border-b border-slate-100 pb-2.5">
                        <div>
                          <h4 className="font-extrabold text-xs uppercase text-slate-755 flex items-center gap-1.5">
                            Sản lượng Model lắp ráp dập sườn
                          </h4>
                          <span className="inline-flex items-center gap-1 bg-purple-50 text-[9px] font-black text-purple-600 border border-purple-200/30 px-2 py-0.5 rounded-md mt-1 select-none">
                            ✦ Phân tích thông minh (Báo cáo ngày)
                          </span>
                        </div>
                        <button type="button" className="text-slate-300 hover:text-slate-500 rounded p-1 transition cursor-pointer">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-grow pt-2">
                        <BarChartComponent data={activeBarData} onBarClick={setOqcDetailModalModel} />
                      </div>
                    </div>
                  </div>

                  {/* 3.5. STACKED CHART FOR QUALITY RATE & VOLUME (OQC) */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 hover:shadow-md transition-all duration-300">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 select-none border-b border-slate-100 pb-3 mb-5">
                      <div>
                        <h4 className="font-extrabold text-xs uppercase text-slate-755 flex items-center gap-2">
                          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          Phân tích Chất lượng Đạt / Lỗi Xếp chồng theo Dòng xe (OQC)
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase font-mono">
                          Số lượng đạt (Xanh lá) ở dưới • Số lượng lỗi (Đỏ/Cam) ở trên
                        </p>
                      </div>
                      
                      {/* Selector Controls */}
                      <div className="flex bg-slate-100/85 p-0.5 rounded-lg border border-slate-200/60 text-[10px] uppercase font-black tracking-wider shrink-0 transition-all">
                        <button
                          type="button"
                          onClick={() => setStackedMode('volume')}
                          className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${stackedMode === 'volume' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Theo Số lượng (Xe)
                        </button>
                        <button
                          type="button"
                          onClick={() => setStackedMode('rate')}
                          className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${stackedMode === 'rate' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Theo Tỷ lệ (%)
                        </button>
                      </div>
                    </div>

                    {/* Stacked Chart Area */}
                    {assembledModels.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 italic">
                        Không có dữ liệu OQC để vẽ biểu đồ xếp chồng.
                      </div>
                    ) : (
                      <div className="space-y-4">
                            {/* Chart Grid representing each model as a vertical bar */}
                            <div className="flex items-end justify-around gap-2 h-[260px] pt-4 px-2 sm:px-4 relative font-sans select-none border-b border-slate-100/80">
                              
                              {/* Background vertical scale lines */}
                              <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none">
                                {[100, 75, 50, 25, 0].map((tick) => (
                                  <div key={tick} className="flex items-center w-full relative h-0">
                                    <span className="text-[9px] text-slate-400 font-extrabold font-mono w-10 shrink-0 text-right pr-2 select-none">
                                      {stackedMode === 'rate' ? `${tick}%` : Math.round((tick / 100) * maxTotal)}
                                    </span>
                                    <div className="flex-1 border-t border-dashed border-slate-100" />
                                  </div>
                                ))}
                              </div>

                              {/* Stacked Bars Container */}
                              <div className="absolute inset-y-0 left-12 right-0 flex justify-around items-end z-10 bottom-0 select-none">
                                {modelStats.map((item, idx) => {
                                  let passHeight = 0;
                                  let failHeight = 0;
                                  
                                  if (stackedMode === 'rate') {
                                    passHeight = item.passRate;
                                    failHeight = item.failRate;
                                  } else {
                                    passHeight = (item.passed / maxTotal) * 100;
                                    failHeight = (item.failed / maxTotal) * 100;
                                  }

                                  const showPassLabel = passHeight > 12;
                                  const showFailLabel = failHeight > 12;

                                  return (
                                    <div 
                                      key={`${item.model}-${idx}`}
                                      className="flex flex-col items-center h-full justify-end group/bar relative" 
                                      style={{ width: `${Math.max(12, Math.min(18, 80 / modelStats.length))}%` }}
                                    >
                                      {/* Stacked Pillar Core */}
                                      <div className="w-full h-full flex flex-col justify-end bg-slate-50/40 hover:bg-slate-100/50 rounded-t-xl transition-all duration-300 relative border border-transparent hover:border-slate-200/50">
                                        
                                        {/* Sát trên - Lỗi (Red/Orange segment) */}
                                        {item.failed > 0 && (
                                          <div 
                                            className="w-full bg-rose-500 hover:bg-rose-400 transition-all duration-305 flex flex-col items-center justify-center relative cursor-pointer shadow-inner shrink-0"
                                            style={{ height: `${failHeight}%` }}
                                            onClick={() => setOqcDetailModalModel(item.model)}
                                          >
                                            {showFailLabel && (
                                              <div className="text-[10px] text-white font-mono font-black tracking-tighter text-center leading-none">
                                                <span className="block">{item.failed}</span>
                                                <span className="block text-[8px] opacity-90">{item.failRate}%</span>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Sát dưới - Đạt (Green segment) */}
                                        {item.passed > 0 && (
                                          <div 
                                            className={`w-full bg-emerald-500 hover:bg-emerald-400 transition-all duration-305 flex flex-col items-center justify-center relative cursor-pointer shadow-inner shrink-0 ${item.failed === 0 ? 'rounded-t-xl' : 'rounded-t-none'}`}
                                            style={{ height: `${passHeight}%` }}
                                            onClick={() => setOqcDetailModalModel(item.model)}
                                          >
                                            {showPassLabel && (
                                              <div className="text-[10px] text-white font-mono font-black tracking-tighter text-center leading-none">
                                                <span className="block">{item.passed}</span>
                                                <span className="block text-[8px] opacity-90">{item.passRate}%</span>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                      </div>

                                      {/* Dynamic Detailed Interacting Tooltip */}
                                      <div className="absolute bottom-full mb-3 opacity-0 group-hover/bar:opacity-100 transition-all bg-slate-900 text-white text-[10px] font-medium p-3 rounded-xl shadow-lg pointer-events-none whitespace-nowrap z-50 transform translate-y-1 group-hover/bar:translate-y-0 scale-95 group-hover/bar:scale-100 border border-slate-850">
                                        <div className="font-extrabold uppercase text-slate-400 tracking-wider text-[8px] pb-1 border-b border-slate-800 mb-1 flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                          Chi tiết chất lượng dòng xe (KCS)
                                        </div>
                                        <div className="font-extrabold text-[11px] text-white uppercase">{item.model}</div>
                                        <div className="mt-1.5 space-y-0.5 font-mono font-bold text-[10px]">
                                          <div className="flex justify-between gap-5 text-emerald-400">
                                            <span>✓ Đạt chuẩn:</span>
                                            <span>{item.passed} xe ({item.passRate}%)</span>
                                          </div>
                                          <div className="flex justify-between gap-5 text-rose-400">
                                            <span>✗ Có khuyết phẩm:</span>
                                            <span>{item.failed} xe ({item.failRate}%)</span>
                                          </div>
                                          <div className="flex justify-between gap-5 text-slate-350 border-t border-slate-800 pt-1 mt-1 font-sans">
                                            <span>🛞 Tổng xe:</span>
                                            <span className="font-mono font-black">{item.total} xe</span>
                                          </div>
                                        </div>
                                        <div className="text-[8px] italic text-slate-500 mt-1.5 block text-center font-sans">Bấm vào cột để xem nhật ký</div>
                                      </div>

                                    </div>
                                  );
                                })}
                              </div>

                            </div>

                            {/* X-Axis Labels and Legends */}
                            <div className="flex flex-col gap-3">
                              {/* Labels under bars */}
                              <div className="flex justify-around items-center pl-12 select-none">
                                {modelStats.map((item, idx) => (
                                  <div 
                                    key={`${item.model}-${idx}`} 
                                    className="text-[10px] font-black text-slate-500 uppercase truncate text-center leading-tight tracking-tight scale-90 cursor-pointer hover:text-blue-600 transition-colors" 
                                    style={{ width: `${Math.max(12, Math.min(18, 80 / modelStats.length))}%` }} 
                                    title={item.model}
                                    onClick={() => setOqcDetailModalModel(item.model)}
                                  >
                                    {item.model.replace('DK ', '')}
                                  </div>
                                ))}
                              </div>

                              {/* Legend Indicator bar on the bottom */}
                              <div className="flex flex-wrap items-center justify-center gap-5 text-[10px] uppercase font-black text-slate-500 bg-slate-50 border border-slate-100 rounded-xl py-2 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-3 h-3 rounded bg-emerald-500" />
                                  <span>Đạt chuẩn ({modelStats.reduce((acc, curr) => acc + curr.passed, 0)} xe)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-3 h-3 rounded bg-rose-500" />
                                  <span>Khuyết phẩm ({modelStats.reduce((acc, curr) => acc + curr.failed, 0)} xe)</span>
                                </div>
                                <div className="w-px h-3 bg-slate-200 hidden sm:block" />
                                <div className="text-[9px] tracking-wide text-slate-400">
                                  Chế độ hiển thị: <strong className="text-slate-600">{stackedMode === 'rate' ? 'Tỉ lệ % đại lượng' : 'Số lượng xe thực tế'}</strong>
                                </div>
                              </div>
                            </div>
                          </div>
                    )}
                  </div>

                  {/* 4. DEFECTS GRID */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 select-none font-sans">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping shrink-0" />
                        <h3 className="text-xs uppercase font-black text-slate-705 tracking-wider">Top 5 khuyết phẩm chất lượng xe theo từng dòng ({assembledModels.length} dòng xe lắp ráp)</h3>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold italic font-sans">* Mỗi thẻ tương ứng với 1 model xe được lắp ráp trong kỳ lọc</span>
                    </div>

                    {assembledModels.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-slate-205 p-12 text-center text-xs text-slate-400 italic">
                        Không ghi nhận dòng xe lắp ráp (KCS) nào khớp với bộ lọc dữ liệu hiện tại.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {assembledModels.map((model, idx) => {
                          const listDefects = (liveModelDefects[model] || []).sort((a,b) => b.count - a.count).slice(0, 5);
                          return (
                            <ModelDefectCard 
                              key={`${model}-${idx}`}
                              modelName={model} 
                              defects={listDefects} 
                              onDefectClick={(name, count) => setSelectedDashboardDefect({ name, count, modelName: model })} 
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              );
            })()}
        </div>
      )}

      {/* ==================== SUBTAB: COLOR CHANGE (ĐỔI MÀU XE) ==================== */}
      {qcMainSubTab === 'color_change' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-purple-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-600/30 rounded-xl border border-purple-400/40 text-purple-300">
                <RefreshCw className="w-6 h-6 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                    Phân Hệ Đổi Màu &amp; Đổi Trạng Thái Xe (Color &amp; Status Shift)
                  </h3>
                  <span className="bg-purple-500/40 text-purple-200 text-[10px] px-2 py-0.5 rounded-full font-bold border border-purple-400/30 font-mono">
                    {activeColorChanges.length} xe
                  </span>
                </div>
                <p className="text-xs text-purple-200/90 mt-0.5">
                  Quản lý thay đổi Màu sắc và Trạng thái/Phiên bản xe (trước dấu '-' là trạng thái, sau dấu '-' là màu sắc) — Tự động đồng bộ vào CSDL KCS &amp; Báo cáo ngày.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => {
                  setScanError('');
                  setScanLastSuccess(null);
                  setShowScanColorChangeModal(true);
                  setTimeout(() => scannerInputRef.current?.focus(), 150);
                }}
                className="flex-1 md:flex-initial bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-md shadow-purple-900/40 flex items-center justify-center gap-1.5 cursor-pointer border border-purple-400/50"
              >
                <QrCode className="w-4 h-4 text-purple-100" /> 🔫 Quét mã Sêri
              </button>
              <button
                type="button"
                onClick={() => {
                  setColorChangeError('');
                  setShowColorChangeModal(true);
                }}
                className="flex-1 md:flex-initial bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-white/20"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> 📋 Nhập Excel
              </button>
              <button
                type="button"
                onClick={handleExportColorChangeCSV}
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-white/20"
                title="Xuất file CSV danh sách xe đổi màu"
              >
                <Download className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>

          {/* Dashboard Summary Cards - Realtime Dynamic Sync with Filters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                    Tổng xe chuyển đổi
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-purple-700 font-mono mt-1 block">
                    {colorChangeDashboardStats.total} <span className="text-xs font-bold text-slate-500">xe</span>
                  </span>
                </div>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <RefreshCw className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-[10.5px] text-slate-500 font-medium">
                Tỷ lệ: <strong className="text-slate-800 font-mono">{oqcRecords.length > 0 ? ((colorChangeDashboardStats.total / oqcRecords.length) * 100).toFixed(1) : 0}%</strong> tổng số xe KCS
              </div>
            </div>

            {/* Card 2: Color Shift */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                    Số xe đổi màu sơn
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-pink-600 font-mono mt-1 block">
                    {colorChangeDashboardStats.colorShiftCount} <span className="text-xs font-bold text-slate-500">xe</span>
                  </span>
                </div>
                <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
                  <Palette className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-[10.5px] text-slate-500 font-medium">
                Chiếm: <strong className="text-pink-700 font-mono">{colorChangeDashboardStats.total > 0 ? Math.round((colorChangeDashboardStats.colorShiftCount / colorChangeDashboardStats.total) * 100) : 0}%</strong> xe theo bộ lọc
              </div>
            </div>

            {/* Card 3: Status / Model Shift */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                    Số xe đổi trạng thái / Model
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-indigo-700 font-mono mt-1 block">
                    {colorChangeDashboardStats.statusShiftCount} <span className="text-xs font-bold text-slate-500">xe</span>
                  </span>
                </div>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-[10.5px] text-slate-500 font-medium">
                Chiếm: <strong className="text-indigo-700 font-mono">{colorChangeDashboardStats.total > 0 ? Math.round((colorChangeDashboardStats.statusShiftCount / colorChangeDashboardStats.total) * 100) : 0}%</strong> xe theo bộ lọc
              </div>
            </div>

            {/* Card 4: Model & Month Stats */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                    Số Model xe liên quan
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-1 block">
                    {colorChangeDashboardStats.uniqueModels} <span className="text-xs font-bold text-slate-500">model</span>
                  </span>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-[10.5px] text-emerald-700 font-bold">
                Tháng này: {colorChangeDashboardStats.thisMonthCount} xe ({colorChangeDashboardStats.bothShiftCount > 0 ? `${colorChangeDashboardStats.bothShiftCount} xe đổi cả 2` : 'Đã đồng bộ CSDL'})
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={colorChangeSearchText}
                  onChange={(e) => {
                    setColorChangeSearchText(e.target.value);
                    setColorChangeCurrentPage(1);
                  }}
                  placeholder="Tìm theo Số Sêri / Số khung / Model / Màu sắc..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-500"
                />
                {colorChangeSearchText && (
                  <button 
                    onClick={() => {
                      setColorChangeSearchText('');
                      setColorChangeCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter toggle button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsColorChangeFilterExpanded(!isColorChangeFilterExpanded)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    isColorChangeFilterExpanded || colorChangeFilterModel !== 'Tất cả' || colorChangeFilterOldColor !== 'Tất cả' || colorChangeFilterNewColor !== 'Tất cả' || colorChangeFilterDate !== 'Tất cả' || colorChangeFilterMonth !== 'Tất cả' || colorChangeFilterYear !== 'Tất cả'
                      ? 'bg-purple-50 text-purple-700 border-purple-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5 text-purple-600" />
                  Bộ lọc nâng cao
                  {(colorChangeFilterModel !== 'Tất cả' || colorChangeFilterOldColor !== 'Tất cả' || colorChangeFilterNewColor !== 'Tất cả' || colorChangeFilterDate !== 'Tất cả' || colorChangeFilterMonth !== 'Tất cả' || colorChangeFilterYear !== 'Tất cả') && (
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                  )}
                </button>

                {(colorChangeSearchText || colorChangeFilterModel !== 'Tất cả' || colorChangeFilterOldColor !== 'Tất cả' || colorChangeFilterNewColor !== 'Tất cả' || colorChangeFilterDate !== 'Tất cả' || colorChangeFilterMonth !== 'Tất cả' || colorChangeFilterYear !== 'Tất cả') && (
                  <button
                    type="button"
                    onClick={() => {
                      setColorChangeSearchText('');
                      setColorChangeFilterModel('Tất cả');
                      setColorChangeFilterOldColor('Tất cả');
                      setColorChangeFilterNewColor('Tất cả');
                      setColorChangeFilterDate('Tất cả');
                      setColorChangeFilterMonth('Tất cả');
                      setColorChangeFilterYear('Tất cả');
                      setColorChangeCurrentPage(1);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 hover:bg-rose-50 rounded-lg transition"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Filters */}
            {isColorChangeFilterExpanded && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100 text-xs animate-in fade-in duration-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Model xe:</label>
                  <select
                    value={colorChangeFilterModel}
                    onChange={(e) => {
                      setColorChangeFilterModel(e.target.value);
                      setColorChangeCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-purple-600"
                  >
                    <option value="Tất cả">Tất cả ({uniqueColorChangeModels.length} model)</option>
                    {uniqueColorChangeModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Màu gốc (Cũ):</label>
                  <select
                    value={colorChangeFilterOldColor}
                    onChange={(e) => {
                      setColorChangeFilterOldColor(e.target.value);
                      setColorChangeCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-purple-600"
                  >
                    <option value="Tất cả">Tất cả màu gốc</option>
                    {uniqueColorChangeOldColors.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Màu mới (Sau đổi):</label>
                  <select
                    value={colorChangeFilterNewColor}
                    onChange={(e) => {
                      setColorChangeFilterNewColor(e.target.value);
                      setColorChangeCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-purple-600"
                  >
                    <option value="Tất cả">Tất cả màu mới</option>
                    {uniqueColorChangeNewColors.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Ngày đổi:</label>
                  <select
                    value={colorChangeFilterDate}
                    onChange={(e) => {
                      setColorChangeFilterDate(e.target.value);
                      setColorChangeCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-purple-600 font-mono"
                  >
                    <option value="Tất cả">Tất cả các ngày</option>
                    {uniqueColorChangeDates.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Tháng đổi:</label>
                  <select
                    value={colorChangeFilterMonth}
                    onChange={(e) => {
                      setColorChangeFilterMonth(e.target.value);
                      setColorChangeCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-purple-600"
                  >
                    <option value="Tất cả">Tất cả các tháng</option>
                    {uniqueColorChangeMonths.map(m => (
                      <option key={m} value={String(m)}>Tháng {m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Năm:</label>
                  <select
                    value={colorChangeFilterYear}
                    onChange={(e) => {
                      setColorChangeFilterYear(e.target.value);
                      setColorChangeCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-purple-600"
                  >
                    <option value="Tất cả">Tất cả các năm</option>
                    {uniqueColorChangeYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Main Table: Color Changes List */}
          {(() => {
            const colorChangePageSize = 30;
            const colorChangeTotalPages = Math.max(1, Math.ceil(filteredColorChanges.length / colorChangePageSize));
            const safeColorChangePage = Math.min(colorChangeCurrentPage, colorChangeTotalPages);
            const paginatedColorChanges = filteredColorChanges.slice(
              (safeColorChangePage - 1) * colorChangePageSize,
              safeColorChangePage * colorChangePageSize
            );

            return (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-700 uppercase tracking-wide">
                      Danh Sách Xe Đổi Màu Chi Tiết ({filteredColorChanges.length} xe)
                    </span>
                    <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-bold font-mono">
                      30 xe/trang
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Trang <strong>{safeColorChangePage}</strong> / <strong>{colorChangeTotalPages}</strong> (Tổng <strong>{filteredColorChanges.length}</strong> bản ghi)
                  </span>
                </div>

                {filteredColorChanges.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-3">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto border border-purple-200">
                      <RefreshCw className="w-6 h-6" />
                    </div>
                    <h4 className="font-black text-slate-700 text-sm">
                      {activeColorChanges.length === 0 ? 'Chưa có bản ghi đổi màu xe nào!' : 'Không tìm thấy xe nào khớp với bộ lọc!'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {activeColorChanges.length === 0 
                        ? 'Anh Thao có thể sử dụng tính năng Quét mã Sêri hoặc Dán từ Excel để ghi nhận các xe đổi màu.'
                        : 'Thử điều chỉnh lại từ khóa tìm kiếm hoặc bấm nút "Xóa lọc" phía trên.'}
                    </p>
                    {activeColorChanges.length === 0 && (
                      <div className="flex justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setScanError('');
                            setScanLastSuccess(null);
                            setShowScanColorChangeModal(true);
                            setTimeout(() => scannerInputRef.current?.focus(), 150);
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow shadow-purple-200"
                        >
                          <QrCode className="w-3.5 h-3.5" /> 🔫 Bắt đầu Quét mã Sêri
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setColorChangeError('');
                            setShowColorChangeModal(true);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> 📋 Dán từ Excel
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100/80 text-slate-700 sticky top-0 font-extrabold text-[11px] uppercase tracking-wide border-b border-slate-200 z-10">
                          <tr>
                            <th className="p-2.5 w-10 text-center">STT</th>
                            <th className="p-2.5">Số Sêri / Khung</th>
                            <th className="p-2.5 text-center">Loại chuyển đổi</th>
                            <th className="p-2.5">Trạng thái / Model (Cũ ➔ Mới)</th>
                            <th className="p-2.5 text-center">Màu sắc (Cũ ➔ Mới)</th>
                            <th className="p-2.5 text-center">Ngày thực hiện</th>
                            <th className="p-2.5 text-center">Trạng thái OQC</th>
                            <th className="p-2.5 text-center w-16">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                          {paginatedColorChanges.map((item, idx) => {
                            const matchedOqc = oqcRecords.find(r => r.serialNo && r.serialNo.trim().toUpperCase() === item.serialNo.trim().toUpperCase());
                            const rowStt = (safeColorChangePage - 1) * colorChangePageSize + idx + 1;
                            const cls = getChangeClassification(item);
                            
                            return (
                              <tr key={item.id || idx} className="hover:bg-purple-50/40 transition">
                                <td className="p-2.5 text-center text-slate-400 font-bold">{rowStt}</td>
                                <td className="p-2.5">
                                  <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-[11px]">
                                    {item.serialNo}
                                  </span>
                                </td>
                                <td className="p-2.5 text-center">
                                  {cls.isStatusShift && cls.isColorShift ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300 shadow-2xs">
                                      ✨ Đổi cả 2
                                    </span>
                                  ) : cls.isStatusShift ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-300 shadow-2xs">
                                      🔄 Đổi trạng thái
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-pink-50 text-pink-700 border border-pink-300 shadow-2xs">
                                      🎨 Đổi màu xe
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5">
                                  {cls.isStatusShift ? (
                                    <div className="flex items-center gap-1 text-xs">
                                      <span className="line-through text-slate-400 font-medium">{cls.displayOldModel}</span>
                                      <ArrowRight className="w-3 h-3 text-indigo-600 shrink-0" />
                                      <span className="font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                        {cls.displayNewModel}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="font-extrabold text-slate-800">
                                      {cls.displayNewModel || cls.displayOldModel}
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-center">
                                  {cls.isColorShift ? (
                                    <div className="flex items-center justify-center gap-1 text-xs">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 font-bold border border-rose-200">
                                        {cls.displayOldColor}
                                      </span>
                                      <ArrowRight className="w-3 h-3 text-purple-600 shrink-0" />
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-black border border-purple-300">
                                        {cls.displayNewColor}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-bold border border-slate-200">
                                      {cls.displayNewColor || cls.displayOldColor}
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-center font-mono font-bold text-slate-600">
                                  {item.date}
                                </td>
                                <td className="p-2.5 text-center">
                                  {matchedOqc ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã cập nhật OQC
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                      Đã lưu hồ sơ
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditColorChange(item)}
                                      className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                                      title="Chỉnh sửa thông tin đổi màu / trạng thái xe này"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteColorChange(item)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                      title="Xóa bản ghi & hoàn tác về trạng thái/màu gốc"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Toolbar */}
                    {colorChangeTotalPages > 1 && (
                      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
                        <span className="font-medium text-slate-500">
                          Đang hiển thị <strong>{(safeColorChangePage - 1) * colorChangePageSize + 1}</strong> - <strong>{Math.min(safeColorChangePage * colorChangePageSize, filteredColorChanges.length)}</strong> trên tổng số <strong>{filteredColorChanges.length}</strong> xe đổi màu
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={safeColorChangePage <= 1}
                            onClick={() => setColorChangeCurrentPage(prev => Math.max(1, prev - 1))}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 font-bold text-slate-700 transition"
                          >
                            <ChevronLeft className="w-4 h-4" /> Trang trước
                          </button>
                          <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg font-bold font-mono text-[11px]">
                            {safeColorChangePage} / {colorChangeTotalPages}
                          </span>
                          <button
                            type="button"
                            disabled={safeColorChangePage >= colorChangeTotalPages}
                            onClick={() => setColorChangeCurrentPage(prev => Math.min(colorChangeTotalPages, prev + 1))}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 font-bold text-slate-700 transition"
                          >
                            Trang sau <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ==================== SUBTAB: SUPPLIER MONITORING ==================== */}
      {qcMainSubTab === 'supplier_monitoring' && (
        <div className="space-y-6">
          {renderActivePlanTargetsBanner('SQC')}
          {/* Summary counters */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm col-span-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 block uppercase leading-tight">Tổng đợt giám sát</span>
              <span className="text-xs sm:text-sm font-black text-slate-800 font-mono mt-0.5 sm:mt-1 block">{supplierProductionAudits.length} chỉ thị</span>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm border-l-2 sm:border-l-4 border-l-amber-500 col-span-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-550 block uppercase leading-tight">NCC Đang xử lý</span>
              <span className="text-xs sm:text-sm font-black text-amber-700 font-mono mt-0.5 sm:mt-1 block">
                {supplierProductionAudits.filter(a => a.status === 'pending').length} lô hàng
              </span>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm border-l-2 sm:border-l-4 border-l-blue-500 col-span-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-blue-550 block uppercase font-sans leading-tight">NCC phản hồi</span>
              <span className="text-xs sm:text-sm font-black text-blue-700 font-mono mt-0.5 sm:mt-1 block">
                {supplierProductionAudits.filter(a => a.status === 'updated').length} đợt
              </span>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm border-l-2 sm:border-l-4 border-l-emerald-500 col-span-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-550 block uppercase leading-tight">Ký duyệt Đạt chuẩn</span>
              <span className="text-xs sm:text-sm font-black text-emerald-700 font-mono mt-0.5 sm:mt-1 block">
                {supplierProductionAudits.filter(a => a.status === 'approved').length} đợt
              </span>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm border-l-2 sm:border-l-4 border-l-red-500 col-span-2 lg:col-span-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-red-550 block uppercase leading-tight">Sai lệch khuôn dập</span>
              <span className="text-xs sm:text-sm font-black text-red-700 font-mono mt-0.5 sm:mt-1 block">
                {supplierProductionAudits.filter(a => a.status === 'rejected').length} sự cố
              </span>
            </div>
          </div>

          {/* Business Goal Banner */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4.5 rounded-xl border border-orange-100 flex items-start gap-3.5 shadow-xs">
            <span className="p-2 bg-white text-orange-600 rounded-lg shadow-xs border border-orange-100 font-bold block shrink-0 text-sm">💡</span>
            <div className="text-xs">
              <h4 className="font-extrabold text-slate-800 text-xs">PHƯƠNG PHÁP GIÁM SÁT CHỦ ĐỘNG TẠI NHÀ CUNG CẤP (ACTIVE MONITORING)</h4>
              <p className="text-slate-500 leading-relaxed mt-1">
                Thay vì đợi hàng giao tới kho mới kiểm IQC (lúc này lỗi đã dập hàng loạt), QMS DKBike chủ động kích thị giám sát cho Nhà Cung Cấp trong khi sản xuất. 
                Nhà cung cấp sẽ gửi ảnh trực tiếp từ nhà máy hoặc đo chỉ số kỹ thuật thực tế để DKBike kiểm tra sai lệch trước khi cho phép chạy tràn lan.
              </p>
            </div>
          </div>

          {/* Daily Logs Integration Panel */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
                  📋 Nhật trình công việc ngày liên quan NCC & Giám sát
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                  Tự động truy tìm các nhiệm vụ chất lượng hoặc bọc lót theo Nhà Cung Cấp trong ngày để QC đối soát, kích hoạt chỉ thị tức thì.
                </p>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer font-bold select-none border border-slate-200 bg-slate-50 px-2 py-1 rounded hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={hideIgnoredLogs}
                    onChange={(e) => setHideIgnoredLogs(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 text-xs accent-indigo-600 cursor-pointer"
                  />
                  Ẩn mục bỏ qua
                </label>
                <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-[10px] font-black font-mono">
                  {dailyLogs.filter(log => {
                    const matches = filterDailyLogsForSqc(log);
                    return matches && (!hideIgnoredLogs || !ignoredDailyLogStts.includes(log.stt));
                  }).length} công việc ngày đề xuất
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dailyLogs.filter(log => {
                const matches = filterDailyLogsForSqc(log);
                if (!matches) return false;
                if (hideIgnoredLogs && ignoredDailyLogStts.includes(log.stt)) return false;
                return true;
              }).map((log, index) => {
                // Find if there is a linked Supplier Production Audit
                const linkedAudit = supplierProductionAudits.find(aud => aud.dailyLogStt === log.stt);
                const isIgnored = ignoredDailyLogStts.includes(log.stt);
                
                return (
                  <div key={log.stt || index} className={`p-3.5 rounded-xl border border-slate-150 transition duration-200 flex flex-col justify-between space-y-3 ${isIgnored ? 'opacity-60 bg-slate-100 border-dashed' : 'bg-slate-50/50 hover:bg-white hover:shadow-xs'}`}>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-slate-400 uppercase tracking-wider">{log.date} · Stt #{log.stt} {isIgnored && <span className="text-rose-600 font-extrabold ml-1">(ĐÃ BỎ QUA)</span>}</span>
                        <div className="flex items-center gap-1.5">
                          {/* Intelligent Trigger Badge specifying why it was proposed */}
                          {((log.content || '').toLowerCase().includes('lỗi') || (log.note || '').toLowerCase().includes('lỗi') || (log.content || '').toLowerCase().includes('sự cố') || (log.note || '').toLowerCase().includes('sự cố') || hasQualityErrorInSystem) ? (
                            <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-150 text-[8px] font-extrabold uppercase">🔴 Sai lỗi</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-150 text-[8px] font-extrabold uppercase font-mono">📅 Kế hoạch IQC</span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                            log.category === 'IQC' ? 'bg-indigo-100 text-indigo-800' : 
                            log.category === 'SQC/QA' ? 'bg-orange-100 text-orange-850' : 'bg-slate-200 text-slate-800'
                          }`}>
                            {log.category}
                          </span>
                        </div>
                      </div>
                      
                      <p className={`text-xs font-semibold leading-relaxed font-sans ${isIgnored ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{log.content}</p>
                      
                      {log.note && (
                        <p className={`text-[10px] italic p-2 rounded border font-sans ${isIgnored ? 'bg-slate-50/50 text-slate-400 border-slate-150' : 'bg-white/70 text-slate-500 border-slate-100'}`}>
                          📝 <strong className="font-bold text-slate-650">Nhật ký QMS:</strong> "{log.note}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-1 text-[10px]">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <strong className="font-extrabold text-slate-750">{log.assignee ? log.assignee.trim().split(/\s+/).pop() : ''}</strong>
                        <span>· KPI: <strong>{log.statusPercent}</strong></span>
                      </div>
                      
                      <div>
                        {linkedAudit ? (
                          <div className="flex items-center gap-1.5 bg-indigo-50/50 px-2 py-1 rounded-lg border border-indigo-100">
                            <span className="font-mono font-bold text-indigo-800 text-[9px]">
                              🔗 {linkedAudit.id}
                            </span>
                            <span className={`text-[9px] font-extrabold ${
                              linkedAudit.status === 'approved' ? 'text-emerald-700' :
                              linkedAudit.status === 'rejected' ? 'text-red-700' :
                              linkedAudit.status === 'updated' ? 'text-blue-700 animate-pulse' : 'text-amber-700'
                            }`}>
                              {linkedAudit.status === 'approved' ? '✓ Đạt chuẩn' :
                               linkedAudit.status === 'rejected' ? '⚠ Sai lệch' :
                               linkedAudit.status === 'updated' ? '⚡ Chờ duyệt' : '⏳ Chờ ảnh'}
                            </span>
                          </div>
                        ) : isIgnored ? (
                          <div className="flex items-center gap-1.5 bg-slate-205 border-slate-300 py-1 px-2 rounded-lg text-slate-500 text-[10px]">
                            <span className="font-bold">Bỏ qua giám sát</span>
                            <button
                              type="button"
                              onClick={() => handleUndoIgnoreDailyLog(log.stt)}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-extrabold cursor-pointer hover:underline"
                            >
                              Khôi phục
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectLinkedDailyLogForAudit(log.stt);
                                setShowAddSupplierAuditModal(true);
                              }}
                              className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-md transition shadow shadow-orange-100 flex items-center gap-1 cursor-pointer"
                            >
                              🚀 Khởi tạo giám sát
                            </button>
                            <button
                              type="button"
                              onClick={() => handleIgnoreDailyLog(log.stt)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] px-2 py-1.5 rounded-md border border-rose-200 transition cursor-pointer"
                              title="Bỏ qua không cần giám sát"
                            >
                              Bỏ qua
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filtering row */}
          <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 sm:gap-3">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-3.5 h-3.5 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Tìm mã chỉ thị, tên linh kiện dập, thông số..."
                value={supplierAuditSearch}
                onChange={e => setSupplierAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 outline-hidden font-medium"
              />
            </div>
            
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-center">
              {/* Grid / List View Mode Toggle */}
              <div className="col-span-2 sm:col-span-auto flex bg-slate-100 p-1 rounded-lg border border-slate-200 justify-center">
                <button
                  type="button"
                  onClick={() => setSupplierAuditViewMode('grid')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1 sm:py-1.5 rounded-md text-[9px] sm:text-[10px] font-extrabold transition-all uppercase tracking-wider cursor-pointer ${supplierAuditViewMode === 'grid' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  title="Hiển thị dạng ô thẻ bento"
                >
                  <LayoutGrid className="w-3 h-3 text-current" />
                  Dạng thẻ
                </button>
                <button
                  type="button"
                  onClick={() => setSupplierAuditViewMode('list')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1 sm:py-1.5 rounded-md text-[9px] sm:text-[10px] font-extrabold transition-all uppercase tracking-wider cursor-pointer ${supplierAuditViewMode === 'list' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  title="Hiển thị dạng danh sách bảng"
                >
                  <List className="w-3 h-3 text-current" />
                  Danh sách
                </button>
              </div>

              <select
                value={supplierAuditFilterSupplier}
                onChange={e => setSupplierAuditFilterSupplier(e.target.value)}
                className="col-span-1 text-xs border border-slate-200 rounded-lg bg-white px-2 py-1.5 sm:px-3 sm:py-2 focus:ring-1 focus:ring-orange-500 outline-hidden font-bold text-slate-700 h-8 sm:h-[34px] cursor-pointer"
              >
                <option value="All">Tất cả NCC</option>
                {uniqueAuditSuppliers.map((s, i) => (
                  <option key={i} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={supplierAuditFilterStatus}
                onChange={e => setSupplierAuditFilterStatus(e.target.value)}
                className="col-span-1 text-xs border border-slate-200 rounded-lg bg-white px-2 py-1.5 sm:px-3 sm:py-2 focus:ring-1 focus:ring-orange-500 outline-hidden font-bold text-slate-700 h-8 sm:h-[34px] cursor-pointer"
              >
                <option value="All">Mọi Trạng Thái</option>
                <option value="pending">Chờ NCC gửi ảnh</option>
                <option value="updated">Chờ duyệt</option>
                <option value="approved">Đạt chuẩn</option>
                <option value="rejected">Sai lệch</option>
              </select>
            </div>
          </div>

          {/* Core Display with View Mode Selection */}
          {filteredSupplierAudits.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-xs">
              <p className="text-slate-400 text-xs font-bold font-mono">Không tìm thấy đợt giám sát sản xuất NCC phù hợp bộ lọc.</p>
            </div>
          ) : supplierAuditViewMode === 'grid' ? (
            /* GRID / CARD VIEW: Showing only main info on the outside, rest on details click */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSupplierAudits.map((aud, i) => {
                let badgeClass = "bg-slate-100 text-slate-500";
                let badgeLabel = "Chờ phản hồi";
                let ringClass = "border-slate-200";

                if (aud.status === 'pending') {
                  badgeClass = "bg-amber-100 text-amber-800 border-amber-200 border";
                  badgeLabel = "Chờ NCC gửi ảnh";
                  ringClass = "border-amber-200 bg-amber-50/5 hover:border-amber-300";
                } else if (aud.status === 'updated') {
                  badgeClass = "bg-blue-100 text-blue-800 border-blue-200 border";
                  badgeLabel = "Đã báo cáo - Chờ duyệt";
                  ringClass = "border-blue-200 bg-blue-50/5 hover:border-blue-300";
                } else if (aud.status === 'approved') {
                  badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200 border";
                  badgeLabel = "✓ Đạt - Đã duyệt";
                  ringClass = "border-emerald-200 bg-emerald-50/5 hover:border-emerald-300";
                } else if (aud.status === 'rejected') {
                  badgeClass = "bg-red-100 text-red-800 border-red-200 border";
                  badgeLabel = "✗ Từ chối - Lỗi khuôn";
                  ringClass = "border-red-200 bg-red-50/5 hover:border-red-300";
                }

                return (
                  <div key={i} className={`bg-white rounded-xl border ${ringClass} p-4.5 shadow-xs space-y-3.5 tracking-normal transition-all duration-200 flex flex-col justify-between`}>
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                          🆔 CHỈ THỊ: <span className="text-indigo-650 font-black">{aud.id}</span>
                        </span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ${badgeClass}`}>
                          {badgeLabel}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-slate-850 leading-snug line-clamp-1">{aud.componentName}</h4>
                        <p className="text-[10px] font-extrabold text-slate-500 mt-1 uppercase flex items-center gap-1.5">
                          <span>🏢 Nhà cung cấp:</span>
                          <span className="text-slate-800 underline decoration-indigo-400 font-extrabold">{aud.supplierName}</span>
                        </p>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-450 border-t border-slate-100 pt-2 font-medium">
                        <span>Ngày tạo: <strong className="text-slate-700 font-mono">{aud.requestDate}</strong></span>
                        {aud.dailyLogStt && (
                          <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                            🔗 Nhật trình #{aud.dailyLogStt}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedSupplierAuditForDetail(aud)}
                      className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-700 border border-slate-200 py-2 rounded-lg text-[10px] font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                    >
                      👁 Xem Chi Tiết &amp; Thao Tác
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* COMPACT LIST / TABLE VIEW: Neat rows, click to view full details */
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left">Mã chỉ thị</th>
                      <th scope="col" className="px-4 py-3 text-left">Linh kiện sản xuất</th>
                      <th scope="col" className="px-4 py-3 text-left">Nhà cung cấp đối tác</th>
                      <th scope="col" className="px-4 py-3 text-left">Ngày tạo</th>
                      <th scope="col" className="px-4 py-3 text-left">Trạng thái phê duyệt</th>
                      <th scope="col" className="px-4 py-3 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-700">
                    {filteredSupplierAudits.map((aud, i) => {
                      let badgeClass = "bg-slate-100 text-slate-500";
                      let badgeLabel = "Chờ phản hồi";

                      if (aud.status === 'pending') {
                        badgeClass = "bg-amber-100 text-amber-800 border-amber-200 border";
                        badgeLabel = "Chờ NCC phản hồi";
                      } else if (aud.status === 'updated') {
                        badgeClass = "bg-blue-100 text-blue-800 border-blue-200 border";
                        badgeLabel = "Chờ QMS duyệt";
                      } else if (aud.status === 'approved') {
                        badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200 border";
                        badgeLabel = "✓ Đạt - Đã duyệt";
                      } else if (aud.status === 'rejected') {
                        badgeClass = "bg-red-100 text-red-800 border-red-200 border";
                        badgeLabel = "✗ Lỗi - Sửa khuôn";
                      }

                      return (
                        <tr key={i} className="hover:bg-slate-50/55 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600">{aud.id}</td>
                          <td className="px-4 py-3 font-bold text-slate-850">{aud.componentName}</td>
                          <td className="px-4 py-3 text-slate-650">{aud.supplierName}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono">{aud.requestDate}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md inline-block ${badgeClass}`}>
                              {badgeLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedSupplierAuditForDetail(aud)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              👁 Chi tiết &amp; Xử lý
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== SUBTAB: REPORTS ==================== */}
      {qcMainSubTab === 'reports' && (
        <div className="space-y-6">
          
          {/* Filtering Block */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
              <div className="font-extrabold text-sm text-indigo-950 uppercase flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-spin" /> BỘ CHỈ CHỈ THỊ LIÊN KẾT CHẤT LƯỢNG SẢN XUẤT NHÀ MÁY
              </div>
              
              <div className="flex gap-2 bg-slate-100 p-1 rounded-md">
                <button 
                  onClick={() => { setReportTimeFilter('week'); setReportPeriod('All'); }}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition ${reportTimeFilter === 'week' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white'}`}
                >
                  Báo cáo Ngày/Tuần
                </button>
                <button 
                  onClick={() => { setReportTimeFilter('month'); setReportPeriod('All'); }}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition ${reportTimeFilter === 'month' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white'}`}
                >
                  Báo cáo Tháng
                </button>
                <button 
                  onClick={() => { setReportTimeFilter('quarter'); setReportPeriod('All'); }}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition ${reportTimeFilter === 'quarter' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white'}`}
                >
                  Báo cáo Quý
                </button>
                <button 
                  onClick={() => { setReportTimeFilter('year'); setReportPeriod('All'); }}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition ${reportTimeFilter === 'year' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white'}`}
                >
                  Báo cáo Năm
                </button>
              </div>
            </div>

            <div className="border-t pt-3 flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider select-none">Chu kỳ lọc dữ liệu:</span>
              
              {reportTimeFilter === 'week' && (
                <div className="flex gap-1.5 flex-wrap">
                  {['All', ...[1, 2, 3, 4, 5].map(w => `Tuần ${w} (${getWeekDatesForReporting(2026, 4, w)})`)].map((p) => (
                    <button
                      key={p}
                      onClick={() => setReportPeriod(p)}
                      className={`px-2.5 py-1 text-[11px] font-extrabold rounded-full border transition ${reportPeriod === p ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm'}`}
                    >
                      {p === 'All' ? 'Tất cả các tuần' : p}
                    </button>
                  ))}
                </div>
              )}

              {reportTimeFilter === 'month' && (
                <div className="flex gap-1.5 flex-wrap">
                  {['All', 'Tháng 1/2026', 'Tháng 2/2026', 'Tháng 3/2026', 'Tháng 4/2026', 'Tháng 5/2026', 'Tháng 6/2026', 'Tháng 7/2026', 'Tháng 8/2026', 'Tháng 9/2026', 'Tháng 10/2026', 'Tháng 11/2026', 'Tháng 12/2026'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setReportPeriod(p)}
                      className={`px-2.5 py-1 text-[11px] font-extrabold rounded-full border transition ${reportPeriod === p ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm'}`}
                    >
                      {p === 'All' ? 'Tất cả các tháng' : p}
                    </button>
                  ))}
                </div>
              )}

              {reportTimeFilter === 'quarter' && (
                <div className="flex gap-1.5 flex-wrap">
                  {['All', 'Quý II/2026'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setReportPeriod(p)}
                      className={`px-2.5 py-1 text-[11px] font-extrabold rounded-full border transition ${reportPeriod === p ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm'}`}
                    >
                      {p === 'All' ? 'Tất cả các Quý' : p}
                    </button>
                  ))}
                </div>
              )}

              {reportTimeFilter === 'year' && (
                <div className="flex gap-1.5 flex-wrap">
                  {['All', 'Năm 2026'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setReportPeriod(p)}
                      className={`px-2.5 py-1 text-[11px] font-extrabold rounded-full border transition ${reportPeriod === p ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm'}`}
                    >
                      {p === 'All' ? 'Tất cả các Năm' : p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Connected dynamic reporting content block */}
          {(() => {
            const filterByPeriod = (itemDate: string) => {
              if (reportPeriod === 'All') return true;
              
              const parts = itemDate.split('/');
              const day = Number(parts[0]);
              const mth = Number(parts[1]);

              if (reportTimeFilter === 'week') {
                const info = getWeekAndMonthFromDate(itemDate);
                if (info.month !== 4) return false;
                if (reportPeriod.includes('Tuần 1')) return info.week === 'T1';
                if (reportPeriod.includes('Tuần 2')) return info.week === 'T2';
                if (reportPeriod.includes('Tuần 3')) return info.week === 'T3';
                if (reportPeriod.includes('Tuần 4')) return info.week === 'T4';
                if (reportPeriod.includes('Tuần 5')) return info.week === 'T5';
              }
              if (reportTimeFilter === 'month') {
                const match = reportPeriod.match(/Tháng (\d+)/);
                if (match) {
                  return mth === parseInt(match[1], 10);
                }
              }
              if (reportTimeFilter === 'quarter') {
                if (reportPeriod === 'Quý II/2026') return mth >= 4 && mth <= 6;
              }
              return true;
            };

            const safeFilterByPeriod = (rawDate: string | undefined) => {
              if (!rawDate) return true;
              if (reportPeriod === 'All') return true;
              
              let dateStr = rawDate;
              if (rawDate.includes('-')) {
                const parts = rawDate.split('-');
                if (parts[0].length === 4) {
                  dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
              }
              return filterByPeriod(dateStr);
            };

            const currentIqc = iqcRecords.filter(r => filterByPeriod(r.date));
            const currentPqc = pqcRecords.filter(r => filterByPeriod(r.date));
            const currentOqc = oqcRecords.filter(r => filterByPeriod(r.date));

            // Metric calculating
            const iqcTotalChecked = currentIqc.reduce((acc, r) => acc + r.checkedQty, 0);
            const iqcTotalFailed = currentIqc.reduce((acc, r) => acc + r.failedQty, 0);
            const iqcPpmRate = iqcTotalChecked > 0 ? Number(((iqcTotalFailed / iqcTotalChecked) * 100).toFixed(2)) : 0;

            const pqcTotalIssues = currentPqc.length;
            const pqcResolved = currentPqc.filter(r => r.status === 'Đạt hoàn toàn' || r.status === 'Đã cải tiến').length;
            const pqcRate = pqcTotalIssues > 0 ? Math.round((pqcResolved / pqcTotalIssues) * 100) : 0;

            const oqcTotalChecked = currentOqc.length;
            const oqcTotalPassed = currentOqc.filter(isOqcRecordPassed).length;
            const oqcYieldRate = oqcTotalChecked > 0 ? Number(((oqcTotalPassed / oqcTotalChecked) * 100).toFixed(1)) : 100.0;

            // Pareto Pareto Count
            const errorsCountMap: Record<string, number> = {};
            currentOqc.forEach(r => {
              if (r.status === 'Lỗi' && r.defectDetail) {
                const err = r.defectDetail.split(',').map(s => s.trim())[0];
                errorsCountMap[err] = (errorsCountMap[err] || 0) + 1;
              }
            });
            const sortedErrors = Object.entries(errorsCountMap)
              .map(([name, count]) => ({ name, count }))
              .sort((a,b) => b.count - a.count)
              .slice(0, 5);

            // Model Quality Comparison
            const modelQualityMap: Record<string, { total: number; passed: number }> = {};
            currentOqc.forEach(r => {
              let m = (r.model || '').trim();
              if (m === 'Đạt' || m === 'Lỗi' || m === 'Chưa kiểm tra' || !m) {
                if (r.color && r.color.includes(' - ')) {
                  m = r.color.split(' - ')[0].trim();
                } else if (r.partCode) {
                  const matched = lookupPartCode(r.partCode);
                  if (matched) m = matched.model;
                }
              }
              if (!m || m === 'Đạt' || m === 'Lỗi') m = 'DK D2';

              if (!modelQualityMap[m]) {
                modelQualityMap[m] = { total: 0, passed: 0 };
              }
              modelQualityMap[m].total += 1;
              if (r.status === 'Đạt') {
                modelQualityMap[m].passed += 1;
              }
            });
            const modelQualityArray = Object.entries(modelQualityMap).map(([modelName, info]) => {
              const yieldPercent = info.total > 0 ? Math.round((info.passed / info.total) * 100) : 0;
              return { name: modelName, total: info.total, passed: info.passed, yieldRate: yieldPercent };
            });

            const currentDailyLogs = dailyLogs.filter(log => safeFilterByPeriod(log.date));
            const progressAvg = currentDailyLogs.length > 0 
              ? Math.round(currentDailyLogs.reduce((acc, log) => acc + parseInt(log.statusPercent || '0'), 0) / currentDailyLogs.length)
              : 100;

            const currentPtsp = ptspTasks.filter(t => safeFilterByPeriod(t.startDate || '23/04/2026'));
            const totalPtsp = currentPtsp.length;
            const passedPtsp = currentPtsp.filter(t => t.progress === 100).length;

            const unresolvedCapas = capas.filter(c => c.Status !== 'Đã đóng');
            const unresolvedPqc = currentPqc.filter(p => p.status !== 'Đạt hoàn toàn');
            
            return (
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* Visual Status Indicator & Dashboard Header */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-slate-800 shadow-lg space-y-3 relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-505/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-indigo-500/30">
                      Báo Cáo Tổng Hợp Chất Lượng & Công Việc
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-mono">
                        Thời kỳ lọc: <strong className="text-slate-200 font-bold">{reportPeriod === 'All' ? 'Toàn bộ chu kỳ' : reportPeriod}</strong>
                      </span>
                      <button
                        onClick={() => setShowExportKcsReportModal(true)}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-lg transition shadow flex items-center gap-1.5 cursor-pointer border border-amber-500"
                        title="Mở Trung tâm Kết Xuất Báo Cáo KCS / OQC (Tải Excel 6-Sheet hoặc In PDF)"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-white" /> Xuất &amp; In Báo Cáo KCS (Excel / PDF)
                      </button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-white">Consolidated Quality Report Dashboard</h3>
                    <p className="text-xs text-slate-300 max-w-2xl font-semibold">
                      Cơ chế tự động khai phóng dữ liệu, đồng bộ hóa chu sở chỉ số từ Báo cáo ngày (Daily Work logs), biên bản nghiệm thu linh kiện (IQC), khuyết tật lỗi công đoạn ráp (PQC), KCS thành phẩm (OQC) và quản lý tiến trình thử nghiệm kỹ thuật (PTSP).
                    </p>
                  </div>
                  <div className="pt-2 flex gap-4 text-xs font-mono">
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                      <span className="text-slate-400 text-[10px] block uppercase font-bold">Báo cáo ngày đã nạp</span>
                      <strong className="text-emerald-400 text-sm font-black">{currentDailyLogs.length} nhật trình</strong>
                    </div>
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                      <span className="text-slate-400 text-[10px] block uppercase font-bold">Tài liệu việc ngày đạt</span>
                      <strong className="text-indigo-400 text-sm font-black">{progressAvg}% hoàn thành</strong>
                    </div>
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-705/50">
                      <span className="text-slate-400 text-[10px] block uppercase font-bold">Thử nghiệm PTSP kỳ</span>
                      <strong className="text-amber-400 text-sm font-black">{passedPtsp}/{totalPtsp || 3} đạt chuẩn</strong>
                    </div>
                  </div>
                </div>

                {/* 4 Blocks of Big Quality Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  
                  {/* IQC */}
                  <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">IQC (Đầu vào)</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="font-mono">
                        <span className="text-2.5xl font-black text-slate-800">{iqcPpmRate}%</span>
                        <span className="text-[10px] text-slate-400 block font-semibold">Tỷ lệ lỗi kiểm mẫu đầu vào</span>
                      </div>
                    </div>
                    <div className="border-t pt-2.5 text-[11px] text-slate-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Đã kiểm nghiệm:</span>
                        <span className="text-slate-800 font-bold">{iqcTotalChecked} chiếc</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sự cố lỗi hàng:</span>
                        <span className="text-red-500 font-bold">{iqcTotalFailed} chiếc</span>
                      </div>
                    </div>
                  </div>

                  {/* PQC */}
                  <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">PQC (Công đoạn)</span>
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      </div>
                      <div className="font-mono">
                        <span className="text-2.5xl font-black text-slate-800">{pqcTotalIssues} lỗi</span>
                        <span className="text-[10px] text-slate-400 block font-semibold">Sự cố lắp ráp bám dây chuyền</span>
                      </div>
                    </div>
                    <div className="border-t pt-2.5 text-[11px] text-slate-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Đã xử lý dứt điểm:</span>
                        <span className="text-emerald-600 font-bold">{pqcResolved} vụ ({pqcRate}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Đang bám sát CAPA:</span>
                        <span className="text-amber-500 font-bold">{pqcTotalIssues - pqcResolved} vụ</span>
                      </div>
                    </div>
                  </div>

                  {/* OQC */}
                  <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">OQC (KCS Đầu ra)</span>
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                      </div>
                      <div className="font-mono">
                        <span className="text-2.5xl font-black text-blue-700">{oqcYieldRate}%</span>
                        <span className="text-[10px] text-slate-400 block font-semibold">Tỷ lệ đạt chuẩn xe 1st-Yield</span>
                      </div>
                    </div>
                    <div className="border-t pt-2.5 text-[11px] text-slate-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Tổng xe nghiệm thu:</span>
                        <span className="text-slate-800 font-bold">{oqcTotalChecked} chiếc</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Xe lỗi gá lắp:</span>
                        <span className="text-rose-600 font-bold">{oqcTotalChecked - oqcTotalPassed} chiếc</span>
                      </div>
                    </div>
                  </div>

                  {/* PTSP */}
                  <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">PTSP (Thử nghiệm SP)</span>
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                      </div>
                      <div className="font-mono">
                        <span className="text-2.5xl font-black text-slate-800">
                          {totalPtsp > 0 ? Math.round((passedPtsp / totalPtsp) * 100) : 100}%
                        </span>
                        <span className="text-[10px] text-slate-400 block font-semibold">Tỷ lệ đợt thử nghiệm mẫu đạt</span>
                      </div>
                    </div>
                    <div className="border-t pt-2.5 text-[11px] text-slate-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Số mẫu thử nghiệm:</span>
                        <span className="text-slate-800 font-bold">{totalPtsp || 3} vòng</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mẫu đạt phê duyệt:</span>
                        <span className="text-purple-600 font-bold">{passedPtsp || 3} model</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Sub-dashboard section: Daily Logs Report Work Section (Báo cáo công việc link từ báo cáo ngày) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                  <div className="flex justify-between items-center border-b pb-2 flex-wrap gap-2">
                    <div>
                      <h4 className="font-extrabold text-xs uppercase text-slate-800 flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        Báo cáo công việc ngày liên kết tự động (Daily logs aggregation)
                      </h4>
                      <p className="text-[10px] text-slate-400">Dữ liệu được tích hợp trực tiếp từ danh mục nhật trình KCS và 5S trong kỳ lọc.</p>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-mono font-bold font-semibold">
                      Tổng số: {currentDailyLogs.length} hạng mục công việc ngày
                    </span>
                  </div>

                  {currentDailyLogs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      Không tìm thấy bản ghi nhật trình công việc nào cho chu kỳ đã chọn.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-1">
                      <table className="w-full text-left font-sans text-xs">
                        <thead className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 sticky top-0">
                          <tr>
                            <th className="p-2.5 bg-slate-100">Ngày</th>
                            <th className="p-2.5 bg-slate-100">Phân Nhóm</th>
                            <th className="p-2.5 bg-slate-100">Nội Dung Thực Hiện</th>
                            <th className="p-2.5 bg-slate-100 text-center">Tiến độ</th>
                            <th className="p-2.5 bg-slate-100">Người Phụ Trách</th>
                            <th className="p-2.5 bg-slate-100">Đánh giá / Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {currentDailyLogs.map((log) => (
                            <tr key={log.stt} className="hover:bg-slate-50/50">
                              <td className="p-2.5 text-slate-500 font-mono text-[10px] whitespace-nowrap">{log.date}</td>
                              <td className="p-2.5">
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                  log.category === '5S' ? 'bg-amber-100 text-amber-700' :
                                  log.category === 'Họp giao ca' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                }`}>{log.category}</span>
                              </td>
                              <td className="p-2.5 font-bold text-slate-850 text-xs max-w-sm truncate" title={log.content}>
                                {log.content}
                              </td>
                              <td className="p-2.5 text-center font-mono">
                                <span className={`inline-block px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                  log.statusPercent === '100%' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {log.statusPercent}
                                </span>
                              </td>
                              <td className="p-2.5 font-bold text-slate-600 truncate">{log.assignee ? log.assignee.trim().split(/\s+/).pop() : ''}</td>
                              <td className="p-2.5 text-[10px] text-slate-400 italic font-medium" title={log.note || '-'}>
                                {log.note || 'Đã kiểm tra liên tuyến'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Pareto top failures and comparisons */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Pareto */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <div className="border-b pb-2">
                      <h4 className="font-extrabold text-xs uppercase text-slate-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" /> Top khuyết điểm gá ráp xe nhiều nhất (Pareto phân tích)
                      </h4>
                      <p className="text-[10px] text-slate-400">Đếm tổng tần suất xuất hiện khuyết điểm và lỗi cấu trúc xe khi kiểm KCS đầu ra.</p>
                    </div>

                    {sortedErrors.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 italic">
                        Không ghi nhận mã lỗi xe nào trong chu kỳ này. Lắp ráp đạt 100% hoàn mỹ.
                      </div>
                    ) : (
                      <div className="space-y-3.5 text-xs font-semibold">
                        {sortedErrors.map((item, idx) => {
                          const totalErrors = Object.values(errorsCountMap).reduce((a,b)=>a+b, 0);
                          const prevPerc = totalErrors > 0 ? Math.round((item.count / totalErrors) * 100) : 0;
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-slate-850 font-bold">{idx+1}. {item.name}</span>
                                <span className="text-red-500 font-extrabold font-mono">{item.count} vụ ({prevPerc}%)</span>
                              </div>
                              <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`absolute top-0 left-0 h-full rounded-full transition-all ${
                                    idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : 'bg-amber-400'
                                  }`}
                                  style={{ width: `${prevPerc}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Model Quality comparisons */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <div className="border-b pb-2">
                      <h4 className="font-extrabold text-xs uppercase text-slate-700 flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-indigo-500" /> So sánh hiệu suất KCS theo từng model xe
                      </h4>
                      <p className="text-[10px] text-slate-400">Tỷ lệ Yield Rate đạt chuẩn KCS lần đầu, làm dữ liệu hỗ trợ thiết kế cải tiến kỹ thuật.</p>
                    </div>

                    {modelQualityArray.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 italic">
                        Chưa nghiệm mẫu KCS cho dòng model nào trong chu kỳ này.
                      </div>
                    ) : (
                      <div className="space-y-4 text-xs font-semibold">
                        {modelQualityArray.sort((a,b) => b.yieldRate - a.yieldRate).map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-850 font-bold">{item.name}</span>
                              <span className="font-mono text-slate-500">
                                Đạt: <b className={item.yieldRate >= 95 ? 'text-emerald-600' : 'text-amber-500'}>{item.yieldRate}%</b> ({item.passed}/{item.total} xe)
                              </span>
                            </div>
                            <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden font-mono text-[9px]">
                              <div 
                                className={`absolute top-0 left-0 h-full rounded-full transition-all ${
                                  item.yieldRate >= 95 ? 'bg-emerald-500' : item.yieldRate >= 80 ? 'bg-blue-500' : 'bg-amber-400'
                                }`}
                                style={{ width: `${item.yieldRate}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Outstanding Bottlenecks & Critical Issues List */}
                <div className="bg-red-50/40 border border-red-200 rounded-xl p-5 space-y-4 shadow-sm" id="outstanding_bottlenecks_block">
                  <div className="flex justify-between items-center border-b border-red-200 pb-2 flex-wrap gap-2">
                    <div>
                      <h4 className="font-black text-xs uppercase text-red-900 flex items-center gap-1.5">
                        <AlertOctagon className="w-4.5 h-4.5 text-red-600 animate-bounce" /> DANH SÁCH CHI TIẾT CÁC VẤN ĐỀ CÒN TỒN ĐỌNG CHƯA KHẮC PHỤC
                      </h4>
                      <p className="text-[10px] text-red-700 font-medium">Đối tượng cần can thiệp dứt điểm, bám sát hành động phòng ngừa khắc phục CAPA.</p>
                    </div>
                    <span className="text-[10px] bg-rose-100 text-rose-800 border border-slate-200 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wide">
                      Tồn dư: {unresolvedCapas.length + unresolvedPqc.length} điểm nghẽn
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Unresolved CAPAs */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <span className="text-[10px] font-bold text-red-800 uppercase bg-red-50 px-2 py-0.5 rounded border border-red-100">
                        Hành động CAPA đang mở ({unresolvedCapas.length})
                      </span>
                      {unresolvedCapas.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Tuyệt vời! Không có CAPA nào bị chậm hay phát sinh tồn nợ.</p>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 text-xs">
                          {unresolvedCapas.map((capa) => (
                            <div key={capa.CAPAID} className="p-2 border border-slate-100 bg-slate-50/80 rounded-lg space-y-1">
                              <div className="flex justify-between">
                                <span className="font-black text-[9px] text-blue-800 font-mono">{capa.CAPAID}</span>
                                <span className="text-rose-600 font-bold text-[10px] uppercase">Chưa khắc phục</span>
                              </div>
                              <p className="font-semibold text-slate-850 text-xs line-clamp-2">{capa.Issue}</p>
                              <div className="flex justify-between text-[10px] text-slate-400 font-semibold font-medium">
                                <span>Phụ trách: <strong>{capa.Owner}</strong></span>
                                <span>Hạn: <strong>{capa.DueDate}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Unresolved PQC incidents */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <span className="text-[10px] font-bold text-amber-800 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                        Sự cố lắp ráp PQC chưa khắc phục hoàn toàn ({unresolvedPqc.length})
                      </span>
                      {unresolvedPqc.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Tất cả lỗi PQC trong chu kỳ đã được sửa và hoàn thiện xe hoàn toàn!</p>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 text-xs">
                          {unresolvedPqc.map((pqc) => (
                            <div key={pqc.id} className="p-2 border border-slate-100 bg-slate-50/80 rounded-lg space-y-1">
                              <div className="flex justify-between">
                                <span className="font-black text-[9px] text-blue-800 font-mono">{pqc.id} - Model {pqc.model}</span>
                                <span className="text-amber-600 font-bold text-[10px] uppercase">{pqc.status}</span>
                              </div>
                              <p className="font-semibold text-slate-800 text-xs line-clamp-2">{pqc.findings || ''}</p>
                              <div className="flex justify-between text-[10px] text-slate-400 font-semibold font-medium">
                                <span>Lệnh SX: <strong>{pqc.lsx || ''}</strong></span>
                                <span>KCS kiểm: <strong>{pqc.checkedBy || ''}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* Analytical comments by Trưởng Phòng Nguyễn Xuân Thao */}
                <div className="bg-slate-900 text-slate-100 p-5 rounded-xl shadow border border-slate-800 space-y-3 font-medium">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <AlertOctagon className="w-4.5 h-4.5 text-amber-400 animate-pulse" /> Nhận định kết luận Báo cáo thời kỳ của Trưởng phòng Nguyễn Xuân Thao
                  </h4>
                  <p className="text-xs text-slate-355 leading-relaxed font-semibold">
                    Khảo sát kết hợp IQC & PQC: Số liệu cho thấy <b>tỷ lệ lỗi tại kho sườn kim loại ({iqcPpmRate}%)</b> có liên kết chặt chẽ đến tỉ lệ sườn rỉ sét bavia bám cứng đầu ra của các dòng model Nova S và EZ3. QLCL đã ban hành <b>sắc lệnh CAPA số #928</b> yêu cầu các đơn vị liên quan che bọc màng khí bọt khí khít chống nứt lúc vận chuyển về xưởng. Lực lượng kiểm soát PQC & OQC cần tiếp tục bám chặt dải rải mẫu KCS, bảo trì khuôn móng mạ bưởng và lập tức triệu hồi các lô linh kiện lỗi của nhà cung cấp không đạt hạng A hoặc B PPM tiêu chuẩn tự động để phòng ngừa rủi ro bảo hành tối đa.
                  </p>
                </div>

              </div>
            );
          })()}

        </div>
      )}

      {/* MODAL: ADD IQC RECORD */}
      {showAddIqcModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border shadow-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm uppercase text-emerald-700 flex items-center gap-1.5">
                <Plus className="w-4 h-4 shadow-sm" /> THÊM PHIẾU KIỂM NHẬP HÀNG ĐẦU VÀO (IQC)
              </h3>
              <button 
                onClick={() => setShowAddIqcModal(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddIqcRecord} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Nhà Cung Cấp</label>
                <select 
                  value={newIqcSupplierId}
                  onChange={(e)=>setNewIqcSupplierId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-850 font-bold"
                >
                  <option value="">-- Chọn Nhà Cung Cấp --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Nội Dung Phiếu Kiểm (PNK / Tên Lô hàng)</label>
                <input 
                  type="text" 
                  value={newIqcContent}
                  onChange={(e)=>setNewIqcContent(e.target.value)}
                  placeholder="Nội dung cụ thể (Ví dụ: PNK 0192 Lốp Kenda mới...)" 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:bg-white focus:outline-none focus:border-emerald-600 font-bold"
                  required
                />
              </div>

              {/* Standard AQL ISO 2859-1 Guidance Banner */}
              {(() => {
                const currentAql = calculateAQLSample(newIqcTotalQty, newIqcFailedQty, newIqcAqlLevel, newIqcInspectionLevel);
                return (
                  <div className="bg-indigo-50/90 border border-indigo-200 rounded-xl p-3 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-indigo-900">
                      <span className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                        <ShieldCheck className="w-4 h-4 text-indigo-650" />
                        Tiêu chuẩn trích mẫu AQL (ISO 2859-1 / ANSI Z1.4)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <select 
                          value={newIqcAqlLevel} 
                          onChange={(e) => {
                            const lvl = Number(e.target.value) as AQLLevel;
                            setNewIqcAqlLevel(lvl);
                            setNewIqcCheckedQty(calculateAQLSample(newIqcTotalQty, newIqcFailedQty, lvl, newIqcInspectionLevel).sampleSize);
                          }}
                          className="text-[10px] bg-white border border-indigo-200 rounded px-1.5 py-0.5 font-bold text-indigo-800 cursor-pointer"
                        >
                          <option value={0.65}>AQL 0.65 (Rất nghiêm)</option>
                          <option value={1.0}>AQL 1.0 (Nghiêm ngặt)</option>
                          <option value={1.5}>AQL 1.5 (Chuẩn DKBike)</option>
                          <option value={2.5}>AQL 2.5 (Phổ thông)</option>
                          <option value={4.0}>AQL 4.0 (Nhiều phế phẩm)</option>
                        </select>
                        <select 
                          value={newIqcInspectionLevel} 
                          onChange={(e) => {
                            const lvl = e.target.value as InspectionLevel;
                            setNewIqcInspectionLevel(lvl);
                            setNewIqcCheckedQty(calculateAQLSample(newIqcTotalQty, newIqcFailedQty, newIqcAqlLevel, lvl).sampleSize);
                          }}
                          className="text-[10px] bg-white border border-indigo-200 rounded px-1.5 py-0.5 font-bold text-indigo-800 cursor-pointer"
                        >
                          <option value="I">Cấp I (Giảm)</option>
                          <option value="II">Cấp II (Thường)</option>
                          <option value="III">Cấp III (Nghiêm)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-0.5 font-mono text-[11px] text-slate-700">
                      <div className="bg-white p-1.5 rounded-lg border border-indigo-100 text-center shadow-2xs">
                        <span className="text-[9px] text-slate-500 block font-sans">Mã chữ cái:</span>
                        <b className="text-indigo-700 text-xs">Mã {currentAql.codeLetter}</b>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-indigo-100 text-center shadow-2xs">
                        <span className="text-[9px] text-slate-500 block font-sans">Mẫu kiểm AQL:</span>
                        <b className="text-emerald-700 text-xs">{currentAql.sampleSize} sp</b>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-indigo-100 text-center shadow-2xs">
                        <span className="text-[9px] text-slate-500 block font-sans">Chấp nhận (Ac):</span>
                        <b className="text-emerald-600 text-xs font-bold">Ac ≤ {currentAql.ac}</b>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-indigo-100 text-center shadow-2xs">
                        <span className="text-[9px] text-slate-500 block font-sans">Bác bỏ (Re):</span>
                        <b className="text-red-600 text-xs font-bold">Re ≥ {currentAql.re}</b>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Tổng Số Lượng Lô hàng</label>
                  <input 
                    type="number" 
                    value={newIqcTotalQty}
                    onChange={(e)=>{
                      const val = Number(e.target.value);
                      setNewIqcTotalQty(val);
                      setNewIqcCheckedQty(calculateAQLSample(val, newIqcFailedQty, newIqcAqlLevel, newIqcInspectionLevel).sampleSize);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Số Mẫu Kiểm Tra AQL</label>
                    <button
                      type="button"
                      onClick={() => setNewIqcCheckedQty(calculateAQLSample(newIqcTotalQty, newIqcFailedQty, newIqcAqlLevel, newIqcInspectionLevel).sampleSize)}
                      className="text-[9px] text-indigo-600 hover:underline font-bold"
                    >
                      ⚡ Khôi phục AQL
                    </button>
                  </div>
                  <input 
                    type="number" 
                    value={newIqcCheckedQty}
                    onChange={(e)=>setNewIqcCheckedQty(Number(e.target.value))}
                    className="w-full bg-indigo-50/50 border border-indigo-200 rounded p-2 font-mono font-bold text-indigo-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Số Lượng Linh Kiện Lỗi phát hiện</label>
                  <input 
                    type="number" 
                    value={newIqcFailedQty}
                    onChange={(e)=>setNewIqcFailedQty(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-mono font-bold text-red-650"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Ngày nhập kiểm</label>
                  <input 
                    type="text" 
                    value={newIqcDate}
                    onChange={(e)=>setNewIqcDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Người Kiểm Phụ trách</label>
                  <select 
                    value={newIqcCheckedBy}
                    onChange={(e)=>setNewIqcCheckedBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-700 font-semibold"
                  >
                    <option value="Nguyễn Xuân Thao">Nguyễn Xuân Thao</option>
                    <option value="Hà Khắc Việt">Hà Khắc Việt</option>
                    <option value="Hoàng Văn Phấn">Hoàng Văn Phấn</option>
                    <option value="Đoàn Anh Hùng">Đoàn Anh Hùng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Tóm Tắt Linh kiện (Dây, Lốp, Khung...)</label>
                  <input 
                    type="text" 
                    value={newIqcItemSummary}
                    onChange={(e)=>setNewIqcItemSummary(e.target.value)}
                    placeholder="PT sườn, lốp còi..."
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Chi tiết khuyết điểm sai lỗi phát hiện (Nếu có)</label>
                <textarea 
                  value={newIqcDefectDetail}
                  onChange={(e)=>setNewIqcDefectDetail(e.target.value)}
                  placeholder="Mô tả khuyết điểm cấu trúc sản phẩm..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 h-16 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5" id="iqc_multiple_image_uploader">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  <span>Ảnh chụp minh chứng hiện trạng lỗi IQC (2 - 3 ảnh)</span>
                  <span className={`${newIqcImageUrls.length >= 2 ? 'text-emerald-600 font-extrabold' : 'text-slate-400 font-bold'}`}>
                    {newIqcImageUrls.length}/3 ảnh
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {newIqcImageUrls.map((url, index) => (
                    <div key={index} className="relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shadow-2xs h-24 cursor-zoom-in hover:brightness-95 transition">
                      <img src={url} alt={`IQC-Preview-${index}`} className="w-full h-full object-cover" onClick={() => setLocalZoomImage(url)} />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...newIqcImageUrls];
                          updated.splice(index, 1);
                          setNewIqcImageUrls(updated);
                        }}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center text-[10px] font-black hover:bg-red-700 shadow-md cursor-pointer"
                        title="Xóa hình ảnh"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  
                  {newIqcImageUrls.length < 3 && (
                    <label className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition h-24 text-slate-400 hover:text-indigo-600">
                      <Plus className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold text-center leading-tight">Thêm ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const compressed = await compressImageFile(file, 500, 500, 0.4);
                              if (compressed) {
                                setNewIqcImageUrls(prev => [...prev, compressed]);
                              }
                            } catch (err) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setNewIqcImageUrls(prev => [...prev, reader.result as string]);
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
                {newIqcImageUrls.length < 2 && (
                  <p className="text-[10px] text-amber-600 font-bold italic mt-1">
                    * Khuyên dùng thêm ít nhất { 2 - newIqcImageUrls.length } ảnh để minh họa hiện trường tốt nhất.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t pt-3.5">
                <button 
                  type="button"
                  onClick={() => setShowAddIqcModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold px-4 py-2 rounded text-xs transition"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded text-xs transition shadow"
                >
                  Lưu trữ kho IQC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PQC RECORD */}
      {showAddPqcModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border shadow-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm uppercase text-indigo-705 flex items-center gap-1.5">
                <Plus className="w-4 h-4 shadow-sm" /> GHI NHẬN SỰ CỐ CÔNG ĐOẠN LẮP RÁP (PQC)
              </h3>
              <button 
                onClick={() => setShowAddPqcModal(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPqcRecord} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Mã lệnh sản xuất (LSX)</label>
                  <input 
                    type="text" 
                    value={newPqcLsx}
                    onChange={(e)=>setNewPqcLsx(e.target.value)}
                    placeholder="Ví dụ: 26-90"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Dòng xe (Model)</label>
                  <input 
                    type="text" 
                    value={newPqcModel}
                    onChange={(e)=>setNewPqcModel(e.target.value)}
                    placeholder="Chọn hoặc nhập Model..."
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-bold"
                    list="pqc-master-models"
                    required
                  />
                  <datalist id="pqc-master-models">
                    {modelNames.map(name => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Số Lượng Lắp Ráp liên quan (Xe)</label>
                  <input 
                    type="number" 
                    value={newPqcQty}
                    onChange={(e)=>setNewPqcQty(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Ngày phát hiện</label>
                  <input 
                    type="text" 
                    value={newPqcDate}
                    onChange={(e)=>setNewPqcDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Người Giám Sát ghi nhận</label>
                  <select 
                    value={newPqcCheckedBy}
                    onChange={(e)=>setNewPqcCheckedBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-bold text-slate-705"
                  >
                    <option value="Nguyễn Xuân Thao">Nguyễn Xuân Thao (Trưởng phòng)</option>
                    <option value="Hoàng Văn Phấn">Hoàng Văn Phấn</option>
                    <option value="Hà Khắc Việt">Hà Khắc Việt</option>
                    <option value="Đoàn Anh Hùng">Đoàn Anh Hùng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Trạng thái công đoạn</label>
                  <select 
                    value={newPqcStatus}
                    onChange={(e)=>setNewPqcStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-705 font-bold"
                  >
                    <option value="Đang cải tiến">Đang cải tiến (Theo dõi CAPA)</option>
                    <option value="Đã cải tiến">Đã cải tiến (Áp dụng thử)</option>
                    <option value="Đạt hoàn toàn">Đạt hoàn toàn (Quy chuẩn hóa)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Nhận xét, đánh giá vấn đề & Phương hướng cải tiến</label>
                <textarea 
                  value={newPqcFindings}
                  onChange={(e)=>setNewPqcFindings(e.target.value)}
                  placeholder="Mô tả bavia, rơ lóng khung, dập sườn sần bọt nổ sơn hoặc gá nẹp đai giắc cắm..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 h-20 focus:bg-white focus:outline-none font-medium"
                />
              </div>

              <div className="space-y-1.5" id="pqc_multiple_image_uploader">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  <span>Ảnh chụp minh chứng hiện trạng lỗi (2 - 3 ảnh)</span>
                  <span className={`${newPqcImageUrls.length >= 2 ? 'text-emerald-600 font-extrabold' : 'text-slate-400 font-bold'}`}>
                    {newPqcImageUrls.length}/3 ảnh
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {newPqcImageUrls.map((url, index) => (
                    <div key={index} className="relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shadow-2xs h-24 cursor-zoom-in hover:brightness-95 transition">
                      <img src={url} alt={`PQC-Preview-${index}`} className="w-full h-full object-cover" onClick={() => setLocalZoomImage(url)} />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...newPqcImageUrls];
                          updated.splice(index, 1);
                          setNewPqcImageUrls(updated);
                        }}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center text-[10px] font-black hover:bg-red-700 shadow-md cursor-pointer"
                        title="Xóa hình ảnh"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  
                  {newPqcImageUrls.length < 3 && (
                    <label className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition h-24 text-slate-400 hover:text-indigo-600">
                      <Plus className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold text-center leading-tight">Thêm ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const compressed = await compressImageFile(file, 500, 500, 0.4);
                              if (compressed) {
                                setNewPqcImageUrls(prev => [...prev, compressed]);
                              }
                            } catch (err) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setNewPqcImageUrls(prev => [...prev, reader.result as string]);
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
                {newPqcImageUrls.length < 2 && (
                  <p className="text-[10px] text-amber-600 font-bold italic mt-1">
                    * Khuyên dùng thêm ít nhất {2 - newPqcImageUrls.length} ảnh để minh họa hiện trường tốt nhất.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t pt-3.5">
                <button 
                  type="button"
                  onClick={() => setShowAddPqcModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold px-4 py-2 rounded text-xs transition"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded text-xs transition shadow"
                >
                  Ghi nhận PQC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PQC RECORD */}
      {showEditPqcModal && editingPqcRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border shadow-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm uppercase text-indigo-705 flex items-center gap-1.5" id="pqc-edit-title">
                <Pencil className="w-4 h-4 shadow-sm" /> CHỈNH SỬA SỰ CỐ CÔNG ĐOẠN LẮP RÁP (PQC)
              </h3>
              <button 
                onClick={() => {
                  setShowEditPqcModal(false);
                  setEditingPqcRecord(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditPqc} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Mã lệnh sản xuất (LSX)</label>
                  <input 
                    type="text" 
                    value={editingPqcRecord.lsx}
                    onChange={(e)=>setEditingPqcRecord({...editingPqcRecord, lsx: e.target.value})}
                    placeholder="Ví dụ: 26-90"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Dòng xe (Model)</label>
                  <input 
                    type="text" 
                    value={editingPqcRecord.model}
                    onChange={(e)=>setEditingPqcRecord({...editingPqcRecord, model: e.target.value})}
                    placeholder="Ví dụ: DK V1_App.2Y, DK Nova..."
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Số Lượng Lắp Ráp liên quan (Xe)</label>
                  <input 
                    type="number" 
                    value={editingPqcRecord.qty}
                    onChange={(e)=>setEditingPqcRecord({...editingPqcRecord, qty: Number(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Ngày phát hiện</label>
                  <input 
                    type="text" 
                    value={editingPqcRecord.date}
                    onChange={(e)=>setEditingPqcRecord({...editingPqcRecord, date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Người Giám Sát ghi nhận</label>
                  <select 
                    value={editingPqcRecord.checkedBy}
                    onChange={(e)=>setEditingPqcRecord({...editingPqcRecord, checkedBy: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-bold text-slate-705"
                  >
                    <option value="Nguyễn Xuân Thao">Nguyễn Xuân Thao (Trưởng phòng)</option>
                    <option value="Hoàng Văn Phấn">Hoàng Văn Phấn</option>
                    <option value="Hà Khắc Việt">Hà Khắc Việt</option>
                    <option value="Đoàn Anh Hùng">Đoàn Anh Hùng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Trạng thái công đoạn</label>
                  <select 
                    value={editingPqcRecord.status}
                    onChange={(e)=>setEditingPqcRecord({...editingPqcRecord, status: e.target.value as any})}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-705 font-bold"
                  >
                    <option value="Đang cải tiến">Đang cải tiến (Theo dõi CAPA)</option>
                    <option value="Đã cải tiến">Đã cải tiến (Áp dụng thử)</option>
                    <option value="Đạt hoàn toàn">Đạt hoàn toàn (Quy chuẩn hóa)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Nhận xét, đánh giá vấn đề & Phương hướng cải tiến</label>
                <textarea 
                  value={editingPqcRecord.findings}
                  onChange={(e)=>setEditingPqcRecord({...editingPqcRecord, findings: e.target.value})}
                  placeholder="Mô tả bavia, rơ lóng khung, dập sườn sần bọt nổ sơn hoặc gá nẹp đai giắc cắm..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 h-20 focus:bg-white focus:outline-none font-medium"
                />
              </div>

              <div className="space-y-1.5" id="pqc_edit_multiple_image_uploader">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  <span>Ảnh chụp minh chứng hiện trạng lỗi (2 - 3 ảnh)</span>
                  <span className={`${(editingPqcRecord.imageUrls || []).length >= 2 ? 'text-emerald-600 font-extrabold' : 'text-slate-400 font-bold'}`}>
                    {(editingPqcRecord.imageUrls || []).length}/3 ảnh
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {(editingPqcRecord.imageUrls || []).map((url, index) => (
                    <div key={index} className="relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shadow-2xs h-24 cursor-zoom-in hover:brightness-95 transition">
                      <img src={url} alt={`PQC-Edit-Preview-${index}`} className="w-full h-full object-cover" onClick={() => setLocalZoomImage(url)} />
                      <button
                        type="button"
                        onClick={() => {
                          const updatedUrls = [...(editingPqcRecord.imageUrls || [])];
                          updatedUrls.splice(index, 1);
                          setEditingPqcRecord({
                            ...editingPqcRecord,
                            imageUrls: updatedUrls,
                            imageUrl: updatedUrls[0] || ''
                          });
                        }}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center text-[10px] font-black hover:bg-red-700 shadow-md cursor-pointer"
                        title="Xóa hình ảnh"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  
                  {(editingPqcRecord.imageUrls || []).length < 3 && (
                    <label className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition h-24 text-slate-400 hover:text-indigo-600">
                      <Plus className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold text-center leading-tight">Thêm ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                             try {
                               const compressed = await compressImageFile(file, 500, 500, 0.4);
                               if (compressed) {
                                 const updatedUrls = [...(editingPqcRecord.imageUrls || []), compressed];
                                 setEditingPqcRecord({
                                   ...editingPqcRecord,
                                   imageUrls: updatedUrls,
                                   imageUrl: updatedUrls[0] || ''
                                 });
                               }
                             } catch (err) {
                               const reader = new FileReader();
                               reader.onloadend = () => {
                                 const updatedUrls = [...(editingPqcRecord.imageUrls || []), reader.result as string];
                                 setEditingPqcRecord({
                                   ...editingPqcRecord,
                                   imageUrls: updatedUrls,
                                   imageUrl: updatedUrls[0] || ''
                                 });
                               };
                               reader.readAsDataURL(file);
                             }
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3.5">
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditPqcModal(false);
                    setEditingPqcRecord(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold px-4 py-2 rounded text-xs transition"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded text-xs transition shadow"
                  id="pqc_edit_submit_btn"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nạp danh sách xe từ LSX */}
      {showImportLsxModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-slate-850 text-sm uppercase text-emerald-700 flex items-center gap-2">
                <Upload className="w-4 h-4" /> 📥 NẠP DANH SÁCH XE TỪ LỆNH SẢN XUẤT (LSX)
              </h3>
              <button
                type="button"
                onClick={() => setShowImportLsxModal(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setLsxImportError('');
                if (!lsxImportText.trim()) {
                  setLsxImportError('Vui lòng dán danh sách xe từ file LSX!');
                  return;
                }

                try {
                  const lines = lsxImportText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                  const newRecords: OQCRecord[] = [];
                  const defaultLsx = lsxImportDefaultLsx.trim() || '26-10';

                  let partCodeIdx = -1;
                  let serialNoIdx = -1;
                  let chassisNoIdx = -1;
                  let engineNoIdx = -1;
                  let colorIdx = -1;
                  let lsxIdx = -1;
                  let modelIdx = -1;
                  let statusIdx = -1;
                  let passFlagIdx = -1;
                  let defectIdx = -1;
                  let failedCountIdx = -1;
                  let causeIdx = -1;
                  let causeDetailIdx = -1;
                  let timeIdx = -1;
                  let dayIdx = -1;
                  let monthIdx = -1;
                  let yearIdx = -1;

                  // Check header row
                  const firstLine = lines[0];
                  const firstCols = firstLine.includes('\t') ? firstLine.split('\t') : firstLine.split(',');
                  const isHeader = firstCols.some(col => {
                    const l = col.toLowerCase();
                    return l.includes('mã') || l.includes('sêri') || l.includes('seri') || l.includes('khung') || l.includes('động cơ') || l.includes('máy') || l.includes('model') || l.includes('mẫu') || l.includes('lsx') || l.includes('lệnh') || l.includes('tình trạng') || l.includes('đạt') || l.includes('stt');
                  });

                  if (isHeader) {
                    firstCols.forEach((col, idx) => {
                      const clean = col.trim().toLowerCase();
                      if (clean.includes('mã quy cách') || clean.includes('mã qc') || clean.includes('mã tem') || clean === 'mã' || clean.includes('part')) {
                        partCodeIdx = idx;
                      } else if (clean.includes('seri tem') || clean.includes('số sêri') || clean.includes('số seri') || clean === 'seri' || clean === 'serial' || clean === 'sêri') {
                        serialNoIdx = idx;
                      } else if (clean.includes('số khung') || clean.includes('khung') || clean.includes('chassis') || clean.includes('vin')) {
                        chassisNoIdx = idx;
                      } else if (clean.includes('số động cơ') || clean.includes('số máy') || clean.includes('động cơ') || clean.includes('engine')) {
                        engineNoIdx = idx;
                      } else if (clean.includes('màu') || clean.includes('màu xe') || clean.includes('màu sắc') || clean.includes('color')) {
                        colorIdx = idx;
                      } else if (clean.includes('model') || clean.includes('dòng xe') || clean.includes('mẫu')) {
                        modelIdx = idx;
                      } else if (clean.includes('lsx') || clean.includes('lệnh sản xuất') || clean.includes('lệnh')) {
                        lsxIdx = idx;
                      } else if (clean.includes('tình trạng') || clean.includes('trạng thái') || clean.includes('status')) {
                        statusIdx = idx;
                      } else if (clean === 'đạt' || clean === 'pass') {
                        passFlagIdx = idx;
                      } else if (clean.includes('chi tiết lỗi') || clean.includes('lỗi') || clean.includes('defect')) {
                        defectIdx = idx;
                      } else if (clean.includes('số lỗi')) {
                        failedCountIdx = idx;
                      } else if (clean === 'nguyên nhân' || clean.includes('nguyên nhân')) {
                        causeIdx = idx;
                      } else if (clean.includes('chi tiết nguyên nhân')) {
                        causeDetailIdx = idx;
                      } else if (clean.includes('giờ') || clean.includes('thời gian') || clean.includes('time')) {
                        timeIdx = idx;
                      } else if (clean === 'ngày' || clean.includes('ngày')) {
                        dayIdx = idx;
                      } else if (clean === 'tháng') {
                        monthIdx = idx;
                      } else if (clean === 'năm') {
                        yearIdx = idx;
                      }
                    });
                  } else {
                    // Fallback based on column format when NO header is present (User copies columns without Model)
                    // Check if first column is numeric (STT: 1, 2, 3...)
                    const isCol0Number = /^\d+$/.test(firstCols[0]?.trim());
                    const colOffset = isCol0Number ? 1 : 0;
                    const effectiveLen = firstCols.length - colOffset;

                    if (effectiveLen >= 6) {
                      // Format: [STT], Mã quy cách, Số Sêri, Số khung, Số động cơ, Màu sắc, LSX
                      partCodeIdx = 0 + colOffset;
                      serialNoIdx = 1 + colOffset;
                      chassisNoIdx = 2 + colOffset;
                      engineNoIdx = 3 + colOffset;
                      colorIdx = 4 + colOffset;
                      lsxIdx = 5 + colOffset;
                    } else if (effectiveLen === 5) {
                      // Format: [STT], Mã quy cách, Số Sêri, Số khung, Số động cơ, Màu sắc (hoặc LSX)
                      partCodeIdx = 0 + colOffset;
                      serialNoIdx = 1 + colOffset;
                      chassisNoIdx = 2 + colOffset;
                      engineNoIdx = 3 + colOffset;
                      const lastVal = firstCols[4 + colOffset]?.trim() || '';
                      if (/^\d+[a-zA-Z0-9]*-\d+$/.test(lastVal)) {
                        lsxIdx = 4 + colOffset;
                      } else {
                        colorIdx = 4 + colOffset;
                      }
                    } else if (effectiveLen === 4) {
                      // Format: [STT], Mã quy cách, Số Sêri, Số khung, Số động cơ
                      partCodeIdx = 0 + colOffset;
                      serialNoIdx = 1 + colOffset;
                      chassisNoIdx = 2 + colOffset;
                      engineNoIdx = 3 + colOffset;
                    } else if (effectiveLen === 3) {
                      // Format: [STT], Mã quy cách, Số Sêri, Màu sắc (hoặc LSX)
                      partCodeIdx = 0 + colOffset;
                      serialNoIdx = 1 + colOffset;
                      const lastVal = firstCols[2 + colOffset]?.trim() || '';
                      if (/^\d+[a-zA-Z0-9]*-\d+$/.test(lastVal)) {
                        lsxIdx = 2 + colOffset;
                      } else {
                        colorIdx = 2 + colOffset;
                      }
                    } else {
                      // Format: [STT], Mã quy cách, Số Sêri
                      partCodeIdx = 0 + colOffset;
                      serialNoIdx = 1 + colOffset;
                    }
                  }

                  const startRow = isHeader ? 1 : 0;
                  const todayStr = new Date().toLocaleDateString('vi-VN');
                  const todayMonth = new Date().getMonth() + 1;
                  const todayYear = new Date().getFullYear();

                  for (let i = startRow; i < lines.length; i++) {
                    const line = lines[i];
                    const cols = line.includes('\t') ? line.split('\t') : line.split(',');
                    if (cols.length < 2) continue;

                    let partCodeVal = (partCodeIdx !== -1 && cols[partCodeIdx] ? cols[partCodeIdx] : cols[0] || '').trim();
                    let serialNoVal = (serialNoIdx !== -1 && cols[serialNoIdx] ? cols[serialNoIdx] : (cols[1] || '')).trim();
                    let chassisNoVal = (chassisNoIdx !== -1 && cols[chassisNoIdx] ? cols[chassisNoIdx] : '').trim();
                    let engineNoVal = (engineNoIdx !== -1 && cols[engineNoIdx] ? cols[engineNoIdx] : '').trim();
                    let colorVal = (colorIdx !== -1 && cols[colorIdx] ? cols[colorIdx] : '').trim();
                    let lsxVal = (lsxIdx !== -1 && cols[lsxIdx] ? cols[lsxIdx] : defaultLsx).trim();

                    if (!serialNoVal && chassisNoVal) {
                      serialNoVal = chassisNoVal;
                    }
                    if (!serialNoVal) continue;

                    // --- TỰ ĐỘNG TRA CỨU MODEL VÀ MÀU SẮC TỪ BẢNG MÃ XE (OQC PART CODES) ---
                    let modelVal = '';
                    const matchedPart = lookupPartCode(partCodeVal);
                    if (matchedPart) {
                      modelVal = matchedPart.model || '';
                      // Nếu màu sắc chưa có từ dữ liệu dán, tự động điền Màu sắc từ Bảng mã xe
                      if (!colorVal && matchedPart.color) {
                        colorVal = matchedPart.color;
                      }
                    }

                    // Nếu chưa tìm thấy chính xác, thử tìm partial match trong bảng mã xe
                    if (!modelVal) {
                      const cleanCode = partCodeVal.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      const partialMatch = oqcPartCodes.find(p => {
                        const pClean = p.partCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        return pClean.includes(cleanCode) || cleanCode.includes(pClean);
                      });
                      if (partialMatch) {
                        modelVal = partialMatch.model || '';
                        if (!colorVal && partialMatch.color) {
                          colorVal = partialMatch.color;
                        }
                      }
                    }

                    // Nếu màu sắc có dạng "Model - Màu" (Ví dụ: "DK D2 - Đỏ"), tách model và màu
                    if (!modelVal && colorVal.includes(' - ')) {
                      const colorParts = colorVal.split(' - ');
                      modelVal = colorParts[0].trim();
                      colorVal = colorParts.slice(1).join(' - ').trim();
                    }

                    // Fallback nhận diện Model theo tiền tố mã quy cách DKBike
                    if (!modelVal) {
                      const pUpper = partCodeVal.toUpperCase();
                      if (pUpper.includes('ROM') || pUpper.includes('ROMA')) modelVal = 'DK Roma SX V2';
                      else if (pUpper.includes('TEMDD') || pUpper.includes('D2')) modelVal = 'DK D2';
                      else if (pUpper.includes('TEMDV') || pUpper.includes('V2')) modelVal = 'DK V2';
                      else if (pUpper.includes('GOGO') || pUpper.includes('GG')) modelVal = 'DK Gogo';
                      else if (pUpper.includes('SAM')) modelVal = 'DK Samurai';
                      else if (pUpper.includes('XMEN') || pUpper.includes('XMAN')) modelVal = 'DK Xmen';
                      else if (pUpper.includes('CREA')) modelVal = 'DK Crea Mono';
                      else if (pUpper.includes('EZ')) modelVal = 'DK EZ3';
                      else if (pUpper.includes('S3')) modelVal = 'DK S3';
                      else if (pUpper.includes('S2')) modelVal = 'DK S2';
                      else if (pUpper.includes('S1')) modelVal = 'DK S1';
                      else if (pUpper.includes('NOVA')) modelVal = 'DK Nova';
                      else if (pUpper.includes('ZMTP') || pUpper.includes('ZMT')) modelVal = 'DK Z-MTP';
                      else modelVal = 'DK Gogo';
                    }

                    if (!colorVal) {
                      colorVal = 'Đen';
                    }

                    // Status & defect details
                    let statusVal: 'Đạt' | 'Lỗi' | 'Chưa kiểm tra' = 'Chưa kiểm tra';
                    const passColVal = passFlagIdx !== -1 && cols[passFlagIdx] ? cols[passFlagIdx].trim() : '';
                    const statusColVal = statusIdx !== -1 && cols[statusIdx] ? cols[statusIdx].trim() : '';
                    const defectColVal = defectIdx !== -1 && cols[defectIdx] ? cols[defectIdx].trim() : '';
                    const causeColVal = causeIdx !== -1 && cols[causeIdx] ? cols[causeIdx].trim() : '';
                    const causeDetailColVal = causeDetailIdx !== -1 && cols[causeDetailIdx] ? cols[causeDetailIdx].trim() : '';
                    const failedCountVal = failedCountIdx !== -1 && cols[failedCountIdx] ? parseInt(cols[failedCountIdx], 10) || 0 : (defectColVal ? 1 : 0);

                    if (passColVal === '1' || statusColVal.toLowerCase() === 'đạt' || statusColVal.toLowerCase() === 'pass') {
                      statusVal = 'Đạt';
                    } else if (defectColVal || statusColVal.toLowerCase() === 'lỗi' || statusColVal.toLowerCase() === 'fail') {
                      statusVal = 'Lỗi';
                    }

                    // Date & Time
                    let timeVal = timeIdx !== -1 && cols[timeIdx] ? cols[timeIdx].trim() : '';
                    let dateVal = todayStr;
                    let mVal = todayMonth;
                    let yVal = todayYear;

                    if (dayIdx !== -1 && cols[dayIdx]) {
                      const d = cols[dayIdx].trim().padStart(2, '0');
                      const m = monthIdx !== -1 && cols[monthIdx] ? cols[monthIdx].trim().padStart(2, '0') : todayMonth.toString().padStart(2, '0');
                      const y = yearIdx !== -1 && cols[yearIdx] ? cols[yearIdx].trim() : todayYear.toString();
                      dateVal = `${d}/${m}/${y}`;
                      mVal = parseInt(m, 10) || todayMonth;
                      yVal = parseInt(y, 10) || todayYear;
                    }

                    newRecords.push({
                      id: `OQC-${serialNoVal.toUpperCase().replace(/[\/\s.#$\[\]]/g, '_')}`,
                      partCode: partCodeVal,
                      serialNo: serialNoVal,
                      chassisNo: chassisNoVal,
                      engineNo: engineNoVal,
                      model: modelVal,
                      color: colorVal,
                      status: statusVal,
                      defectDetail: defectColVal,
                      failedCount: failedCountVal,
                      rootCause: causeColVal,
                      defectCauseDetail: causeDetailColVal,
                      lsx: lsxVal,
                      checkTime: timeVal,
                      date: dateVal,
                      month: mVal,
                      year: yVal,
                      totalLlr: 1
                    });
                  }

                  if (newRecords.length === 0) {
                    setLsxImportError('Không nhận diện được xe nào! Vui lòng kiểm tra lại định dạng copy.');
                    return;
                  }

                  // Merge with existing oqcRecords with diff checking
                  const existingMap = new Map<string, OQCRecord>();
                  oqcRecords.forEach(r => {
                    if (r.serialNo) existingMap.set(r.serialNo.trim().toUpperCase(), r);
                  });

                  let addedCount = 0;
                  let updatedCount = 0;
                  let unchangedCount = 0;

                  const norm = (v: any) => String(v ?? '').trim().toLowerCase();
                  const updatedRecords = oqcRecords.map(oldRec => {
                    const key = (oldRec.serialNo || '').trim().toUpperCase();
                    const newRec = newRecords.find(n => n.serialNo.trim().toUpperCase() === key);
                    if (newRec) {
                      let hasDiff = false;
                      if (newRec.lsx && norm(oldRec.lsx) !== norm(newRec.lsx)) hasDiff = true;
                      if (newRec.model && norm(oldRec.model) !== norm(newRec.model)) hasDiff = true;
                      if (newRec.color && norm(oldRec.color) !== norm(newRec.color)) hasDiff = true;
                      if (newRec.partCode && newRec.partCode !== 'TEM-GEN' && norm(oldRec.partCode) !== norm(newRec.partCode)) hasDiff = true;
                      if (newRec.chassisNo && norm(oldRec.chassisNo) !== norm(newRec.chassisNo)) hasDiff = true;
                      if (newRec.engineNo && norm(oldRec.engineNo) !== norm(newRec.engineNo)) hasDiff = true;

                      if (hasDiff) {
                        updatedCount++;
                        return {
                          ...oldRec,
                          lsx: newRec.lsx || oldRec.lsx,
                          model: newRec.model || oldRec.model,
                          color: newRec.color || oldRec.color,
                          partCode: newRec.partCode || oldRec.partCode,
                          chassisNo: newRec.chassisNo || oldRec.chassisNo,
                          engineNo: newRec.engineNo || oldRec.engineNo
                        };
                      } else {
                        unchangedCount++;
                        return oldRec;
                      }
                    }
                    return oldRec;
                  });

                  const brandNewLsx: OQCRecord[] = [];
                  newRecords.forEach(newRec => {
                    const key = newRec.serialNo.trim().toUpperCase();
                    if (!existingMap.has(key)) {
                      brandNewLsx.unshift(newRec);
                      addedCount++;
                    }
                  });

                  const hasAnyChange = addedCount > 0 || updatedCount > 0;
                  if (!hasAnyChange) {
                    setLsxImportText('');
                    setShowImportLsxModal(false);
                    alert(`ℹ️ Đối chiếu LSX hoàn tất:\n\n• Toàn bộ ${newRecords.length} xe dán lên đều đã có trong hệ thống và trùng khớp dữ liệu 100%.\n• Không phát sinh thay đổi nên hệ thống giữ nguyên và KHÔNG cần đẩy lên Cloud Firebase.`);
                    return;
                  }

                  const finalRecords = [...brandNewLsx, ...updatedRecords];
                  setOqcRecords(finalRecords);
                  safeStorage.setItem('dk_oqc_records', JSON.stringify(finalRecords));
                  try {
                    localStorage.setItem('dk_oqc_records_is_dirty', 'true');
                  } catch (e) {}

                  // Trigger immediate synchronization to Firebase
                  if (typeof (window as any).syncToServer === 'function') {
                    (window as any).syncToServer('dk_oqc_records', finalRecords);
                  }

                  setKcsSelectedLsx(defaultLsx);
                  setLsxImportText('');
                  setShowImportLsxModal(false);
                  alert(`🎉 Đối chiếu & Nạp LSX ${defaultLsx} thành công!\n\nChi tiết đối chiếu:\n• Thêm mới: ${addedCount} xe\n• Cập nhật thông tin: ${updatedCount} xe\n• Giữ nguyên (trùng khớp): ${unchangedCount} xe\n\n(Dữ liệu có thay đổi đã được đồng bộ an toàn lên Cloud Firebase)`);
                } catch (err: any) {
                  setLsxImportError(`Lỗi phân tách dữ liệu LSX: ${err.message || err}`);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                    Lệnh Sản Xuất (LSX) gán mặc định:
                  </label>
                  <input
                    type="text"
                    value={lsxImportDefaultLsx}
                    onChange={e => setLsxImportDefaultLsx(e.target.value)}
                    placeholder="Ví dụ: 26-10"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-black font-mono text-blue-900 text-xs"
                    required
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl font-medium leading-relaxed">
                    ✨ <strong>Không cần cột Model</strong>: Bạn chỉ cần copy các cột từ file LSX (Mã quy cách, Sêri tem, Số khung, Số động cơ, Màu sắc, LSX). Hệ thống sẽ <strong>tự động tra cứu và điền chính xác Model xe và Màu sắc từ Bảng mã xe</strong>!
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                  Dán dữ liệu từ file LSX (Excel / Tab / Phẩy):
                </label>
                <textarea
                  value={lsxImportText}
                  onChange={e => setLsxImportText(e.target.value)}
                  rows={8}
                  placeholder={`Mã quy cách\tSố Sêri\tSố khung\tSố động cơ\tMàu sắc\tLSX\nTEMDV11202\t26DK00101\tRLHDK0123\tDKM9921\tĐỏ tươi\t26-10\nTEMDV11202\t26DK00102\tRLHDK0124\tDKM9922\tĐen bóng\t26-10...`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              {lsxImportError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-rose-700 font-bold text-xs">
                  ⚠️ {lsxImportError}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t pt-3 font-bold">
                <button
                  type="button"
                  onClick={() => setShowImportLsxModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs transition shadow-md shadow-emerald-200 cursor-pointer font-black"
                >
                  Nạp Danh Sách Vào LSX
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Thêm 1 xe lẻ vào LSX */}
      {showAddCarToLsxModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-slate-850 text-sm uppercase text-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" /> ➕ THÊM XE VÀO LSX {newCarLsx}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCarToLsxModal(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCarSerialNo.trim()) return;

                const serial = newCarSerialNo.trim();
                const todayStr = new Date().toLocaleDateString('vi-VN');
                const todayMonth = new Date().getMonth() + 1;
                const todayYear = new Date().getFullYear();

                const newRec: OQCRecord = {
                  id: `OQC-${serial.toUpperCase().replace(/[\/\s.#$\[\]]/g, '_')}`,
                  partCode: newCarPartCode.trim() || 'TEMDV11202',
                  serialNo: serial,
                  model: newCarModel,
                  color: newCarColor.trim() || 'Đỏ',
                  status: 'Chưa kiểm tra',
                  defectDetail: '',
                  failedCount: 0,
                  rootCause: '',
                  lsx: newCarLsx.trim() || '26-10',
                  checkTime: '',
                  date: todayStr,
                  month: todayMonth,
                  year: todayYear,
                  totalLlr: 1
                };

                const existingIndex = oqcRecords.findIndex(r => r.serialNo.trim().toUpperCase() === serial.toUpperCase());
                let updated: OQCRecord[];
                if (existingIndex > -1) {
                  updated = [...oqcRecords];
                  updated[existingIndex] = { ...updated[existingIndex], ...newRec };
                } else {
                  updated = [newRec, ...oqcRecords];
                }

                setOqcRecords(updated);
                safeStorage.setItem('dk_oqc_records', JSON.stringify(updated));
                setKcsSelectedLsx(newRec.lsx);
                setNewCarSerialNo('');
                setShowAddCarToLsxModal(false);
                alert(`Đã thêm xe số khung ${serial} vào LSX ${newRec.lsx}!`);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                    Số Khung / Sêri:
                  </label>
                  <input
                    type="text"
                    value={newCarSerialNo}
                    onChange={e => setNewCarSerialNo(e.target.value)}
                    placeholder="Ví dụ: 26DK00123"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-black font-mono text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                    Mã TEM / Quy Cách:
                  </label>
                  <input
                    type="text"
                    value={newCarPartCode}
                    onChange={e => {
                      const val = e.target.value;
                      setNewCarPartCode(val);
                      const matched = lookupPartCode(val);
                      if (matched) {
                        setNewCarModel(matched.model);
                        if (matched.color) setNewCarColor(matched.color);
                      }
                    }}
                    placeholder="TEMDV11202"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold font-mono text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                    Dòng xe (Model):
                  </label>
                  <select
                    value={newCarModel}
                    onChange={e => setNewCarModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  >
                    {modelNames.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                    Màu Sơn:
                  </label>
                  <input
                    type="text"
                    value={newCarColor}
                    onChange={e => setNewCarColor(e.target.value)}
                    placeholder="Đỏ, Đen, Trắng..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                  Lệnh Sản Xuất (LSX):
                </label>
                <input
                  type="text"
                  value={newCarLsx}
                  onChange={e => setNewCarLsx(e.target.value)}
                  placeholder="26-10"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-black font-mono text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-3 font-bold">
                <button
                  type="button"
                  onClick={() => setShowAddCarToLsxModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs transition shadow-md shadow-blue-200 cursor-pointer font-black"
                >
                  Thêm Vào LSX
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Dán danh sách Số Sêri Bàn Giao */}
      {showPasteHandoverModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-slate-850 text-sm uppercase text-amber-700 flex items-center gap-2">
                <Upload className="w-4 h-4" /> 📋 DÁN DANH SÁCH SỐ SÊRI BÀN GIAO CHO KHO
              </h3>
              <button
                type="button"
                onClick={() => setShowPasteHandoverModal(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!handoverPasteText.trim()) return;

                const lines = handoverPasteText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                const newItems: any[] = [];
                const existingSerials = new Set(handoverScannedList.map(x => x.serialNo.toUpperCase()));

                const now = new Date();
                const scanDateStr = standardizeDate(now.toLocaleDateString('vi-VN'));
                const scanTimeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

                lines.forEach(line => {
                  const parts = line.includes('\t') ? line.split('\t') : (line.includes(',') ? line.split(',') : [line]);
                  const serial = parts[0].trim().toUpperCase();
                  if (!serial) return;
                  if (existingSerials.has(serial)) return;
                  existingSerials.add(serial);

                  const found = oqcRecords.find(r => 
                    (r.serialNo && r.serialNo.trim().toUpperCase() === serial) ||
                    (r.chassisNo && r.chassisNo.trim().toUpperCase() === serial) ||
                    (r.engineNo && r.engineNo.trim().toUpperCase() === serial)
                  );
                  newItems.push({
                    id: `HO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    serialNo: found ? found.serialNo : serial,
                    chassisNo: found ? (found.chassisNo || '--') : '--',
                    engineNo: found ? (found.engineNo || '--') : '--',
                    partCode: found ? (found.partCode || 'TEM-GEN') : 'TEM-GEN',
                    model: found ? (found.model || 'Chưa rõ') : 'Chưa có trong OQC',
                    color: found ? (found.color || 'Chưa rõ') : 'Chưa rõ',
                    lsx: found ? (found.lsx || 'Ngoại bảng') : 'Ngoại bảng',
                    status: found ? (found.status || 'Chưa kiểm tra') : 'Chưa có dữ liệu KCS',
                    checkTime: found ? (found.checkTime || '--:--') : '--:--',
                    date: scanDateStr,
                    scannedAt: scanTimeStr
                  });
                });

                const updatedList = [...newItems, ...handoverScannedList];
                saveHandoverList(updatedList);
                setHandoverPasteText('');
                setShowPasteHandoverModal(false);
                alert(`Đã nạp ${newItems.length} xe vào Không Gian Báo Phẩm Bàn Giao!`);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                  Dán danh sách các Số Sêri (Mỗi số 1 dòng):
                </label>
                <textarea
                  value={handoverPasteText}
                  onChange={e => setHandoverPasteText(e.target.value)}
                  rows={8}
                  placeholder={`26DK00101\n26DK00102\n26DK00103\n...`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs focus:bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                  autoFocus
                />
                <span className="text-[10.5px] text-slate-400 font-medium mt-1 block">
                  💡 Hệ thống tự động tra cứu Model, Màu sắc, Lệnh Sản Xuất từ cơ sở dữ liệu đã nạp.
                </span>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3 font-bold">
                <button
                  type="button"
                  onClick={() => setShowPasteHandoverModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-xl text-xs transition shadow-md shadow-amber-200 cursor-pointer font-black"
                >
                  Báo Phẩm Bàn Giao
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Chỉnh sửa Bản Ghi Quét Báo Phẩm Bàn Giao */}
      {editingHandoverItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-slate-850 text-sm uppercase text-indigo-700 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" /> Chỉnh Sửa Bản Ghi Bàn Giao Xe
              </h3>
              <button
                type="button"
                onClick={() => setEditingHandoverItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingHandoverItem.serialNo || !editingHandoverItem.serialNo.trim()) {
                  alert('Vui lòng nhập Số Sêri xe!');
                  return;
                }

                const updated = handoverScannedList.map(item => 
                  item.id === editingHandoverItem.id ? editingHandoverItem : item
                );
                saveHandoverList(updated);
                setEditingHandoverItem(null);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                    Số Sêri (Tem ĐT) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingHandoverItem.serialNo}
                    onChange={e => setEditingHandoverItem({ ...editingHandoverItem, serialNo: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                    Số Khung
                  </label>
                  <input
                    type="text"
                    value={editingHandoverItem.chassisNo || ''}
                    onChange={e => setEditingHandoverItem({ ...editingHandoverItem, chassisNo: e.target.value.toUpperCase() })}
                    placeholder="VD: RLKDK..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                    Số Động Cơ
                  </label>
                  <input
                    type="text"
                    value={editingHandoverItem.engineNo || ''}
                    onChange={e => setEditingHandoverItem({ ...editingHandoverItem, engineNo: e.target.value.toUpperCase() })}
                    placeholder="VD: 10DK..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                    Mã Quy Cách (Part Code)
                  </label>
                  <input
                    type="text"
                    value={editingHandoverItem.partCode || ''}
                    onChange={e => {
                      const pCode = e.target.value.toUpperCase();
                      const matched = lookupPartCode(pCode);
                      setEditingHandoverItem({
                        ...editingHandoverItem,
                        partCode: pCode,
                        model: matched ? matched.model : editingHandoverItem.model,
                        color: matched ? matched.color : editingHandoverItem.color
                      });
                    }}
                    placeholder="VD: SP-01..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                    Dòng Xe (Model)
                  </label>
                  <input
                    type="text"
                    value={editingHandoverItem.model || ''}
                    onChange={e => setEditingHandoverItem({ ...editingHandoverItem, model: e.target.value })}
                    placeholder="VD: DK Roma SX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-850 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                    Màu Sắc
                  </label>
                  <input
                    type="text"
                    value={editingHandoverItem.color || ''}
                    onChange={e => setEditingHandoverItem({ ...editingHandoverItem, color: e.target.value })}
                    placeholder="VD: Đỏ bóng / Đen mờ"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-750 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                    Lệnh Sản Xuất (LSX)
                  </label>
                  <input
                    type="text"
                    value={editingHandoverItem.lsx || ''}
                    onChange={e => setEditingHandoverItem({ ...editingHandoverItem, lsx: e.target.value.toUpperCase() })}
                    placeholder="VD: LSX-0826"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                    Ngày Quét Bàn Giao
                  </label>
                  <input
                    type="text"
                    value={editingHandoverItem.date || ''}
                    onChange={e => setEditingHandoverItem({ ...editingHandoverItem, date: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                    Giờ Bàn Giao
                  </label>
                  <input
                    type="text"
                    value={editingHandoverItem.scannedAt || ''}
                    onChange={e => setEditingHandoverItem({ ...editingHandoverItem, scannedAt: e.target.value })}
                    placeholder="HH:mm:ss"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3 font-bold">
                <button
                  type="button"
                  onClick={() => setEditingHandoverItem(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-550 text-white px-5 py-2 rounded-xl text-xs transition shadow-md shadow-indigo-200 cursor-pointer font-black flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Thêm / Chỉnh sửa Mã Quy Cách Xe */}
      {showAddPartCodeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-slate-850 text-sm uppercase text-blue-700 flex items-center gap-2">
                <Tag className="w-4 h-4" /> {editingPartCode ? 'Chỉnh Sửa Mã Quy Cách' : 'Thêm Mã Quy Cách Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPartCodeModal(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                setPartCodeFormError('');
                const code = partCodeFormCode.trim().toUpperCase();
                const name = partCodeFormNameWithColor.trim();
                const model = partCodeFormModel.trim();
                let color = partCodeFormColor.trim();

                if (!code) {
                  setPartCodeFormError('Vui lòng nhập Mã quy cách!');
                  return;
                }
                if (!name) {
                  setPartCodeFormError('Vui lòng nhập Tên model kèm màu!');
                  return;
                }
                if (!model) {
                  setPartCodeFormError('Vui lòng nhập hoặc chọn Dòng xe (Model)!');
                  return;
                }
                if (!color && name.includes(' - ')) {
                  color = name.split(' - ').slice(1).join(' - ').trim();
                }

                const today = new Date().toLocaleDateString('vi-VN');
                const newItem: OqcPartCodeItem = {
                  id: editingPartCode ? editingPartCode.id : `PC-${code}-${Date.now()}`,
                  partCode: code,
                  nameWithColor: name,
                  model: model,
                  color: color || 'Tiêu chuẩn',
                  updatedAt: today
                };

                let updatedList: OqcPartCodeItem[];
                if (editingPartCode) {
                  updatedList = oqcPartCodes.map(x => x.id === editingPartCode.id || x.partCode === editingPartCode.partCode ? newItem : x);
                } else {
                  const existingIdx = oqcPartCodes.findIndex(x => x.partCode === code);
                  if (existingIdx > -1) {
                    if (!window.confirm(`Mã quy cách "${code}" đã tồn tại trong danh mục. Bạn có muốn ghi đè thông tin?`)) return;
                    updatedList = [...oqcPartCodes];
                    updatedList[existingIdx] = newItem;
                  } else {
                    updatedList = [newItem, ...oqcPartCodes];
                  }
                }

                saveOqcPartCodes(updatedList);
                setShowAddPartCodeModal(false);
                setEditingPartCode(null);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                  Mã Quy Cách (Part Code):
                </label>
                <input
                  type="text"
                  value={partCodeFormCode}
                  onChange={e => setPartCodeFormCode(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: TEBDS10101, TEMDV11202..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold font-mono text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden uppercase"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                  Tên Model Kèm Màu:
                </label>
                <input
                  type="text"
                  value={partCodeFormNameWithColor}
                  onChange={e => {
                    const val = e.target.value;
                    setPartCodeFormNameWithColor(val);
                    if (val.includes(' - ')) {
                      const parts = val.split(' - ');
                      if (!partCodeFormModel) setPartCodeFormModel(parts[0].trim());
                      setPartCodeFormColor(parts.slice(1).join(' - ').trim());
                    }
                  }}
                  placeholder="Ví dụ: DK S1 - Đen khói, DK Gogo S - Đỏ đun..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                    Dòng Xe (Model):
                  </label>
                  <input
                    type="text"
                    value={partCodeFormModel}
                    onChange={e => setPartCodeFormModel(e.target.value)}
                    placeholder="DK S1, DK Gogo..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                    Màu Sắc:
                  </label>
                  <input
                    type="text"
                    value={partCodeFormColor}
                    onChange={e => setPartCodeFormColor(e.target.value)}
                    placeholder="Đen khói, Đỏ đun..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              {partCodeFormError && (
                <div className="p-2 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-200">
                  ⚠️ {partCodeFormError}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t pt-3 font-bold">
                <button
                  type="button"
                  onClick={() => setShowAddPartCodeModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs transition cursor-pointer shadow-xs"
                >
                  {editingPartCode ? 'Lưu Thay Đổi' : 'Thêm Vào Danh Mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Dán danh sách mã quy cách hàng loạt */}
      {showPastePartCodesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-slate-850 text-sm uppercase text-blue-700 flex items-center gap-2">
                <Copy className="w-4 h-4" /> DÁN DANH SÁCH MÃ QUY CÁCH HÀNG LOẠT (EXCEL / LARK)
              </h3>
              <button
                type="button"
                onClick={() => setShowPastePartCodesModal(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-700">Hướng dẫn định dạng 3 cột:</p>
              <div className="bg-white p-1.5 px-2.5 rounded border border-slate-300 font-mono text-[11px] text-slate-800 font-bold overflow-x-auto whitespace-nowrap">
                Mã Quy Cách [Tab] Tên model kèm màu [Tab] Model
              </div>
              <p className="text-[11px]">Ví dụ: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">TEBDS10101	DK S1 - Đen khói	DK S1</code></p>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                setPastePartCodesError('');
                const raw = pastePartCodesText.trim();
                if (!raw) {
                  setPastePartCodesError('Vui lòng dán nội dung danh sách mã quy cách!');
                  return;
                }

                const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
                const parsedItems: OqcPartCodeItem[] = [];
                const today = new Date().toLocaleDateString('vi-VN');

                lines.forEach((line, idx) => {
                  const parts = line.includes('\t') ? line.split('\t') : (line.includes(',') ? line.split(',') : line.split(/\s{2,}/));
                  const p0 = (parts[0] || '').trim().toUpperCase();
                  const p1 = (parts[1] || '').trim();
                  const p2 = (parts[2] || '').trim();

                  // Skip header line
                  if (p0.includes('MÃ') || p0.includes('QUY CÁCH') || p0 === 'CODE' || p0 === 'PARTCODE') return;
                  if (!p0) return;

                  let color = '';
                  if (p1.includes(' - ')) {
                    color = p1.split(' - ').slice(1).join(' - ').trim();
                  } else if (p2 && p1.startsWith(p2)) {
                    color = p1.replace(p2, '').trim();
                  } else {
                    color = p1;
                  }

                  parsedItems.push({
                    id: `PC-${p0}-${idx + 1}`,
                    partCode: p0,
                    nameWithColor: p1 || p0,
                    model: p2 || (p1.includes(' - ') ? p1.split(' - ')[0].trim() : 'DKBike'),
                    color: color || 'Tiêu chuẩn',
                    updatedAt: today
                  });
                });

                if (parsedItems.length === 0) {
                  setPastePartCodesError('Không nhận diện được dòng dữ liệu hợp lệ nào. Vui lòng kiểm tra lại định dạng dán!');
                  return;
                }

                let finalList: OqcPartCodeItem[];
                if (pastePartCodesMode === 'replace') {
                  if (!window.confirm(`Xác nhận GHI ĐÈ THAY THẾ TOÀN BỘ danh mục hiện tại bằng ${parsedItems.length} mã vừa dán?`)) return;
                  finalList = parsedItems;
                } else {
                  const map = new Map<string, OqcPartCodeItem>();
                  oqcPartCodes.forEach(x => map.set(x.partCode.toUpperCase(), x));
                  parsedItems.forEach(x => map.set(x.partCode.toUpperCase(), x));
                  finalList = Array.from(map.values());
                }

                saveOqcPartCodes(finalList);
                setShowPastePartCodesModal(false);
                setPastePartCodesText('');
                alert(`Đã nạp thành công ${parsedItems.length} mã quy cách vào hệ thống!`);
              }}
              className="space-y-3 flex-1 flex flex-col min-h-0 text-xs"
            >
              <div className="flex items-center gap-4 py-1">
                <span className="font-bold text-slate-700 text-xs">Chế độ nạp:</span>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="pasteMode"
                    value="merge"
                    checked={pastePartCodesMode === 'merge'}
                    onChange={() => setPastePartCodesMode('merge')}
                  />
                  Thêm mới &amp; Cập nhật mã trùng (Khuyên dùng)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="pasteMode"
                    value="replace"
                    checked={pastePartCodesMode === 'replace'}
                    onChange={() => setPastePartCodesMode('replace')}
                  />
                  Ghi đè thay thế toàn bộ
                </label>
              </div>

              <div className="flex-1 min-h-0 flex flex-col space-y-1">
                <label className="font-bold text-slate-700 block">Dán danh sách tại đây (Ctrl + V):</label>
                <textarea
                  value={pastePartCodesText}
                  onChange={e => setPastePartCodesText(e.target.value)}
                  placeholder="TEBDS10101	DK S1 - Đen khói	DK S1&#10;TEBDS10102	DK S1 - Đỏ	DK S1&#10;TEBDS10103	DK S1 - Ghi pha lê	DK S1"
                  className="w-full flex-1 bg-slate-50 border border-slate-300 p-2.5 font-mono text-[11px] focus:bg-white rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none overflow-y-auto"
                />
              </div>

              {pastePartCodesError && (
                <div className="p-2 bg-rose-50 text-rose-700 font-bold rounded-lg border border-rose-200">
                  ⚠️ {pastePartCodesError}
                </div>
              )}

              <div className="flex justify-between items-center border-t pt-3 font-bold">
                <span className="text-[11px] text-slate-500 font-mono">
                  {pastePartCodesText.split('\n').filter(Boolean).length} dòng được dán
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPastePartCodesModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs transition cursor-pointer shadow-xs"
                  >
                    Bắt Đầu Nạp Dữ Liệu
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD OQC RECORD */}
      {showAddOqcModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border shadow-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm uppercase text-blue-700 flex items-center gap-1.5">
                <Plus className="w-4 h-4 shadow-sm" /> THÊM KẾT QUẢ NGHIỆM THU XE THÀNH PHẨM (KCS / OQC)
              </h3>
              <button 
                onClick={() => setShowAddOqcModal(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddOqcRecord} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Mã Quy Cách TEM</label>
                  <input 
                    type="text" 
                    value={newOqcPartCode}
                    onChange={(e)=>setNewOqcPartCode(e.target.value)}
                    placeholder="Ví dụ: TEMDV11202"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Số Sêri Định Định Xe</label>
                  <input 
                    type="text" 
                    value={newOqcSerialNo}
                    onChange={(e)=>setNewOqcSerialNo(e.target.value)}
                    placeholder="Ví dụ: 26DK01234"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Nhân viên kiểm thử OQC</label>
                  <select 
                    value={newOqcCheckedBy}
                    onChange={(e)=>setNewOqcCheckedBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-705 font-bold"
                  >
                    <option value="Liễu Tùng Lâm">Liễu Tùng Lâm</option>
                    <option value="Lành Xuân Hải">Lành Xuân Hải</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Model dòng xe điện</label>
                  <select 
                    value={newOqcModel}
                    onChange={(e)=>setNewOqcModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-850 font-extrabold bg-slate-50 pointer-events-auto cursor-pointer"
                  >
                    {modelNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Màu Sắc Sơn</label>
                  <input 
                    type="text" 
                    value={newOqcColor}
                    onChange={(e)=>setNewOqcColor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Nghiệm nghiệm chất lượng</label>
                  <select 
                    value={newOqcStatus}
                    onChange={(e)=>setNewOqcStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-bold text-slate-705"
                  >
                    <option value="Đạt">Đạt (Không phát hiện lỗi)</option>
                    <option value="Lỗi">Lỗi (Từ chối bàn giao)</option>
                    <option value="Chưa kiểm tra">Chưa kiểm tra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Lệnh sản xuất (LSX)</label>
                  <input 
                    type="text" 
                    value={newOqcLsx}
                    onChange={(e)=>setNewOqcLsx(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-bold"
                    required
                  />
                </div>
              </div>

              {newOqcStatus === 'Lỗi' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-150 bg-red-50/40 p-4 border border-red-100 rounded-xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-505 mb-1 uppercase tracking-wide">Tổng số khuyết điểm phế phẩm</label>
                      <input 
                        type="number" 
                        value={newOqcFailedCount}
                        onChange={(e)=>setNewOqcFailedCount(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded p-2 font-bold font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-505 mb-1 uppercase tracking-wide">Chi tiết khuyết điểm xe</label>
                      <input 
                        type="text" 
                        value={newOqcDefectDetail}
                        onChange={(e)=>setNewOqcDefectDetail(e.target.value)}
                        placeholder="Ví dụ: Xước sườn tay xách..."
                        className="w-full bg-white border border-slate-200 rounded p-2 font-bold"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-505 mb-1 uppercase tracking-wide">Nguyên Nhân / Hành động khắc phục tại chuyền</label>
                    <input 
                      type="text" 
                      value={newOqcRootCause}
                      onChange={(e)=>setNewOqcRootCause(e.target.value)}
                      placeholder="Mô tả bốc bốc xếp cẩu thả, hoặc không luồn bọt lót sườn..."
                      className="w-full bg-white border border-slate-200 rounded p-2 font-semibold"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t pt-2.5 border-red-100/50">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-505 mb-1 uppercase tracking-wide">Đánh giá mức độ khuyết điểm</label>
                      <select 
                        value={newOqcEvaluation}
                        onChange={(e)=>setNewOqcEvaluation(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded p-2 text-slate-705 font-bold"
                        required
                      >
                        <option value="">-- Chọn đánh giá --</option>
                        <option value="Lỗi nhẹ (Minor) - Khắc phục nhanh tại vị trí">Lỗi nhẹ (Minor) - Khắc phục nhanh</option>
                        <option value="Lỗi vừa (Major) - Cần tháo ra lắp ráp lại">Lỗi vừa (Major) - Tháo lắp lại</option>
                        <option value="Lỗi nặng (Critical) - Đình chỉ bàn giao, bắt làm lại cả cụm">Lỗi nặng (Critical) - Làm lại cả cụm</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-505 mb-1 uppercase tracking-wide">Phương án xử lý kỹ thuật</label>
                      <input 
                        type="text" 
                        value={newOqcTreatment}
                        onChange={(e)=>setNewOqcTreatment(e.target.value)}
                        placeholder="Ví dụ: Hạ xe sửa sơn, thay linh kiện mới, sơn dặm..."
                        className="w-full bg-white border border-slate-200 rounded p-2 font-semibold"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-505 mb-1 uppercase tracking-wide">Ngày kiểm tra</label>
                  <input 
                    type="text" 
                    value={newOqcDate}
                    onChange={(e)=>setNewOqcDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-505 mb-1 uppercase tracking-wide">Giờ kiểm định (HH:MM)</label>
                  <input 
                    type="text" 
                    value={newOqcCheckTime}
                    onChange={(e)=>setNewOqcCheckTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 font-bold font-mono"
                    required
                  />
                </div>
              </div>

              {renderImageUploadField(newOqcImageUrl, setNewOqcImageUrl, "Đính kèm ảnh minh họa lỗi OQC (Thành phẩm)")}

              <div className="flex justify-end gap-2 border-t pt-3.5 font-bold">
                <button 
                  type="button"
                  onClick={() => setShowAddOqcModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-xs transition animate-slide-in-from-left"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded text-xs transition shadow shadow-blue-200"
                >
                  Lưu trữ KCS OQC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Excel/TSV Bulk KCS/OQC Importer */}
      {showImportOqcModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 flex flex-col max-h-[90vh]" id="oqc_import_modal">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase flex items-center gap-1.5 border-b pb-2 mb-4">
              <Upload className="w-4 h-4 text-indigo-600 animate-bounce" /> Nhập Danh Sách KCS Định Dạng Excel (Bulk Copy-Paste)
            </h3>

            <div className="text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border leading-relaxed space-y-1">
              <p className="font-bold text-slate-700">Hướng dẫn nhanh cách dán dữ liệu:</p>
              <p>1. Thiết lập các cột trên file Excel theo đúng thứ tự sau (17 cột):</p>
              <div className="bg-white p-1.5 px-2.5 rounded border font-mono text-[10px] text-indigo-800 font-bold overflow-x-auto whitespace-nowrap">
                1. Mã quy cách | 2. Số Sêri | 3. Màu xe | 4. Tình trạng | 5. Đạt | 6. Chi tiết lỗi | 7. Số lỗi | 8. Nguyên nhân | 9. Chi tiết nguyên nhân | 10. LSX | 11. Model | 12. Tính toán giờ ngày | 13. Giờ kiểm tra x | 14. Ngày | 15. Tháng | 16. Năm | 17. SLLR
              </div>
              <p>2. Chọn các dòng dữ liệu trong Excel (không gồm tiêu đề hoặc gồm tiêu đề đều được) &rarr; Nhấn <kbd className="bg-slate-200 px-1 py-0.5 rounded text-slate-700 font-mono text-[11px]">Ctrl + C</kbd> để copy.</p>
              <p>3. Click vào ô văn bản phía dưới &rarr; Nhấn <kbd className="bg-slate-200 px-1 py-0.5 rounded text-slate-700 font-mono text-[11px]">Ctrl + V</kbd> để dán &rarr; Click <span className="font-bold text-indigo-700">"Bắt đầu Import"</span>.</p>
              <div className="text-emerald-700 font-semibold bg-emerald-50 p-2 rounded border border-emerald-200 inline-block mt-1">
                💡 Hệ thống tự động nhận diện các dòng ghi nhận lỗi <strong className="underline">"xước"</strong> hoặc <strong className="underline">"thiếu" / "thiếu linh kiện"</strong> và sẽ tự động chuyển tình trạng xe đó thành <strong className="text-emerald-800">Đạt</strong>.
              </div>
            </div>

            <form onSubmit={handleImportOqcSubmit} className="space-y-3.5 flex-1 flex flex-col min-h-0 text-xs text-slate-800">
              <div className="flex flex-wrap items-center justify-between bg-slate-100 p-2.5 rounded-xl border border-slate-200 gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700 text-xs">Chế độ nạp:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                    <input
                      type="radio"
                      name="oqcPasteMode"
                      checked={!oqcImportReplaceAll}
                      onChange={() => setOqcImportReplaceAll(false)}
                    />
                    Thêm &amp; Ghi đè theo Sêri
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-black text-rose-700">
                    <input
                      type="radio"
                      name="oqcPasteMode"
                      checked={oqcImportReplaceAll}
                      onChange={() => setOqcImportReplaceAll(true)}
                    />
                    🔥 Xóa sạch dữ liệu cũ &amp; Nạp mới 100%
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleClearAllOqcData}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-extrabold hover:underline cursor-pointer flex items-center gap-1"
                  title="Xóa sạch toàn bộ dữ liệu KCS hiện có"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa sạch dữ liệu cũ ngay
                </button>
              </div>

              <div className="flex-1 min-h-0 flex flex-col space-y-1">
                <label className="font-extrabold text-slate-700 block">Dán nội dung bảng tính Excel tại đây:</label>
                <textarea
                  value={oqcImportText}
                  onChange={(e) => setOqcImportText(e.target.value)}
                  placeholder="TEMDD20102&#9;26DK18532&#9;DK D2 - Ghi đen&#9;Lỗi&#9;&#9;Không vào điện&#9;1&#9;&#9;&#9;26-178&#9;DK D2&#9;2026-06-08 19:37&#9;19:37:45&#9;8&#9;6&#9;2026&#9;1"
                  className="w-full flex-1 bg-slate-50 border p-2.5 font-mono text-[11px] focus:bg-white rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none overflow-y-auto border-slate-300"
                />
              </div>

              {oqcImportError && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded border border-red-150 font-bold text-[11px]">
                  ⚠️ {oqcImportError}
                </div>
              )}

              <div className="flex gap-2 justify-end border-t pt-3.5">
                <button 
                  type="button"
                  onClick={() => {
                    setShowImportOqcModal(false);
                    setOqcImportError('');
                    setOqcImportText('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition shadow shadow-indigo-200"
                >
                  Bắt đầu Import ({oqcImportText.split('\n').filter(Boolean).length} dòng dán)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HIGH-PERFORMANCE BARCODE SCANNER COLOR & STATUS CHANGE */}
      {showScanColorChangeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-4 sm:p-6 border border-purple-300 text-xs text-slate-800 space-y-4 max-h-[94vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-purple-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-purple-100 text-purple-700 rounded-xl border border-purple-300 shadow-xs">
                  <QrCode className="w-5 h-5 text-purple-700 animate-pulse" />
                </span>
                <div>
                  <h3 className="font-black text-slate-800 text-sm sm:text-base uppercase flex items-center gap-2">
                    🔫 Quét Mã Sêri Đổi Màu &amp; Đổi Trạng Thái Xe (KCS)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sử dụng súng quét mã vạch / QR — Tự động tra Model &amp; Màu gốc từ KCS OQC và cho phép nhập/sửa trực tiếp
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  if (stagedScans.length > 0) {
                    if (!confirm(`Anh Thao có chắc muốn đóng? ${stagedScans.length} xe vừa quét chưa được lưu vào hệ thống.`)) return;
                  }
                  setShowScanColorChangeModal(false);
                  setStagedScans([]);
                  setScanError('');
                  setScanLastSuccess(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer font-black text-base"
              >
                ✕
              </button>
            </div>

            {/* Date and Quick Info Setup Bar */}
            <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
              <div className="flex items-center gap-2 text-purple-900">
                <span className="p-1.5 bg-purple-200/70 text-purple-800 rounded-lg">
                  <Wrench className="w-4 h-4 text-purple-700" />
                </span>
                <div>
                  <span className="font-extrabold text-xs block">Quy trình quét đổi màu/trạng thái xe nhanh:</span>
                  <span className="text-[11px] text-purple-700 font-medium">
                    1. Bắn súng quét Sêri liên tục (tự tra Model &amp; Màu gốc) ➔ 2. Nhập/chọn Model mới &amp; Màu mới ở bảng ➔ 3. Bấm Lưu.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="font-extrabold text-purple-900 text-[11px] uppercase tracking-wide">
                  📅 Ngày thực hiện:
                </label>
                <input
                  type="text"
                  value={scanDate}
                  onChange={(e) => setScanDate(e.target.value)}
                  placeholder="dd/mm/yyyy"
                  className="w-32 bg-white border border-purple-300 rounded-lg p-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Scanner Input Box */}
            <div className="space-y-2">
              <label className="font-black text-slate-800 block text-xs flex items-center justify-between">
                <span>🎯 Ô nhận tín hiệu máy quét mã vạch (Focus liên tục):</span>
                <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  ⚡ Súng quét bắn Enter để tự thêm
                </span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <QrCode className="w-5 h-5 text-purple-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={scannerInputRef}
                    type="text"
                    value={scanSerialInput}
                    onChange={(e) => setScanSerialInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleProcessScanSerial();
                      }
                    }}
                    placeholder="Bắn súng quét mã vạch vào tem xe hoặc gõ số sêri..."
                    autoFocus
                    className="w-full pl-10 pr-3 py-2.5 bg-purple-50/40 border-2 border-purple-400 rounded-xl font-mono text-sm font-black text-purple-950 focus:bg-white focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200 placeholder:text-slate-400 placeholder:font-sans placeholder:text-xs placeholder:font-normal"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleProcessScanSerial}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-purple-200 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" /> Thêm xe
                </button>
              </div>
            </div>

            {/* Instant scan feedback alert */}
            {scanLastSuccess && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-300 font-bold text-xs flex items-center justify-between animate-in fade-in duration-150">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {scanLastSuccess}
                </span>
                <span className="text-[10px] text-emerald-600 font-mono bg-emerald-100 px-1.5 py-0.5 rounded">
                  Đã ghi vào RAM
                </span>
              </div>
            )}

            {scanError && (
              <div className="p-2.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-300 font-bold text-xs flex items-center gap-1.5 animate-in shake duration-200">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                {scanError}
              </div>
            )}

            {/* Staging Scans Table (In RAM) */}
            <div className="flex-1 flex flex-col min-h-0 space-y-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span className="font-extrabold text-xs text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  📋 Danh sách xe đã quét trong phiên:
                  <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full font-mono text-[10px] font-black">
                    {stagedScans.length} xe
                  </span>
                </span>

                {stagedScans.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Quick batch model helper */}
                    <div className="flex items-center gap-1 bg-indigo-50 p-1 px-2 rounded-lg border border-indigo-200 text-[11px]">
                      <span className="text-indigo-700 font-bold">Gán nhanh Model mới:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleApplyModelToAllStaged(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        className="bg-white border border-indigo-300 rounded px-1.5 py-0.5 text-[11px] font-bold text-indigo-900 focus:outline-none max-w-[140px]"
                      >
                        <option value="" disabled>-- Chọn Model --</option>
                        {uniqueColorChangeModels.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quick batch color helper */}
                    <div className="flex items-center gap-1 bg-pink-50 p-1 px-2 rounded-lg border border-pink-200 text-[11px]">
                      <span className="text-pink-700 font-bold">Gán nhanh Màu mới:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleApplyColorToAllStaged(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        className="bg-white border border-pink-300 rounded px-1.5 py-0.5 text-[11px] font-bold text-pink-900 focus:outline-none"
                      >
                        <option value="" disabled>-- Chọn màu --</option>
                        {['Đen', 'Đen mờ', 'Đen bóng', 'Đỏ', 'Đỏ đun', 'Trắng', 'Trắng đen', 'Trắng sứ', 'Xanh cửu long', 'Xanh ngọc', 'Xanh rêu', 'Xám xi măng', 'Ghi bạc', 'Cà phê', 'Vàng', 'Cam', 'Hồng', 'Tím', 'Xanh xi măng'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Xác nhận xóa trắng danh sách các xe vừa quét?')) {
                          setStagedScans([]);
                          setScanLastSuccess(null);
                          scannerInputRef.current?.focus();
                        }
                      }}
                      className="text-[10.5px] text-rose-600 hover:text-rose-800 font-bold hover:bg-rose-50 px-2 py-1 rounded transition cursor-pointer"
                    >
                      Xóa tất cả ({stagedScans.length})
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 max-h-[280px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 shadow-inner">
                {stagedScans.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 space-y-1.5">
                    <QrCode className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs font-black text-slate-600">Chưa có xe nào được quét trong phiên này</p>
                    <p className="text-[11px] text-slate-400">Bắn súng quét mã vạch vào tem xe để nạp sêri &amp; hiển thị màu gốc ngay</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-purple-100/90 text-purple-900 sticky top-0 font-extrabold text-[10.5px] uppercase border-b border-purple-200 z-10">
                      <tr>
                        <th className="p-2 w-8 text-center">STT</th>
                        <th className="p-2 w-32">Số Sêri</th>
                        <th className="p-2 w-36">Model GỐC</th>
                        <th className="p-2 w-28">Màu GỐC</th>
                        <th className="p-2 text-center w-6">➔</th>
                        <th className="p-2 w-36">🔄 Model MỚI</th>
                        <th className="p-2 w-36">🎨 Màu MỚI</th>
                        <th className="p-2 text-center w-28">Ngày đổi</th>
                        <th className="p-2 text-center w-10">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100 font-medium">
                      {stagedScans.map((item, idx) => (
                        <tr key={idx} className="hover:bg-purple-50/30 bg-white transition">
                          <td className="p-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-2 font-mono font-black text-slate-900">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px] block">
                              {item.serialNo}
                            </span>
                            {item.isNewInOqc && (
                              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded border border-amber-200 mt-0.5 inline-block">
                                Chưa có KCS
                              </span>
                            )}
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              list="scan-model-presets-list"
                              value={item.oldModel || item.model}
                              onChange={(e) => handleUpdateStagedItem(idx, 'oldModel', e.target.value)}
                              placeholder="Model cũ..."
                              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-purple-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              list="scan-color-presets-list"
                              value={item.oldColor}
                              onChange={(e) => handleUpdateStagedItem(idx, 'oldColor', e.target.value)}
                              placeholder="Màu cũ..."
                              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-purple-500"
                            />
                          </td>
                          <td className="p-2 text-center font-black text-purple-600">➔</td>
                          <td className="p-2">
                            <input
                              type="text"
                              list="scan-model-presets-list"
                              value={item.newModel || item.model}
                              onChange={(e) => handleUpdateStagedItem(idx, 'newModel', e.target.value)}
                              placeholder="Model mới..."
                              className="w-full bg-indigo-50/50 border border-indigo-200 rounded px-1.5 py-1 text-xs font-bold text-indigo-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              list="scan-color-presets-list"
                              value={item.newColor}
                              onChange={(e) => handleUpdateStagedItem(idx, 'newColor', e.target.value)}
                              placeholder="Chọn/gõ màu mới..."
                              className={`w-full border rounded px-1.5 py-1 text-xs font-black transition focus:outline-none focus:ring-2 ${
                                !item.newColor || !item.newColor.trim()
                                  ? 'border-amber-400 bg-amber-50/60 text-amber-900 placeholder:text-amber-600/70 focus:border-amber-500 focus:ring-amber-200 animate-pulse'
                                  : 'border-pink-300 bg-pink-50/40 text-pink-900 focus:bg-white focus:border-pink-600 focus:ring-pink-200'
                              }`}
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="text"
                              value={item.date}
                              onChange={(e) => handleUpdateStagedItem(idx, 'date', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-1 text-center font-mono text-[11px] font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-purple-500"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setStagedScans(prev => prev.filter((_, i) => i !== idx));
                                setTimeout(() => scannerInputRef.current?.focus(), 50);
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Xóa xe này khỏi danh sách quét"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Datalists for models & colors */}
              <datalist id="scan-model-presets-list">
                {uniqueColorChangeModels.map(m => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <datalist id="scan-color-presets-list">
                {['Đen', 'Đen mờ', 'Đen bóng', 'Đỏ', 'Đỏ đun', 'Trắng', 'Trắng đen', 'Trắng hồng', 'Trắng sứ', 'Xanh cửu long', 'Xanh ngọc', 'Xanh rêu', 'Xám xi măng', 'Ghi bạc', 'Ghi pha lê', 'Ghi khói', 'Cà phê', 'Vàng', 'Cam', 'Hồng', 'Tím', 'Xanh xi măng', ...uniqueOqcColors].filter((v, i, a) => a.indexOf(v) === i).map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center border-t border-slate-200 pt-3 text-xs">
              <div className="text-slate-500 text-[11px]">
                {stagedScans.length > 0 && (
                  <span>
                    🚀 Sẵn sàng lưu <strong>{stagedScans.length} xe</strong> (Chỉ tốn 1 lần ghi Cloud)
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (stagedScans.length > 0) {
                      if (!confirm(`Anh Thao có chắc muốn đóng? ${stagedScans.length} xe vừa quét chưa được lưu vào hệ thống.`)) return;
                    }
                    setShowScanColorChangeModal(false);
                    setStagedScans([]);
                    setScanError('');
                    setScanLastSuccess(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveStagedScans}
                  disabled={stagedScans.length === 0}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-md shadow-purple-200 cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  💾 Xác nhận &amp; Lưu Đổi Màu ({stagedScans.length} xe)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SINGLE COLOR & STATUS SHIFT RECORD */}
      {showEditColorChangeModal && editingColorChangeRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4 sm:p-6 border border-purple-300 text-xs text-slate-800 space-y-4 max-h-[94vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-purple-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-purple-100 text-purple-700 rounded-xl border border-purple-300 shadow-xs">
                  <Pencil className="w-5 h-5 text-purple-700" />
                </span>
                <div>
                  <h3 className="font-black text-slate-800 text-sm sm:text-base uppercase">
                    ✏️ Sửa Thông Tin Xe Đổi Màu / Trạng Thái
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cập nhật lại Model hoặc Màu sắc xe — Tự động lưu vào CSDL &amp; OQC
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowEditColorChangeModal(false);
                  setEditingColorChangeRecord(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer font-black text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditColorChange} className="space-y-3.5">
              {editCcError && (
                <div className="p-2.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-300 font-bold text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  {editCcError}
                </div>
              )}

              {/* Serial No */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Số Sêri / Số Khung:
                </label>
                <input
                  type="text"
                  value={editCcSerialNo}
                  onChange={(e) => setEditCcSerialNo(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-300 rounded-xl p-2 font-mono font-black text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-purple-600"
                  required
                />
              </div>

              {/* Model Old vs New */}
              <div className="grid grid-cols-2 gap-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 uppercase mb-1">
                    Model CŨ (Gốc):
                  </label>
                  <input
                    type="text"
                    list="scan-model-presets-list"
                    value={editCcOldModel}
                    onChange={(e) => setEditCcOldModel(e.target.value)}
                    placeholder="Nhập/chọn model cũ..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-indigo-700 uppercase mb-1">
                    Model MỚI (Sau đổi):
                  </label>
                  <input
                    type="text"
                    list="scan-model-presets-list"
                    value={editCcNewModel}
                    onChange={(e) => setEditCcNewModel(e.target.value)}
                    placeholder="Nhập/chọn model mới..."
                    className="w-full bg-white border border-indigo-300 rounded-lg p-2 text-xs font-bold text-indigo-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Color Old vs New */}
              <div className="grid grid-cols-2 gap-3 bg-pink-50/50 p-3 rounded-xl border border-pink-100">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 uppercase mb-1">
                    Màu sắc CŨ (Gốc):
                  </label>
                  <input
                    type="text"
                    list="scan-color-presets-list"
                    value={editCcOldColor}
                    onChange={(e) => setEditCcOldColor(e.target.value)}
                    placeholder="Nhập/chọn màu cũ..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-pink-600"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-pink-700 uppercase mb-1">
                    Màu sắc MỚI (Sau đổi):
                  </label>
                  <input
                    type="text"
                    list="scan-color-presets-list"
                    value={editCcNewColor}
                    onChange={(e) => setEditCcNewColor(e.target.value)}
                    placeholder="Nhập/chọn màu mới..."
                    className="w-full bg-white border border-pink-300 rounded-lg p-2 text-xs font-bold text-pink-900 focus:outline-none focus:border-pink-600"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  📅 Ngày thực hiện đổi (dd/mm/yyyy):
                </label>
                <input
                  type="text"
                  value={editCcDate}
                  onChange={(e) => setEditCcDate(e.target.value)}
                  placeholder="dd/mm/yyyy"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold text-slate-800 text-xs focus:outline-none focus:border-purple-600"
                  required
                />
              </div>

              {/* Classification Preview Badge */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <span className="text-slate-500 font-bold">Phân loại nhận diện:</span>
                <div>
                  {editCcOldModel.trim().toLowerCase() !== editCcNewModel.trim().toLowerCase() && editCcOldColor.trim().toLowerCase() !== editCcNewColor.trim().toLowerCase() ? (
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">
                      ✨ Đổi cả 2 (Trạng thái &amp; Màu)
                    </span>
                  ) : editCcOldModel.trim().toLowerCase() !== editCcNewModel.trim().toLowerCase() ? (
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-300">
                      🔄 Đổi trạng thái / Phiên bản
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-pink-50 text-pink-700 border border-pink-300">
                      🎨 Đổi màu sơn xe
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditColorChangeModal(false);
                    setEditingColorChangeRecord(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition shadow-md shadow-purple-200 cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Lưu cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BATCH COLOR & STATUS CHANGE IMPORT FOR OQC */}
      {showColorChangeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-4 sm:p-6 border border-purple-200 text-xs text-slate-800 space-y-4 max-h-[94vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-purple-100 text-purple-700 rounded-xl border border-purple-300 shadow-2xs">
                  <RefreshCw className="w-5 h-5 text-purple-600 animate-spin-slow" />
                </span>
                <div>
                  <h3 className="font-black text-slate-800 text-sm sm:text-base uppercase">
                    Nhập Danh Sách Xe Đổi Màu &amp; Đổi Trạng Thái (KCS OQC)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cập nhật đồng thời Màu sơn và Phiên bản/Trạng thái xe — Tự động đồng bộ vào CSDL OQC &amp; Cloud Firebase
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowColorChangeModal(false);
                  setColorChangeError('');
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer font-black text-base"
              >
                ✕
              </button>
            </div>

            {/* Instruction Guide */}
            <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-200 text-[11px] text-purple-950 space-y-2 leading-relaxed">
              <div className="font-extrabold flex flex-wrap items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5">
                  📋 Thứ tự các cột dữ liệu theo bảng tính Excel (4 cột chuẩn):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setColorChangeText("26DK00166\tDK S2 App - Cà phê\tDK S2 - Cà phê\t03/01/2026\n26DK00167\tDK S2 App - Cà phê\tDK S2 - Cà phê\t03/01/2026\n26DK00665\tDK S88 (EZ2_App) - Trắng đen\tDK S88 (EZ2_App) - Trắng hồng\t13/01/2026\n25DK26866\tDK ROMA SX v2_App - Ghi pha lê\tDK ROMA SX v2_App - Ghi khói\t17/10/2025\n25DK29694\tDK ROMA SX v2_App - Xám khói tuyết\tDK ROMA SX v2_App - Cafe\t08/12/2025");
                  }}
                  className="text-purple-800 hover:text-purple-950 bg-purple-100 hover:bg-purple-200 px-2.5 py-1 rounded-lg font-black text-[10.5px] transition cursor-pointer border border-purple-300 flex items-center gap-1"
                >
                  ⚡ Dán mẫu ví dụ (5 xe từ ảnh)
                </button>
              </div>
              <div className="font-mono bg-white px-3 py-2 rounded-lg border border-purple-200 text-[11px] text-purple-900 font-black overflow-x-auto whitespace-nowrap">
                1. Số Sêri &nbsp;|&nbsp; 2. Model &amp; Màu Cũ (trước đổi) &nbsp;|&nbsp; 3. Model &amp; Màu Mới (sau đổi) &nbsp;|&nbsp; 4. Ngày đổi (dd/mm/yyyy)
              </div>
              <div className="text-slate-600 text-[10.5px] space-y-0.5 bg-white/70 p-2 rounded-lg border border-purple-100">
                <p>• <strong>Trước dấu "-"</strong> là Dòng xe / Phiên bản / Trạng thái xe (Ví dụ: <code>DK S2 App</code> ➔ <code>DK S2</code>).</p>
                <p>• <strong>Sau dấu "-"</strong> là Màu sắc xe (Ví dụ: <code>Trắng đen</code> ➔ <code>Trắng hồng</code>, <code>Ghi pha lê</code> ➔ <code>Ghi khói</code>).</p>
                <p className="text-purple-700 font-bold">✨ Hệ thống tự động so sánh và phân loại: <strong>Đổi màu xe</strong>, <strong>Đổi trạng thái</strong> hoặc <strong>Đổi cả hai</strong>.</p>
              </div>
            </div>

            <form onSubmit={handleImportColorChangeSubmit} className="space-y-3.5 flex-1 flex flex-col min-h-0 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 block text-[11px] mb-1">
                    Ngày thực hiện mặc định (nếu dòng dán thiếu cột ngày):
                  </label>
                  <input
                    type="text"
                    value={colorChangeDefaultDate}
                    onChange={(e) => setColorChangeDefaultDate(e.target.value)}
                    placeholder="dd/mm/yyyy (Ví dụ: 03/01/2026)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-purple-600 font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <div className="text-[11px] text-purple-700 bg-purple-50 p-1.5 px-2.5 rounded-lg border border-purple-200 w-full font-bold">
                    ✨ Đã phân tích: <strong className="text-purple-900 font-mono font-black">{liveParsedColorChanges.filter(p => p.isValid).length}</strong> xe hợp lệ
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-[140px] flex flex-col space-y-1">
                <label className="font-extrabold text-slate-700 block">Dán nội dung từ Excel tại đây:</label>
                <textarea
                  value={colorChangeText}
                  onChange={(e) => setColorChangeText(e.target.value)}
                  placeholder="26DK00166&#9;DK S2 App - Cà phê&#9;DK S2 - Cà phê&#9;03/01/2026&#10;26DK00665&#9;DK S88 (EZ2_App) - Trắng đen&#9;DK S88 (EZ2_App) - Trắng hồng&#9;13/01/2026"
                  className="w-full flex-1 min-h-[120px] bg-slate-50 border p-2.5 font-mono text-[11px] focus:bg-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none overflow-y-auto border-slate-300"
                />
              </div>

              {/* Live Preview Table */}
              {liveParsedColorChanges.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-[11px] text-slate-700 uppercase">
                      Xem trước phân tích ({liveParsedColorChanges.length} dòng):
                    </span>
                  </div>
                  <div className="max-h-[140px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 shadow-inner">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-purple-100/80 text-purple-900 sticky top-0 font-bold text-[10px] uppercase border-b border-purple-200 z-10">
                        <tr>
                          <th className="p-1.5 w-8 text-center">STT</th>
                          <th className="p-1.5">Số Sêri</th>
                          <th className="p-1.5 text-center">Loại đổi</th>
                          <th className="p-1.5">Trạng thái / Model (Cũ ➔ Mới)</th>
                          <th className="p-1.5 text-center">Màu sắc (Cũ ➔ Mới)</th>
                          <th className="p-1.5 text-center">Ngày</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 font-medium">
                        {liveParsedColorChanges.map((item, idx) => {
                          const isStatusShift = Boolean(item.oldModel && item.newModel && item.oldModel.toLowerCase().trim() !== item.newModel.toLowerCase().trim());
                          const isColorShift = Boolean(item.oldColor && item.newColor && item.oldColor.toLowerCase().trim() !== item.newColor.toLowerCase().trim());

                          return (
                            <tr key={idx} className={item.isValid ? "hover:bg-white bg-slate-50/50" : "bg-red-50 text-red-700"}>
                              <td className="p-1.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="p-1.5 font-mono font-bold">{item.serialNo || '<Thiếu>'}</td>
                              <td className="p-1.5 text-center">
                                {isStatusShift && isColorShift ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">
                                    ✨ Đổi cả 2
                                  </span>
                                ) : isStatusShift ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    🔄 Trạng thái
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-pink-50 text-pink-700 border border-pink-200">
                                    🎨 Đổi màu
                                  </span>
                                )}
                              </td>
                              <td className="p-1.5">
                                {isStatusShift ? (
                                  <div className="flex items-center gap-1 text-[10px]">
                                    <span className="line-through text-slate-400 font-medium">{item.oldModel}</span>
                                    <ArrowRight className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                    <span className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded border border-indigo-200">
                                      {item.newModel}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-extrabold text-slate-800 text-[10px]">
                                    {item.model || item.newModel || item.oldModel}
                                  </span>
                                )}
                              </td>
                              <td className="p-1.5 text-center">
                                {isColorShift ? (
                                  <div className="flex items-center justify-center gap-1 text-[10px]">
                                    <span className="px-1 py-0.2 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                                      {item.oldColor}
                                    </span>
                                    <ArrowRight className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                                    <span className="px-1 py-0.2 rounded bg-purple-100 text-purple-800 font-bold border border-purple-300">
                                      {item.newColor}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-700 font-bold border border-slate-200">
                                    {item.newColor || item.oldColor}
                                  </span>
                                )}
                              </td>
                              <td className="p-1.5 text-center font-mono text-[10px] text-slate-500">{item.date}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {colorChangeError && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded-lg border border-red-200 font-bold text-[11px]">
                  ⚠️ {colorChangeError}
                </div>
              )}

              <div className="flex gap-2 justify-end border-t pt-3">
                <button 
                  type="button"
                  onClick={() => {
                    setShowColorChangeModal(false);
                    setColorChangeError('');
                    setColorChangeText('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  disabled={liveParsedColorChanges.filter(p => p.isValid).length === 0}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition shadow shadow-purple-200 cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Xác nhận &amp; Lưu CSDL ({liveParsedColorChanges.filter(p => p.isValid).length} xe)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Evaluation and Treatment for KCS OQC defect */}
      {showEditOqcModal && editingOqcRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 text-xs text-slate-800 space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase flex items-center gap-1.5 border-b pb-2">
              <Pencil className="w-4 h-4 text-indigo-605" /> Đánh giá thông tin & Biện pháp khắc phục xe KCS
            </h3>

            <div className="bg-indigo-50/50 p-3.5 rounded-lg border border-indigo-100 grid grid-cols-2 gap-x-4 gap-y-2 leading-snug">
              <div>
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Số Sêri xe</span>
                <span className="font-mono font-black text-slate-800 text-xs">{editingOqcRecord.serialNo}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Dòng xe (Model)</span>
                <span className="font-extrabold text-slate-800 text-xs">{editingOqcRecord.model}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Lệnh sản xuất (LSX)</span>
                <span className="font-bold text-slate-700">{editingOqcRecord.lsx}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Giờ & Ngày kiểm</span>
                <span className="font-semibold text-slate-600 font-mono">{editingOqcRecord.checkTime} - {editingOqcRecord.date}</span>
              </div>
            </div>

            <form onSubmit={handleSaveOqcEdit} className="space-y-4 font-sans text-xs">
              <div className="space-y-3 p-4 bg-red-50/20 border border-red-100/50 rounded-xl">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Trạng thái KCS</label>
                  <select 
                    value={editOqcStatus}
                    onChange={(e)=>setEditOqcStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded p-2 text-slate-700 font-bold"
                    required
                  >
                    <option value="Lỗi">Lỗi (Defective)</option>
                    <option value="Đạt">Đạt (Passed)</option>
                  </select>
                </div>

                {editOqcStatus === 'Lỗi' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Chi tiết khuyết điểm xe</label>
                        <input 
                          type="text" 
                          value={editOqcDefectDetail}
                          onChange={(e)=>setEditOqcDefectDetail(e.target.value)}
                          placeholder="Ví dụ: Xước sườn..."
                          className="w-full bg-white border border-slate-200 rounded p-2 font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Nguyên nhân khuyết điểm</label>
                        <input 
                          type="text" 
                          value={editOqcRootCause}
                          onChange={(e)=>setEditOqcRootCause(e.target.value)}
                          placeholder="Mô tả nguyên nhân..."
                          className="w-full bg-white border border-slate-200 rounded p-2 font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Đánh giá mức độ khuyết điểm</label>
                      <select 
                        value={editOqcEvaluation}
                        onChange={(e)=>setEditOqcEvaluation(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded p-2 text-slate-700 font-bold"
                        required
                      >
                        <option value="">-- Chọn Đánh giá mức độ --</option>
                        <option value="Lỗi nhẹ (Minor) - Khắc phục nhanh tại vị trí">Lỗi nhẹ (Minor) - Khắc phục nhanh</option>
                        <option value="Lỗi vừa (Major) - Cần tháo ra lắp ráp lại">Lỗi vừa (Major) - Tháo lắp lại</option>
                        <option value="Lỗi nặng (Critical) - Đình chỉ bàn giao, bắt làm lại cả cụm">Lỗi nặng (Critical) - Làm lại cả cụm</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Phương án xử lý kỹ thuật</label>
                      <input 
                        type="text" 
                        value={editOqcTreatment}
                        onChange={(e)=>setEditOqcTreatment(e.target.value)}
                        placeholder="Ví dụ: Thay linh kiện mới, sơn sấy dặm sườn..."
                        className="w-full bg-white border border-slate-200 rounded p-2 font-semibold"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t">
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditOqcModal(false);
                    setEditingOqcRecord(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold rounded-lg transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition shadow shadow-indigo-200 cursor-pointer"
                >
                  Xác nhận lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Ecount ERP Sync & IQC Linker */}
      {showEcountSyncModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full flex flex-col h-[85vh] border border-slate-200 overflow-hidden" id="ecount_sync_modal">
            {/* Header */}
            <div className="bg-[#1e293b] p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                  <Building2 className="w-5 h-5 text-indigo-100" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest font-mono">DKBike QMS Integration Service</span>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1">
                    Cổng Đồng Bộ ERP Ecount.com &rarr; Kiểm Định Chất Lượng IQC
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setShowEcountSyncModal(false)}
                className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full cursor-pointer transition flex items-center justify-center"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Inner Tabs and Sub-header */}
            <div className="bg-slate-50 border-b px-6 py-3 flex flex-wrap gap-4 items-center justify-between shrink-0">
              <div className="flex bg-slate-200 p-1 rounded-lg gap-1 text-xs font-bold text-slate-600">
                <button 
                  onClick={() => setEcountSyncTab('snapshot')}
                  className={`px-4 py-1.5 rounded-md transition cursor-pointer ${ecountSyncTab === 'snapshot' ? 'bg-white text-slate-850 shadow' : 'hover:text-slate-900 hover:bg-white/40'}`}
                >
                  📸 1. Trích xuất ảnh chụp Ecount
                </button>
                <button 
                  onClick={() => setEcountSyncTab('paste')}
                  className={`px-4 py-1.5 rounded-md transition cursor-pointer ${ecountSyncTab === 'paste' ? 'bg-white text-slate-850 shadow' : 'hover:text-slate-900 hover:bg-white/40'}`}
                >
                  📋 2. Dán bảng dữ liệu (Ctrl+V)
                </button>
              </div>

              {ecountSyncTab === 'snapshot' && (
                <div className="relative w-72">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input 
                    type="text" 
                    value={ecountSearchQuery}
                    onChange={e => setEcountSearchQuery(e.target.value)}
                    placeholder="Tìm nhanh nhà cung cấp, nội dung..."
                    className="w-full bg-white border border-slate-200 hover:border-slate-350 focus:border-indigo-500 rounded-lg pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              )}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-slate-50/50">
              {ecountSyncTab === 'snapshot' && (
                <div className="space-y-4">
                  <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></span>
                      Dữ liệu mua hàng từ màn hình Ecount ERP của DKBike
                    </h4>
                    <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                      Hệ thống tự động đồng bộ 16 lô hàng ghi nhận trên Ecount trong ảnh screenshot của bạn. Linh kiện có thể cài đặt số lượng thử nghiệm IQC đầu vào và số lượng hàng lỗi phát hiện trực tiếp tại bảng này để lập tức sinh hồ sơ kiểm định thông minh:
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-slate-200 text-[11px] uppercase tracking-wider font-extrabold">
                          <th className="p-3 text-center w-12">Chọn</th>
                          <th className="p-3 pl-4">Ngày mua</th>
                          <th className="p-3">Mã NCC</th>
                          <th className="p-3">Tên Nhà Cung Cấp</th>
                          <th className="p-3">Nội dung phiếu nhập</th>
                          <th className="p-3 text-right">SL Nhập</th>
                          <th className="p-3 text-emerald-800 bg-emerald-50/50 text-center w-24">SL Kiểm Mẫu</th>
                          <th className="p-3 text-red-800 bg-red-50/50 text-center w-24">SL Lỗi QMS</th>
                          <th className="p-3 text-red-800 bg-red-50/50">Mô tả sự cố của lô hàng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-705">
                        {ecountDataList
                          .filter(item => {
                            if (!ecountSearchQuery) return true;
                            const query = ecountSearchQuery.toLowerCase();
                            return (
                              item.supplierName.toLowerCase().includes(query) ||
                              item.supplierCode.toLowerCase().includes(query) ||
                              item.content.toLowerCase().includes(query)
                            );
                          })
                          .map((row, idx) => {
                            const isMatched = suppliers.some(s => s.id === row.supplierCode);
                            return (
                              <tr key={idx} className={`hover:bg-slate-50 transition-colors ${row.checked ? 'bg-indigo-50/20' : ''}`}>
                                <td className="p-3 text-center">
                                  <input 
                                    type="checkbox"
                                    checked={!!row.checked}
                                    onChange={e => {
                                      const updated = [...ecountDataList];
                                      const indexInFullList = ecountDataList.findIndex(item => item.content === row.content);
                                      if (indexInFullList !== -1) {
                                        updated[indexInFullList].checked = e.target.checked;
                                        setEcountDataList(updated);
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded cursor-pointer focus:ring-0"
                                  />
                                </td>
                                <td className="p-3 pl-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">{row.date}</td>
                                <td className="p-3 font-mono font-bold text-indigo-750 text-[11px]">{row.supplierCode}</td>
                                <td className="p-3">
                                  <div>
                                    <span className="block text-slate-900 font-bold leading-normal">{row.supplierName}</span>
                                    {isMatched ? (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-black border border-emerald-100 mt-1">
                                        <Check className="w-2.5 h-2.5 stroke-[4]" /> Đã kết nối Danh bạ QMS
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] bg-orange-50 text-orange-700 px-1.5 py-0.2 rounded font-black border border-orange-100 mt-1">
                                        ⚠ Tự động Link Mã mới
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-slate-600 text-xs italic leading-tight font-normal">{row.content}</td>
                                <td className="p-3 text-right font-mono font-bold text-slate-900">
                                  {row.quantity.toLocaleString('vi-VN')}
                                </td>
                                <td className="p-3 bg-emerald-50/10 text-center">
                                  <input 
                                    type="number"
                                    value={row.sampleQty ?? 0}
                                    onChange={e => {
                                      const updated = [...ecountDataList];
                                      const indexInFullList = ecountDataList.findIndex(item => item.content === row.content);
                                      if (indexInFullList !== -1) {
                                        updated[indexInFullList].sampleQty = Number(e.target.value);
                                        setEcountDataList(updated);
                                      }
                                    }}
                                    disabled={!row.checked}
                                    className="w-20 bg-white border border-slate-200 hover:border-emerald-300 text-center rounded p-1 font-mono font-bold text-slate-800 focus:outline-emerald-500 disabled:opacity-50 text-xs"
                                  />
                                </td>
                                <td className="p-3 bg-red-50/10 text-center">
                                  <input 
                                    type="number"
                                    value={row.failedQty ?? 0}
                                    onChange={e => {
                                      const updated = [...ecountDataList];
                                      const indexInFullList = ecountDataList.findIndex(item => item.content === row.content);
                                      if (indexInFullList !== -1) {
                                        updated[indexInFullList].failedQty = Number(e.target.value);
                                        if (updated[indexInFullList].failedQty > (updated[indexInFullList].sampleQty || 1)) {
                                          updated[indexInFullList].failedQty = updated[indexInFullList].sampleQty || 1;
                                        }
                                        setEcountDataList(updated);
                                      }
                                    }}
                                    disabled={!row.checked}
                                    className={`w-20 text-center rounded p-1 font-mono font-bold focus:outline-red-500 disabled:opacity-50 text-xs ${Number(row.failedQty) > 0 ? 'bg-red-50 border-red-350 text-red-750 animate-pulse font-extrabold' : 'bg-white border-slate-200 text-slate-850'}`}
                                  />
                                </td>
                                <td className="p-3 bg-red-50/10">
                                  <input 
                                    type="text"
                                    value={row.defectDetail || ''}
                                    onChange={e => {
                                      const updated = [...ecountDataList];
                                      const indexInFullList = ecountDataList.findIndex(item => item.content === row.content);
                                      if (indexInFullList !== -1) {
                                        updated[indexInFullList].defectDetail = e.target.value;
                                        setEcountDataList(updated);
                                      }
                                    }}
                                    disabled={!row.checked || !row.failedQty}
                                    placeholder="Ví dụ: Xước sơn sườn xe, lỗi phanh..."
                                    className="w-full bg-white border border-slate-200 rounded p-1 text-xs focus:outline-none focus:border-red-500 font-normal disabled:opacity-50"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {ecountSyncTab === 'paste' && (
                <div className="space-y-4">
                  <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5 animate-pulse">
                      <Upload className="w-4 h-4 text-indigo-650" />
                      Dán Bản tính Mua hàng Mới copy từ Ecount.com
                    </h4>
                    <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                      Hãy chọn các cột trên trang Ecount của bạn (Danh sách mua), copy rồi paste thẳng vào vùng dán chữ nhật dưới. Cổng tích hợp QMS thông dịch tự động chuỗi dữ liệu TSV/Excel, giúp tiết kiệm thời gian nhập tay cho cả nhóm quản lý chất lượng DKBike!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[42vh]">
                    <div className="flex flex-col space-y-1">
                      <label className="font-extrabold text-slate-700 text-xs">Phần dán dữ liệu thô (Ctrl + V):</label>
                      <textarea
                        value={ecountPasteText}
                        onChange={e => handleEcountPasteChange(e.target.value)}
                        placeholder="Dán các cột dạng: Ngày&#9;Mã NCC&#9;Tên Nhà Cung Cấp&#9;Nội dung&#9;Số lượng&#9;..."
                        className="flex-1 w-full bg-slate-100 hover:bg-slate-50 border focus:bg-white rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none p-4 font-mono text-[11px] border-slate-300 resize-none overflow-y-auto leading-relaxed"
                      />
                    </div>

                    <div className="flex flex-col min-h-0">
                      <label className="font-extrabold text-slate-700 text-xs">Bảng trích duyệt kiểm trong thời gian thực ({ecountPasteRows.length} dòng dữ liệu):</label>
                      <div className="flex-1 bg-white border rounded-xl overflow-y-auto shadow-inner border-slate-200 p-2">
                        {ecountPasteRows.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 italic font-mono space-y-2 py-8">
                            <span>Chưa phát hiện bản dán dữ liệu Ecount từ clipboard...</span>
                            <span className="text-[10px] font-normal leading-relaxed text-center max-w-sm">Hệ thống của chúng tôi sẽ tự lọc để trích xuất sạch các cột từ Ecount để gán kiểm IQC đầu vào.</span>
                          </div>
                        ) : (
                          <table className="w-full text-left text-[11px] border-collapse font-sans font-semibold">
                            <thead>
                              <tr className="bg-slate-100 text-slate-650 border-b uppercase font-bold text-[9px]">
                                <th className="p-1.5">Chọn</th>
                                <th className="p-1.5">Ngày</th>
                                <th className="p-1.5">Mã NCC</th>
                                <th className="p-1.5">Nhà cung cấp</th>
                                <th className="p-1.5">Quy cách hàng</th>
                                <th className="p-1.5 text-right">SL nhập</th>
                                <th className="p-1.5 text-center">SL Mẫu kiểm</th>
                                <th className="p-1.5 text-center">SL lỗi</th>
                                <th className="p-1.5 whitespace-nowrap">Tên mặt hàng (Tóm tắt)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ecountPasteRows.map((row, idx) => (
                                <tr key={idx} className="border-b hover:bg-slate-50 text-slate-700">
                                  <td className="p-1.5 text-center">
                                    <input 
                                      type="checkbox"
                                      checked={!!row.checked}
                                      onChange={e => {
                                        const updated = [...ecountPasteRows];
                                        updated[idx].checked = e.target.checked;
                                        setEcountPasteRows(updated);
                                      }}
                                      className="w-3.5 h-3.5 focus:ring-0"
                                    />
                                  </td>
                                  <td className="p-1.5 font-mono text-[10px]">{row.date}</td>
                                  <td className="p-1.5 font-mono font-bold text-slate-800">{row.supplierCode}</td>
                                  <td className="p-1.5 truncate max-w-[100px] text-slate-900" title={row.supplierName}>{row.supplierName}</td>
                                  <td className="p-1.5 truncate max-w-[120px] text-slate-505 italic" title={row.content}>{row.content}</td>
                                  <td className="p-1.5 text-right font-mono font-bold text-slate-950">{row.quantity}</td>
                                  <td className="p-1.5 text-center">
                                    <input 
                                      type="number"
                                      disabled={!row.checked}
                                      value={row.sampleQty ?? 1}
                                      onChange={e => {
                                        const updated = [...ecountPasteRows];
                                        updated[idx].sampleQty = Number(e.target.value);
                                        setEcountPasteRows(updated);
                                      }}
                                      className="w-12 bg-slate-50 border text-center font-mono rounded text-xs disabled:opacity-50"
                                    />
                                  </td>
                                  <td className="p-1.5 text-center">
                                    <input 
                                      type="number"
                                      disabled={!row.checked}
                                      value={row.failedQty ?? 0}
                                      onChange={e => {
                                        const updated = [...ecountPasteRows];
                                        updated[idx].failedQty = Number(e.target.value);
                                        setEcountPasteRows(updated);
                                      }}
                                      className={`w-12 border text-center font-mono rounded text-xs disabled:opacity-50 ${Number(row.failedQty) > 0 ? 'bg-red-50 text-red-600 font-extrabold border-red-300' : 'bg-slate-50 border-slate-200'}`}
                                    />
                                  </td>
                                  <td className="p-1.5">
                                    <input 
                                      type="text"
                                      disabled={!row.checked}
                                      value={row.itemSummary || ''}
                                      onChange={e => {
                                        const updated = [...ecountPasteRows];
                                        updated[idx].itemSummary = e.target.value;
                                        setEcountPasteRows(updated);
                                      }}
                                      className="w-full bg-slate-50 border px-1.5 py-0.5 rounded text-[11px] border-slate-200 disabled:opacity-50 font-medium text-slate-800"
                                      placeholder="Mặt hàng..."
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}


            </div>

            {/* Footer buttons */}
            <div className="bg-slate-100 p-4 border-t flex justify-between items-center shrink-0">
              <button 
                type="button" 
                onClick={() => {
                  if (window.confirm("Bác có chắc chắn muốn khôi phục về trạng thái ban đầu không?")) {
                    setEcountDataList(ECOUNT_PRELOADED_DATA.map(item => ({ ...item })));
                  }
                }}
                className="text-xs bg-white hover:bg-slate-200 font-bold border rounded-lg px-4 py-2 text-slate-700 cursor-pointer"
              >
                🔄 Khử thay đổi & khôi phục mẫu ERP
              </button>

              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowEcountSyncModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold rounded-lg text-xs cursor-pointer"
                >
                  Đóng lại
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (ecountSyncTab === 'snapshot') {
                      handleSyncEcountToIqc(ecountDataList);
                    } else {
                      handleSyncEcountToIqc(ecountPasteRows);
                    }
                  }}
                  className="px-6 py-2 bg-[#0213b0] hover:bg-blue-800 text-white font-extrabold rounded-lg text-xs shadow-md shadow-blue-150 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckSquare className="w-4 h-4" /> 
                  Xác nhận & Đồng bộ vào IQC ({ecountSyncTab === 'snapshot' ? ecountDataList.filter(r => r.checked).length : ecountPasteRows.filter(r => r.checked).length} dòng tuyển)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Excel/TSV Bulk IQC Importer */}
      {showImportIqcModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 flex flex-col max-h-[90vh]" id="iqc_import_modal">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase flex items-center gap-1.5 border-b pb-2 mb-4">
              <Upload className="w-4 h-4 text-emerald-600 animate-bounce" /> Nhập Danh Sách IQC Định Dạng Excel (Bulk Copy-Paste)
            </h3>

            <div className="text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border leading-relaxed space-y-1">
              <p className="font-bold text-slate-705">Hướng dẫn nhanh cách dán dữ liệu IQC:</p>
              <p>1. Thiết lập các cột trên file Excel theo đúng thứ tự sau:</p>
              <div className="bg-white p-1.5 px-2.5 rounded border font-mono text-[10px] text-emerald-850 font-bold overflow-x-auto">
                Ngày | Tên nhà cung cấp | Quy cách hàng hóa | Tổng SL nhập | Số lượng kiểm mẫu | Số lượng lỗi | Người kiểm | Chi tiết sự cố lỗi | Mô tả tóm tắt
              </div>
              <p>2. Chọn các dòng dữ liệu trong Excel (không gồm tiêu đề hoặc gồm tiêu đề đều được) &rarr; Nhấn <kbd className="bg-slate-250 px-1 py-0.5 rounded text-slate-700 font-mono text-[11px]">Ctrl + C</kbd> để copy.</p>
              <p>3. Click vào ô văn bản phía dưới &rarr; Nhấn <kbd className="bg-slate-250 px-1 py-0.5 rounded text-slate-700 font-mono text-[11px]">Ctrl + V</kbd> để dán &rarr; Click <span className="font-bold text-emerald-750">"Bắt đầu Import"</span>.</p>
            </div>

            <form onSubmit={handleImportIqcSubmit} className="space-y-4 flex-1 flex flex-col min-h-0 text-xs text-slate-800">
              <div className="flex-1 min-h-0 flex flex-col space-y-1">
                <label className="font-extrabold text-slate-700 block">Dán nội dung bảng tính Excel tại đây:</label>
                <textarea
                  value={iqcImportText}
                  onChange={(e) => setIqcImportText(e.target.value)}
                  placeholder="24/04/2026&#9;Công ty Cao Su KENDA Việt Nam&#9;PNK 0173 KENDA_300.9090&#9;1000&#9;100&#9;2&#9;Đoàn Anh Hùng&#9;Nứt gờ lốp nhẹ&#9;Lốp sau xe máy điện"
                  className="w-full flex-1 bg-slate-50 border p-2.5 font-mono text-[11px] focus:bg-white rounded-lg focus:ring-1 focus:ring-emerald-505 focus:outline-none resize-none overflow-y-auto border-slate-300"
                />
              </div>

              {iqcImportError && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded border border-red-150 font-bold text-[11px]">
                  ⚠️ {iqcImportError}
                </div>
              )}

              <div className="flex gap-2 justify-end border-t pt-3.5">
                <button 
                  type="button"
                  onClick={() => {
                    setShowImportIqcModal(false);
                    setIqcImportError('');
                    setIqcImportText('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition shadow shadow-emerald-200"
                >
                  Bắt đầu Import ({iqcImportText.split('\n').filter(Boolean).length} dòng dán)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit IQC Record */}
      {showEditIqcModal && editingIqcRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 flex flex-col max-h-[90vh]" id="iqc_edit_modal">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase flex items-center gap-1.5 border-b pb-2 mb-4">
              <Pencil className="w-4 h-4 text-emerald-600" /> Sửa phiếu kiểm nhập IQC ({editingIqcRecord.id})
            </h3>

            <form onSubmit={handleSaveEditIqc} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs text-slate-800">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Chọn Nhà cung cấp liên kết</label>
                <select 
                  value={editingIqcRecord.supplierId || ''} 
                  onChange={e => {
                    const selectedSup = suppliers.find(s => s.id === e.target.value);
                    if (selectedSup) {
                      setEditingIqcRecord({
                        ...editingIqcRecord, 
                        supplierId: selectedSup.id, 
                        supplierName: selectedSup.name
                      });
                    }
                  }} 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-bold" 
                  required 
                >
                  <option value="">-- Chọn Nhà Cung Cấp --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Quy cách linh kiện / hàng hóa</label>
                <input 
                  type="text" 
                  value={editingIqcRecord.content || ''} 
                  onChange={e => setEditingIqcRecord({...editingIqcRecord, content: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800" 
                  required 
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Mô tả tóm tắt</label>
                <input 
                  type="text" 
                  value={editingIqcRecord.itemSummary || ''} 
                  onChange={e => setEditingIqcRecord({...editingIqcRecord, itemSummary: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800" 
                />
              </div>

              {/* AQL Info in Edit Modal */}
              {(() => {
                const currentAql = calculateAQLSample(editingIqcRecord.totalQty || 0, editingIqcRecord.failedQty || 0, 1.5, 'II');
                return (
                  <div className="bg-indigo-50/80 border border-indigo-200 rounded-lg p-2.5 text-xs">
                    <div className="flex justify-between items-center font-bold text-indigo-900 mb-1">
                      <span className="flex items-center gap-1 text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-650" />
                        AQL ISO 2859-1 (Mã {currentAql.codeLetter})
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingIqcRecord({ ...editingIqcRecord, checkedQty: currentAql.sampleSize })}
                        className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2 py-0.5 rounded cursor-pointer"
                      >
                        ⚡ Áp dụng mẫu AQL ({currentAql.sampleSize})
                      </button>
                    </div>
                    <p className="text-[10.5px] text-slate-600">
                      Lô {(editingIqcRecord.totalQty || 0).toLocaleString('vi-VN')} sp ➔ Mẫu chuẩn: <b>{currentAql.sampleSize} sp</b>. Ngưỡng: <b>Ac ≤ {currentAql.ac}</b> (Chấp nhận), <b>Re ≥ {currentAql.re}</b> (Bác bỏ).
                    </p>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Tổng SL nhập</label>
                  <input 
                    type="number" 
                    value={editingIqcRecord.totalQty ?? 0} 
                    onChange={e => {
                      const totalVal = Number(e.target.value);
                      const aqlVal = calculateAQLSample(totalVal, editingIqcRecord.failedQty || 0, 1.5, 'II').sampleSize;
                      setEditingIqcRecord({
                        ...editingIqcRecord, 
                        totalQty: totalVal,
                        checkedQty: aqlVal
                      });
                    }} 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-mono font-bold" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Mẫu kiểm (AQL)</label>
                  <input 
                    type="number" 
                    value={editingIqcRecord.checkedQty ?? 0} 
                    onChange={e => setEditingIqcRecord({...editingIqcRecord, checkedQty: Number(e.target.value)})} 
                    className="w-full bg-indigo-50/60 border border-indigo-200 rounded p-2 text-indigo-900 font-mono font-bold" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Số lỗi phát hiện</label>
                  <input 
                    type="number" 
                    value={editingIqcRecord.failedQty ?? 0} 
                    onChange={e => setEditingIqcRecord({...editingIqcRecord, failedQty: Number(e.target.value)})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-mono font-bold text-red-600" 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Chi tiết sự cố lỗi (nếu có)</label>
                <input 
                  type="text" 
                  value={editingIqcRecord.defectDetail || ''} 
                  onChange={e => setEditingIqcRecord({...editingIqcRecord, defectDetail: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800" 
                  placeholder="Ví dụ: Xước sơn bóng nhẹ, dính tạp chất..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Người kiểm</label>
                  <input 
                    type="text" 
                    value={editingIqcRecord.checkedBy || ''} 
                    onChange={e => setEditingIqcRecord({...editingIqcRecord, checkedBy: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Ngày kiểm</label>
                  <input 
                    type="text" 
                    value={editingIqcRecord.date || ''} 
                    onChange={e => setEditingIqcRecord({...editingIqcRecord, date: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800" 
                    required 
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t pt-3 mt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditIqcModal(false);
                    setEditingIqcRecord(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-250 text-slate-750 font-bold rounded"
                >
                  Đóng
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded transition shadow shadow-emerald-200"
                >
                  Cập nhật phiếu IQC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SUPPLIER PRODUCTION AUDIT REQUEST */}
      {showAddSupplierAuditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase text-orange-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-orange-600 animate-pulse" /> KÍCH HOẠT CHỈ THỊ GIÁM SÁT SẢN XUẤT (ACTIVE AUDIT)
              </h3>
              <button 
                onClick={() => setShowAddSupplierAuditModal(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSupplierAuditRequest} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                  🔗 Tự động nạp từ Nhật trình Công việc ngày (Nếu có)
                </label>
                <select
                  value={newAuditLinkedDailyLogStt || ''}
                  onChange={e => {
                    const sttVal = e.target.value;
                    if (sttVal) {
                      handleSelectLinkedDailyLogForAudit(Number(sttVal));
                    } else {
                      setNewAuditLinkedDailyLogStt(undefined);
                    }
                  }}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-indigo-50/50 font-bold text-indigo-900 focus:ring-1 focus:ring-indigo-500 outline-hidden"
                >
                  <option value="">-- Chọn công việc nhật trình để tự động điền nhanh dữ liệu --</option>
                  {dailyLogs.map(log => (
                    <option key={log.stt} value={log.stt}>
                      [{log.date}] [{log.category}] {log.content.substring(0, 75)}...
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-indigo-600 font-bold italic mt-1">
                  * Chọn công việc ngày giúp tự động liên kết trạng thái và điền nhanh thông số thiết kế.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Nhà Cung Cấp Phụ Trách</label>
                <select 
                  value={newAuditSupplierName}
                  onChange={e => setNewAuditSupplierName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-slate-50 font-bold text-slate-700"
                >
                  {suppliers.map(s => {
                    const sName = s.name || s.SupplierName || '';
                    return (
                      <option key={s.id || s.SupplierID} value={sName}>
                        {sName} {s.id ? `(${s.id})` : ''}
                      </option>
                    );
                  })}
                  {suppliers.length === 0 && (
                    <>
                      <option value="Công ty Việt Nhật Precision">Công ty Việt Nhật Precision (Nhựa, Khuôn phôi)</option>
                      <option value="Công ty Cao Su KENDA Việt Nam">Công ty Cao Su KENDA Việt Nam (Săm lốp)</option>
                      <option value="Công ty Ắc quy Tia Sáng">Công ty Ắc quy Tia Sáng (Ắc quy điện)</option>
                      <option value="Đầu mối linh kiện chấn dập HT">Đầu mối linh kiện chấn dập HT (Khung, càng sắt)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Tên linh kiện gia công / sản xuất</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Càng xe điện sau Xmen, Lốp 3.00-10 Gold, Trục càng đúc..."
                  value={newAuditComponentName} 
                  onChange={e => setNewAuditComponentName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Chỉ tiêu dung sai/thông số kỹ thuật tối thiểu cần xác nhận</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Đo độ dày lớp sơn ngoài (yêu cầu &gt;= 1.2mm), Góc vát phôi dập..."
                  value={newAuditSpec} 
                  onChange={e => setNewAuditSpec(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Yêu cầu đính kèm</label>
                  <select 
                    value={newAuditReqType}
                    onChange={e => setNewAuditReqType(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-lg p-2 bg-slate-50 font-bold text-slate-700"
                  >
                    <option value="both">Ảnh gia công &amp; Chỉ số đo đạc</option>
                    <option value="image_only">Chỉ chụp ảnh cận cảnh</option>
                    <option value="spec_only">Chỉ ghi nhận thông số</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Người đại diện kiểm tra</label>
                  <input 
                    type="text" 
                    value="Mr. Thao QMS"
                    className="w-full border border-slate-200 rounded-lg p-2 bg-slate-100 font-semibold text-slate-500"
                    disabled
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Hướng dẫn hoặc lưu ý quy trình của DKBike</label>
                <textarea 
                  rows={2}
                  placeholder="Vui lòng kiểm tra dưỡng đo trước khi tiến hành dập khối lượng lớn tránh sai hỏng toàn lô hàng."
                  value={newAuditNote} 
                  onChange={e => setNewAuditNote(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 font-medium text-slate-600"
                />
              </div>

              <div className="flex gap-2 justify-end border-t pt-3 mt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddSupplierAuditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
                >
                  Đóng
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded transition shadow shadow-orange-200"
                >
                  Kích hoạt chỉ thị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUPPLIER RESPONSE DATA RECORD */}
      {supplierResponseAudit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase text-teal-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-teal-600" /> CẬP NHẬT KẾT QUẢ ĐO LƯỜNG TỪ NHÀ CUNG CẤP
              </h3>
              <button 
                onClick={() => setSupplierResponseAudit(null)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg text-[11px] leading-relaxed border border-blue-100">
              <p>📍 <strong className="font-bold text-slate-800">Yêu cầu từ DKBike:</strong> Kiểm tra chỉ tiêu <span className="font-extrabold text-slate-900 underline">"{supplierResponseAudit.targetSpecification}"</span> của linh kiện <strong className="text-slate-900">{supplierResponseAudit.componentName}</strong> trước khi bắt đầu sản xuất loạt.</p>
            </div>

            <form onSubmit={handleSupplierSubmitResponseSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Kết quả đo lường thực tế (Dung sai/Kích thước)</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Đo thực tế đạt 1.25mm (+-0.02), Góc vát khuôn 45.2 độ đạt chuẩn..."
                  value={responseValueStr} 
                  onChange={e => setResponseValueStr(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 font-mono font-bold text-blue-700"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Đính kèm ảnh chụp hiện trường sản xuất/dưỡng kiểm</label>
                <select 
                  value={responseImageUrl}
                  onChange={e => setResponseImageUrl(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-slate-50 font-bold text-slate-700"
                >
                  <option value="">-- Click chọn ảnh đo đạc thực tế tại xưởng --</option>
                  <option value="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&amp;q=80">Mẫu Linh kiện Kim loại dập sắc nét (Đạt chuẩn)</option>
                  <option value="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=500&amp;q=80">Gia công sườn càng sắt bám chắc (Đạt chuẩn)</option>
                  <option value="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&amp;q=80">Quy trình cán săm lốp cao su nóng (Đạt chuẩn)</option>
                  <option value="https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=500&amp;q=80">Khung vỏ sườn có vết đốm sơn rỗ (Sai lệch dung sai)</option>
                </select>
                <p className="text-[9px] text-slate-400 mt-1">Trong thực tế ngoài hiện xưởng, NCC sẽ quét QR code chỉ thị và chụp ảnh trực tiếp từ camera điện thoại để đồng bộ.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Phản hồi hoặc đề xuất từ kỹ sư Nhà cung cấp</label>
                <textarea 
                  rows={2}
                  placeholder="Khuôn ráp hoàn thiện, kết quả đo dưỡng đạt dung sai vàng. Đề xuất DKBike duyệt cho chạy sản xuất hàng loạt."
                  value={responseSupplierNote} 
                  onChange={e => setResponseSupplierNote(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="flex gap-2 justify-end border-t pt-3 mt-4">
                <button 
                  type="button"
                  onClick={() => setSupplierResponseAudit(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 font-bold rounded"
                >
                  Huỷ bỏ
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition shadow shadow-blue-200"
                >
                  Gửi dữ liệu xác thực ảnh &amp; thông số
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DKBIKE REVIEW & EVALUATION */}
      {evaluateAudit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase text-indigo-700 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" /> ĐÁNH GIÁ &amp; PHÊ DUYỆT CHUYÊN MÔN BAN QMS DKBIKE
              </h3>
              <button 
                onClick={() => setEvaluateAudit(null)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 p-3 rounded-lg border text-[11px]">
              <p>📁 <strong className="font-bold">Chỉ thị:</strong> {evaluateAudit.id} - {evaluateAudit.componentName}</p>
              <p>🏢 <strong className="font-bold">Nhà cung cấp:</strong> {evaluateAudit.supplierName}</p>
              <p>📊 <strong className="font-bold">Kết quả đo từ NCC:</strong> <strong className="text-rose-600 underline font-mono">{evaluateAudit.actualValueStr || 'N/A'}</strong></p>
            </div>

            <form onSubmit={handleDkAuditEvaluationSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Quyết định phê duyệt chất lượng</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <label className={`flex items-center justify-center gap-2 border p-3 rounded-xl cursor-pointer font-bold ${evalStatus === 'approved' ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800' : 'border-slate-200 bg-slate-50/20'}`}>
                    <input 
                      type="radio" 
                      name="eval_status" 
                      value="approved"
                      checked={evalStatus === 'approved'} 
                      onChange={() => setEvalStatus('approved')}
                      className="accent-emerald-600"
                    />
                    <span>Approved (Đạt chất lượng)</span>
                  </label>
                  <label className={`flex items-center justify-center gap-2 border p-3 rounded-xl cursor-pointer font-bold ${evalStatus === 'rejected' ? 'border-red-500 bg-red-50/50 text-red-800' : 'border-slate-200 bg-slate-50/20'}`}>
                    <input 
                      type="radio" 
                      name="eval_status" 
                      value="rejected"
                      checked={evalStatus === 'rejected'} 
                      onChange={() => setEvalStatus('rejected')}
                      className="accent-red-600"
                    />
                    <span>Rejected (Sai lệch - Đình chỉ)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Nhận định &amp; Chỉ thị kỹ thuật của Mr. Thao (QMS)</label>
                <textarea 
                  rows={3}
                  value={evalDkNote} 
                  onChange={e => setEvalDkNote(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-700 font-semibold leading-relaxed"
                  placeholder="Nhập nhận định kỹ thuật để gửi trả kết quả sang hệ thống nhà cung cấp..."
                  required
                />
              </div>

              <div className="flex gap-2 justify-end border-t pt-3 mt-4">
                <button 
                  type="button"
                  onClick={() => setEvaluateAudit(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-755 font-bold rounded"
                >
                  Huỷ bỏ
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded shadow transition"
                >
                  Ký số duyệt chất lượng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SUPPLIER PRODUCTION AUDIT */}
      {editingSupplierAudit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg max-w-lg w-full p-6 space-y-4 text-xs font-sans">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase text-indigo-700 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-650 animate-pulse" /> CHỈNH SỬA CHỈ THỊ GIÁM SÁT NCC: {editingSupplierAudit.id}
              </h3>
              <button 
                onClick={() => setEditingSupplierAudit(null)}
                className="text-slate-450 hover:text-slate-650 font-extrabold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSupplierAudit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Nhà Cung Cấp</label>
                <select 
                  value={editAuditSupplierName}
                  onChange={e => setEditAuditSupplierName(e.target.value)}
                  className="w-full border border-slate-250 rounded-lg p-2 bg-slate-50 font-bold text-slate-700"
                >
                  {suppliers.map(s => {
                    const sName = s.name || s.SupplierName || '';
                    return (
                      <option key={s.id || s.SupplierID} value={sName}>
                        {sName} {s.id ? `(${s.id})` : ''}
                      </option>
                    );
                  })}
                  {suppliers.length === 0 && (
                    <>
                      <option value="Công ty Việt Nhật Precision">Công ty Việt Nhật Precision (Nhựa, Khuôn phôi)</option>
                      <option value="Công ty Cao Su KENDA Việt Nam">Công ty Cao Su KENDA Việt Nam (Săm lốp)</option>
                      <option value="Công ty Ắc quy Tia Sáng">Công ty Ắc quy Tia Sáng (Ắc quy điện)</option>
                      <option value="Đầu mối linh kiện chấn dập HT">Đầu mối linh kiện chấn dập HT (Khung, càng sắt)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-550 mb-1 uppercase tracking-wide">Tên linh kiện dập/sản xuất</label>
                <input 
                  type="text" 
                  value={editAuditComponentName}
                  onChange={e => setEditAuditComponentName(e.target.value)}
                  className="w-full border border-slate-250 rounded-lg p-2 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-550 mb-1 uppercase tracking-wide">Chỉ tiêu bắt buộc giám sát</label>
                <input 
                  type="text" 
                  value={editAuditSpec}
                  onChange={e => setEditAuditSpec(e.target.value)}
                  className="w-full border border-slate-250 rounded-lg p-2 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Yêu cầu đính kèm</label>
                  <select 
                    value={editAuditReqType}
                    onChange={e => setEditAuditReqType(e.target.value as any)}
                    className="w-full border border-slate-250 rounded-lg p-2 bg-slate-50 font-bold text-slate-700"
                  >
                    <option value="both">Ảnh gia công &amp; Số đo</option>
                    <option value="image_only">Chỉ chụp ảnh</option>
                    <option value="spec_only">Chỉ ghi thông số</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Trạng thái chỉ thị</label>
                  <select 
                    value={editAuditStatus}
                    onChange={e => setEditAuditStatus(e.target.value as any)}
                    className="w-full border border-slate-250 rounded-lg p-2 bg-slate-50 font-bold text-slate-700"
                  >
                    <option value="pending">⏳ Chờ NCC gửi ảnh</option>
                    <option value="updated">⚡ NCC phản hồi (Chờ duyệt)</option>
                    <option value="approved">✓ Đạt - Cho sản xuất hàng loạt</option>
                    <option value="rejected">⚠ Sai lệch - Cảnh báo lỗi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Kết quả đo lường thực tế từ NCC</label>
                <input 
                  type="text" 
                  value={editAuditActualValue}
                  onChange={e => setEditAuditActualValue(e.target.value)}
                  className="w-full border border-slate-250 rounded-lg p-2 font-mono font-bold text-indigo-750"
                  placeholder="Ví dụ: Đo thực tế đạt 1.25mm"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Ảnh minh chứng xác thực hiện trường (Chấp nhận drag-drop / click upload)
                </label>
                
                {editAuditImageUrl ? (
                  <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                      <img 
                        src={editAuditImageUrl} 
                        alt="Ảnh xác thực" 
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-xs shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="overflow-hidden">
                        <span className="block text-[10px] font-bold text-emerald-700 uppercase">✓ Đã đính ảnh xác thực</span>
                        <span className="block text-[8px] text-slate-400 font-mono truncate max-w-[200px]">
                          {editAuditImageUrl.startsWith("data:") ? "Bản vẽ/Ảnh từ máy tính" : editAuditImageUrl}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditAuditImageUrl('')}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-lg transition-colors cursor-pointer text-[10px]"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setEditAuditDragOver(true);
                      }}
                      onDragLeave={() => setEditAuditDragOver(false)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setEditAuditDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          try {
                            const compressed = await compressImageFile(file, 500, 500, 0.4);
                            if (compressed) {
                              setEditAuditImageUrl(compressed);
                            }
                          } catch (err) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditAuditImageUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }
                      }}
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 transition-all ${
                        editAuditDragOver 
                          ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' 
                          : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                      }`}
                    >
                      <Upload className="w-5 h-5 text-slate-400 mb-1.5 animate-bounce" />
                      <span className="text-[10px] font-bold text-slate-600 block text-center">
                        Kéo thả ảnh xác thực hoặc click để duyệt chọn
                      </span>
                      <span className="text-[9px] text-slate-400 mt-1 block">
                        PNG, JPG, HEIC tối đa 3MB
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-x-0 inset-y-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const compressed = await compressImageFile(file, 500, 500, 0.4);
                              if (compressed) {
                                setEditAuditImageUrl(compressed);
                              }
                            } catch (err) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditAuditImageUrl(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Collapsible/Toggle manual selection and URL input for advanced convenience */}
                <details className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-150 rounded-lg p-2">
                  <summary className="cursor-pointer select-none text-slate-600 hover:text-slate-800 transition-colors uppercase font-black tracking-wide flex items-center gap-1.5">
                    ⚙ Nhập URL thủ công hoặc chọn ảnh mẫu
                  </summary>
                  <div className="mt-2 space-y-2 pt-2 border-t border-slate-200">
                    <div>
                      <span className="block text-[9px] text-slate-400 mb-1">Chọn nhanh ảnh mẫu thư viện:</span>
                      <select 
                        value={editAuditImageUrl.startsWith("data:") ? "" : editAuditImageUrl}
                        onChange={e => setEditAuditImageUrl(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-1.5 bg-white text-slate-600 font-medium"
                      >
                        <option value="">-- Click chọn ảnh đo đạc thực tế --</option>
                        <option value="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&amp;q=80">Mẫu Linh kiện Kim loại dập (Đạt chuẩn)</option>
                        <option value="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=500&amp;q=85">Gia công sườn càng sắt (Đạt chuẩn)</option>
                        <option value="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&amp;q=85">Quy trình cán săm lốp (Đạt chuẩn)</option>
                        <option value="https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=500&amp;q=85">Khung vỏ sườn bám sạm (Sai lệch)</option>
                      </select>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 mb-1">Hoặc dán link URL ảnh bất kỳ:</span>
                      <input 
                        type="text" 
                        value={editAuditImageUrl}
                        onChange={e => setEditAuditImageUrl(e.target.value)}
                        className="w-full border border-slate-150 rounded-lg p-1.5 font-mono text-[9px] font-normal"
                        placeholder="http://..."
                      />
                    </div>
                  </div>
                </details>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Lời nhắn / Ghi chú của NCC Phụ Trợ</label>
                <input 
                  type="text" 
                  value={editAuditNote}
                  onChange={e => setEditAuditNote(e.target.value)}
                  className="w-full border border-slate-250 rounded-lg p-2"
                  placeholder="NCC phản hồi..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Nhận định &amp; Chỉ thị của Mr. Thao (QMS DKBike)</label>
                <textarea 
                  rows={2}
                  value={editAuditDkNote}
                  onChange={e => setEditAuditDkNote(e.target.value)}
                  className="w-full border border-slate-250 rounded-lg p-2 font-semibold"
                  placeholder="Đặc tính kỹ thuật đạt chuẩn..."
                />
              </div>

              <div className="flex gap-2 justify-end border-t pt-3 mt-4">
                <button 
                  type="button"
                  onClick={() => setEditingSupplierAudit(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 font-bold rounded"
                >
                  Đóng
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded transition shadow"
                >
                  Lưu thay đổi [Cập nhật]
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL OF SUPPLIER PRODUCTION AUDIT */}
      {selectedSupplierAuditForDetail && (() => {
        const aud = selectedSupplierAuditForDetail;
        let badgeClass = "bg-slate-100 text-slate-500";
        let badgeLabel = "Chờ phản hồi";

        if (aud.status === 'pending') {
          badgeClass = "bg-amber-100 text-amber-800 border-amber-200 border";
          badgeLabel = "Chờ NCC gửi ảnh & thông số";
        } else if (aud.status === 'updated') {
          badgeClass = "bg-blue-100 text-blue-800 border-blue-200 border";
          badgeLabel = "Đã gửi dữ liệu - Chờ duyệt";
        } else if (aud.status === 'approved') {
          badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200 border";
          badgeLabel = "✓ Đạt - Đã duyệt sản xuất";
        } else if (aud.status === 'rejected') {
          badgeClass = "bg-red-100 text-red-800 border-red-200 border";
          badgeLabel = "⚠ Sai lệch - Cảnh báo sửa khuôn";
        }

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 text-xs font-sans relative">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5">
                  <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-md">
                    <CheckSquare className="w-4 h-4" />
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase">
                    Chi Tiết Chỉ Thị Giám Sát NCC: <span className="text-indigo-650 font-mono">{aud.id}</span>
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedSupplierAuditForDetail(null)}
                  className="text-slate-400 hover:text-slate-600 font-extrabold text-base cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* General Info */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Linh kiện cần dập mẫu:</span>
                    <span className="text-xs font-black text-slate-880 block mt-0.5">{aud.componentName}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nhà cung cấp đối tác:</span>
                    <span className="text-xs font-extrabold text-indigo-700 block mt-0.5">{aud.supplierName}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ngày tạo chỉ thị:</span>
                    <span className="text-xs font-bold text-slate-600 block mt-0.5 font-mono">{aud.requestDate}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Người ban hành:</span>
                    <span className="text-xs font-bold text-slate-600 block mt-0.5">{aud.checkedBy || 'Mr. Thao'}</span>
                  </div>
                  {aud.dailyLogStt && (
                    <div className="col-span-2 border-t border-slate-100 pt-2 mt-1">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Liên kết nhật trình chất lượng:</span>
                      <span className="text-xs font-semibold text-slate-750 block mt-0.5 bg-indigo-50/50 px-2 py-1 rounded inline-block">
                        🔗 Nhật trình #{aud.dailyLogStt} - {aud.dailyLogTitle}
                      </span>
                    </div>
                  )}
                </div>

                {/* Requirements & Target Specs */}
                <div className="p-3.5 bg-indigo-50/35 border border-indigo-100/50 rounded-xl space-y-2.5">
                  <div>
                    <span className="font-extrabold text-indigo-950 text-[10px] uppercase block tracking-wider">Yêu cầu kiểm soát &amp; kỹ thuật:</span>
                    <p className="font-extrabold text-slate-800 text-xs mt-1 leading-relaxed">{aud.targetSpecification}</p>
                  </div>
                  <div className="flex justify-between items-center text-[10px] border-t border-slate-150/70 pt-2">
                    <span className="text-slate-500">Hình thức NCC phản hồi:</span>
                    <span className="font-bold text-indigo-750">
                      {aud.requirementType === 'both' ? 'Ảnh gia công &amp; Số đo' : aud.requirementType === 'image_only' ? 'Chỉ chụp ảnh' : 'Chỉ ghi số đo'}
                    </span>
                  </div>
                </div>

                {/* Status and NCC response */}
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Trạng thái hiện tại:</span>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md ${badgeClass}`}>
                      {badgeLabel}
                    </span>
                  </div>

                  {/* Show results if NCC responded */}
                  {(aud.status === 'updated' || aud.status === 'approved' || aud.status === 'rejected') && (
                    <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-150/50">
                      <div>
                        <span className="font-bold text-slate-450 block uppercase text-[8px] tracking-wider">Kết quả NCC báo cáo đo lường:</span>
                        <p className="font-mono font-black text-rose-600 text-xs mt-0.5">{aud.actualValueStr || 'Chưa nhận số đo'}</p>
                      </div>

                      {aud.supplierNote && (
                        <div>
                          <span className="font-bold text-slate-450 block uppercase text-[8px] tracking-wider">Ý kiến / Lời nhắn từ xưởng NCC:</span>
                          <p className="text-[10px] text-slate-600 italic mt-0.5 bg-white p-2 rounded border border-slate-100">
                            "{aud.supplierNote}"
                          </p>
                        </div>
                      )}

                      {/* Image attachments block - with compression and neat collapse */}
                      <div className="space-y-1.5">
                        {aud.imageUrl ? (
                          <>
                            <span className="font-bold text-slate-450 block uppercase text-[8px] tracking-wider">Ảnh chụp cận cảnh hiện trường mẫu dập:</span>
                            <div 
                              onClick={() => setLocalZoomImage(aud.imageUrl)}
                              className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-white cursor-zoom-in hover:border-indigo-400 transition"
                            >
                              <img 
                                src={aud.imageUrl} 
                                alt="Ảnh mẫu xưởng NCC" 
                                className="w-full h-full object-cover group-hover:scale-102 duration-200 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                <span className="text-white text-[10px] font-semibold flex items-center gap-1 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded">
                                  <Camera className="w-3.5 h-3.5 text-orange-400 animate-pulse" /> Xem ảnh lớn
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          /* COMPACT collapse if Approved & no image */
                          aud.status !== 'approved' && (
                            <>
                              <span className="font-bold text-slate-450 block uppercase text-[8px] tracking-wider">Ảnh chụp hiện trường:</span>
                              <p className="text-[10px] text-slate-400 italic font-medium">Nhà cung cấp chưa đính kèm ảnh.</p>
                            </>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* DK QMS feedback notes */}
                  {aud.dkNote && (
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1">
                      <span className="font-extrabold text-indigo-700 block text-[8px] uppercase tracking-wider">Mr. Thao QMS đánh giá duyệt:</span>
                      <p className="text-slate-800 font-bold italic leading-relaxed text-[11px]">"{aud.dkNote}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action operations directly in detail view */}
              <div className="border-t border-slate-150 pt-3 flex flex-col gap-2.5">
                {aud.status === 'pending' && (
                  <div className="space-y-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setSupplierResponseAudit(aud);
                        setResponseValueStr('');
                        setResponseSupplierNote('');
                      }}
                      className="w-full bg-teal-600 hover:bg-teal-500 text-white py-2 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-teal-100"
                    >
                      <Camera className="w-4 h-4 text-white" />
                      Nhập phản hồi &amp; thông số đo lường NCC
                    </button>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickApproveAudit(aud.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center justify-center shadow-sm shadow-emerald-100"
                        title="Ký duyệt đạt kết quả này trực tiếp"
                      >
                        ✓ Hoàn thành &amp; Đạt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickRejectAudit(aud.id)}
                        className="bg-rose-600 hover:bg-rose-550 text-white py-2 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center justify-center shadow-sm shadow-rose-100"
                        title="Cảnh báo LỖI &amp; Dừng dập lập tức"
                      >
                        ✗ Báo lỗi / Từ chối
                      </button>
                    </div>
                  </div>
                )}

                {aud.status === 'updated' && (
                  <div className="flex gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setSupplierResponseAudit(aud);
                        setResponseValueStr(aud.actualValueStr || '');
                        setResponseSupplierNote(aud.supplierNote || '');
                      }}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer"
                    >
                      Sửa phản hồi NCC
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setEvaluateAudit(aud);
                        setEvalStatus('approved');
                        setEvalDkNote(`Ảnh gửi rõ nét, thông số kỹ thuật thực tế ${aud.actualValueStr || ''} đạt chuẩn dung sai vàng thiết kế. Đạt phê chuẩn cho sản xuất tiếp hàng loạt.`);
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2 rounded-lg text-xs transition shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check className="w-4 h-4" /> Phê duyệt Đạt
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEvaluateAudit(aud);
                        setEvalStatus('rejected');
                        setEvalDkNote('KCS phát hiện lỗi sai lệch kỹ thuật liên quan thông số dung sai. Từ chối phê duyệt sản xuất.');
                      }}
                      className="flex-1 bg-rose-600 hover:bg-rose-550 text-white font-extrabold py-2 rounded-lg text-xs transition shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                    >
                      ✗ Từ chối/Lỗi
                    </button>
                  </div>
                )}

                {/* Edit & Delete always available */}
                <div className="flex gap-2 justify-end items-center mt-1 border-t border-slate-100 pt-3">
                  {(aud.status === 'approved' || aud.status === 'rejected') && (
                    <button
                      type="button"
                      onClick={() => {
                        setEvaluateAudit(aud);
                        setEvalStatus(aud.status);
                        setEvalDkNote(aud.dkNote || '');
                      }}
                      className="bg-indigo-50 hover:bg-indigo-150 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer mr-auto"
                    >
                      <Sliders className="w-3.5 h-3.5 text-indigo-550" /> Sửa phê duyệt
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEditSupplierAuditModal(aud)}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    ✏ Sửa Chỉ thị
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSupplierAudit(aud.id)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    🗑 Xóa
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSelectedSupplierAuditForDetail(null)}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: DANH SÁCH CHI TIẾT BẢN GHI THEO MODEL BIỂU ĐỒ SẢN LƯỢNG */}
      {oqcDetailModalModel && (() => {
        const detailRecords = filteredOqc.filter(r => getCleanModelName(r) === oqcDetailModalModel || (r.model || 'Dòng khác') === oqcDetailModalModel);
        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full overflow-hidden text-xs flex flex-col font-sans max-h-[85vh] animate-in zoom-in-95 duration-150">
              
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 select-none relative flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1 text-left">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-black tracking-widest text-sky-400 uppercase">Hệ Thống QMS - Nhật Ký Bản Ghi Đã Nhập</span>
                  </div>
                  <h3 className="font-black text-slate-100 text-sm sm:text-base uppercase tracking-tight text-left">
                    Danh Sách Bản Ghi KCS/OQC - {oqcDetailModalModel} ({detailRecords.length} xe)
                  </h3>
                </div>
                <button 
                  onClick={() => setOqcDetailModalModel(null)}
                  className="text-slate-450 hover:text-white transition-all bg-white/10 hover:bg-white/20 p-1.5 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm cursor-pointer"
                  title="Đóng cửa sổ"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Container Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)] space-y-4">
                {selectedOqcIds.length > 0 && (
                  <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl p-3 text-red-900 font-sans shadow-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span className="text-xs font-bold">Đang chọn {selectedOqcIds.length} bản ghi OQC</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOqcIds([])}
                        className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkDeleteOqc}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa hàng loạt ({selectedOqcIds.length})
                      </button>
                    </div>
                  </div>
                )}

                {detailRecords.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 italic">
                    Chưa có bản ghi nào được nhập cho dòng xe {oqcDetailModalModel} khớp với điều kiện lọc hiện tại.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-205">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-extrabold text-[10px] uppercase">
                          <th className="p-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={detailRecords.length > 0 && detailRecords.every(r => selectedOqcIds.includes(r.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const allModelOqcIds = detailRecords.map(r => r.id);
                                  setSelectedOqcIds(prev => Array.from(new Set([...prev, ...allModelOqcIds])));
                                } else {
                                  const allModelOqcIds = detailRecords.map(r => r.id);
                                  setSelectedOqcIds(prev => prev.filter(id => !allModelOqcIds.includes(id)));
                                }
                              }}
                              className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                            />
                          </th>
                          <th className="p-3 w-12 text-center">STT</th>
                          <th className="p-3">Số khung / máy</th>
                          <th className="p-3">Mã linh kiện / LSX</th>
                          <th className="p-3">Màu sắc</th>
                          <th className="p-3">Trạng thái</th>
                          <th className="p-3">Chi tiết khuyết tật</th>
                          <th className="p-3">Đánh giá chung</th>
                          <th className="p-3">KCS kiểm tra</th>
                          <th className="p-3 text-center">Thời gian</th>
                          <th className="p-3 w-16 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailRecords.map((row, i) => {
                          const isPassed = isOqcRecordPassed(row);
                          return (
                            <tr key={row.id} className="hover:bg-slate-50 transition font-medium">
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedOqcIds.includes(row.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedOqcIds(prev => [...prev, row.id]);
                                    } else {
                                      setSelectedOqcIds(prev => prev.filter(id => id !== row.id));
                                    }
                                  }}
                                  className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                />
                              </td>
                              <td className="p-3 text-center text-slate-400 font-bold">{i + 1}</td>
                              <td className="p-3 font-mono text-slate-800 font-bold">{row.serialNo || 'N/A'}</td>
                              <td className="p-3 font-mono text-slate-500">
                                <span className="block font-bold text-[11px] text-slate-700">{row.partCode || 'N/A'}</span>
                                <span className="text-[10px] text-slate-400">LSX: {row.lsx || 'N/A'}</span>
                              </td>
                              <td className="p-3 font-bold text-slate-650">{row.color || 'N/A'}</td>
                              <td className="p-3">
                                {isPassed ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-750 border border-emerald-250">
                                    ✓ ĐẠT (Passed)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-rose-50 text-rose-750 border border-rose-250">
                                    ✗ LỖI
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-slate-700" style={{ maxWidth: '220px' }}>
                                <div className="font-bold text-[11px] text-slate-805 leading-snug">{row.defectDetail || 'Không có khuyết điểm'}</div>
                                {row.rootCause && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">Nguyên nhân: {row.rootCause}</div>
                                )}
                              </td>
                              <td className="p-3" style={{ maxWidth: '200px' }}>
                                {row.evaluation ? (
                                  <div className="bg-amber-50 text-amber-800 p-2 rounded border border-amber-200 text-[10px] leading-snug">
                                    <strong>Đánh giá:</strong> {row.evaluation}
                                    {row.treatment && (
                                      <span className="block mt-1 text-indigo-755 font-bold">
                                        👉 {row.treatment}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[10px]">Chưa ghi nhận nhận xét</span>
                                )}
                              </td>
                              <td className="p-3 text-slate-600 font-bold">{row.checkedBy || 'Trưởng nhóm QC'}</td>
                              <td className="p-3 text-center font-mono text-[10px] text-slate-500 whitespace-nowrap">
                                <div>{row.date || 'N/A'}</div>
                                <div className="text-[9px] text-slate-400 mt-0.5">{row.checkTime || 'N/A'}</div>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOqcClick(row.id)}
                                  className="text-rose-650 hover:text-rose-800 p-1 cursor-pointer transition"
                                  title="Xóa bản ghi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-2">
                <span className="text-[10px] text-slate-400 font-sans italic text-center sm:text-left">
                  * Dữ liệu đồng bộ trực tiếp từ máy quét KCS đầu chuyền dập sườn &amp; lắp ráp DKBike
                </span>
                <button 
                  type="button"
                  onClick={() => setOqcDetailModalModel(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition cursor-pointer select-none"
                >
                  Đóng cửa sổ
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL: ĐÁNH GIÁ THÔNG TIN & BIỆN PHÁP KHẮC PHỤC KHUYẾT PHẨM TOP 5 */}
      {selectedDashboardDefect && (() => {
        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-2xl w-full overflow-hidden text-xs flex flex-col font-sans max-h-[85vh] animate-in zoom-in-95 duration-150">
              
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 select-none relative">
                <button 
                  onClick={() => setSelectedDashboardDefect(null)}
                  className="absolute top-4 right-4 text-slate-450 hover:text-white transition-all bg-white/10 hover:bg-white/20 p-1.5 rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm"
                  title="Đóng cửa sổ"
                >
                  ✕
                </button>
                <div className="flex items-center gap-2.5 mb-1">
                  <Wrench className="w-4 h-4 text-rose-500 animate-pulse" />
                  <span className="text-[10px] font-black tracking-widest text-sky-400 uppercase">QMS Đánh Giá &amp; Chỉ Đạo Xử Lý Khuyết Phẩm DKBike (Có thể chỉnh sửa dữ liệu)</span>
                </div>
                <h3 className="font-black text-slate-100 text-base uppercase tracking-tight pr-6">
                  Đánh giá thông tin &amp; Biện pháp khắc phục
                </h3>
              </div>

              {/* Scrollable Container Body */}
              <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-150px)]">
                
                {/* Visual Status Grid banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 shadow-3xs">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Dòng xe lỗi (Model)</span>
                    <strong className="text-[12px] font-extrabold text-slate-800 uppercase font-mono block mt-0.5">{selectedDashboardDefect.modelName}</strong>
                  </div>
                  <div className="bg-rose-50/40 p-3 rounded-xl border border-rose-100/70 shadow-3xs">
                    <span className="text-[9px] font-bold text-rose-500 block uppercase tracking-wider">Tên khuyết phẩm lỗi</span>
                    <strong className="text-[12px] font-black text-rose-700 uppercase block mt-0.5">{selectedDashboardDefect.name}</strong>
                  </div>
                  <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-100/70 shadow-3xs flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-amber-600 block uppercase tracking-wider">Tần suất ghi nhận</span>
                    <span className="text-sm font-black text-rose-600 font-mono tracking-tighter mt-0.5 shrink-0 block">
                      {selectedDashboardDefect.count} chiếc xe lỗi
                    </span>
                  </div>
                </div>

                {/* Sub banner for Severity classification and group choice */}
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 text-left">
                    <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Mức độ cảnh báo:</span>
                    <select 
                      value={draftSeverity}
                      onChange={(e) => setDraftSeverity(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-750 focus:outline-none focus:border-indigo-500 w-full"
                    >
                      <option value="Nhẹ (Minor - Thẩm mỹ phụ trợ)">Nhẹ (Minor - Thẩm mỹ phụ trợ)</option>
                      <option value="Trung bình (Major - Ngoại quan)">Trung bình (Major - Ngoại quan)</option>
                      <option value="Trung bình (Major - Thẩm mỹ lắp ráp)">Trung bình (Major - Thẩm mỹ lắp ráp)</option>
                      <option value="Trung bình (Major - Nghi ngờ dung sai)">Trung bình (Major - Nghi ngờ dung sai)</option>
                      <option value="Nghiêm trọng (Critical - Chức năng)">Nghiêm trọng (Critical - Chức năng)</option>
                      <option value="Nghiêm trọng (Critical - Cơ cấu)">Nghiêm trọng (Critical - Cơ cấu)</option>
                      <option value="Nguy hại (Critical - Hệ thống điện)">Nguy hại (Critical - Hệ thống điện)</option>
                      <option value="Nguy hại (Critical - An toàn vận hành)">Nguy hại (Critical - An toàn vận hành)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 text-left">
                    <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">Phân nhóm lỗi:</span>
                    <input 
                      type="text"
                      value={draftCategory}
                      onChange={(e) => setDraftCategory(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-750 focus:outline-none focus:border-indigo-500 w-full"
                    />
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="space-y-4">
                  
                  {/* Item 1: Impact & Root Cause */}
                  <div className="space-y-4 bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-4xs text-left">
                    <div className="space-y-1.5">
                      <h4 className="text-[10.5px] font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-amber-500 rounded-sm" />
                        1. Đánh giá ảnh hưởng chất lượng &amp; Vận hành
                      </h4>
                      <textarea
                        value={draftImpact}
                        onChange={(e) => setDraftImpact(e.target.value)}
                        className="w-full h-16 bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11.5px] text-slate-700 leading-relaxed font-semibold focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                        placeholder="Nhập đánh giá ảnh hưởng ngoại quan hoặc vận hành..."
                      />
                    </div>

                    <div className="h-[1px] bg-slate-100 my-2" />

                    <div className="space-y-1.5">
                      <h4 className="text-[10.5px] font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-rose-500 rounded-sm" />
                        2. Nhận định nguyên nhân cốt lõi (Root Cause)
                      </h4>
                      <textarea
                        value={draftRootCause}
                        onChange={(e) => setDraftRootCause(e.target.value)}
                        className="w-full h-16 bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11.5px] text-slate-700 leading-relaxed font-semibold focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                        placeholder="Nhập nhận định nguyên nhân cốt lõi xảy ra lỗi..."
                      />
                    </div>
                  </div>

                  {/* Item 2: Actions (CAPA) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    
                    {/* Emergency corrective action */}
                    <div className="bg-emerald-50/20 border border-emerald-500/20 rounded-2xl p-4.5 space-y-2">
                      <h4 className="text-[10.5px] font-black text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        Biện pháp Khẩn cấp (Sửa lỗi - Xuống dòng cho mỗi ý)
                      </h4>
                      <textarea
                        value={draftEmergency}
                        onChange={(e) => setDraftEmergency(e.target.value)}
                        className="w-full h-24 bg-slate-50/35 border border-emerald-250/30 rounded-lg p-2 text-[11px] text-emerald-950 font-medium leading-relaxed focus:outline-none focus:bg-white focus:border-emerald-500 transition-all"
                        placeholder="Nhập các biện pháp xử lý khẩn cấp (mỗi biện pháp một dòng)..."
                      />
                    </div>

                    {/* Long-term prevention */}
                    <div className="bg-indigo-50/20 border border-indigo-500/20 rounded-2xl p-4.5 space-y-2">
                      <h4 className="text-[10.5px] font-black text-indigo-800 uppercase tracking-wide flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                        Phòng ngừa Lâu dài (Xử lý Hệ thống - Xuống dòng cho mỗi ý)
                      </h4>
                      <textarea
                        value={draftPreventative}
                        onChange={(e) => setDraftPreventative(e.target.value)}
                        className="w-full h-24 bg-slate-50/35 border border-indigo-250/30 rounded-lg p-2 text-[11px] text-indigo-950 font-medium leading-relaxed focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                        placeholder="Nhập các biện pháp phòng ngừa lâu dài lỗi tái diễn (mỗi biện pháp một dòng)..."
                      />
                    </div>

                  </div>

                  {/* Section 4: Operational stats */}
                  <div className="bg-slate-900 text-slate-105 rounded-2xl p-4.5 text-[11px] space-y-3 shadow-inner font-sans text-left">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-2">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">CHỈ ĐẠO BAN HÀNH BỞI:</span>
                      <input 
                        type="text"
                        value={draftOwner}
                        onChange={(e) => setDraftOwner(e.target.value)}
                        className="bg-slate-800 text-sky-305 font-extrabold border border-slate-700 rounded px-2.5 py-1 w-full sm:w-2/3 focus:outline-none focus:border-sky-400 text-xs"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">THỜI HẠN ÁP DỤNG KPI/CAPA:</span>
                      <input 
                        type="text"
                        value={draftDue}
                        onChange={(e) => setDraftDue(e.target.value)}
                        className="bg-slate-800 text-amber-400 font-extrabold border border-slate-700 rounded px-2.5 py-1 w-full sm:w-2/3 focus:outline-none focus:border-amber-450 text-xs"
                      />
                    </div>
                  </div>

                </div>

              </div>

              {/* Bottom Footer Actions */}
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
                <span className="text-[10px] text-slate-400 italic">
                  * Biện pháp kỹ thuật ban hành tức thì trên hệ thống QMS DKBike và lưu trữ vĩnh viễn
                </span>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setSelectedDashboardDefect(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer select-none"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="button"
                    onClick={handleSaveCustomAnalysis}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-650 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition shadow-md cursor-pointer select-none flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Lưu thông tin &amp; Ban hành CAPA
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL: XUẤT BÁO CÁO KCS TUẦN/THÁNG (KCS/OQC REPORT EXPORT MODAL)           */}
      {/* ========================================================================= */}
      {showExportKcsReportModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto no-print animate-in fade-in duration-200">
          <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-700 shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center bg-slate-950 px-6 py-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-amber-600/30 text-amber-400 rounded-xl border border-amber-500/30">
                  <FileSpreadsheet className="w-5 h-5 text-amber-400 animate-pulse" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-sm uppercase tracking-wide">
                    Trung Tâm Kết Xuất Báo Cáo KCS / OQC
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Hệ thống trích xuất báo cáo chất lượng thành phẩm chính quy của tổ KCS DKBike
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowExportKcsReportModal(false)}
                className="text-slate-400 hover:text-white font-extrabold text-sm p-1.5 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Left Panel: Settings Controls */}
              <div className="w-full md:w-80 bg-slate-900 border-r border-slate-800 p-5 overflow-y-auto space-y-5 text-xs text-slate-300 shrink-0">
                
                {/* Selector 1: Template Type */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Chu kỳ báo cáo (Report Cycle)
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
                    <button
                      onClick={() => setExportKcsPeriod('weekly')}
                      className={`py-1.5 rounded text-center font-bold font-sans transition-all cursor-pointer ${exportKcsPeriod === 'weekly' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                    >
                      Theo Tuần
                    </button>
                    <button
                      onClick={() => setExportKcsPeriod('monthly')}
                      className={`py-1.5 rounded text-center font-bold font-sans transition-all cursor-pointer ${exportKcsPeriod === 'monthly' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                    >
                      Theo Tháng
                    </button>
                  </div>
                </div>

                {/* Selector 2: Period Controls */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      Chọn Tháng
                    </label>
                    <select
                      value={exportKcsMonth}
                      onChange={(e) => setExportKcsMonth(Number(e.target.value))}
                      className="w-full bg-slate-950 text-white border border-slate-800 p-2 rounded outline-none font-bold focus:border-amber-500 cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                        <option key={m} value={m}>Tháng {m}</option>
                      ))}
                    </select>
                  </div>
                  
                  {exportKcsPeriod === 'weekly' && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        Chọn Tuần
                      </label>
                      <select
                        value={exportKcsWeek}
                        onChange={(e) => setExportKcsWeek(e.target.value)}
                        className="w-full bg-slate-950 text-white border border-slate-800 p-2 rounded outline-none font-bold focus:border-amber-500 cursor-pointer"
                      >
                        {[1, 2, 3, 4, 5].map((w) => {
                          const range = getWeekDatesForReporting(2026, exportKcsMonth, w);
                          return (
                            <option key={w} value={`T${w}`}>
                              Tuần {w} ({range})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  <div className={exportKcsPeriod === 'monthly' ? "col-span-2" : "col-span-2"}>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        Chọn Năm
                      </label>
                      <select
                        value={exportKcsYear}
                        onChange={(e) => setExportKcsYear(Number(e.target.value))}
                        className="w-full bg-slate-950 text-white border border-slate-800 p-2 rounded outline-none font-bold cursor-pointer"
                      >
                        <option value={2026}>Năm 2026</option>
                        <option value={2025}>Năm 2025</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Selector 3: Model Controls */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Dòng xe (Model)
                  </label>
                  <select
                    value={exportKcsModel}
                    onChange={(e) => setExportKcsModel(e.target.value)}
                    className="w-full bg-slate-950 text-white border border-slate-800 p-2 rounded outline-none font-bold focus:border-amber-500 cursor-pointer"
                  >
                    <option value="All">Tất cả Dòng xe</option>
                    {Array.from(new Set(oqcRecords.map(r => r.model))).filter(Boolean).sort().map((mdl, idx) => (
                      <option key={`${mdl}-${idx}`} value={mdl}>{mdl}</option>
                    ))}
                  </select>
                </div>

                {/* Actions Panel */}
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <button
                    onClick={() => window.print()}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-xs cursor-pointer shadow-md shadow-amber-900/30"
                  >
                    <Printer className="w-4 h-4 text-white" /> In báo cáo (Xuất PDF)
                  </button>
                  <button
                    onClick={() => handleExportKcsReportCSV(exportKcsPeriod, exportKcsMonth, exportKcsWeek, exportKcsYear, exportKcsModel)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Xuất Excel dữ liệu
                  </button>
                </div>
              </div>

              {/* Right Panel: High-fidelity Live Paper A4 Preview */}
              <div className="flex-1 bg-slate-950 p-6 overflow-y-auto flex justify-center">
                <div 
                  id="printable-kcs-report-area"
                  className="bg-white text-slate-900 p-8 md:p-12 shadow-2xl rounded-lg w-full max-w-[210mm] min-h-[297mm] text-xs leading-relaxed flex flex-col font-sans relative"
                  style={{
                    boxShadow: '0 0 24px rgba(0,0,0,0.6)',
                    color: '#1e293b'
                  }}
                >
                  <style>{`
                    @media print {
                      html, body, #root, #app_root, #app_root *, div {
                        height: auto !important;
                        min-height: auto !important;
                        max-height: none !important;
                        overflow: visible !important;
                        overflow-y: visible !important;
                        position: static !important;
                      }
                      body * {
                        visibility: hidden;
                      }
                      #printable-kcs-report-area, #printable-kcs-report-area * {
                        visibility: visible;
                      }
                      #printable-kcs-report-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 10mm !important;
                      }
                    }
                  `}</style>

                  {/* Document Content */}
                  {(() => {
                    const filtered = oqcRecords.filter(r => {
                      if (!r.date) return false;
                      const info = getWeekAndMonthFromDate(r.date);
                      const matchesMonth = info.month === exportKcsMonth;
                      const matchesYear = info.year === exportKcsYear;
                      const matchesWeek = exportKcsPeriod === 'weekly' ? info.week === exportKcsWeek : true;
                      const matchesModel = exportKcsModel === 'All' || r.model === exportKcsModel;
                      return matchesMonth && matchesYear && matchesWeek && matchesModel;
                    });

                    const total = filtered.length;
                    const passed = filtered.filter(isOqcRecordPassed).length;
                    const failed = total - passed;
                    const yieldRate = total > 0 ? Math.round((passed / total) * 100) : 100;

                    // Group by models
                    const modelsMap: Record<string, { total: number; passed: number; failed: number; defects: string[] }> = {};
                    filtered.forEach(r => {
                      const m = r.model || 'Dòng khác';
                      if (!modelsMap[m]) modelsMap[m] = { total: 0, passed: 0, failed: 0, defects: [] };
                      modelsMap[m].total += 1;
                      if (isOqcRecordPassed(r)) {
                        modelsMap[m].passed += 1;
                      } else {
                        modelsMap[m].failed += 1;
                        if (r.defectDetail) {
                          modelsMap[m].defects.push(r.defectDetail);
                        }
                      }
                    });

                    // Get Top 3 defects per model
                    const modelTopDefectsForReport: Record<string, Array<{ text: string; count: number; evaluation: string; rootCause: string; treatment: string }>> = {};
                    Object.entries(modelsMap).forEach(([mName, mData]) => {
                      if (mData.failed === 0) return;
                      const counts: Record<string, number> = {};
                      mData.defects.forEach(def => {
                        const clean = def.trim();
                        if (clean) {
                          counts[clean] = (counts[clean] || 0) + 1;
                        }
                      });
                      const sorted = Object.entries(counts)
                        .map(([text, count]) => {
                          const capa = getRowCapaData(text);
                          return {
                            text,
                            count,
                            evaluation: capa.evaluation,
                            rootCause: capa.rootCause,
                            treatment: capa.treatment
                          };
                        })
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 3);
                      if (sorted.length > 0) {
                        modelTopDefectsForReport[mName] = sorted;
                      }
                    });

                    const periodLabelText = exportKcsPeriod === 'weekly' 
                      ? `Tuần ${exportKcsWeek} - Tháng ${exportKcsMonth} Năm ${exportKcsYear}` 
                      : `Tháng ${exportKcsMonth} Năm ${exportKcsYear}`;

                    return (
                      <div className="space-y-6">
                        {/* Company Header */}
                        <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                          <div>
                            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wide font-sans">
                              CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT
                            </h4>
                            <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5 font-sans">
                              PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL) - DK QMS
                            </p>
                          </div>
                          <div className="text-right text-[9px] text-slate-400 font-mono">
                            Mẫu biểu: DK-QMS-OQC-RP<br />
                            Ban hành: Q1/2026
                          </div>
                        </div>

                        {/* Title */}
                        <div className="text-center py-2">
                          <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider font-sans">
                            BÁO CÁO KIỂM SOÁT CHẤT LƯỢNG THÀNH PHẨM KCS (OQC)
                          </h2>
                          <p className="text-xs font-bold text-amber-700 mt-1 uppercase tracking-wide">
                            Chu kỳ kiểm soát: {periodLabelText}
                          </p>
                        </div>

                        {/* Summary Block */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tổng xe kiểm tra (KCS)</span>
                            <span className="text-xl font-black text-slate-800 font-mono block">{total} chiếc</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Đạt tiêu chuẩn lần 1</span>
                            <span className="text-xl font-black text-emerald-600 font-mono block">{passed} chiếc</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Phát sinh khuyết tật</span>
                            <span className="text-xl font-black text-red-500 font-mono block">{failed} chiếc</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tỷ lệ Đạt lần 1 (FTR)</span>
                            <span className="text-xl font-black text-blue-600 font-mono block">{yieldRate}%</span>
                          </div>
                        </div>

                        {/* Section I: Performance Table */}
                        <div className="space-y-2">
                          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5 border-l-2 border-amber-600 pl-2">
                            I. ĐÁNH GIÁ CHẤT LƯỢNG CHI TIẾT THEO DÒNG XE
                          </h3>
                          <table className="w-full text-left border-collapse border border-slate-200 text-[10px]">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700 uppercase font-bold text-[9px] tracking-wide border-b border-slate-200">
                                <th className="p-2 border border-slate-200">STT</th>
                                <th className="p-2 border border-slate-200">Dòng xe (Model)</th>
                                <th className="p-2 border border-slate-200 text-center">Tổng kiểm tra</th>
                                <th className="p-2 border border-slate-200 text-center text-emerald-700">Số lượng Đạt</th>
                                <th className="p-2 border border-slate-200 text-center text-red-700">Số lượng Lỗi</th>
                                <th className="p-2 border border-slate-200 text-center text-blue-700">Tỷ lệ Đạt (FTR)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.keys(modelsMap).length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="p-4 text-center text-slate-400 font-bold">
                                    Không ghi nhận dữ liệu kiểm tra trong chu kỳ này
                                  </td>
                                </tr>
                              ) : (
                                Object.entries(modelsMap).map(([mName, mData], idx) => {
                                  const rate = mData.total > 0 ? Math.round((mData.passed / mData.total) * 100) : 100;
                                  return (
                                    <tr key={idx} className="hover:bg-slate-50 border-b border-slate-200 font-sans font-medium text-slate-800">
                                      <td className="p-2 border border-slate-200 text-center font-mono">{idx + 1}</td>
                                      <td className="p-2 border border-slate-200 font-bold uppercase">{mName}</td>
                                      <td className="p-2 border border-slate-200 text-center font-mono font-bold">{mData.total} xe</td>
                                      <td className="p-2 border border-slate-200 text-center font-mono font-bold text-emerald-600">{mData.passed} xe</td>
                                      <td className="p-2 border border-slate-200 text-center font-mono font-bold text-red-500">{mData.failed} xe</td>
                                      <td className="p-2 border border-slate-200 text-center font-mono font-black text-blue-600 bg-blue-50/10">{rate}%</td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Section II: Top 3 defects analysis per model */}
                        <div className="space-y-4 page-break-inside-avoid">
                          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5 border-l-2 border-amber-600 pl-2">
                            II. PHÂN TÍCH CHUYÊN SÂU TOP 3 LỖI PHỔ BIẾN NHẤT & BIỆN PHÁP CAPA THEO TỪNG DÒNG XE (MODEL)
                          </h3>
                          
                          {Object.keys(modelTopDefectsForReport).length === 0 ? (
                            <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 font-bold text-[10px]">
                              Không ghi nhận lỗi khuyết tật nào để phân tích trong chu kỳ báo cáo này
                            </div>
                          ) : (
                            Object.entries(modelTopDefectsForReport).map(([mName, defects], mIdx) => (
                              <div key={mName} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1.5">
                                <div className="text-[10px] font-black text-slate-800 uppercase tracking-wide flex items-center justify-between border-b border-slate-200 pb-1">
                                  <span>Dòng xe: <span className="text-amber-700">{mName}</span></span>
                                  <span className="text-[8px] text-slate-500 font-mono">({defects.length} lỗi chính)</span>
                                </div>
                                <table className="w-full text-left border-collapse border border-slate-200 text-[9px]">
                                  <thead>
                                    <tr className="bg-slate-100/80 text-slate-700 uppercase font-bold text-[8px] tracking-wide border-b border-slate-200">
                                      <th className="p-1.5 border border-slate-200 w-10 text-center">Hạng</th>
                                      <th className="p-1.5 border border-slate-200 w-36">Khuyết tật / Lỗi</th>
                                      <th className="p-1.5 border border-slate-200 w-16 text-center text-red-700">Tần suất</th>
                                      <th className="p-1.5 border border-slate-200 w-44">Ảnh hưởng chất lượng</th>
                                      <th className="p-1.5 border border-slate-200 w-44">Nguyên nhân cốt lõi</th>
                                      <th className="p-1.5 border border-slate-200">Biện pháp xử lý & CAPA</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {defects.map((item, i) => (
                                      <tr key={i} className="hover:bg-white bg-white border-b border-slate-200 font-sans">
                                        <td className="p-1.5 border border-slate-200 font-mono text-center font-bold text-slate-600">#{i + 1}</td>
                                        <td className="p-1.5 border border-slate-200 font-black text-slate-800 text-[9.5px]">{item.text}</td>
                                        <td className="p-1.5 border border-slate-200 font-mono text-center text-red-600 font-extrabold">{item.count} xe</td>
                                        <td className="p-1.5 border border-slate-200 text-slate-600 leading-relaxed font-semibold text-[8px]">{item.evaluation}</td>
                                        <td className="p-1.5 border border-slate-200 text-slate-600 leading-relaxed font-semibold text-[8px]">{item.rootCause}</td>
                                        <td className="p-1.5 border border-slate-200 text-indigo-950 font-bold leading-relaxed bg-amber-50/20 text-[8px]">{item.treatment}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-3 gap-4 pt-10 text-center text-[10px] select-none mt-auto">
                          <div className="space-y-12">
                            <span className="font-bold uppercase tracking-wider text-slate-500">Người lập biểu</span>
                            <div className="text-slate-800 font-extrabold uppercase text-[10px]">Tổ trưởng KCS</div>
                          </div>
                          <div className="space-y-12">
                            <span className="font-bold uppercase tracking-wider text-slate-500">Trưởng phòng QLCL</span>
                            <div className="text-slate-800 font-extrabold uppercase text-[10px]">Nguyễn Xuân Thao</div>
                          </div>
                          <div className="space-y-12">
                            <span className="font-bold uppercase tracking-wider text-slate-500">Xác nhận Ban giám đốc</span>
                            <div className="text-slate-800 font-extrabold uppercase text-[10px]">Phê duyệt lưu trữ</div>
                          </div>
                        </div>

                        {/* Footer info */}
                        <div className="text-center text-[8px] text-slate-400 pt-8 select-none border-t border-dashed border-slate-200">
                          Báo cáo được khởi tạo tự động từ hệ thống DKBike Quality Management System (QMS).<br />
                          Mọi thông tin chỉnh sửa cần tuân thủ quy trình vận hành SOP-QLCL-04.
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* LOCAL IMAGE ZOOM PREVIEW MODAL */}
      {localZoomImage && (
        <div 
          onClick={() => setLocalZoomImage(null)}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[999] cursor-zoom-out animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-white/20 shadow-2xl flex items-center justify-center bg-black/45" onClick={(e) => e.stopPropagation()}>
            <img 
              src={localZoomImage} 
              className="max-w-full max-h-[80vh] object-contain select-none shadow-2xl border border-white/10"
              referrerPolicy="no-referrer" 
              alt="Bằng chứng hiện trường" 
            />
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/10 select-none">
                Bằng chứng hiện trường QMS
              </span>
              <button 
                onClick={() => setLocalZoomImage(null)}
                className="bg-black/60 hover:bg-black/80 backdrop-blur text-white font-bold rounded-full h-8 w-8 flex items-center justify-center border border-white/25 transition shadow cursor-pointer text-sm animate-pulse"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OQC TOUCH-FRIENDLY MULTI-DEFECT PICKER MODAL */}
      {activeMultiDefectModalRecord && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>⚡ Gán Nhiều Lỗi OQC Cho Xe Sêri:</span>
                  <span className="font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    {activeMultiDefectModalRecord.serialNo}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Model: <strong>{activeMultiDefectModalRecord.model}</strong> | LSX: <strong>{activeMultiDefectModalRecord.lsx}</strong>
                </p>
              </div>
              <button
                onClick={() => setActiveMultiDefectModalRecord(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Currently selected defects */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Danh sách lỗi đang chọn ({selectedModalDefects.length}):
              </label>
              <div className="flex flex-wrap items-center gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200 min-h-[44px]">
                {selectedModalDefects.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">Chưa chọn lỗi nào (Bấm chọn ở danh mục bên dưới)</span>
                ) : (
                  selectedModalDefects.map((def, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-rose-600 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-xs">
                      <span>🔴 {def}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedModalDefects(prev => prev.filter((_, i) => i !== idx))}
                        className="hover:text-amber-200 font-black ml-1 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {[
                {
                  category: '🎨 Sơn & Thân Vỏ',
                  items: ['Xước sơn sườn', 'Bong tróc sơn', 'Lệch màu nhựa', 'Hở bavia mộc', 'Bạc màu sơn', 'Móp sườn khung']
                },
                {
                  category: '⚡ Hệ Thống Điện & Cảm Biến',
                  items: ['Lỏng rắc cắm nguồn', 'Đèn pha không sáng', 'Đồng hồ không lên', 'Còi không kêu', 'Pin / Ắc quy ngắt', 'Động cơ ngắt chập chờn', 'Xi nhan không nháy']
                },
                {
                  category: '🔩 Cơ Khí & Khung Gầm',
                  items: ['Phanh đĩa bó', 'Lệch cổ phốt', 'Tiếng kêu lạ động cơ', 'Giảm xóc kêu', 'Lỏng ốc bánh xe', 'Cần phanh nặng', 'Xích tải chùng']
                }
              ].map((catGroup, gIdx) => (
                <div key={gIdx} className="space-y-1.5">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight bg-slate-100 px-2.5 py-1 rounded">
                    {catGroup.category}
                  </h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {catGroup.items.map((item, itemIdx) => {
                      const isSelected = selectedModalDefects.includes(item);
                      return (
                        <button
                          key={itemIdx}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedModalDefects(prev => prev.filter(d => d !== item));
                            } else {
                              setSelectedModalDefects(prev => [...prev, item]);
                            }
                          }}
                          className={`p-2 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{item}</span>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isSelected ? 'bg-rose-600 text-white' : 'border border-slate-300 text-transparent'}`}>
                            ✓
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const unique = Array.from(new Set(selectedModalDefects.filter(Boolean)));
                  const updatedStr = unique.join(', ');
                  const targetSerial = activeMultiDefectModalRecord.serialNo ? activeMultiDefectModalRecord.serialNo.trim().toUpperCase() : '';
                  const now = new Date();
                  const nowTime = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                  const nowDate = now.toLocaleDateString('vi-VN');
                  const nowMonth = now.getMonth() + 1;
                  const nowYear = now.getFullYear();

                  const override: Partial<OQCRecord> = unique.length === 0 ? {
                    status: 'Đạt' as const,
                    defectDetail: '',
                    failedCount: 0,
                    checkTime: nowTime,
                    date: nowDate,
                    month: nowMonth,
                    year: nowYear
                  } : {
                    status: 'Lỗi' as const,
                    defectDetail: updatedStr,
                    failedCount: 1,
                    checkTime: nowTime,
                    date: nowDate,
                    month: nowMonth,
                    year: nowYear
                  };

                  if (activeMultiDefectModalRecord.id) {
                    setLocalOqcOverrides(prev => ({ ...prev, [activeMultiDefectModalRecord.id]: { ...activeMultiDefectModalRecord, ...override } }));
                  }

                  const updated = [...oqcRecords];
                  const index = updated.findIndex(r => r.id === activeMultiDefectModalRecord.id || (targetSerial && r.serialNo && r.serialNo.trim().toUpperCase() === targetSerial));
                  if (index !== -1) {
                    updated[index] = {
                      ...updated[index],
                      ...override
                    };
                  }
                  saveOqcRecordsOptimized(updated);
                  setActiveMultiDefectModalRecord(null);
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer active:scale-95 text-center"
              >
                💾 Lưu Danh Sách Lỗi Cho Xe ({selectedModalDefects.length} lỗi)
              </button>
              <button
                type="button"
                onClick={() => setActiveMultiDefectModalRecord(null)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
