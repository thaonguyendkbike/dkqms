import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bike,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Gauge,
  Link2,
  ListChecks,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Wrench,
  X
} from 'lucide-react';
import { compressImageFile } from '../imageCompressor';
import {
  PtspDocLinkItem,
  PtspIssueItem,
  PtspModelWorkspaceRecord,
  PtspNewPartItem,
  PtspRoadTestItem,
  PtspSampleCheckItem,
  PtspSopGateItem
} from '../types';

interface PtspWorkspaceProps {
  modelsList: PtspModelWorkspaceRecord[];
  onSaveModelsList: (nextList: PtspModelWorkspaceRecord[]) => void;
  canEdit: boolean;
}

const createDefaultSampleChecks = (): PtspSampleCheckItem[] => [
  { id: 'sc-1', group: 'I. Ngoại quan', item: 'Dàn nhựa', checkPoint: 'Khe hở lắp ráp', standard: 'Các khớp nối giữa ốp đầu, yếm, thân xe < 1mm, đều nhau 2 bên', status: 'Chưa KT', note: '' },
  { id: 'sc-2', group: 'I. Ngoại quan', item: 'Dàn nhựa', checkPoint: 'Chất lượng & độ chắc chắn', standard: 'Nhựa dày > 3mm, cứng cáp, không ọp ẹp, không có điểm sắc cạnh', status: 'Chưa KT', note: '' },
  { id: 'sc-3', group: 'I. Ngoại quan', item: 'Sơn & Tem', checkPoint: 'Độ phủ sơn & tem xe', standard: 'Bề mặt sơn bóng đều, không chảy, tem dán phẳng không bong mép', status: 'Chưa KT', note: '' },
  { id: 'sc-4', group: 'I. Ngoại quan', item: 'Khung & Mối hàn', checkPoint: 'Mối hàn, sơn khung', standard: 'Mối hàn ngấu đều, không rỗ, không rỉ sét, đạt độ bám sơn', status: 'Chưa KT', note: '' },
  { id: 'sc-5', group: 'I. Ngoại quan', item: 'Yên xe', checkPoint: 'Độ êm & khe hở khóa yên', standard: 'Đóng mở êm, không cấn, không nhăn da yên', status: 'Chưa KT', note: '' },
  { id: 'sc-6', group: 'II. Hệ thống điện', item: 'Đèn, còi, xi nhan', checkPoint: 'Hoạt động & độ sáng', standard: 'Sáng đúng quy chuẩn, âm lượng còi 90–115dB, đèn báo đồng hồ rõ', status: 'Chưa KT', note: '' },
  { id: 'sc-7', group: 'II. Hệ thống điện', item: 'Dây điện & giắc nối', checkPoint: 'Bố trí & chống nước', standard: 'Giắc cắm có chốt khóa, đi dây gọn không cọ sát khung/cổ lái', status: 'Chưa KT', note: '' },
  { id: 'sc-8', group: 'II. Hệ thống điện', item: 'Ắc quy / Pin & Sạc', checkPoint: 'Lắp đặt & ngắt sạc', standard: 'Cố định chắc chắn, sạc tự ngắt khi đầy, ngắt động cơ khi cắm sạc', status: 'Chưa KT', note: '' },
  { id: 'sc-9', group: 'III. Hệ thống lái', item: 'Cổ phốt & Tay lái', checkPoint: 'Độ rơ & cân bằng', standard: 'Quay nhẹ mượt, không sượng, không rơ lắc, góc đánh lái đều 2 bên', status: 'Chưa KT', note: '' },
  { id: 'sc-10', group: 'III. Hệ thống lái', item: 'Phanh trước / sau', checkPoint: 'Hiệu quả phanh & ngắt điện', standard: 'Bóp phanh ăn đều, ngắt động cơ tức thì khi bóp phanh', status: 'Chưa KT', note: '' },
  { id: 'sc-11', group: 'III. Hệ thống lái', item: 'Giảm xóc trước / sau', checkPoint: 'Hành trình & độ êm', standard: 'Nhún êm, không kêu cạch, không rò dầu phớt', status: 'Chưa KT', note: '' },
  { id: 'sc-12', group: 'IV. Thông số chạy', item: 'Tốc độ tối đa', checkPoint: 'Thử tải thực tế', standard: 'Đạt tốc độ thiết kế theo từng dòng xe (Eco/Normal/Sport)', status: 'Chưa KT', note: '' },
  { id: 'sc-13', group: 'IV. Thông số chạy', item: 'Độ ồn khi vận hành', checkPoint: 'Chạy đường bằng & gồ ghề', standard: 'Không có tiếng ồn dàn nhựa, chân chống, dây điện va khung (< 60dB)', status: 'Chưa KT', note: '' },
  { id: 'sc-14', group: 'IV. Thông số chạy', item: 'Gầm xe & leo dốc', checkPoint: 'Khoảng sáng gầm & lực kéo', standard: 'Lên xuống vỉa hè 10cm không chạm gầm, leo dốc ổn định', status: 'Chưa KT', note: '' }
];

