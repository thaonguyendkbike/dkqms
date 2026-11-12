import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Search, 
  ArrowLeft, 
  FileSpreadsheet, 
  Eye, 
  Copy, 
  Check, 
  List, 
  LayoutGrid,
  FolderArchive,
  BookOpen,
  FileCheck2,
  Users,
  ShieldCheck,
  Building2,
  ExternalLink
} from 'lucide-react';
import { QMS_FORM_TEMPLATES, QmsFormTemplate } from '../data/qmsFormsData';
import { QMS_DOCUMENT_LIST, QmsDocumentItem } from '../data/qmsDocumentsData';

interface QmsFormsCenterProps {
  onBackToApp?: () => void;
}

export default function QmsFormsCenter({ onBackToApp }: QmsFormsCenterProps) {
  // Tab chính: Biểu mẫu chuẩn (forms) HOẶC Kho Hồ sơ tài liệu P-QLCL (documents)
  const [mainTab, setMainTab] = useState<'forms' | 'documents'>('forms');

  // State cho Tab 1: Biểu mẫu chuẩn
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [previewForm, setPreviewForm] = useState<QmsFormTemplate | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // State cho Tab 2: Kho Hồ sơ tài liệu P-QLCL
  const [selectedDocCategory, setSelectedDocCategory] = useState<string>('all');
  const [docSearchKeyword, setDocSearchKeyword] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<QmsDocumentItem | null>(null);
  const [docViewMode, setDocViewMode] = useState<'list' | 'grid'>('list');

  // Copy link
  const [copiedLink, setCopiedLink] = useState(false);

  // Bộ lọc danh sách biểu mẫu (Tab 1)
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

  // Bộ lọc danh sách tài liệu (Tab 2)
  const filteredDocs = useMemo(() => {
    return QMS_DOCUMENT_LIST.filter(doc => {
      const matchCat = selectedDocCategory === 'all' || doc.category === selectedDocCategory;
      const q = docSearchKeyword.trim().toLowerCase();
      const matchSearch = !q ||
        (doc.code && doc.code.toLowerCase().includes(q)) ||
        doc.title.toLowerCase().includes(q) ||
        doc.summary.toLowerCase().includes(q) ||
        doc.department.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [selectedDocCategory, docSearchKeyword]);

  // Thống kê nhanh biểu mẫu (Tab 1)
  const formStats = useMemo(() => {
    const total = QMS_FORM_TEMPLATES.length;
    const qlcl = QMS_FORM_TEMPLATES.filter(f => f.department === 'Lãnh đạo Phòng QLCL').length;
    const qc = QMS_FORM_TEMPLATES.filter(f => f.department === 'Bộ phận QC Hiện trường').length;
    const qa = QMS_FORM_TEMPLATES.filter(f => f.department === 'Bộ phận QA/QE').length;
    const kttd = QMS_FORM_TEMPLATES.filter(f => f.department === 'Bộ phận Kỹ thuật Thẩm định').length;
    return { total, qlcl, qc, qa, kttd };
  }, []);

  // Thống kê nhanh tài liệu (Tab 2)
  const docStats = useMemo(() => {
    const total = QMS_DOCUMENT_LIST.length;
    const hoSoToChuc = QMS_DOCUMENT_LIST.filter(d => d.category === 'ho-so-to-chuc').length;
    const quyTrinh = QMS_DOCUMENT_LIST.filter(d => d.category === 'quy-trinh').length;
    const mtcv = QMS_DOCUMENT_LIST.filter(d => d.category === 'mtcv-ban-giao').length;
    const bieuMauGoc = QMS_DOCUMENT_LIST.filter(d => d.category === 'bieu-mau-goc').length;
    return { total, hoSoToChuc, quyTrinh, mtcv, bieuMauGoc };
  }, []);

  // Sao chép đường dẫn dkqms.cloud/bm
  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/bm` : 'https://dkqms.cloud/bm';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Tạo HTML bảng Header cân đối 2 bên (50% - 50%) chuẩn Word & In ấn (Không có slogan)
  const renderBalancedHeaderHtml = (form: QmsFormTemplate) => {
    return `
      <table style="width:100%; border:1pt solid #000; border-collapse:collapse; margin-bottom:10pt;">
        <tr>
          <td style="width:50%; border:1pt solid #000; padding:6pt 8pt; text-align:center; vertical-align:middle;">
            <div style="font-weight:bold; font-size:10.5pt; text-transform:uppercase; line-height:1.3; font-family:'Times New Roman', serif;">CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT</div>
            <div style="font-weight:bold; font-size:9.5pt; text-transform:uppercase; margin-top:2pt; font-family:'Times New Roman', serif;">PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL)</div>
            <div style="font-size:8.5pt; font-style:italic; margin-top:2pt; font-family:'Times New Roman', serif;">Tiêu chuẩn: ISO 9001:2015</div>
          </td>
          <td style="width:50%; border:1pt solid #000; padding:5pt 10pt; font-size:9.5pt; vertical-align:middle; font-family:'Times New Roman', serif;">
            <table style="width:100%; border:none; border-collapse:collapse; font-size:9.5pt; font-family:'Times New Roman', serif;">
              <tr>
                <td style="width:42%; padding:1.5pt 0; border:none; font-weight:bold;">Mã Biểu Mẫu:</td>
                <td style="padding:1.5pt 0; border:none; font-weight:bold;">${form.code}</td>
              </tr>
              <tr>
                <td style="padding:1.5pt 0; border:none; font-weight:bold;">Mã Quy Trình:</td>
                <td style="padding:1.5pt 0; border:none;">${form.procedureCode}</td>
              </tr>
              <tr>
                <td style="padding:1.5pt 0; border:none; font-weight:bold;">Lần Ban Hành:</td>
                <td style="padding:1.5pt 0; border:none;">${form.revision} | Ngày: ${form.effectiveDate}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  };

  // In trực tiếp biểu mẫu qua Dedicated Print Engine Iframe A4 độc lập - Tận dụng tối đa 1 trang
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
    @page { 
      size: A4 portrait; 
      margin: 10mm 12mm 10mm 12mm; 
    }
    html, body {
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: "Times New Roman", Times, serif;
      color: #000000 !important;
      font-size: 12px;
      line-height: 1.35;
      height: 100%;
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
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    table.header-table {
      width: 100% !important;
      border: 1px solid #000 !important;
      border-collapse: collapse !important;
      margin-bottom: 8px !important;
    }
    table.header-table td {
      border: 1px solid #000 !important;
      padding: 4px 8px !important;
    }
    .form-main-title {
      text-align: center;
      margin: 8px 0 10px 0;
    }
    .form-main-title h1 {
      font-size: 15px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0 0 2px 0;
    }
    .form-main-title p {
      font-size: 11px;
      font-style: italic;
      margin: 0;
      color: #333;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 16px;
      margin-bottom: 10px;
      font-size: 11.5px;
    }
    .info-item {
      border-bottom: 1px dotted #555;
      padding-bottom: 2px;
      display: flex;
      justify-content: space-between;
    }
    table.qms-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 11px;
    }
    table.qms-table th, table.qms-table td {
      border: 1px solid #000;
      padding: 4px 6px;
      vertical-align: middle;
    }
    table.qms-table th {
      background-color: #f3f4f6 !important;
      font-weight: bold;
      text-align: center;
    }
    .section-title {
      font-size: 11.5px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 8px 0 4px 0;
    }
    .conclusions-box {
      margin: 8px 0;
      padding: 6px 8px;
      border: 1px solid #555;
      font-size: 11px;
    }
    .signatures-table {
      width: 100%;
      margin-top: 14px;
      border: none !important;
      text-align: center;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .signatures-table td {
      border: none !important;
      padding: 2px 4px;
      vertical-align: top;
      width: 33.33%;
    }
    .sign-role {
      font-weight: bold;
      font-size: 11.5px;
      text-transform: uppercase;
    }
    .sign-sub {
      font-size: 10px;
      font-style: italic;
      color: #333;
    }
    .sign-space {
      height: 60px;
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

  // Xuất file Microsoft Word (.doc) hoàn chỉnh - Chuẩn 1 trang A4
  const handleExportWord = (form: QmsFormTemplate) => {
    try {
      const headerContent = renderBalancedHeaderHtml(form);

      const titleContent = `
        <div style="text-align:center; margin:10pt 0 8pt 0;">
          <h1 style="font-size:13.5pt; font-weight:bold; text-transform:uppercase; margin:0 0 2pt 0; font-family:'Times New Roman', serif;">${form.title}</h1>
          <p style="font-size:9.5pt; font-style:italic; margin:0; color:#333; font-family:'Times New Roman', serif;">(${form.subtitle || form.purpose})</p>
        </div>
      `;

      let fieldsHtml = '<div style="margin-bottom:8pt;"><table style="width:100%; border:none; border-collapse:collapse; font-size:9.5pt; font-family:\'Times New Roman\', serif;">';
      for (let i = 0; i < form.fields.length; i += 2) {
        const f1 = form.fields[i];
        const f2 = form.fields[i + 1];
        fieldsHtml += `
          <tr>
            <td style="width:50%; padding:2.5pt 6pt 2.5pt 0; border-bottom:1pt dotted #666;">
              <b>${f1.label}:</b> ....................................................................
            </td>
            <td style="width:50%; padding:2.5pt 0 2.5pt 6pt; border-bottom:1pt dotted #666;">
              ${f2 ? `<b>${f2.label}:</b> ....................................................................` : ''}
            </td>
          </tr>
        `;
      }
      fieldsHtml += '</table></div>';

      let tablesHtml = '';
      form.tables.forEach(t => {
        tablesHtml += `
          <div style="margin:8pt 0 6pt 0;">
            <p style="font-size:9.5pt; font-weight:bold; text-transform:uppercase; margin:0 0 3pt 0; font-family:'Times New Roman', serif;">${t.title}</p>
            <table style="width:100%; border-collapse:collapse; font-size:9pt; font-family:'Times New Roman', serif;" border="1" cellpadding="4">
              <thead>
                <tr style="background-color:#f3f4f6; font-weight:bold; text-align:center;">
                  ${t.headers.map(h => `<th style="padding:4pt; border:1pt solid #000;">${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${t.rows.map(row => `
                  <tr>
                    ${row.map((cell, idx) => {
                      const formattedCell = String(cell).replace(/\n/g, '<br/>');
                      return `
                        <td style="padding:3.5pt 4pt; border:1pt solid #000; text-align:${idx === 0 ? 'center' : 'left'}; vertical-align:middle;">
                          ${formattedCell}
                        </td>
                      `;
                    }).join('')}
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
          <div style="margin:8pt 0; padding:6pt; border:1pt solid #000; font-family:'Times New Roman', serif;">
            <p style="font-size:9.5pt; font-weight:bold; text-transform:uppercase; margin:0 0 4pt 0;">KẾT LUẬN & PHÁN QUYẾT XỬ LÝ:</p>
            ${form.conclusions.map(c => {
              const formattedContent = (c.content || '....................................................................................................................').replace(/\n/g, '<br/>');
              return `
                <div style="margin:2.5pt 0; font-size:9.5pt; line-height:1.35;">
                  <b>• ${c.label}:</b><br/>
                  <div style="padding-left:10pt;">${formattedContent}</div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      let signaturesHtml = `
        <div style="margin-top:10pt; page-break-inside:avoid;">
          <table style="width:100%; border:none; text-align:center; font-size:9.5pt; font-family:'Times New Roman', serif;">
            <tr>
              ${form.signRoles.map(s => `
                <td style="width:33.33%; padding:2pt; vertical-align:top; border:none;">
                  <p style="margin:0; font-weight:bold; text-transform:uppercase; font-size:9.5pt;">${s.role}</p>
                  <p style="margin:1pt 0 0 0; font-style:italic; font-size:8.5pt; color:#444;">(${s.title})</p>
                  <div style="height:50pt;"></div>
                  <p style="margin:0; font-style:italic; font-size:8pt; color:#666;">(Ký & ghi rõ họ tên)</p>
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
            @page WordSection1 { 
              size:595.35pt 841.95pt; 
              margin:28.35pt 35.4pt 28.35pt 35.4pt; 
              mso-header-margin:28.35pt; 
              mso-footer-margin:28.35pt; 
            }
            div.WordSection1 { page:WordSection1; }
            body { font-family: 'Times New Roman', Times, serif; font-size: 10pt; line-height: 1.3; color: #000; }
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
          csvLines.push(r.map(cell => `"${String(cell).replace(/\n/g, ' / ').replace(/"/g, '""')}"`).join(','));
        });
        csvLines.push(`""`);
      });

      // Kết luận
      if (form.conclusions) {
        csvLines.push(`"KẾT LUẬN & PHÁN QUYẾT"`);
        form.conclusions.forEach(c => {
          csvLines.push(`"${c.label}","${(c.content || '').replace(/\n/g, ' / ').replace(/"/g, '""')}"`);
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
        const headerContent = renderBalancedHeaderHtml(form);

        const titleContent = `
          <div style="text-align:center; margin:10pt 0 8pt 0;">
            <h1 style="font-size:13pt; font-weight:bold; text-transform:uppercase; margin:0 0 2pt 0; font-family:'Times New Roman', serif;">${form.title}</h1>
            <p style="font-size:9.5pt; font-style:italic; margin:0; color:#333; font-family:'Times New Roman', serif;">(${form.subtitle || form.purpose})</p>
          </div>
        `;

        let fieldsHtml = '<div style="margin-bottom:8pt;"><table style="width:100%; border:none; border-collapse:collapse; font-size:9.5pt; font-family:\'Times New Roman\', serif;">';
        for (let i = 0; i < form.fields.length; i += 2) {
          const f1 = form.fields[i];
          const f2 = form.fields[i + 1];
          fieldsHtml += `
            <tr>
              <td style="width:50%; padding:2.5pt 6pt 2.5pt 0; border-bottom:1pt dotted #666;">
                <b>${f1.label}:</b> ....................................................................
              </td>
              <td style="width:50%; padding:2.5pt 0 2.5pt 6pt; border-bottom:1pt dotted #666;">
                ${f2 ? `<b>${f2.label}:</b> ....................................................................` : ''}
              </td>
            </tr>
          `;
        }
        fieldsHtml += '</table></div>';

        let tablesHtml = '';
        form.tables.forEach(t => {
          tablesHtml += `
            <div style="margin:8pt 0 6pt 0;">
              <p style="font-size:9.5pt; font-weight:bold; text-transform:uppercase; margin:0 0 3pt 0; font-family:'Times New Roman', serif;">${t.title}</p>
              <table style="width:100%; border-collapse:collapse; font-size:9pt; font-family:'Times New Roman', serif;" border="1" cellpadding="4">
                <thead>
                  <tr style="background-color:#f3f4f6; font-weight:bold; text-align:center;">
                    ${t.headers.map(h => `<th style="padding:4pt; border:1pt solid #000;">${h}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${t.rows.map(row => `
                    <tr>
                      ${row.map((cell, cIdx) => {
                        const formattedCell = String(cell).replace(/\n/g, '<br/>');
                        return `
                          <td style="padding:3.5pt 4pt; border:1pt solid #000; text-align:${cIdx === 0 ? 'center' : 'left'}; vertical-align:middle;">
                            ${formattedCell}
                          </td>
                        `;
                      }).join('')}
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
            <div style="margin:8pt 0; padding:6pt; border:1pt solid #000; font-family:'Times New Roman', serif;">
              <p style="font-size:9.5pt; font-weight:bold; text-transform:uppercase; margin:0 0 4pt 0;">KẾT LUẬN & PHÁN QUYẾT XỬ LÝ:</p>
              ${form.conclusions.map(c => {
                const formattedContent = (c.content || '....................................................................................................................').replace(/\n/g, '<br/>');
                return `
                  <div style="margin:2.5pt 0; font-size:9.5pt; line-height:1.35;">
                    <b>• ${c.label}:</b><br/>
                    <div style="padding-left:10pt;">${formattedContent}</div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }

        let signaturesHtml = `
          <div style="margin-top:10pt; page-break-inside:avoid;">
            <table style="width:100%; border:none; text-align:center; font-size:9.5pt; font-family:'Times New Roman', serif;">
              <tr>
                ${form.signRoles.map(s => `
                  <td style="width:33.33%; padding:2pt; vertical-align:top; border:none;">
                    <p style="margin:0; font-weight:bold; text-transform:uppercase; font-size:9.5pt;">${s.role}</p>
                    <p style="margin:1pt 0 0 0; font-style:italic; font-size:8.5pt; color:#444;">(${s.title})</p>
                    <div style="height:50pt;"></div>
                    <p style="margin:0; font-style:italic; font-size:8pt; color:#666;">(Ký & ghi rõ họ tên)</p>
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
            @page WordSection1 { 
              size:595.35pt 841.95pt; 
              margin:28.35pt 35.4pt 28.35pt 35.4pt; 
            }
            div.WordSection1 { page:WordSection1; }
            body { font-family: 'Times New Roman', Times, serif; font-size: 10pt; line-height: 1.3; color: #000; }
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* ==================== HEADER THANH ĐIỀU HÀNH ==================== */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (onBackToApp) {
                  onBackToApp();
                } else {
                  window.location.href = '/';
                }
              }}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Quay lại ứng dụng chính"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Hệ Thống Biểu Mẫu & Tài Liệu Quản Lý Chất Lượng
              </h1>
              <p className="text-xs text-slate-500">
                Công ty TNHH Xe điện DK Việt Nhật • Phòng Quản lý chất lượng (QLCL)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút Copy link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              title="Sao chép đường dẫn trực tiếp: dkqms.cloud/bm"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedLink ? 'Đã sao chép' : 'dkqms.cloud/bm'}</span>
            </button>

            {mainTab === 'forms' ? (
              <button
                type="button"
                onClick={handleDownloadAllFormsDoc}
                className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                title="Tải trọn bộ 10 biểu mẫu chuẩn dạng Word (.doc)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải trọn bộ 10 BM (.doc)</span>
              </button>
            ) : (
              <a
                href="/docs/P_QLCL/P_QLCL.zip"
                download="P_QLCL_DKBike_Full.zip"
                className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                title="Tải toàn bộ 30 tệp tài liệu trong thư mục P_QLCL (file ZIP 1.5MB)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải trọn bộ thư mục (P_QLCL.zip)</span>
              </a>
            )}
          </div>
        </div>

        {/* ==================== 2 TAB CHÍNH CỦA TRANG /BM ==================== */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 border-t border-slate-100 pt-1">
          <button
            type="button"
            onClick={() => setMainTab('forms')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              mainTab === 'forms'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Biểu Mẫu Chuẩn ISO</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${mainTab === 'forms' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}`}>
              10 BM
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('documents')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              mainTab === 'documents'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>Tài Liệu & Hồ Sơ Vận Hành P-QLCL</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${mainTab === 'documents' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}`}>
              30 tài liệu
            </span>
          </button>
        </div>
      </header>

      {/* ==================== NỘI DUNG CHÍNH ==================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 w-full flex-1 space-y-4">
        {mainTab === 'forms' ? (
          /* =========================================================================
             TAB 1: BIỂU MẪU CHUẨN ISO (10 BIỂU MẪU)
             ========================================================================= */
          <>
            {/* Bộ lọc phòng ban & Công cụ tìm kiếm */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Bộ lọc phân hệ / phòng ban */}
              <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedDept('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedDept === 'all'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Tất cả ({formStats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDept('Lãnh đạo Phòng QLCL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedDept === 'Lãnh đạo Phòng QLCL'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Lãnh đạo QLCL ({formStats.qlcl})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDept('Bộ phận QC Hiện trường')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedDept === 'Bộ phận QC Hiện trường'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  QC Hiện trường ({formStats.qc})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDept('Bộ phận QA/QE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedDept === 'Bộ phận QA/QE'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  BP QA / QE ({formStats.qa})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDept('Bộ phận Kỹ thuật Thẩm định')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedDept === 'Bộ phận Kỹ thuật Thẩm định'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Kỹ thuật Thẩm định ({formStats.kttd})
                </button>
              </div>

              {/* Ô Tìm Kiếm và Nút Chuyển Đổi Hiển Thị */}
              <div className="flex items-center gap-2 self-end md:self-auto w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Tìm mã BM, tên biểu mẫu..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-500 bg-white"
                  />
                </div>

                <div className="flex items-center border border-slate-300 rounded-lg p-0.5 bg-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                      viewMode === 'list'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Hiển thị dạng Danh sách bảng"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Danh sách</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                      viewMode === 'grid'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Hiển thị dạng Thẻ (Grid)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Thẻ</span>
                  </button>
                </div>
              </div>
            </div>

            {/* HIỂN THỊ BIỂU MẪU: DANH SÁCH HOẶC THẺ */}
            {viewMode === 'list' ? (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-3 text-center w-12">STT</th>
                        <th className="py-2.5 px-3 w-28">Mã BM</th>
                        <th className="py-2.5 px-3 w-24">Mã QT</th>
                        <th className="py-2.5 px-4">Tên Biểu Mẫu & Mô tả</th>
                        <th className="py-2.5 px-3 w-44">Bộ phận phụ trách</th>
                        <th className="py-2.5 px-3 w-28 text-center">Phiên bản</th>
                        <th className="py-2.5 px-3 text-right w-56">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70">
                      {filteredForms.map((form, index) => (
                        <tr key={form.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-center font-mono text-slate-500">{index + 1}</td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                              {form.code}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">{form.procedureCode}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 leading-snug">{form.title}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{form.subtitle || form.purpose}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 block truncate">
                              {form.department}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center text-[11px] text-slate-600">
                            Lần {form.revision} ({form.effectiveDate})
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewForm(form)}
                                className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition"
                                title="Xem chi tiết bản in A4"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewForm(form);
                                  setTimeout(() => handlePrintForm(form), 100);
                                }}
                                className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition"
                                title="In trực tiếp khổ A4"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportWord(form)}
                                className="px-2 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition flex items-center gap-1 font-medium text-[11px]"
                                title="Tải file Word (.doc)"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Word</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportCsv(form)}
                                className="px-2 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition flex items-center gap-1 font-medium text-[11px]"
                                title="Tải file Excel (.csv)"
                              >
                                <FileSpreadsheet className="w-3 h-3" />
                                <span>CSV</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredForms.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            Không tìm thấy biểu mẫu nào phù hợp với từ khóa tìm kiếm.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredForms.map((form) => (
                  <div
                    key={form.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                            {form.code}
                          </span>
                          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {form.procedureCode}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {form.department}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {form.title}
                      </h3>

                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {form.subtitle || form.purpose}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                        <span>Lần ban hành: <strong>{form.revision}</strong> ({form.effectiveDate})</span>
                        <span>Quyền duyệt: <strong>{form.signRoles[form.signRoles.length - 1].role}</strong></span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewForm(form)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem mẫu A4</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleExportWord(form)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                          title="Tải file Word (.doc)"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Word</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportCsv(form)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                          title="Tải file Excel (.csv)"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>CSV</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* =========================================================================
             TAB 2: KHO HỒ SƠ TÀI LIỆU VẬN HÀNH P-QLCL (30 TÀI LIỆU TỪ P_QLCL.ZIP)
             ========================================================================= */
          <>
            {/* Banner tóm tắt & Nút tải toàn bộ */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <FolderArchive className="w-4 h-4 text-slate-700" />
                  Kho Hồ Sơ & Tài Liệu Vận Hành P-QLCL DKBike
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lưu trữ 30 tài liệu Word chuẩn hóa: Hồ sơ tổ chức, Ma trận phân nhiệm, 9 Quy trình SOP, MTCV theo RACI và Biên bản bàn giao nhiệm vụ.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/docs/P_QLCL/P_QLCL.zip"
                  download="P_QLCL_DKBike_Full.zip"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                  title="Tải trọn bộ 30 tài liệu (file nén P_QLCL.zip 1.5MB)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải toàn bộ (P_QLCL.zip)</span>
                </a>
              </div>
            </div>

            {/* Thanh lọc chuyên mục & Tìm kiếm tài liệu */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedDocCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedDocCategory === 'all'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Tất cả ({docStats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocCategory('ho-so-to-chuc')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedDocCategory === 'ho-so-to-chuc'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Hồ sơ Tổ chức & Khung năng lực ({docStats.hoSoToChuc})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocCategory('quy-trinh')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedDocCategory === 'quy-trinh'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Quy trình chuẩn SOP ({docStats.quyTrinh})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocCategory('mtcv-ban-giao')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedDocCategory === 'mtcv-ban-giao'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  MTCV & Bàn giao Nhân sự ({docStats.mtcv})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocCategory('bieu-mau-goc')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedDocCategory === 'bieu-mau-goc'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Biểu mẫu gốc Word ({docStats.bieuMauGoc})
                </button>
              </div>

              {/* Ô Tìm kiếm và Toggle hiển thị */}
              <div className="flex items-center gap-2 self-end md:self-auto w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={docSearchKeyword}
                    onChange={(e) => setDocSearchKeyword(e.target.value)}
                    placeholder="Tìm tên tài liệu, mã quy trình..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-500 bg-white"
                  />
                </div>

                <div className="flex items-center border border-slate-300 rounded-lg p-0.5 bg-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDocViewMode('list')}
                    className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                      docViewMode === 'list'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Hiển thị dạng Danh sách"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Danh sách</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocViewMode('grid')}
                    className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                      docViewMode === 'grid'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Hiển thị dạng Thẻ"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Thẻ</span>
                  </button>
                </div>
              </div>
            </div>

            {/* HIỂN THỊ TÀI LIỆU: DANH SÁCH HOẶC THẺ */}
            {docViewMode === 'list' ? (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-3 text-center w-12">STT</th>
                        <th className="py-2.5 px-3 w-28">Mã TL / QT</th>
                        <th className="py-2.5 px-4">Tên Tài Liệu & Nội dung</th>
                        <th className="py-2.5 px-3 w-48">Chuyên mục</th>
                        <th className="py-2.5 px-3 w-24 text-center">Dung lượng</th>
                        <th className="py-2.5 px-3 text-right w-44">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70">
                      {filteredDocs.map((doc, index) => (
                        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-center font-mono text-slate-500">{index + 1}</td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                              {doc.code || 'DOCX'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 leading-snug">{doc.title}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{doc.summary}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 block truncate">
                              {doc.categoryName}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-600">
                            {doc.fileSizeKB} KB
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewDoc(doc)}
                                className="px-2.5 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition flex items-center gap-1 font-medium text-[11px]"
                                title="Xem tóm tắt nội dung tài liệu"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Xem</span>
                              </button>
                              <a
                                href={encodeURI(`/docs/P_QLCL/${doc.relPath}`)}
                                download={doc.fileName}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded transition flex items-center gap-1 font-semibold text-[11px] shadow-2xs"
                                title={`Tải tệp ${doc.fileName}`}
                              >
                                <Download className="w-3 h-3" />
                                <span>Tải về</span>
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredDocs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Không tìm thấy tài liệu nào phù hợp với từ khóa tìm kiếm.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                          {doc.code || 'DOCX'}
                        </span>
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[200px]">
                          {doc.categoryName}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {doc.title}
                      </h3>

                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {doc.summary}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                        <span>Áp dụng: <strong>{doc.department}</strong></span>
                        <span className="font-mono">{doc.fileSizeKB} KB</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem tóm tắt</span>
                      </button>

                      <a
                        href={encodeURI(`/docs/P_QLCL/${doc.relPath}`)}
                        download={doc.fileName}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải file .docx</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ==================== MODAL XEM CHI TIẾT BIỂU MẪU CHUẨN A4 (TAB 1) ==================== */}
      {previewForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                  {previewForm.code}
                </span>
                <h3 className="font-bold text-xs sm:text-sm text-slate-800 truncate max-w-md">
                  {previewForm.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintForm(previewForm)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                  title="In trực tiếp A4 hoặc Lưu file PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In A4 / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportWord(previewForm)}
                  className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                  title="Tải file Word (.doc)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Tải Word</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewForm(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-200 rounded transition font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body - Bản in A4 Trực Quan */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 select-text">
              <div 
                id="qms-form-printable-document"
                className="bg-white text-slate-900 border border-slate-300 shadow-sm p-6 sm:p-10 mx-auto max-w-3xl font-serif text-[12px] leading-relaxed"
                style={{ width: '100%', minHeight: '270mm' }}
              >
                {/* Header Tiêu Chuẩn Doanh Nghiệp 2 Bên Đều Nhau (50% - 50%) */}
                <table className="header-table w-full border border-black border-collapse mb-3">
                  <tbody>
                    <tr>
                      <td className="w-1/2 border border-black p-2 text-center align-middle">
                        <div className="font-bold text-[12px] uppercase leading-tight font-serif">
                          CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT
                        </div>
                        <div className="font-bold text-[11px] uppercase mt-0.5 font-serif">
                          PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL)
                        </div>
                        <div className="text-[10px] italic mt-0.5 text-slate-600 font-serif">
                          Tiêu chuẩn: ISO 9001:2015
                        </div>
                      </td>
                      <td className="w-1/2 border border-black p-2 text-[11px] align-middle font-serif">
                        <table className="w-full border-0 text-[11px]">
                          <tbody>
                            <tr>
                              <td className="w-5/12 font-bold py-0.5 border-0">Mã Biểu Mẫu:</td>
                              <td className="font-bold py-0.5 border-0">{previewForm.code}</td>
                            </tr>
                            <tr>
                              <td className="font-bold py-0.5 border-0">Mã Quy Trình:</td>
                              <td className="py-0.5 border-0">{previewForm.procedureCode}</td>
                            </tr>
                            <tr>
                              <td className="font-bold py-0.5 border-0">Lần Ban Hành:</td>
                              <td className="py-0.5 border-0">{previewForm.revision} | Ngày: {previewForm.effectiveDate}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Tiêu Đề Biểu Mẫu */}
                <div className="form-main-title text-center my-3">
                  <h1 className="text-sm sm:text-base font-bold text-black uppercase tracking-wide">
                    {previewForm.title}
                  </h1>
                  <p className="text-[11px] italic text-slate-600 mt-0.5">
                    ({previewForm.subtitle || previewForm.purpose})
                  </p>
                </div>

                {/* Danh mục các trường thông tin chung */}
                <div className="info-grid grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3 text-[11.5px] font-sans">
                  {previewForm.fields.map((f, fIdx) => (
                    <div key={fIdx} className="info-item border-b border-dotted border-slate-400 pb-0.5 flex justify-between">
                      <span className="font-bold text-slate-800">{f.label}:</span>
                      <span className="text-slate-400">....................................................</span>
                    </div>
                  ))}
                </div>

                {/* Các Bảng Biểu Kỹ Thuật / Nghiệm Thu */}
                {previewForm.tables.map((tbl, tIdx) => (
                  <div key={tIdx} className="my-3">
                    <h4 className="section-title text-[11.5px] font-bold text-black uppercase mb-1.5">
                      {tbl.title}
                    </h4>
                    <table className="qms-table w-full border-collapse border border-black text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 font-bold">
                          {tbl.headers.map((h, hIdx) => (
                            <th key={hIdx} className="border border-black p-1.5 text-center">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tbl.rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className={`border border-black p-1.5 ${cIdx === 0 ? 'text-center' : 'text-left'}`}>
                                {String(cell).split('\n').map((line, lIdx) => (
                                  <div key={lIdx} className={line.startsWith('□') ? 'font-mono text-[11.5px]' : ''}>
                                    {line}
                                  </div>
                                ))}
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
                  <div className="conclusions-box my-3 p-2.5 border border-black text-[11px]">
                    <div className="font-bold uppercase text-black mb-1">
                      KẾT LUẬN & PHÁN QUYẾT XỬ LÝ:
                    </div>
                    {previewForm.conclusions.map((c, cIdx) => (
                      <div key={cIdx} className="my-1.5">
                        <strong className="text-black">• {c.label}:</strong>
                        <div className="pl-3 mt-0.5 text-slate-800">
                          {(c.content || '....................................................................................................................')
                            .split('\n')
                            .map((line, lIdx) => (
                              <div key={lIdx} className={line.startsWith('□') ? 'font-mono text-[11.5px] py-0.5' : ''}>
                                {line}
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bảng Ký Duyệt Phân Quyền RACI */}
                <div className="signatures-table mt-4 pt-2">
                  <table className="w-full text-center border-0 text-[11px]">
                    <tbody>
                      <tr className="font-bold text-black uppercase">
                        {previewForm.signRoles.map((s, sIdx) => (
                          <td key={sIdx} className="w-1/3 align-top border-0">
                            <span className="sign-role">{s.role}</span>
                            <span className="sign-sub block text-[10px] text-slate-600 font-normal italic lowercase mt-0.5">
                              ({s.title})
                            </span>
                            <div className="sign-space h-14"></div>
                            <span className="text-[10px] text-slate-500 italic block font-normal">
                              (Ký và ghi rõ họ tên)
                            </span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 px-4 py-2.5 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500 text-[11px]">
                Biểu mẫu quản lý chất lượng ISO 9001:2015 • Công ty TNHH Xe điện DK Việt Nhật
              </span>
              <button
                type="button"
                onClick={() => setPreviewForm(null)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL XEM CHI TIẾT TÀI LIỆU P-QLCL (TAB 2) ==================== */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                  {previewDoc.code || 'DOCX'}
                </span>
                <h3 className="font-bold text-sm text-slate-800 truncate max-w-md">
                  {previewDoc.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={encodeURI(`/docs/P_QLCL/${previewDoc.relPath}`)}
                  download={previewDoc.fileName}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file gốc</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-200 rounded transition font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Chuyên mục:</span>
                  <span className="font-bold text-slate-800">{previewDoc.categoryName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Bộ phận áp dụng:</span>
                  <span className="font-bold text-slate-800">{previewDoc.department}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tên tệp gốc:</span>
                  <span className="font-mono text-[11px] text-slate-700 break-all">{previewDoc.fileName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Dung lượng:</span>
                  <span className="font-mono font-bold text-slate-800">{previewDoc.fileSizeKB} KB</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1">
                  1. Tóm tắt nội dung tài liệu
                </h4>
                <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                  {previewDoc.summary}
                </p>
              </div>

              {previewDoc.scope && (
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1">
                    2. Phạm vi áp dụng
                  </h4>
                  <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                    {previewDoc.scope}
                  </p>
                </div>
              )}

              {previewDoc.keyContents && previewDoc.keyContents.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1">
                    3. Các đề mục & nội dung cốt lõi
                  </h4>
                  <ul className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                    {previewDoc.keyContents.map((kc, kIdx) => (
                      <li key={kIdx} className="flex items-start gap-2 text-slate-700">
                        <span className="text-slate-400 mt-0.5">•</span>
                        <span>{kc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-slate-100 px-4 py-2.5 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500 text-[11px]">
                Tài liệu lưu trữ chính thức • Thư mục P_QLCL DKBike
              </span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition"
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
