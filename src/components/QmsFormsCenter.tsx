import React, { useState, useMemo, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Search, 
  ArrowLeft, 
  FileSpreadsheet, 
  CheckCircle2, 
  Layers, 
  ShieldCheck, 
  Users, 
  Eye, 
  Copy, 
  Check, 
  Wrench,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { QMS_FORM_TEMPLATES, QmsFormTemplate } from '../data/qmsFormsData';

interface QmsFormsCenterProps {
  onBackToApp?: () => void;
}

export default function QmsFormsCenter({ onBackToApp }: QmsFormsCenterProps) {
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [previewForm, setPreviewForm] = useState<QmsFormTemplate | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Bộ lọc danh sách biểu mẫu
  const filteredForms = useMemo(() => {
    return QMS_FORM_TEMPLATES.filter(form => {
      const matchDept = selectedDept === 'all' || form.department === selectedDept;
      const q = searchKeyword.trim().toLowerCase();
      const matchSearch = !q || 
        form.code.toLowerCase().includes(q) ||
        form.procedureCode.toLowerCase().includes(q) ||
        form.title.toLowerCase().includes(q) ||
        form.purpose.toLowerCase().includes(q) ||
        form.department.toLowerCase().includes(q);
      return matchDept && matchSearch;
    });
  }, [selectedDept, searchKeyword]);

  // Thống kê nhanh số lượng
  const stats = useMemo(() => {
    const total = QMS_FORM_TEMPLATES.length;
    const qlcl = QMS_FORM_TEMPLATES.filter(f => f.department === 'Lãnh đạo Phòng QLCL').length;
    const qc = QMS_FORM_TEMPLATES.filter(f => f.department === 'Bộ phận QC Hiện trường').length;
    const qa = QMS_FORM_TEMPLATES.filter(f => f.department === 'Bộ phận QA/QE').length;
    const kttd = QMS_FORM_TEMPLATES.filter(f => f.department === 'Bộ phận Kỹ thuật Thẩm định').length;
    return { total, qlcl, qc, qa, kttd };
  }, []);

  // Sao chép đường dẫn dkqms.cloud/bm
  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/bm` : 'https://dkqms.cloud/bm';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // In trực tiếp biểu mẫu qua Dedicated Print Engine Iframe A4 độc lập
  const handlePrintForm = (form: QmsFormTemplate) => {
    const zone = document.getElementById('qms-form-printable-document');
    if (!zone) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1024px;height:768px;border:0;opacity:0;pointer-events:none;z-index:-9999;';
    document.body.appendChild(iframe);

    const iwin = iframe.contentWindow;
    const idoc = iframe.contentDocument || iwin?.document;
    if (!iwin || !idoc) {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      window.print();
      return;
    }

    const docTitle = `DKBike_${form.code}_${form.title.replace(/[\/\s,:]/g, '_')}`;

    idoc.open();
    idoc.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>${docTitle}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 12mm 15mm 12mm; }
    html, body {
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: "Times New Roman", Times, serif;
      color: #000000 !important;
      font-size: 13px;
      line-height: 1.4;
    }
    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-document {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 auto;
      padding: 0 !important;
    }
    .company-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    .company-title {
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0;
    }
    .dept-title {
      font-size: 12px;
      font-weight: bold;
      margin: 2px 0 0 0;
    }
    .meta-box {
      text-align: right;
      font-size: 11.5px;
      font-style: italic;
    }
    .form-main-title {
      text-align: center;
      margin: 16px 0 14px 0;
    }
    .form-main-title h1 {
      font-size: 16px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0 0 4px 0;
    }
    .form-main-title p {
      font-size: 11.5px;
      font-style: italic;
      margin: 0;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
      margin-bottom: 16px;
      font-size: 12px;
    }
    .info-item {
      border-bottom: 1px dotted #666;
      padding-bottom: 2px;
    }
    table.qms-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 12px;
    }
    table.qms-table th, table.qms-table td {
      border: 1px solid #000;
      padding: 6px 8px;
      vertical-align: middle;
    }
    table.qms-table th {
      background-color: #f1f5f9 !important;
      font-weight: bold;
      text-align: center;
    }
    .section-title {
      font-size: 12.5px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 14px 0 6px 0;
    }
    .signatures-table {
      width: 100%;
      margin-top: 30px;
      border: none !important;
      text-align: center;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .signatures-table td {
      border: none !important;
      padding: 4px;
      vertical-align: top;
      width: 33.33%;
    }
    .sign-role {
      font-weight: bold;
      font-size: 12.5px;
      text-transform: uppercase;
    }
    .sign-sub {
      font-size: 11px;
      font-style: italic;
      color: #333;
    }
    .sign-space {
      height: 70px;
    }
  </style>
</head>
<body>
  <div class="print-document">
    ${zone.innerHTML}
  </div>
</body>
</html>`);
    idoc.close();

    const doCleanup = () => {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000);
    };

    iwin.addEventListener('afterprint', doCleanup);
    setTimeout(doCleanup, 120000);

    setTimeout(() => {
      try {
        iwin.focus();
        iwin.print();
      } catch (err) {
        console.error('Print iframe error:', err);
        doCleanup();
        window.print();
      }
    }, 450);
  };

  // Xuất file Microsoft Word (.doc) hoàn chỉnh
  const handleExportWord = (form: QmsFormTemplate) => {
    try {
      const headerContent = `
        <div style="display:flex; justify-content:space-between; border-bottom:2pt solid #000; padding-bottom:8pt; margin-bottom:14pt;">
          <div>
            <p style="margin:0; font-size:11pt; font-weight:bold; text-transform:uppercase;">CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT</p>
            <p style="margin:2pt 0 0 0; font-size:10pt; font-weight:bold; color:#1e293b;">PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL) - DK QMS</p>
            <p style="margin:2pt 0 0 0; font-size:9pt; font-style:italic; color:#64748b;">Khẩu hiệu: Xe cho cả gia đình | Tiêu chuẩn: ISO 9001:2015</p>
          </div>
          <div style="text-align:right; font-size:9.5pt;">
            <p style="margin:0;"><b>Mã BM:</b> <span style="color:#4338ca; font-weight:bold;">${form.code}</span></p>
            <p style="margin:2pt 0 0 0;"><b>Mã QT:</b> ${form.procedureCode}</p>
            <p style="margin:2pt 0 0 0;">Lần BH: ${form.revision} | Ngày HL: ${form.effectiveDate}</p>
          </div>
        </div>
      `;

      const titleContent = `
        <div style="text-align:center; margin:18pt 0 14pt 0;">
          <h1 style="font-size:14pt; font-weight:bold; text-transform:uppercase; margin:0 0 4pt 0; color:#0f172a;">${form.title}</h1>
          <p style="font-size:10pt; font-style:italic; margin:0; color:#475569;">(${form.subtitle || form.purpose})</p>
        </div>
      `;

      let fieldsHtml = '<div style="margin-bottom:14pt;"><table style="width:100%; border:none; font-size:10pt;">';
      for (let i = 0; i < form.fields.length; i += 2) {
        const f1 = form.fields[i];
        const f2 = form.fields[i + 1];
        fieldsHtml += `
          <tr>
            <td style="width:50%; padding:4pt 8pt 4pt 0; border-bottom:1pt dotted #94a3b8;">
              <b>${f1.label}:</b> ......................................................................
            </td>
            <td style="width:50%; padding:4pt 0 4pt 8pt; border-bottom:1pt dotted #94a3b8;">
              ${f2 ? `<b>${f2.label}:</b> ......................................................................` : ''}
            </td>
          </tr>
        `;
      }
      fieldsHtml += '</table></div>';

      let tablesHtml = '';
      form.tables.forEach(t => {
        tablesHtml += `
          <div style="margin:14pt 0 10pt 0;">
            <p style="font-size:10.5pt; font-weight:bold; text-transform:uppercase; margin:0 0 6pt 0; color:#1e293b;">${t.title}</p>
            <table style="width:100%; border-collapse:collapse; font-size:9.5pt;" border="1" cellpadding="6">
              <thead>
                <tr style="background-color:#f1f5f9; font-weight:bold; text-align:center;">
                  ${t.headers.map(h => `<th style="padding:6pt; border:1pt solid #000;">${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${t.rows.map(row => `
                  <tr>
                    ${row.map((cell, idx) => `
                      <td style="padding:5pt 6pt; border:1pt solid #000; text-align:${idx === 0 ? 'center' : 'left'};">
                        ${cell}
                      </td>
                    `).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      });

      let conclusionsHtml = '';
      if (form.conclusions && form.conclusions.length > 0) {
        conclusionsHtml += `
          <div style="margin:14pt 0; padding:8pt; border:1pt solid #cbd5e1; background-color:#f8fafc;">
            <p style="font-size:10.5pt; font-weight:bold; text-transform:uppercase; margin:0 0 6pt 0;">KẾT LUẬN & PHÁN QUYẾT XỬ LÝ:</p>
            ${form.conclusions.map(c => `
              <p style="margin:3pt 0; font-size:10pt;">
                <b>• ${c.label}:</b> <span>${c.content || '..................................................................................'}</span>
              </p>
            `).join('')}
          </div>
        `;
      }

      let signaturesHtml = `
        <div style="margin-top:24pt; page-break-inside:avoid;">
          <table style="width:100%; border:none; text-align:center; font-size:10pt;">
            <tr>
              ${form.signRoles.map(s => `
                <td style="width:33.33%; padding:4pt; vertical-align:top; border:none;">
                  <p style="margin:0; font-weight:bold; text-transform:uppercase; font-size:10pt;">${s.role}</p>
                  <p style="margin:2pt 0 0 0; font-style:italic; font-size:9pt; color:#475569;">(${s.title})</p>
                  <div style="height:65pt;"></div>
                  <p style="margin:0; font-style:italic; font-size:8.5pt; color:#64748b;">(Ký & ghi rõ họ tên)</p>
                </td>
              `).join('')}
            </tr>
          </table>
        </div>
      `;

      const htmlDocument = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${form.code} - ${form.title}</title>
          <style>
            @page WordSection1 { size:595.35pt 841.95pt; margin:42.5pt 42.5pt 42.5pt 42.5pt; mso-header-margin:35.4pt; mso-footer-margin:35.4pt; mso-paper-source:0; }
            div.WordSection1 { page:WordSection1; }
            body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; color: #000; }
          </style>
        </head>
        <body>
          <div class='WordSection1'>
            ${headerContent}
            ${titleContent}
            ${fieldsHtml}
            ${tablesHtml}
            ${conclusionsHtml}
            ${signaturesHtml}
          </div>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', htmlDocument], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DKBike_${form.code}_${form.title.replace(/[\/\s,:]/g, '_')}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi xuất Word:', err);
      alert('Không thể tạo file Word: ' + err);
    }
  };

  // Xuất file Excel (.csv) cho biểu mẫu
  const handleExportCsv = (form: QmsFormTemplate) => {
    try {
      const csvLines: string[] = [];
      csvLines.push(`"CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT - PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL)"`);
      csvLines.push(`"${form.code} - ${form.title}"`);
      csvLines.push(`"Mã Quy Trình: ${form.procedureCode} | Lần BH: ${form.revision} | Ngày HL: ${form.effectiveDate}"`);
      csvLines.push(`""`);

      // Phần trường thông tin
      form.fields.forEach(f => {
        csvLines.push(`"${f.label}","........................................................"`);
      });
      csvLines.push(`""`);

      // Các bảng biểu
      form.tables.forEach(t => {
        csvLines.push(`"${t.title}"`);
        csvLines.push(t.headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));
        t.rows.forEach(r => {
          csvLines.push(r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
        });
        csvLines.push(`""`);
      });

      // Kết luận
      if (form.conclusions) {
        csvLines.push(`"KẾT LUẬN & PHÁN QUYẾT"`);
        form.conclusions.forEach(c => {
          csvLines.push(`"${c.label}","${(c.content || '').replace(/"/g, '""')}"`);
        });
        csvLines.push(`""`);
      }

      // Chữ ký
      csvLines.push(`"BỘ PHẬN PHÊ DUYỆT RACI"`);
      csvLines.push(form.signRoles.map(s => `"${s.role} - ${s.title}"`).join(','));
      csvLines.push(form.signRoles.map(() => `"(Ký và ghi rõ họ tên)"`).join(','));

      const csvString = '\uFEFF' + csvLines.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DKBike_${form.code}_${form.title.replace(/[\/\s,:]/g, '_')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi xuất CSV:', err);
      alert('Không thể tạo file CSV: ' + err);
    }
  };

  // Tải trọn bộ 10 biểu mẫu chuẩn thành 1 tài liệu Word tổng thể
  const handleDownloadAllFormsDoc = () => {
    try {
      let fullBody = '';
      QMS_FORM_TEMPLATES.forEach((form, idx) => {
        const pageBreak = idx > 0 ? '<br clear=all style="mso-special-character:line-break;page-break-before:always">' : '';
        
        const headerContent = `
          <div style="display:flex; justify-content:space-between; border-bottom:2pt solid #000; padding-bottom:8pt; margin-bottom:12pt;">
            <div>
              <p style="margin:0; font-size:11pt; font-weight:bold; text-transform:uppercase;">CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT</p>
              <p style="margin:2pt 0 0 0; font-size:10pt; font-weight:bold; color:#1e293b;">PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL) - DK QMS</p>
              <p style="margin:2pt 0 0 0; font-size:9pt; font-style:italic; color:#64748b;">Khẩu hiệu: Xe cho cả gia đình | Tiêu chuẩn: ISO 9001:2015</p>
            </div>
            <div style="text-align:right; font-size:9.5pt;">
              <p style="margin:0;"><b>Mã BM:</b> <span style="color:#4338ca; font-weight:bold;">${form.code}</span></p>
              <p style="margin:2pt 0 0 0;"><b>Mã QT:</b> ${form.procedureCode}</p>
              <p style="margin:2pt 0 0 0;">Lần BH: ${form.revision} | Ngày HL: ${form.effectiveDate}</p>
            </div>
          </div>
        `;

        const titleContent = `
          <div style="text-align:center; margin:14pt 0 12pt 0;">
            <h1 style="font-size:13pt; font-weight:bold; text-transform:uppercase; margin:0 0 4pt 0; color:#0f172a;">${form.title}</h1>
            <p style="font-size:9.5pt; font-style:italic; margin:0; color:#475569;">(${form.subtitle || form.purpose})</p>
          </div>
        `;

        let fieldsHtml = '<div style="margin-bottom:12pt;"><table style="width:100%; border:none; font-size:9.5pt;">';
        for (let i = 0; i < form.fields.length; i += 2) {
          const f1 = form.fields[i];
          const f2 = form.fields[i + 1];
          fieldsHtml += `
            <tr>
              <td style="width:50%; padding:3pt 6pt 3pt 0; border-bottom:1pt dotted #94a3b8;">
                <b>${f1.label}:</b> ......................................................................
              </td>
              <td style="width:50%; padding:3pt 0 3pt 6pt; border-bottom:1pt dotted #94a3b8;">
                ${f2 ? `<b>${f2.label}:</b> ......................................................................` : ''}
              </td>
            </tr>
          `;
        }
        fieldsHtml += '</table></div>';

        let tablesHtml = '';
        form.tables.forEach(t => {
          tablesHtml += `
            <div style="margin:12pt 0 8pt 0;">
              <p style="font-size:10pt; font-weight:bold; text-transform:uppercase; margin:0 0 4pt 0; color:#1e293b;">${t.title}</p>
              <table style="width:100%; border-collapse:collapse; font-size:9pt;" border="1" cellpadding="5">
                <thead>
                  <tr style="background-color:#f1f5f9; font-weight:bold; text-align:center;">
                    ${t.headers.map(h => `<th style="padding:5pt; border:1pt solid #000;">${h}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${t.rows.map(row => `
                    <tr>
                      ${row.map((cell, cIdx) => `
                        <td style="padding:4pt 5pt; border:1pt solid #000; text-align:${cIdx === 0 ? 'center' : 'left'};">
                          ${cell}
                        </td>
                      `).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        });

        let conclusionsHtml = '';
        if (form.conclusions && form.conclusions.length > 0) {
          conclusionsHtml += `
            <div style="margin:12pt 0; padding:6pt; border:1pt solid #cbd5e1; background-color:#f8fafc;">
              <p style="font-size:10pt; font-weight:bold; text-transform:uppercase; margin:0 0 4pt 0;">KẾT LUẬN & PHÁN QUYẾT XỬ LÝ:</p>
              ${form.conclusions.map(c => `
                <p style="margin:2pt 0; font-size:9.5pt;">
                  <b>• ${c.label}:</b> <span>${c.content || '..................................................................................'}</span>
                </p>
              `).join('')}
            </div>
          `;
        }

        let signaturesHtml = `
          <div style="margin-top:20pt; page-break-inside:avoid;">
            <table style="width:100%; border:none; text-align:center; font-size:9.5pt;">
              <tr>
                ${form.signRoles.map(s => `
                  <td style="width:33.33%; padding:3pt; vertical-align:top; border:none;">
                    <p style="margin:0; font-weight:bold; text-transform:uppercase; font-size:9.5pt;">${s.role}</p>
                    <p style="margin:2pt 0 0 0; font-style:italic; font-size:8.5pt; color:#475569;">(${s.title})</p>
                    <div style="height:55pt;"></div>
                    <p style="margin:0; font-style:italic; font-size:8pt; color:#64748b;">(Ký & ghi rõ họ tên)</p>
                  </td>
                `).join('')}
              </tr>
            </table>
          </div>
        `;

        fullBody += `
          ${pageBreak}
          <div class="WordSection1">
            ${headerContent}
            ${titleContent}
            ${fieldsHtml}
            ${tablesHtml}
            ${conclusionsHtml}
            ${signaturesHtml}
          </div>
        `;
      });

      const fullDoc = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>Tron_Bo_10_Bieu_Mau_Chuan_DKBike_QLCL_2026</title>
          <style>
            @page WordSection1 { size:595.35pt 841.95pt; margin:42.5pt 42.5pt 42.5pt 42.5pt; }
            div.WordSection1 { page:WordSection1; }
            body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; color: #000; }
          </style>
        </head>
        <body>
          ${fullBody}
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', fullDoc], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Tron_Bo_10_Bieu_Mau_Chuan_Quan_Ly_Chat_Luong_DKBike_2026.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Không thể tạo file Word tổng hợp: ' + err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* ==================== HEADER TRUNG TÂM BIỂU MẪU ==================== */}
      <header className="bg-slate-850 border-b border-slate-700/80 sticky top-0 z-30 shadow-md backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl shadow-md border border-indigo-400/30">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  DK QMS FORMS CENTER
                </span>
                <span className="text-xs text-slate-400 font-bold hidden sm:inline">
                  • dkqms.cloud/bm
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight uppercase mt-0.5 flex items-center gap-2">
                Hệ Thống Biểu Mẫu Chuẩn Quản Lý Chất Lượng DKBike
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Nút Copy URL dkqms.cloud/bm */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700 active:scale-95"
              title="Sao chép đường dẫn trực tiếp: dkqms.cloud/bm"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedLink ? 'Đã chép link' : 'dkqms.cloud/bm'}</span>
            </button>

            {/* Nút Tải trọn bộ Word */}
            <button
              type="button"
              onClick={handleDownloadAllFormsDoc}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 border border-emerald-400/30"
              title="Tải trọn bộ toàn bộ 10 biểu mẫu chuẩn về máy tính dạng Word (.doc)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải trọn bộ 10 BM (.doc)</span>
            </button>

            {/* Nút quay lại ứng dụng */}
            <button
              type="button"
              onClick={() => {
                if (onBackToApp) {
                  onBackToApp();
                } else {
                  window.location.href = '/';
                }
              }}
              className="bg-indigo-650 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 border border-indigo-400/30"
              title="Quay lại giao diện phần mềm QMS chính"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Về QMS</span>
            </button>
          </div>
        </div>
      </header>

      {/* ==================== NỘI DUNG CHÍNH ==================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-6">
        {/* Banner Nhận diện Doanh nghiệp & 4 Trụ Cột Tổ Chức */}
        <div className="bg-gradient-to-r from-slate-850 via-slate-800 to-indigo-950/60 p-5 sm:p-6 rounded-2xl border border-slate-700/80 shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT • DKBIKE
              </p>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                Bộ Biểu Mẫu Nghiệp Vụ Chuẩn Hóa Phòng Quản Lý Chất Lượng (P-QLCL)
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Hệ thống 10 biểu mẫu chuẩn hóa theo tiêu chuẩn Quốc tế ISO 9001:2015 và ma trận phân nhiệm RACI 
                (Thực thi - Xác nhận - Phê duyệt), kết nối trực tiếp với dòng dữ liệu số hóa của phần mềm DK QMS.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
              <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Phiên bản ban hành</span>
                <span className="text-xs font-black text-amber-300">V4.0 (11/2026)</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Tổng biểu mẫu</span>
                <span className="text-base font-black text-blue-400 tabular-nums">{stats.total} BM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Thanh 4 Khối Trụ Cột & Bộ Lọc Phòng Ban */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => setSelectedDept('all')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
              selectedDept === 'all'
                ? 'bg-indigo-600/30 border-indigo-500 shadow-md'
                : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tất cả biểu mẫu</span>
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tabular-nums">{stats.total}</span>
              <span className="text-[10px] text-slate-400 font-bold">mẫu</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDept('Lãnh đạo Phòng QLCL')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
              selectedDept === 'Lãnh đạo Phòng QLCL'
                ? 'bg-rose-600/30 border-rose-500 shadow-md'
                : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">Lãnh đạo P-QLCL</span>
              <ShieldCheck className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tabular-nums">{stats.qlcl}</span>
              <span className="text-[10px] text-slate-400 font-bold">Stop-Line</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDept('Bộ phận QC Hiện trường')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
              selectedDept === 'Bộ phận QC Hiện trường'
                ? 'bg-blue-600/30 border-blue-500 shadow-md'
                : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">QC Hiện trường</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tabular-nums">{stats.qc}</span>
              <span className="text-[10px] text-slate-400 font-bold">IQC/IPQC/OQC</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDept('Bộ phận QA/QE')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
              selectedDept === 'Bộ phận QA/QE'
                ? 'bg-purple-600/30 border-purple-500 shadow-md'
                : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">BP QA / QE</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tabular-nums">{stats.qa}</span>
              <span className="text-[10px] text-slate-400 font-bold">CAR/PAR & SQE</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDept('Bộ phận Kỹ thuật Thẩm định')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between col-span-2 md:col-span-1 ${
              selectedDept === 'Bộ phận Kỹ thuật Thẩm định'
                ? 'bg-amber-600/30 border-amber-500 shadow-md'
                : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Kỹ thuật Thẩm định</span>
              <Wrench className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tabular-nums">{stats.kttd}</span>
              <span className="text-[10px] text-slate-400 font-bold">Bảo hành & TB</span>
            </div>
          </button>
        </div>

        {/* Thanh Tìm Kiếm Biểu Mẫu */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-800/70 p-3 rounded-xl border border-slate-700/80">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm theo mã BM (BM-QC-01), tên biểu mẫu, quy trình..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="text-xs text-slate-400 font-bold flex items-center gap-2 self-end sm:self-auto">
            <span>Hiển thị: <strong className="text-indigo-400">{filteredForms.length}</strong> / {stats.total} biểu mẫu</span>
          </div>
        </div>

        {/* Lưới Danh Sách Các Biểu Mẫu */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredForms.map((form) => {
            const deptColors: Record<string, { badge: string; border: string }> = {
              'Lãnh đạo Phòng QLCL': { badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30', border: 'hover:border-rose-500/50' },
              'Bộ phận QC Hiện trường': { badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30', border: 'hover:border-blue-500/50' },
              'Bộ phận QA/QE': { badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30', border: 'hover:border-purple-500/50' },
              'Bộ phận Kỹ thuật Thẩm định': { badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', border: 'hover:border-amber-500/50' },
            };
            const col = deptColors[form.department] || { badge: 'bg-slate-700 text-slate-300 border-slate-600', border: 'hover:border-slate-500' };

            return (
              <div
                key={form.id}
                className={`bg-slate-800/90 rounded-2xl border border-slate-700/80 p-5 shadow-md flex flex-col justify-between transition-all ${col.border}`}
              >
                <div>
                  {/* Mã biểu mẫu & Bộ phận */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-indigo-600 text-white tracking-wide shadow-xs">
                        {form.code}
                      </span>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                        {form.procedureCode}
                      </span>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${col.badge}`}>
                      {form.department}
                    </span>
                  </div>

                  {/* Tên biểu mẫu */}
                  <h3 className="text-sm sm:text-base font-black text-white leading-snug">
                    {form.title}
                  </h3>

                  {/* Phụ đề & Mục đích */}
                  <p className="text-xs text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                    {form.subtitle || form.purpose}
                  </p>

                  {/* Thông số kỹ thuật của biểu mẫu */}
                  <div className="mt-3 pt-3 border-t border-slate-700/60 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div>
                      <span>Lần BH / Hiệu lực:</span>
                      <span className="font-bold text-slate-200 block">Lần {form.revision} ({form.effectiveDate})</span>
                    </div>
                    <div>
                      <span>Phê duyệt RACI:</span>
                      <span className="font-bold text-indigo-300 block truncate" title={form.signRoles.map(s => s.role).join(' • ')}>
                        {form.signRoles.map(s => s.type).join(' ➔ ')} ({form.signRoles[form.signRoles.length - 1].title})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Các nút Thao tác: Xem, In, Tải Word, Tải CSV */}
                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPreviewForm(form)}
                    className="bg-slate-700/80 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-600 active:scale-95"
                    title="Xem chi tiết biểu mẫu và in ấn"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Xem mẫu A4</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleExportWord(form)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                      title="Tải biểu mẫu Microsoft Word (.doc)"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Word (.doc)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportCsv(form)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                      title="Tải biểu mẫu Excel (.csv)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel (.csv)</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ==================== MODAL XEM CHI TIẾT BIỂU MẪU CHUẨN A4 ==================== */}
      {previewForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-850 px-5 py-3.5 border-b border-slate-700/80 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-indigo-600 text-white">
                  {previewForm.code}
                </span>
                <h3 className="font-bold text-sm text-slate-100 truncate max-w-md sm:max-w-xl">
                  {previewForm.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintForm(previewForm)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="In trực tiếp bản A4 hoặc Lưu dạng PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In A4 / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportWord(previewForm)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Tải file Word (.doc)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Tải Word</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewForm(null)}
                  className="text-slate-400 hover:text-white p-1 hover:bg-slate-700 rounded-lg transition text-base font-bold ml-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body - Bản in A4 Giấy Trắng Chữ Đen Trực Quan */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/60 select-text">
              <div 
                id="qms-form-printable-document"
                className="bg-white text-slate-900 border border-slate-300 shadow-xl p-8 sm:p-12 mx-auto max-w-3xl rounded-none font-serif text-[12.5px] leading-relaxed min-h-[297mm]"
              >
                {/* Header Tiêu Chuẩn Doanh Nghiệp */}
                <div className="company-header flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-5">
                  <div className="font-sans text-left">
                    <h1 className="company-title font-black text-slate-900 text-xs sm:text-sm uppercase tracking-tight">
                      CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT
                    </h1>
                    <p className="dept-title text-[10.5px] text-slate-600 font-extrabold font-mono mt-0.5 uppercase tracking-wide">
                      PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL) - DK QMS
                    </p>
                    <p className="text-[9.5px] text-slate-500 italic mt-0.5">
                      Khẩu hiệu: "Xe cho cả gia đình" | Tiêu chuẩn: ISO 9001:2015
                    </p>
                  </div>
                  <div className="meta-box text-right text-[10.5px] font-mono leading-tight text-slate-600">
                    <p className="font-bold">Mã số: <span className="text-indigo-700">{previewForm.code}</span></p>
                    <p>Mã quy trình: {previewForm.procedureCode}</p>
                    <p>Lần ban hành: {previewForm.revision} | Ngày: {previewForm.effectiveDate}</p>
                  </div>
                </div>

                {/* Tiêu Đề Biểu Mẫu */}
                <div className="form-main-title text-center my-5">
                  <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide border-b pb-1.5 max-w-max mx-auto border-slate-300">
                    {previewForm.title}
                  </h1>
                  <p className="text-[11px] italic text-slate-500 mt-1">
                    ({previewForm.subtitle || previewForm.purpose})
                  </p>
                </div>

                {/* Danh mục các trường thông tin chung */}
                <div className="info-grid grid grid-cols-2 gap-x-6 gap-y-2 mb-4 text-[11.5px] font-sans">
                  {previewForm.fields.map((f, fIdx) => (
                    <div key={fIdx} className="info-item border-b border-dotted border-slate-400 pb-1 flex justify-between">
                      <span className="font-bold text-slate-700">{f.label}:</span>
                      <span className="text-slate-400 italic">....................................................</span>
                    </div>
                  ))}
                </div>

                {/* Các Bảng Biểu Kỹ Thuật / Nghiệm Thu */}
                {previewForm.tables.map((tbl, tIdx) => (
                  <div key={tIdx} className="my-4">
                    <h4 className="section-title text-xs font-bold text-slate-900 uppercase mb-2">
                      {tbl.title}
                    </h4>
                    <table className="qms-table w-full border-collapse border border-slate-900 text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 font-bold">
                          {tbl.headers.map((h, hIdx) => (
                            <th key={hIdx} className="border border-slate-900 p-2 text-center">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tbl.rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className={`border border-slate-900 p-2 ${cIdx === 0 ? 'text-center' : 'text-left'}`}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {/* Kết luận & Phán quyết */}
                {previewForm.conclusions && previewForm.conclusions.length > 0 && (
                  <div className="my-4 p-3 border border-slate-300 bg-slate-50/60 rounded text-[11.5px]">
                    <h5 className="font-bold uppercase text-slate-900 mb-1">
                      KẾT LUẬN & PHÁN QUYẾT XỬ LÝ:
                    </h5>
                    {previewForm.conclusions.map((c, cIdx) => (
                      <p key={cIdx} className="my-1">
                        <strong className="text-slate-700">• {c.label}:</strong>{' '}
                        <span>{c.content || '................................................................................................................'}</span>
                      </p>
                    ))}
                  </div>
                )}

                {/* Bảng Ký Duyệt Phân Quyền RACI */}
                <div className="signatures-table mt-10 pt-4 border-t border-slate-300">
                  <table className="w-full text-center border-0 text-[11.5px]">
                    <tbody>
                      <tr className="font-bold text-slate-900">
                        {previewForm.signRoles.map((s, sIdx) => (
                          <td key={sIdx} className="w-1/3 pb-16 uppercase">
                            <span className="sign-role">{s.role}</span>
                            <span className="sign-sub block text-[10px] text-slate-500 font-normal italic lowercase mt-0.5">
                              ({s.title})
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr className="text-slate-400 font-medium italic text-[10px]">
                        {previewForm.signRoles.map((_, sIdx) => (
                          <td key={sIdx}>(Ký và ghi rõ họ tên)</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-850 px-5 py-3 border-t border-slate-700/80 flex justify-between items-center text-xs">
              <span className="text-slate-400 text-[11px]">
                Định dạng chuẩn ISO 9001:2015 của Công ty TNHH Xe điện DK Việt Nhật
              </span>
              <button
                type="button"
                onClick={() => setPreviewForm(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
