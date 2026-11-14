import { formatDateStrVi, ReportSnapshot } from './reportEngine';

type ToastFn = (msg: string, type?: 'success' | 'error' | 'info') => void;

function esc(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildParetoPrintSvg(snapshot: ReportSnapshot): string {
  const top = snapshot.qcTools.paretoDefects.slice(0, 6);
  if (top.length === 0) {
    return '<div style="padding:16px;text-align:center;color:#64748b;border:1px dashed #cbd5e1;border-radius:8px;font-size:12px;">Không phát sinh dữ liệu Pareto trong kỳ</div>';
  }
  const width = 520;
  const height = 180;
  const padL = 36;
  const padR = 36;
  const padT = 18;
  const padB = 46;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const maxCount = Math.max(1, ...top.map((i) => i.count));
  const stepX = plotW / top.length;
  const barW = Math.min(36, stepX * 0.56);

  const bars = top
    .map((item, idx) => {
      const cx = padL + idx * stepX + stepX / 2;
      const barH = (item.count / maxCount) * plotH;
      const x = cx - barW / 2;
      const y = padT + plotH - barH;
      const shortName = item.name.length > 12 ? `${item.name.slice(0, 11)}…` : item.name;
      return `
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(2, barH).toFixed(1)}" rx="3" fill="#2563eb" />
        <text x="${cx.toFixed(1)}" y="${Math.max(12, y - 4).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="700" fill="#0f172a">${item.count}</text>
        <text x="${cx.toFixed(1)}" y="${(padT + plotH + 13).toFixed(1)}" text-anchor="end" transform="rotate(-18 ${cx.toFixed(1)} ${(padT + plotH + 13).toFixed(1)})" font-size="9" fill="#334155">${esc(shortName)}</text>
      `;
    })
    .join('');

  const linePts = top
    .map((item, idx) => {
      const cx = padL + idx * stepX + stepX / 2;
      const cy = padT + plotH - ((item.cumPct ?? 0) / 100) * plotH;
      return `${cx.toFixed(1)},${cy.toFixed(1)}`;
    })
    .join(' ');

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;max-height:190px;">
      <line x1="${padL}" y1="${padT + plotH}" x2="${width - padR}" y2="${padT + plotH}" stroke="#94a3b8" stroke-width="1"/>
      <line x1="${padL}" y1="${padT + plotH * 0.2}" x2="${width - padR}" y2="${padT + plotH * 0.2}" stroke="#dc2626" stroke-width="1" stroke-dasharray="4 3"/>
      ${bars}
      ${top.length > 1 ? `<polyline fill="none" stroke="#f59e0b" stroke-width="2" points="${linePts}"/>` : ''}
    </svg>
  `;
}

export function printReportA4(snapshot: ReportSnapshot, onToast?: ToastFn): void {
  try {
    const win = window.open('', '_blank', 'width=1024,height=820');
    if (!win) {
      onToast?.('Trình duyệt đang chặn cửa sổ bật lên (Popup). Vui lòng cho phép mở popup để in PDF.', 'error');
      return;
    }

    const { period, qIndex, kpis, qcTools, warnings, highlights, note, market } = snapshot;

    const kpiCardsHtml = [
      ['Tỷ lệ đạt OQC', `${kpis.oqcYield.current.toFixed(1)}%`, `${kpis.oqcYield.passed}/${kpis.oqcYield.total} đạt`],
      ['Tỷ lệ đạt IQC', `${kpis.iqcPassRate.current.toFixed(1)}%`, `${kpis.iqcPassRate.passed}/${kpis.iqcPassRate.total} lô`],
      ['Xử lý PQC', `${kpis.pqcResolveRate.current.toFixed(1)}%`, `${kpis.pqcResolveRate.resolved}/${kpis.pqcResolveRate.total} điểm`],
      ['Xử lý Thị trường', `${kpis.marketResolveRate.current.toFixed(1)}%`, `${kpis.marketResolveRate.resolved}/${kpis.marketResolveRate.total} phản ánh`],
      ['LK lỗi thẩm định', `${kpis.partEvalQty.current} chiếc`, `${kpis.partEvalQty.records} biên bản`],
      ['CAPA mở / Quá hạn', `${kpis.capaOpen.total} / ${kpis.capaOpen.overdue}`, `Đóng kỳ này: ${kpis.capaOpen.closedInPeriod}`],
      ['Tuân thủ báo ngày', `${kpis.dailyCompliance.current.toFixed(1)}%`, `${kpis.dailyCompliance.completed}/${kpis.dailyCompliance.total} việc`],
      ['Chi phí COPQ', `${kpis.copqAmount.current.toLocaleString('vi-VN')} đ`, `Kỳ trước: ${kpis.copqAmount.previous.toLocaleString('vi-VN')} đ`]
    ]
      .map(
        ([label, val, sub]) => `
        <div class="kpi-box">
          <div class="kpi-label">${esc(label)}</div>
          <div class="kpi-val">${esc(val)}</div>
          <div class="kpi-sub">${esc(sub)}</div>
        </div>`
      )
      .join('');

    const checkSheetRowsHtml = qcTools.checkSheet.rows
      .slice(0, 8)
      .map(
        (r) => `
        <tr>
          <td>${esc(r.label)}</td>
          ${r.counts.map((c) => `<td class="num">${c || '-'}</td>`).join('')}
          <td class="num bold">${r.total}</td>
        </tr>`
      )
      .join('');

    const alertsHtml = [...warnings.slice(0, 5), ...highlights.slice(0, 3)]
      .map(
        (a) =>
          `<li><strong>[${esc(a.category)}]</strong> ${esc(a.title)} — <span style="color:#475569">${esc(a.detail)}</span></li>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Báo cáo QLCL - ${esc(period.label)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
    body { margin: 0; color: #0f172a; font-size: 11.5px; line-height: 1.45; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 12px; }
    .company { font-size: 14px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; }
    .brand { font-size: 11px; color: #334155; font-weight: 600; margin-top: 2px; }
    .doc-meta { text-align: right; font-size: 11px; color: #475569; }
    .title-bar { background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .title-bar h1 { margin: 0; font-size: 16px; color: #1e3a8a; }
    .qindex-pill { background: #1e3a8a; color: #fff; padding: 6px 14px; border-radius: 8px; text-align: center; }
    .qindex-pill .score { font-size: 18px; font-weight: 800; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
    .kpi-box { border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 7px 9px; }
    .kpi-label { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .kpi-val { font-size: 15px; font-weight: 800; color: #0f172a; margin: 2px 0; }
    .kpi-sub { font-size: 10px; color: #64748b; }
    .section { margin-bottom: 12px; page-break-inside: avoid; }
    .section-title { font-size: 12px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; border-left: 4px solid #2563eb; padding-left: 8px; margin: 0 0 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; }
    th { background: #f1f5f9; font-weight: 700; color: #1e293b; }
    td.num, th.num { text-align: right; }
    td.bold { font-weight: 700; }
    .note-box { border: 1.5px solid #93c5fd; background: #f8fafc; border-radius: 6px; padding: 9px 12px; }
    .sign-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 20px; text-align: center; page-break-inside: avoid; }
    .sign-title { font-weight: 700; font-size: 11px; margin-bottom: 46px; }
    .sign-sub { font-size: 10px; color: #64748b; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="background:#0f172a;color:#fff;padding:8px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <span>Xem trước bản in A4 — ${esc(period.label)}</span>
    <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-weight:700;cursor:pointer;">In / Lưu PDF ngay</button>
  </div>

  <div class="header">
    <div>
      <div class="company">Công ty TNHH Xe điện DK Việt Nhật</div>
      <div class="brand">DKBike — Xe cho cả gia đình | Phòng Quản lý chất lượng (QLCL / DK QMS)</div>
    </div>
    <div class="doc-meta">
      <div><strong>Kỳ:</strong> ${esc(period.label)}</div>
      <div><strong>Thời gian:</strong> ${esc(period.rangeLabel)}</div>
      <div><strong>Xuất lúc:</strong> ${esc(new Date().toLocaleString('vi-VN'))}</div>
    </div>
  </div>

  <div class="title-bar">
    <div>
      <h1>BÁO CÁO CHẤT LƯỢNG ${period.type === 'week' ? 'TUẦN' : 'THÁNG'}</h1>
      <div style="font-size:11px;color:#475569;margin-top:2px;">Tổng hợp chỉ số OQC, IQC, PQC, Thị trường, Thẩm định linh kiện, CAPA & Công việc</div>
    </div>
    <div class="qindex-pill">
      <div style="font-size:10px;opacity:0.9;">CHỈ SỐ Q-INDEX</div>
      <div class="score">${qIndex.score.toFixed(1)} / 100</div>
      <div style="font-size:10px;font-weight:700;">${esc(qIndex.grade)}</div>
    </div>
  </div>

  <div class="kpi-grid">${kpiCardsHtml}</div>

  <div class="section">
    <div class="section-title">1. Công cụ QC: Phiếu kiểm tra & Biểu đồ Pareto</div>
    <div style="display:grid;grid-template-columns:1.15fr 1fr;gap:10px;align-items:start;">
      <div>
        <table>
          <thead>
            <tr>
              <th>Nhóm lỗi</th>
              ${qcTools.checkSheet.columns.map((c) => `<th class="num">${esc(c)}</th>`).join('')}
              <th class="num">Tổng</th>
            </tr>
          </thead>
          <tbody>
            ${checkSheetRowsHtml || '<tr><td colspan="10" style="text-align:center;color:#64748b;">Không phát sinh dữ liệu trong kỳ</td></tr>'}
          </tbody>
        </table>
      </div>
      <div>${buildParetoPrintSvg(snapshot)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">2. Top linh kiện lỗi thẩm định (BM-KTTD-01)</div>
    <table>
      <thead>
        <tr>
          <th>Linh kiện</th>
          <th class="num">SL lỗi</th>
          <th class="num">Tỷ trọng</th>
          <th class="num">Tích lũy</th>
        </tr>
      </thead>
      <tbody>
        ${
          market.topFailingParts.length > 0
            ? market.topFailingParts
                .slice(0, 6)
                .map(
                  (p) => `<tr><td>${esc(p.name)}</td><td class="num bold">${p.count}</td><td class="num">${p.pct.toFixed(1)}%</td><td class="num">${(p.cumPct ?? 0).toFixed(1)}%</td></tr>`
                )
                .join('')
            : '<tr><td colspan="4" style="text-align:center;color:#64748b;">Không phát sinh dữ liệu trong kỳ</td></tr>'
        }
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">3. Điểm sáng & Cảnh báo nổi bật</div>
    <ul style="margin:4px 0 0 18px;padding:0;">
      ${alertsHtml || '<li>Chưa có cảnh báo bất thường trong kỳ.</li>'}
    </ul>
  </div>

  ${
    snapshot.work.planningTasksInPeriod.length > 0
      ? `<div class="section">
    <div class="section-title">4. Tác vụ từ Lập kế hoạch Chất lượng (${snapshot.work.planningTasksInPeriod.length} việc trong kỳ • ${snapshot.work.planningTasksCompleted} hoàn thành)</div>
    <table>
      <thead>
        <tr>
          <th style="width:70px;">Nhóm</th>
          <th>Nội dung tác vụ</th>
          <th style="width:110px;">Phụ trách</th>
          <th style="width:80px;">Hạn</th>
          <th style="width:85px;">Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        ${snapshot.work.planningTasksInPeriod
          .slice(0, 20)
          .map(
            (t) => `<tr>
              <td>${esc(t.section.toUpperCase())}</td>
              <td>${esc(t.title)}</td>
              <td>${esc(t.assignee || '--')}</td>
              <td>${esc(t.deadline ? formatDateStrVi(t.deadline) : t.week || '--')}</td>
              <td>${esc(t.status === 'Completed' ? 'Hoàn thành' : t.status === 'In_Progress' ? 'Đang làm' : 'Chờ xử lý')}</td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>`
      : ''
  }

  <div class="section">
    <div class="section-title">${snapshot.work.planningTasksInPeriod.length > 0 ? '5' : '4'}. Nhận xét & Kết luận của Phòng QLCL</div>
    <div class="note-box">
      ${
        note
          ? `<div><strong>Nhận định chung:</strong> ${esc(note.summary)}</div>
             ${note.highlights ? `<div style="margin-top:4px;"><strong>Điểm nhấn:</strong> ${esc(note.highlights)}</div>` : ''}
             ${note.nextActions ? `<div style="margin-top:4px;"><strong>Kế hoạch kỳ tới:</strong> ${esc(note.nextActions)}</div>` : ''}`
          : '<div style="color:#64748b;font-style:italic;">Chưa nhập nhận xét QLCL cho kỳ báo cáo này.</div>'
      }
    </div>
  </div>

  <div class="sign-grid">
    <div>
      <div class="sign-title">NGƯỜI LẬP BÁO CÁO</div>
      <div class="sign-sub">${esc(note?.author || '(Ký và ghi rõ họ tên)')}</div>
    </div>
    <div>
      <div class="sign-title">TRƯỞNG PHÒNG QLCL</div>
      <div class="sign-sub">(Ký và ghi rõ họ tên)</div>
    </div>
    <div>
      <div class="sign-title">BAN GIÁM ĐỐC</div>
      <div class="sign-sub">(Phê duyệt / Chỉ đạo)</div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 250);
    });
  </script>
</body>
</html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
  } catch (err) {
    console.error('Print report failed:', err);
    onToast?.(
      `Lỗi khi mở trang in báo cáo: ${err instanceof Error ? err.message : 'Không xác định'}`,
      'error'
    );
  }
}

export function buildSummaryCopyText(snapshot: ReportSnapshot): string {
  const { period, qIndex, kpis, warnings, note } = snapshot;
  const lines = [
    `[DKBike - QLCL] BÁO CÁO ${period.type === 'week' ? 'TUẦN' : 'THÁNG'} (${period.label} | ${period.rangeLabel})`,
    `• Q-Index tổng hợp: ${qIndex.score.toFixed(1)}/100 (${qIndex.grade})`,
    `• OQC: ${kpis.oqcYield.current.toFixed(1)}% (${kpis.oqcYield.passed}/${kpis.oqcYield.total} xe đạt)`,
    `• IQC: ${kpis.iqcPassRate.current.toFixed(1)}% (${kpis.iqcPassRate.passed}/${kpis.iqcPassRate.total} lô đạt)`,
    `• PQC: ${kpis.pqcResolveRate.current.toFixed(1)}% (${kpis.pqcResolveRate.resolved}/${kpis.pqcResolveRate.total} điểm đã xử lý)`,
    `• Thị trường: ${kpis.marketResolveRate.current.toFixed(1)}% (${kpis.marketResolveRate.resolved}/${kpis.marketResolveRate.total} phản ánh; Mức A: ${kpis.marketResolveRate.sevA})`,
    `• LK lỗi thẩm định: ${kpis.partEvalQty.current} chiếc (${kpis.partEvalQty.records} biên bản)`,
    `• CAPA mở: ${kpis.capaOpen.total} (Quá hạn: ${kpis.capaOpen.overdue} | Đóng kỳ này: ${kpis.capaOpen.closedInPeriod})`,
    `• Báo ngày: ${kpis.dailyCompliance.current.toFixed(1)}% (${kpis.dailyCompliance.completed}/${kpis.dailyCompliance.total} việc)`
  ];

  if (warnings.length > 0) {
    lines.push('', 'Cảnh báo chính:');
    warnings.slice(0, 3).forEach((w) => lines.push(`- ${w.title} (${w.detail})`));
  }

  if (note?.summary) {
    lines.push('', `Nhận xét QLCL: ${note.summary}`);
  }
  return lines.join('\n');
}

