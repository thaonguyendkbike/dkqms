import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Plus,
  Save,
  Trash2,
  X
} from 'lucide-react';
import { COPQMetric } from '../types';

interface CopqDraftRow {
  rowKey: string;
  year: number;
  month: number;
  costOrigin: string;
  category: string;
  details: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  excelTotal?: number | null;
  notes: string;
}

interface CopqSpreadsheetEntryProps {
  onSaveBatch: (newItems: COPQMetric[]) => void;
}

const ORIGIN_OPTIONS = [
  'Nội bộ xưởng / Lắp ráp',
  'Nhà cung cấp',
  'Thị trường / Bảo hành',
  'Phòng QLCL (Đầu tư & 5S)',
  'Khác'
];
const CATEGORY_OPTIONS = [
  'Sửa chữa',
  'Tái chế',
  'Bảo hành',
  'Đổi trả',
  'Dừng chuyền',
  'Kiểm tra lại',
  'Vật tư tiêu hao',
  'Thiết bị & Dụng cụ đo',
  'Thiết bị văn phòng & 5S',
  'Đào tạo & Tài liệu',
  'Chi phí khác'
];

const parseNumberVN = (raw: unknown): number => {
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  const s = String(raw ?? '').trim();
  if (!s) return 0;
  // Xử lý định dạng có dấu phẩy ngăn cách hàng nghìn kiểu Excel (950,000) hoặc dấu chấm (950.000)
  const cleaned = s.replace(/[^\d.,-]/g, '');
  if (!cleaned) return 0;
  const commaParts = cleaned.split(',');
  const dotParts = cleaned.split('.');
  let normalized = cleaned;
  if (commaParts.length > 1 && commaParts[commaParts.length - 1].length === 3) {
    normalized = cleaned.replace(/,/g, '');
  } else if (dotParts.length > 1 && dotParts[dotParts.length - 1].length === 3) {
    normalized = cleaned.replace(/\./g, '').replace(/,/g, '.');
  } else {
    normalized = cleaned.replace(/,/g, '');
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const isHeaderOrNoiseRow = (cells: string[]): boolean => {
  const joined = cells.join(' ').toLowerCase();
  if (!joined.trim()) return true;
  if (
    joined.includes('nội dung/hạng mục') ||
    joined.includes('nội dung / hạng mục') ||
    joined.includes('mô tả') ||
    joined.includes('thực tế') ||
    joined.includes('(3) = (1)x(2)') ||
    joined.includes('thành tiền')
  ) {
    return true;
  }
  // Dòng chữ cái cột kiểu: B | C | D | (1) | (2) | (3)
  const col0 = (cells[0] || '').trim();
  const col1 = (cells[1] || '').trim();
  if ((col0 === 'B' || col0 === 'A') && (col1 === 'C' || col1 === 'B')) return true;
  return false;
};

const createEmptyRow = (defaults: { year: number; month: number; costOrigin: string; category: string }): CopqDraftRow => ({
  rowKey: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  year: defaults.year,
  month: defaults.month,
  costOrigin: defaults.costOrigin,
  category: defaults.category,
  details: '',
  description: '',
  unit: 'Cái',
  quantity: '',
  unitPrice: '',
  excelTotal: null,
  notes: ''
});

export default function CopqSpreadsheetEntry({ onSaveBatch }: CopqSpreadsheetEntryProps) {
  const currentYear = new Date().getFullYear() >= 2025 ? new Date().getFullYear() : 2026;
  const currentMonth = new Date().getMonth() + 1;

  const [defaultYear, setDefaultYear] = useState<number>(currentYear);
  const [defaultMonth, setDefaultMonth] = useState<number>(currentMonth);
  const [defaultOrigin, setDefaultOrigin] = useState<string>('Nội bộ xưởng / Lắp ráp');
  const [defaultCategory, setDefaultCategory] = useState<string>('Sửa chữa');

  const [rows, setRows] = useState<CopqDraftRow[]>(() => [
    createEmptyRow({ year: currentYear, month: currentMonth, costOrigin: 'Nội bộ xưởng / Lắp ráp', category: 'Sửa chữa' }),
    createEmptyRow({ year: currentYear, month: currentMonth, costOrigin: 'Nội bộ xưởng / Lắp ráp', category: 'Sửa chữa' }),
    createEmptyRow({ year: currentYear, month: currentMonth, costOrigin: 'Nội bộ xưởng / Lắp ráp', category: 'Sửa chữa' })
  ]);

  const [showPasteBox, setShowPasteBox] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const applyDefaultsToAllRows = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        year: defaultYear,
        month: defaultMonth,
        costOrigin: defaultOrigin,
        category: defaultCategory
      }))
    );
  };

  const buildRowsFromMatrix = (matrix: string[][]): CopqDraftRow[] => {
    const parsed: CopqDraftRow[] = [];
    for (const rawCells of matrix) {
      const cells = rawCells.map((c) => String(c ?? '').trim());
      if (isHeaderOrNoiseRow(cells)) continue;

      // Thứ tự cột chuẩn theo ảnh:
      // [0] NỘI DUNG/HẠNG MỤC | [1] MÔ TẢ | [2] ĐVT | [3] SL | [4] ĐG | [5] Thành tiền (nếu có)
      const details = cells[0] || '';
      const description = cells[1] || '';
      const unit = cells[2] || 'Cái';
      const qtyNum = parseNumberVN(cells[3]);
      const priceNum = parseNumberVN(cells[4]);
      const excelTotalRaw = cells[5] !== undefined && cells[5] !== '' ? parseNumberVN(cells[5]) : null;

      if (!details && !description && qtyNum === 0 && priceNum === 0) continue;

      parsed.push({
        rowKey: `imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        year: defaultYear,
        month: defaultMonth,
        costOrigin: defaultOrigin,
        category: defaultCategory,
        details,
        description,
        unit,
        quantity: qtyNum > 0 ? String(qtyNum) : (cells[3] || ''),
        unitPrice: priceNum > 0 ? String(priceNum) : (cells[4] || ''),
        excelTotal: excelTotalRaw,
        notes: ''
      });
    }
    return parsed;
  };

  const mergeImportedRows = (imported: CopqDraftRow[], sourceLabel: string) => {
    if (imported.length === 0) {
      setImportNotice(`Không tìm thấy dòng dữ liệu hợp lệ từ ${sourceLabel}. Kiểm tra đúng thứ tự cột: Nội dung/Hạng mục → Mô tả → ĐVT → SL → ĐG → Thành tiền.`);
      return;
    }
    setRows((prev) => {
      const nonEmptyPrev = prev.filter((r) => r.details.trim() || Number(r.quantity) > 0 || Number(r.unitPrice) > 0);
      return [...nonEmptyPrev, ...imported];
    });
    setImportNotice(`Đã nạp ${imported.length} dòng từ ${sourceLabel}. Vui lòng kiểm tra trạng thái, sửa/điền thêm thông tin rồi bấm "Lưu tất cả".`);
  };

  const handleParsePaste = () => {
    const lines = pasteText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const matrix = lines.map((line) => line.split('\t'));
    const imported = buildRowsFromMatrix(matrix);
    mergeImportedRows(imported, 'Clipboard Excel');
    if (imported.length > 0) {
      setPasteText('');
      setShowPasteBox(false);
    }
  };

  const handleDownloadExcel = () => {
    const activeRows = rows.filter(
      (r) => r.details.trim() || r.description.trim() || r.quantity || r.unitPrice
    );
    const exportData =
      activeRows.length > 0
        ? activeRows.map((r) => {
            const qty = parseNumberVN(r.quantity);
            const price = parseNumberVN(r.unitPrice);
            return [r.details, r.description, r.unit || 'Cái', qty, price, qty * price];
          })
        : [
            ['Sơn TOA đen', 'Sửa xe, linh kiện', 'Hộp', 4, 130000, 520000],
            ['Kệ sách', '', 'Cái', 1, 950000, 950000]
          ];

    const aoa = [
      ['NỘI DUNG/HẠNG MỤC', 'MÔ TẢ (nếu có)', 'ĐVT', 'SL', 'ĐG', 'Thành tiền'],
      ...exportData
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 28 }, { wch: 26 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'COPQ');
    XLSX.writeFile(wb, `Mau_Nhap_COPQ_DKBike.xlsx`);
  };

  const updateRow = (rowKey: string, patch: Partial<CopqDraftRow>) => {
    setRows((prev) => prev.map((r) => (r.rowKey === rowKey ? { ...r, ...patch } : r)));
  };

  const removeRow = (rowKey: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.rowKey !== rowKey)));
  };

  const rowStatuses = useMemo(() => {
    return rows.map((r) => {
      const hasAnyInput = Boolean(r.details.trim() || r.description.trim() || r.quantity || r.unitPrice);
      const qty = parseNumberVN(r.quantity);
      const price = parseNumberVN(r.unitPrice);
      const total = qty * price;
      const warnings: string[] = [];
      if (hasAnyInput) {
        if (!r.details.trim()) warnings.push('Thiếu nội dung');
        if (qty <= 0) warnings.push('SL ≤ 0');
        if (price <= 0) warnings.push('ĐG ≤ 0');
        if (r.excelTotal !== null && r.excelTotal !== undefined && r.excelTotal > 0 && Math.abs(total - r.excelTotal) > 1) {
          warnings.push(`Lệch Excel (${r.excelTotal.toLocaleString('vi-VN')})`);
        }
      }
      return { hasAnyInput, qty, price, total, warnings, valid: hasAnyInput && warnings.length === 0 };
    });
  }, [rows]);

  const activeTotalVND = useMemo(
    () => rowStatuses.reduce((s, st) => s + (st.hasAnyInput ? st.total : 0), 0),
    [rowStatuses]
  );

  const validCount = rowStatuses.filter((st) => st.valid).length;
  const warningCount = rowStatuses.filter((st) => st.hasAnyInput && st.warnings.length > 0).length;

  const handleSaveAll = () => {
    const readyRows = rows.filter((_, idx) => rowStatuses[idx].hasAnyInput);
    if (readyRows.length === 0) {
      alert('Vui lòng nhập ít nhất 1 dòng chi phí hợp lệ trước khi lưu.');
      return;
    }
    const invalidRows = rows.filter((_, idx) => rowStatuses[idx].hasAnyInput && (!rows[idx].details.trim() || rowStatuses[idx].qty <= 0));
    if (invalidRows.length > 0) {
      alert(`Có ${invalidRows.length} dòng chưa đủ "Nội dung/Hạng mục" hoặc "Số lượng > 0". Anh vui lòng kiểm tra lại các dòng báo vàng.`);
      return;
    }

    const baseTs = Date.now();
    const newItems: COPQMetric[] = readyRows.map((r, i) => {
      const qty = parseNumberVN(r.quantity);
      const price = parseNumberVN(r.unitPrice);
      const totalAmt = qty * price;
      const millionVND = Number((totalAmt / 1000000).toFixed(6));
      return {
        id: `COPQ-${String(baseTs + i).slice(-6)}`,
        category: r.category,
        amount: millionVND,
        trend: 'Ổn định',
        details: r.details.trim(),
        month: r.month,
        year: r.year,
        costOrigin: r.costOrigin,
        description: r.description.trim(),
        unit: r.unit.trim() || 'Cái',
        quantity: qty,
        unitPrice: price,
        totalAmount: totalAmt,
        notes: r.notes.trim()
      };
    });

    onSaveBatch(newItems);
    setRows([
      createEmptyRow({ year: defaultYear, month: defaultMonth, costOrigin: defaultOrigin, category: defaultCategory }),
      createEmptyRow({ year: defaultYear, month: defaultMonth, costOrigin: defaultOrigin, category: defaultCategory }),
      createEmptyRow({ year: defaultYear, month: defaultMonth, costOrigin: defaultOrigin, category: defaultCategory })
    ]);
    setImportNotice(`Đã lưu thành công ${newItems.length} dòng chi phí vào hệ thống!`);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header & Thanh thao tác Excel */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Bảng Nhập Liệu Chi Phí Chất Lượng (COPQ) & Nhập Hàng Loạt Từ Excel</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Thứ tự cột Excel chuẩn: <span className="font-bold text-slate-700">Nội dung/Hạng mục → Mô tả (nếu có) → ĐVT → SL → ĐG → Thành tiền</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPasteBox((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Dán từ Excel (Ctrl+V)</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải xuống Excel</span>
          </button>
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Giải thích</span>
          </button>
          <button
            type="button"
            onClick={() =>
              setRows((prev) => [
                ...prev,
                createEmptyRow({ year: defaultYear, month: defaultMonth, costOrigin: defaultOrigin, category: defaultCategory })
              ])
            }
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm dòng</span>
          </button>
        </div>
      </div>

      {/* Giá trị mặc định áp dụng nhanh */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-end gap-3 text-xs">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Năm mặc định</label>
          <select
            value={defaultYear}
            onChange={(e) => setDefaultYear(Number(e.target.value))}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tháng mặc định</label>
          <select
            value={defaultMonth}
            onChange={(e) => setDefaultMonth(Number(e.target.value))}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nguồn gốc mặc định</label>
          <select
            value={defaultOrigin}
            onChange={(e) => setDefaultOrigin(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800"
          >
            {ORIGIN_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nhóm phân loại mặc định</label>
          <select
            value={defaultCategory}
            onChange={(e) => setDefaultCategory(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={applyDefaultsToAllRows}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold cursor-pointer"
        >
          Áp dụng cho tất cả dòng
        </button>
      </div>

      {/* Ô dán nhanh từ Excel */}
      {showPasteBox && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 space-y-2 text-xs">
          <div className="font-bold text-indigo-950">
            Bôi đen các dòng trong Excel (từ cột Nội dung/Hạng mục đến cột Thành tiền), Copy (Ctrl+C) rồi dán (Ctrl+V) vào đây:
          </div>
          <textarea
            rows={5}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={'Kệ sách\t\tCái\t1\t950,000\t950,000\nSơn TOA đen\tSửa xe, linh kiện\tHộp\t4\t130,000\t520,000'}
            className="w-full p-2.5 rounded-lg border border-indigo-300 bg-white font-mono text-[11px] focus:outline-hidden focus:border-indigo-500"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowPasteBox(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleParsePaste}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold cursor-pointer"
            >
              Phân tích & Đưa vào bảng kiểm tra
            </button>
          </div>
        </div>
      )}

      {importNotice && (
        <div className="px-3.5 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold flex items-center justify-between gap-2">
          <span>{importNotice}</span>
          <button
            type="button"
            onClick={() => setImportNotice(null)}
            className="text-amber-700 hover:text-amber-950 font-bold cursor-pointer"
          >
            Ẩn
          </button>
        </div>
      )}

      {/* Bảng nhập liệu dạng cột-hàng */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900 text-white text-[11px]">
              <th className="border border-slate-700 px-2 py-2 w-10 text-center">STT</th>
              <th className="border border-slate-700 px-2 py-2 min-w-[180px] text-left">NỘI DUNG / HẠNG MỤC *</th>
              <th className="border border-slate-700 px-2 py-2 min-w-[150px] text-left">MÔ TẢ (nếu có)</th>
              <th className="border border-slate-700 px-2 py-2 w-20 text-center">ĐVT *</th>
              <th className="border border-slate-700 px-2 py-2 w-20 text-right">SL *</th>
              <th className="border border-slate-700 px-2 py-2 w-28 text-right">ĐG (VND) *</th>
              <th className="border border-slate-700 px-2 py-2 w-32 text-right">Thành tiền</th>
              <th className="border border-slate-700 px-2 py-2 w-20 text-center">Năm</th>
              <th className="border border-slate-700 px-2 py-2 w-20 text-center">Tháng</th>
              <th className="border border-slate-700 px-2 py-2 w-28 text-left">Nguồn gốc</th>
              <th className="border border-slate-700 px-2 py-2 w-28 text-left">Nhóm COPQ</th>
              <th className="border border-slate-700 px-2 py-2 min-w-[130px] text-left">Ghi chú</th>
              <th className="border border-slate-700 px-2 py-2 w-32 text-center">Kiểm tra</th>
              <th className="border border-slate-700 px-2 py-2 w-10 text-center">Xóa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const st = rowStatuses[idx];
              const rowBg =
                st.hasAnyInput && st.warnings.length > 0
                  ? 'bg-amber-50/70'
                  : idx % 2 === 1
                  ? 'bg-slate-50/60'
                  : 'bg-white';
              return (
                <tr key={r.rowKey} className={rowBg}>
                  <td className="border border-slate-200 px-2 py-1.5 text-center font-bold text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-200 p-1">
                    <input
                      type="text"
                      value={r.details}
                      onChange={(e) => updateRow(r.rowKey, { details: e.target.value })}
                      placeholder="VD: Sơn TOA đen..."
                      className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white bg-transparent font-bold text-slate-900 focus:outline-hidden"
                    />
                  </td>
                  <td className="border border-slate-200 p-1">
                    <input
                      type="text"
                      value={r.description}
                      onChange={(e) => updateRow(r.rowKey, { description: e.target.value })}
                      placeholder="Sửa xe, linh kiện..."
                      className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white bg-transparent text-slate-700 focus:outline-hidden"
                    />
                  </td>
                  <td className="border border-slate-200 p-1">
                    <input
                      type="text"
                      value={r.unit}
                      onChange={(e) => updateRow(r.rowKey, { unit: e.target.value })}
                      className="w-full px-2 py-1 text-center rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white bg-transparent font-semibold focus:outline-hidden"
                    />
                  </td>
                  <td className="border border-slate-200 p-1">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={r.quantity}
                      onChange={(e) => updateRow(r.rowKey, { quantity: e.target.value })}
                      placeholder="0"
                      className="w-full px-2 py-1 text-right font-mono rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white bg-transparent font-bold focus:outline-hidden"
                    />
                  </td>
                  <td className="border border-slate-200 p-1">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={r.unitPrice}
                      onChange={(e) => updateRow(r.rowKey, { unitPrice: e.target.value })}
                      placeholder="0"
                      className="w-full px-2 py-1 text-right font-mono rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white bg-transparent font-bold focus:outline-hidden"
                    />
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 text-right font-mono font-black text-[#0213b0]">
                    {st.total.toLocaleString('vi-VN')}
                  </td>
                  <td className="border border-slate-200 p-1">
                    <select
                      value={r.year}
                      onChange={(e) => updateRow(r.rowKey, { year: Number(e.target.value) })}
                      className="w-full px-1 py-1 rounded border border-slate-200 bg-white font-semibold"
                    >
                      {[2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-slate-200 p-1">
                    <select
                      value={r.month}
                      onChange={(e) => updateRow(r.rowKey, { month: Number(e.target.value) })}
                      className="w-full px-1 py-1 rounded border border-slate-200 bg-white font-semibold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                        <option key={m} value={m}>T{m}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-slate-200 p-1">
                    <select
                      value={r.costOrigin}
                      onChange={(e) => updateRow(r.rowKey, { costOrigin: e.target.value })}
                      className="w-full px-1 py-1 rounded border border-slate-200 bg-white font-semibold"
                    >
                      {ORIGIN_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-slate-200 p-1">
                    <select
                      value={r.category}
                      onChange={(e) => updateRow(r.rowKey, { category: e.target.value })}
                      className="w-full px-1 py-1 rounded border border-slate-200 bg-white font-semibold"
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-slate-200 p-1">
                    <input
                      type="text"
                      value={r.notes}
                      onChange={(e) => updateRow(r.rowKey, { notes: e.target.value })}
                      placeholder="Ghi chú..."
                      className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white bg-transparent focus:outline-hidden"
                    />
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 text-center">
                    {!st.hasAnyInput ? (
                      <span className="text-[10px] text-slate-400">Trống</span>
                    ) : st.warnings.length === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" /> Hợp lệ
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded"
                        title={st.warnings.join(', ')}
                      >
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[95px]">{st.warnings.join(', ')}</span>
                      </span>
                    )}
                  </td>
                  <td className="border border-slate-200 px-1.5 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(r.rowKey)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                      title="Xóa dòng"
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

      {/* Thanh tổng kết & nút Lưu tất cả */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-slate-600">
            Dòng hợp lệ: <strong className="text-emerald-700">{validCount}</strong>
            {warningCount > 0 && (
              <> • Cần kiểm tra: <strong className="text-amber-700">{warningCount}</strong></>
            )}
          </span>
          <span className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-black font-mono">
            Tổng tạm tính: {activeTotalVND.toLocaleString('vi-VN')} VND
          </span>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="px-5 py-2.5 rounded-xl bg-[#0213b0] hover:bg-blue-800 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Lưu tất cả vào hệ thống ({rows.filter((_, i) => rowStatuses[i].hasAnyInput).length} dòng)</span>
        </button>
      </div>

      {/* Modal Giải thích Nguồn gốc & Nhóm phân loại COPQ */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Giải thích thuật ngữ: Nguồn gốc & Nhóm phân loại COPQ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 text-xs text-slate-700">
              <div className="space-y-2">
                <h4 className="font-black text-slate-900 uppercase text-[11px] bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
                  1. Nguồn gốc chi phí (Trả lời câu hỏi: Chi phí phát sinh DO ĐÂU / CHO AI?)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    ['Nội bộ xưởng / Lắp ráp', 'Phát sinh do lỗi thao tác, lắp ráp, vận hành hoặc vật tư sửa chữa trong nội bộ nhà máy.'],
                    ['Nhà cung cấp', 'Phát sinh do linh kiện của NCC giao bị lỗi (tốn sơn, xăng thơm, đá mài để sửa lại hoặc kiểm tra lại lô hàng NCC).'],
                    ['Thị trường / Bảo hành', 'Phát sinh từ phản ánh đại lý, khách hàng sau bán (đổi trả, bảo hành, sửa chữa lưu động).'],
                    ['Phòng QLCL (Đầu tư & 5S)', 'Chi mua sắm trang thiết bị kiểm tra, đồ dùng văn phòng, sách tài liệu, đèn LED, vật tư 5S của phòng QLCL.'],
                    ['Khác', 'Các nguồn phát sinh đặc thù khác không thuộc 4 nhóm trên.']
                  ].map(([title, desc]) => (
                    <div key={title} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="font-extrabold text-slate-900">{title}</div>
                      <div className="text-slate-600 mt-0.5">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-slate-900 uppercase text-[11px] bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                  2. Nhóm phân loại COPQ (Trả lời câu hỏi: Tiền đó dùng để LÀM VIỆC GÌ?)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    ['Sửa chữa', 'Chi phí khắc phục, sửa lại xe hoặc linh kiện lỗi để đạt tiêu chuẩn xuất xưởng.'],
                    ['Tái chế', 'Chi phí gia công lại, sơn lại, phục hồi linh kiện/bán thành phẩm bị lỗi.'],
                    ['Bảo hành', 'Chi phí linh kiện thay thế, nhân công bảo hành xe ngoài thị trường.'],
                    ['Đổi trả', 'Chi phí đổi mới linh kiện/xe hoặc thu hồi từ khách hàng, đại lý.'],
                    ['Dừng chuyền', 'Thiệt hại phát sinh do phải tạm dừng dây chuyền sản xuất vì lỗi chất lượng.'],
                    ['Kiểm tra lại', 'Chi phí nhân công/dụng cụ phát sinh do phải kiểm tra 100% hoặc sàng lọc lại lô lỗi.'],
                    ['Vật tư tiêu hao', 'Sơn, xăng thơm, đá mài, keo nến, que hàn, hóa chất phụ trợ dùng trong quá trình xử lý.'],
                    ['Thiết bị & Dụng cụ đo', 'Máy móc, thiết bị kiểm tra, dưỡng kiểm, đồng hồ đo phục vụ công tác QC/QA.'],
                    ['Thiết bị văn phòng & 5S', 'Bàn họp, kệ sách, tủ hồ sơ, đèn LED, bảng biểu, vật dụng sắp xếp 5S phòng QLCL.'],
                    ['Đào tạo & Tài liệu', 'Sách chuyên môn, tài liệu tiêu chuẩn, in ấn, chi phí đào tạo nâng cao chất lượng.'],
                    ['Chi phí khác', 'Các khoản chi phí khác chưa xếp vào 10 nhóm trên.']
                  ].map(([title, desc]) => (
                    <div key={title} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="font-extrabold text-slate-900">{title}</div>
                      <div className="text-slate-600 mt-0.5">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end px-5 py-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