const createDefaultRoadTests = (): PtspRoadTestItem[] => [
  { id: 'rt-1', category: 'C. Thiết bị đăng kiểm', item: 'Tốc độ tối đa', standard: 'Theo thông số thiết kế từng dòng xe (25 / 35 / 42 / 50+ km/h)', measuredValue: '', result: 'Chưa đo', note: '' },
  { id: 'rt-2', category: 'C. Thiết bị đăng kiểm', item: 'Hiệu quả phanh trước / sau', standard: 'Đạt lực phanh tiêu chuẩn đăng kiểm, không lệch hướng', measuredValue: '', result: 'Chưa đo', note: '' },
  { id: 'rt-3', category: 'C. Thiết bị đăng kiểm', item: 'Cường độ sáng đèn pha', standard: 'Đạt chuẩn chiếu sáng, đường cắt rõ không chói lóa', measuredValue: '', result: 'Chưa đo', note: '' },
  { id: 'rt-4', category: 'C. Thiết bị đăng kiểm', item: 'Âm lượng còi xe', standard: '90 – 115 dB(A)', measuredValue: '', result: 'Chưa đo', note: '' },
  { id: 'rt-5', category: 'D. Đường chạy thử', item: 'Độ ồn khi chạy thử', standard: '< 60 dB, không có tiếng ồn nhựa, chân chống, dây điện va đập', measuredValue: '', result: 'Chưa đo', note: '' },
  { id: 'rt-6', category: 'D. Đường chạy thử', item: 'Gầm xe & vượt bậc 10cm', standard: 'Lên xuống dốc & bậc vỉa hè 10cm không chạm gầm', measuredValue: '', result: 'Chưa đo', note: '' },
  { id: 'rt-7', category: 'D. Đường chạy thử', item: 'Khả năng leo dốc & tăng tốc', standard: 'Lên ga mượt, không giật cục, leo dốc ổn định', measuredValue: '', result: 'Chưa đo', note: '' },
  { id: 'rt-8', category: 'D. Đường chạy thử', item: 'Hệ thống treo / Giảm xóc', standard: 'Hành trình giảm xóc trước/sau > 5 và < 10 cm, nhún êm', measuredValue: '', result: 'Chưa đo', note: '' }
];

const createDefaultSopGates = (): PtspSopGateItem[] => [
  { id: 'sop-1', title: '1. Chốt cấu hình kỹ thuật & lưu xe mẫu chuẩn tại QLCL', done: false },
  { id: 'sop-2', title: '2. Ban hành Tiêu chuẩn kiểm tra linh kiện đầu vào (IQC) cho các mã mới', done: false },
  { id: 'sop-3', title: '3. Đóng 100% các lỗi nghiêm trọng (Mức A) phát hiện trên xe mẫu', done: false },
  { id: 'sop-4', title: '4. Hoàn tất chạy thử Pilot Run trên chuyền đạt tỷ lệ KCS mục tiêu', done: false },
  { id: 'sop-5', title: '5. Cập nhật Hướng dẫn kiểm tra PQC & OQC cho model mới', done: false },
  { id: 'sop-6', title: '6. Đào tạo tổ QC & Tổ trưởng lắp ráp các điểm lưu ý kỹ thuật', done: false },
  { id: 'sop-7', title: '7. Hoàn tất hồ sơ đăng kiểm / công bố chất lượng đưa vào SOP', done: false }
];

export const DEFAULT_PTSP_MODELS: PtspModelWorkspaceRecord[] = [
  {
    id: 'ptsp-roma-sx-2027',
    code: 'DK-ROMA-SX-27',
    modelName: 'DK Roma SX (Nâng cấp 2027)',
    projectType: 'Nâng cấp / Cải tiến',
    manager: 'Nguyễn Xuân Thao',
    targetSopDate: '2026-12-15',
    status: 'Đang đánh giá mẫu',
    notes: 'Nâng cấp đèn pha 4 bi cầu, càng sau 2 mảnh và giảm xóc sau êm hơn.',
    sampleChecks: createDefaultSampleChecks(),
    issues: [
      {
        id: 'iss-1',
        partOrArea: 'Ốp đầu nhựa & đồng hồ',
        description: 'Khe hở mép phải cụm đèn pha hơi rộng (~1.8mm) khi siết đủ lực.',
        severity: 'B',
        ownerDept: 'NCC',
        dueDate: '2026-11-25',
        status: 'Đang xử lý',
        createdAt: '2026-11-16'
      }
    ],
    newParts: [
      {
        id: 'np-1',
        partName: 'Đèn pha 4 bi cầu',
        partCode: 'LK-DP-ROMA27',
        supplierName: 'NCC Đèn Chiếu Sáng',
        changeNote: 'Nâng cấp cường độ sáng, thay đổi giắc cắm chống nước',
        iqcSampleStatus: 'Đang đánh giá'
      }
    ],
    roadTests: createDefaultRoadTests(),
    docLinks: [],
    sopGates: createDefaultSopGates(),
    updatedAt: '2026-11-16'
  }
];

