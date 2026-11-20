import React, { useMemo, useState } from 'react';
import XLSXStyle from 'xlsx-js-style';
import {
  Wrench,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Settings,
  Database,
  Sliders,
  DollarSign,
  Calendar,
  Search,
  X,
  LayoutGrid,
  List,
  Hammer,
  FileSpreadsheet,
  Award,
  Ban,
  Play,
  RotateCcw,
  Camera
} from 'lucide-react';
import {
  EquipmentItem,
  MaintenanceLog,
  EquipmentIncident,
  FabricationRepairJob,
  DKBikeModel
} from '../types';
import { compressImageFile } from '../imageCompressor';
import { parseFlexibleDate, formatDateStrVi, getLocalDmy } from '../utils/dateUtils';

interface MachineryMaintenanceProps {
  equipments: EquipmentItem[];
  setEquipments: React.Dispatch<React.SetStateAction<EquipmentItem[]>>;
  maintenanceLogs: MaintenanceLog[];
  setMaintenanceLogs: React.Dispatch<React.SetStateAction<MaintenanceLog[]>>;
  equipmentIncidents: EquipmentIncident[];
  setEquipmentIncidents: React.Dispatch<React.SetStateAction<EquipmentIncident[]>>;
  fabricationJobs: FabricationRepairJob[];
  setFabricationJobs: React.Dispatch<React.SetStateAction<FabricationRepairJob[]>>;
  models?: DKBikeModel[];
  currentUser: { name: string; email: string };
  isUserAuthorized: () => boolean;
  guardAction: (callback: () => void) => void;
  staff: { name: string; email: string; role: string }[];
}

export type AssetGroupKey = 'measuring' | 'jig_fixture' | 'oqc_test' | 'production_line';

const ASSET_GROUP_META: Record<
  AssetGroupKey,
  { label: string; categoryLabel: string; badgeClass: string; defaultOwner: string }
> = {
  measuring: {
    label: 'Thiết bị đo lường & CCDC QLCL',
    categoryLabel: 'Thiết bị đo lường QLCL',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    defaultOwner: 'Đoàn Anh Hùng'
  },
  jig_fixture: {
    label: 'Đồ gá & Dưỡng kiểm chuyên dụng',
    categoryLabel: 'Đồ gá & Dưỡng kiểm',
    badgeClass: 'bg-violet-50 text-violet-800 border-violet-200',
    defaultOwner: 'Đoàn Anh Hùng'
  },
  oqc_test: {
    label: 'Thiết bị Kiểm định KCS / OQC / PTSP',
    categoryLabel: 'Thiết bị KCS / OQC',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    defaultOwner: 'Đoàn Anh Hùng'
  },
  production_line: {
    label: 'Máy móc Dây chuyền SX & Phụ trợ',
    categoryLabel: 'Dây chuyền SX',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    defaultOwner: 'Hà Khắc Việt'
  }
};

function resolveAssetGroup(eq: Partial<EquipmentItem>): AssetGroupKey {
  if (eq.assetGroup && ASSET_GROUP_META[eq.assetGroup]) {
    return eq.assetGroup;
  }
  const cat = String(eq.category || '').toLowerCase();
  const name = String(eq.name || '').toLowerCase();
  if (
    cat.includes('đo') ||
    cat.includes('ccdc') ||
    cat.includes('qlcl') ||
    name.includes('thước') ||
    name.includes('panme') ||
    name.includes('đồng hồ') ||
    name.includes('vôn') ||
    name.includes('ampe') ||
    name.includes('lực')
  ) {
    return 'measuring';
  }
  if (cat.includes('đồ gá') || cat.includes('dưỡng') || name.includes('đồ gá') || name.includes('jig')) {
    return 'jig_fixture';
  }
  if (cat.includes('kcs') || cat.includes('oqc') || cat.includes('kiểm định') || cat.includes('ptsp')) {
    return 'oqc_test';
  }
  return 'production_line';
}

function addCycleToDateStr(
  baseDateStr: string | undefined,
  freq: EquipmentItem['maintainFrequency'] | undefined
): string {
  const base = parseFlexibleDate(baseDateStr) || new Date();
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12, 0, 0, 0);
  if (freq === 'Hằng tuần') next.setDate(next.getDate() + 7);
  else if (freq === 'Hằng tháng') next.setMonth(next.getMonth() + 1);
  else if (freq === 'Hằng quý') next.setMonth(next.getMonth() + 3);
  else next.setFullYear(next.getFullYear() + 1);
  return getLocalDmy(next);
}

function getCalibrationMeta(eq: EquipmentItem, todayStartMs: number) {
  const targetStr = eq.nextCalibrationDate || eq.nextMaintenanceDate;
  const parsedNext = parseFlexibleDate(targetStr);
  const diffDays = parsedNext
    ? Math.ceil((parsedNext.getTime() - todayStartMs) / 86400000)
    : null;

  const isSuspended =
    eq.calibrationStatus === 'Đình chỉ sử dụng' ||
    Boolean(eq.suspensionReason) && eq.status === 'Stopped';

  if (isSuspended) {
    return {
      statusLabel: 'Đình chỉ sử dụng' as const,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      diffDays,
      dueText: 'Đã khóa (Quyền IV.3)',
      isCompliant: false,
      isOverdue: false,
      isSoon: false,
      isSuspended: true
    };
  }

  if (eq.calibrationStatus === 'Chưa hiệu chuẩn' && !parsedNext) {
    return {
      statusLabel: 'Chưa hiệu chuẩn' as const,
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      diffDays: null,
      dueText: 'Chưa lên lịch HC',
      isCompliant: eq.status === 'Running',
      isOverdue: false,
      isSoon: false,
      isSuspended: false
    };
  }

  if (diffDays !== null && diffDays < 0) {
    return {
      statusLabel: 'Quá hạn HC' as const,
      badgeClass: 'bg-red-100 text-red-800 border-red-300 animate-pulse',
      diffDays,
      dueText: `Quá hạn ${Math.abs(diffDays)} ngày`,
      isCompliant: false,
      isOverdue: true,
      isSoon: false,
      isSuspended: false
    };
  }

  if (diffDays !== null && diffDays <= 15) {
    return {
      statusLabel: 'Sắp đến hạn HC' as const,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      diffDays,
      dueText: diffDays === 0 ? 'Đến hạn hôm nay' : `Còn ${diffDays} ngày`,
      isCompliant: eq.status === 'Running',
      isOverdue: false,
      isSoon: true,
      isSuspended: false
    };
  }

  return {
    statusLabel: (eq.calibrationStatus && eq.calibrationStatus !== 'Quá hạn HC'
      ? eq.calibrationStatus
      : 'Đã dán tem ĐẠT') as EquipmentItem['calibrationStatus'],
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    diffDays,
    dueText: diffDays !== null ? `Còn ${diffDays} ngày` : 'Đúng hạn',
    isCompliant: eq.status === 'Running',
    isOverdue: false,
    isSoon: false,
    isSuspended: false
  };
}

