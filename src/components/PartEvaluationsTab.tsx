import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileText,
  PackageCheck,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X
} from 'lucide-react';
import XLSXStyle from 'xlsx-js-style';
import {
  PartEvaluation,
  PartEvaluationResolution,
  PartEvaluationRootCause
} from '../types';
import { compressImageFile } from '../imageCompressor';

interface PartEvaluationsTabProps {
  evaluations: PartEvaluation[];
  onSaveEvaluation: (item: PartEvaluation, isEdit: boolean) => boolean;
  onDeleteEvaluation: (id: string) => void;
  models: string[];
  dealers: string[];
  suppliers: string[];
  defaultInspector?: string;
  triggerToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const COMMON_PARTS_QUICK_LIST = [
  'IC điều tốc',
  'Động cơ',
  'Ắc quy / Pin',
  'Bộ sạc',
  'Tay ga',
  'Đồng hồ / Công tắc',
  'Đèn / Còi / Xi nhan',
  'Dây điện chính',
  'Phanh / Đĩa phanh',
  'Giảm xóc / Phuộc',
  'Khóa điện / Chống trộm',
  'Khung sườn / Vỏ nhựa'
];

const ROOT_CAUSE_OPTIONS: {
  value: PartEvaluationRootCause;
  label: string;
  fullLabel: string;
  activeClass: string;
  badgeClass: string;
}[] = [
  {
    value: 'Lỗi NCC',
    label: 'Lỗi NCC',
    fullLabel: 'Lỗi do Nhà cung cấp linh kiện',
    activeClass: 'bg-rose-600 text-white border-rose-700 shadow-sm',
    badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300'
  },
  {
    value: 'Lỗi SX',
    label: 'Lỗi SX (Lắp ráp)',
    fullLabel: 'Lỗi do Quá trình lắp ráp DKBike',
    activeClass: 'bg-amber-600 text-white border-amber-700 shadow-sm',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300'
  },
  {
    value: 'Lỗi KH',
    label: 'Lỗi KH (Sử dụng)',
    fullLabel: 'Lỗi do Khách hàng / Đại lý sử dụng',
    activeClass: 'bg-slate-700 text-white border-slate-800 shadow-sm',
    badgeClass: 'bg-slate-100 text-slate-800 border border-slate-300'
  }
];

const RESOLUTION_OPTIONS: {
  value: PartEvaluationResolution;
  label: string;
  activeClass: string;
  badgeClass: string;
}[] = [
  {
    value: 'Đổi mới BH',
    label: 'Đổi mới BH',
    activeClass: 'bg-emerald-600 text-white border-emerald-700 shadow-sm',
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300'
  },
  {
    value: 'Sửa chữa / Tái chế',
    label: 'Sửa chữa / Tái chế',
    activeClass: 'bg-indigo-600 text-white border-indigo-700 shadow-sm',
    badgeClass: 'bg-indigo-100 text-indigo-800 border border-indigo-300'
  },
  {
    value: 'Từ chối BH',
    label: 'Từ chối BH',
    activeClass: 'bg-rose-700 text-white border-rose-800 shadow-sm',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-300'
  }
];

const escapeHtml = (unsafe: string | number | undefined): string =>
  String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getTodayIso = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDateVn = (isoOrVn: string | undefined): string => {
  if (!isoOrVn) return '--/--/----';
  const trimmed = isoOrVn.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [y, m, d] = trimmed.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return trimmed;
};

const parseDateObj = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;
  const s = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/').map(Number);
    return new Date(y, m - 1, d);
  }
  return null;
};

const generateNextEvalId = (list: PartEvaluation[], dateIso: string): string => {
  const clean = (dateIso || getTodayIso()).replace(/-/g, '').slice(2, 8); // YYMMDD
  const prefix = `KTTD-${clean}-`;
  let maxSeq = 0;
  list.forEach((item) => {
    if (item.id && item.id.startsWith(prefix)) {
      const suffix = parseInt(item.id.slice(prefix.length), 10);
      if (!isNaN(suffix) && suffix > maxSeq) maxSeq = suffix;
    }
  });
  return `${prefix}${String(maxSeq + 1).padStart(2, '0')}`;
};

