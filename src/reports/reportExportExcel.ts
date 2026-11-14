import XLSXStyle from 'xlsx-js-style';
import { formatDateStrVi, ReportSnapshot } from './reportEngine';

type ToastFn = (msg: string, type?: 'success' | 'error' | 'info') => void;

const BRAND_TITLE = 'CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT';
const BRAND_SUB = 'DKBike — Xe cho cả gia đình | Phòng Quản lý chất lượng (QLCL / DK QMS)';

const HEADER_FILL = { fgColor: { rgb: '1E3A8A' } };
const SUBHEADER_FILL = { fgColor: { rgb: 'EFF6FF' } };
const SECTION_FILL = { fgColor: { rgb: 'E0E7FF' } };
const TH_FILL = { fgColor: { rgb: '1E40AF' } };
const ZEBRA_FILL = { fgColor: { rgb: 'F8FAFC' } };
const TOTAL_FILL = { fgColor: { rgb: 'E2E8F0' } };
const POSITIVE_FILL = { fgColor: { rgb: 'ECFDF5' } };
const NEGATIVE_FILL = { fgColor: { rgb: 'FFF1F2' } };
const WARN_FILL = { fgColor: { rgb: 'FFFBEB' } };
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
  top: { style: 'medium', color: { rgb: '64748B' } },
  bottom: { style: 'medium', color: { rgb: '64748B' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } }
};