export default function PtspWorkspace({ modelsList, onSaveModelsList, canEdit }: PtspWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string>(() => modelsList[0]?.id || '');
  const [subTab, setSubTab] = useState<'sample_issues' | 'specs_docs' | 'sop'>('sample_issues');

  // Modals
  const [showModelModal, setShowModelModal] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [modelForm, setModelForm] = useState({
    modelName: '',
    code: '',
    projectType: 'Model mới' as 'Model mới' | 'Nâng cấp / Cải tiến',
    manager: 'Nguyễn Xuân Thao',
    targetSopDate: '',
    status: 'Đang đánh giá mẫu' as PtspModelWorkspaceRecord['status'],
    notes: '',
    image: ''
  });

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [issueForm, setIssueForm] = useState<Omit<PtspIssueItem, 'id' | 'createdAt'>>({
    partOrArea: '',
    description: '',
    severity: 'B',
    ownerDept: 'NCC',
    dueDate: '',
    status: 'Mở',
    image: undefined
  });

  const [showPartModal, setShowPartModal] = useState(false);
  const [partForm, setPartForm] = useState<Omit<PtspNewPartItem, 'id'>>({
    partName: '',
    partCode: '',
    supplierName: '',
    changeNote: '',
    iqcSampleStatus: 'Chưa có mẫu'
  });

  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState<Omit<PtspDocLinkItem, 'id'>>({
    title: '',
    docType: 'Thông số KT',
    url: ''
  });

  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const modelImgRef = useRef<HTMLInputElement | null>(null);
  const issueImgRef = useRef<HTMLInputElement | null>(null);

  const selectedModel = useMemo(
    () => modelsList.find((m) => m.id === selectedId) || modelsList[0] || null,
    [modelsList, selectedId]
  );

  const updateSelectedModel = (updater: (cur: PtspModelWorkspaceRecord) => PtspModelWorkspaceRecord) => {
    if (!selectedModel) return;
    if (!canEdit) {
      alert('Tài khoản của bạn ở chế độ Chỉ xem.');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const next = modelsList.map((m) =>
      m.id === selectedModel.id ? { ...updater(m), updatedAt: today } : m
    );
    onSaveModelsList(next);
  };

  // --- Model CRUD ---
  const openCreateModel = () => {
    setEditingModelId(null);
    setModelForm({
      modelName: '',
      code: '',
      projectType: 'Model mới',
      manager: 'Nguyễn Xuân Thao',
      targetSopDate: '',
      status: 'Đang đánh giá mẫu',
      notes: '',
      image: ''
    });
    setShowModelModal(true);
  };

  const openEditModel = (m: PtspModelWorkspaceRecord) => {
    setEditingModelId(m.id);
    setModelForm({
      modelName: m.modelName,
      code: m.code,
      projectType: m.projectType,
      manager: m.manager,
      targetSopDate: m.targetSopDate,
      status: m.status,
      notes: m.notes || '',
      image: m.image || ''
    });
    setShowModelModal(true);
  };

  const handleModelImgPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const b64 = await compressImageFile(file, 500, 500, 0.4);
      setModelForm((p) => ({ ...p, image: b64 }));
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  };

  const handleSaveModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!modelForm.modelName.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const cleanCode = modelForm.code.trim() || modelForm.modelName.trim().toUpperCase().replace(/\s+/g, '-');

    if (editingModelId) {
      const next = modelsList.map((m) =>
        m.id === editingModelId
          ? {
              ...m,
              modelName: modelForm.modelName.trim(),
              code: cleanCode,
              projectType: modelForm.projectType,
              manager: modelForm.manager.trim() || 'QLCL',
              targetSopDate: modelForm.targetSopDate,
              status: modelForm.status,
              notes: modelForm.notes.trim(),
              image: modelForm.image || undefined,
              updatedAt: today
            }
          : m
      );
      onSaveModelsList(next);
    } else {
      const newRec: PtspModelWorkspaceRecord = {
        id: `ptsp-${Date.now()}`,
        code: cleanCode,
        modelName: modelForm.modelName.trim(),
        projectType: modelForm.projectType,
        manager: modelForm.manager.trim() || 'QLCL',
        targetSopDate: modelForm.targetSopDate,
        status: modelForm.status,
        notes: modelForm.notes.trim(),
        image: modelForm.image || undefined,
        sampleChecks: createDefaultSampleChecks(),
        issues: [],
        newParts: [],
        roadTests: createDefaultRoadTests(),
        docLinks: [],
        sopGates: createDefaultSopGates(),
        updatedAt: today
      };
      onSaveModelsList([newRec, ...modelsList]);
      setSelectedId(newRec.id);
    }
    setShowModelModal(false);
  };

  const handleDeleteModel = (m: PtspModelWorkspaceRecord) => {
    if (!canEdit) return;
    if (!window.confirm(`Xóa hồ sơ PTSP của model "${m.modelName}"?`)) return;
    const next = modelsList.filter((x) => x.id !== m.id);
    onSaveModelsList(next);
    if (selectedId === m.id) setSelectedId(next[0]?.id || '');
  };

  // --- Issue CRUD ---
  const openCreateIssue = () => {
    setEditingIssueId(null);
    setIssueForm({
      partOrArea: '',
      description: '',
      severity: 'B',
      ownerDept: 'NCC',
      dueDate: '',
      status: 'Mở',
      image: undefined
    });
    setShowIssueModal(true);
  };

  const openEditIssue = (iss: PtspIssueItem) => {
    setEditingIssueId(iss.id);
    setIssueForm({
      partOrArea: iss.partOrArea,
      description: iss.description,
      severity: iss.severity,
      ownerDept: iss.ownerDept,
      dueDate: iss.dueDate,
      status: iss.status,
      image: iss.image
    });
    setShowIssueModal(true);
  };

  const handleIssueImgPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const b64 = await compressImageFile(file, 500, 500, 0.4);
      setIssueForm((p) => ({ ...p, image: b64 }));
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  };

  const handleSaveIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel || !canEdit) return;
    if (!issueForm.partOrArea.trim() || !issueForm.description.trim()) return;
    const today = new Date().toISOString().slice(0, 10);

    updateSelectedModel((cur) => {
      if (editingIssueId) {
        return {
          ...cur,
          issues: cur.issues.map((i) => (i.id === editingIssueId ? { ...i, ...issueForm } : i))
        };
      }
      const newIssue: PtspIssueItem = {
        id: `iss-${Date.now()}`,
        ...issueForm,
        createdAt: today
      };
      return { ...cur, issues: [newIssue, ...cur.issues] };
    });
    setShowIssueModal(false);
  };

  const handleSavePart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel || !canEdit || !partForm.partName.trim()) return;
    const newPart: PtspNewPartItem = { id: `np-${Date.now()}`, ...partForm, partName: partForm.partName.trim() };
    updateSelectedModel((cur) => ({ ...cur, newParts: [newPart, ...(cur.newParts || [])] }));
    setPartForm({ partName: '', partCode: '', supplierName: '', changeNote: '', iqcSampleStatus: 'Chưa có mẫu' });
    setShowPartModal(false);
  };

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel || !canEdit || !docForm.title.trim() || !docForm.url.trim()) return;
    const newDoc: PtspDocLinkItem = { id: `doc-${Date.now()}`, ...docForm, title: docForm.title.trim(), url: docForm.url.trim() };
    updateSelectedModel((cur) => ({ ...cur, docLinks: [newDoc, ...(cur.docLinks || [])] }));
    setDocForm({ title: '', docType: 'Thông số KT', url: '' });
    setShowDocModal(false);
  };

  const handlePrintSampleSheet = () => {
    if (!selectedModel) return;
    const esc = (v: string) =>
      v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) return;
    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Phiếu đánh giá xe mẫu - ${esc(selectedModel.modelName)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: "Times New Roman", Arial, sans-serif; color: #0f172a; font-size: 11px; margin: 0; }
    .hdr { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 5px; margin-bottom: 8px; }
    h1 { text-align: center; font-size: 15px; text-transform: uppercase; margin: 6px 0; }
    .meta { display: flex; gap: 20px; margin-bottom: 8px; flex-wrap: wrap; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th, td { border: 1px solid #334155; padding: 4px 6px; vertical-align: top; }
    th { background: #f1f5f9; }
    .center { text-align: center; }
  </style>
</head>
<body>
  <div class="hdr">
    <div><strong>CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT — DKBike</strong><br/>Phòng Quản lý chất lượng (QLCL / DK QMS) • Xe cho cả gia đình</div>
    <div style="text-align:right;">Hồ sơ PTSP Model: <strong>${esc(selectedModel.code)}</strong></div>
  </div>
  <h1>Phiếu Đánh Giá Xe Mẫu & Vấn Đề Tồn Đọng</h1>
  <div class="meta">
    <span><strong>Model:</strong> ${esc(selectedModel.modelName)}</span>
    <span><strong>Loại:</strong> ${esc(selectedModel.projectType)}</span>
    <span><strong>Phụ trách:</strong> ${esc(selectedModel.manager)}</span>
    <span><strong>Mục tiêu SOP:</strong> ${esc(selectedModel.targetSopDate || 'Chưa chốt')}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:32px;">STT</th>
        <th style="width:115px;">Nhóm</th>
        <th style="width:110px;">Hạng mục</th>
        <th style="width:120px;">Điểm kiểm tra</th>
        <th>Tiêu chuẩn chấp nhận</th>
        <th style="width:75px;">Kết quả</th>
        <th style="width:140px;">Ghi chú / Giá trị đo</th>
      </tr>
    </thead>
    <tbody>
      ${selectedModel.sampleChecks
        .map(
          (c, i) => `<tr>
          <td class="center">${i + 1}</td>
          <td>${esc(c.group)}</td>
          <td><strong>${esc(c.item)}</strong></td>
          <td>${esc(c.checkPoint)}</td>
          <td>${esc(c.standard)}</td>
          <td class="center"><strong>${esc(c.status)}</strong></td>
          <td>${esc(c.note || '')}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body>
</html>`);
    win.document.close();
  };

  // Thống kê cho model đang chọn
  const openIssuesCount = selectedModel ? selectedModel.issues.filter((i) => i.status !== 'Đã chốt').length : 0;
  const samplePassCount = selectedModel ? selectedModel.sampleChecks.filter((c) => c.status === 'Đạt').length : 0;
  const sopDoneCount = selectedModel ? selectedModel.sopGates.filter((g) => g.done).length : 0;
  const sopPct = selectedModel && selectedModel.sopGates.length > 0
    ? Math.round((sopDoneCount / selectedModel.sopGates.length) * 100)
    : 0;

  return (
    <div className="space-y-5" id="view_ptsp_content">
      {/* Header thương hiệu & nút tạo Model mới */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-[#0213b0] uppercase tracking-tight flex items-center gap-2">
            <Bike className="w-5 h-5 text-indigo-600" />
            <span>Phát Triển Sản Phẩm Mới & Nâng Cấp Model (PTSP — QLCL)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Công ty TNHH Xe điện DK Việt Nhật (DKBike) • Đánh giá xe mẫu theo chuẩn, theo dõi Pilot Run &amp; Chốt điều kiện SOP.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openCreateModel}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Model PTSP</span>
          </button>
        )}
      </div>

      {/* Bộ chọn danh sách Model PTSP */}
      <div className="flex flex-wrap items-center gap-2">
        {modelsList.map((m) => {
          const isActive = selectedModel?.id === m.id;
          const mOpenErr = m.issues.filter((i) => i.status !== 'Đã chốt').length;
          const mSopDone = m.sopGates.filter((g) => g.done).length;
          const mSopPct = m.sopGates.length > 0 ? Math.round((mSopDone / m.sopGates.length) * 100) : 0;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedId(m.id)}
              className={`px-3.5 py-2 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
              }`}
            >
              <div>
                <div className="text-xs font-extrabold">{m.modelName}</div>
                <div className={`text-[10px] font-mono ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                  SOP {mSopPct}% • {mOpenErr > 0 ? `${mOpenErr} lỗi mở` : '0 lỗi mở'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {!selectedModel ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs text-slate-500">
          Chưa có model phát triển sản phẩm nào. Bấm <strong>Thêm Model PTSP</strong> để bắt đầu.
        </div>
      ) : (
        <>
          {/* Thẻ tóm tắt Model đang chọn */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                onClick={() => selectedModel.image && setZoomImage(selectedModel.image)}
                className="w-24 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
              >
                {selectedModel.image ? (
                  <img src={selectedModel.image} alt={selectedModel.modelName} className="w-full h-full object-contain p-1" />
                ) : (
                  <Bike className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {selectedModel.code}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {selectedModel.projectType}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    {selectedModel.status}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900">{selectedModel.modelName}</h3>
                <p className="text-xs text-slate-600">
                  Phụ trách: <strong>{selectedModel.manager}</strong>
                  {selectedModel.targetSopDate && <> • Mục tiêu SOP: <strong className="font-mono">{selectedModel.targetSopDate}</strong></>}
                  {selectedModel.notes && <> • {selectedModel.notes}</>}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500 font-bold">Đánh giá mẫu</div>
                <div className="text-xs font-black text-indigo-700 font-mono">
                  {samplePassCount}/{selectedModel.sampleChecks.length} Đạt
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500 font-bold">Lỗi còn mở</div>
                <div className={`text-xs font-black font-mono ${openIssuesCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {openIssuesCount} vấn đề
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500 font-bold">Sẵn sàng SOP</div>
                <div className="text-xs font-black text-emerald-700 font-mono">{sopPct}%</div>
              </div>
              {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={() => openEditModel(selectedModel)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Chỉnh sửa thông tin Model"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteModel(selectedModel)}
                    className="p-2 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                    title="Xóa Model"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Thanh 3 Tab con */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setSubTab('sample_issues')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                subTab === 'sample_issues' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>1. Đánh giá mẫu &amp; Lỗi tồn đọng ({selectedModel.issues.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('specs_docs')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                subTab === 'specs_docs' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>2. Linh kiện mới, Đo kiểm &amp; Hồ sơ</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('sop')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                subTab === 'sop' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              <span>3. Checklist SOP ({sopDoneCount}/{selectedModel.sopGates.length})</span>
            </button>
          </div>

          {/* ==================== TAB 1: ĐÁNH GIÁ MẪU & LỖI TỒN ĐỌNG ==================== */}
          {subTab === 'sample_issues' && (
            <div className="space-y-5">
              {/* A. Bảng Vấn đề tồn đọng trên mẫu */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Vấn đề / Lỗi phát hiện trên xe mẫu</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Theo dõi ảnh thực tế, mức độ lỗi và bộ phận xử lý trước khi chốt mẫu chuẩn.
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={openCreateIssue}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ghi nhận lỗi mẫu</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900 text-white text-[11px]">
                      <tr>
                        <th className="p-2.5 w-10 text-center">STT</th>
                        <th className="p-2.5 w-36">Vị trí / Linh kiện</th>
                        <th className="p-2.5">Mô tả vấn đề</th>
                        <th className="p-2.5 w-16 text-center">Ảnh</th>
                        <th className="p-2.5 w-16 text-center">Mức</th>
                        <th className="p-2.5 w-24 text-center">Xử lý</th>
                        <th className="p-2.5 w-24 text-center">Hạn xử lý</th>
                        <th className="p-2.5 w-28 text-center">Trạng thái</th>
                        {canEdit && <th className="p-2.5 w-20 text-center">Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedModel.issues.length === 0 ? (
                        <tr>
                          <td colSpan={canEdit ? 9 : 8} className="p-6 text-center text-slate-400 italic">
                            Chưa ghi nhận vấn đề lỗi nào trên xe mẫu này.
                          </td>
                        </tr>
                      ) : (
                        selectedModel.issues.map((iss, idx) => (
                          <tr key={iss.id} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-900">{iss.partOrArea}</td>
                            <td className="p-2.5 text-slate-700 whitespace-pre-line">{iss.description}</td>
                            <td className="p-2.5 text-center">
                              {iss.image ? (
                                <img
                                  src={iss.image}
                                  alt=""
                                  onClick={() => setZoomImage(iss.image!)}
                                  className="w-10 h-10 object-cover rounded border border-slate-200 mx-auto cursor-pointer"
                                />
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded font-black text-[10px] ${
                                  iss.severity === 'A'
                                    ? 'bg-rose-100 text-rose-800'
                                    : iss.severity === 'B'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {iss.severity}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-bold text-slate-700">{iss.ownerDept}</td>
                            <td className="p-2.5 text-center font-mono text-slate-600">{iss.dueDate || '—'}</td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  iss.status === 'Đã chốt'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : iss.status === 'Đang xử lý'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {iss.status}
                              </span>
                            </td>
                            {canEdit && (
                              <td className="p-2.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditIssue(iss)}
                                    className="p-1 rounded hover:bg-indigo-50 text-indigo-600 cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!window.confirm('Xóa vấn đề này?')) return;
                                      updateSelectedModel((cur) => ({
                                        ...cur,
                                        issues: cur.issues.filter((x) => x.id !== iss.id)
                                      }));
                                    }}
                                    className="p-1 rounded hover:bg-rose-50 text-rose-500 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* B. Checklist Đánh giá xe mẫu (I-IV theo chuẩn /bm) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase">
                      Phiếu Chấm Đánh Giá Xe Mẫu (Theo Tiêu Chuẩn I–IV)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Chấm trực tiếp từng hạng mục ngoại quan, điện, lái và thông số vận hành.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handlePrintSampleSheet}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>In Phiếu Đánh Giá A4</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 text-[11px]">
                      <tr>
                        <th className="p-2.5 w-10 text-center">STT</th>
                        <th className="p-2.5 w-36">Nhóm</th>
                        <th className="p-2.5 w-36">Hạng mục / Điểm KT</th>
                        <th className="p-2.5">Tiêu chuẩn chấp nhận</th>
                        <th className="p-2.5 w-36 text-center">Kết quả</th>
                        <th className="p-2.5 w-48">Ghi chú / Giá trị đo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedModel.sampleChecks.map((chk, idx) => (
                        <tr key={chk.id} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                          <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-indigo-900">{chk.group}</td>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{chk.item}</div>
                            <div className="text-[11px] text-slate-500">{chk.checkPoint}</div>
                          </td>
                          <td className="p-2.5 text-slate-700">{chk.standard}</td>
                          <td className="p-2 text-center">
                            <select
                              disabled={!canEdit}
                              value={chk.status}
                              onChange={(e) => {
                                const val = e.target.value as PtspSampleCheckItem['status'];
                                updateSelectedModel((cur) => ({
                                  ...cur,
                                  sampleChecks: cur.sampleChecks.map((x) =>
                                    x.id === chk.id ? { ...x, status: val } : x
                                  )
                                }));
                              }}
                              className={`px-2 py-1 rounded-lg border font-bold text-xs ${
                                chk.status === 'Đạt'
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : chk.status === 'Không đạt'
                                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                                  : 'bg-white border-slate-300 text-slate-700'
                              }`}
                            >
                              <option value="Chưa KT">Chưa KT</option>
                              <option value="Đạt">Đạt</option>
                              <option value="Không đạt">Không đạt</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              disabled={!canEdit}
                              value={chk.note || ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                updateSelectedModel((cur) => ({
                                  ...cur,
                                  sampleChecks: cur.sampleChecks.map((x) =>
                                    x.id === chk.id ? { ...x, note: v } : x
                                  )
                                }));
                              }}
                              placeholder="Nhập ghi chú..."
                              className="w-full px-2 py-1 rounded border border-slate-200 focus:border-indigo-500 text-xs"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: LINH KIỆN MỚI, ĐO KIỂM (C-D) & HỒ SƠ KỸ THUẬT ==================== */}
          {subTab === 'specs_docs' && (() => {
            const partsList = selectedModel.newParts || [];
            const roadList = selectedModel.roadTests && selectedModel.roadTests.length > 0
              ? selectedModel.roadTests
              : createDefaultRoadTests();
            const docsList = selectedModel.docLinks || [];

            return (
              <div className="space-y-5">
                {/* A. Linh kiện mới / Thay đổi & Nhà cung cấp */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase flex items-center gap-1.5">
                        <Wrench className="w-4 h-4 text-indigo-600" />
                        <span>A. Danh Sách Linh Kiện Mới / Thay Đổi &amp; Nhà Cung Cấp</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Theo dõi linh kiện mới/cải tiến để kiểm soát mẫu chuẩn IQC đầu vào trước khi sản xuất.
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setShowPartModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm linh kiện mới</span>
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-900 text-white text-[11px]">
                        <tr>
                          <th className="p-2.5 w-10 text-center">STT</th>
                          <th className="p-2.5">Tên linh kiện</th>
                          <th className="p-2.5 w-32">Mã hàng</th>
                          <th className="p-2.5 w-44">Nhà cung cấp</th>
                          <th className="p-2.5">Điểm thay đổi / Lưu ý IQC</th>
                          <th className="p-2.5 w-36 text-center">Mẫu chuẩn IQC</th>
                          {canEdit && <th className="p-2.5 w-14 text-center">Xóa</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {partsList.length === 0 ? (
                          <tr>
                            <td colSpan={canEdit ? 7 : 6} className="p-6 text-center text-slate-400 italic">
                              Chưa có linh kiện mới/thay đổi nào được thêm cho model này.
                            </td>
                          </tr>
                        ) : (
                          partsList.map((pt, idx) => (
                            <tr key={pt.id} className="hover:bg-slate-50">
                              <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-slate-900">{pt.partName}</td>
                              <td className="p-2.5 font-mono text-indigo-700">{pt.partCode || '—'}</td>
                              <td className="p-2.5 font-semibold text-slate-700">{pt.supplierName || '—'}</td>
                              <td className="p-2.5 text-slate-700">{pt.changeNote || '—'}</td>
                              <td className="p-2 text-center">
                                <select
                                  disabled={!canEdit}
                                  value={pt.iqcSampleStatus}
                                  onChange={(e) => {
                                    const val = e.target.value as PtspNewPartItem['iqcSampleStatus'];
                                    updateSelectedModel((cur) => ({
                                      ...cur,
                                      newParts: (cur.newParts || []).map((x) =>
                                        x.id === pt.id ? { ...x, iqcSampleStatus: val } : x
                                      )
                                    }));
                                  }}
                                  className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${
                                    pt.iqcSampleStatus === 'Đã chốt mẫu'
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                      : pt.iqcSampleStatus === 'Đang đánh giá'
                                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                                      : 'bg-white border-slate-300 text-slate-700'
                                  }`}
                                >
                                  <option value="Chưa có mẫu">Chưa có mẫu</option>
                                  <option value="Đang đánh giá">Đang đánh giá</option>
                                  <option value="Đã chốt mẫu">Đã chốt mẫu</option>
                                </select>
                              </td>
                              {canEdit && (
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!window.confirm('Xóa linh kiện này?')) return;
                                      updateSelectedModel((cur) => ({
                                        ...cur,
                                        newParts: (cur.newParts || []).filter((x) => x.id !== pt.id)
                                      }));
                                    }}
                                    className="p-1 rounded hover:bg-rose-50 text-rose-500 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* B. Đo kiểm Đăng kiểm & Chạy thử đường (C–D) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-emerald-600" />
                      <span>B. Kết Quả Đo Kiểm Thiết Bị Đăng Kiểm &amp; Đường Chạy Thử (C–D)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Ghi nhận giá trị đo thực tế của xe mẫu (tốc độ, lực phanh, đèn, độ ồn, gầm xe, leo dốc).
                    </p>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 text-[11px]">
                        <tr>
                          <th className="p-2.5 w-10 text-center">STT</th>
                          <th className="p-2.5 w-40">Hạng mục</th>
                          <th className="p-2.5 w-44">Thông số kiểm tra</th>
                          <th className="p-2.5">Tiêu chuẩn</th>
                          <th className="p-2.5 w-40">Giá trị đo thực tế</th>
                          <th className="p-2.5 w-32 text-center">Đánh giá</th>
                          <th className="p-2.5 w-40">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {roadList.map((rt, idx) => (
                          <tr key={rt.id} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                            <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-indigo-900">{rt.category}</td>
                            <td className="p-2.5 font-bold text-slate-900">{rt.item}</td>
                            <td className="p-2.5 text-slate-600">{rt.standard}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                disabled={!canEdit}
                                value={rt.measuredValue}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateSelectedModel((cur) => {
                                    const base = cur.roadTests && cur.roadTests.length > 0 ? cur.roadTests : createDefaultRoadTests();
                                    return { ...cur, roadTests: base.map((x) => (x.id === rt.id ? { ...x, measuredValue: val } : x)) };
                                  });
                                }}
                                placeholder="VD: 44 km/h, 54 dB..."
                                className="w-full px-2 py-1 rounded border border-slate-200 font-mono text-xs"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <select
                                disabled={!canEdit}
                                value={rt.result}
                                onChange={(e) => {
                                  const val = e.target.value as PtspRoadTestItem['result'];
                                  updateSelectedModel((cur) => {
                                    const base = cur.roadTests && cur.roadTests.length > 0 ? cur.roadTests : createDefaultRoadTests();
                                    return { ...cur, roadTests: base.map((x) => (x.id === rt.id ? { ...x, result: val } : x)) };
                                  });
                                }}
                                className={`px-2 py-1 rounded-lg border font-bold text-xs ${
                                  rt.result === 'Đạt'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                    : rt.result === 'Không đạt'
                                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                                    : 'bg-white border-slate-300 text-slate-700'
                                }`}
                              >
                                <option value="Chưa đo">Chưa đo</option>
                                <option value="Đạt">Đạt</option>
                                <option value="Không đạt">Không đạt</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                disabled={!canEdit}
                                value={rt.note || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateSelectedModel((cur) => {
                                    const base = cur.roadTests && cur.roadTests.length > 0 ? cur.roadTests : createDefaultRoadTests();
                                    return { ...cur, roadTests: base.map((x) => (x.id === rt.id ? { ...x, note: val } : x)) };
                                  });
                                }}
                                placeholder="Ghi chú..."
                                className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* C. Hồ sơ & Link tài liệu kỹ thuật */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-sky-600" />
                        <span>C. Hồ Sơ &amp; Đường Dẫn Tài Liệu Kỹ Thuật</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Lưu tập trung link Google Drive / Sheet thông số kỹ thuật, tiêu chuẩn IQC/OQC, hồ sơ đăng kiểm của model.
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setShowDocModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Thêm link tài liệu</span>
                      </button>
                    )}
                  </div>

                  {docsList.length === 0 ? (
                    <div className="p-5 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                      Chưa có đường dẫn tài liệu nào cho model này.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {docsList.map((docItem) => (
                        <div
                          key={docItem.id}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                              {docItem.docType}
                            </span>
                            <div className="text-xs font-bold text-slate-900 mt-1 truncate">{docItem.title}</div>
                            <div className="text-[11px] font-mono text-slate-500 truncate">{docItem.url}</div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={docItem.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Mở</span>
                            </a>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!window.confirm('Xóa link tài liệu này?')) return;
                                  updateSelectedModel((cur) => ({
                                    ...cur,
                                    docLinks: (cur.docLinks || []).filter((x) => x.id !== docItem.id)
                                  }));
                                }}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ==================== TAB 3: CHECKLIST ĐƯA VÀO HÀNG LOẠT (SOP GATE) ==================== */}
          {subTab === 'sop' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase">
                    Checklist Điều Kiện Phê Duyệt Sản Xuất Hàng Loạt (SOP Gate)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Hoàn thành các hạng mục dưới đây để xác nhận model đủ điều kiện sản xuất đại trà.
                  </p>
                </div>
                <span
                  className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                    sopPct === 100 && openIssuesCount === 0
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {sopPct === 100 && openIssuesCount === 0
                    ? 'ĐỦ ĐIỀU KIỆN SOP (100%)'
                    : `TIẾN ĐỘ SOP: ${sopPct}%`}
                </span>
              </div>

              <div className="space-y-2.5">
                {selectedModel.sopGates.map((gate) => (
                  <div
                    key={gate.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      gate.done ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        disabled={!canEdit}
                        checked={gate.done}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const today = new Date().toISOString().slice(0, 10);
                          updateSelectedModel((cur) => ({
                            ...cur,
                            sopGates: cur.sopGates.map((g) =>
                              g.id === gate.id
                                ? { ...g, done: checked, verifiedDate: checked ? (g.verifiedDate || today) : '' }
                                : g
                            )
                          }));
                        }}
                        className="mt-0.5 w-4 h-4 accent-emerald-600"
                      />
                      <span className={`text-xs font-bold ${gate.done ? 'text-emerald-950' : 'text-slate-800'}`}>
                        {gate.title}
                      </span>
                    </label>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={gate.verifier || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateSelectedModel((cur) => ({
                            ...cur,
                            sopGates: cur.sopGates.map((g) =>
                              g.id === gate.id ? { ...g, verifier: val } : g
                            )
                          }));
                        }}
                        placeholder="Người xác nhận..."
                        className="w-36 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs"
                      />
                      <input
                        type="date"
                        disabled={!canEdit}
                        value={gate.verifiedDate || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateSelectedModel((cur) => ({
                            ...cur,
                            sopGates: cur.sopGates.map((g) =>
                              g.id === gate.id ? { ...g, verifiedDate: val } : g
                            )
                          }));
                        }}
                        className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Thêm / Sửa Model PTSP */}
      {showModelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveModel}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingModelId ? 'Chỉnh sửa Model PTSP' : 'Thêm Model Xe Mới / Nâng Cấp'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModelModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-24 h-18 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                  {modelForm.image ? (
                    <img src={modelForm.image} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <Bike className="w-7 h-7 text-slate-300" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <input ref={modelImgRef} type="file" accept="image/*" onChange={handleModelImgPick} className="hidden" />
                  <button
                    type="button"
                    disabled={compressing}
                    onClick={() => modelImgRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{compressing ? 'Đang nén...' : 'Chọn ảnh model (<30KB)'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên Model xe *</label>
                  <input
                    type="text"
                    required
                    value={modelForm.modelName}
                    onChange={(e) => setModelForm((p) => ({ ...p, modelName: e.target.value }))}
                    placeholder="VD: DK Roma SX 2027"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã hồ sơ</label>
                  <input
                    type="text"
                    value={modelForm.code}
                    onChange={(e) => setModelForm((p) => ({ ...p, code: e.target.value }))}
                    placeholder="VD: DK-ROMA-SX-27"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại dự án</label>
                  <select
                    value={modelForm.projectType}
                    onChange={(e) => setModelForm((p) => ({ ...p, projectType: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Model mới">Model mới</option>
                    <option value="Nâng cấp / Cải tiến">Nâng cấp / Cải tiến</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={modelForm.status}
                    onChange={(e) => setModelForm((p) => ({ ...p, status: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Đang đánh giá mẫu">Đang đánh giá mẫu</option>
                    <option value="Đang chạy thử Pilot">Đang chạy thử Pilot</option>
                    <option value="Sẵn sàng SOP">Sẵn sàng SOP</option>
                    <option value="Đã SOP">Đã SOP</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Người phụ trách</label>
                  <input
                    type="text"
                    value={modelForm.manager}
                    onChange={(e) => setModelForm((p) => ({ ...p, manager: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày mục tiêu SOP</label>
                  <input
                    type="date"
                    value={modelForm.targetSopDate}
                    onChange={(e) => setModelForm((p) => ({ ...p, targetSopDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Điểm thay đổi / Ghi chú kỹ thuật</label>
                <textarea
                  rows={2}
                  value={modelForm.notes}
                  onChange={(e) => setModelForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowModelModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white font-bold text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu Model</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Ghi nhận / Sửa Lỗi Mẫu */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveIssue}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingIssueId ? 'Cập nhật vấn đề mẫu' : 'Ghi nhận lỗi trên xe mẫu'}
              </h3>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Vị trí / Linh kiện *</label>
                <input
                  type="text"
                  required
                  value={issueForm.partOrArea}
                  onChange={(e) => setIssueForm((p) => ({ ...p, partOrArea: e.target.value }))}
                  placeholder="VD: Dàn nhựa đầu, Chân chống cạnh..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả chi tiết lỗi *</label>
                <textarea
                  rows={3}
                  required
                  value={issueForm.description}
                  onChange={(e) => setIssueForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức độ</label>
                  <select
                    value={issueForm.severity}
                    onChange={(e) => setIssueForm((p) => ({ ...p, severity: e.target.value as any }))}
                    className="w-full px-2 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="A">A (Nghiêm trọng)</option>
                    <option value="B">B (Trung bình)</option>
                    <option value="C">C (Nhẹ)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bộ phận xử lý</label>
                  <select
                    value={issueForm.ownerDept}
                    onChange={(e) => setIssueForm((p) => ({ ...p, ownerDept: e.target.value as any }))}
                    className="w-full px-2 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="NCC">NCC</option>
                    <option value="Kỹ thuật">Kỹ thuật</option>
                    <option value="Xưởng">Xưởng</option>
                    <option value="QLCL">QLCL</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hạn xử lý</label>
                  <input
                    type="date"
                    value={issueForm.dueDate}
                    onChange={(e) => setIssueForm((p) => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-2 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={issueForm.status}
                    onChange={(e) => setIssueForm((p) => ({ ...p, status: e.target.value as any }))}
                    className="w-full px-2 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Mở">Mở</option>
                    <option value="Đang xử lý">Đang xử lý</option>
                    <option value="Đã chốt">Đã chốt</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <input ref={issueImgRef} type="file" accept="image/*" onChange={handleIssueImgPick} className="hidden" />
                <button
                  type="button"
                  onClick={() => issueImgRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{issueForm.image ? 'Đổi ảnh lỗi' : 'Đính kèm ảnh (<30KB)'}</span>
                </button>
                {issueForm.image && (
                  <img src={issueForm.image} alt="" className="w-14 h-14 object-cover rounded border border-slate-300" />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white font-bold text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Lưu vấn đề</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Thêm Linh Kiện Mới / Thay Đổi */}
      {showPartModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <form onSubmit={handleSavePart} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-base font-extrabold text-slate-900">Thêm Linh Kiện Mới / Thay Đổi</h3>
              <button type="button" onClick={() => setShowPartModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên linh kiện *</label>
                  <input
                    type="text"
                    required
                    value={partForm.partName}
                    onChange={(e) => setPartForm((p) => ({ ...p, partName: e.target.value }))}
                    placeholder="VD: Đèn pha 4 bi cầu"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã hàng</label>
                  <input
                    type="text"
                    value={partForm.partCode}
                    onChange={(e) => setPartForm((p) => ({ ...p, partCode: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nhà cung cấp</label>
                  <input
                    type="text"
                    value={partForm.supplierName}
                    onChange={(e) => setPartForm((p) => ({ ...p, supplierName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mẫu chuẩn IQC</label>
                  <select
                    value={partForm.iqcSampleStatus}
                    onChange={(e) => setPartForm((p) => ({ ...p, iqcSampleStatus: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Chưa có mẫu">Chưa có mẫu</option>
                    <option value="Đang đánh giá">Đang đánh giá</option>
                    <option value="Đã chốt mẫu">Đã chốt mẫu</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Điểm thay đổi / Lưu ý kiểm tra IQC</label>
                <textarea
                  rows={3}
                  value={partForm.changeNote}
                  onChange={(e) => setPartForm((p) => ({ ...p, changeNote: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
              <button type="button" onClick={() => setShowPartModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 bg-white font-bold text-xs cursor-pointer">Hủy</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs cursor-pointer">Lưu linh kiện</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Thêm Link Tài Liệu Kỹ Thuật */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <form onSubmit={handleSaveDoc} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-base font-extrabold text-slate-900">Thêm Đường Dẫn Tài Liệu Kỹ Thuật</h3>
              <button type="button" onClick={() => setShowDocModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên tài liệu *</label>
                <input
                  type="text"
                  required
                  value={docForm.title}
                  onChange={(e) => setDocForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="VD: Bảng thông số kỹ thuật DK Roma SX 2027"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Loại tài liệu</label>
                <select
                  value={docForm.docType}
                  onChange={(e) => setDocForm((p) => ({ ...p, docType: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Thông số KT">Thông số KT</option>
                  <option value="Tiêu chuẩn IQC/OQC">Tiêu chuẩn IQC/OQC</option>
                  <option value="Hồ sơ Đăng kiểm">Hồ sơ Đăng kiểm</option>
                  <option value="Ảnh / Video mẫu">Ảnh / Video mẫu</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Đường dẫn (URL) *</label>
                <input
                  type="url"
                  required
                  value={docForm.url}
                  onChange={(e) => setDocForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
              <button type="button" onClick={() => setShowDocModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 bg-white font-bold text-xs cursor-pointer">Hủy</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs cursor-pointer">Lưu link tài liệu</button>
            </div>
          </form>
        </div>
      )}

      {/* Phóng to ảnh */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <img src={zoomImage} alt="" className="max-w-full max-h-[88vh] rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
