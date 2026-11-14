import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Save,
  RotateCcw,
  Edit3,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Sliders,
  Loader2,
  X
} from 'lucide-react';
import { QMS_FORM_TEMPLATES, QmsFormTemplate } from '../data/qmsFormsData';
import { QMS_DOCUMENT_LIST, QmsDocumentItem } from '../data/qmsDocumentsData';
import { safeStorage } from '../safeStorage';
import { QmsBmSyncRecord } from '../types';
import { renderAsync } from 'docx-preview';
import Qms5sTab from './Qms5sTab';

interface QmsFormsCenterProps {
  onBackToApp?: () => void;
  bmRecords?: QmsBmSyncRecord[];
  onSaveBmRecord?: (record: QmsBmSyncRecord) => boolean | void;
  onDeleteBmRecord?: (id: string) => void;
}

// Storage keys
const CUSTOM_TEMPLATES_KEY = 'dk_qms_custom_form_templates';
const CUSTOM_DOCS_KEY = 'dk_qms_custom_documents';
const FILLED_FORMS_KEY_PREFIX = 'dk_qms_filled_form_';

const DOC_CATEGORIES: { value: QmsDocumentItem['category']; label: string }[] = [
  { value: 'ho-so-to-chuc', label: 'Hồ sơ Tổ chức & Khung năng lực' },
  { value: 'quy-trinh', label: 'Hệ thống Quy trình Chuẩn SOP' },
  { value: 'mtcv-ban-giao', label: 'MTCV & Biên bản Bàn giao Nhân sự' },
  { value: 'bieu-mau-goc', label: 'Bộ Biểu mẫu Gốc Word' }
];

// Kiểm tra chuỗi mẫu chỉ toàn dấu chấm (để làm placeholder gọn khi nhập)
const isDotOnlyTemplate = (val: string | number): boolean => {
  const s = String(val || '').trim();
  return s.length >= 3 && /^[.\s/]+$/.test(s) && s.includes('...');
};

// Kiểm tra ô bảng có cho phép nhập trực tiếp hay không (kể cả ô trống trừ cột STT, hoặc ô 1 cột dạng khung nội dung, hoặc ô chứa '...' như BM-QC-04)
const isEditableTableCell = (cell: string | number, cIdx?: number, rowLen?: number): boolean => {
  const s = String(cell ?? '');
  return s.includes('...') || (s.trim() === '' && (cIdx === undefined || cIdx > 0 || rowLen === 1));
};

