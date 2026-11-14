import XLSXStyle from 'xlsx-js-style';
import { formatDateStrVi, ReportSnapshot } from './reportEngine';

type ToastFn = (msg: string, type?: 'success' | 'error' | 'info') => void;

const BRAND_TITLE = 'CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT';
const BRAND_SUB = 'DKBike — Xe cho cả gia đình | Phòng Quản lý chất lượng (QLCL / DK QMS)';

const HEADER_FILL = { fgColor: { rgb: '1E3A8A' } };
const SUBHEADER_FILL = { fgColor: { rgb: 'EFF6FF' } };
const SECTION_FILL = { fgColor: { rgb: 'DBEAFE' } };
const TH_FILL = { fgColor: { rgb: '1D4ED8' } };
const ZEBRA_FILL = { fgColor: { rgb: 'F8FAFC' } };
const BORDER_THIN = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } }
};

interface ExcelSection {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

function buildMultiSectionSheet(
  sheetTitle: string,
  periodLabel: string,
  rangeLabel: string,
  sections: ExcelSection[],
  colWidths: number[]
) {
  const maxCols = Math.max(4, colWidths.length, ...sections.map((s) => s.headers.length));
  const aoa: (string | number)[][] = [
    [BRAND_TITLE],
    [BRAND_SUB],
    [`${sheetTitle} — ${periodLabel} (${rangeLabel})`],
    [`Ngày xuất: ${new Date().toLocaleString('vi-VN')}`],
    []
  ];

  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: maxCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: maxCols - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: maxCols - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: maxCols - 1 } }
  ];

  const sectionRowIndices: number[] = [];
  const headerRowMeta: { rowIdx: number; colCount: number }[] = [];
  const dataRowMeta: { rowIdx: number; colCount: number; zebra: boolean }[] = [];

  for (const sec of sections) {
    const secRowIdx = aoa.length;
    aoa.push([sec.title]);
    merges.push({ s: { r: secRowIdx, c: 0 }, e: { r: secRowIdx, c: maxCols - 1 } });
    sectionRowIndices.push(secRowIdx);

    const thRowIdx = aoa.length;
    aoa.push(sec.headers);
    headerRowMeta.push({ rowIdx: thRowIdx, colCount: sec.headers.length });

    const effectiveRows = sec.rows.length > 0 ? sec.rows : [['Không phát sinh dữ liệu trong kỳ']];
    effectiveRows.forEach((row, idx) => {
      const absR = aoa.length;
      aoa.push(row);
      dataRowMeta.push({ rowIdx: absR, colCount: sec.headers.length, zebra: idx % 2 === 1 });
    });

    aoa.push([]);
  }

  const ws = XLSXStyle.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;

  const setCellStyle = (r: number, c: number, s: Record<string, unknown>) => {
    const addr = XLSXStyle.utils.encode_cell({ r, c });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    ws[addr].s = s;
  };

  setCellStyle(0, 0, {
    font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } },
    fill: HEADER_FILL,
    alignment: { horizontal: 'left', vertical: 'center' }
  });
  setCellStyle(1, 0, {
    font: { italic: true, sz: 10, color: { rgb: '1E3A8A' } },
    fill: SUBHEADER_FILL,
    alignment: { horizontal: 'left', vertical: 'center' }
  });
  setCellStyle(2, 0, {
    font: { bold: true, sz: 11, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  });
  setCellStyle(3, 0, {
    font: { sz: 9, color: { rgb: '64748B' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  });

  for (const r of sectionRowIndices) {
    setCellStyle(r, 0, {
      font: { bold: true, sz: 10.5, color: { rgb: '1E3A8A' } },
      fill: SECTION_FILL,
      border: BORDER_THIN,
      alignment: { horizontal: 'left', vertical: 'center' }
    });
  }

  for (const { rowIdx, colCount } of headerRowMeta) {
    for (let c = 0; c < colCount; c++) {
      setCellStyle(rowIdx, c, {
        font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
        fill: TH_FILL,
        border: BORDER_THIN,
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
      });
    }
  }

  for (const { rowIdx, colCount, zebra } of dataRowMeta) {
    for (let c = 0; c < colCount; c++) {
      const addr = XLSXStyle.utils.encode_cell({ r: rowIdx, c });
      const cell = ws[addr];
      const isNumber = cell && typeof cell.v === 'number';
      setCellStyle(rowIdx, c, {
        font: { sz: 10, color: { rgb: '0F172A' } },
        fill: zebra ? ZEBRA_FILL : undefined,
        border: BORDER_THIN,
        alignment: {
          horizontal: isNumber ? 'right' : 'left',
          vertical: 'center',
          wrapText: true
        }
      });
    }
  }

  ws['!cols'] = colWidths.map((wch) => ({ wch }));
  ws['!rows'] = [{ hpt: 24 }, { hpt: 18 }, { hpt: 20 }, { hpt: 16 }];
  ws['!views'] = [{ state: 'frozen', ySplit: 4 }];
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
        [34, 24, 34, 52]
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
    const qcRows: (string | number)[][] = [
      ...qcTools.checkSheet.rows.map((r) => ['Phiếu kiểm tra', r.label, ...r.counts.map(String), r.total]),
      ...qcTools.paretoDefects.map((p) => ['Pareto Lỗi', p.name, p.count, `${p.pct.toFixed(1)}%`, `${(p.cumPct ?? 0).toFixed(1)}%`])
    ];
    XLSXStyle.utils.book_append_sheet(
      wb,
      buildMultiSectionSheet(
        'THỊ TRƯỜNG, LINH KIỆN LỖI & CÔNG CỤ QC',
        pLabel,
        rLabel,
        [
          { title: '1. PHẢN ÁNH THỊ TRƯỜNG', headers: ['Ngày', 'Đại lý', 'Dòng xe', 'Nhóm lỗi', 'Loại phản ánh', 'Mức độ', 'Trạng thái', 'Mô tả'], rows: marketRows },
          { title: '2. THẨM ĐỊNH LINH KIỆN LỖI (BM-KTTD-01)', headers: ['Ngày', 'Mã BB', 'Linh kiện', 'SL', 'Dòng xe', 'Đại lý', 'NCC', 'Hạn BH', 'Nguyên nhân gốc', 'Phương án XL', 'Hiện trạng'], rows: partRows },
          { title: '3. CÔNG CỤ QC (CHECK SHEET & PARETO)', headers: ['Công cụ', 'Hạng mục', ...qcTools.checkSheet.columns, 'Tổng / Tích lũy'], rows: qcRows }
        ],
        [14, 18, 22, 12, 16, 18, 18, 16, 18, 16, 30]
      ),
      'Thi truong & LK'
    );

    // =========================================================
    // SHEET 4: CAPA, ECO & CÔNG VIỆC (BAO GỒM TỒN ĐỌNG KỲ CŨ)
    // =========================================================
    const capaEcoRows: (string | number)[][] = [
      ...capaEco.capasAll
        .filter((c) => (c.status !== 'Closed' && c.status !== 'Đã đóng') || capaEco.capasInPeriod.some((p) => p.id === c.id))
        .map((c) => [
          'CAPA',
          c.CAPAID || c.id,
          c.title || c.issue || '--',
          c.source || '--',
          c.priority || '--',
          c.status || '--',
          c.owner || c.assignee || '--',
          formatDateStrVi(c.dueDate || c.targetDate)
        ]),
      ...capaEco.ecosInPeriod.map((e) => [
        'ECO',
        e.ecrId || e.id,
        e.content || e.component || '--',
        e.category || '--',
        e.model || '--',
        e.status || '--',
        e.proposer || '--',
        formatDateStrVi(e.applyDate)
      ])
    ];
    const workRows: (string | number)[][] = work.dailyLogsInPeriod.map((w) => [
      formatDateStrVi(w.date),
      w.assignee || '--',
      w.category || '--',
      w.statusPercent || '--',
      w.result || '--',
      w.content || '',
      w.note || ''
    ]);
    const backlogRows: (string | number)[][] = [
      ...work.pendingDailyLogs.map((w) => [
        `Việc tồn ${period.type === 'week' ? 'tuần trước' : 'tháng trước'}`,
        w.id || String(w.stt),
        w.content,
        w.assignee || '--',
        `${formatDateStrVi(w.date)} (${w.statusPercent || 'Chưa 100%'})`
      ]),
      ...capaEco.overdueCapas.map((c) => ['CAPA quá hạn', c.CAPAID || c.id, c.title || c.issue || '--', c.owner || c.assignee || '--', formatDateStrVi(c.dueDate || c.targetDate)]),
      ...work.ptspOverdue.map((t) => ['PTSP trễ hạn', t.id, t.name, t.executor || '--', formatDateStrVi(t.endDate)]),
      ...work.planningTasksOverdue.map((t) => ['Kế hoạch quá hạn', t.id, t.title, t.assignee || '--', t.deadline ? formatDateStrVi(t.deadline) : t.week || '--'])
    ];
    const planTaskRows: (string | number)[][] = work.planningTasksInPeriod.map((t) => [
      t.section.toUpperCase(),
      t.title,
      t.assignee || '--',
      t.deadline ? formatDateStrVi(t.deadline) : t.week || '--',
      t.priority,
      t.status === 'Completed' ? 'Hoàn thành' : t.status === 'In_Progress' ? 'Đang làm' : 'Chờ xử lý',
      t.modelOrSupplier || '--',
      t.notes || ''
    ]);
    XLSXStyle.utils.book_append_sheet(
      wb,
      buildMultiSectionSheet(
        'CAPA, ECO & CÔNG VIỆC',
        pLabel,
        rLabel,
        [
          { title: '1. THEO DÕI CAPA & ECO', headers: ['Phân loại', 'Mã', 'Tiêu đề / Nội dung', 'Nguồn / Nhóm', 'Mức độ / Model', 'Trạng thái', 'Phụ trách / Đề xuất', 'Hạn / Áp dụng'], rows: capaEcoRows },
          { title: '2. CÔNG VIỆC BÁO CÁO NGÀY TRONG KỲ', headers: ['Ngày', 'Nhân sự', 'Nhóm', 'Tiến độ', 'Kết quả', 'Nội dung công việc', 'Ghi chú'], rows: workRows },
          { title: '3. CÔNG VIỆC TỒN ĐỌNG TỪ KỲ TRƯỚC & QUÁ HẠN', headers: ['Loại tồn đọng', 'Mã', 'Nội dung', 'Phụ trách', 'Ngày / Hạn'], rows: backlogRows },
          { title: '4. TÁC VỤ TỪ LẬP KẾ HOẠCH CHẤT LƯỢNG TRONG KỲ', headers: ['Nhóm', 'Nội dung tác vụ', 'Phụ trách', 'Hạn / Tuần', 'Ưu tiên', 'Trạng thái', 'Model / NCC', 'Ghi chú'], rows: planTaskRows }
        ],
        [22, 16, 38, 18, 18, 16, 22, 16]
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
