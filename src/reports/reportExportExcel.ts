import XLSXStyle from 'xlsx-js-style';
import { formatDateStrVi, ReportSnapshot } from './reportEngine';

type ToastFn = (msg: string, type?: 'success' | 'error' | 'info') => void;

const BRAND_TITLE = 'CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT';
const BRAND_SUB = 'DKBike — Xe cho cả gia đình | Phòng Quản lý chất lượng (QLCL / DK QMS)';

const HEADER_FILL = { fgColor: { rgb: '1E3A8A' } };
const SUBHEADER_FILL = { fgColor: { rgb: 'EFF6FF' } };
const TH_FILL = { fgColor: { rgb: '1D4ED8' } };
const ZEBRA_FILL = { fgColor: { rgb: 'F8FAFC' } };
const BORDER_THIN = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } }
};

function buildSheetWithBanner(
  title: string,
  periodLabel: string,
  rangeLabel: string,
  headers: string[],
  rows: (string | number)[][],
  colWidths: number[],
  extraTopRows: (string | number)[][] = []
) {
  const colCount = Math.max(headers.length, 4);
  const aoa: (string | number)[][] = [
    [BRAND_TITLE],
    [BRAND_SUB],
    [`${title} — ${periodLabel} (${rangeLabel})`],
    [`Ngày xuất: ${new Date().toLocaleString('vi-VN')}`],
    ...extraTopRows,
    [],
    headers,
    ...(rows.length > 0 ? rows : [['Không phát sinh dữ liệu trong kỳ']])
  ];

  const ws = XLSXStyle.utils.aoa_to_sheet(aoa);
  const headerRowIdx = 5 + extraTopRows.length + 1; // 0-indexed row of headers

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } }
  ];

  // Banner styling
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

  // Table header row
  for (let c = 0; c < headers.length; c++) {
    setCellStyle(headerRowIdx, c, {
      font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
      fill: TH_FILL,
      border: BORDER_THIN,
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
    });
  }

  // Data rows
  const effectiveRows = rows.length > 0 ? rows.length : 1;
  for (let r = 0; r < effectiveRows; r++) {
    const absR = headerRowIdx + 1 + r;
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSXStyle.utils.encode_cell({ r: absR, c });
      const cell = ws[addr];
      const isNumber = cell && typeof cell.v === 'number';
      setCellStyle(absR, c, {
        font: { sz: 10, color: { rgb: '0F172A' } },
        fill: r % 2 === 1 ? ZEBRA_FILL : undefined,
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
  ws['!views'] = [{ state: 'frozen', ySplit: headerRowIdx + 1 }];
  return ws;
}

export function exportReportToExcel(snapshot: ReportSnapshot, onToast?: ToastFn): void {
  try {
    const wb = XLSXStyle.utils.book_new();
    const { period, qIndex, kpis, production, market, capaEco, work, qcTools, note } = snapshot;
    const pLabel = period.label;
    const rLabel = period.rangeLabel;

    // 1. Tóm tắt
    const summaryRows: (string | number)[][] = [
      ['Chỉ số Q-Index tổng hợp', `${qIndex.score.toFixed(1)} / 100 (${qIndex.grade})`, qIndex.formulaText],
      ['Tỷ lệ đạt OQC', `${kpis.oqcYield.current.toFixed(1)}%`, `Đạt ${kpis.oqcYield.passed}/${kpis.oqcYield.total} (so kỳ trước: ${kpis.oqcYield.delta >= 0 ? '+' : ''}${kpis.oqcYield.delta.toFixed(1)}%)`],
      ['Tỷ lệ đạt lô IQC', `${kpis.iqcPassRate.current.toFixed(1)}%`, `Đạt ${kpis.iqcPassRate.passed}/${kpis.iqcPassRate.total} lô`],
      ['Tỷ lệ xử lý PQC', `${kpis.pqcResolveRate.current.toFixed(1)}%`, `Đã xử lý ${kpis.pqcResolveRate.resolved}/${kpis.pqcResolveRate.total} điểm`],
      ['Tỷ lệ xử lý Phản ánh thị trường', `${kpis.marketResolveRate.current.toFixed(1)}%`, `Đóng ${kpis.marketResolveRate.resolved}/${kpis.marketResolveRate.total} | Lỗi mức A: ${kpis.marketResolveRate.sevA}`],
      ['Linh kiện lỗi thẩm định (PTSP)', `${kpis.partEvalQty.current} chiếc`, `${kpis.partEvalQty.records} biên bản (NCC ${kpis.partEvalQty.nccPct.toFixed(0)}%, SX ${kpis.partEvalQty.sxPct.toFixed(0)}%, KH ${kpis.partEvalQty.khPct.toFixed(0)}%)`],
      ['CAPA đang mở / Quá hạn', `${kpis.capaOpen.total} mở / ${kpis.capaOpen.overdue} quá hạn`, `Đóng trong kỳ: ${kpis.capaOpen.closedInPeriod}`],
      ['Tuân thủ báo cáo ngày', `${kpis.dailyCompliance.current.toFixed(1)}%`, `Hoàn thành ${kpis.dailyCompliance.completed}/${kpis.dailyCompliance.total} đầu việc`],
      ['Chi phí chất lượng kém (COPQ)', `${kpis.copqAmount.current.toLocaleString('vi-VN')} đ`, `So kỳ trước: ${kpis.copqAmount.delta >= 0 ? '+' : ''}${kpis.copqAmount.delta.toLocaleString('vi-VN')} đ`],
      ['Nhận xét QLCL', note?.summary || 'Chưa có nhận xét QLCL trong kỳ', note?.author ? `Người lập: ${note.author}` : '']
    ];
    XLSXStyle.utils.book_append_sheet(
      wb,
      buildSheetWithBanner('BÁO CÁO CHẤT LƯỢNG TỔNG HỢP', pLabel, rLabel, ['Hạng mục', 'Giá trị kỳ này', 'Chi tiết / Ghi chú'], summaryRows, [34, 24, 62]),
      'Tom tat'
    );

    // 2. KPI & Q-Index thành phần
    const kpiRows: (string | number)[][] = qIndex.components.map((c) => [
      c.label,
      `${c.weight}%`,
      c.score === null ? 'Không phát sinh' : Number(c.score.toFixed(1)),
      c.detail
    ]);
    XLSXStyle.utils.book_append_sheet(
      wb,
      buildSheetWithBanner('CHI TIẾT CHỈ SỐ Q-INDEX', pLabel, rLabel, ['Thành phần', 'Trọng số', 'Điểm', 'Diễn giải'], kpiRows, [28, 14, 18, 52]),
      'Q-Index & KPI'
    );

    // 3. IQC
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
    XLSXStyle.utils.book_append_sheet(
      wb,
      buildSheetWithBanner('KIỂM TRA ĐẦU VÀO (IQC)', pLabel, rLabel, ['Ngày', 'Số phiếu', 'Nhà cung cấp', 'Linh kiện / Nội dung', 'SL nhập', 'SL mẫu', 'SL lỗi', 'Kết quả', 'Chi tiết lỗi'], iqcRows, [13, 16, 26, 32, 10, 10, 10, 12, 34]),
      'IQC'
    );

    // 4. PQC
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
    XLSXStyle.utils.book_append_sheet(
      wb,
      buildSheetWithBanner('KIỂM SOÁT QUÁ TRÌNH (PQC)', pLabel, rLabel, ['Ngày', 'LSX', 'Dòng xe', 'SL', 'Trạng thái', 'Người kiểm', 'Phát hiện', 'Hướng xử lý'], pqcRows, [13, 14, 16, 10, 16, 18, 36, 32]),
      'PQC'
    );

    // 5. OQC (Model summary + failed vehicles)
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
      buildSheetWithBanner('XE LỖI THÀNH PHẨM (OQC)', pLabel, rLabel, ['Ngày', 'LSX', 'Dòng xe', 'Màu', 'Số khung/Serial', 'Kết quả', 'Nguồn gốc lỗi', 'Mô tả lỗi', 'Xử lý'], oqcRows, [13, 14, 16, 12, 18, 12, 18, 34, 28]),
      'OQC Loi'
    );

    // 6. Thị trường
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
    XLSXStyle.utils.book_append_sheet(
      wb,
      buildSheetWithBanner('PHẢN ÁNH THỊ TRƯỜNG', pLabel, rLabel, ['Ngày', 'Đại lý', 'Dòng xe', 'Nhóm lỗi', 'Loại phản ánh', 'Mức độ', 'Trạng thái', 'Mô tả'], marketRows, [13, 24, 16, 22, 18, 10, 16, 36]),
      'Thi truong'
    );

    // 7. Linh kiện lỗi (BM-KTTD-01)
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
    XLSXStyle.utils.book_append_sheet(
      wb,
      buildSheetWithBanner('THẨM ĐỊNH LINH KIỆN LỖI (BM-KTTD-01)', pLabel, rLabel, ['Ngày', 'Mã BB', 'Linh kiện', 'SL', 'Dòng xe', 'Đại lý', 'NCC', 'Hạn BH', 'Nguyên nhân gốc', 'Phương án XL', 'Hiện trạng'], partRows, [13, 16, 22, 8, 14, 20, 20, 14, 18, 16, 34]),
      'Linh kien loi'
    );

    // 8. CAPA & ECO
    const capaRows: (string | number)[][] = [
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
    XLSXStyle.utils.book_append_sheet(
      wb,
      buildSheetWithBanner('THEO DÕI CAPA & ECO', pLabel, rLabel, ['Phân loại', 'Mã', 'Tiêu đề / Nội dung', 'Nguồn / Nhóm', 'Mức độ / Model', 'Trạng thái', 'Phụ trách / Đề xuất', 'Hạn / Áp dụng'], capaRows, [10, 15, 36, 18, 14, 16, 20, 14]),
      'CAPA & ECO'
    );

    // 9. Công việc hàng ngày & Tồn đọng
    const workRows: (string | number)[][] = work.dailyLogsInPeriod.map((w) => [
      formatDateStrVi(w.date),
      w.assignee || '--',
      w.category || '--',
      w.statusPercent || '--',
      w.result || '--',
      w.content || '',
      w.note || ''
    ]);
    XLSXStyle.utils.book_append_sheet(
      wb,
      buildSheetWithBanner('CÔNG VIỆC BÁO CÁO NGÀY', pLabel, rLabel, ['Ngày', 'Nhân sự', 'Nhóm', 'Tiến độ', 'Kết quả', 'Nội dung công việc', 'Ghi chú'], workRows, [13, 20, 14, 12, 14, 44, 28]),
      'Cong viec'
    );

    // 10. 4 Công cụ QC (Check sheet + Pareto)
    const qcRows: (string | number)[][] = [
      ...qcTools.checkSheet.rows.map((r) => ['Phiếu kiểm tra', r.label, ...r.counts.map(String), r.total]),
      ['---', '---', ...qcTools.checkSheet.columns.map(() => ''), '---'],
      ...qcTools.paretoDefects.map((p) => ['Pareto Lỗi', p.name, p.count, `${p.pct.toFixed(1)}%`, `${(p.cumPct ?? 0).toFixed(1)}%`])
    ];
    XLSXStyle.utils.book_append_sheet(
      wb,
      buildSheetWithBanner('4 CÔNG CỤ QC (CHECK SHEET & PARETO)', pLabel, rLabel, ['Công cụ', 'Hạng mục', ...qcTools.checkSheet.columns, 'Tổng / Ghi chú'], qcRows, [16, 26, ...qcTools.checkSheet.columns.map(() => 10), 14]),
      'Cong cu QC'
    );

    // 11. Tồn đọng cần xử lý
    const backlogRows: (string | number)[][] = [
      ...capaEco.overdueCapas.map((c) => ['CAPA quá hạn', c.CAPAID || c.id, c.title || c.issue || '--', c.owner || c.assignee || '--', formatDateStrVi(c.dueDate || c.targetDate)]),
      ...work.pendingDailyLogs.map((w) => ['Việc tồn báo ngày', w.id || String(w.stt), w.content, w.assignee || '--', formatDateStrVi(w.date)]),
      ...work.ptspOverdue.map((t) => ['Nhiệm vụ PTSP trễ hạn', t.id, t.name, t.executor || '--', formatDateStrVi(t.endDate)])
    ];
    XLSXStyle.utils.book_append_sheet(
      wb,
      buildSheetWithBanner('DANH SÁCH TỒN ĐỌNG & QUÁ HẠN', pLabel, rLabel, ['Loại tồn đọng', 'Mã', 'Nội dung', 'Phụ trách', 'Hạn / Ngày'], backlogRows, [20, 16, 46, 20, 14]),
      'Ton dong'
    );

    const safeFileName = `Bao_cao_QLCL_${period.id}.xlsx`.replace(/[^a-zA-Z0-9._-]/g, '_');
    XLSXStyle.writeFile(wb, safeFileName);
    onToast?.(`Đã xuất file Excel: ${safeFileName}`, 'success');
  } catch (err) {
    console.error('Excel export failed:', err);
    onToast?.(
      `Lỗi khi xuất file Excel: ${err instanceof Error ? err.message : 'Không xác định'}`,
      'error'
    );
  }
}