const escapeHtml = (unsafe: string): string => {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Textarea tự giãn chiều cao theo nội dung nhập
const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
}> = ({ value, onChange, placeholder, minRows = 2, className = '' }) => {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, minRows * 20)}px`;
  }, [value, minRows]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      style={{ overflow: 'hidden' }}
    />
  );
};

// Cấu trúc dữ liệu đã điền vào biểu mẫu
interface FilledFormData {
  fields: Record<string, string>;            // label -> value
  tableCells: Record<string, string>;        // `${tableIdx}_${rowIdx}_${colIdx}` -> value
  conclusions: Record<string, string>;        // `${cIdx}` -> value
  signers: Record<string, string>;            // `${sIdx}` -> signer name
}

const buildEmptyFilledData = (form: QmsFormTemplate): FilledFormData => {
  const initialTableCells: Record<string, string> = {};
  form.tables.forEach((t, tIdx) => {
    t.rows.forEach((row, rIdx) => {
      row.forEach((cell, cIdx) => {
        const s = String(cell ?? '');
        // Ô chỉ toàn dấu chấm -> khởi tạo rỗng để người dùng bấm là gõ luôn
        initialTableCells[`${tIdx}_${rIdx}_${cIdx}`] = isDotOnlyTemplate(s) ? '' : s;
      });
    });
  });

  const initialConclusions: Record<string, string> = {};
  if (form.conclusions) {
    form.conclusions.forEach((c, cIdx) => {
      const s = String(c.content || '');
      initialConclusions[`${cIdx}`] = isDotOnlyTemplate(s) ? '' : s;
    });
  }

  return {
    fields: {},
    tableCells: initialTableCells,
    conclusions: initialConclusions,
    signers: {}
  };
};

export default function QmsFormsCenter({
  onBackToApp,
  bmRecords = [],
  onSaveBmRecord,
  onDeleteBmRecord
}: QmsFormsCenterProps) {
  // Tab chính: Biểu mẫu chuẩn (forms) HOẶC Kho Hồ sơ tài liệu P-QLCL (documents)
  const [mainTab, setMainTab] = useState<'forms' | 'documents' | '5s'>('forms');

  // Danh sách biểu mẫu (hỗ trợ tùy biến cấu trúc mẫu)
  const [customTemplatesMap, setCustomTemplatesMap] = useState<Record<string, QmsFormTemplate>>(() => {
    try {
      const raw = safeStorage.getItem(CUSTOM_TEMPLATES_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Lỗi đọc custom templates:', e);
    }
    return {};
  });

  // Đồng bộ dữ liệu từ Cloud Firestore (bmRecords) vào state local khi có cập nhật từ máy khác
  useEffect(() => {
    if (!bmRecords || bmRecords.length === 0) return;

    const nextTemplates: Record<string, QmsFormTemplate> = {};
    const nextDocs: Record<string, QmsDocumentItem> = {};
    bmRecords.forEach((rec) => {
      if (rec.kind === 'template' && rec.payload) {
        nextTemplates[rec.targetId] = rec.payload as QmsFormTemplate;
      } else if (rec.kind === 'document' && rec.payload) {
        nextDocs[rec.targetId] = rec.payload as QmsDocumentItem;
      } else if (rec.kind === 'filled' && rec.payload) {
        safeStorage.setItem(`${FILLED_FORMS_KEY_PREFIX}${rec.targetId}`, JSON.stringify(rec.payload));
      }
    });

    if (Object.keys(nextTemplates).length > 0) {
      setCustomTemplatesMap((prev) => {
        const merged = { ...prev, ...nextTemplates };
        safeStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(merged));
        return merged;
      });
    }
    if (Object.keys(nextDocs).length > 0) {
      setCustomDocumentsMap((prev) => {
        const merged = { ...prev, ...nextDocs };
        safeStorage.setItem(CUSTOM_DOCS_KEY, JSON.stringify(merged));
        return merged;
      });
    }
  }, [bmRecords]);

  // Danh sách mẫu hoàn chỉnh đã gộp mẫu tùy biến
  const allFormTemplates = useMemo(() => {
    return QMS_FORM_TEMPLATES.map(tpl => {
      if (customTemplatesMap[tpl.id]) {
        return customTemplatesMap[tpl.id];
      }
      return tpl;
    });
  }, [customTemplatesMap]);

  // State cho Tab 1: Biểu mẫu chuẩn
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [previewForm, setPreviewForm] = useState<QmsFormTemplate | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Chế độ xem modal A4: 'interactive' (Điền trực tiếp) hoặc 'clean' (Bản in sạch)
  const [modalMode, setModalMode] = useState<'interactive' | 'clean'>('interactive');

  // Dữ liệu người dùng điền vào biểu mẫu hiện tại
  const [currentFilledData, setCurrentFilledData] = useState<FilledFormData>({
    fields: {},
    tableCells: {},
    conclusions: {},
    signers: {}
  });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // State chỉnh sửa cấu trúc mẫu (Template Structure Editor)
  const [editingTemplate, setEditingTemplate] = useState<QmsFormTemplate | null>(null);
  const [editorActiveTab, setEditorActiveTab] = useState<'general' | 'fields' | 'tables' | 'conclusions' | 'signs'>('general');

  // State cho Tab 2: Kho Hồ sơ tài liệu P-QLCL (hỗ trợ chỉnh sửa trực tiếp ngay tại web)
  const [customDocumentsMap, setCustomDocumentsMap] = useState<Record<string, QmsDocumentItem>>(() => {
    try {
      const raw = safeStorage.getItem(CUSTOM_DOCS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Lỗi đọc custom documents:', e);
    }
    return {};
  });

  const allDocuments = useMemo(() => {
    return QMS_DOCUMENT_LIST.map(doc => {
      if (customDocumentsMap[doc.id]) {
        return customDocumentsMap[doc.id];
      }
      return doc;
    });
  }, [customDocumentsMap]);

  const [selectedDocCategory, setSelectedDocCategory] = useState<string>('all');
  const [docSearchKeyword, setDocSearchKeyword] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<QmsDocumentItem | null>(null);
  const [docPreviewMode, setDocPreviewMode] = useState<'summary' | 'file'>('summary');
  const [docFileLoading, setDocFileLoading] = useState(false);
  const [docFileError, setDocFileError] = useState<string | null>(null);
  const docxContainerRef = useRef<HTMLDivElement | null>(null);
  const [editingDoc, setEditingDoc] = useState<QmsDocumentItem | null>(null);
  const [docViewMode, setDocViewMode] = useState<'list' | 'grid'>('list');

  const openDocPreview = (doc: QmsDocumentItem, mode: 'summary' | 'file') => {
    setDocFileError(null);
    setDocPreviewMode(mode);
    setPreviewDoc(doc);
  };

  // Nạp và render trực tiếp file .docx gốc khi chọn chế độ "Xem trực tiếp"
  useEffect(() => {
    if (!previewDoc || docPreviewMode !== 'file') {
      setDocFileLoading(false);
      setDocFileError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadDocx = async () => {
      const container = docxContainerRef.current;
      if (!container) return;

      container.innerHTML = '';
      setDocFileLoading(true);
      setDocFileError(null);

      try {
        const fileUrl = encodeURI(`/docs/P_QLCL/${previewDoc.relPath}`);
        const res = await fetch(fileUrl, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Không tải được tệp (HTTP ${res.status})`);
        }
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          throw new Error('Không tìm thấy tệp Word trên máy chủ.');
        }

        const blob = await res.blob();
        if (cancelled || !docxContainerRef.current) return;

        docxContainerRef.current.innerHTML = '';
        await renderAsync(blob, docxContainerRef.current, undefined, {
          className: 'dkqms-docx-preview',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true
        });
      } catch (err: any) {
        if (cancelled || err?.name === 'AbortError') return;
        console.error('Lỗi đọc file Word:', err);
        setDocFileError(err?.message || 'Không thể hiển thị trực tiếp tệp Word này.');
      } finally {
        if (!cancelled) {
          setDocFileLoading(false);
        }
      }
    };

    loadDocx();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [previewDoc?.id, previewDoc?.relPath, docPreviewMode]);

  // Copy link state
  const [copiedLink, setCopiedLink] = useState(false);

  // Nạp dữ liệu đã điền cho một biểu mẫu bất kỳ (ưu tiên state đang mở trên màn hình)
  const getFilledDataForForm = (form: QmsFormTemplate): FilledFormData => {
    if (previewForm && previewForm.id === form.id) {
      return currentFilledData;
    }
    const cloudRec = bmRecords.find((r) => r.kind === 'filled' && r.targetId === form.id);
    if (cloudRec && cloudRec.payload) {
      return cloudRec.payload as FilledFormData;
    }
    try {
      const raw = safeStorage.getItem(`${FILLED_FORMS_KEY_PREFIX}${form.id}`);
      if (raw) {
        return JSON.parse(raw) as FilledFormData;
      }
    } catch (err) {
      console.error('Lỗi đọc dữ liệu đã điền:', err);
    }
    return buildEmptyFilledData(form);
  };

  // Khi mở 1 biểu mẫu, nạp dữ liệu đã điền trước đó (nếu có)
  useEffect(() => {
    if (previewForm) {
      const savedKey = `${FILLED_FORMS_KEY_PREFIX}${previewForm.id}`;
      try {
        const cloudRec = bmRecords.find((r) => r.kind === 'filled' && r.targetId === previewForm.id);
        const raw = safeStorage.getItem(savedKey);
        const parsed: FilledFormData | null = cloudRec?.payload
          ? (cloudRec.payload as FilledFormData)
          : raw
            ? (JSON.parse(raw) as FilledFormData)
            : null;
        if (parsed) {
          // Làm sạch các ô cũ chỉ toàn dấu chấm để người dùng gõ luôn không phải xóa
          const cleanedCells: Record<string, string> = {};
          Object.entries(parsed.tableCells || {}).forEach(([k, v]) => {
            cleanedCells[k] = isDotOnlyTemplate(v) ? '' : v;
          });
          const cleanedConclusions: Record<string, string> = {};
          Object.entries(parsed.conclusions || {}).forEach(([k, v]) => {
            cleanedConclusions[k] = isDotOnlyTemplate(v) ? '' : v;
          });
          setCurrentFilledData({
            fields: parsed.fields || {},
            tableCells: cleanedCells,
            conclusions: cleanedConclusions,
            signers: parsed.signers || {}
          });
          return;
        }
      } catch (err) {
        console.error('Lỗi nạp dữ liệu đã điền:', err);
      }

      setCurrentFilledData(buildEmptyFilledData(previewForm));
    }
  }, [previewForm, bmRecords]);

  // Lưu dữ liệu người dùng đã điền vào biểu mẫu
  const handleSaveFilledData = () => {
    if (!previewForm) return;
    const savedKey = `${FILLED_FORMS_KEY_PREFIX}${previewForm.id}`;
    safeStorage.setItem(savedKey, JSON.stringify(currentFilledData));
    onSaveBmRecord?.({
      id: `fill:${previewForm.id}`,
      kind: 'filled',
      targetId: previewForm.id,
      payload: currentFilledData,
      updatedAt: new Date().toISOString()
    });
    setSaveSuccessMsg('Đã lưu & đồng bộ nội dung điền lên Cloud!');
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Xóa trắng dữ liệu điền
  const handleResetFilledData = () => {
    if (!previewForm) return;
    if (window.confirm('Anh có chắc muốn xóa toàn bộ nội dung đã điền trên phiếu này không?')) {
      const emptyData = buildEmptyFilledData(previewForm);
      setCurrentFilledData(emptyData);
      const savedKey = `${FILLED_FORMS_KEY_PREFIX}${previewForm.id}`;
      safeStorage.removeItem(savedKey);
      onDeleteBmRecord?.(`fill:${previewForm.id}`);
      setSaveSuccessMsg('Đã đưa phiếu về mẫu trắng ban đầu.');
      setTimeout(() => setSaveSuccessMsg(null), 2500);
    }
  };

  // Lưu chỉnh sửa tài liệu / hồ sơ quy trình P-QLCL
  const handleSaveCustomDoc = (updated: QmsDocumentItem) => {
    const newMap = { ...customDocumentsMap, [updated.id]: updated };
    setCustomDocumentsMap(newMap);
    safeStorage.setItem(CUSTOM_DOCS_KEY, JSON.stringify(newMap));
    onSaveBmRecord?.({
      id: `doc:${updated.id}`,
      kind: 'document',
      targetId: updated.id,
      payload: updated,
      updatedAt: new Date().toISOString()
    });
    setEditingDoc(null);
    if (previewDoc && previewDoc.id === updated.id) {
      setPreviewDoc(updated);
    }
    setSaveSuccessMsg(`Đã lưu & đồng bộ hồ sơ ${updated.code || updated.title}!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Khôi phục nội dung gốc của tài liệu / quy trình
  const handleResetDocToDefault = (docId: string) => {
    if (window.confirm('Anh có chắc muốn khôi phục tiêu đề và nội dung hồ sơ này về bản gốc ban đầu không?')) {
      const newMap = { ...customDocumentsMap };
      delete newMap[docId];
      setCustomDocumentsMap(newMap);
      safeStorage.setItem(CUSTOM_DOCS_KEY, JSON.stringify(newMap));
      onDeleteBmRecord?.(`doc:${docId}`);
      setEditingDoc(null);
      const original = QMS_DOCUMENT_LIST.find(d => d.id === docId);
      if (original && previewDoc && previewDoc.id === docId) {
        setPreviewDoc(original);
      }
      setSaveSuccessMsg('Đã khôi phục nội dung hồ sơ về bản gốc.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  // Toggle ô vuông check: □ <-> ☑
  const toggleCheckboxText = (text: string, clickedLine: string): string => {
    const lines = text.split('\n');
    const updatedLines = lines.map(line => {
      if (line === clickedLine) {
        if (line.startsWith('□')) {
          return line.replace('□', '☑');
        } else if (line.startsWith('☑')) {
          return line.replace('☑', '□');
        }
      }
      return line;
    });
    return updatedLines.join('\n');
  };

  // Lưu cấu trúc mẫu mới
  const handleSaveCustomTemplate = (updated: QmsFormTemplate) => {
    const newMap = { ...customTemplatesMap, [updated.id]: updated };
    setCustomTemplatesMap(newMap);
    safeStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(newMap));
    onSaveBmRecord?.({
      id: `tpl:${updated.id}`,
      kind: 'template',
      targetId: updated.id,
      payload: updated,
      updatedAt: new Date().toISOString()
    });
    setEditingTemplate(null);
    if (previewForm && previewForm.id === updated.id) {
      setPreviewForm(updated);
    }
    setSaveSuccessMsg(`Đã cập nhật & đồng bộ cấu trúc mẫu ${updated.code}!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Khôi phục mẫu gốc của DKBike
  const handleResetToFactoryTemplate = (formId: string) => {
    if (window.confirm('Anh có chắc muốn khôi phục lại mẫu nguyên bản chuẩn ban đầu của DKBike?')) {
      const newMap = { ...customTemplatesMap };
      delete newMap[formId];
      setCustomTemplatesMap(newMap);
      safeStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(newMap));
      onDeleteBmRecord?.(`tpl:${formId}`);
      setEditingTemplate(null);
      const original = QMS_FORM_TEMPLATES.find(f => f.id === formId);
      if (original && previewForm && previewForm.id === formId) {
        setPreviewForm(original);
      }
      setSaveSuccessMsg('Đã khôi phục mẫu về chuẩn gốc DKBike.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  // Bộ lọc danh sách biểu mẫu (Tab 1)
  const filteredForms = useMemo(() => {
    return allFormTemplates.filter(form => {
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
  }, [allFormTemplates, selectedDept, searchKeyword]);

  // Bộ lọc danh sách tài liệu (Tab 2)
  const filteredDocs = useMemo(() => {
    return allDocuments.filter(doc => {
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
  }, [allDocuments, selectedDocCategory, docSearchKeyword]);

  // Thống kê nhanh biểu mẫu (Tab 1)
  const formStats = useMemo(() => {
    const total = allFormTemplates.length;
    const qlcl = allFormTemplates.filter(f => f.department === 'Lãnh đạo Phòng QLCL').length;
    const qc = allFormTemplates.filter(f => f.department === 'Bộ phận QC Hiện trường').length;
    const qa = allFormTemplates.filter(f => f.department === 'Bộ phận QA/QE').length;
    const kttd = allFormTemplates.filter(f => f.department === 'Bộ phận Kỹ thuật Thẩm định').length;
    return { total, qlcl, qc, qa, kttd };
  }, [allFormTemplates]);

  // Thống kê nhanh tài liệu (Tab 2)
  const docStats = useMemo(() => {
    const total = allDocuments.length;
    const hoSoToChuc = allDocuments.filter(d => d.category === 'ho-so-to-chuc').length;
    const quyTrinh = allDocuments.filter(d => d.category === 'quy-trinh').length;
    const mtcv = allDocuments.filter(d => d.category === 'mtcv-ban-giao').length;
    const bieuMauGoc = allDocuments.filter(d => d.category === 'bieu-mau-goc').length;
    return { total, hoSoToChuc, quyTrinh, mtcv, bieuMauGoc };
  }, [allDocuments]);

  // Sao chép đường dẫn dkqms.cloud/bm
  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/bm` : 'https://dkqms.cloud/bm';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Header 50% - 50% chuẩn in và xuất Word
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

  // Chuẩn hóa giá trị hiển thị khi In / Xuất Word / CSV
  const resolveDisplayCellText = (filledVal: string | undefined, templateCell: string | number): string => {
    const rawTemplate = String(templateCell ?? '');
    if (filledVal !== undefined) {
      if (filledVal.trim() !== '') return filledVal;
      return isDotOnlyTemplate(rawTemplate) ? rawTemplate : (rawTemplate.includes('...') ? rawTemplate : '');
    }
    return rawTemplate;
  };

  // Render ô có checkbox □ / ☑ thành HTML chuẩn in A4 (mỗi lựa chọn 1 dòng, ô vuông sắc nét)
  const renderFormattedCellHtml = (text: string, forWord = false): string => {
    const lines = String(text ?? '').split('\n');
    return lines
      .map(line => {
        const isChecked = line.startsWith('☑');
        const isUnchecked = line.startsWith('□');
        if (isChecked || isUnchecked) {
          const label = escapeHtml(line.substring(2).trimStart());
          if (forWord) {
            return `<div style="margin:1pt 0;">${isChecked ? '☑' : '□'} ${label}</div>`;
          }
          return `<div class="cb-row"><span class="cb-box ${isChecked ? 'cb-checked' : ''}">${isChecked ? '&#10003;' : ''}</span><span class="${isChecked ? 'cb-label-checked' : ''}">${label}</span></div>`;
        }
        return `<div>${escapeHtml(line) || '&nbsp;'}</div>`;
      })
      .join('');
  };

  // Tính danh sách chỉ số cột đã được gộp rowSpan=2 ở tầng tiêu đề trên
  const getRowSpanSkippedCols = (headerGroups?: { label: string; colSpan: number; rowSpan?: number }[]): Set<number> => {
    const skipped = new Set<number>();
    if (!headerGroups) return skipped;
    let colCursor = 0;
    headerGroups.forEach(g => {
      if ((g.rowSpan || 1) > 1) {
        for (let k = 0; k < g.colSpan; k++) {
          skipped.add(colCursor + k);
        }
      }
      colCursor += g.colSpan;
    });
    return skipped;
  };

  // Render phần <thead> cho Print & Word (hỗ trợ cả bảng 1 tầng và bảng gộp nhóm 2 tầng headerGroups)
  const renderTableTheadHtml = (
    tbl: QmsFormTemplate['tables'][number],
    isFirstColStt: boolean,
    forWord: boolean,
    isCompact = false
  ): string => {
    const thStyle = forWord
      ? `padding:${isCompact ? '2pt 2.5pt' : '4pt'}; border:1pt solid #000;${isCompact ? ' font-size:7.5pt;' : ''}`
      : '';
    const bgStyle = forWord ? 'background-color:#f3f4f6; font-weight:bold; text-align:center;' : '';

    if ((!tbl.headerGroups || tbl.headerGroups.length === 0) && (!tbl.headers || tbl.headers.length === 0)) {
      return '';
    }

    if (tbl.headerGroups && tbl.headerGroups.length > 0) {
      const skipped = getRowSpanSkippedCols(tbl.headerGroups);
      const row1 = `<tr style="${bgStyle}">${tbl.headerGroups
        .map((g, idx) => {
          const sttWidth = idx === 0 && g.colSpan === 1 && isFirstColStt ? `width:${isCompact ? '22px' : '32px'};` : '';
          return `<th colspan="${g.colSpan}" rowspan="${g.rowSpan || 1}" style="${thStyle}${sttWidth}">${escapeHtml(g.label).replace(/\n/g, '<br/>')}</th>`;
        })
        .join('')}</tr>`;
      const row2 = `<tr style="${bgStyle}">${tbl.headers
        .map((h, hIdx) => {
          if (skipped.has(hIdx)) return '';
          return `<th style="${thStyle}">${escapeHtml(h).replace(/\n/g, '<br/>')}</th>`;
        })
        .join('')}</tr>`;
      return `<thead>${row1}${row2}</thead>`;
    }

    return `<thead><tr style="${bgStyle}">${tbl.headers
      .map((h, hIdx) => `<th style="${thStyle}${hIdx === 0 && isFirstColStt ? `width:${isCompact ? '22px' : '34px'};` : ''}">${escapeHtml(h).replace(/\n/g, '<br/>')}</th>`)
      .join('')}</tr></thead>`;
  };

  // In trực tiếp biểu mẫu qua Dedicated Print Engine Iframe A4 độc lập (HTML thuần từ state, không clone input/textarea)
  const handlePrintForm = (form: QmsFormTemplate) => {
    const filled = getFilledDataForForm(form);
    const isLandscape = form.orientation === 'landscape';
    const isCompactTable = !isLandscape && form.tables.some(t => t.headers.length >= 9);

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
    const fieldsCols = form.fieldsColumns || 2;
    const emptyFieldDots = fieldsCols === 3 ? '........................' : '................................................';

    // Build Fields cân đối theo 2 hoặc 3 cột
    let fieldsRowsHtml = '';
    for (let i = 0; i < form.fields.length; i += fieldsCols) {
      let rowCellsHtml = '';
      for (let c = 0; c < fieldsCols; c++) {
        const f = form.fields[i + c];
        const v = f ? (filled.fields[f.label] || '').trim() : '';
        rowCellsHtml += `
          <td class="field-cell">
            ${f ? `
              <div class="field-line">
                <span class="field-label">${escapeHtml(f.label)}:</span>
                <span class="field-value ${v ? 'filled' : 'empty'}">${v ? escapeHtml(v).replace(/\n/g, '<br/>') : emptyFieldDots}</span>
              </div>
            ` : ''}
          </td>
        `;
      }
      fieldsRowsHtml += `<tr>${rowCellsHtml}</tr>`;
    }

    // Build Pre-Table Note (nếu có)
    const preNoteRaw = filled.fields['__preTableNote__'];
    const preNoteDisplay =
      preNoteRaw !== undefined && preNoteRaw.trim() !== ''
        ? preNoteRaw
        : form.preTableNote?.content || '';
    const preTableNoteHtml = form.preTableNote
      ? `
      <div class="pre-table-note">
        <div class="pre-table-note-title">${escapeHtml(form.preTableNote.title)}</div>
        <div class="pre-table-note-body">${escapeHtml(preNoteDisplay).replace(/\n/g, '<br/>')}</div>
      </div>
    `
      : '';

    // Build Tables
    const tablesHtml = form.tables
      .map((tbl, tIdx) => {
        const isFirstColStt = Boolean(tbl.headers[0] && tbl.headers[0].trim().toUpperCase() === 'STT');
        const isHeaderless = (!tbl.headerGroups || tbl.headerGroups.length === 0) && tbl.headers.length === 0;
        return `
          <div class="table-section">
            <div class="section-title">${escapeHtml(tbl.title)}</div>
            <table class="qms-table${isHeaderless ? ' headerless-box-table' : ''}">
              ${renderTableTheadHtml(tbl, isFirstColStt, false, isCompactTable)}
              <tbody>
                ${tbl.rows
            .map(
              (row, rIdx) => `
                  <tr>
                    ${row
                  .map((cell, cIdx) => {
                    const cellKey = `${tIdx}_${rIdx}_${cIdx}`;
                    const displayVal = resolveDisplayCellText(filled.tableCells[cellKey], cell);
                    const isCenter = cIdx === 0 && isFirstColStt;
                    const isHeaderlessLabel = isHeaderless && row.length === 2 && cIdx === 0 && String(cell ?? '').trim() !== '';
                    const tdClass = isCenter
                      ? 'text-center font-bold'
                      : isHeaderlessLabel
                        ? 'headerless-label-cell'
                        : isHeaderless && row.length === 1
                          ? 'headerless-box-cell'
                          : '';
                    return `<td class="${tdClass}">${renderFormattedCellHtml(displayVal)}</td>`;
                  })
                  .join('')}
                  </tr>
                `
            )
            .join('')}
              </tbody>
            </table>
          </div>
        `;
      })
      .join('');

    // Build Conclusions
    const conclusionsHtml =
      form.conclusions && form.conclusions.length > 0
        ? `
      <div class="conclusions-box">
        <div class="conclusions-title">KẾT LUẬN &amp; PHÁN QUYẾT XỬ LÝ:</div>
        ${form.conclusions
          .map((c, cIdx) => {
            const rawVal = filled.conclusions[String(cIdx)];
            const displayVal =
              rawVal !== undefined && rawVal.trim() !== ''
                ? rawVal
                : c.content || '....................................................................................................................';
            return `
              <div class="conclusion-item">
                <div class="conclusion-label">&bull; ${escapeHtml(c.label)}:</div>
                <div class="conclusion-body">${renderFormattedCellHtml(displayVal)}</div>
              </div>
            `;
          })
          .join('')}
      </div>
    `
        : '';

    // Build Signatures
    const signaturesHtml = `
      <table class="signatures-table">
        <tr>
          ${form.signRoles
        .map((s, sIdx) => {
          const signerName = (filled.signers[String(sIdx)] || '').trim();
          return `
              <td style="width:${(100 / Math.max(form.signRoles.length, 1)).toFixed(2)}%;">
                <div class="sign-role">${escapeHtml(s.role)}</div>
                <div class="sign-sub">(${escapeHtml(s.title)})</div>
                <div class="sign-space">${signerName ? `<div class="sign-name">${escapeHtml(signerName)}</div>` : ''}</div>
                <div class="sign-hint">(Ký và ghi rõ họ tên)</div>
              </td>
            `;
        })
        .join('')}
        </tr>
      </table>
    `;

    idoc.open();
    idoc.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(docTitle)}</title>
  <style>
    @page {
      size: A4 ${isLandscape ? 'landscape' : 'portrait'};
      margin: ${isCompactTable ? '8mm 8mm 8mm 8mm' : isLandscape ? '8mm 10mm 8mm 10mm' : '10mm 12mm 10mm 12mm'};
    }
    html, body {
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: "Times New Roman", Times, serif;
      color: #000000 !important;
      font-size: ${isCompactTable ? '11px' : '11.5px'};
      line-height: ${isCompactTable ? '1.3' : '1.38'};
    }
    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-document {
      width: 100%;
      margin: 0 auto;
    }
    table.header-table {
      width: 100%;
      border: 1px solid #000;
      border-collapse: collapse;
      margin-bottom: ${isCompactTable ? '6px' : '10px'};
    }
    table.header-table td {
      border: 1px solid #000;
      padding: ${isCompactTable ? '4px 6px' : '6px 8px'};
      vertical-align: middle;
    }
    table.header-meta {
      width: 100%;
      border: none;
      border-collapse: collapse;
      font-size: ${isCompactTable ? '10px' : '11px'};
    }
    table.header-meta td {
      border: none !important;
      padding: 1.5px 0 !important;
    }
    .form-main-title {
      text-align: center;
      margin: ${isCompactTable ? '4px 0 6px 0' : '8px 0 10px 0'};
    }
    .form-main-title h1 {
      font-size: ${isCompactTable ? '13.5px' : '14.5px'};
      font-weight: bold;
      text-transform: uppercase;
      margin: 0 0 3px 0;
    }
    .form-main-title p {
      font-size: ${isCompactTable ? '10px' : '11px'};
      font-style: italic;
      margin: 0;
      color: #333;
    }
    table.info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: ${isCompactTable ? '6px' : '10px'};
      font-size: ${fieldsCols === 3 ? '10px' : isCompactTable ? '10.5px' : '11.5px'};
      table-layout: fixed;
    }
    table.info-table td.field-cell {
      width: ${(100 / fieldsCols).toFixed(2)}%;
      padding: ${fieldsCols === 3 ? '2.5px 5px' : '3px 8px'};
      vertical-align: top;
    }
    table.info-table td.field-cell:first-child {
      padding-left: 0;
    }
    table.info-table td.field-cell:last-child {
      padding-right: 0;
    }
    .field-line {
      border-bottom: 1px dotted #555;
      padding-bottom: 2px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 4px;
    }
    .field-label {
      font-weight: bold;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .field-value {
      text-align: right;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .field-value.filled {
      font-weight: bold;
      color: #000;
    }
    .field-value.empty {
      color: #555;
      white-space: nowrap;
      overflow: hidden;
    }
    .pre-table-note {
      background-color: #f3f4f6 !important;
      border: 1px solid #000;
      padding: ${isCompactTable ? '4px 7px' : '5px 8px'};
      margin: ${isCompactTable ? '4px 0 6px 0' : '6px 0 8px 0'};
      font-size: ${isCompactTable ? '10px' : '10.5px'};
    }
    .pre-table-note-title {
      font-weight: bold;
      font-style: italic;
      margin-bottom: 3px;
    }
    .pre-table-note-body {
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
      font-weight: bold;
    }
    .table-section {
      margin: ${isCompactTable ? '5px 0' : '8px 0'};
    }
    .section-title {
      font-size: ${isCompactTable ? '10.5px' : '11.5px'};
      font-weight: bold;
      text-transform: uppercase;
      margin: 0 0 4px 0;
    }
    table.qms-table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${isCompactTable ? '8.5px' : isLandscape ? '9.5px' : '11px'};
    }
    table.qms-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table.qms-table th, table.qms-table td {
      border: 1px solid #000;
      padding: ${isCompactTable ? '2px 3px' : isLandscape ? '3px 4px' : '4px 6px'};
      vertical-align: top;
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    ${isCompactTable ? `
    table.qms-table th {
      font-size: 8px;
      line-height: 1.2;
    }
    table.qms-table tbody td {
      height: 29px;
      vertical-align: middle;
    }
    ` : ''}
    table.qms-table th {
      background-color: #f3f4f6 !important;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
    }
    table.qms-table.headerless-box-table td.headerless-label-cell {
      width: 210px;
      background-color: #f8fafc !important;
      font-weight: bold;
    }
    table.qms-table.headerless-box-table td.headerless-box-cell {
      height: 54px;
    }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .cb-row {
      display: flex;
      align-items: flex-start;
      gap: 5px;
      margin: 1.5px 0;
      white-space: normal;
    }
    .cb-box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 11px;
      height: 11px;
      border: 1px solid #000;
      font-size: 9px;
      line-height: 1;
      margin-top: 2px;
      flex-shrink: 0;
      font-weight: bold;
    }
    .cb-checked {
      background-color: #000 !important;
      color: #fff !important;
    }
    .cb-label-checked {
      font-weight: bold;
    }
    .conclusions-box {
      margin: ${isCompactTable ? '6px 0' : '10px 0'};
      padding: ${isCompactTable ? '5px 7px' : '7px 9px'};
      border: 1px solid #000;
      font-size: ${isCompactTable ? '10px' : '11px'};
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .conclusions-title {
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .conclusion-item {
      margin: 4px 0;
    }
    .conclusion-label {
      font-weight: bold;
    }
    .conclusion-body {
      padding-left: 12px;
      margin-top: 2px;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .signatures-table {
      width: 100%;
      margin-top: ${isCompactTable ? '8px' : '14px'};
      border: none !important;
      border-collapse: collapse;
      text-align: center;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .signatures-table td {
      border: none !important;
      padding: 2px 6px;
      vertical-align: top;
    }
    .sign-role {
      font-weight: bold;
      font-size: 11px;
      text-transform: uppercase;
    }
    .sign-sub {
      font-size: 10px;
      font-style: italic;
      color: #333;
      margin-top: 1px;
    }
    .sign-space {
      height: ${isCompactTable ? '36px' : '50px'};
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
    }
    .sign-name {
      font-weight: bold;
      font-size: 11px;
      color: #000;
    }
    .sign-hint {
      font-size: 9.5px;
      font-style: italic;
      color: #555;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="print-document">
    <table class="header-table">
      <tr>
        <td style="width:50%; text-align:center;">
          <div style="font-weight:bold; font-size:12px; text-transform:uppercase; line-height:1.25;">CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT</div>
          <div style="font-weight:bold; font-size:11px; text-transform:uppercase; margin-top:2px;">PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL)</div>
          <div style="font-size:10px; font-style:italic; margin-top:2px; color:#333;">Tiêu chuẩn: ISO 9001:2015</div>
        </td>
        <td style="width:50%;">
          <table class="header-meta">
            <tr>
              <td style="width:42%; font-weight:bold;">Mã Biểu Mẫu:</td>
              <td style="font-weight:bold;">${escapeHtml(form.code)}</td>
            </tr>
            <tr>
              <td style="font-weight:bold;">Mã Quy Trình:</td>
              <td>${escapeHtml(form.procedureCode)}</td>
            </tr>
            <tr>
              <td style="font-weight:bold;">Lần Ban Hành:</td>
              <td>${escapeHtml(form.revision)} | Ngày: ${escapeHtml(form.effectiveDate)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div class="form-main-title">
      <h1>${escapeHtml(form.title)}</h1>
      <p>(${escapeHtml(form.subtitle || form.purpose)})</p>
    </div>

    <table class="info-table">
      ${fieldsRowsHtml}
    </table>

    ${preTableNoteHtml}
    ${tablesHtml}
    ${conclusionsHtml}
    ${signaturesHtml}
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
    }, 350);
  };

  // Xuất file Microsoft Word (.doc) hoàn chỉnh - kèm theo các giá trị đã điền
  const handleExportWord = (form: QmsFormTemplate) => {
    try {
      const filled = getFilledDataForForm(form);
      const isLandscape = form.orientation === 'landscape';
      const headerContent = renderBalancedHeaderHtml(form);

      const titleContent = `
        <div style="text-align:center; margin:10pt 0 8pt 0;">
          <h1 style="font-size:13.5pt; font-weight:bold; text-transform:uppercase; margin:0 0 2pt 0; font-family:'Times New Roman', serif;">${escapeHtml(form.title)}</h1>
          <p style="font-size:9.5pt; font-style:italic; margin:0; color:#333; font-family:'Times New Roman', serif;">(${escapeHtml(form.subtitle || form.purpose)})</p>
        </div>
      `;

      const wordFieldsCols = form.fieldsColumns || 2;
      const wordEmptyDots = wordFieldsCols === 3 ? '....................................' : '....................................................................';
      let fieldsHtml = `<div style="margin-bottom:8pt;"><table style="width:100%; border:none; border-collapse:collapse; font-size:${wordFieldsCols === 3 ? '8.5pt' : '9.5pt'}; font-family:'Times New Roman', serif;">`;
      for (let i = 0; i < form.fields.length; i += wordFieldsCols) {
        let rowHtml = '';
        for (let c = 0; c < wordFieldsCols; c++) {
          const f = form.fields[i + c];
          const val = f ? ((filled.fields[f.label] || '').trim() || wordEmptyDots) : '';
          const colPad = c === 0 ? '2.5pt 5pt 2.5pt 0' : c === wordFieldsCols - 1 ? '2.5pt 0 2.5pt 5pt' : '2.5pt 5pt';
          rowHtml += `
            <td style="width:${(100 / wordFieldsCols).toFixed(2)}%; padding:${colPad};${f ? ' border-bottom:1pt dotted #666;' : ''}">
              ${f ? `<b>${escapeHtml(f.label)}:</b> <span style="color:#0f172a; font-weight:bold;">${escapeHtml(val)}</span>` : ''}
            </td>
          `;
        }
        fieldsHtml += `<tr>${rowHtml}</tr>`;
      }
      fieldsHtml += '</table></div>';

      const wordPreNoteRaw = filled.fields['__preTableNote__'];
      const wordPreNoteDisplay =
        wordPreNoteRaw !== undefined && wordPreNoteRaw.trim() !== ''
          ? wordPreNoteRaw
          : form.preTableNote?.content || '';
      const wordPreNoteHtml = form.preTableNote
        ? `
        <div style="margin:6pt 0; padding:5pt 8pt; background-color:#f3f4f6; border:1pt solid #000; font-size:9pt; font-family:'Times New Roman', serif;">
          <p style="margin:0 0 3pt 0; font-weight:bold; font-style:italic;">${escapeHtml(form.preTableNote.title)}</p>
          <p style="margin:0; font-weight:bold;">${escapeHtml(wordPreNoteDisplay).replace(/\n/g, '<br/>')}</p>
        </div>
      `
        : '';

      const isCompactWord = !isLandscape && form.tables.some(t => t.headers.length >= 9);
      let tablesHtml = '';
      form.tables.forEach((t, tIdx) => {
        const isFirstColStt = Boolean(t.headers[0] && t.headers[0].trim().toUpperCase() === 'STT');
        const isHeaderless = (!t.headerGroups || t.headerGroups.length === 0) && t.headers.length === 0;
        tablesHtml += `
          <div style="margin:8pt 0 6pt 0;">
            <p style="font-size:9.5pt; font-weight:bold; text-transform:uppercase; margin:0 0 3pt 0; font-family:'Times New Roman', serif;">${escapeHtml(t.title)}</p>
            <table style="width:100%; border-collapse:collapse; font-size:${isCompactWord ? '7.5pt' : isLandscape ? '8pt' : '9pt'}; font-family:'Times New Roman', serif;" border="1" cellpadding="${isCompactWord ? '2' : '4'}">
              ${renderTableTheadHtml(t, isFirstColStt, true, isCompactWord)}
              <tbody>
                ${t.rows.map((row, rIdx) => `
                  <tr>
                    ${row.map((cell, cIdx) => {
          const cellKey = `${tIdx}_${rIdx}_${cIdx}`;
          const cellVal = resolveDisplayCellText(filled.tableCells[cellKey], cell);
          const isHeaderlessLabel = isHeaderless && row.length === 2 && cIdx === 0 && String(cell ?? '').trim() !== '';
          const isHeaderlessBox = isHeaderless && row.length === 1;
          const extraCellStyle = isHeaderlessLabel
            ? ' width:165pt; background-color:#f8fafc; font-weight:bold;'
            : isHeaderlessBox
              ? ' height:44pt;'
              : isCompactWord
                ? ' height:18pt;'
                : '';
          return `
                        <td style="padding:${isCompactWord ? '2.5pt 2.5pt' : '3.5pt 4pt'}; border:1pt solid #000; text-align:${cIdx === 0 && isFirstColStt ? 'center' : 'left'}; vertical-align:${isHeaderless ? 'top' : 'middle'};${extraCellStyle}">
                          ${renderFormattedCellHtml(cellVal, true)}
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
            ${form.conclusions.map((c, cIdx) => {
          const rawVal = filled.conclusions[String(cIdx)];
          const cVal = (rawVal !== undefined && rawVal.trim() !== '') ? rawVal : (c.content || '....................................................................................................................');
          return `
                <div style="margin:2.5pt 0; font-size:9.5pt; line-height:1.35;">
                  <b>• ${escapeHtml(c.label)}:</b><br/>
                  <div style="padding-left:10pt;">${renderFormattedCellHtml(cVal, true)}</div>
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
              ${form.signRoles.map((s, sIdx) => {
        const signerName = filled.signers[String(sIdx)] || '';
        return `
                  <td style="width:33.33%; padding:2pt; vertical-align:top; border:none;">
                    <p style="margin:0; font-weight:bold; text-transform:uppercase; font-size:9.5pt;">${escapeHtml(s.role)}</p>
                    <p style="margin:1pt 0 0 0; font-style:italic; font-size:8.5pt; color:#444;">(${escapeHtml(s.title)})</p>
                    <div style="height:45pt;"></div>
                    <p style="margin:0; font-weight:bold; font-size:9pt; color:#000;">${escapeHtml(signerName)}</p>
                    <p style="margin:1pt 0 0 0; font-style:italic; font-size:8pt; color:#666;">(Ký & ghi rõ họ tên)</p>
                  </td>
                `;
      }).join('')}
            </tr>
          </table>
        </div>
      `;

      const htmlDocument = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${escapeHtml(form.code)} - ${escapeHtml(form.title)}</title>
          <style>
            @page WordSection1 { 
              size:${isLandscape ? '841.95pt 595.35pt; mso-page-orientation:landscape;' : '595.35pt 841.95pt;'} 
              margin:${isLandscape ? '22pt 28pt 22pt 28pt;' : '28.35pt 35.4pt 28.35pt 35.4pt;'} 
              mso-header-margin:24pt; 
              mso-footer-margin:24pt; 
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
            ${wordPreNoteHtml}
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

  // Xuất file CSV
  const handleExportCsv = (form: QmsFormTemplate) => {
    try {
      const filled = getFilledDataForForm(form);
      const csvLines: string[] = [];
      csvLines.push(`"CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT - PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL)"`);
      csvLines.push(`"${form.code} - ${form.title}"`);
      csvLines.push(`"Mã Quy Trình: ${form.procedureCode} | Lần BH: ${form.revision} | Ngày HL: ${form.effectiveDate}"`);
      csvLines.push(`""`);

      // Phần trường thông tin
      form.fields.forEach(f => {
        const val = filled.fields[f.label] || '........................................................';
        csvLines.push(`"${f.label}","${val.replace(/"/g, '""')}"`);
      });
      csvLines.push(`""`);

      // Các bảng biểu
      form.tables.forEach((t, tIdx) => {
        csvLines.push(`"${t.title}"`);
        csvLines.push(t.headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));
        t.rows.forEach((r, rIdx) => {
          csvLines.push(r.map((cell, cIdx) => {
            const cellKey = `${tIdx}_${rIdx}_${cIdx}`;
            const cellVal = resolveDisplayCellText(filled.tableCells[cellKey], cell);
            return `"${cellVal.replace(/\n/g, ' / ').replace(/"/g, '""')}"`;
          }).join(','));
        });
        csvLines.push(`""`);
      });

      // Kết luận
      if (form.conclusions) {
        csvLines.push(`"KẾT LUẬN & PHÁN QUYẾT"`);
        form.conclusions.forEach((c, cIdx) => {
          const rawVal = filled.conclusions[String(cIdx)];
          const cVal = (rawVal !== undefined && rawVal.trim() !== '') ? rawVal : (c.content || '');
          csvLines.push(`"${c.label}","${cVal.replace(/\n/g, ' / ').replace(/"/g, '""')}"`);
        });
        csvLines.push(`""`);
      }

      // Chữ ký
      csvLines.push(`"BỘ PHẬN PHÊ DUYỆT RACI"`);
      csvLines.push(form.signRoles.map(s => `"${s.role} - ${s.title}"`).join(','));
      csvLines.push(form.signRoles.map((_, sIdx) => `"${filled.signers[String(sIdx)] || '(Ký và ghi rõ họ tên)'}"`).join(','));

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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Toast thông báo lưu thành công */}
      {saveSuccessMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <Check className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ==================== HEADER THANH ĐIỀU HÀNH ==================== */}
      <header className="bg-white border-b border-slate-300 sticky top-0 z-30 shadow-xs">
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
              className="p-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              title="Quay lại ứng dụng chính"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Hệ Thống Biểu Mẫu & Tài Liệu Quản Lý Chất Lượng
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Công ty TNHH Xe điện DK Việt Nhật • Phòng Quản lý chất lượng (QLCL)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút Copy link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Sao chép đường dẫn trực tiếp: dkqms.cloud/bm"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedLink ? 'Đã sao chép' : 'dkqms.cloud/bm'}</span>
            </button>

            {mainTab === 'documents' && (
              <a
                href="/docs/P_QLCL/P_QLCL.zip"
                download="P_QLCL_DKBike_Full.zip"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                title="Tải toàn bộ 30 tệp tài liệu trong thư mục P_QLCL (file ZIP 1.5MB)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải toàn bộ (P_QLCL.zip)</span>
              </a>
            )}
          </div>
        </div>

        {/* ==================== 2 TAB CHÍNH CỦA TRANG /BM ==================== */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 border-t border-slate-200 pt-1">
          <button
            type="button"
            onClick={() => setMainTab('forms')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer ${mainTab === 'forms'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Biểu Mẫu Nghiệp Vụ Chuẩn</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${mainTab === 'forms' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {allFormTemplates.length} BM
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('documents')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer ${mainTab === 'documents'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>Hồ Sơ & Quy Trình Vận Hành P-QLCL</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${mainTab === 'documents' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {allDocuments.length} tài liệu
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('5s')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer ${mainTab === '5s'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>5S Khu vực QLCL</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${mainTab === '5s' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
              14 vị trí
            </span>
          </button>
        </div>
      </header>

      {/* ==================== NỘI DUNG CHÍNH ==================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 w-full flex-1 space-y-4">
        {mainTab === '5s' ? (
          <Qms5sTab />
        ) : mainTab === 'forms' ? (
          /* =========================================================================
             TAB 1: BIỂU MẪU CHUẨN ISO (10 BIỂU MẪU)
             ========================================================================= */
          <>
            {/* Bộ lọc phòng ban & Công cụ tìm kiếm */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Bộ lọc phân hệ / phòng ban */}
              <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedDept('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${selectedDept === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                >
                  Tất cả ({formStats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDept('Lãnh đạo Phòng QLCL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${selectedDept === 'Lãnh đạo Phòng QLCL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                >
                  Lãnh đạo QLCL ({formStats.qlcl})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDept('Bộ phận QC Hiện trường')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${selectedDept === 'Bộ phận QC Hiện trường'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                >
                  QC Hiện trường ({formStats.qc})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDept('Bộ phận QA/QE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${selectedDept === 'Bộ phận QA/QE'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                >
                  BP QA / QE ({formStats.qa})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDept('Bộ phận Kỹ thuật Thẩm định')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${selectedDept === 'Bộ phận Kỹ thuật Thẩm định'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                  />
                </div>

                <div className="flex items-center border border-slate-300 rounded-lg p-0.5 bg-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition cursor-pointer ${viewMode === 'list'
                        ? 'bg-white text-slate-900 shadow-2xs'
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
                    className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition cursor-pointer ${viewMode === 'grid'
                        ? 'bg-white text-slate-900 shadow-2xs'
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
              <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3 text-center w-12 border-r border-slate-200">STT</th>
                        <th className="py-3 px-3 w-28 border-r border-slate-200">Mã BM</th>
                        <th className="py-3 px-3 w-28 border-r border-slate-200">Mã Quy Trình</th>
                        <th className="py-3 px-4 border-r border-slate-200">Tên Biểu Mẫu & Mô tả</th>
                        <th className="py-3 px-3 w-44 border-r border-slate-200">Bộ phận phụ trách</th>
                        <th className="py-3 px-3 w-28 text-center border-r border-slate-200">Hiệu lực</th>
                        <th className="py-3 px-3 text-right w-64">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredForms.map((form, index) => (
                        <tr key={form.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-500 border-r border-slate-200">
                            {index + 1}
                          </td>
                          <td className="py-3 px-3 border-r border-slate-200">
                            <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {form.code}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-700 border-r border-slate-200">
                            {form.procedureCode}
                          </td>
                          <td className="py-3 px-4 border-r border-slate-200">
                            <div className="font-extrabold text-slate-900 leading-snug">{form.title}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{form.subtitle || form.purpose}</div>
                          </td>
                          <td className="py-3 px-3 border-r border-slate-200">
                            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 block truncate">
                              {form.department}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center text-[11px] text-slate-600 border-r border-slate-200">
                            Lần {form.revision} ({form.effectiveDate})
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewForm(form);
                                  setModalMode('interactive');
                                }}
                                className="px-2.5 py-1 text-white bg-slate-900 hover:bg-slate-800 rounded font-bold transition flex items-center gap-1 shadow-2xs text-[11px] cursor-pointer"
                                title="Mở biểu mẫu để xem và điền số liệu trực tiếp"
                              >
                                <Edit3 className="w-3 h-3 text-amber-300" />
                                <span>Điền / Xem</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePrintForm(form)}
                                className="p-1 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition cursor-pointer"
                                title="In trực tiếp A4"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleExportWord(form)}
                                className="px-2 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                                title="Tải file Word (.doc)"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Word</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditingTemplate(JSON.parse(JSON.stringify(form)))}
                                className="p-1 text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition cursor-pointer"
                                title="Chỉnh sửa cấu trúc mẫu này (thêm/bớt trường, bảng biểu, quy trình)"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* DẠNG THẺ GRID */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredForms.map((form) => (
                  <div
                    key={form.id}
                    className="bg-white rounded-xl border border-slate-300 p-4 shadow-xs flex flex-col justify-between hover:border-indigo-400 hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white">
                            {form.code}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {form.procedureCode}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {form.department}
                        </span>
                      </div>

                      <h3 className="text-sm font-black text-slate-900 leading-snug">
                        {form.title}
                      </h3>

                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {form.subtitle || form.purpose}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] text-slate-600 flex justify-between font-medium">
                        <span>Lần BH: <strong>{form.revision}</strong> ({form.effectiveDate})</span>
                        <span>Phê duyệt: <strong>{form.signRoles[form.signRoles.length - 1].role}</strong></span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewForm(form);
                            setModalMode('interactive');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                          <span>Điền / Xem</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingTemplate(JSON.parse(JSON.stringify(form)))}
                          className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-800 transition flex items-center gap-1 cursor-pointer"
                          title="Sửa cấu trúc mẫu này"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Sửa mẫu</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleExportWord(form)}
                          className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100 transition flex items-center gap-1 cursor-pointer"
                          title="Tải file Word (.doc)"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Word</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportCsv(form)}
                          className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition flex items-center gap-1 cursor-pointer"
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
            <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <FolderArchive className="w-5 h-5 text-indigo-700" />
                  Kho Hồ Sơ & Tài Liệu Vận Hành P-QLCL DKBike
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Lưu trữ {allDocuments.length} tài liệu Word chuẩn hóa: Hồ sơ tổ chức, Ma trận phân nhiệm, Quy trình SOP, MTCV theo RACI và Biên bản bàn giao nhiệm vụ. (Có thể bấm nút <b>Sửa</b> để chỉnh sửa tiêu đề và nội dung ngay tại web)
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/docs/P_QLCL/P_QLCL.zip"
                  download="P_QLCL_DKBike_Full.zip"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                  title="Tải trọn bộ 30 tài liệu (file nén P_QLCL.zip 1.5MB)"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải toàn bộ (P_QLCL.zip)</span>
                </a>
              </div>
            </div>

            {/* Thanh lọc chuyên mục & Tìm kiếm tài liệu */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedDocCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${selectedDocCategory === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                >
                  Tất cả ({docStats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocCategory('ho-so-to-chuc')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${selectedDocCategory === 'ho-so-to-chuc'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                >
                  Hồ sơ Tổ chức & Khung năng lực ({docStats.hoSoToChuc})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocCategory('quy-trinh')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${selectedDocCategory === 'quy-trinh'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                >
                  Quy trình chuẩn SOP ({docStats.quyTrinh})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocCategory('mtcv-ban-giao')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${selectedDocCategory === 'mtcv-ban-giao'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                >
                  MTCV & Bàn giao Nhân sự ({docStats.mtcv})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocCategory('bieu-mau-goc')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${selectedDocCategory === 'bieu-mau-goc'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                  />
                </div>

                <div className="flex items-center border border-slate-300 rounded-lg p-0.5 bg-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDocViewMode('list')}
                    className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition cursor-pointer ${docViewMode === 'list'
                        ? 'bg-white text-slate-900 shadow-2xs'
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
                    className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition cursor-pointer ${docViewMode === 'grid'
                        ? 'bg-white text-slate-900 shadow-2xs'
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

            {/* DANH SÁCH HOẶC THẺ TÀI LIỆU */}
            {docViewMode === 'list' ? (
              <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3 text-center w-12 border-r border-slate-200">STT</th>
                        <th className="py-3 px-3 w-28 border-r border-slate-200">Mã TL / QT</th>
                        <th className="py-3 px-4 border-r border-slate-200">Tên Tài Liệu & Nội dung</th>
                        <th className="py-3 px-3 w-48 border-r border-slate-200">Chuyên mục</th>
                        <th className="py-3 px-3 w-24 text-center border-r border-slate-200">Dung lượng</th>
                        <th className="py-3 px-3 text-right w-72">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredDocs.map((doc, index) => (
                        <tr key={doc.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-500 border-r border-slate-200">
                            {index + 1}
                          </td>
                          <td className="py-3 px-3 border-r border-slate-200">
                            <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                              {doc.code || 'DOCX'}
                            </span>
                          </td>
                          <td className="py-3 px-4 border-r border-slate-200">
                            <div className="font-extrabold text-slate-900 leading-snug flex items-center gap-1.5 flex-wrap">
                              <span>{doc.title}</span>
                              {customDocumentsMap[doc.id] && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                  Đã sửa
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{doc.summary}</div>
                          </td>
                          <td className="py-3 px-3 border-r border-slate-200">
                            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 block truncate">
                              {doc.categoryName}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-[11px] text-slate-600 border-r border-slate-200">
                            {doc.fileSizeKB} KB
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => openDocPreview(doc, 'summary')}
                                className="px-2 py-1 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                                title="Xem tóm tắt nội dung tài liệu"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Tóm tắt</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openDocPreview(doc, 'file')}
                                className="px-2 py-1 text-indigo-800 hover:text-indigo-950 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-300 transition flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                                title="Xem trực tiếp nội dung file Word gốc"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Xem trực tiếp</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingDoc(JSON.parse(JSON.stringify(doc)))}
                                className="px-2 py-1 text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 rounded border border-amber-300 transition flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                                title="Chỉnh sửa tiêu đề & nội dung hồ sơ quy trình này"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Sửa</span>
                              </button>
                              <a
                                href={encodeURI(`/docs/P_QLCL/${doc.relPath}`)}
                                download={doc.fileName}
                                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded transition flex items-center gap-1 font-bold text-[11px] shadow-2xs"
                                title={`Tải tệp ${doc.fileName}`}
                              >
                                <Download className="w-3 h-3" />
                                <span>Tải về</span>
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-xl border border-slate-300 p-4 shadow-xs flex flex-col justify-between hover:border-indigo-400 hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white">
                            {doc.code || 'DOCX'}
                          </span>
                          {customDocumentsMap[doc.id] && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              Đã sửa
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[200px]">
                          {doc.categoryName}
                        </span>
                      </div>

                      <h3 className="text-sm font-black text-slate-900 leading-snug">
                        {doc.title}
                      </h3>

                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {doc.summary}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] text-slate-600 flex justify-between font-medium">
                        <span>Áp dụng: <strong>{doc.department}</strong></span>
                        <span className="font-mono font-bold">{doc.fileSizeKB} KB</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => openDocPreview(doc, 'summary')}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
                          title="Xem tóm tắt nội dung tài liệu"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Xem tóm tắt</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openDocPreview(doc, 'file')}
                          className="px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition flex items-center gap-1.5 cursor-pointer"
                          title="Xem trực tiếp nội dung file Word gốc"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem trực tiếp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDoc(JSON.parse(JSON.stringify(doc)))}
                          className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-800 transition flex items-center gap-1 cursor-pointer"
                          title="Chỉnh sửa tiêu đề & nội dung hồ sơ quy trình"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                      </div>

                      <a
                        href={encodeURI(`/docs/P_QLCL/${doc.relPath}`)}
                        download={doc.fileName}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
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

      {/* =========================================================================
          MODAL XEM & ĐIỀN TRỰC TIẾP BIỂU MẪU CHUẨN A4 (TAB 1)
          ========================================================================= */}
      {previewForm && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className={`bg-slate-200 border border-slate-400 rounded-xl ${previewForm.orientation === 'landscape' ? 'max-w-6xl' : 'max-w-4xl'} w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden`}>
            {/* Modal Header & Thanh công cụ thao tác */}
            <div className="bg-white px-4 py-2.5 border-b border-slate-300 flex flex-wrap justify-between items-center gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-indigo-600 text-white">
                  {previewForm.code}
                </span>
                <h3 className="font-black text-xs sm:text-sm text-slate-900 truncate max-w-xs sm:max-w-md">
                  {previewForm.title}
                </h3>
              </div>

              {/* Nút chuyển đổi chế độ xem: Điền trực tiếp VS Bản in sạch */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center border border-slate-300 rounded-lg p-0.5 bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalMode('interactive')}
                    className={`px-2 py-1 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1 ${modalMode === 'interactive' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-700 hover:text-black'
                      }`}
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Điền trực tiếp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('clean')}
                    className={`px-2 py-1 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1 ${modalMode === 'clean' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-700 hover:text-black'
                      }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Bản in A4</span>
                  </button>
                </div>

                {/* Nút Lưu bản điền */}
                <button
                  type="button"
                  onClick={handleSaveFilledData}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Lưu dữ liệu anh vừa nhập vào bộ nhớ hệ thống"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu</span>
                </button>

                {/* Nút Xóa trắng */}
                <button
                  type="button"
                  onClick={handleResetFilledData}
                  className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Xóa trắng để điền lại"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Nút In A4 */}
                <button
                  type="button"
                  onClick={() => handlePrintForm(previewForm)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="In trực tiếp A4 hoặc Lưu file PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In</span>
                </button>

                {/* Nút Tải Word */}
                <button
                  type="button"
                  onClick={() => handleExportWord(previewForm)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Tải file Word (.doc) chứa nội dung đã điền"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Word</span>
                </button>

                {/* Nút Sửa cấu trúc mẫu */}
                <button
                  type="button"
                  onClick={() => setEditingTemplate(JSON.parse(JSON.stringify(previewForm)))}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Sửa cấu trúc mẫu: thêm bớt dòng, cột, quy trình"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Sửa mẫu</span>
                </button>

                {/* Nút Đóng */}
                <button
                  type="button"
                  onClick={() => setPreviewForm(null)}
                  className="text-slate-400 hover:text-slate-800 p-1 hover:bg-slate-100 rounded transition font-bold cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Tờ Giấy In A4 Nổi Bật (Có thể gõ trực tiếp) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200 select-text">
              <div
                id="qms-form-printable-document"
                className={`bg-white text-slate-900 border border-slate-300 shadow-xl p-5 sm:p-8 mx-auto ${previewForm.orientation === 'landscape' ? 'max-w-[1060px]' : 'max-w-3xl'} font-serif text-[12px] leading-relaxed`}
                style={{ width: '100%', minHeight: previewForm.orientation === 'landscape' ? '185mm' : '270mm' }}
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
                <div className={`info-grid grid ${previewForm.fieldsColumns === 3 ? 'grid-cols-1 sm:grid-cols-3 gap-x-4 text-[11px]' : 'grid-cols-2 gap-x-6 text-[11.5px]'} gap-y-1.5 mb-3 font-sans`}>
                  {previewForm.fields.map((f, fIdx) => {
                    const val = currentFilledData.fields[f.label] || '';
                    return (
                      <div key={fIdx} className="info-item border-b border-dotted border-slate-400 pb-0.5 flex items-center justify-between gap-2 min-w-0">
                        <span className="font-bold text-slate-800 shrink-0">{f.label}:</span>
                        {modalMode === 'interactive' ? (
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => {
                              setCurrentFilledData(prev => ({
                                ...prev,
                                fields: { ...prev.fields, [f.label]: e.target.value }
                              }));
                            }}
                            placeholder="Nhập thông tin..."
                            className="flex-1 min-w-0 text-right text-slate-900 font-bold bg-indigo-50/20 hover:bg-indigo-50/40 focus:bg-white focus:outline-none px-1 rounded transition text-xs border border-transparent focus:border-indigo-400"
                          />
                        ) : (
                          <span className="text-slate-900 font-bold text-right break-words whitespace-pre-wrap">
                            {val || <span className="text-slate-400 font-normal whitespace-nowrap">{previewForm.fieldsColumns === 3 ? '........................' : '....................................................'}</span>}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Hộp Ghi chú lỗi trọng tâm trước khi kiểm (nếu có) */}
                {previewForm.preTableNote && (() => {
                  const rawNote = currentFilledData.fields['__preTableNote__'];
                  const noteVal = rawNote !== undefined ? rawNote : previewForm.preTableNote.content;
                  return (
                    <div className="bg-slate-100 border border-black p-2 mb-3 text-[11px]">
                      <div className="font-bold italic text-black mb-1">
                        {previewForm.preTableNote.title}
                      </div>
                      {modalMode === 'interactive' ? (
                        <AutoResizeTextarea
                          minRows={1}
                          value={rawNote === undefined ? '' : rawNote}
                          onChange={(val) => {
                            setCurrentFilledData(prev => ({
                              ...prev,
                              fields: { ...prev.fields, __preTableNote__: val }
                            }));
                          }}
                          placeholder={previewForm.preTableNote.content}
                          className="w-full text-slate-900 font-bold bg-white/80 focus:bg-white focus:outline-none p-1 rounded border border-slate-300 focus:border-indigo-400 text-xs resize-none"
                        />
                      ) : (
                        <div className="font-bold text-slate-900 whitespace-pre-wrap break-words">
                          {noteVal.trim() ? noteVal : previewForm.preTableNote.content}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Các Bảng Biểu Kỹ Thuật / Nghiệm Thu */}
                {previewForm.tables.map((tbl, tIdx) => {
                  const isFirstColStt = Boolean(tbl.headers[0] && tbl.headers[0].trim().toUpperCase() === 'STT');
                  const isHeaderless = (!tbl.headerGroups || tbl.headerGroups.length === 0) && tbl.headers.length === 0;
                  const skippedCols = getRowSpanSkippedCols(tbl.headerGroups);
                  return (
                    <div key={tIdx} className="my-3">
                      <h4 className="section-title text-[11.5px] font-bold text-black uppercase mb-1.5">
                        {tbl.title}
                      </h4>
                      <table className={`qms-table w-full border-collapse border border-black ${previewForm.orientation === 'landscape' ? 'text-[10px]' : 'text-[11px]'}`}>
                        {!isHeaderless && (
                          <thead>
                            {tbl.headerGroups && tbl.headerGroups.length > 0 && (
                              <tr className="bg-slate-100 font-bold">
                                {tbl.headerGroups.map((g, gIdx) => (
                                  <th
                                    key={gIdx}
                                    colSpan={g.colSpan}
                                    rowSpan={g.rowSpan || 1}
                                    className={`border border-black p-1 text-center whitespace-pre-line ${gIdx === 0 && g.colSpan === 1 && isFirstColStt ? 'w-9' : ''}`}
                                  >
                                    {g.label}
                                  </th>
                                ))}
                              </tr>
                            )}
                            <tr className="bg-slate-100 font-bold">
                              {tbl.headers.map((h, hIdx) => {
                                if (skippedCols.has(hIdx)) return null;
                                return (
                                  <th key={hIdx} className={`border border-black p-1 text-center whitespace-pre-line ${hIdx === 0 && isFirstColStt ? 'w-10' : ''}`}>
                                    {h}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                        )}
                        <tbody>
                          {tbl.rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((cell, cIdx) => {
                                const cellKey = `${tIdx}_${rIdx}_${cIdx}`;
                                const rawStored = currentFilledData.tableCells[cellKey];
                                const templateStr = String(cell ?? '');
                                const cellVal = rawStored ?? templateStr;
                                const hasCheckboxes = cellVal.includes('□') || cellVal.includes('☑');
                                const editable = isEditableTableCell(templateStr, cIdx, row.length);
                                const cleanDisplayVal = resolveDisplayCellText(rawStored, cell);
                                const isCompactCol = tbl.headers.length >= 9;
                                const isHeaderlessLabel = isHeaderless && row.length === 2 && cIdx === 0 && templateStr.trim() !== '';

                                return (
                                  <td
                                    key={cIdx}
                                    className={`border border-black ${isCompactCol ? 'p-1' : 'p-1.5'} align-top ${cIdx === 0 && isFirstColStt
                                        ? `text-center ${isCompactCol ? 'w-8' : 'w-10'} font-bold`
                                        : isHeaderlessLabel
                                          ? 'text-left w-56 font-bold bg-slate-50 text-slate-800'
                                          : 'text-left'
                                      }`}
                                  >
                                    {hasCheckboxes ? (
                                      /* Ô có ô vuông tick: Có thể bấm trực tiếp để toggle □ và ☑ */
                                      <div className="space-y-0.5">
                                        {cellVal.split('\n').map((line, lIdx) => {
                                          const isChecked = line.startsWith('☑');
                                          const isBox = line.startsWith('□') || isChecked;
                                          return (
                                            <div
                                              key={lIdx}
                                              onClick={() => {
                                                if (modalMode === 'interactive' && isBox) {
                                                  const updated = toggleCheckboxText(cellVal, line);
                                                  setCurrentFilledData(prev => ({
                                                    ...prev,
                                                    tableCells: { ...prev.tableCells, [cellKey]: updated }
                                                  }));
                                                }
                                              }}
                                              className={`flex items-center gap-1.5 ${isBox && modalMode === 'interactive' ? 'cursor-pointer hover:text-indigo-700 py-0.5 select-none' : ''}`}
                                            >
                                              {isChecked ? (
                                                <CheckSquare className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                                              ) : isBox ? (
                                                <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                              ) : null}
                                              <span className={isChecked ? 'font-bold text-indigo-900' : ''}>
                                                {isBox ? line.substring(2) : line}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : modalMode === 'interactive' && editable ? (
                                      /* Ô cần điền kết quả / thông số (tự giãn chiều cao theo nội dung nhập) */
                                      <AutoResizeTextarea
                                        minRows={tbl.headers.length >= 9 ? 1 : isHeaderless && row.length === 1 ? 3 : 2}
                                        value={isDotOnlyTemplate(cellVal) ? '' : cellVal}
                                        onChange={(val) => {
                                          setCurrentFilledData(prev => ({
                                            ...prev,
                                            tableCells: { ...prev.tableCells, [cellKey]: val }
                                          }));
                                        }}
                                        placeholder={tbl.headers.length >= 9 ? '' : 'Gõ nội dung...'}
                                        className="w-full text-slate-900 font-bold bg-indigo-50/20 hover:bg-indigo-50/40 focus:bg-white focus:outline-none p-1 rounded transition text-xs border border-transparent focus:border-indigo-400 resize-none leading-snug"
                                      />
                                    ) : (
                                      /* Chế độ xem in A4 hoặc nội dung chữ cố định */
                                      <div className={`font-serif whitespace-pre-wrap break-words ${tbl.headers.length >= 9 ? 'min-h-[20px]' : isHeaderless && row.length === 1 ? 'min-h-[54px]' : isHeaderless ? 'min-h-[32px]' : ''}`}>
                                        {cleanDisplayVal.split('\n').map((line, lIdx) => (
                                          <div key={lIdx}>{line || '\u00A0'}</div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                {/* Kết luận & Phán quyết */}
                {previewForm.conclusions && previewForm.conclusions.length > 0 && (
                  <div className="conclusions-box my-3 p-2.5 border border-black text-[11px]">
                    <div className="font-bold uppercase text-black mb-1">
                      KẾT LUẬN & PHÁN QUYẾT XỬ LÝ:
                    </div>
                    {previewForm.conclusions.map((c, cIdx) => {
                      const cKey = String(cIdx);
                      const rawStored = currentFilledData.conclusions[cKey];
                      const cVal = rawStored ?? (c.content || '');
                      const hasCheckboxes = cVal.includes('□') || cVal.includes('☑');
                      const cleanDisplayVal =
                        rawStored !== undefined && rawStored.trim() !== ''
                          ? rawStored
                          : c.content || '....................................................................................................................';

                      return (
                        <div key={cIdx} className="my-1.5">
                          <strong className="text-black">• {c.label}:</strong>
                          <div className="pl-3 mt-0.5 text-slate-800">
                            {hasCheckboxes ? (
                              <div className="space-y-0.5">
                                {cVal.split('\n').map((line, lIdx) => {
                                  const isChecked = line.startsWith('☑');
                                  const isBox = line.startsWith('□') || isChecked;
                                  return (
                                    <div
                                      key={lIdx}
                                      onClick={() => {
                                        if (modalMode === 'interactive' && isBox) {
                                          const updated = toggleCheckboxText(cVal, line);
                                          setCurrentFilledData(prev => ({
                                            ...prev,
                                            conclusions: { ...prev.conclusions, [cKey]: updated }
                                          }));
                                        }
                                      }}
                                      className={`flex items-center gap-1.5 ${isBox && modalMode === 'interactive' ? 'cursor-pointer hover:text-indigo-700 py-0.5 select-none' : ''}`}
                                    >
                                      {isChecked ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                                      ) : isBox ? (
                                        <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      ) : null}
                                      <span className={isChecked ? 'font-bold text-indigo-900' : ''}>
                                        {isBox ? line.substring(2) : line}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : modalMode === 'interactive' ? (
                              <AutoResizeTextarea
                                minRows={2}
                                value={isDotOnlyTemplate(cVal) ? '' : cVal}
                                onChange={(val) => {
                                  setCurrentFilledData(prev => ({
                                    ...prev,
                                    conclusions: { ...prev.conclusions, [cKey]: val }
                                  }));
                                }}
                                placeholder="Gõ kết luận / biện pháp xử lý..."
                                className="w-full text-slate-900 font-bold bg-indigo-50/20 hover:bg-indigo-50/40 focus:bg-white focus:outline-none p-1 rounded transition text-xs border border-transparent focus:border-indigo-400 resize-none leading-snug"
                              />
                            ) : (
                              <div className="whitespace-pre-wrap break-words">
                                {cleanDisplayVal.split('\n').map((line, lIdx) => (
                                  <div key={lIdx}>{line || '\u00A0'}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bảng Ký Duyệt Phân Quyền RACI */}
                <div className="signatures-table mt-4 pt-2">
                  <table className="w-full text-center border-0 text-[11px]">
                    <tbody>
                      <tr className="font-bold text-black uppercase">
                        {previewForm.signRoles.map((s, sIdx) => {
                          const signerVal = currentFilledData.signers[String(sIdx)] || '';
                          return (
                            <td key={sIdx} className="w-1/3 align-top border-0">
                              <span className="sign-role">{s.role}</span>
                              <span className="sign-sub block text-[10px] text-slate-600 font-normal italic lowercase mt-0.5">
                                ({s.title})
                              </span>
                              <div className="sign-space h-12 flex flex-col justify-end">
                                {modalMode === 'interactive' ? (
                                  <input
                                    type="text"
                                    value={signerVal}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setCurrentFilledData(prev => ({
                                        ...prev,
                                        signers: { ...prev.signers, [String(sIdx)]: val }
                                      }));
                                    }}
                                    placeholder="Họ tên người ký..."
                                    className="w-full text-center text-xs font-bold text-slate-900 bg-transparent border-b border-dotted border-slate-400 focus:outline-none focus:border-indigo-500 py-0.5"
                                  />
                                ) : signerVal ? (
                                  <span className="font-bold text-xs text-slate-900">{signerVal}</span>
                                ) : null}
                              </div>
                              <span className="text-[10px] text-slate-500 italic block font-normal mt-1">
                                (Ký và ghi rõ họ tên)
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-white px-4 py-2.5 border-t border-slate-300 flex justify-between items-center text-xs">
              <span className="text-slate-500 text-[11px] font-medium">
                Biểu mẫu quản lý chất lượng ISO 9001:2015 • Công ty TNHH Xe điện DK Việt Nhật
              </span>
              <button
                type="button"
                onClick={() => setPreviewForm(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition cursor-pointer shadow-2xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL SỬA CẤU TRÚC MẪU (TEMPLATE EDITOR)
          ========================================================================= */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-3 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-300" />
                <h3 className="font-black text-sm">
                  Chỉnh Sửa Cấu Trúc Biểu Mẫu: <span className="text-amber-300 font-mono">{editingTemplate.code}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thanh Tab các nhóm thông tin cần sửa */}
            <div className="bg-slate-100 px-5 pt-2 flex items-center gap-2 border-b border-slate-300 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setEditorActiveTab('general')}
                className={`px-3 py-2 font-bold border-b-2 transition cursor-pointer ${editorActiveTab === 'general' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-600 hover:text-black'
                  }`}
              >
                1. Thông tin chung
              </button>
              <button
                type="button"
                onClick={() => setEditorActiveTab('fields')}
                className={`px-3 py-2 font-bold border-b-2 transition cursor-pointer ${editorActiveTab === 'fields' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-600 hover:text-black'
                  }`}
              >
                2. Các trường thông tin ({editingTemplate.fields.length})
              </button>
              <button
                type="button"
                onClick={() => setEditorActiveTab('tables')}
                className={`px-3 py-2 font-bold border-b-2 transition cursor-pointer ${editorActiveTab === 'tables' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-600 hover:text-black'
                  }`}
              >
                3. Bảng biểu kiểm tra
              </button>
              <button
                type="button"
                onClick={() => setEditorActiveTab('conclusions')}
                className={`px-3 py-2 font-bold border-b-2 transition cursor-pointer ${editorActiveTab === 'conclusions' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-600 hover:text-black'
                  }`}
              >
                4. Kết luận & Phán quyết
              </button>
            </div>

            {/* Form Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* TAB 1: THÔNG TIN CHUNG */}
              {editorActiveTab === 'general' && (
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tên biểu mẫu:</label>
                    <input
                      type="text"
                      value={editingTemplate.title}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Mã biểu mẫu:</label>
                      <input
                        type="text"
                        value={editingTemplate.code}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, code: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-indigo-700 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Mã quy trình liên quan:</label>
                      <input
                        type="text"
                        value={editingTemplate.procedureCode}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, procedureCode: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Lần ban hành:</label>
                      <input
                        type="text"
                        value={editingTemplate.revision}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, revision: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Ngày hiệu lực:</label>
                      <input
                        type="text"
                        value={editingTemplate.effectiveDate}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, effectiveDate: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Phụ đề / Mục đích:</label>
                    <textarea
                      rows={2}
                      value={editingTemplate.subtitle || editingTemplate.purpose}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, subtitle: e.target.value, purpose: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: CÁC TRƯỜNG THÔNG TIN */}
              {editorActiveTab === 'fields' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-500 font-medium">Danh sách các trường điền ở phần đầu biểu mẫu:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate({
                          ...editingTemplate,
                          fields: [...editingTemplate.fields, { label: 'Trường thông tin mới' }]
                        });
                      }}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm trường</span>
                    </button>
                  </div>

                  {editingTemplate.fields.map((f, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-500 w-6 text-center">{fIdx + 1}.</span>
                      <input
                        type="text"
                        value={f.label}
                        onChange={(e) => {
                          const updated = [...editingTemplate.fields];
                          updated[fIdx] = { ...updated[fIdx], label: e.target.value };
                          setEditingTemplate({ ...editingTemplate, fields: updated });
                        }}
                        className="flex-1 border border-slate-300 bg-white rounded p-1.5 font-bold text-slate-900 focus:outline-none focus:border-indigo-600 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingTemplate.fields.filter((_, idx) => idx !== fIdx);
                          setEditingTemplate({ ...editingTemplate, fields: updated });
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-100 rounded transition cursor-pointer"
                        title="Xóa trường này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: BẢNG BIỂU KIỂM TRA */}
              {editorActiveTab === 'tables' && (
                <div className="space-y-4">
                  {editingTemplate.tables.map((tbl, tIdx) => (
                    <div key={tIdx} className="border border-slate-300 rounded-lg p-3 bg-slate-50 space-y-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Tiêu đề bảng:</label>
                        <input
                          type="text"
                          value={tbl.title}
                          onChange={(e) => {
                            const updatedTables = [...editingTemplate.tables];
                            updatedTables[tIdx] = { ...updatedTables[tIdx], title: e.target.value };
                            setEditingTemplate({ ...editingTemplate, tables: updatedTables });
                          }}
                          className="w-full border border-slate-300 bg-white rounded p-1.5 font-bold text-slate-900 text-xs"
                        />
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-700">Các dòng kiểm tra ({tbl.rows.length} dòng):</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedTables = [...editingTemplate.tables];
                            const templateLastRow = tbl.rows[tbl.rows.length - 1] || [];
                            const newRow = tbl.headers.map((h, colIdx) => {
                              if (colIdx === 0 && h.trim().toUpperCase() === 'STT') {
                                return String(tbl.rows.length + 1);
                              }
                              const sample = String(templateLastRow[colIdx] ?? '');
                              if (sample.includes('□') || sample.includes('☑')) {
                                return sample.replace(/☑/g, '□');
                              }
                              return '................................';
                            });
                            updatedTables[tIdx] = { ...updatedTables[tIdx], rows: [...tbl.rows, newRow] };
                            setEditingTemplate({ ...editingTemplate, tables: updatedTables });
                          }}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Thêm dòng</span>
                        </button>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {tbl.rows.map((row, rIdx) => (
                          <div key={rIdx} className="bg-white p-2 rounded border border-slate-200 flex items-start gap-2">
                            <span className="font-mono font-bold text-slate-500 mt-5 w-6 text-center">{rIdx + 1}</span>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {row.map((cell, cIdx) => (
                                <div key={cIdx}>
                                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5 truncate" title={tbl.headers[cIdx]}>
                                    {tbl.headers[cIdx] || `Cột ${cIdx + 1}`}
                                  </span>
                                  <textarea
                                    rows={2}
                                    value={String(cell)}
                                    onChange={(e) => {
                                      const updatedTables = [...editingTemplate.tables];
                                      const updatedRows = [...tbl.rows];
                                      const updatedRow = [...updatedRows[rIdx]];
                                      updatedRow[cIdx] = e.target.value;
                                      updatedRows[rIdx] = updatedRow;
                                      updatedTables[tIdx] = { ...updatedTables[tIdx], rows: updatedRows };
                                      setEditingTemplate({ ...editingTemplate, tables: updatedTables });
                                    }}
                                    className="w-full border border-slate-300 rounded p-1 text-[11px] font-sans resize-y"
                                  />
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedTables = [...editingTemplate.tables];
                                const updatedRows = tbl.rows.filter((_, idx) => idx !== rIdx);
                                updatedTables[tIdx] = { ...updatedTables[tIdx], rows: updatedRows };
                                setEditingTemplate({ ...editingTemplate, tables: updatedTables });
                              }}
                              className="p-1 text-rose-600 hover:bg-rose-100 rounded transition cursor-pointer mt-2"
                              title="Xóa dòng này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: KẾT LUẬN & PHÁN QUYẾT */}
              {editorActiveTab === 'conclusions' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-500 font-medium">Các mục phán quyết & kết luận cuối phiếu:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = editingTemplate.conclusions || [];
                        setEditingTemplate({
                          ...editingTemplate,
                          conclusions: [...cur, { label: 'Mục phán quyết mới', content: '□ ĐẠT\n□ KHÔNG ĐẠT' }]
                        });
                      }}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm mục</span>
                    </button>
                  </div>

                  {(editingTemplate.conclusions || []).map((c, cIdx) => (
                    <div key={cIdx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-slate-700">Tên mục kết luận {cIdx + 1}:</label>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (editingTemplate.conclusions || []).filter((_, idx) => idx !== cIdx);
                            setEditingTemplate({ ...editingTemplate, conclusions: updated });
                          }}
                          className="p-1 text-rose-600 hover:bg-rose-100 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={c.label}
                        onChange={(e) => {
                          const updated = [...(editingTemplate.conclusions || [])];
                          updated[cIdx] = { ...updated[cIdx], label: e.target.value };
                          setEditingTemplate({ ...editingTemplate, conclusions: updated });
                        }}
                        className="w-full border border-slate-300 bg-white rounded p-1.5 font-bold text-slate-900 text-xs"
                      />
                      <label className="font-bold text-slate-700 block">Nội dung / Các ô chọn (xuống dòng cho từng ô):</label>
                      <textarea
                        rows={3}
                        value={c.content || ''}
                        onChange={(e) => {
                          const updated = [...(editingTemplate.conclusions || [])];
                          updated[cIdx] = { ...updated[cIdx], content: e.target.value };
                          setEditingTemplate({ ...editingTemplate, conclusions: updated });
                        }}
                        className="w-full border border-slate-300 bg-white rounded p-1.5 text-xs text-slate-800 font-mono"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 px-5 py-3 border-t border-slate-300 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => handleResetToFactoryTemplate(editingTemplate.id)}
                className="text-rose-700 hover:text-rose-900 font-bold flex items-center gap-1 cursor-pointer"
                title="Khôi phục mẫu về chuẩn gốc DKBike ban đầu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục mẫu gốc DKBike</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCustomTemplate(editingTemplate)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu cấu trúc mẫu mới</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL XEM CHI TIẾT & XEM TRỰC TIẾP TÀI LIỆU P-QLCL (TAB 2)
          ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className={`bg-white border border-slate-300 rounded-xl w-full flex flex-col shadow-xl overflow-hidden transition-all ${docPreviewMode === 'file' ? 'max-w-5xl h-[92vh]' : 'max-w-2xl max-h-[90vh]'}`}>
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-300 flex flex-wrap justify-between items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white shrink-0">
                  {previewDoc.code || 'DOCX'}
                </span>
                <h3 className="font-black text-sm text-slate-900 truncate max-w-md">
                  {previewDoc.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Chuyển đổi nhanh giữa Xem tóm tắt & Xem trực tiếp file */}
                <div className="flex items-center bg-slate-200 p-0.5 rounded-lg border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setDocPreviewMode('summary')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${docPreviewMode === 'summary'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Xem tóm tắt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocPreviewMode('file')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${docPreviewMode === 'file'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem trực tiếp file</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingDoc(JSON.parse(JSON.stringify(previewDoc)))}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Chỉnh sửa tiêu đề & nội dung tóm tắt tài liệu này ngay tại web"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa</span>
                </button>
                <a
                  href={encodeURI(`/docs/P_QLCL/${previewDoc.relPath}`)}
                  download={previewDoc.fileName}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file gốc</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-200 rounded transition font-bold cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {docPreviewMode === 'summary' ? (
              <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
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
                    <span className="text-slate-500 block">Dung lượng &amp; Cập nhật:</span>
                    <span className="font-mono font-bold text-slate-800">{previewDoc.fileSizeKB} KB • {previewDoc.updatedDate}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1">
                    1. Tóm tắt nội dung tài liệu
                  </h4>
                  <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                    {previewDoc.summary}
                  </p>
                </div>

                {previewDoc.scope && (
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1">
                      2. Phạm vi áp dụng
                    </h4>
                    <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
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
            ) : (
              <div className="flex-1 overflow-auto bg-slate-200/80 relative">
                {docFileLoading && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-2">
                    <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                    <span className="text-xs font-bold">Đang đọc &amp; hiển thị nội dung file {previewDoc.fileName}...</span>
                  </div>
                )}
                {docFileError && (
                  <div className="m-6 bg-rose-50 border border-rose-200 rounded-xl p-5 text-center space-y-3">
                    <p className="text-xs font-bold text-rose-800">{docFileError}</p>
                    <a
                      href={encodeURI(`/docs/P_QLCL/${previewDoc.relPath}`)}
                      download={previewDoc.fileName}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải file Word về máy</span>
                    </a>
                  </div>
                )}
                <div
                  ref={docxContainerRef}
                  className="min-w-0 [&_.dkqms-docx-preview-wrapper]:!bg-transparent [&_.dkqms-docx-preview-wrapper]:!p-4 [&_.dkqms-docx-preview-wrapper>section.dkqms-docx-preview]:!shadow-lg [&_.dkqms-docx-preview-wrapper>section.dkqms-docx-preview]:!mx-auto"
                />
              </div>
            )}

            <div className="bg-slate-100 px-4 py-2.5 border-t border-slate-300 flex justify-between items-center text-xs shrink-0">
              <span className="text-slate-500 text-[11px] font-medium truncate pr-3">
                {docPreviewMode === 'file'
                  ? `Đang xem trực tiếp tệp gốc: ${previewDoc.fileName} (${previewDoc.fileSizeKB} KB)`
                  : 'Tài liệu lưu trữ chính thức • Thư mục P_QLCL DKBike'}
              </span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition cursor-pointer shrink-0"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL CHỈNH SỬA TIÊU ĐỀ & NỘI DUNG HỒ SƠ QUY TRÌNH (TAB 2)
          ========================================================================= */}
      {editingDoc && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-3 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-300" />
                <h3 className="font-black text-sm">
                  Chỉnh Sửa Hồ Sơ / Quy Trình: <span className="text-amber-300 font-mono">{editingDoc.code || 'DOCX'}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mã Tài Liệu / Quy Trình:</label>
                  <input
                    type="text"
                    value={editingDoc.code || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, code: e.target.value })}
                    placeholder="VD: QT-QLCL-01"
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-indigo-700 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Chuyên mục:</label>
                  <select
                    value={editingDoc.category}
                    onChange={(e) => {
                      const catVal = e.target.value as QmsDocumentItem['category'];
                      const matched = DOC_CATEGORIES.find(c => c.value === catVal);
                      setEditingDoc({
                        ...editingDoc,
                        category: catVal,
                        categoryName: matched ? matched.label : editingDoc.categoryName
                      });
                    }}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-600"
                  >
                    {DOC_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tiêu đề Hồ sơ / Quy trình:</label>
                <input
                  type="text"
                  value={editingDoc.title}
                  onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bộ phận áp dụng:</label>
                  <input
                    type="text"
                    value={editingDoc.department}
                    onChange={(e) => setEditingDoc({ ...editingDoc, department: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ngày ban hành / cập nhật:</label>
                  <input
                    type="text"
                    value={editingDoc.updatedDate}
                    onChange={(e) => setEditingDoc({ ...editingDoc, updatedDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">1. Tóm tắt nội dung tài liệu:</label>
                <textarea
                  rows={3}
                  value={editingDoc.summary}
                  onChange={(e) => setEditingDoc({ ...editingDoc, summary: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">2. Phạm vi áp dụng:</label>
                <textarea
                  rows={2}
                  value={editingDoc.scope || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, scope: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-700">3. Các đề mục &amp; nội dung cốt lõi ({editingDoc.keyContents.length}):</label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDoc({
                        ...editingDoc,
                        keyContents: [...editingDoc.keyContents, '']
                      });
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm đề mục</span>
                  </button>
                </div>

                {editingDoc.keyContents.map((kc, kIdx) => (
                  <div key={kIdx} className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="font-mono font-bold text-slate-500 mt-1.5 w-6 text-center">{kIdx + 1}.</span>
                    <textarea
                      rows={2}
                      value={kc}
                      onChange={(e) => {
                        const updated = [...editingDoc.keyContents];
                        updated[kIdx] = e.target.value;
                        setEditingDoc({ ...editingDoc, keyContents: updated });
                      }}
                      className="flex-1 border border-slate-300 bg-white rounded p-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = editingDoc.keyContents.filter((_, idx) => idx !== kIdx);
                        setEditingDoc({ ...editingDoc, keyContents: updated });
                      }}
                      className="p-1.5 text-rose-600 hover:bg-rose-100 rounded transition cursor-pointer mt-1"
                      title="Xóa đề mục này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-100 px-5 py-3 border-t border-slate-300 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => handleResetDocToDefault(editingDoc.id)}
                className="text-rose-700 hover:text-rose-900 font-bold flex items-center gap-1 cursor-pointer"
                title="Khôi phục tiêu đề & nội dung gốc ban đầu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục bản gốc</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCustomDoc(editingDoc)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