export const PartEvaluationsTab: React.FC<PartEvaluationsTabProps> = ({
  evaluations,
  onSaveEvaluation,
  onDeleteEvaluation,
  models,
  dealers,
  suppliers,
  defaultInspector = 'Nguyễn Văn Diệm',
  triggerToast
}) => {
  // Form states (giữ tối thiểu trường nhập cho Nguyễn Văn Diệm)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [receivedDate, setReceivedDate] = useState<string>(getTodayIso);
  const [customId, setCustomId] = useState<string>('');
  const [inspector, setInspector] = useState<string>(defaultInspector);
  const [partName, setPartName] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [model, setModel] = useState<string>('');
  const [dealer, setDealer] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [rootCauseCategory, setRootCauseCategory] = useState<PartEvaluationRootCause>('Lỗi NCC');
  const [resolution, setResolution] = useState<PartEvaluationResolution>('Đổi mới BH');
  const [findingNote, setFindingNote] = useState<string>('');
  const [keepContextOnSave, setKeepContextOnSave] = useState<boolean>(false);
  const [showOptionalFields, setShowOptionalFields] = useState<boolean>(false);
  const [showEntryModal, setShowEntryModal] = useState<boolean>(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);

  // Optional BM-KTTD-01 extra fields
  const [partCode, setPartCode] = useState<string>('');
  const [vin, setVin] = useState<string>('');
  const [engineNo, setEngineNo] = useState<string>('');
  const [usageDuration, setUsageDuration] = useState<string>('');
  const [warrantyStatus, setWarrantyStatus] = useState<string>('Còn bảo hành');
  const [nccFeedbackAction, setNccFeedbackAction] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);

  // Filters & Summary report state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCause, setFilterCause] = useState<string>('All');
  const [filterResolution, setFilterResolution] = useState<string>('All');
  const [filterModel, setFilterModel] = useState<string>('All');
  const [filterTime, setFilterTime] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [filterYear, setFilterYear] = useState<string>('All');
  const [reportGroupTab, setReportGroupTab] = useState<'part' | 'model' | 'supplier' | 'dealer'>('part');
  const [showSummaryReport, setShowSummaryReport] = useState<boolean>(true);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [previewRecord, setPreviewRecord] = useState<PartEvaluation | null>(null);

  const previewAutoId = useMemo(
    () => (editingId ? customId || editingId : customId.trim() || generateNextEvalId(evaluations, receivedDate)),
    [editingId, customId, evaluations, receivedDate]
  );

  // Gợi ý tên linh kiện từ danh mục chuẩn + dữ liệu đã nhập trước đó
  const suggestedPartNames = useMemo(() => {
    const set = new Set<string>(COMMON_PARTS_QUICK_LIST);
    evaluations.forEach((ev) => {
      if (ev.partName?.trim()) set.add(ev.partName.trim());
    });
    return Array.from(set);
  }, [evaluations]);

  // Danh sách năm có trong dữ liệu
  const availableYears = useMemo(() => {
    const yrs = new Set<number>();
    evaluations.forEach((ev) => {
      const d = parseDateObj(ev.receivedDate);
      if (d) yrs.add(d.getFullYear());
    });
    yrs.add(new Date().getFullYear());
    return Array.from(yrs).sort((a, b) => b - a);
  }, [evaluations]);

  // Lọc danh sách đánh giá
  const filteredEvaluations = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = todayStart.getDay() === 0 ? 7 : todayStart.getDay();
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - (dayOfWeek - 1));
    const q = searchTerm.trim().toLowerCase();

    return [...evaluations]
      .filter((ev) => {
        if (filterCause !== 'All' && ev.rootCauseCategory !== filterCause) return false;
        if (filterResolution !== 'All' && ev.resolution !== filterResolution) return false;
        if (filterModel !== 'All' && (ev.model || '') !== filterModel) return false;

        const evDate = parseDateObj(ev.receivedDate);
        if (filterTime !== 'all') {
          if (!evDate) return false;
          if (filterTime === 'today' && evDate.getTime() !== todayStart.getTime()) return false;
          if (filterTime === 'week' && evDate < weekStart) return false;
          if (
            filterTime === 'month' &&
            (evDate.getMonth() !== now.getMonth() || evDate.getFullYear() !== now.getFullYear())
          ) {
            return false;
          }
        }
        if (filterMonth !== 'All') {
          if (!evDate || evDate.getMonth() + 1 !== Number(filterMonth)) return false;
        }
        if (filterYear !== 'All') {
          if (!evDate || evDate.getFullYear() !== Number(filterYear)) return false;
        }

        if (q) {
          const hay = [
            ev.id,
            ev.partName,
            ev.partCode,
            ev.model,
            ev.dealer,
            ev.supplierName,
            ev.findingNote,
            ev.inspector,
            ev.vin,
            ev.engineNo
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = (a.receivedDate || '').localeCompare(b.receivedDate || '');
        if (da !== 0) return -da;
        return (b.createdAt || b.id).localeCompare(a.createdAt || a.id);
      });
  }, [
    evaluations,
    searchTerm,
    filterCause,
    filterResolution,
    filterModel,
    filterTime,
    filterMonth,
    filterYear
  ]);

  // Tính toán số liệu Báo cáo tổng hợp
  const summaryStats = useMemo(() => {
    let totalQty = 0;
    let nccRecords = 0;
    let nccQty = 0;
    let sxRecords = 0;
    let sxQty = 0;
    let khRecords = 0;
    let khQty = 0;
    let exchangeQty = 0;
    let repairQty = 0;
    let rejectQty = 0;

    type GroupAgg = {
      name: string;
      records: number;
      qty: number;
      nccQty: number;
      sxQty: number;
      khQty: number;
      exchangeQty: number;
    };

    const byPart = new Map<string, GroupAgg>();
    const byModel = new Map<string, GroupAgg>();
    const bySupplier = new Map<string, GroupAgg>();
    const byDealer = new Map<string, GroupAgg>();

    const addGroup = (map: Map<string, GroupAgg>, rawName: string | undefined, qty: number, ev: PartEvaluation) => {
      const key = (rawName || '').trim() || 'Chưa phân loại';
      const cur = map.get(key) || {
        name: key,
        records: 0,
        qty: 0,
        nccQty: 0,
        sxQty: 0,
        khQty: 0,
        exchangeQty: 0
      };
      cur.records += 1;
      cur.qty += qty;
      if (ev.rootCauseCategory === 'Lỗi NCC') cur.nccQty += qty;
      else if (ev.rootCauseCategory === 'Lỗi SX') cur.sxQty += qty;
      else cur.khQty += qty;
      if (ev.resolution === 'Đổi mới BH') cur.exchangeQty += qty;
      map.set(key, cur);
    };

    filteredEvaluations.forEach((ev) => {
      const qty = Math.max(1, Number(ev.quantity) || 1);
      totalQty += qty;

      if (ev.rootCauseCategory === 'Lỗi NCC') {
        nccRecords += 1;
        nccQty += qty;
      } else if (ev.rootCauseCategory === 'Lỗi SX') {
        sxRecords += 1;
        sxQty += qty;
      } else {
        khRecords += 1;
        khQty += qty;
      }

      if (ev.resolution === 'Đổi mới BH') exchangeQty += qty;
      else if (ev.resolution === 'Sửa chữa / Tái chế') repairQty += qty;
      else rejectQty += qty;

      addGroup(byPart, ev.partName, qty, ev);
      addGroup(byModel, ev.model, qty, ev);
      addGroup(bySupplier, ev.supplierName, qty, ev);
      addGroup(byDealer, ev.dealer, qty, ev);
    });

    const sortAgg = (m: Map<string, GroupAgg>) =>
      Array.from(m.values()).sort((a, b) => b.qty - a.qty || b.records - a.records);

    return {
      totalRecords: filteredEvaluations.length,
      totalQty,
      nccRecords,
      nccQty,
      nccPct: totalQty > 0 ? Math.round((nccQty / totalQty) * 100) : 0,
      sxRecords,
      sxQty,
      sxPct: totalQty > 0 ? Math.round((sxQty / totalQty) * 100) : 0,
      khRecords,
      khQty,
      khPct: totalQty > 0 ? Math.round((khQty / totalQty) * 100) : 0,
      exchangeQty,
      repairQty,
      rejectQty,
      byPart: sortAgg(byPart),
      byModel: sortAgg(byModel),
      bySupplier: sortAgg(bySupplier),
      byDealer: sortAgg(byDealer)
    };
  }, [filteredEvaluations]);

  const resetForm = (preserveContext: boolean) => {
    setEditingId(null);
    setCustomId('');
    setPartName('');
    setPartCode('');
    setQuantity(1);
    setFindingNote('');
    setVin('');
    setEngineNo('');
    setUsageDuration('');
    setNccFeedbackAction('');
    setImages([]);
    if (!preserveContext) {
      setModel('');
      setDealer('');
      setSupplierName('');
    }
  };

  const handleOpenCreateModal = () => {
    resetForm(false);
    setShowOptionalFields(false);
    setShowEntryModal(true);
  };

  const handleCloseEntryModal = () => {
    setShowEntryModal(false);
    if (editingId) {
      resetForm(false);
    }
  };

  const handleLoadForEdit = (ev: PartEvaluation) => {
    setEditingId(ev.id);
    setCustomId(ev.id);
    setReceivedDate(ev.receivedDate || getTodayIso());
    setInspector(ev.inspector || defaultInspector);
    setPartName(ev.partName || '');
    setPartCode(ev.partCode || '');
    setQuantity(Math.max(1, Number(ev.quantity) || 1));
    setModel(ev.model || '');
    setDealer(ev.dealer || '');
    setSupplierName(ev.supplierName || '');
    setRootCauseCategory(ev.rootCauseCategory || 'Lỗi NCC');
    setResolution(ev.resolution || 'Đổi mới BH');
    setFindingNote(ev.findingNote || '');
    setVin(ev.vin || '');
    setEngineNo(ev.engineNo || '');
    setUsageDuration(ev.usageDuration || '');
    setWarrantyStatus(ev.warrantyStatus || 'Còn bảo hành');
    setNccFeedbackAction(ev.nccFeedbackAction || '');
    setImages(ev.images || []);
    setShowOptionalFields(
      Boolean(ev.vin || ev.engineNo || ev.usageDuration || ev.nccFeedbackAction || (ev.images && ev.images.length > 0))
    );
    setShowEntryModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const compressedList: string[] = [];
    for (let i = 0; i < files.length; i++) {
      if (images.length + compressedList.length >= 3) break;
      const b64 = await compressImageFile(files[i], 500, 500, 0.4);
      if (b64) compressedList.push(b64);
    }
    if (compressedList.length > 0) {
      setImages((prev) => [...prev, ...compressedList].slice(0, 3));
    }
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPart = partName.trim();
    if (!cleanPart) {
      triggerToast?.('Vui lòng chọn hoặc nhập tên linh kiện lỗi.', 'error');
      return;
    }

    const finalId = editingId
      ? customId.trim() || editingId
      : customId.trim() || generateNextEvalId(evaluations, receivedDate);
    const nowIso = new Date().toISOString();
    const existing = editingId ? evaluations.find((x) => x.id === editingId) : undefined;

    const payload: PartEvaluation = {
      id: finalId,
      receivedDate: receivedDate || getTodayIso(),
      inspector: inspector.trim() || defaultInspector,
      partName: cleanPart,
      partCode: partCode.trim() || undefined,
      quantity: Math.max(1, Number(quantity) || 1),
      model: model.trim() || undefined,
      dealer: dealer.trim() || undefined,
      supplierName: supplierName.trim() || undefined,
      rootCauseCategory,
      resolution,
      findingNote: findingNote.trim() || undefined,
      vin: vin.trim() || undefined,
      engineNo: engineNo.trim() || undefined,
      usageDuration: usageDuration.trim() || undefined,
      warrantyStatus: warrantyStatus.trim() || undefined,
      nccFeedbackAction: nccFeedbackAction.trim() || undefined,
      images: images.length > 0 ? images : undefined,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso
    };

    const ok = onSaveEvaluation(payload, Boolean(editingId));
    if (ok) {
      const shouldKeepOpen = !editingId && keepContextOnSave;
      resetForm(shouldKeepOpen);
      if (!shouldKeepOpen) {
        setShowEntryModal(false);
      }
    }
  };

  // Xuất Excel gồm 2 sheet: Báo cáo tổng hợp + Chi tiết BM-KTTD-01
  const handleExportExcel = () => {
    if (filteredEvaluations.length === 0) {
      triggerToast?.('Chưa có dữ liệu đánh giá linh kiện lỗi để xuất Excel.', 'info');
      return;
    }
    const wb = XLSXStyle.utils.book_new();
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill: { fgColor: { rgb: '1E3A8A' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } }
      }
    };

    // Sheet 1: Bao_Cao_Tong_Hop
    const summaryRows: any[][] = [
      ['CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT - PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL / DK QMS)'],
      ['BÁO CÁO TỔNG HỢP ĐÁNH GIÁ LINH KIỆN LỖI (THEO BM-KTTD-01)'],
      [`Thương hiệu: DKBike - Xe cho cả gia đình | Ngày xuất: ${formatDateVn(getTodayIso())}`],
      [],
      ['CHỈ TIÊU TỔNG HỢP', 'SỐ BIÊN BẢN', 'TỔNG SỐ LƯỢNG LK', 'TỶ LỆ (%)'],
      ['Tổng cộng đã đánh giá', summaryStats.totalRecords, summaryStats.totalQty, '100%'],
      ['Lỗi Nhà cung cấp (Lỗi NCC)', summaryStats.nccRecords, summaryStats.nccQty, `${summaryStats.nccPct}%`],
      ['Lỗi Sản xuất / Lắp ráp DKBike (Lỗi SX)', summaryStats.sxRecords, summaryStats.sxQty, `${summaryStats.sxPct}%`],
      ['Lỗi Khách hàng / Đại lý sử dụng (Lỗi KH)', summaryStats.khRecords, summaryStats.khQty, `${summaryStats.khPct}%`],
      [],
      ['THỐNG KÊ THEO TÊN LINH KIỆN', 'SỐ LƯỢT', 'TỔNG SL', 'LỖI NCC', 'LỖI SX', 'LỖI KH', 'ĐỔI MỚI BH', 'TỶ TRỌNG (%)']
    ];

    summaryStats.byPart.forEach((g) => {
      const pct = summaryStats.totalQty > 0 ? Math.round((g.qty / summaryStats.totalQty) * 100) : 0;
      summaryRows.push([g.name, g.records, g.qty, g.nccQty, g.sxQty, g.khQty, g.exchangeQty, `${pct}%`]);
    });

    summaryRows.push([]);
    summaryRows.push(['THỐNG KÊ THEO DÒNG XE (MODEL)', 'SỐ LƯỢT', 'TỔNG SL', 'LỖI NCC', 'LỖI SX', 'LỖI KH', 'ĐỔI MỚI BH', 'TỶ TRỌNG (%)']);
    summaryStats.byModel.forEach((g) => {
      const pct = summaryStats.totalQty > 0 ? Math.round((g.qty / summaryStats.totalQty) * 100) : 0;
      summaryRows.push([g.name, g.records, g.qty, g.nccQty, g.sxQty, g.khQty, g.exchangeQty, `${pct}%`]);
    });

    const wsSummary = XLSXStyle.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [
      { wch: 36 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 }
    ];
    if (wsSummary['A1']) wsSummary['A1'].s = { font: { bold: true, sz: 12, color: { rgb: '1E3A8A' } } };
    if (wsSummary['A2']) wsSummary['A2'].s = { font: { bold: true, sz: 13, color: { rgb: '0F172A' } } };
    ['A5', 'B5', 'C5', 'D5'].forEach((c) => {
      if (wsSummary[c]) wsSummary[c].s = headerStyle;
    });
    ['A11', 'B11', 'C11', 'D11', 'E11', 'F11', 'G11', 'H11'].forEach((c) => {
      if (wsSummary[c]) wsSummary[c].s = headerStyle;
    });

    // Sheet 2: Chi_Tiet_BM_KTTD_01
    const detailHeaders = [
      'STT',
      'Mã BB (BM-KTTD-01)',
      'Ngày tiếp nhận',
      'Nhân sự đánh giá',
      'Linh kiện lỗi',
      'Số lượng',
      'Dòng xe',
      'Đại lý / Khách hàng',
      'Nhà cung cấp',
      'Nguyên nhân gốc',
      'Phương án xử lý',
      'Hiện trạng & Kết quả giám định',
      'Số khung (VIN)',
      'Số động cơ',
      'Thời gian đã dùng',
      'Phản hồi NCC / Chịu phí'
    ];
    const detailRows = filteredEvaluations.map((ev, idx) => [
      idx + 1,
      ev.id,
      formatDateVn(ev.receivedDate),
      ev.inspector || defaultInspector,
      ev.partName,
      ev.quantity || 1,
      ev.model || '',
      ev.dealer || '',
      ev.supplierName || '',
      ev.rootCauseCategory,
      ev.resolution,
      ev.findingNote || '',
      ev.vin || '',
      ev.engineNo || '',
      ev.usageDuration || '',
      ev.nccFeedbackAction || ''
    ]);
    const wsDetail = XLSXStyle.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
    wsDetail['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 14 },
      { wch: 20 },
      { wch: 24 },
      { wch: 10 },
      { wch: 16 },
      { wch: 26 },
      { wch: 22 },
      { wch: 16 },
      { wch: 20 },
      { wch: 38 },
      { wch: 20 },
      { wch: 20 },
      { wch: 16 },
      { wch: 26 }
    ];
    detailHeaders.forEach((_, idx) => {
      const cellRef = XLSXStyle.utils.encode_cell({ r: 0, c: idx });
      if (wsDetail[cellRef]) wsDetail[cellRef].s = headerStyle;
    });

    XLSXStyle.utils.book_append_sheet(wb, wsSummary, 'Bao_Cao_Tong_Hop');
    XLSXStyle.utils.book_append_sheet(wb, wsDetail, 'Chi_Tiet_BM_KTTD_01');
    XLSXStyle.writeFile(wb, `DKBike_QLCL_DanhGia_LinhKienLoi_${getTodayIso()}.xlsx`);
  };

  // Copy nhanh nội dung Báo cáo tổng hợp
  const handleCopyReportText = () => {
    const top3 = summaryStats.byPart
      .slice(0, 5)
      .map((p, i) => `${i + 1}. ${p.name}: ${p.qty} LK (${p.records} lượt - NCC: ${p.nccQty}, SX: ${p.sxQty}, KH: ${p.khQty})`)
      .join('\n');
    const txt = [
      `BÁO CÁO TỔNG HỢP ĐÁNH GIÁ LINH KIỆN LỖI (BM-KTTD-01)`,
      `Công ty TNHH Xe điện DK Việt Nhật - Phòng QLCL (DK QMS)`,
      `Tổng số đã đánh giá: ${summaryStats.totalRecords} biên bản / ${summaryStats.totalQty} linh kiện`,
      `- Lỗi NCC: ${summaryStats.nccQty} LK (${summaryStats.nccPct}%)`,
      `- Lỗi SX (Lắp ráp): ${summaryStats.sxQty} LK (${summaryStats.sxPct}%)`,
      `- Lỗi KH (Sử dụng): ${summaryStats.khQty} LK (${summaryStats.khPct}%)`,
      `- Phương án xử lý: Đổi mới BH (${summaryStats.exchangeQty}) | Sửa chữa/Tái chế (${summaryStats.repairQty}) | Từ chối BH (${summaryStats.rejectQty})`,
      top3 ? `\nTop linh kiện lỗi:\n${top3}` : ''
    ].join('\n');
    navigator.clipboard?.writeText(txt).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
      triggerToast?.('Đã copy báo cáo tổng hợp để dán gửi Zalo/Email!', 'success');
    });
  };

  // In Báo cáo tổng hợp A4
  const handlePrintSummaryReport = () => {
    const win = window.open('', '_blank', 'width=1024,height=800');
    if (!win) {
      triggerToast?.('Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép pop-up.', 'error');
      return;
    }
    const rowsHtml = filteredEvaluations
      .map(
        (ev, idx) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="font-family:monospace;">${escapeHtml(ev.id)}</td>
          <td style="text-align:center;">${escapeHtml(formatDateVn(ev.receivedDate))}</td>
          <td><b>${escapeHtml(ev.partName)}</b>${ev.model ? `<br/><span style="font-size:10px;color:#475569;">Model: ${escapeHtml(ev.model)}</span>` : ''}</td>
          <td style="text-align:center;font-weight:bold;">${ev.quantity || 1}</td>
          <td>${escapeHtml(ev.dealer || '--')}${ev.supplierName ? `<br/><span style="font-size:10px;color:#0f766e;">NCC: ${escapeHtml(ev.supplierName)}</span>` : ''}</td>
          <td>${escapeHtml(ev.findingNote || '--')}</td>
          <td style="text-align:center;font-weight:bold;">${escapeHtml(ev.rootCauseCategory)}</td>
          <td style="text-align:center;">${escapeHtml(ev.resolution)}</td>
        </tr>`
      )
      .join('');

    const partRowsHtml = summaryStats.byPart
      .slice(0, 10)
      .map((p, idx) => {
        const pct = summaryStats.totalQty > 0 ? Math.round((p.qty / summaryStats.totalQty) * 100) : 0;
        return `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td><b>${escapeHtml(p.name)}</b></td>
            <td style="text-align:center;">${p.records}</td>
            <td style="text-align:center;font-weight:bold;">${p.qty}</td>
            <td style="text-align:center;">${p.nccQty}</td>
            <td style="text-align:center;">${p.sxQty}</td>
            <td style="text-align:center;">${p.khQty}</td>
            <td style="text-align:center;">${pct}%</td>
          </tr>`;
      })
      .join('');

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Báo cáo tổng hợp đánh giá linh kiện lỗi - DKBike QLCL</title>
        <style>
          @page { size: A4 landscape; margin: 10mm 12mm; }
          body { font-family: 'Times New Roman', serif; color: #000; font-size: 11px; line-height: 1.35; }
          .hdr-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .hdr-table td { border: 1px solid #000; padding: 6px 10px; }
          .title { text-align: center; font-size: 16px; font-weight: bold; margin: 10px 0 3px; text-transform: uppercase; }
          .sub { text-align: center; font-style: italic; font-size: 11px; margin-bottom: 10px; }
          .kpi-grid { display: table; width: 100%; border-collapse: separate; border-spacing: 6px 0; margin-bottom: 10px; }
          .kpi-box { display: table-cell; width: 25%; border: 1px solid #334155; padding: 6px 8px; background: #f8fafc; }
          table.data { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5px; }
          table.data th, table.data td { border: 1px solid #000; padding: 4px 5px; vertical-align: top; }
          table.data th { background: #f1f5f9; font-weight: bold; text-align: center; }
          .sec-title { font-weight: bold; font-size: 12px; text-transform: uppercase; margin: 8px 0 4px; }
          .signs { width: 100%; margin-top: 14px; border-collapse: collapse; }
          .signs td { width: 33.3%; text-align: center; vertical-align: top; }
        </style>
      </head>
      <body>
        <table class="hdr-table">
          <tr>
            <td style="width:65%;">
              <div style="font-weight:bold;font-size:12.5px;">CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT</div>
              <div style="font-weight:bold;">PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL) • DK QMS</div>
              <div style="font-size:10px;font-style:italic;">Thương hiệu: DKBike — Xe cho cả gia đình</div>
            </td>
            <td style="width:35%;">
              <div><b>Căn cứ biểu mẫu:</b> BM-KTTD-01</div>
              <div><b>Ngày lập báo cáo:</b> ${escapeHtml(formatDateVn(getTodayIso()))}</div>
              <div><b>Người tổng hợp:</b> ${escapeHtml(defaultInspector)}</div>
            </td>
          </tr>
        </table>

        <div class="title">BÁO CÁO TỔNG HỢP ĐÁNH GIÁ LINH KIỆN LỖI THỊ TRƯỜNG &amp; BẢO HÀNH</div>
        <div class="sub">(Tổng hợp từ biên bản giám định kỹ thuật BM-KTTD-01 • Số lượng bản ghi: ${summaryStats.totalRecords})</div>

        <div class="kpi-grid">
          <div class="kpi-box"><b>TỔNG LINH KIỆN ĐÁNH GIÁ</b><br/><span style="font-size:15px;font-weight:bold;">${summaryStats.totalQty}</span> linh kiện (${summaryStats.totalRecords} BB)</div>
          <div class="kpi-box"><b>LỖI NHÀ CUNG CẤP (NCC)</b><br/><span style="font-size:15px;font-weight:bold;">${summaryStats.nccQty}</span> LK (${summaryStats.nccPct}%)</div>
          <div class="kpi-box"><b>LỖI SẢN XUẤT / LẮP RÁP</b><br/><span style="font-size:15px;font-weight:bold;">${summaryStats.sxQty}</span> LK (${summaryStats.sxPct}%)</div>
          <div class="kpi-box"><b>LỖI KHÁCH HÀNG SỬ DỤNG</b><br/><span style="font-size:15px;font-weight:bold;">${summaryStats.khQty}</span> LK (${summaryStats.khPct}%)</div>
        </div>

        <div class="sec-title">I. Tổng hợp theo nhóm linh kiện hỏng (Top 10)</div>
        <table class="data">
          <thead>
            <tr>
              <th style="width:34px;">STT</th>
              <th>Tên linh kiện</th>
              <th style="width:70px;">Số lượt</th>
              <th style="width:70px;">Tổng SL</th>
              <th style="width:70px;">Lỗi NCC</th>
              <th style="width:70px;">Lỗi SX</th>
              <th style="width:70px;">Lỗi KH</th>
              <th style="width:70px;">Tỷ trọng</th>
            </tr>
          </thead>
          <tbody>${partRowsHtml || '<tr><td colspan="8" style="text-align:center;">Không có dữ liệu</td></tr>'}</tbody>
        </table>

        <div class="sec-title">II. Bảng tổng hợp chi tiết linh kiện đã đánh giá</div>
        <table class="data">
          <thead>
            <tr>
              <th style="width:32px;">STT</th>
              <th style="width:105px;">Mã BB</th>
              <th style="width:78px;">Ngày nhận</th>
              <th style="width:140px;">Linh kiện &amp; Dòng xe</th>
              <th style="width:40px;">SL</th>
              <th style="width:140px;">Đại lý / NCC</th>
              <th>Hiện trạng &amp; Kết quả giám định</th>
              <th style="width:85px;">Nguyên nhân</th>
              <th style="width:100px;">Phương án xử lý</th>
            </tr>
          </thead>
          <tbody>${rowsHtml || '<tr><td colspan="9" style="text-align:center;">Không có dữ liệu</td></tr>'}</tbody>
        </table>

        <table class="signs">
          <tr>
            <td><b>NGƯỜI LẬP &amp; THẨM ĐỊNH</b><br/><i>(Ký, ghi rõ họ tên)</i><br/><br/><br/><b>${escapeHtml(defaultInspector)}</b></td>
            <td><b>ĐẠI DIỆN PHÒNG SAU BÁN HÀNG</b><br/><i>(Xác nhận)</i><br/><br/><br/>........................................</td>
            <td><b>TRƯỞNG PHÒNG QLCL</b><br/><i>(Phê duyệt)</i><br/><br/><br/>........................................</td>
          </tr>
        </table>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  // In 1 Biên bản BM-KTTD-01 đơn lẻ cho từng dòng
  const handlePrintSingleBmKttd01 = (ev: PartEvaluation) => {
    const win = window.open('', '_blank', 'width=900,height=800');
    if (!win) {
      triggerToast?.('Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép pop-up.', 'error');
      return;
    }
    const tick = (cond: boolean) => (cond ? '☑' : '□');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>BM-KTTD-01 - ${escapeHtml(ev.id)}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 14mm; }
          body { font-family: 'Times New Roman', serif; color: #000; font-size: 12px; line-height: 1.4; }
          .hdr { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .hdr td { border: 1px solid #000; padding: 6px 10px; }
          .title { text-align: center; font-size: 15px; font-weight: bold; text-transform: uppercase; margin: 10px 0 2px; }
          .sub { text-align: center; font-style: italic; font-size: 11px; margin-bottom: 12px; }
          .meta { width: 100%; margin-bottom: 10px; border-collapse: collapse; }
          .meta td { padding: 4px 4px; border-bottom: 1px dotted #94a3b8; width: 50%; }
          .tbl { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .tbl th, .tbl td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
          .tbl th { background: #f3f4f6; text-align: center; }
          .box { border: 1px solid #000; padding: 8px 10px; margin-bottom: 10px; }
          .signs { width: 100%; margin-top: 18px; border-collapse: collapse; }
          .signs td { width: 33.3%; text-align: center; vertical-align: top; }
        </style>
      </head>
      <body>
        <table class="hdr">
          <tr>
            <td style="width:62%;text-align:center;">
              <div style="font-weight:bold;font-size:13px;">CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT</div>
              <div style="font-weight:bold;">PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL)</div>
              <div style="font-size:10.5px;font-style:italic;">DKBike - Xe cho cả gia đình • DK QMS</div>
            </td>
            <td style="width:38%;">
              <div><b>Mã Biểu Mẫu:</b> BM-KTTD-01</div>
              <div><b>Mã Quy Trình:</b> QT-KTTD-01</div>
              <div><b>Lần Ban Hành:</b> 01 | 01/11/2026</div>
            </td>
          </tr>
        </table>

        <div class="title">BIÊN BẢN GIÁM ĐỊNH BẢO HÀNH &amp; NGUYÊN NHÂN SỰ CỐ</div>
        <div class="sub">(Thẩm định chuyên sâu linh kiện lỗi bảo hành gửi về từ mạng lưới Đại lý toàn quốc)</div>

        <table class="meta">
          <tr>
            <td><b>Mã biên bản giám định:</b> ${escapeHtml(ev.id)}</td>
            <td><b>Ngày tiếp nhận mẫu:</b> ${escapeHtml(formatDateVn(ev.receivedDate))}</td>
          </tr>
          <tr>
            <td><b>Tên Đại lý / Khách hàng:</b> ${escapeHtml(ev.dealer || '............................................')}</td>
            <td><b>Dòng xe (Model):</b> ${escapeHtml(ev.model || '............................................')}</td>
          </tr>
          <tr>
            <td><b>Số Khung xe (VIN):</b> ${escapeHtml(ev.vin || '............................................')}</td>
            <td><b>Số Động cơ / Cụm chi tiết:</b> ${escapeHtml(ev.engineNo || '............................................')}</td>
          </tr>
          <tr>
            <td><b>Nhà cung cấp liên quan:</b> ${escapeHtml(ev.supplierName || '............................................')}</td>
            <td><b>Thời gian đã sử dụng:</b> ${escapeHtml(ev.usageDuration || '............................................')}</td>
          </tr>
        </table>

        <div style="font-weight:bold;text-transform:uppercase;margin:8px 0 4px;">I. KẾT QUẢ GIÁM ĐỊNH MỔ XẺ CHI TIẾT LINH KIỆN HƯ HỎNG</div>
        <table class="tbl">
          <thead>
            <tr>
              <th style="width:36px;">STT</th>
              <th style="width:160px;">Linh kiện yêu cầu BH</th>
              <th>Hiện trạng thực tế &amp; Kết quả mổ xẻ giám định</th>
              <th style="width:190px;">Kết luận phân định trách nhiệm</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align:center;font-weight:bold;">1</td>
              <td>
                <b>${escapeHtml(ev.partName)}</b><br/>
                Số lượng: <b>${ev.quantity || 1}</b><br/>
                ${ev.warrantyStatus ? `Hạn BH: ${escapeHtml(ev.warrantyStatus)}` : ''}
              </td>
              <td style="min-height:80px;">${escapeHtml(ev.findingNote || '..................................................................................')}</td>
              <td>
                ${tick(ev.rootCauseCategory === 'Lỗi NCC')} Lỗi do Nhà cung cấp linh kiện<br/>
                ${tick(ev.rootCauseCategory === 'Lỗi SX')} Lỗi do Quá trình lắp ráp DKBike<br/>
                ${tick(ev.rootCauseCategory === 'Lỗi KH')} Lỗi do Khách hàng / Đại lý sử dụng
              </td>
            </tr>
          </tbody>
        </table>

        <div style="font-weight:bold;text-transform:uppercase;margin:10px 0 4px;">II. KẾT LUẬN BẢO HÀNH &amp; PHƯƠNG ÁN XỬ LÝ</div>
        <div class="box">
          <div style="margin-bottom:6px;">
            <b>Phương án xử lý linh kiện:</b><br/>
            ${tick(ev.resolution === 'Đổi mới BH')} ĐỔI MỚI LINH KIỆN ĐẠT CHUẨN CHO ĐẠI LÝ &nbsp;&nbsp;
            ${tick(ev.resolution === 'Sửa chữa / Tái chế')} SỬA CHỮA / TÁI CHẾ &nbsp;&nbsp;
            ${tick(ev.resolution === 'Từ chối BH')} TỪ CHỐI BẢO HÀNH (Lỗi sử dụng)
          </div>
          <div>
            <b>Hành động phản hồi Nhà cung cấp / Bộ phận chịu chi phí:</b>
            ${escapeHtml(ev.nccFeedbackAction || '........................................................................................................')}
          </div>
        </div>

        <table class="signs">
          <tr>
            <td><b>THỰC THI [T]</b><br/>Kỹ sư Thẩm định Kỹ thuật (KTTĐ)<br/><br/><br/><b>${escapeHtml(ev.inspector || defaultInspector)}</b></td>
            <td><b>XÁC NHẬN [H]</b><br/>Đại diện Phòng Sau bán hàng<br/><br/><br/>........................................</td>
            <td><b>PHÊ DUYỆT [P]</b><br/>Trưởng phòng QLCL<br/><br/><br/>........................................</td>
          </tr>
        </table>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  const activeGroupList =
    reportGroupTab === 'part'
      ? summaryStats.byPart
      : reportGroupTab === 'model'
        ? summaryStats.byModel
        : reportGroupTab === 'supplier'
          ? summaryStats.bySupplier
          : summaryStats.byDealer;

  const hasActiveFilters = Boolean(
    searchTerm ||
      filterCause !== 'All' ||
      filterResolution !== 'All' ||
      filterModel !== 'All' ||
      filterTime !== 'all' ||
      filterMonth !== 'All' ||
      filterYear !== 'All'
  );

  return (
    <div className="space-y-4">
      {/* =====================================================================
          1. POPUP MODAL NHẬP NHANH ĐÁNH GIÁ LINH KIỆN LỖI (BM-KTTD-01)
         ===================================================================== */}
      {showEntryModal && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseEntryModal();
          }}
        >
          <div className="max-w-5xl w-full max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl">
            <form
              id="part_eval_quick_form"
              onSubmit={handleSubmit}
              className="bg-white border border-slate-300 rounded-2xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3
                    className="text-sm sm:text-base font-black uppercase tracking-wide flex items-center gap-2"
                    style={{ color: '#ffffff' }}
                  >
                    <PackageCheck className="w-5 h-5 text-amber-300 shrink-0" />
                    <span>{editingId ? `Chỉnh sửa đánh giá: ${editingId}` : 'Nhập đánh giá linh kiện lỗi (BM-KTTD-01)'}</span>
                  </h3>
                  <p className="text-xs text-indigo-100 mt-1">
                    Nhân sự thẩm định: <b className="text-white">{inspector}</b> • Tự động lưu SafeStorage &amp; đồng bộ Cloud tức thời
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-mono bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 whitespace-nowrap">
                    <span className="text-indigo-100">
                      Mã BB: <strong className="text-amber-300">{previewAutoId}</strong>
                    </span>
                    <span className="text-white/40">•</span>
                    <input
                      type="date"
                      value={receivedDate}
                      onChange={(e) => setReceivedDate(e.target.value)}
                      className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                      title="Ngày tiếp nhận / đánh giá"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseEntryModal}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                    title="Đóng cửa sổ nhập liệu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                {/* Bấm chọn nhanh linh kiện hay gặp */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-extrabold text-slate-600 mr-1 whitespace-nowrap">Chọn nhanh:</span>
                  {COMMON_PARTS_QUICK_LIST.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPartName(item)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${
                        partName === item
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                          : 'bg-white hover:bg-indigo-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                {/* Hàng 1: 1. Linh kiện lỗi * | Hạn bảo hành | Số lượng */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-6">
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5 whitespace-nowrap">
                      1. Linh kiện lỗi <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      list="dkqms_part_eval_parts"
                      value={partName}
                      onChange={(e) => setPartName(e.target.value)}
                      placeholder="Bấm chọn nhanh ở trên hoặc nhập tên linh kiện..."
                      className="w-full h-10 border border-slate-300 rounded-lg px-3.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 bg-white"
                    />
                    <datalist id="dkqms_part_eval_parts">
                      {suggestedPartNames.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5 whitespace-nowrap">
                      Tình trạng bảo hành
                    </label>
                    <select
                      value={warrantyStatus}
                      onChange={(e) => setWarrantyStatus(e.target.value)}
                      aria-label="Tình trạng bảo hành"
                      className="w-full h-10 border border-slate-300 bg-white rounded-lg px-3 text-xs font-bold text-indigo-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                    >
                      <option value="Còn bảo hành">Còn bảo hành</option>
                      <option value="Hết bảo hành">Hết bảo hành</option>
                      <option value="Chưa rõ">Chưa rõ</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5 whitespace-nowrap">
                      Số lượng
                    </label>
                    <div className="flex items-center h-10 border border-slate-300 rounded-lg overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="h-full px-3 bg-slate-100 hover:bg-slate-200 font-black text-slate-700 cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value || '1', 10) || 1))}
                        className="w-full text-center h-full text-xs font-black text-slate-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="h-full px-3 bg-slate-100 hover:bg-slate-200 font-black text-slate-700 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hàng 2: 3 cột cân đối (Dòng xe | Đại lý gửi về | Nhà cung cấp) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5 whitespace-nowrap">
                      Dòng xe (tùy chọn)
                    </label>
                    <input
                      type="text"
                      list="dkqms_part_eval_models"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="VD: DK EZ5, DK S1..."
                      className="w-full h-10 border border-slate-300 rounded-lg px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 bg-white"
                    />
                    <datalist id="dkqms_part_eval_models">
                      {models.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5 whitespace-nowrap">
                      Đại lý gửi về (tùy chọn)
                    </label>
                    <input
                      type="text"
                      list="dkqms_part_eval_dealers"
                      value={dealer}
                      onChange={(e) => setDealer(e.target.value)}
                      placeholder="Chọn hoặc gõ tên đại lý..."
                      className="w-full h-10 border border-slate-300 rounded-lg px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 bg-white"
                    />
                    <datalist id="dkqms_part_eval_dealers">
                      {dealers.map((dl) => (
                        <option key={dl} value={dl} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label
                      className={`text-xs font-extrabold block mb-1.5 whitespace-nowrap ${
                        rootCauseCategory === 'Lỗi NCC' ? 'text-rose-700' : 'text-slate-700'
                      }`}
                    >
                      Nhà cung cấp (nếu biết)
                    </label>
                    <input
                      type="text"
                      list="dkqms_part_eval_suppliers"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="Chọn hoặc gõ tên NCC..."
                      className={`w-full h-10 border rounded-lg px-3.5 text-xs font-semibold text-slate-900 focus:outline-none ${
                        rootCauseCategory === 'Lỗi NCC'
                          ? 'border-rose-300 bg-rose-50/40 focus:border-rose-500'
                          : 'border-slate-300 bg-white focus:border-indigo-600'
                      }`}
                    />
                    <datalist id="dkqms_part_eval_suppliers">
                      {suppliers.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Hàng 3: Nguyên nhân gốc & Phương án xử lý thẳng hàng */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5 whitespace-nowrap">
                      2. Kết luận nguyên nhân gốc
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {ROOT_CAUSE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRootCauseCategory(opt.value)}
                          className={`h-10 px-2 rounded-lg text-[11px] sm:text-xs font-extrabold border transition cursor-pointer flex items-center justify-center whitespace-nowrap ${
                            rootCauseCategory === opt.value
                              ? opt.activeClass
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                          title={opt.fullLabel}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5 whitespace-nowrap">
                      3. Phương án xử lý bảo hành
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {RESOLUTION_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setResolution(opt.value)}
                          className={`h-10 px-2 rounded-lg text-[11px] sm:text-xs font-extrabold border transition cursor-pointer flex items-center justify-center whitespace-nowrap ${
                            resolution === opt.value
                              ? opt.activeClass
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hàng 4: Hiện trạng & kết quả giám định (full width) */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1.5">
                    4. Hiện trạng hư hỏng &amp; Kết quả kiểm tra giám định (ngắn gọn, tùy chọn)
                  </label>
                  <textarea
                    rows={2}
                    value={findingNote}
                    onChange={(e) => setFindingNote(e.target.value)}
                    placeholder="VD: Đo không thông mạch, cháy MOSFET pha IC, rò nước giắc..."
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 bg-white"
                  />
                </div>

          {/* Khu vực mở rộng thông tin phụ của BM-KTTD-01 (ẩn mặc định) */}
          {showOptionalFields && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Mã biên bản (tự sinh nếu trống)</label>
                  <input
                    type="text"
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    placeholder={generateNextEvalId(evaluations, receivedDate)}
                    className="w-full border border-slate-300 bg-white rounded px-2.5 py-1.5 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Nhân sự kiểm tra đánh giá</label>
                  <input
                    type="text"
                    value={inspector}
                    onChange={(e) => setInspector(e.target.value)}
                    className="w-full border border-slate-300 bg-white rounded px-2.5 py-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Số Khung xe (VIN)</label>
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => setVin(e.target.value)}
                    placeholder="Số khung..."
                    className="w-full border border-slate-300 bg-white rounded px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Số Động cơ / Cụm chi tiết</label>
                  <input
                    type="text"
                    value={engineNo}
                    onChange={(e) => setEngineNo(e.target.value)}
                    placeholder="Số động cơ..."
                    className="w-full border border-slate-300 bg-white rounded px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Thời gian đã sử dụng (km / tháng)</label>
                  <input
                    type="text"
                    value={usageDuration}
                    onChange={(e) => setUsageDuration(e.target.value)}
                    placeholder="VD: 3 tháng / 1.200km"
                    className="w-full border border-slate-300 bg-white rounded px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Hành động phản hồi NCC / Bộ phận chịu phí</label>
                  <input
                    type="text"
                    value={nccFeedbackAction}
                    onChange={(e) => setNccFeedbackAction(e.target.value)}
                    placeholder="VD: Trừ công nợ NCC / Yêu cầu gửi bù 1-1..."
                    className="w-full border border-slate-300 bg-white rounded px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-200">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 cursor-pointer">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Đính kèm ảnh (tối đa 3 ảnh, nén &lt; 30KB)</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img} alt="LK" className="w-11 h-11 object-cover rounded border border-slate-300" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

                {/* Thanh nút Lưu + mở rộng chi tiết */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowOptionalFields((v) => !v)}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5 cursor-pointer bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200"
                    >
                      {showOptionalFields ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>{showOptionalFields ? 'Thu gọn' : 'Chi tiết thêm'}</span>
                    </button>

                    {!editingId && (
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={keepContextOnSave}
                          onChange={(e) => setKeepContextOnSave(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600"
                        />
                        <span>Giữ lại Dòng xe / Đại lý để nhập tiếp</span>
                      </label>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleCloseEntryModal}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      {editingId ? 'Hủy sửa' : 'Đóng'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-lg transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{editingId ? 'Lưu cập nhật' : 'Lưu đánh giá'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. THANH CÔNG CỤ NHẬP LIỆU, ẨN/HIỆN BỘ LỌC & BÁO CÁO TỔNG HỢP
         ===================================================================== */}
      <div className="bg-white border border-slate-300 rounded-xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-3.5 py-2 rounded-lg text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              title="Nhập đánh giá linh kiện lỗi (BM-KTTD-01)"
            >
              <Plus className="w-4 h-4" />
              <span>Nhập mới</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFilterExpanded((v) => !v)}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer relative ${
                isFilterExpanded || hasActiveFilters
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Ẩn / Hiện bộ lọc dữ liệu"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Bộ lọc</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" title="Đang áp dụng bộ lọc" />
              )}
              {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterCause('All');
                  setFilterResolution('All');
                  setFilterModel('All');
                  setFilterTime('all');
                  setFilterMonth('All');
                  setFilterYear('All');
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowSummaryReport((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                showSummaryReport
                  ? 'bg-indigo-700 text-white border-indigo-800'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Ẩn / Hiện báo cáo tổng hợp"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Tổng hợp</span>
            </button>
            <button
              type="button"
              onClick={handleCopyReportText}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 transition flex items-center gap-1 cursor-pointer"
              title="Copy báo cáo tóm tắt để gửi nhanh"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSummary ? 'Đã copy' : 'Copy'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrintSummaryReport}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition flex items-center gap-1 cursor-pointer"
              title="In báo cáo tổng hợp"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1 cursor-pointer"
              title="Xuất file Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel ({filteredEvaluations.length})</span>
            </button>
          </div>
        </div>

        {isFilterExpanded && (
          <div className="pt-3 border-t border-slate-200 flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm linh kiện, mã BB, đại lý, model..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
              {(
                [
                  { id: 'all', label: 'Tất cả' },
                  { id: 'today', label: 'Hôm nay' },
                  { id: 'week', label: 'Tuần này' },
                  { id: 'month', label: 'Tháng này' }
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilterTime(t.id)}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    filterTime === t.id ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <select
              value={filterCause}
              onChange={(e) => setFilterCause(e.target.value)}
              className="border border-slate-300 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700"
            >
              <option value="All">Nguyên nhân: Tất cả</option>
              <option value="Lỗi NCC">Lỗi NCC</option>
              <option value="Lỗi SX">Lỗi SX (Lắp ráp)</option>
              <option value="Lỗi KH">Lỗi KH (Sử dụng)</option>
            </select>

            <select
              value={filterResolution}
              onChange={(e) => setFilterResolution(e.target.value)}
              className="border border-slate-300 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700"
            >
              <option value="All">Xử lý: Tất cả</option>
              <option value="Đổi mới BH">Đổi mới BH</option>
              <option value="Sửa chữa / Tái chế">Sửa chữa / Tái chế</option>
              <option value="Từ chối BH">Từ chối BH</option>
            </select>

            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="border border-slate-300 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700"
            >
              <option value="All">Dòng xe: Tất cả</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="border border-slate-300 bg-slate-50 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700"
            >
              <option value="All">Tháng: Tất cả</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m)}>
                  Tháng {m}
                </option>
              ))}
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="border border-slate-300 bg-slate-50 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700"
            >
              <option value="All">Năm: Tất cả</option>
              {availableYears.map((y) => (
                <option key={y} value={String(y)}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* =====================================================================
          3. BÁO CÁO TỔNG HỢP (KPI CARDS + THỐNG KÊ NHÓM)
         ===================================================================== */}
      {showSummaryReport && (
        <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-700" />
                Báo cáo tổng hợp đánh giá linh kiện lỗi
              </h3>
              <p className="text-[11px] text-slate-500">
                Thống kê trực tiếp theo dữ liệu đang lọc • Phân định tỷ lệ trách nhiệm NCC / Sản xuất / Khách hàng
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Đổi mới BH: {summaryStats.exchangeQty} LK
              </span>
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                Sửa chữa/Tái chế: {summaryStats.repairQty} LK
              </span>
              <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                Từ chối BH: {summaryStats.rejectQty} LK
              </span>
            </div>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Tổng linh kiện đã đánh giá</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 font-mono">{summaryStats.totalQty}</span>
                <span className="text-xs font-bold text-slate-500">LK ({summaryStats.totalRecords} BB)</span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/70">
              <span className="text-[10px] font-bold uppercase text-rose-700 block">Lỗi Nhà cung cấp (NCC)</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-700 font-mono">{summaryStats.nccQty}</span>
                <span className="text-xs font-extrabold text-rose-600">{summaryStats.nccPct}% ({summaryStats.nccRecords} BB)</span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">Lỗi Sản xuất / Lắp ráp DKBike</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-800 font-mono">{summaryStats.sxQty}</span>
                <span className="text-xs font-extrabold text-amber-700">{summaryStats.sxPct}% ({summaryStats.sxRecords} BB)</span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-100/70">
              <span className="text-[10px] font-bold uppercase text-slate-700 block">Lỗi Khách hàng / Đại lý sử dụng</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800 font-mono">{summaryStats.khQty}</span>
                <span className="text-xs font-extrabold text-slate-600">{summaryStats.khPct}% ({summaryStats.khRecords} BB)</span>
              </div>
            </div>
          </div>

          {/* Bảng báo cáo phân nhóm */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
              {(
                [
                  { id: 'part', label: 'Theo Linh kiện lỗi' },
                  { id: 'model', label: 'Theo Dòng xe' },
                  { id: 'supplier', label: 'Theo Nhà cung cấp' },
                  { id: 'dealer', label: 'Theo Đại lý' }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setReportGroupTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    reportGroupTab === tab.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-[10px] font-extrabold uppercase text-slate-700 border-b border-slate-300">
                  <tr>
                    <th className="p-2 text-center w-10 border-r border-slate-200">STT</th>
                    <th className="p-2 border-r border-slate-200">Nhóm thống kê</th>
                    <th className="p-2 text-center w-20 border-r border-slate-200">Số lượt</th>
                    <th className="p-2 text-center w-20 border-r border-slate-200">Tổng SL</th>
                    <th className="p-2 text-center w-20 border-r border-slate-200 text-rose-700">Lỗi NCC</th>
                    <th className="p-2 text-center w-20 border-r border-slate-200 text-amber-700">Lỗi SX</th>
                    <th className="p-2 text-center w-20 border-r border-slate-200">Lỗi KH</th>
                    <th className="p-2 text-center w-24 border-r border-slate-200 text-emerald-700">Đổi mới BH</th>
                    <th className="p-2 w-36">Tỷ trọng SL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeGroupList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-slate-400 italic">
                        Chưa có dữ liệu thống kê cho nhóm này.
                      </td>
                    </tr>
                  ) : (
                    activeGroupList.map((g, idx) => {
                      const pct = summaryStats.totalQty > 0 ? Math.round((g.qty / summaryStats.totalQty) * 100) : 0;
                      return (
                        <tr key={g.name} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-900 border-r border-slate-200">{g.name}</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">{g.records}</td>
                          <td className="p-2 text-center font-mono font-black text-indigo-700 border-r border-slate-200">{g.qty}</td>
                          <td className="p-2 text-center font-mono text-rose-700 font-bold border-r border-slate-200">{g.nccQty}</td>
                          <td className="p-2 text-center font-mono text-amber-700 font-bold border-r border-slate-200">{g.sxQty}</td>
                          <td className="p-2 text-center font-mono text-slate-700 border-r border-slate-200">{g.khQty}</td>
                          <td className="p-2 text-center font-mono text-emerald-700 font-bold border-r border-slate-200">{g.exchangeQty}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="font-mono font-bold text-[11px] text-slate-700 w-9 text-right">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. BẢNG TỔNG HỢP CHI TIẾT CÁC LINH KIỆN ĐÃ ĐÁNH GIÁ
         ===================================================================== */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-extrabold uppercase text-slate-800">
              Bảng tổng hợp chi tiết đánh giá linh kiện lỗi ({filteredEvaluations.length} biên bản • {summaryStats.totalQty} linh kiện)
            </h3>
            <p className="text-[11px] text-slate-500">
              Theo dõi từng biên bản BM-KTTD-01 • Bấm biểu tượng văn bản để xem / in biên bản chuẩn A4
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700 border-b border-slate-300">
              <tr>
                <th className="p-2.5 text-center w-10 border-r border-slate-200">STT</th>
                <th className="p-2.5 border-r border-slate-200 w-36">Mã BB &amp; Ngày</th>
                <th className="p-2.5 border-r border-slate-200 w-44">Linh kiện &amp; SL</th>
                <th className="p-2.5 border-r border-slate-200 w-[22%] min-w-[210px]">Dòng xe / Đại lý / NCC</th>
                <th className="p-2.5 border-r border-slate-200 w-[22%] min-w-[210px]">Hiện trạng &amp; Kết quả giám định</th>
                <th className="p-2.5 text-center border-r border-slate-200 w-28">Nguyên nhân gốc</th>
                <th className="p-2.5 text-center border-r border-slate-200 w-32">Phương án xử lý</th>
                <th className="p-2.5 text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                    Chưa có biên bản đánh giá linh kiện lỗi nào. Anh Nguyễn Văn Diệm có thể bấm chọn nhanh ở khung nhập phía trên để thêm mới.
                  </td>
                </tr>
              ) : (
                filteredEvaluations.map((ev, idx) => {
                  const causeMeta = ROOT_CAUSE_OPTIONS.find((o) => o.value === ev.rootCauseCategory) || ROOT_CAUSE_OPTIONS[0];
                  const resMeta = RESOLUTION_OPTIONS.find((o) => o.value === ev.resolution) || RESOLUTION_OPTIONS[0];
                  return (
                    <tr key={ev.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="p-2.5 text-center font-mono text-slate-500 border-r border-slate-200">{idx + 1}</td>
                      <td className="p-2.5 border-r border-slate-200">
                        <span className="font-mono font-extrabold text-indigo-700 block text-[11px]">{ev.id}</span>
                        <span className="text-[11px] text-slate-600 block">{formatDateVn(ev.receivedDate)}</span>
                        <span className="text-[10px] text-slate-500 block font-medium">{ev.inspector || defaultInspector}</span>
                      </td>
                      <td className="p-2.5 border-r border-slate-200">
                        <div className="font-extrabold text-slate-900">{ev.partName}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] font-black text-slate-800">
                            SL: {ev.quantity || 1}
                          </span>
                          {ev.warrantyStatus && (
                            <span className="text-[10px] text-slate-500">{ev.warrantyStatus}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-[11px]">
                        {ev.model && <div className="font-bold text-slate-800">{ev.model}</div>}
                        {ev.dealer && <div className="text-slate-600">{ev.dealer}</div>}
                        {ev.supplierName && <div className="text-rose-700 font-semibold">NCC: {ev.supplierName}</div>}
                        {!ev.model && !ev.dealer && !ev.supplierName && <span className="text-slate-400 italic">--</span>}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-[11px] text-slate-700 break-words">
                        <p className="whitespace-pre-line">{ev.findingNote || <span className="text-slate-400 italic">Chưa ghi chú chi tiết</span>}</p>
                        {(ev.vin || ev.engineNo || ev.nccFeedbackAction) && (
                          <div className="mt-1 text-[10px] text-slate-500 space-x-2">
                            {ev.vin && <span>VIN: <b>{ev.vin}</b></span>}
                            {ev.engineNo && <span>ĐC: <b>{ev.engineNo}</b></span>}
                            {ev.nccFeedbackAction && <span className="text-indigo-700">• {ev.nccFeedbackAction}</span>}
                          </div>
                        )}
                        {ev.images && ev.images.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5">
                            {ev.images.map((img, i) => (
                              <img key={i} src={img} alt="LK" className="w-8 h-8 object-cover rounded border border-slate-300" />
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-center border-r border-slate-200">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${causeMeta.badgeClass}`}>
                          {ev.rootCauseCategory}
                        </span>
                      </td>
                      <td className="p-2.5 text-center border-r border-slate-200">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${resMeta.badgeClass}`}>
                          {ev.resolution}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewRecord(ev)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded border border-transparent hover:border-emerald-200 cursor-pointer"
                            title="Xem & In biên bản BM-KTTD-01"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLoadForEdit(ev)}
                            className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-200 cursor-pointer"
                            title="Sửa đánh giá"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEvaluation(ev.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 cursor-pointer"
                            title="Xóa đánh giá"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal xem trước & In 1 biên bản BM-KTTD-01 */}
      {previewRecord && (
        <div className="fixed inset-0 bg-slate-900/65 z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white">BM-KTTD-01</span>
                <span className="text-sm font-black text-slate-900">{previewRecord.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintSingleBmKttd01(previewRecord)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In BM-KTTD-01</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewRecord(null)}
                  className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 text-xs space-y-3 max-h-[75vh] overflow-y-auto font-serif">
              <div className="text-center border-b border-slate-300 pb-2">
                <div className="font-bold text-sm">CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT • PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL)</div>
                <div className="text-[11px] italic text-slate-600">DKBike - Xe cho cả gia đình • DK QMS</div>
                <div className="font-bold text-base mt-2">BIÊN BẢN GIÁM ĐỊNH BẢO HÀNH &amp; NGUYÊN NHÂN SỰ CỐ</div>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border border-slate-200 font-sans">
                <div><b>Mã biên bản:</b> {previewRecord.id}</div>
                <div><b>Ngày tiếp nhận:</b> {formatDateVn(previewRecord.receivedDate)}</div>
                <div><b>Đại lý / KH:</b> {previewRecord.dealer || '--'}</div>
                <div><b>Dòng xe:</b> {previewRecord.model || '--'}</div>
                <div><b>Linh kiện:</b> {previewRecord.partName} (SL: {previewRecord.quantity})</div>
                <div><b>Nhà cung cấp:</b> {previewRecord.supplierName || '--'}</div>
                <div><b>Nguyên nhân gốc:</b> {previewRecord.rootCauseCategory}</div>
                <div><b>Phương án xử lý:</b> {previewRecord.resolution}</div>
              </div>
              <div className="border border-slate-300 rounded p-3">
                <div className="font-bold uppercase text-[11px] mb-1">Hiện trạng &amp; Kết quả giám định:</div>
                <div className="whitespace-pre-line">{previewRecord.findingNote || '--'}</div>
              </div>
              {previewRecord.images && previewRecord.images.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {previewRecord.images.map((img, i) => (
                    <img key={i} src={img} alt="LK" className="w-24 h-24 object-cover rounded border border-slate-300" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