interface ExcelSection {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

function getHeaderAlign(header: string): 'center' | 'right' | 'left' {
  const h = header.trim().toLowerCase();
  if (
    h === 'stt' ||
    h.includes('ngày') ||
    h.includes('hạn') ||
    h.includes('thời gian') ||
    h.includes('trạng thái') ||
    h.includes('kết quả') ||
    h.includes('mức độ') ||
    h.includes('ưu tiên') ||
    h.includes('tiến độ') ||
    h.includes('phân loại') ||
    h === 'nhóm' ||
    h === 'mã' ||
    h === 'mã bb' ||
    h === 'số phiếu' ||
    h === 'lsx' ||
    /^t[2-7]$/.test(h) ||
    h === 'cn' ||
    /^tuần\s*\d+/.test(h)
  ) {
    return 'center';
  }
  if (
    h.includes('sl') ||
    h.includes('số lượng') ||
    h.includes('tổng') ||
    h.includes('trọng số') ||
    h.includes('điểm') ||
    h.includes('tỷ trọng') ||
    h.includes('tích lũy')
  ) {
    return 'right';
  }
  return 'left';
}

function getStatusBadgeStyle(val: string): { fill: { fgColor: { rgb: string } }; color: string; bold: boolean } | null {
  const v = val.trim().toLowerCase();
  if (
    v === 'hoàn thành' ||
    v === 'đạt' ||
    v === 'đạt hoàn toàn' ||
    v === 'đã xử lý' ||
    v === 'đã đóng' ||
    v === 'điểm sáng' ||
    v === 'đạt chuẩn'
  ) {
    return { fill: POSITIVE_FILL, color: '065F46', bold: true };
  }
  if (
    v === 'lỗi' ||
    v === 'quá hạn' ||
    v === 'cảnh báo' ||
    v === 'chưa xử lý' ||
    v === 'cần cải tiến' ||
    v.includes('trọng tâm')
  ) {
    return { fill: NEGATIVE_FILL, color: '9F1239', bold: true };
  }
  if (
    v === 'đang làm' ||
    v === 'đang xử lý' ||
    v === 'đang cải tiến' ||
    v === 'chờ xử lý'
  ) {
    return { fill: WARN_FILL, color: '92400E', bold: true };
  }
  return null;
}

function buildMultiSectionSheet(
  sheetTitle: string,
  periodLabel: string,
  rangeLabel: string,
  sections: ExcelSection[],
  colWidths: number[],
  signatureAuthor?: string
) {
  const maxCols = Math.max(4, colWidths.length, ...sections.map((s) => s.headers.length));
  const aoa: (string | number)[][] = [
    [BRAND_TITLE],
    [BRAND_SUB],
    [`${sheetTitle} — ${periodLabel} (${rangeLabel})`],
    [`Xuất lúc: ${new Date().toLocaleString('vi-VN')} | Chuẩn báo cáo ISO 8601`],
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
  const emptyRowMeta: { rowIdx: number; colCount: number }[] = [];
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

    if (sec.rows.length === 0) {
      const emptyR = aoa.length;
      aoa.push(['Không phát sinh dữ liệu trong kỳ']);
      merges.push({ s: { r: emptyR, c: 0 }, e: { r: emptyR, c: sec.headers.length - 1 } });
      emptyRowMeta.push({ rowIdx: emptyR, colCount: sec.headers.length });
    } else {
      sec.rows.forEach((row, idx) => {
        const absR = aoa.length;
        aoa.push(row);
        const isTotal = String(row[1] ?? row[0] ?? '').trim().toLowerCase() === 'tổng cộng';
        dataRowMeta.push({ rowIdx: absR, headers: sec.headers, zebra: idx % 2 === 1, isTotal });
      });
    }

    aoa.push([]);
  }

  let sigStartRow = -1;
  if (signatureAuthor !== undefined) {
    sigStartRow = aoa.length;
    aoa.push(['NGƯỜI LẬP BÁO CÁO', 'TRƯỞNG PHÒNG QLCL', 'BAN GIÁM ĐỐC']);
    aoa.push([signatureAuthor || '(Ký và ghi rõ họ tên)', '(Ký và ghi rõ họ tên)', '(Phê duyệt / Chỉ đạo)']);
  }

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
      font: { name: 'Arial', sz: 9, color: { rgb: '64748B' } },
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

  for (const { rowIdx, colCount } of emptyRowMeta) {
    for (let c = 0; c < colCount; c++) {
      setCellStyle(rowIdx, c, {
        font: { name: 'Arial', italic: true, sz: 10, color: { rgb: '64748B' } },
        border: BORDER_THIN,
        alignment: { horizontal: 'center', vertical: 'center' }
      });
    }
  }

  const rowHeights: { hpt: number }[] = [
    { hpt: 28 },
    { hpt: 20 },
    { hpt: 24 },
    { hpt: 18 },
    { hpt: 10 }
  ];
  const setRowHeight = (r: number, hpt: number) => {
    while (rowHeights.length <= r) rowHeights.push({ hpt: 18 });
    rowHeights[r] = { hpt: Math.max(rowHeights[r]?.hpt || 0, hpt) };
  };
  sectionRowMeta.forEach(({ rowIdx }) => setRowHeight(rowIdx, 22));
  headerRowMeta.forEach(({ rowIdx }) => setRowHeight(rowIdx, 26));
  emptyRowMeta.forEach(({ rowIdx }) => setRowHeight(rowIdx, 22));

  for (const { rowIdx, headers, zebra, isTotal } of dataRowMeta) {
    let maxLines = 1;
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSXStyle.utils.encode_cell({ r: rowIdx, c });
      const cell = ws[addr];
      const rawVal = cell ? String(cell.v ?? '') : '';
      const isNumber = cell && typeof cell.v === 'number';
      const colW = Math.max((colWidths[c] || 16) - 2, 8);
      const explicitLines = rawVal.split(/\r?\n/);
      const wrappedCount = explicitLines.reduce((sum, part) => sum + Math.max(1, Math.ceil(part.length / colW)), 0);
      if (wrappedCount > maxLines) maxLines = wrappedCount;

      const headerAlign = getHeaderAlign(headers[c] || '');
      const horizontal = headers[c]?.trim().toLowerCase() === 'stt'
        ? 'center'
        : isNumber
          ? 'right'
          : headerAlign;
      const badge = !isTotal ? getStatusBadgeStyle(rawVal) : null;

      setCellStyle(rowIdx, c, {
        font: {
          name: 'Arial',
          sz: 10,
          bold: isTotal || Boolean(badge?.bold),
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
    setRowHeight(rowIdx, Math.min(120, Math.max(21, maxLines * 14.5 + 6)));
  }

  if (sigStartRow !== -1) {
    setRowHeight(sigStartRow, 22);
    setRowHeight(sigStartRow + 1, 36);
    for (let c = 0; c < 3; c++) {
      setCellStyle(sigStartRow, c, {
        font: { name: 'Arial', bold: true, sz: 10, color: { rgb: '0F172A' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      });
      setCellStyle(sigStartRow + 1, c, {
        font: { name: 'Arial', italic: true, sz: 9.5, color: { rgb: '475569' } },
        alignment: { horizontal: 'center', vertical: 'bottom' }
      });
    }
  }

  ws['!cols'] = colWidths.map((wch) => ({ wch }));
  ws['!rows'] = rowHeights;
  ws['!views'] = [{ state: 'frozen', ySplit: 4 }];
  ws['!pageSetup'] = { paperSize: 9, orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 };
  return ws;
}

export function exportReportToExcel(snapshot: ReportSnapshot, onToast?: ToastFn): void {
  try {
    const wb = XLSXStyle.utils.book_new();
    const { period, qIndex, kpis, production, market, capaEco, work, qcTools, note, warnings, highlights } = snapshot;
    const pLabel = period.label;
    const rLabel = period.rangeLabel;

    // =========================================================
    // SHEET 1: TỔNG QUAN & KPI
    // =========================================================
    const summaryRows: (string | number)[][] = [
      ['Chỉ số Q-Index tổng hợp', `${qIndex.score.toFixed(1)} / 100 (${qIndex.grade})`, qIndex.formulaText],
      ['Tỷ lệ đạt OQC', `${kpis.oqcYield.current.toFixed(1)}%`, `Đạt ${kpis.oqcYield.passed}/${kpis.oqcYield.total} xe (so kỳ trước: ${kpis.oqcYield.delta >= 0 ? '+' : ''}${kpis.oqcYield.delta.toFixed(1)}%)`],
      ['Tỷ lệ đạt lô IQC', `${kpis.iqcPassRate.current.toFixed(1)}%`, `Đạt ${kpis.iqcPassRate.passed}/${kpis.iqcPassRate.total} lô`],
      ['Tỷ lệ xử lý PQC', `${kpis.pqcResolveRate.current.toFixed(1)}%`, `Đã xử lý ${kpis.pqcResolveRate.resolved}/${kpis.pqcResolveRate.total} điểm`],
      ['Tỷ lệ xử lý Phản ánh thị trường', `${kpis.marketResolveRate.current.toFixed(1)}%`, `Đóng ${kpis.marketResolveRate.resolved}/${kpis.marketResolveRate.total} | Lỗi mức A: ${kpis.marketResolveRate.sevA}`],
      ['Linh kiện lỗi thẩm định (PTSP)', `${kpis.partEvalQty.current} chiếc`, `${kpis.partEvalQty.records} biên bản (NCC ${kpis.partEvalQty.nccPct.toFixed(0)}%, SX ${kpis.partEvalQty.sxPct.toFixed(0)}%, KH ${kpis.partEvalQty.khPct.toFixed(0)}%)`],
      ['CAPA đang mở / Quá hạn', `${kpis.capaOpen.total} mở / ${kpis.capaOpen.overdue} quá hạn`, `Đóng trong kỳ: ${kpis.capaOpen.closedInPeriod}`],
      ['Tuân thủ báo cáo ngày', `${kpis.dailyCompliance.current.toFixed(1)}%`, `Hoàn thành ${kpis.dailyCompliance.completed}/${kpis.dailyCompliance.total} đầu việc | Tồn kỳ cũ: ${kpis.dailyCompliance.pendingCount}`],
      ['Chi phí chất lượng kém (COPQ)', `${kpis.copqAmount.current.toLocaleString('vi-VN')} đ`, `So kỳ trước: ${kpis.copqAmount.delta >= 0 ? '+' : ''}${kpis.copqAmount.delta.toLocaleString('vi-VN')} đ`],
      ['Nhận xét & Kết luận QLCL', note?.summary || 'Chưa có nhận xét QLCL trong kỳ', [note?.highlights && `Điểm nhấn: ${note.highlights}`, note?.nextActions && `Kỳ tới: ${note.nextActions}`, note?.author && `Người lập: ${note.author}`].filter(Boolean).join(' | ')]
    ];
    const qIndexRows: (string | number)[][] = qIndex.components.map((c) => [
      c.label,
      `${c.weight}%`,
      c.score === null ? 'Không phát sinh' : Number(c.score.toFixed(1)),
      c.detail
    ]);
    const alertRows: (string | number)[][] = [
      ...warnings.map((w) => ['Cảnh báo', w.category, w.title, w.detail]),
      ...highlights.map((h) => ['Điểm sáng', h.category, h.title, h.detail])
    ];
    XLSXStyle.utils.book_append_sheet(
      wb,
      buildMultiSectionSheet(
        'TỔNG QUAN CHẤT LƯỢNG & KPI',
        pLabel,
        rLabel,
        [
          { title: '1. TÓM TẮT CHỈ SỐ KPI & NHẬN XÉT QLCL', headers: ['Hạng mục', 'Giá trị kỳ này', 'Chi tiết / Ghi chú'], rows: summaryRows },
          { title: '2. THÀNH PHẦN CHỈ SỐ Q-INDEX', headers: ['Thành phần', 'Trọng số', 'Điểm', 'Diễn giải'], rows: qIndexRows },
          { title: '3. ĐIỂM SÁNG & CẢNH BÁO TRONG KỲ', headers: ['Nhóm', 'Phân hệ', 'Tiêu đề', 'Chi tiết'], rows: alertRows }
        ],
        [34, 24, 34, 52],
        note?.author || ''
      ),
      'Tong quan & KPI'
    );

    // =========================================================
    // SHEET 2: SẢN XUẤT & CHẤT LƯỢNG (IQC - PQC - OQC)
    // =========================================================
    const iqcRows: (string | number)[][] = production.iqcRecords.map((r) => [
      formatDateStrVi(r.date),
      r.ecountVoucherNo || r.id,
      r.supplierName || r.supplierId || '--',
      r.itemSummary || r.content || '--',
      r.totalQty || 0,
      r.checkedQty || 0,
      r.failedQty || 0,
      r.result || '--',
      r.defectDetail || ''
    ]);
    const pqcRows: (string | number)[][] = production.pqcRecords.map((r) => [
      formatDateStrVi(r.date),
      r.lsx || '--',
      r.model || '--',
      r.qty || 0,
      r.status || '--',
      r.checkedBy || '--',
      r.findings || '',
      r.treatment || ''
    ]);
    const oqcRows: (string | number)[][] = production.oqcFailedRecords.map((r) => [
      formatDateStrVi(r.date),
      r.lsx || '--',
      r.model || '--',
      r.color || '--',
      r.serialNo || r.chassisNo || '--',
      r.status,
      r.rootCause || '--',
      r.defectDetail || r.defectCauseDetail || '',
      r.treatment || ''
    ]);
    XLSXStyle.utils.book_append_sheet(
      wb,
      buildMultiSectionSheet(
        'SẢN XUẤT & CHẤT LƯỢNG (IQC - PQC - OQC)',
        pLabel,
        rLabel,
        [
          { title: '1. KIỂM TRA ĐẦU VÀO (IQC)', headers: ['Ngày', 'Số phiếu', 'Nhà cung cấp', 'Linh kiện / Nội dung', 'SL nhập', 'SL mẫu', 'SL lỗi', 'Kết quả', 'Chi tiết lỗi'], rows: iqcRows },
          { title: '2. KIỂM SOÁT QUÁ TRÌNH (PQC)', headers: ['Ngày', 'LSX', 'Dòng xe', 'SL', 'Trạng thái', 'Người kiểm', 'Phát hiện', 'Hướng xử lý'], rows: pqcRows },
          { title: '3. XE LỖI THÀNH PHẨM (OQC)', headers: ['Ngày', 'LSX', 'Dòng xe', 'Màu', 'Số khung/Serial', 'Kết quả', 'Nguồn gốc lỗi', 'Mô tả lỗi', 'Xử lý'], rows: oqcRows }
        ],
        [13, 16, 24, 28, 12, 12, 16, 26, 30]
      ),
      'SX & Chat luong'
    );

    // =========================================================
    // SHEET 3: THỊ TRƯỜNG, LINH KIỆN LỖI & 4 CÔNG CỤ QC
    // =========================================================
    const marketRows: (string | number)[][] = market.defectsInPeriod.map((d) => [
      formatDateStrVi(d.defectDate),
      d.dealer || '--',
      d.model || '--',
      d.type || '--',
      d.feedbackType || '--',
      d.severity || '--',
      d.status || '--',
      d.description || ''
    ]);
    const partRows: (string | number)[][] = market.partEvalsInPeriod.map((p) => [
      formatDateStrVi(p.receivedDate),
      p.id,
      p.partName || '--',
      p.quantity || 1,
      p.model || '--',
      p.dealer || '--',
      p.supplierName || '--',
      p.warrantyStatus || '--',
      p.rootCauseCategory || '--',
      p.resolution || '--',
      p.findingNote || ''
    ]);
    const checkSheetRows: (string | number)[][] = qcTools.checkSheet.rows.map((r, idx) => [
      idx + 1,
      r.label,
      ...r.counts,
      r.total
    ]);
    if (checkSheetRows.length > 0) {
      checkSheetRows.push([
        '',
        'Tổng cộng',
        ...qcTools.checkSheet.colTotals,
        qcTools.checkSheet.grandTotal
      ]);
    }
    const paretoRows: (string | number)[][] = qcTools.paretoDefects.map((p, idx) => [
      idx + 1,
      p.name,
      p.count,
      `${p.pct.toFixed(1)}%`,
      `${(p.cumPct ?? 0).toFixed(1)}%`,
      (p.cumPct ?? 0) <= 80 ? 'Trọng tâm (≤80%)' : 'Còn lại'
    ]);
    XLSXStyle.utils.book_append_sheet(
      wb,
      buildMultiSectionSheet(
        'THỊ TRƯỜNG, LINH KIỆN LỖI & CÔNG CỤ QC',
        pLabel,
        rLabel,
        [
          { title: '1. PHẢN ÁNH THỊ TRƯỜNG', headers: ['Ngày', 'Đại lý', 'Dòng xe', 'Nhóm lỗi', 'Loại phản ánh', 'Mức độ', 'Trạng thái', 'Mô tả'], rows: marketRows },
          { title: '2. THẨM ĐỊNH LINH KIỆN LỖI (BM-KTTD-01)', headers: ['Ngày', 'Mã BB', 'Linh kiện', 'SL', 'Dòng xe', 'Đại lý', 'NCC', 'Hạn BH', 'Nguyên nhân gốc', 'Phương án XL', 'Hiện trạng'], rows: partRows },
          { title: '3. CÔNG CỤ QC - PHIẾU KIỂM TRA (CHECK SHEET)', headers: ['STT', 'Nhóm lỗi', ...qcTools.checkSheet.columns, 'Tổng cộng'], rows: checkSheetRows },
          { title: '4. CÔNG CỤ QC - BIỂU ĐỒ PARETO LỖI (80/20)', headers: ['STT', 'Nhóm lỗi / Hạng mục', 'Số lượng', 'Tỷ trọng (%)', 'Tích lũy (%)', 'Phân loại 80/20'], rows: paretoRows }
        ],
        [10, 26, 16, 14, 16, 18, 18, 16, 18, 16, 30]
      ),
      'Thi truong & LK'
    );

    // =========================================================
    // SHEET 4: CAPA, ECO & CÔNG VIỆC
    // =========================================================
    const capaEcoItems: (string | number)[][] = [
      ...capaEco.capasAll
        .filter((c) => (c.status !== 'Closed' && c.status !== 'Đã đóng') || capaEco.capasInPeriod.some((p) => p.id === c.id))
        .map((c) => [
          'CAPA',
          c.title || c.issue || '--',
          c.owner || c.assignee || '--',
          formatDateStrVi(c.dueDate || c.targetDate),
          c.status || '--',
          c.CAPAID || c.id,
          c.source || '--',
          c.priority || '--'
        ]),
      ...capaEco.ecosInPeriod.map((e) => [
        'ECO',
        e.content || e.component || '--',
        e.proposer || '--',
        formatDateStrVi(e.applyDate),
        e.status || '--',
        e.ecrId || e.id,
        e.category || '--',
        e.model || '--'
      ])
    ];
    const capaEcoRows: (string | number)[][] = capaEcoItems.map((row, idx) => [idx + 1, ...row]);

    const workRows: (string | number)[][] = work.dailyLogsInPeriod.map((w, idx) => [
      idx + 1,
      w.category || '--',
      w.content || '',
      w.assignee || '--',
      formatDateStrVi(w.date),
      w.statusPercent || '--',
      w.result || '--',
      w.note || ''
    ]);

    const sectionViMap: Record<string, string> = {
      backlog: 'Tồn đọng',
      capa: 'CAPA',
      ptsp: 'PTSP',
      coordination: 'Phối hợp',
      eco: 'ECO'
    };
    const planTaskRows: (string | number)[][] = work.planningTasksInPeriod.map((t, idx) => [
      idx + 1,
      sectionViMap[t.section] || t.section.toUpperCase(),
      t.title,
      t.assignee || '--',
      t.deadline ? formatDateStrVi(t.deadline) : t.week || '--',
      t.priority,
      t.status === 'Completed' ? 'Hoàn thành' : t.status === 'In_Progress' ? 'Đang làm' : 'Chờ xử lý',
      [t.modelOrSupplier, t.notes].filter(Boolean).join(' • ') || '--'
    ]);
    XLSXStyle.utils.book_append_sheet(
      wb,
      buildMultiSectionSheet(
        'CAPA, ECO & CÔNG VIỆC',
        pLabel,
        rLabel,
        [
          {
            title: '1. THEO DÕI CAPA & ECO',
            headers: ['STT', 'Nhóm', 'Công việc / Tác vụ', 'Người làm', 'Thời gian (Hạn / Áp dụng)', 'Trạng thái', 'Mã', 'Nguồn / Mức độ'],
            rows: capaEcoRows
          },
          {
            title: '2. CÔNG VIỆC BÁO CÁO NGÀY TRONG KỲ',
            headers: ['STT', 'Nhóm', 'Công việc / Tác vụ', 'Người làm', 'Thời gian (Ngày)', 'Tiến độ', 'Kết quả', 'Ghi chú'],
            rows: workRows
          },
          {
            title: '3. TÁC VỤ TỪ LẬP KẾ HOẠCH CHẤT LƯỢNG TRONG KỲ',
            headers: ['STT', 'Nhóm', 'Công việc / Tác vụ', 'Người làm', 'Thời gian (Hạn / Tuần)', 'Ưu tiên', 'Trạng thái', 'Model / NCC & Ghi chú'],
            rows: planTaskRows
          }
        ],
        [8, 18, 44, 20, 18, 14, 16, 26]
      ),
      'CAPA, ECO & Cong viec'
    );

    const safeFileName = `Bao_cao_QLCL_${period.id}.xlsx`.replace(/[^a-zA-Z0-9._-]/g, '_');
    XLSXStyle.writeFile(wb, safeFileName);
    onToast?.(`Đã xuất file Excel (4 sheet): ${safeFileName}`, 'success');
  } catch (err) {
    console.error('Excel export failed:', err);
    onToast?.(
      `Lỗi khi xuất file Excel: ${err instanceof Error ? err.message : 'Không xác định'}`,
      'error'
    );
  }
}