export default function MachineryMaintenance({
  equipments,
  setEquipments,
  maintenanceLogs,
  setMaintenanceLogs,
  equipmentIncidents,
  setEquipmentIncidents,
  fabricationJobs,
  setFabricationJobs,
  models = [],
  currentUser,
  isUserAuthorized,
  guardAction,
  staff
}: MachineryMaintenanceProps) {
  const now = new Date();
  const todayStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const defaultHungName =
    staff.find(s => s.name.toLowerCase().includes('đoàn anh hùng'))?.name || 'Đoàn Anh Hùng';

  // Sub-tabs (4 tabs aligned with BG-NV-08, QT-KTTD-02 & BM-KTTD-02)
  const [subTab, setSubTab] = useState<'overview' | 'maintenance' | 'fabrication' | 'incidents'>('overview');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [localZoomImage, setLocalZoomImage] = useState<string | null>(null);

  // Search & Filter states
  const [eqFilterGroup, setEqFilterGroup] = useState<string>('All');
  const [eqFilterStatus, setEqFilterStatus] = useState<string>('All');
  const [eqFilterCal, setEqFilterCal] = useState<'All' | 'passed' | 'due_soon' | 'suspended'>('All');
  const [eqSearch, setEqSearch] = useState<string>('');

  const [mLogSearch, setMLogSearch] = useState<string>('');
  const [mLogFilterType, setMLogFilterType] = useState<string>('All');

  const [fabSearch, setFabSearch] = useState<string>('');
  const [fabFilterType, setFabFilterType] = useState<string>('All');
  const [fabFilterStatus, setFabFilterStatus] = useState<string>('All');

  const [incSearch, setIncSearch] = useState<string>('');
  const [incFilterSeverity, setIncFilterSeverity] = useState<string>('All');
  const [incFilterStatus, setIncFilterStatus] = useState<string>('All');

  // Modal open states
  const [showAddEqModal, setShowAddEqModal] = useState(false);
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [showAddIncModal, setShowAddIncModal] = useState(false);
  const [showResolveIncModal, setShowResolveIncModal] = useState<EquipmentIncident | null>(null);
  const [editingEq, setEditingEq] = useState<EquipmentItem | null>(null);
  const [suspendTargetEq, setSuspendTargetEq] = useState<EquipmentItem | null>(null);
  const [suspendReasonInput, setSuspendReasonInput] = useState<string>('');

  const [showFabModal, setShowFabModal] = useState(false);
  const [editingFabJob, setEditingFabJob] = useState<FabricationRepairJob | null>(null);

  const [isNewDragOver, setIsNewDragOver] = useState(false);
  const [isEditDragOver, setIsEditDragOver] = useState(false);

  // Form states — Equipment
  const createInitialNewEq = (): Partial<EquipmentItem> => ({
    serialNo: '',
    name: '',
    assetGroup: 'measuring',
    category: ASSET_GROUP_META.measuring.categoryLabel,
    status: 'Running',
    healthRate: 100,
    location: 'Phòng QLCL',
    lastMaintenanceDate: getLocalDmy(),
    nextMaintenanceDate: addCycleToDateStr(getLocalDmy(), 'Định kỳ hằng năm'),
    lastCalibrationDate: getLocalDmy(),
    nextCalibrationDate: addCycleToDateStr(getLocalDmy(), 'Định kỳ hằng năm'),
    maintainFrequency: 'Định kỳ hằng năm',
    responsiblePerson: defaultHungName,
    manufacturer: '',
    specifications: '',
    measureRange: '',
    calibrationStatus: 'Đã dán tem ĐẠT',
    calibrationProvider: 'Nội bộ (Master chuẩn)',
    manufactureYear: now.getFullYear(),
    imageUrl: ''
  });

  const [newEq, setNewEq] = useState<Partial<EquipmentItem>>(createInitialNewEq);

  // Form states — Maintenance / Calibration Log
  const [newLog, setNewLog] = useState<Partial<MaintenanceLog>>({
    equipmentId: '',
    type: 'Hiệu chuẩn',
    details: '',
    replacedParts: '',
    cost: 0,
    technician: defaultHungName,
    calibrationCertificateNo: '',
    calibrationResult: 'ĐẠT',
    nextCalibrationDate: '',
    status: 'Thành công'
  });

  // Form states — Fabrication / Sample / Deep Repair Job
  const createInitialFabJob = (): Partial<FabricationRepairJob> => ({
    jobType: 'Chế tạo đồ gá',
    title: '',
    modelName: '',
    requestDept: 'Phòng QLCL',
    requester: currentUser.name,
    assignee: defaultHungName,
    requestDate: getLocalDmy(),
    dueDate: addCycleToDateStr(getLocalDmy(), 'Hằng tuần'),
    priority: 'Cao',
    status: 'Đang thực hiện',
    technicalNote: '',
    resultNote: '',
    images: []
  });

  const [fabForm, setFabForm] = useState<Partial<FabricationRepairJob>>(createInitialFabJob);

  // Form states — Incident
  const [newInc, setNewInc] = useState<Partial<EquipmentIncident>>({
    equipmentId: '',
    severity: 'Warning',
    description: '',
    downtimeMinutes: 0,
    reportedBy: currentUser.name
  });

  const [resolveRootCause, setResolveRootCause] = useState('');
  const [resolveRepairAction, setResolveRepairAction] = useState('');
  const [resolveTechnician, setResolveTechnician] = useState(defaultHungName);
  const [resolveRepairCost, setResolveRepairCost] = useState(0);
  const [resolveDowntime, setResolveDowntime] = useState(30);

  // Computed stats
  const equipmentStats = useMemo(() => {
    let measuringCount = 0;
    let jigCount = 0;
    let lineOrOqcCount = 0;
    let compliantCount = 0;
    let dueSoonOrOverdueCount = 0;
    let suspendedCount = 0;

    equipments.forEach(eq => {
      const grp = resolveAssetGroup(eq);
      if (grp === 'measuring') measuringCount++;
      else if (grp === 'jig_fixture') jigCount++;
      else lineOrOqcCount++;

      const meta = getCalibrationMeta(eq, todayStartMs);
      if (meta.isCompliant && !meta.isOverdue && !meta.isSuspended) compliantCount++;
      if (meta.isOverdue || meta.isSoon) dueSoonOrOverdueCount++;
      if (meta.isSuspended) suspendedCount++;
    });

    const calComplianceRate =
      equipments.length > 0 ? Number(((compliantCount / equipments.length) * 100).toFixed(1)) : 100;

    const activeFabCount = fabricationJobs.filter(
      j => j.status === 'Chờ thực hiện' || j.status === 'Đang thực hiện'
    ).length;
    const doneFabJobs = fabricationJobs.filter(j => j.status === 'Hoàn thành & Bàn giao');
    const onTimeFabCount = doneFabJobs.filter(j => {
      const due = parseFlexibleDate(j.dueDate);
      const comp = parseFlexibleDate(j.completedDate);
      if (due && comp) return comp.getTime() <= due.getTime() + 86400000;
      return true;
    }).length;

    const totalDowntime = equipmentIncidents.reduce((sum, i) => sum + (i.downtimeMinutes || 0), 0);
    const activeBreakdownsCount = equipmentIncidents.filter(i => i.status !== 'Resolved').length;
    const totalCosts =
      maintenanceLogs.reduce((sum, l) => sum + (l.cost || 0), 0) +
      equipmentIncidents.reduce((sum, i) => sum + (i.repairCost || 0), 0);

    return {
      measuringCount,
      jigCount,
      lineOrOqcCount,
      compliantCount,
      dueSoonOrOverdueCount,
      suspendedCount,
      calComplianceRate,
      activeFabCount,
      doneFabCount: doneFabJobs.length,
      onTimeFabCount,
      totalDowntime,
      activeBreakdownsCount,
      totalCosts
    };
  }, [equipments, fabricationJobs, equipmentIncidents, maintenanceLogs, todayStartMs]);

  const suspendedEquipments = useMemo(
    () => equipments.filter(eq => getCalibrationMeta(eq, todayStartMs).isSuspended),
    [equipments, todayStartMs]
  );

  // Compressed image handlers (< 30KB per rule #1, no uncompressed fallback)
  const handleEquipmentImageUpload = async (file: File, isEdit: boolean) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Vui lòng chỉ tải lên các định dạng file hình ảnh!');
      return;
    }
    try {
      const compressed = await compressImageFile(file, 500, 500, 0.4);
      if (!compressed) {
        alert('Không thể nén ảnh. Vui lòng chọn ảnh khác nhỏ hơn.');
        return;
      }
      if (isEdit) {
        setEditingEq(prev => (prev ? { ...prev, imageUrl: compressed } : null));
      } else {
        setNewEq(prev => ({ ...prev, imageUrl: compressed }));
      }
    } catch (err) {
      console.error('[Machinery Image Compress Err]:', err);
      alert('Lỗi khi nén ảnh thiết bị. Vui lòng thử ảnh khác.');
    }
  };

  const handleFabImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const compressedList: string[] = [];
    for (let i = 0; i < Math.min(files.length, 3); i++) {
      const f = files[i];
      if (!f.type.startsWith('image/')) continue;
      try {
        const b64 = await compressImageFile(f, 500, 500, 0.4);
        if (b64) compressedList.push(b64);
      } catch (err) {
        console.error('[Fabrication Image Compress Err]:', err);
      }
    }
    if (compressedList.length > 0) {
      setFabForm(prev => ({
        ...prev,
        images: [...(prev.images || []), ...compressedList].slice(0, 3)
      }));
    }
  };

  // CRUD: Equipment
  const handleAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    guardAction(() => {
      if (!newEq.name?.trim()) {
        alert('Vui lòng nhập tên thiết bị / dụng cụ đo!');
        return;
      }
      const grp = (newEq.assetGroup as AssetGroupKey) || 'measuring';
      const metaInfo = ASSET_GROUP_META[grp];
      const calNext =
        newEq.nextCalibrationDate ||
        newEq.nextMaintenanceDate ||
        addCycleToDateStr(getLocalDmy(), newEq.maintainFrequency);
      const item: EquipmentItem = {
        id: `TB-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`,
        serialNo: newEq.serialNo?.trim() || '',
        name: newEq.name.trim(),
        assetGroup: grp,
        category: newEq.category || metaInfo.categoryLabel,
        status: (newEq.status as EquipmentItem['status']) || 'Running',
        healthRate: Number(newEq.healthRate) || 100,
        location: newEq.location?.trim() || 'Phòng QLCL',
        lastMaintenanceDate: newEq.lastCalibrationDate || newEq.lastMaintenanceDate || getLocalDmy(),
        nextMaintenanceDate: calNext,
        lastCalibrationDate: newEq.lastCalibrationDate || newEq.lastMaintenanceDate || getLocalDmy(),
        nextCalibrationDate: calNext,
        maintainFrequency: (newEq.maintainFrequency as EquipmentItem['maintainFrequency']) || 'Định kỳ hằng năm',
        responsiblePerson: newEq.responsiblePerson || metaInfo.defaultOwner,
        manufacturer: newEq.manufacturer?.trim() || 'DKBike QMS',
        specifications: newEq.specifications?.trim() || 'Tiêu chuẩn kiểm định DKBike',
        measureRange: newEq.measureRange?.trim() || '',
        calibrationStatus: (newEq.calibrationStatus as EquipmentItem['calibrationStatus']) || 'Đã dán tem ĐẠT',
        calibrationProvider: newEq.calibrationProvider?.trim() || 'Nội bộ (Master chuẩn)',
        manufactureYear: Number(newEq.manufactureYear) || now.getFullYear(),
        imageUrl: newEq.imageUrl || '',
        updatedAt: new Date().toISOString()
      };

      setEquipments(prev => [item, ...prev]);
      setShowAddEqModal(false);
      setNewEq(createInitialNewEq());
      alert(`Đã khai báo [${item.name}] vào Sổ cái thiết bị & tự động đồng bộ Cloud!`);
    });
  };

  const handleEditEquipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEq) return;
    guardAction(() => {
      if (!editingEq.name.trim()) {
        alert('Tên thiết bị không được để trống!');
        return;
      }
      const grp = resolveAssetGroup(editingEq);
      const syncedNext = editingEq.nextCalibrationDate || editingEq.nextMaintenanceDate;
      const syncedLast = editingEq.lastCalibrationDate || editingEq.lastMaintenanceDate;
      const updatedItem: EquipmentItem = {
        ...editingEq,
        assetGroup: grp,
        category: ASSET_GROUP_META[grp].categoryLabel,
        lastMaintenanceDate: syncedLast,
        lastCalibrationDate: syncedLast,
        nextMaintenanceDate: syncedNext,
        nextCalibrationDate: syncedNext,
        updatedAt: new Date().toISOString()
      };
      setEquipments(prev => prev.map(eq => (eq.id === updatedItem.id ? updatedItem : eq)));
      setEditingEq(null);
      alert(`Đã cập nhật thông tin [${updatedItem.name}] thành công!`);
    });
  };

  const handleDeleteEquipment = (id: string, name: string) => {
    guardAction(() => {
      if (
        window.confirm(
          `⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA THIẾT BỊ [${name}] KHÔNG?\nLưu ý: Hành động này sẽ xóa thiết bị khỏi danh mục BM-KTTD-02.`
        )
      ) {
        setEquipments(prev => prev.filter(e => e.id !== id));
      }
    });
  };

  // Quick 1-click Calibration Pass (Dán tem HC ĐẠT)
  const handleQuickPassCalibration = (eq: EquipmentItem) => {
    guardAction(() => {
      const todayStr = getLocalDmy();
      const nextDateStr = addCycleToDateStr(todayStr, eq.maintainFrequency);
      setEquipments(prev =>
        prev.map(item =>
          item.id === eq.id
            ? {
                ...item,
                status: 'Running',
                healthRate: 100,
                calibrationStatus: 'Đã dán tem ĐẠT',
                lastCalibrationDate: todayStr,
                lastMaintenanceDate: todayStr,
                nextCalibrationDate: nextDateStr,
                nextMaintenanceDate: nextDateStr,
                suspensionReason: undefined,
                updatedAt: new Date().toISOString()
              }
            : item
        )
      );
      const logItem: MaintenanceLog = {
        id: `HC-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 89)}`,
        equipmentId: eq.id,
        equipmentName: eq.name,
        maintenanceDate: todayStr,
        technician: currentUser.name || defaultHungName,
        type: 'Hiệu chuẩn',
        details: `Nghiệm thu & dán tem hiệu chuẩn ĐẠT chuẩn BM-KTTD-02. Hạn HC kế tiếp: ${nextDateStr}`,
        replacedParts: 'Tem kiểm định / Hiệu chuẩn xanh',
        cost: 0,
        nextCalibrationDate: nextDateStr,
        calibrationResult: 'ĐẠT',
        status: 'Thành công'
      };
      setMaintenanceLogs(prev => [logItem, ...prev]);
      alert(`✅ Đã xác nhận ĐẠT hiệu chuẩn & dán tem cho [${eq.name}]. Hạn kế tiếp: ${nextDateStr}`);
    });
  };

  // Suspend / Restore (Quyền hạn IV.3 trong BG-NV-08 của Đoàn Anh Hùng)
  const handleConfirmSuspend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendTargetEq) return;
    guardAction(() => {
      const reason = suspendReasonInput.trim() || 'Sai lệch giá trị đo / Quá hạn tem hiệu chuẩn (Quyền IV.3)';
      setEquipments(prev =>
        prev.map(item =>
          item.id === suspendTargetEq.id
            ? {
                ...item,
                status: 'Stopped',
                calibrationStatus: 'Đình chỉ sử dụng',
                suspensionReason: reason,
                healthRate: Math.min(item.healthRate || 100, 40),
                updatedAt: new Date().toISOString()
              }
            : item
        )
      );
      const logItem: MaintenanceLog = {
        id: `DC-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 89)}`,
        equipmentId: suspendTargetEq.id,
        equipmentName: suspendTargetEq.name,
        maintenanceDate: getLocalDmy(),
        technician: currentUser.name || defaultHungName,
        type: 'Hiệu chuẩn',
        details: `Tạm đình chỉ sử dụng theo Quyền IV.3 BG-NV-08. Lý do: ${reason}`,
        replacedParts: 'Niêm phong / Gỡ tem',
        cost: 0,
        calibrationResult: 'KHÔNG ĐẠT - ĐÌNH CHỈ',
        status: 'Tạm dừng'
      };
      setMaintenanceLogs(prev => [logItem, ...prev]);
      setSuspendTargetEq(null);
      setSuspendReasonInput('');
    });
  };

  const handleRestoreEquipment = (eq: EquipmentItem) => {
    guardAction(() => {
      const todayStr = getLocalDmy();
      const nextDateStr = addCycleToDateStr(todayStr, eq.maintainFrequency);
      setEquipments(prev =>
        prev.map(item =>
          item.id === eq.id
            ? {
                ...item,
                status: 'Running',
                healthRate: 95,
                calibrationStatus: 'Đã dán tem ĐẠT',
                suspensionReason: undefined,
                lastCalibrationDate: todayStr,
                lastMaintenanceDate: todayStr,
                nextCalibrationDate: nextDateStr,
                nextMaintenanceDate: nextDateStr,
                updatedAt: new Date().toISOString()
              }
            : item
        )
      );
      alert(`✅ Đã khôi phục hoạt động & cập nhật tem ĐẠT cho [${eq.name}].`);
    });
  };

  // CRUD: Maintenance & Calibration Log
  const handleAddMaintenanceLog = (e: React.FormEvent) => {
    e.preventDefault();
    guardAction(() => {
      if (!newLog.equipmentId) {
        alert('Vui lòng chọn thiết bị thực hiện!');
        return;
      }
      const targetEq = equipments.find(item => item.id === newLog.equipmentId);
      if (!targetEq) return;

      const todayStr = getLocalDmy();
      const isCalibrationFail =
        newLog.type === 'Hiệu chuẩn' && newLog.calibrationResult === 'KHÔNG ĐẠT - ĐÌNH CHỈ';
      const nextDateComputed =
        newLog.nextCalibrationDate?.trim() || addCycleToDateStr(todayStr, targetEq.maintainFrequency);

      const logItem: MaintenanceLog = {
        id: `MNL-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 89)}`,
        equipmentId: newLog.equipmentId,
        equipmentName: targetEq.name,
        maintenanceDate: todayStr,
        technician: newLog.technician || defaultHungName,
        type: (newLog.type as MaintenanceLog['type']) || 'Hiệu chuẩn',
        details: newLog.details || 'Nghiệm thu bảo dưỡng / hiệu chuẩn định kỳ',
        replacedParts: newLog.replacedParts || 'Không thay thế vật tư',
        cost: Number(newLog.cost) || 0,
        nextCalibrationDate: isCalibrationFail ? targetEq.nextCalibrationDate : nextDateComputed,
        calibrationCertificateNo: newLog.calibrationCertificateNo?.trim() || undefined,
        calibrationResult:
          newLog.type === 'Hiệu chuẩn'
            ? (newLog.calibrationResult as MaintenanceLog['calibrationResult']) || 'ĐẠT'
            : undefined,
        status: isCalibrationFail ? 'Tạm dừng' : (newLog.status as MaintenanceLog['status']) || 'Thành công'
      };

      setMaintenanceLogs(prev => [logItem, ...prev]);

      setEquipments(prev =>
        prev.map(item =>
          item.id === newLog.equipmentId
            ? isCalibrationFail
              ? {
                  ...item,
                  status: 'Stopped',
                  healthRate: 40,
                  calibrationStatus: 'Đình chỉ sử dụng',
                  suspensionReason: newLog.details || 'Không đạt kiểm chuẩn (BM-KTTD-02)',
                  updatedAt: new Date().toISOString()
                }
              : {
                  ...item,
                  status: 'Running',
                  healthRate: 100,
                  calibrationStatus: 'Đã dán tem ĐẠT',
                  suspensionReason: undefined,
                  lastMaintenanceDate: todayStr,
                  lastCalibrationDate: todayStr,
                  nextMaintenanceDate: nextDateComputed,
                  nextCalibrationDate: nextDateComputed,
                  updatedAt: new Date().toISOString()
                }
            : item
        )
      );

      setShowAddLogModal(false);
      setNewLog({
        equipmentId: '',
        type: 'Hiệu chuẩn',
        details: '',
        replacedParts: '',
        cost: 0,
        technician: defaultHungName,
        calibrationCertificateNo: '',
        calibrationResult: 'ĐẠT',
        nextCalibrationDate: '',
        status: 'Thành công'
      });
      alert(
        isCalibrationFail
          ? `⛔ Đã lưu biên bản KHÔNG ĐẠT và tự động đình chỉ sử dụng [${targetEq.name}] theo Quyền IV.3!`
          : `✅ Đã hoàn tất nghiệm thu [${targetEq.name}] & cập nhật hạn kế tiếp: ${nextDateComputed}!`
      );
    });
  };

  // CRUD: Fabrication / Sample / Specialized Repair Jobs (NV-KTTĐ-05)
  const openCreateFabModal = () => {
    setEditingFabJob(null);
    setFabForm(createInitialFabJob());
    setShowFabModal(true);
  };

  const openEditFabModal = (job: FabricationRepairJob) => {
    setEditingFabJob(job);
    setFabForm({ ...job, images: job.images || [] });
    setShowFabModal(true);
  };

  const handleSaveFabJob = (e: React.FormEvent) => {
    e.preventDefault();
    guardAction(() => {
      if (!fabForm.title?.trim()) {
        alert('Vui lòng nhập nội dung / tên đồ gá / linh kiện cần thực hiện!');
        return;
      }
      const status = (fabForm.status as FabricationRepairJob['status']) || 'Đang thực hiện';
      const completedDate =
        status === 'Hoàn thành & Bàn giao'
          ? fabForm.completedDate?.trim() || getLocalDmy()
          : fabForm.completedDate;

      if (editingFabJob) {
        const updated: FabricationRepairJob = {
          ...editingFabJob,
          jobType: (fabForm.jobType as FabricationRepairJob['jobType']) || editingFabJob.jobType,
          title: fabForm.title.trim(),
          modelName: fabForm.modelName?.trim() || undefined,
          requestDept: (fabForm.requestDept as FabricationRepairJob['requestDept']) || 'Phòng QLCL',
          requester: fabForm.requester?.trim() || undefined,
          assignee: fabForm.assignee?.trim() || defaultHungName,
          requestDate: fabForm.requestDate?.trim() || getLocalDmy(),
          dueDate: fabForm.dueDate?.trim() || getLocalDmy(),
          completedDate,
          priority: (fabForm.priority as FabricationRepairJob['priority']) || 'Cao',
          status,
          technicalNote: fabForm.technicalNote?.trim() || undefined,
          resultNote: fabForm.resultNote?.trim() || undefined,
          images: fabForm.images && fabForm.images.length > 0 ? fabForm.images : undefined,
          updatedAt: new Date().toISOString()
        };
        setFabricationJobs(prev => prev.map(j => (j.id === updated.id ? updated : j)));
      } else {
        const created: FabricationRepairJob = {
          id: `GC-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 89)}`,
          jobType: (fabForm.jobType as FabricationRepairJob['jobType']) || 'Chế tạo đồ gá',
          title: fabForm.title.trim(),
          modelName: fabForm.modelName?.trim() || undefined,
          requestDept: (fabForm.requestDept as FabricationRepairJob['requestDept']) || 'Phòng QLCL',
          requester: fabForm.requester?.trim() || currentUser.name,
          assignee: fabForm.assignee?.trim() || defaultHungName,
          requestDate: fabForm.requestDate?.trim() || getLocalDmy(),
          dueDate: fabForm.dueDate?.trim() || addCycleToDateStr(getLocalDmy(), 'Hằng tuần'),
          completedDate,
          priority: (fabForm.priority as FabricationRepairJob['priority']) || 'Cao',
          status,
          technicalNote: fabForm.technicalNote?.trim() || undefined,
          resultNote: fabForm.resultNote?.trim() || undefined,
          images: fabForm.images && fabForm.images.length > 0 ? fabForm.images : undefined,
          updatedAt: new Date().toISOString()
        };
        setFabricationJobs(prev => [created, ...prev]);
      }
      setShowFabModal(false);
      setEditingFabJob(null);
    });
  };

  const handleQuickCompleteFabJob = (job: FabricationRepairJob) => {
    guardAction(() => {
      setFabricationJobs(prev =>
        prev.map(j =>
          j.id === job.id
            ? {
                ...j,
                status: 'Hoàn thành & Bàn giao',
                completedDate: getLocalDmy(),
                updatedAt: new Date().toISOString()
              }
            : j
        )
      );
    });
  };

  const handleDeleteFabJob = (id: string, title: string) => {
    guardAction(() => {
      if (window.confirm(`Xác nhận xóa phiếu [${id} - ${title}]?`)) {
        setFabricationJobs(prev => prev.filter(j => j.id !== id));
      }
    });
  };

  // CRUD: Incidents
  const handleAddIncident = (e: React.FormEvent) => {
    e.preventDefault();
    guardAction(() => {
      if (!newInc.equipmentId) {
        alert('Vui lòng chọn thiết bị phát sinh sự cố!');
        return;
      }
      const targetEq = equipments.find(item => item.id === newInc.equipmentId);
      if (!targetEq) return;

      const incItem: EquipmentIncident = {
        id: `EQI-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 89)}`,
        equipmentId: newInc.equipmentId,
        equipmentName: targetEq.name,
        incidentDate: getLocalDmy(),
        reportedBy: newInc.reportedBy || currentUser.name,
        severity: (newInc.severity as EquipmentIncident['severity']) || 'Warning',
        downtimeMinutes: Number(newInc.downtimeMinutes) || 0,
        description: newInc.description || 'Ghi nhận dừng lỗi vận hành',
        status: 'Pending'
      };

      setEquipmentIncidents(prev => [incItem, ...prev]);
      setEquipments(prev =>
        prev.map(item =>
          item.id === newInc.equipmentId
            ? {
                ...item,
                status: 'Under Repair',
                healthRate: Math.max(20, (item.healthRate || 100) - 30),
                updatedAt: new Date().toISOString()
              }
            : item
        )
      );

      setShowAddIncModal(false);
      setNewInc({
        equipmentId: '',
        severity: 'Warning',
        description: '',
        downtimeMinutes: 0,
        reportedBy: currentUser.name
      });
      alert(`⚠️ Đã ghi nhận sự cố của [${targetEq.name}] và chuyển trạng thái máy sang [Under Repair].`);
    });
  };

  const handleResolveIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResolveIncModal) return;

    guardAction(() => {
      const todayStr = getLocalDmy();
      setEquipmentIncidents(prev =>
        prev.map(inc =>
          inc.id === showResolveIncModal.id
            ? {
                ...inc,
                status: 'Resolved',
                resolvedDate: todayStr,
                rootCause: resolveRootCause || 'Hao mòn cơ khí / sai lệch cảm biến',
                repairAction: resolveRepairAction || 'Thay thế linh kiện & cân chỉnh lại thông số',
                technician: resolveTechnician || defaultHungName,
                repairCost: Number(resolveRepairCost) || 0,
                downtimeMinutes: Number(resolveDowntime) || 0
              }
            : inc
        )
      );

      setEquipments(prev =>
        prev.map(eq =>
          eq.id === showResolveIncModal.equipmentId
            ? {
                ...eq,
                status: 'Running',
                healthRate: 95,
                suspensionReason: undefined,
                updatedAt: new Date().toISOString()
              }
            : eq
        )
      );

      setShowResolveIncModal(null);
      setResolveRootCause('');
      setResolveRepairAction('');
      setResolveRepairCost(0);
      setResolveDowntime(30);
      alert(`✅ Đã nghiệm thu khắc phục sự cố [${showResolveIncModal.equipmentName}]!`);
    });
  };

  const handleDeleteIncident = (id: string) => {
    guardAction(() => {
      if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi sự cố dừng hỏng này không?')) {
        setEquipmentIncidents(prev => prev.filter(i => i.id !== id));
      }
    });
  };

  // Export BM-KTTD-02 Master Log Excel (.xlsx)
  const handleExportBmKttd02Excel = () => {
    const borderThin = {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    };
    const headerRows: any[][] = [
      ['CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT', '', '', '', 'MÃ BIỂU MẪU: BM-KTTD-02', '', ''],
      ['Thương hiệu: DKBike — Slogan: "Xe cho cả gia đình"', '', '', '', 'Quy trình áp dụng: QT-KTTD-02', '', ''],
      ['PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL / DK QMS)', '', '', '', `Ngày xuất sổ: ${getLocalDmy()}`, '', ''],
      [],
      ['SỔ THEO DÕI HIỆU CHUẨN THIẾT BỊ & DỤNG CỤ ĐO LƯỜNG (MASTER LOG)', '', '', '', '', '', ''],
      [
        `Tổng thiết bị quản lý: ${equipments.length} | Đạt chuẩn hoạt động: ${equipmentStats.compliantCount} | Sắp đến hạn/Quá hạn: ${equipmentStats.dueSoonOrOverdueCount} | Đang đình chỉ: ${equipmentStats.suspendedCount}`,
        '',
        '',
        '',
        '',
        '',
        ''
      ],
      [],
      [
        'Mã TB',
        'Tên thiết bị / Dụng cụ đo',
        'Dải đo & Độ chính xác / Thông số',
        'Ngày HC gần nhất',
        'Ngày HC kế tiếp',
        'Tình trạng Tem & Phụ trách',
        'Đánh giá (BM-KTTD-02)'
      ]
    ];

    const bodyRows = equipments.map(eq => {
      const meta = getCalibrationMeta(eq, todayStartMs);
      const lastStr = eq.lastCalibrationDate || eq.lastMaintenanceDate || '--';
      const nextStr = eq.nextCalibrationDate || eq.nextMaintenanceDate || '--';
      const specText = [eq.measureRange, eq.specifications, eq.serialNo ? `Seri: ${eq.serialNo}` : '']
        .filter(Boolean)
        .join(' • ');
      const temText = `${meta.statusLabel} (${eq.calibrationProvider || 'Nội bộ'}) — PT: ${eq.responsiblePerson || defaultHungName}`;
      const evalText = meta.isSuspended
        ? `NGỪNG DÙNG (${eq.suspensionReason || 'Đình chỉ'})`
        : meta.isOverdue
        ? `CHỜ HIỆU CHUẨN LẠI (${meta.dueText})`
        : meta.isCompliant
        ? 'ĐẠT - ĐANG SỬ DỤNG'
        : `${eq.status}`;

      return [eq.id, eq.name, specText || '--', lastStr, nextStr, temText, evalText];
    });

    const footerRows: any[][] = [
      [],
      ['THỰC THI [T]', '', 'XÁC NHẬN [H]', '', 'PHÊ DUYỆT [P]', '', ''],
      ['Kỹ thuật Thẩm định & Đo lường', '', 'Tổ trưởng QC Hiện trường', '', 'Trưởng phòng Quản lý chất lượng', '', ''],
      [],
      [],
      ['Đoàn Anh Hùng', '', 'Tổ trưởng QC', '', 'Nguyễn Xuân Thao', '', '']
    ];

    const sheetData = [...headerRows, ...bodyRows, ...footerRows];
    const ws = XLSXStyle.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 15 },
      { wch: 34 },
      { wch: 34 },
      { wch: 18 },
      { wch: 18 },
      { wch: 32 },
      { wch: 24 }
    ];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 0, c: 4 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
      { s: { r: 1, c: 4 }, e: { r: 1, c: 6 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
      { s: { r: 2, c: 4 }, e: { r: 2, c: 6 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 6 } }
    ];

    // Style headers
    for (let r = 0; r <= 2; r++) {
      for (let c = 0; c <= 6; c++) {
        const ref = XLSXStyle.utils.encode_cell({ r, c });
        if (ws[ref]) {
          ws[ref].s = {
            font: { bold: r === 0 || c >= 4, sz: r === 0 ? 11 : 10, color: { rgb: '0F172A' } },
            alignment: { horizontal: c >= 4 ? 'right' : 'left', vertical: 'center' }
          };
        }
      }
    }
    const titleRef = XLSXStyle.utils.encode_cell({ r: 4, c: 0 });
    if (ws[titleRef]) {
      ws[titleRef].s = {
        font: { bold: true, sz: 14, color: { rgb: '1E1B4B' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
    const subRef = XLSXStyle.utils.encode_cell({ r: 5, c: 0 });
    if (ws[subRef]) {
      ws[subRef].s = {
        font: { italic: true, sz: 10, color: { rgb: '334155' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
    for (let c = 0; c <= 6; c++) {
      const ref = XLSXStyle.utils.encode_cell({ r: 7, c });
      if (ws[ref]) {
        ws[ref].s = {
          font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1E293B' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: borderThin
        };
      }
    }
    const firstBodyRow = 8;
    const lastBodyRow = firstBodyRow + bodyRows.length - 1;
    for (let r = firstBodyRow; r <= lastBodyRow; r++) {
      for (let c = 0; c <= 6; c++) {
        const ref = XLSXStyle.utils.encode_cell({ r, c });
        if (ws[ref]) {
          ws[ref].s = {
            font: { sz: 10, color: { rgb: '0F172A' } },
            alignment: {
              horizontal: c === 0 || c === 3 || c === 4 ? 'center' : 'left',
              vertical: 'center',
              wrapText: true
            },
            border: borderThin
          };
        }
      }
    }

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'BM-KTTD-02 MasterLog');
    XLSXStyle.writeFile(wb, `BM-KTTD-02_So_Hieu_Chuan_Thiet_Bi_${getLocalDmy().replace(/\//g, '-')}.xlsx`);
  };

  // Filtered lists
  const filteredEquipments = useMemo(() => {
    return equipments.filter(eq => {
      const grp = resolveAssetGroup(eq);
      const meta = getCalibrationMeta(eq, todayStartMs);
      const matchGroup = eqFilterGroup === 'All' || grp === eqFilterGroup;
      const matchStatus = eqFilterStatus === 'All' || eq.status === eqFilterStatus;
      const matchCal =
        eqFilterCal === 'All'
          ? true
          : eqFilterCal === 'passed'
          ? meta.isCompliant && !meta.isOverdue && !meta.isSuspended
          : eqFilterCal === 'due_soon'
          ? meta.isOverdue || meta.isSoon
          : meta.isSuspended;
      const kw = eqSearch.trim().toLowerCase();
      const matchWord =
        !kw ||
        eq.name.toLowerCase().includes(kw) ||
        eq.id.toLowerCase().includes(kw) ||
        (eq.serialNo && eq.serialNo.toLowerCase().includes(kw)) ||
        (eq.measureRange && eq.measureRange.toLowerCase().includes(kw)) ||
        eq.responsiblePerson.toLowerCase().includes(kw) ||
        eq.location.toLowerCase().includes(kw);
      return matchGroup && matchStatus && matchCal && matchWord;
    });
  }, [equipments, eqFilterGroup, eqFilterStatus, eqFilterCal, eqSearch, todayStartMs]);

  const filteredLogs = useMemo(() => {
    return maintenanceLogs.filter(log => {
      const matchType = mLogFilterType === 'All' || log.type === mLogFilterType;
      const kw = mLogSearch.trim().toLowerCase();
      const matchWord =
        !kw ||
        log.equipmentName.toLowerCase().includes(kw) ||
        log.technician.toLowerCase().includes(kw) ||
        log.details.toLowerCase().includes(kw) ||
        (log.calibrationCertificateNo && log.calibrationCertificateNo.toLowerCase().includes(kw));
      return matchType && matchWord;
    });
  }, [maintenanceLogs, mLogFilterType, mLogSearch]);

  const filteredFabJobs = useMemo(() => {
    return fabricationJobs.filter(job => {
      const matchType = fabFilterType === 'All' || job.jobType === fabFilterType;
      const matchStatus = fabFilterStatus === 'All' || job.status === fabFilterStatus;
      const kw = fabSearch.trim().toLowerCase();
      const matchWord =
        !kw ||
        job.id.toLowerCase().includes(kw) ||
        job.title.toLowerCase().includes(kw) ||
        (job.modelName && job.modelName.toLowerCase().includes(kw)) ||
        job.assignee.toLowerCase().includes(kw);
      return matchType && matchStatus && matchWord;
    });
  }, [fabricationJobs, fabFilterType, fabFilterStatus, fabSearch]);

  const filteredIncidents = useMemo(() => {
    return equipmentIncidents.filter(inc => {
      const matchSeverity = incFilterSeverity === 'All' || inc.severity === incFilterSeverity;
      const matchStatus = incFilterStatus === 'All' || inc.status === incFilterStatus;
      const kw = incSearch.trim().toLowerCase();
      const matchWord =
        !kw ||
        inc.equipmentName.toLowerCase().includes(kw) ||
        inc.description.toLowerCase().includes(kw) ||
        (inc.reportedBy && inc.reportedBy.toLowerCase().includes(kw));
      return matchSeverity && matchStatus && matchWord;
    });
  }, [equipmentIncidents, incFilterSeverity, incFilterStatus, incSearch]);

  const modelNameSuggestions = useMemo(
    () => Array.from(new Set(models.map(m => m.name).filter(Boolean))),
    [models]
  );

  return (
    <div className="space-y-4" id="machinery_maintenance_module">
      {/* HEADER SECTION — GỌN GÀNG, ĐƠN GIẢN, ÍT MÀU MÈ */}
      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Thiết bị
              </h2>
              <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                BM-KTTD-02
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">
              CCDC, Thiết bị đo QLCL, Đồ gá & Bảo dưỡng thiết bị
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
          <button
            type="button"
            onClick={() => {
              setNewEq(createInitialNewEq());
              setShowAddEqModal(true);
            }}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer text-white transition"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm thiết bị
          </button>
          <button
            type="button"
            onClick={() => setShowAddLogModal(true)}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer text-slate-700 transition"
          >
            <CheckCircle className="w-3.5 h-3.5 text-slate-600" /> Hiệu chuẩn
          </button>
          <button
            type="button"
            onClick={openCreateFabModal}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer text-slate-700 transition"
          >
            <Hammer className="w-3.5 h-3.5 text-slate-600" /> Đồ gá
          </button>
          <button
            type="button"
            onClick={() => setShowAddIncModal(true)}
            className="px-3 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer text-rose-700 transition"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Báo sự cố
          </button>
          <button
            type="button"
            onClick={handleExportBmKttd02Excel}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer text-slate-700 transition"
            title="Xuất Sổ theo dõi hiệu chuẩn thiết bị BM-KTTD-02 (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" /> Xuất Excel
          </button>
        </div>
      </div>

      {/* METRIC STATISTICS GRID (4 CARDS GỌN) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" id="eq_statistics_bento">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">
              Tổng thiết bị
            </p>
            <h3 className="text-xl font-black text-slate-900">{equipments.length}</h3>
            <p className="text-[11px] text-slate-500 truncate">
              Đo: {equipmentStats.measuringCount} • Đồ gá: {equipmentStats.jigCount} • SX: {equipmentStats.lineOrOqcCount}
            </p>
          </div>
          <Settings className="w-5 h-5 text-slate-400 shrink-0" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">
              Tem hiệu chuẩn
            </p>
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-1.5">
              {equipmentStats.calComplianceRate}%
              <span className="text-[11px] font-bold text-slate-500">
                ({equipmentStats.compliantCount}/{equipments.length})
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 truncate">
              Hạn/Quá hạn: {equipmentStats.dueSoonOrOverdueCount} • Đình chỉ: {equipmentStats.suspendedCount}
            </p>
          </div>
          <Award className="w-5 h-5 text-slate-400 shrink-0" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">
              Đồ gá & Sửa chữa
            </p>
            <h3 className="text-xl font-black text-slate-900">{fabricationJobs.length}</h3>
            <p className="text-[11px] text-slate-500 truncate">
              Đang làm: {equipmentStats.activeFabCount} • Xong: {equipmentStats.doneFabCount}
            </p>
          </div>
          <Hammer className="w-5 h-5 text-slate-400 shrink-0" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">
              Sự cố & Chi phí
            </p>
            <h3 className="text-xl font-black text-slate-900">
              {(equipmentStats.totalCosts / 1000000).toFixed(1)}{' '}
              <span className="text-xs font-semibold text-slate-500">Tr</span>
            </h3>
            <p className="text-[11px] text-slate-500 truncate">
              Sự cố mở: {equipmentStats.activeBreakdownsCount} • Dừng: {equipmentStats.totalDowntime}p
            </p>
          </div>
          <DollarSign className="w-5 h-5 text-slate-400 shrink-0" />
        </div>
      </div>

      {/* 4 SUB-TABS NAVIGATION — ĐỒNG NHẤT, GỌN */}
      <div className="flex flex-wrap gap-1 border border-slate-200 bg-slate-50 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setSubTab('overview')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
            subTab === 'overview'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5" /> Danh mục ({filteredEquipments.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('maintenance')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
            subTab === 'maintenance'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" /> Hiệu chuẩn & Bảo trì ({filteredLogs.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('fabrication')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
            subTab === 'fabrication'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Hammer className="w-3.5 h-3.5" /> Đồ gá & Sửa chữa ({filteredFabJobs.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('incidents')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
            subTab === 'incidents'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Sự cố & Đình chỉ (
          {filteredIncidents.length + suspendedEquipments.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW — DANH MỤC THIẾT BỊ, CCDC & TEM HIỆU CHUẨN (BM-KTTD-02) */}
      {/* ========================================================================= */}
      {subTab === 'overview' && (
        <div className="space-y-4" id="view_overview_equipment">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-2.5 items-center flex-1">
              <div className="relative flex-1 min-w-[220px] max-w-xs">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm mã TB, seri, tên thiết bị, dải đo, người PT..."
                  value={eqSearch}
                  onChange={e => setEqSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none font-medium"
                />
              </div>

              <select
                value={eqFilterGroup}
                onChange={e => setEqFilterGroup(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:border-slate-400 focus:outline-none"
              >
                <option value="All">Nhóm: Tất cả</option>
                <option value="measuring">Thiết bị đo lường QLCL</option>
                <option value="jig_fixture">Đồ gá & Dưỡng kiểm</option>
                <option value="oqc_test">Thiết bị KCS / OQC</option>
                <option value="production_line">Máy dây chuyền SX</option>
              </select>

              <select
                value={eqFilterStatus}
                onChange={e => setEqFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:border-slate-400 focus:outline-none"
              >
                <option value="All">Trạng thái: Tất cả</option>
                <option value="Running">Running (Hoạt động)</option>
                <option value="Stopped">Stopped / Đình chỉ</option>
                <option value="Maintenance">Maintenance (Bảo trì/HC)</option>
                <option value="Under Repair">Under Repair (Đang sửa)</option>
                <option value="Offline">Offline (Dự phòng)</option>
              </select>

              <select
                value={eqFilterCal}
                onChange={e => setEqFilterCal(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:border-slate-400 focus:outline-none"
              >
                <option value="All">Tem HC: Tất cả</option>
                <option value="passed">Đã dán tem ĐẠT</option>
                <option value="due_soon">Sắp hết hạn / Quá hạn</option>
                <option value="suspended">Đang đình chỉ</option>
              </select>

              <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 gap-1 shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition ${
                    viewMode === 'list'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5" /> Bảng
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition ${
                    viewMode === 'grid'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Thẻ
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 font-mono font-bold">
              Hiển thị {filteredEquipments.length} / {equipments.length} thiết bị
            </div>
          </div>

          {viewMode === 'list' ? (
            <div
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              id="machinery_devices_list_mode"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs select-text">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-wider select-none">
                      <th className="p-3.5 w-28">Mã TB / Seri</th>
                      <th className="p-3.5 min-w-[230px]">Tên Thiết Bị & Dải Đo (BM-KTTD-02)</th>
                      <th className="p-3.5 min-w-[140px]">Nhóm Thiết Bị</th>
                      <th className="p-3.5 min-w-[145px]">Tem HC & Trạng Thái</th>
                      <th className="p-3.5 w-32">Sức Khỏe</th>
                      <th className="p-3.5 min-w-[140px]">Vị Trí & Nguồn HC</th>
                      <th className="p-3.5 min-w-[125px]">Phụ Trách</th>
                      <th className="p-3.5 min-w-[135px]">Hạn HC / Bảo Dưỡng</th>
                      <th className="p-3.5 text-right w-44">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredEquipments.map(eq => {
                      const activeInc = equipmentIncidents.find(
                        i => i.equipmentId === eq.id && i.status !== 'Resolved'
                      );
                      const grp = resolveAssetGroup(eq);
                      const grpMeta = ASSET_GROUP_META[grp];
                      const calMeta = getCalibrationMeta(eq, todayStartMs);

                      return (
                        <tr
                          key={eq.id}
                          className={`hover:bg-indigo-50/20 transition-colors ${
                            calMeta.isSuspended || eq.status === 'Under Repair'
                              ? 'bg-rose-50/35'
                              : calMeta.isOverdue
                              ? 'bg-amber-50/35'
                              : ''
                          }`}
                        >
                          <td className="p-3.5 align-top">
                            <span className="font-mono font-black text-slate-800 text-[11px] block select-all">
                              {eq.id}
                            </span>
                            {eq.serialNo && (
                              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                SN: {eq.serialNo}
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 align-top">
                            <div className="flex items-start gap-2.5">
                              {eq.imageUrl ? (
                                <img
                                  src={eq.imageUrl}
                                  className="w-11 h-11 object-cover rounded-lg border border-slate-200 cursor-zoom-in shrink-0 hover:scale-105 transition-transform"
                                  referrerPolicy="no-referrer"
                                  alt={eq.name}
                                  onClick={() => setLocalZoomImage(eq.imageUrl || null)}
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 shrink-0">
                                  <Wrench className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0 space-y-0.5">
                                <div className="font-extrabold text-slate-900 text-[13px] leading-snug">
                                  {eq.name}
                                </div>
                                {eq.measureRange && (
                                  <div className="text-[11px] text-cyan-800 font-semibold">
                                    Dải đo / ĐCX: {eq.measureRange}
                                  </div>
                                )}
                                <div className="text-[11px] text-slate-500 line-clamp-1">
                                  {eq.specifications || 'Chưa ghi nhận thông số kỹ thuật'}
                                </div>
                                {calMeta.isSuspended && eq.suspensionReason && (
                                  <div className="inline-flex items-center gap-1 text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded border border-rose-200">
                                    <Ban className="w-3 h-3 shrink-0" /> Đình chỉ: {eq.suspensionReason}
                                  </div>
                                )}
                                {activeInc && (
                                  <div className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-800 font-black px-2 py-0.5 rounded border border-red-200 animate-pulse">
                                    <AlertTriangle className="w-3 h-3 shrink-0" /> SỰ CỐ: {activeInc.id}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 align-top">
                            <span
                              className={`px-2 py-1 rounded border text-[10px] font-extrabold inline-block leading-tight ${grpMeta.badgeClass}`}
                            >
                              {grpMeta.categoryLabel}
                            </span>
                          </td>

                          <td className="p-3.5 align-top space-y-1">
                            <span
                              className={`px-2 py-0.5 rounded-full font-black text-[10px] border inline-block ${calMeta.badgeClass}`}
                            >
                              {calMeta.statusLabel}
                            </span>
                            <div>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block ${
                                  eq.status === 'Running'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : eq.status === 'Under Repair'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {eq.status}
                              </span>
                            </div>
                          </td>

                          <td className="p-3.5 align-top">
                            <div className="space-y-1 w-24">
                              <div className="flex justify-between items-center text-[10px] font-black text-slate-600">
                                <span>Health</span>
                                <span
                                  className={
                                    eq.healthRate >= 90
                                      ? 'text-emerald-700 font-mono'
                                      : eq.healthRate >= 75
                                      ? 'text-amber-700 font-mono'
                                      : 'text-rose-700 font-mono'
                                  }
                                >
                                  {eq.healthRate}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    eq.healthRate >= 90
                                      ? 'bg-emerald-500'
                                      : eq.healthRate >= 75
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, eq.healthRate))}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 align-top text-[11px] leading-snug">
                            <div className="font-bold text-slate-900">📍 {eq.location || '--'}</div>
                            <div className="text-slate-600 mt-0.5">
                              {eq.calibrationProvider || 'Nội bộ (Master)'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Hãng: {eq.manufacturer || 'DKBike'}
                            </div>
                          </td>

                          <td className="p-3.5 align-top">
                            <span className="font-bold text-slate-900 text-xs block">
                              {eq.responsiblePerson || defaultHungName}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {eq.maintainFrequency}
                            </span>
                          </td>

                          <td className="p-3.5 align-top text-[11px] leading-snug">
                            <div className="font-mono font-bold text-slate-900">
                              {formatDateStrVi(eq.nextCalibrationDate || eq.nextMaintenanceDate)}
                            </div>
                            <div
                              className={`text-[10px] font-extrabold mt-0.5 ${
                                calMeta.isSuspended || calMeta.isOverdue
                                  ? 'text-rose-700'
                                  : calMeta.isSoon
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {calMeta.dueText}
                            </div>
                            {(eq.lastCalibrationDate || eq.lastMaintenanceDate) && (
                              <div className="text-[10px] text-slate-500">
                                Gần nhất: {formatDateStrVi(eq.lastCalibrationDate || eq.lastMaintenanceDate)}
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 align-top text-right">
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleQuickPassCalibration(eq)}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded transition cursor-pointer"
                                title="Xác nhận & Dán tem HC ĐẠT (cập nhật chu kỳ kế tiếp)"
                              >
                                <Award className="w-3.5 h-3.5" />
                              </button>
                              {calMeta.isSuspended ? (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreEquipment(eq)}
                                  className="p-1.5 text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded transition cursor-pointer"
                                  title="Khôi phục sử dụng thiết bị"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSuspendReasonInput(eq.suspensionReason || '');
                                    setSuspendTargetEq(eq);
                                  }}
                                  className="p-1.5 text-amber-700 hover:bg-amber-50 border border-amber-200 rounded transition cursor-pointer"
                                  title="Tạm đình chỉ sử dụng (Quyền IV.3 - Đoàn Anh Hùng)"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setEditingEq(eq)}
                                className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 rounded transition cursor-pointer"
                                title="Sửa thông số thiết bị"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEquipment(eq.id, eq.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded transition cursor-pointer"
                                title="Xóa thiết bị"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" id="machinery_devices_grid">
              {filteredEquipments.map(eq => {
                const activeInc = equipmentIncidents.find(
                  i => i.equipmentId === eq.id && i.status !== 'Resolved'
                );
                const grp = resolveAssetGroup(eq);
                const grpMeta = ASSET_GROUP_META[grp];
                const calMeta = getCalibrationMeta(eq, todayStartMs);

                return (
                  <div
                    key={eq.id}
                    className={`bg-white rounded-2xl border shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition ${
                      calMeta.isSuspended || eq.status === 'Under Repair'
                        ? 'border-rose-300 bg-rose-50/15'
                        : calMeta.isOverdue
                        ? 'border-amber-300'
                        : 'border-slate-200'
                    }`}
                  >
                    <div
                      className={`h-1.5 w-full ${
                        calMeta.isSuspended || eq.status === 'Under Repair'
                          ? 'bg-rose-500'
                          : calMeta.isOverdue || eq.status === 'Maintenance'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    ></div>

                    <div
                      onClick={() => eq.imageUrl && setLocalZoomImage(eq.imageUrl)}
                      className="relative h-40 bg-slate-900 border-b border-slate-100 flex items-center justify-center overflow-hidden group cursor-zoom-in"
                    >
                      {eq.imageUrl ? (
                        <img
                          src={eq.imageUrl}
                          alt={eq.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-1">
                          <Wrench className="w-8 h-8 stroke-1" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Chưa có ảnh</span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="bg-slate-900/85 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded border border-slate-700">
                          {grpMeta.categoryLabel}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${calMeta.badgeClass}`}>
                          {calMeta.statusLabel}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px] font-mono font-bold text-slate-500">
                          <span>
                            ID: {eq.id} {eq.serialNo ? `• SN: ${eq.serialNo}` : ''}
                          </span>
                          <span className="font-sans font-extrabold text-slate-700">{eq.status}</span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{eq.name}</h4>
                        {eq.measureRange && (
                          <p className="text-xs font-bold text-cyan-800">Dải đo: {eq.measureRange}</p>
                        )}
                      </div>

                      <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700">
                        <span className="text-[10px] text-slate-500 font-black uppercase block mb-0.5">
                          Thông số & Nguồn HC
                        </span>
                        <p className="font-medium line-clamp-2">{eq.specifications || '--'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
                        <div>
                          <span className="text-[10px] text-slate-500 font-black uppercase block">📍 Vị trí</span>
                          <span className="font-bold text-slate-800 truncate block">{eq.location}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-black uppercase block">👤 Phụ trách</span>
                          <span className="font-bold text-slate-800 truncate block">{eq.responsiblePerson}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-black uppercase block">📅 Hạn HC kế tiếp</span>
                          <span className="font-bold text-slate-900 block">
                            {formatDateStrVi(eq.nextCalibrationDate || eq.nextMaintenanceDate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-black uppercase block">⏱️ Tình trạng hạn</span>
                          <span
                            className={`font-black block ${
                              calMeta.isOverdue || calMeta.isSuspended
                                ? 'text-rose-700'
                                : calMeta.isSoon
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {calMeta.dueText}
                          </span>
                        </div>
                      </div>

                      {calMeta.isSuspended && eq.suspensionReason && (
                        <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-xs text-rose-800 font-semibold">
                          ⛔ Đình chỉ (IV.3): {eq.suspensionReason}
                        </div>
                      )}
                      {activeInc && (
                        <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl text-xs text-red-800 font-semibold">
                          ⚠️ Sự cố {activeInc.id}: {activeInc.description}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickPassCalibration(eq)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5" /> Dán tem ĐẠT
                      </button>
                      <div className="flex items-center gap-1">
                        {calMeta.isSuspended ? (
                          <button
                            type="button"
                            onClick={() => handleRestoreEquipment(eq)}
                            className="p-1.5 text-indigo-700 hover:bg-indigo-100 rounded cursor-pointer"
                            title="Khôi phục"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSuspendReasonInput(eq.suspensionReason || '');
                              setSuspendTargetEq(eq);
                            }}
                            className="p-1.5 text-amber-700 hover:bg-amber-100 rounded cursor-pointer"
                            title="Tạm đình chỉ sử dụng"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingEq(eq)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEquipment(eq.id, eq.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredEquipments.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <Settings className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600">
                Chưa có thiết bị / CCDC đo lường nào khớp với điều kiện lọc!
              </p>
              <button
                type="button"
                onClick={() => {
                  setNewEq(createInitialNewEq());
                  setShowAddEqModal(true);
                }}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-500"
              >
                + Khai báo Thiết bị / CCDC đầu tiên
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SỔ HIỆU CHUẨN & BẢO DƯỠNG ĐỊNH KỲ (BM-KTTD-02) */}
      {/* ========================================================================= */}
      {subTab === 'maintenance' && (
        <div className="space-y-4" id="view_maintenance_logs">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm thiết bị, số chứng chỉ HC, kỹ sư..."
                  value={mLogSearch}
                  onChange={e => setMLogSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
              <select
                value={mLogFilterType}
                onChange={e => setMLogFilterType(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="All">🛠️ Tất cả loại hình</option>
                <option value="Hiệu chuẩn">Hiệu chuẩn / Kiểm định (BM-KTTD-02)</option>
                <option value="Định kỳ">Bảo dưỡng định kỳ</option>
                <option value="Đột xuất">Sửa chữa đột xuất</option>
                <option value="Nâng cấp">Nâng cấp / Cải tiến</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowAddLogModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg gap-1.5 cursor-pointer flex items-center transition"
            >
              <Plus className="w-3.5 h-3.5" /> Ghi nhận
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-black text-[10px] tracking-wider">
                    <th className="p-3.5 w-24">Mã Log</th>
                    <th className="p-3.5 min-w-[200px]">Thiết Bị / CCDC</th>
                    <th className="p-3.5 w-28">Ngày Làm</th>
                    <th className="p-3.5 w-36">Người Thực Hiện</th>
                    <th className="p-3.5 w-28">Loại Hình</th>
                    <th className="p-3.5 min-w-[220px]">Nội Dung & Chứng Chỉ HC</th>
                    <th className="p-3.5">Kết Quả / Hạn Kế</th>
                    <th className="p-3.5 w-28 text-right">Chi Phí (VNĐ)</th>
                    <th className="p-3.5 w-16 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-indigo-700">{log.id}</td>
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900">{log.equipmentName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">ID: {log.equipmentId}</div>
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-slate-600">{log.maintenanceDate}</td>
                      <td className="p-3.5">
                        <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[11px]">
                          {log.technician}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-black text-[10px] border uppercase ${
                            log.type === 'Hiệu chuẩn'
                              ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
                              : log.type === 'Định kỳ'
                              ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                              : log.type === 'Nâng cấp'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td className="p-3.5 max-w-sm leading-relaxed text-slate-700">
                        <div>{log.details}</div>
                        {log.calibrationCertificateNo && (
                          <div className="text-[11px] font-mono text-cyan-800 font-bold mt-0.5">
                            Số tem/CN: {log.calibrationCertificateNo}
                          </div>
                        )}
                        {log.replacedParts && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5">
                            Vật tư: {log.replacedParts}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        {log.calibrationResult && (
                          <span
                            className={`px-2 py-0.5 rounded font-black text-[10px] border inline-block mb-1 ${
                              log.calibrationResult === 'ĐẠT'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border-rose-200'
                            }`}
                          >
                            {log.calibrationResult}
                          </span>
                        )}
                        {log.nextCalibrationDate && (
                          <div className="text-[11px] font-mono font-bold text-slate-700">
                            Hạn kế: {log.nextCalibrationDate}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-black text-right text-emerald-700">
                        {(log.cost || 0).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            guardAction(() => {
                              if (window.confirm('Xác nhận xóa bản ghi nhật ký này?')) {
                                setMaintenanceLogs(prev => prev.filter(l => l.id !== log.id));
                              }
                            });
                          }}
                          className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-500 italic">
                        Chưa ghi nhận nhật ký hiệu chuẩn / bảo dưỡng nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GIA CÔNG ĐỒ GÁ, LINH KIỆN MẪU & SỬA CHỮA CHUYÊN SÂU (NV-KTTĐ-05) */}
      {/* ========================================================================= */}
      {subTab === 'fabrication' && (
        <div className="space-y-4" id="view_fabrication_jobs">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-2.5 items-center flex-1">
              <div className="relative flex-1 min-w-[220px] max-w-xs">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm mã phiếu, tên đồ gá, dòng xe, người làm..."
                  value={fabSearch}
                  onChange={e => setFabSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-violet-500 focus:bg-white"
                />
              </div>

              <select
                value={fabFilterType}
                onChange={e => setFabFilterType(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="All">🔨 Tất cả hạng mục kỹ thuật</option>
                <option value="Chế tạo đồ gá">Chế tạo đồ gá chuyên dụng</option>
                <option value="Sửa chữa đồ gá">Sửa chữa / hiệu chỉnh đồ gá</option>
                <option value="Gia công linh kiện mẫu">Gia công linh kiện mẫu (R&D/PTSP)</option>
                <option value="Sửa chữa chuyên sâu">Sửa chữa chuyên sâu (IC/Động cơ/Điện)</option>
                <option value="Tinh chỉnh xe lỗi xưởng">Phối hợp Xưởng tinh chỉnh xe lỗi</option>
              </select>

              <select
                value={fabFilterStatus}
                onChange={e => setFabFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="All">🚦 Tất cả tiến độ</option>
                <option value="Chờ thực hiện">Chờ thực hiện</option>
                <option value="Đang thực hiện">Đang thực hiện</option>
                <option value="Hoàn thành & Bàn giao">Hoàn thành & Bàn giao</option>
                <option value="Tạm dừng">Tạm dừng</option>
              </select>
            </div>

            <button
              type="button"
              onClick={openCreateFabModal}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg gap-1.5 cursor-pointer flex items-center transition"
            >
              <Plus className="w-3.5 h-3.5" /> Tạo phiếu
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-black text-[10px] tracking-wider">
                    <th className="p-3.5 w-24">Mã Phiếu</th>
                    <th className="p-3.5 min-w-[260px]">Loại & Nội Dung Kỹ Thuật (NV-KTTĐ-05)</th>
                    <th className="p-3.5 min-w-[150px]">Đơn Vị YC / Dòng Xe</th>
                    <th className="p-3.5 min-w-[130px]">Phụ Trách</th>
                    <th className="p-3.5 min-w-[135px]">Tiến Độ / Hạn</th>
                    <th className="p-3.5 w-32 text-center">Trạng Thái</th>
                    <th className="p-3.5 w-36 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredFabJobs.map(job => {
                    const isDone = job.status === 'Hoàn thành & Bàn giao';
                    const parsedDue = parseFlexibleDate(job.dueDate);
                    const isOverdue = !isDone && parsedDue && parsedDue.getTime() < todayStartMs;
                    return (
                      <tr key={job.id} className={`hover:bg-violet-50/20 transition ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                        <td className="p-3.5 align-top font-mono font-black text-violet-700">
                          {job.id}
                          <span
                            className={`mt-1 block w-fit px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                              job.priority === 'Khẩn cấp'
                                ? 'bg-rose-100 text-rose-800'
                                : job.priority === 'Cao'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {job.priority}
                          </span>
                        </td>
                        <td className="p-3.5 align-top space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded bg-violet-100 text-violet-800 font-black text-[10px] uppercase">
                            {job.jobType}
                          </span>
                          <div className="font-extrabold text-slate-900 text-[13px]">{job.title}</div>
                          {job.technicalNote && (
                            <p className="text-[11px] text-slate-600 leading-snug">{job.technicalNote}</p>
                          )}
                          {job.resultNote && (
                            <p className="text-[11px] text-emerald-700 font-semibold">
                              ✔ Kết quả bàn giao: {job.resultNote}
                            </p>
                          )}
                          {job.images && job.images.length > 0 && (
                            <div className="flex gap-1.5 pt-1">
                              {job.images.map((src, idx) => (
                                <img
                                  key={idx}
                                  src={src}
                                  alt={`Ảnh ${idx + 1}`}
                                  onClick={() => setLocalZoomImage(src)}
                                  className="w-10 h-10 object-cover rounded border border-slate-200 cursor-zoom-in hover:scale-105 transition"
                                />
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 align-top text-xs">
                          <div className="font-bold text-slate-900">{job.requestDept}</div>
                          {job.modelName && (
                            <div className="text-[11px] font-bold text-indigo-700 mt-0.5">
                              Xe: {job.modelName}
                            </div>
                          )}
                          {job.requester && (
                            <div className="text-[10px] text-slate-500">YC: {job.requester}</div>
                          )}
                        </td>
                        <td className="p-3.5 align-top font-bold text-slate-900">{job.assignee}</td>
                        <td className="p-3.5 align-top text-[11px]">
                          <div>Nhận: {formatDateStrVi(job.requestDate)}</div>
                          <div className={`font-bold ${isOverdue ? 'text-rose-700' : 'text-slate-900'}`}>
                            Hạn: {formatDateStrVi(job.dueDate)} {isOverdue ? '(Quá hạn)' : ''}
                          </div>
                          {job.completedDate && (
                            <div className="text-emerald-700 font-bold">
                              Xong: {formatDateStrVi(job.completedDate)}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 align-top text-center">
                          <span
                            className={`px-2 py-1 rounded-full font-black text-[10px] border inline-block ${
                              job.status === 'Hoàn thành & Bàn giao'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : job.status === 'Đang thực hiện'
                                ? 'bg-violet-100 text-violet-800 border-violet-200'
                                : job.status === 'Tạm dừng'
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="p-3.5 align-top text-right">
                          <div className="flex items-center justify-end gap-1">
                            {job.status !== 'Hoàn thành & Bàn giao' && (
                              <button
                                type="button"
                                onClick={() => handleQuickCompleteFabJob(job)}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded cursor-pointer"
                                title="Xác nhận Hoàn thành & Bàn giao"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditFabModal(job)}
                              className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 rounded cursor-pointer"
                              title="Chỉnh sửa phiếu"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFabJob(job.id, job.title)}
                              className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded cursor-pointer"
                              title="Xóa phiếu"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredFabJobs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-500">
                        <Hammer className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold">
                          Chưa có phiếu Gia công đồ gá / Linh kiện mẫu / Sửa chữa chuyên sâu nào.
                        </p>
                        <button
                          type="button"
                          onClick={openCreateFabModal}
                          className="mt-3 px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-violet-500"
                        >
                          + Tạo Phiếu Đầu Tiên
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SỰ CỐ THIẾT BỊ, ĐÌNH CHỈ & PHỤC HỒI */}
      {/* ========================================================================= */}
      {subTab === 'incidents' && (
        <div className="space-y-4" id="view_equipment_incidents">
          {suspendedEquipments.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Thiết bị đang bị Tạm Đình Chỉ Sử Dụng theo Quyền IV.3 ({suspendedEquipments.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {suspendedEquipments.map(eq => (
                  <div
                    key={eq.id}
                    className="bg-white border border-rose-200 rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="text-xs space-y-0.5 min-w-0">
                      <div className="font-extrabold text-slate-900 truncate">
                        [{eq.id}] {eq.name}
                      </div>
                      <div className="text-rose-700 font-semibold">
                        Lý do: {eq.suspensionReason || 'Quá hạn / Sai lệch đo lường'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Vị trí: {eq.location} • Phụ trách: {eq.responsiblePerson}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreEquipment(eq)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" /> Khôi phục
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm sự cố thiết bị, người báo cáo..."
                  value={incSearch}
                  onChange={e => setIncSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <select
                value={incFilterSeverity}
                onChange={e => setIncFilterSeverity(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="All">🔴 Mọi mức độ</option>
                <option value="Critical">Critical (Khẩn cấp)</option>
                <option value="Warning">Warning (Cảnh báo)</option>
                <option value="Minor">Minor (Nhẹ)</option>
              </select>

              <select
                value={incFilterStatus}
                onChange={e => setIncFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="All">🚦 Mọi trạng thái</option>
                <option value="Pending">Pending (Chờ xử lý)</option>
                <option value="Repairing">Repairing (Đang sửa)</option>
                <option value="Resolved">Resolved (Đã khắc phục)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowAddIncModal(true)}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg gap-1.5 cursor-pointer flex items-center transition"
            >
              <Plus className="w-3.5 h-3.5" /> Báo sự cố
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-black text-[10px] tracking-wider">
                    <th className="p-3.5 w-24">Mã SC</th>
                    <th className="p-3.5 w-48">Thiết Bị</th>
                    <th className="p-3.5 w-24">Ngày</th>
                    <th className="p-3.5 w-28">Người Báo</th>
                    <th className="p-3.5 w-24">Mức Độ</th>
                    <th className="p-3.5 w-20 text-center">Dừng (p)</th>
                    <th className="p-3.5">Hiện Tượng & Khắc Phục</th>
                    <th className="p-3.5 w-24 text-right">Chi Phí</th>
                    <th className="p-3.5 w-24 text-center">Trạng Thái</th>
                    <th className="p-3.5 w-28 text-center">Xử Lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredIncidents.map(inc => (
                    <tr
                      key={inc.id}
                      className={inc.status !== 'Resolved' && inc.severity === 'Critical' ? 'bg-rose-50/25' : ''}
                    >
                      <td className="p-3.5 font-mono font-black text-slate-800">{inc.id}</td>
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900">{inc.equipmentName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">ID: {inc.equipmentId}</div>
                      </td>
                      <td className="p-3.5 font-mono">{inc.incidentDate}</td>
                      <td className="p-3.5 font-bold">{inc.reportedBy || '--'}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            inc.severity === 'Critical'
                              ? 'bg-red-600 text-white'
                              : inc.severity === 'Warning'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {inc.severity}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-black text-center">{inc.downtimeMinutes || 0}p</td>
                      <td className="p-3.5 text-xs leading-relaxed">
                        <p className="font-semibold text-slate-900">{inc.description}</p>
                        {inc.status === 'Resolved' && (
                          <div className="mt-1.5 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200 space-y-0.5 text-[11px]">
                            <p className="text-emerald-800 font-bold">
                              ✔ Đã khắc phục ({inc.technician} • {inc.resolvedDate})
                            </p>
                            <p>
                              <strong>Nguyên nhân:</strong> {inc.rootCause}
                            </p>
                            <p>
                              <strong>Biện pháp:</strong> {inc.repairAction}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-right text-rose-700">
                        {inc.repairCost ? `${inc.repairCost.toLocaleString('vi-VN')}đ` : '-'}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-black text-[10px] uppercase border ${
                            inc.status === 'Resolved'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : inc.status === 'Repairing'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-rose-600 text-white border-rose-700'
                          }`}
                        >
                          {inc.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {inc.status !== 'Resolved' && (
                            <button
                              type="button"
                              onClick={() => {
                                setResolveTechnician(defaultHungName);
                                setResolveDowntime(inc.downtimeMinutes || 30);
                                setResolveRepairCost(0);
                                setShowResolveIncModal(inc);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded cursor-pointer uppercase"
                            >
                              Nghiệm Thu
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteIncident(inc.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 text-[11px] cursor-pointer"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredIncidents.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-10 text-center text-slate-500 italic">
                        Không có sự cố thiết bị nào trong danh sách.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT EQUIPMENT (ĐẦY ĐỦ TRƯỜNG BM-KTTD-02) */}
      {/* ========================================================================= */}
      {(showAddEqModal || editingEq) && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden text-xs">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black">
                  {editingEq
                    ? `Hiệu Chỉnh Thiết Bị / CCDC [${editingEq.id}]`
                    : 'Khai Báo Thiết Bị / CCDC Đo Lường Mới (BM-KTTD-02)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddEqModal(false);
                  setEditingEq(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const isEdit = Boolean(editingEq);
              const formState = editingEq || newEq;
              const setFormState = (patch: Partial<EquipmentItem>) => {
                if (isEdit) {
                  setEditingEq(prev => (prev ? { ...prev, ...patch } : null));
                } else {
                  setNewEq(prev => ({ ...prev, ...patch }));
                }
              };
              const activeGroup = resolveAssetGroup(formState);

              return (
                <form
                  onSubmit={isEdit ? handleEditEquipmentSubmit : handleAddEquipment}
                  className="p-5 space-y-3.5 max-h-[82vh] overflow-y-auto"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] text-slate-700 font-black uppercase">
                        Tên Thiết Bị / Dụng Cụ Đo *
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Thước cặp điện tử Mitutoyo / Máy thử tải động cơ..."
                        value={formState.name || ''}
                        onChange={e => setFormState({ name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 font-black uppercase">Số Seri / Mã Nội Bộ</label>
                      <input
                        type="text"
                        placeholder="VD: SN-MT-2026"
                        value={formState.serialNo || ''}
                        onChange={e => setFormState({ serialNo: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 font-black uppercase">Nhóm Thiết Bị</label>
                      <select
                        value={activeGroup}
                        onChange={e => {
                          const g = e.target.value as AssetGroupKey;
                          const gMeta = ASSET_GROUP_META[g];
                          setFormState({
                            assetGroup: g,
                            category: gMeta.categoryLabel,
                            responsiblePerson:
                              !isEdit || !formState.responsiblePerson
                                ? gMeta.defaultOwner
                                : formState.responsiblePerson
                          });
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                      >
                        <option value="measuring">Thiết bị đo lường & CCDC QLCL</option>
                        <option value="jig_fixture">Đồ gá & Dưỡng kiểm</option>
                        <option value="oqc_test">Thiết bị KCS / OQC / PTSP</option>
                        <option value="production_line">Máy móc Dây chuyền SX</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 font-black uppercase">Trạng Thái Vận Hành</label>
                      <select
                        value={formState.status || 'Running'}
                        onChange={e =>
                          setFormState({ status: e.target.value as EquipmentItem['status'] })
                        }
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                      >
                        <option value="Running">Running (Hoạt động tốt)</option>
                        <option value="Stopped">Stopped (Tạm dừng / Đình chỉ)</option>
                        <option value="Maintenance">Maintenance (Đang bảo trì/HC)</option>
                        <option value="Under Repair">Under Repair (Sửa sự cố)</option>
                        <option value="Offline">Offline (Dự phòng)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 font-black uppercase">Tình Trạng Tem HC</label>
                      <select
                        value={formState.calibrationStatus || 'Đã dán tem ĐẠT'}
                        onChange={e =>
                          setFormState({
                            calibrationStatus: e.target.value as EquipmentItem['calibrationStatus']
                          })
                        }
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                      >
                        <option value="Đã dán tem ĐẠT">Đã dán tem ĐẠT</option>
                        <option value="Sắp đến hạn HC">Sắp đến hạn HC</option>
                        <option value="Quá hạn HC">Quá hạn HC</option>
                        <option value="Chưa hiệu chuẩn">Chưa hiệu chuẩn</option>
                        <option value="Đình chỉ sử dụng">Đình chỉ sử dụng</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 font-black uppercase">
                        Dải Đo & Độ Chính Xác (BM-KTTD-02)
                      </label>
                      <input
                        type="text"
                        placeholder="VD: 0-150mm (±0.02mm) / 0-100V (±0.5%)"
                        value={formState.measureRange || ''}
                        onChange={e => setFormState({ measureRange: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 font-black uppercase">
                        Đơn Vị / Phương Pháp Hiệu Chuẩn
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Nội bộ (Master chuẩn) / Quatest 1"
                        value={formState.calibrationProvider || ''}
                        onChange={e => setFormState({ calibrationProvider: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 font-black uppercase">Ngày HC Gần Nhất</label>
                      <input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        value={formState.lastCalibrationDate || formState.lastMaintenanceDate || ''}
                        onChange={e =>
                          setFormState({
                            lastCalibrationDate: e.target.value,
                            lastMaintenanceDate: e.target.value
                          })
                        }
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 font-black uppercase">Ngày HC Kế Tiếp *</label>
                      <input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        value={formState.nextCalibrationDate || formState.nextMaintenanceDate || ''}
                        onChange={e =>
                          setFormState({
                            nextCalibrationDate: e.target.value,
                            nextMaintenanceDate: e.target.value
                          })
                        }
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 font-black uppercase">Chu Kỳ Định Kỳ</label>
                      <select
                        value={formState.maintainFrequency || 'Định kỳ hằng năm'}
                        onChange={e => {
                          const freq = e.target.value as EquipmentItem['maintainFrequency'];
                          const baseStr = formState.lastCalibrationDate || formState.lastMaintenanceDate;
                          const nextStr = addCycleToDateStr(baseStr, freq);
                          setFormState({
                            maintainFrequency: freq,
                            nextCalibrationDate: nextStr,
                            nextMaintenanceDate: nextStr
                          });
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                      >
                        <option value="Hằng tuần">Hằng tuần</option>
                        <option value="Hằng tháng">Hằng tháng</option>
                        <option value="Hằng quý">Hằng quý</option>
                        <option value="Định kỳ hằng năm">Định kỳ hằng năm</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 font-black uppercase">Vị Trí Lắp Đặt / Lưu Giữ *</label>
                      <input
                        type="text"
                        placeholder="VD: Phòng QLCL / Trạm OQC 1"
                        value={formState.location || ''}
                        onChange={e => setFormState({ location: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 font-black uppercase">Người Phụ Trách</label>
                      <select
                        value={formState.responsiblePerson || defaultHungName}
                        onChange={e => setFormState({ responsiblePerson: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                      >
                        {!staff.some(s => s.name === (formState.responsiblePerson || defaultHungName)) && (
                          <option value={formState.responsiblePerson || defaultHungName}>
                            {formState.responsiblePerson || defaultHungName}
                          </option>
                        )}
                        {staff.map(s => (
                          <option key={s.name} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 font-black uppercase">Chỉ Số Khỏe (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formState.healthRate ?? 100}
                        onChange={e => setFormState({ healthRate: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 font-black uppercase">Hãng Sản Xuất</label>
                      <input
                        type="text"
                        placeholder="VD: Mitutoyo, Fluke, DKBike..."
                        value={formState.manufacturer || ''}
                        onChange={e => setFormState({ manufacturer: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-700 font-black uppercase">Năm SX</label>
                      <input
                        type="number"
                        min={1990}
                        max={2035}
                        value={formState.manufactureYear || now.getFullYear()}
                        onChange={e => setFormState({ manufactureYear: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-700 font-black uppercase">Thông Số Kỹ Thuật & Ghi Chú</label>
                    <textarea
                      rows={2}
                      placeholder="Thông số dải áp suất, điện áp định mức, yêu cầu bảo quản..."
                      value={formState.specifications || ''}
                      onChange={e => setFormState({ specifications: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-700 font-black uppercase">
                      Hình Ảnh Thiết Bị (Tự động nén &lt; 30KB)
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition ${
                        (isEdit ? isEditDragOver : isNewDragOver)
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-300 hover:border-indigo-400 bg-slate-50'
                      }`}
                      onDragOver={e => {
                        e.preventDefault();
                        isEdit ? setIsEditDragOver(true) : setIsNewDragOver(true);
                      }}
                      onDragLeave={() => (isEdit ? setIsEditDragOver(false) : setIsNewDragOver(false))}
                      onDrop={e => {
                        e.preventDefault();
                        isEdit ? setIsEditDragOver(false) : setIsNewDragOver(false);
                        if (e.dataTransfer.files?.[0]) handleEquipmentImageUpload(e.dataTransfer.files[0], isEdit);
                      }}
                      onClick={() => document.getElementById('eq_modal_img_input')?.click()}
                    >
                      <input
                        id="eq_modal_img_input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files?.[0]) handleEquipmentImageUpload(e.target.files[0], isEdit);
                        }}
                      />
                      {formState.imageUrl ? (
                        <div className="relative inline-block">
                          <img src={formState.imageUrl} alt="Preview" className="h-24 object-contain rounded border" />
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setFormState({ imageUrl: '' });
                            }}
                            className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-slate-500 flex items-center justify-center gap-2 py-2">
                          <Camera className="w-4 h-4" /> Kéo thả hoặc bấm để tải ảnh (nén tối ưu &lt; 30KB)
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddEqModal(false);
                        setEditingEq(null);
                      }}
                      className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold cursor-pointer"
                    >
                      {isEdit ? 'Lưu Cập Nhật' : 'Lưu Thiết Bị Mới'}
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1.8: SUSPEND EQUIPMENT REASON (QUYỀN IV.3 - ĐOÀN ANH HÙNG) */}
      {/* ========================================================================= */}
      {suspendTargetEq && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-rose-200 overflow-hidden text-xs">
            <div className="bg-rose-900 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-300" />
                <h3 className="text-sm font-black">Tạm Đình Chỉ Sử Dụng Thiết Bị (Quyền IV.3)</h3>
              </div>
              <button
                type="button"
                onClick={() => setSuspendTargetEq(null)}
                className="text-rose-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmSuspend} className="p-5 space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                <div className="font-black">[{suspendTargetEq.id}] {suspendTargetEq.name}</div>
                <p className="mt-1 text-[11px] leading-relaxed">
                  Theo mục IV.3 Bản giao nhiệm vụ BG-NV-08, khi phát hiện CCDC/thiết bị đo lường sai lệch, hỏng hóc hoặc quá hạn hiệu chuẩn phải tạm đình chỉ ngay để tránh đo sai gây lọt lỗi.
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-black uppercase">Lý Do Đình Chỉ *</label>
                <textarea
                  rows={3}
                  placeholder="Ví dụ: Lệch điểm 0 khi kiểm tra với căn mẫu Master / Quá hạn tem hiệu chuẩn..."
                  value={suspendReasonInput}
                  onChange={e => setSuspendReasonInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSuspendTargetEq(null)}
                  className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 font-bold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold cursor-pointer"
                >
                  Xác Nhận Đình Chỉ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD MAINTENANCE / CALIBRATION LOG */}
      {/* ========================================================================= */}
      {showAddLogModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden text-xs">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black">Nghiệm Thu Hiệu Chuẩn / Bảo Dưỡng Thiết Bị</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLogModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMaintenanceLog} className="p-5 space-y-3.5 max-h-[82vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-black uppercase">Chọn Thiết Bị / CCDC *</label>
                <select
                  value={newLog.equipmentId}
                  onChange={e => {
                    const selected = equipments.find(eq => eq.id === e.target.value);
                    setNewLog(prev => ({
                      ...prev,
                      equipmentId: e.target.value,
                      nextCalibrationDate: selected
                        ? addCycleToDateStr(getLocalDmy(), selected.maintainFrequency)
                        : prev.nextCalibrationDate
                    }));
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                  required
                >
                  <option value="">-- Chọn thiết bị --</option>
                  {equipments.map(item => (
                    <option key={item.id} value={item.id}>
                      [{item.id}] {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">Loại Hình</label>
                  <select
                    value={newLog.type}
                    onChange={e => setNewLog({ ...newLog, type: e.target.value as MaintenanceLog['type'] })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="Hiệu chuẩn">Hiệu chuẩn / Kiểm định (BM-KTTD-02)</option>
                    <option value="Định kỳ">Bảo dưỡng định kỳ</option>
                    <option value="Đột xuất">Sửa chữa đột xuất</option>
                    <option value="Nâng cấp">Nâng cấp thiết bị</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">Người Thực Hiện</label>
                  <select
                    value={newLog.technician}
                    onChange={e => setNewLog({ ...newLog, technician: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                  >
                    {!staff.some(s => s.name === (newLog.technician || defaultHungName)) && (
                      <option value={newLog.technician || defaultHungName}>
                        {newLog.technician || defaultHungName}
                      </option>
                    )}
                    {staff.map(s => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {newLog.type === 'Hiệu chuẩn' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl">
                  <div className="space-y-1">
                    <label className="text-[11px] text-cyan-900 font-black uppercase">
                      Số Chứng Chỉ / Mã Tem HC
                    </label>
                    <input
                      type="text"
                      placeholder="VD: TEM-QLCL-2026-01"
                      value={newLog.calibrationCertificateNo || ''}
                      onChange={e => setNewLog({ ...newLog, calibrationCertificateNo: e.target.value })}
                      className="w-full bg-white border border-cyan-300 rounded-lg px-3 py-1.5 text-slate-900 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-cyan-900 font-black uppercase">Kết Quả Hiệu Chuẩn</label>
                    <select
                      value={newLog.calibrationResult || 'ĐẠT'}
                      onChange={e =>
                        setNewLog({
                          ...newLog,
                          calibrationResult: e.target.value as MaintenanceLog['calibrationResult']
                        })
                      }
                      className="w-full bg-white border border-cyan-300 rounded-lg px-3 py-1.5 text-slate-900 font-bold"
                    >
                      <option value="ĐẠT">✅ ĐẠT — Dán tem & Cập nhật hạn kế</option>
                      <option value="KHÔNG ĐẠT - ĐÌNH CHỈ">⛔ KHÔNG ĐẠT — Tự động đình chỉ (IV.3)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">
                    Ngày HC / Bảo Dưỡng Kế Tiếp
                  </label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY (tự cộng theo chu kỳ)"
                    value={newLog.nextCalibrationDate || ''}
                    onChange={e => setNewLog({ ...newLog, nextCalibrationDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">Chi Phí Phát Sinh (VNĐ)</label>
                  <input
                    type="number"
                    value={newLog.cost || 0}
                    onChange={e => setNewLog({ ...newLog, cost: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-black uppercase">Vật Tư / Phụ Kiện Thay Thế</label>
                <input
                  type="text"
                  placeholder="VD: Pin 1.5V, dầu bôi trơn, tem kiểm định..."
                  value={newLog.replacedParts || ''}
                  onChange={e => setNewLog({ ...newLog, replacedParts: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-black uppercase">Nội Dung Nghiệm Thu *</label>
                <textarea
                  rows={3}
                  placeholder="Ghi nhận sai số thực tế so với mẫu chuẩn, hạng mục vệ sinh bảo dưỡng..."
                  value={newLog.details || ''}
                  onChange={e => setNewLog({ ...newLog, details: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddLogModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 font-bold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold cursor-pointer"
                >
                  Lưu Biên Bản Nghiệm Thu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2.5: CREATE / EDIT FABRICATION & REPAIR JOB (NV-KTTĐ-05) */}
      {/* ========================================================================= */}
      {showFabModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden text-xs">
            <div className="bg-violet-950 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Hammer className="w-5 h-5 text-violet-300" />
                <h3 className="text-sm font-black">
                  {editingFabJob
                    ? `Cập Nhật Phiếu [${editingFabJob.id}]`
                    : 'Phiếu Gia Công Đồ Gá, Linh Kiện Mẫu & Sửa Chữa Chuyên Sâu (NV-KTTĐ-05)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowFabModal(false);
                  setEditingFabJob(null);
                }}
                className="text-violet-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFabJob} className="p-5 space-y-3.5 max-h-[82vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">Loại Công Việc</label>
                  <select
                    value={fabForm.jobType || 'Chế tạo đồ gá'}
                    onChange={e =>
                      setFabForm({
                        ...fabForm,
                        jobType: e.target.value as FabricationRepairJob['jobType']
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="Chế tạo đồ gá">Chế tạo đồ gá</option>
                    <option value="Sửa chữa đồ gá">Sửa chữa đồ gá</option>
                    <option value="Gia công linh kiện mẫu">Gia công linh kiện mẫu (PTSP/R&D)</option>
                    <option value="Sửa chữa chuyên sâu">Sửa chữa chuyên sâu (IC/Động cơ/Pin)</option>
                    <option value="Tinh chỉnh xe lỗi xưởng">Phối hợp Xưởng tinh chỉnh xe lỗi</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">Trạng Thái Thực Hiện</label>
                  <select
                    value={fabForm.status || 'Đang thực hiện'}
                    onChange={e =>
                      setFabForm({
                        ...fabForm,
                        status: e.target.value as FabricationRepairJob['status']
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="Chờ thực hiện">Chờ thực hiện</option>
                    <option value="Đang thực hiện">Đang thực hiện</option>
                    <option value="Hoàn thành & Bàn giao">Hoàn thành & Bàn giao</option>
                    <option value="Tạm dừng">Tạm dừng</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-black uppercase">
                  Tên Hạng Mục Đồ Gá / Linh Kiện Mẫu / Pan Lỗi Sửa Chữa *
                </label>
                <input
                  type="text"
                  placeholder="VD: Chế tạo đồ gá kiểm độ đảo vành sau / Tinh chỉnh hệ thống phanh đĩa mẫu X..."
                  value={fabForm.title || ''}
                  onChange={e => setFabForm({ ...fabForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">Bộ Phận Yêu Cầu</label>
                  <select
                    value={fabForm.requestDept || 'Phòng QLCL'}
                    onChange={e =>
                      setFabForm({
                        ...fabForm,
                        requestDept: e.target.value as FabricationRepairJob['requestDept']
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="Phòng QLCL">Phòng QLCL</option>
                    <option value="R&D / PTSP">R&D / PTSP</option>
                    <option value="Xưởng Lắp ráp">Xưởng Lắp ráp</option>
                    <option value="Bảo hành / Thị trường">Bảo hành / Thị trường</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">Dòng Xe Liên Quan</label>
                  <input
                    type="text"
                    list="dk_fab_model_suggestions"
                    placeholder="VD: V1,Roma SX..."
                    value={fabForm.modelName || ''}
                    onChange={e => setFabForm({ ...fabForm, modelName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                  <datalist id="dk_fab_model_suggestions">
                    {modelNameSuggestions.map(name => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">Mức Độ Ưu Tiên</label>
                  <select
                    value={fabForm.priority || 'Cao'}
                    onChange={e =>
                      setFabForm({
                        ...fabForm,
                        priority: e.target.value as FabricationRepairJob['priority']
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="Khẩn cấp">Khẩn cấp</option>
                    <option value="Cao">Cao</option>
                    <option value="Trung bình">Trung bình</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">Người Thực Hiện</label>
                  <select
                    value={fabForm.assignee || defaultHungName}
                    onChange={e => setFabForm({ ...fabForm, assignee: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                  >
                    {!staff.some(s => s.name === (fabForm.assignee || defaultHungName)) && (
                      <option value={fabForm.assignee || defaultHungName}>
                        {fabForm.assignee || defaultHungName}
                      </option>
                    )}
                    {staff.map(s => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">Ngày Tiếp Nhận</label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={fabForm.requestDate || ''}
                    onChange={e => setFabForm({ ...fabForm, requestDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">Hạn Hoàn Thành</label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={fabForm.dueDate || ''}
                    onChange={e => setFabForm({ ...fabForm, dueDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-black uppercase">Yêu Cầu Kỹ Thuật / Bản Vẽ</label>
                <textarea
                  rows={2}
                  placeholder="Kích thước dung sai yêu cầu, hiện tượng lỗi cần tinh chỉnh..."
                  value={fabForm.technicalNote || ''}
                  onChange={e => setFabForm({ ...fabForm, technicalNote: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-black uppercase">
                  Kết Quả Bàn Giao / Nghiệm Thu
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi nhận kết quả chạy thử / bàn giao cho trạm QC hoặc Xưởng..."
                  value={fabForm.resultNote || ''}
                  onChange={e => setFabForm({ ...fabForm, resultNote: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-700 font-black uppercase">
                  Ảnh Hiện Trường / Sản Phẩm Sau Gia Công (Tối đa 3 ảnh, nén &lt; 30KB)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {(fabForm.images || []).map((imgSrc, idx) => (
                    <div key={idx} className="relative">
                      <img src={imgSrc} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() =>
                          setFabForm(prev => ({
                            ...prev,
                            images: (prev.images || []).filter((_, i) => i !== idx)
                          }))
                        }
                        className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(fabForm.images || []).length < 3 && (
                    <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer font-bold text-slate-700 flex items-center gap-1.5">
                      <Camera className="w-4 h-4" /> Thêm Ảnh
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={e => handleFabImageUpload(e.target.files)}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowFabModal(false);
                    setEditingFabJob(null);
                  }}
                  className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 font-bold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold cursor-pointer"
                >
                  {editingFabJob ? 'Lưu Cập Nhật' : 'Lưu Phiếu Kỹ Thuật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD INCIDENT */}
      {/* ========================================================================= */}
      {showAddIncModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden text-xs">
            <div className="bg-rose-950 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-black">Báo Cáo Sự Cố Hỏng Hóc Thiết Bị</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddIncModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddIncident} className="p-5 space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-black uppercase">Chọn Thiết Bị Gặp Sự Cố *</label>
                <select
                  value={newInc.equipmentId}
                  onChange={e => setNewInc({ ...newInc, equipmentId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                  required
                >
                  <option value="">-- Chọn thiết bị --</option>
                  {equipments.map(item => (
                    <option key={item.id} value={item.id}>
                      [{item.id}] - {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">Mức Độ</label>
                  <select
                    value={newInc.severity}
                    onChange={e =>
                      setNewInc({ ...newInc, severity: e.target.value as EquipmentIncident['severity'] })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="Warning">Warning (Cảnh báo)</option>
                    <option value="Critical">Critical (Khẩn cấp - Dừng máy)</option>
                    <option value="Minor">Minor (Lỗi nhẹ)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">Người Phát Hiện</label>
                  <input
                    type="text"
                    value={newInc.reportedBy || ''}
                    onChange={e => setNewInc({ ...newInc, reportedBy: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-black uppercase">Chi Tiết Hiện Tượng Lỗi *</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả hiện tượng sai số, mất nguồn, rò khí nén..."
                  value={newInc.description || ''}
                  onChange={e => setNewInc({ ...newInc, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddIncModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 font-bold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold cursor-pointer"
                >
                  Khai Báo Sự Cố
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RESOLVE INCIDENT */}
      {/* ========================================================================= */}
      {showResolveIncModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden text-xs">
            <div className="bg-emerald-950 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black">Nghiệm Thu Khắc Phục Sự Cố</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResolveIncModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveIncidentSubmit} className="p-5 space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-lg border flex justify-between">
                <span>
                  Sự cố: <strong className="font-mono text-indigo-700">{showResolveIncModal.id}</strong>
                </span>
                <span>
                  Thiết bị: <strong>{showResolveIncModal.equipmentName}</strong>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">Người Sửa Chữa</label>
                  <select
                    value={resolveTechnician}
                    onChange={e => setResolveTechnician(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-slate-900 font-bold"
                  >
                    {!staff.some(s => s.name === resolveTechnician) && (
                      <option value={resolveTechnician}>{resolveTechnician}</option>
                    )}
                    {staff.map(s => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">Dừng Máy (Phút)</label>
                  <input
                    type="number"
                    value={resolveDowntime}
                    onChange={e => setResolveDowntime(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-black uppercase">Chi Phí (VNĐ)</label>
                  <input
                    type="number"
                    value={resolveRepairCost}
                    onChange={e => setResolveRepairCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-black uppercase">Nguyên Nhân Gốc Rễ *</label>
                <input
                  type="text"
                  placeholder="Nguyên nhân kỹ thuật gây hỏng..."
                  value={resolveRootCause}
                  onChange={e => setResolveRootCause(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-700 font-black uppercase">Biện Pháp Khắc Phục *</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả thao tác sửa chữa, hiệu chuẩn lại..."
                  value={resolveRepairAction}
                  onChange={e => setResolveRepairAction(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowResolveIncModal(null)}
                  className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 font-bold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold cursor-pointer"
                >
                  Hoàn Tất Phục Hồi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ZOOM IMAGE LIGHTBOX */}
      {localZoomImage && (
        <div
          className="fixed inset-0 bg-slate-950/85 z-[60] flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLocalZoomImage(null)}
        >
          <img
            src={localZoomImage}
            alt="Zoomed"
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl border border-slate-700 object-contain"
          />
        </div>
      )}
    </div>
  );
}
