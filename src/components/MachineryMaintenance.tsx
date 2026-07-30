import React, { useState } from 'react';
import { 
  Wrench, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Activity, 
  Clock, 
  User, 
  ShieldCheck, 
  Settings, 
  Power, 
  Database, 
  Maximize2, 
  Sliders, 
  DollarSign, 
  Calendar, 
  Search, 
  RefreshCw,
  TrendingUp,
  X,
  LayoutGrid,
  List
} from 'lucide-react';
import { EquipmentItem, MaintenanceLog, EquipmentIncident } from '../types';
import { compressImageFile } from '../imageCompressor';

interface MachineryMaintenanceProps {
  equipments: EquipmentItem[];
  setEquipments: React.Dispatch<React.SetStateAction<EquipmentItem[]>>;
  maintenanceLogs: MaintenanceLog[];
  setMaintenanceLogs: React.Dispatch<React.SetStateAction<MaintenanceLog[]>>;
  equipmentIncidents: EquipmentIncident[];
  setEquipmentIncidents: React.Dispatch<React.SetStateAction<EquipmentIncident[]>>;
  currentUser: { name: string; email: string };
  isUserAuthorized: () => boolean;
  guardAction: (callback: () => void) => void;
  staff: { name: string; email: string; role: string }[];
}

export default function MachineryMaintenance({
  equipments,
  setEquipments,
  maintenanceLogs,
  setMaintenanceLogs,
  equipmentIncidents,
  setEquipmentIncidents,
  currentUser,
  isUserAuthorized,
  guardAction,
  staff
}: MachineryMaintenanceProps) {
  // Sub-tabs
  const [subTab, setSubTab] = useState<'overview' | 'maintenance' | 'incidents'>('overview');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [localZoomImage, setLocalZoomImage] = useState<string | null>(null);

  // Search & Filter state
  const [eqFilterCategory, setEqFilterCategory] = useState<string>('All');
  const [eqFilterStatus, setEqFilterStatus] = useState<string>('All');
  const [eqSearch, setEqSearch] = useState<string>('');

  const [mLogSearch, setMLogSearch] = useState<string>('');
  const [mLogFilterType, setMLogFilterType] = useState<string>('All');

  const [incSearch, setIncSearch] = useState<string>('');
  const [incFilterSeverity, setIncFilterSeverity] = useState<string>('All');
  const [incFilterStatus, setIncFilterStatus] = useState<string>('All');

  // Modal open states
  const [showAddEqModal, setShowAddEqModal] = useState(false);
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [showAddIncModal, setShowAddIncModal] = useState(false);
  const [showResolveIncModal, setShowResolveIncModal] = useState<EquipmentIncident | null>(null);
  const [editingEq, setEditingEq] = useState<EquipmentItem | null>(null);
  const [isNewDragOver, setIsNewDragOver] = useState(false);
  const [isEditDragOver, setIsEditDragOver] = useState(false);

  // New item form states
  const [newEq, setNewEq] = useState<Partial<EquipmentItem>>({
    name: '',
    category: 'Dây chuyền SX',
    status: 'Running',
    healthRate: 95,
    location: '',
    lastMaintenanceDate: new Date().toLocaleDateString('vi-VN'),
    nextMaintenanceDate: '',
    maintainFrequency: 'Hằng tháng',
    responsiblePerson: staff[0]?.name || 'Hà Khắc Việt',
    manufacturer: '',
    specifications: '',
    manufactureYear: 2024,
    imageUrl: ''
  });

  const [newLog, setNewLog] = useState<Partial<MaintenanceLog>>({
    equipmentId: '',
    type: 'Định kỳ',
    details: '',
    replacedParts: '',
    cost: 0,
    technician: staff[0]?.name || 'Hà Khắc Việt',
    status: 'Thành công'
  });

  const [newInc, setNewInc] = useState<Partial<EquipmentIncident>>({
    equipmentId: '',
    severity: 'Warning',
    description: '',
    downtimeMinutes: 0,
    reportedBy: currentUser.name
  });

  // Resolve incident variables
  const [resolveRootCause, setResolveRootCause] = useState('');
  const [resolveRepairAction, setResolveRepairAction] = useState('');
  const [resolveTechnician, setResolveTechnician] = useState(staff[0]?.name || '');
  const [resolveRepairCost, setResolveRepairCost] = useState(0);
  const [resolveDowntime, setResolveDowntime] = useState(30);

  // Math Metrics
  const totalDowntime = equipmentIncidents.reduce((sum, i) => sum + (i.downtimeMinutes || 0), 0);
  const activeBreakdownsCount = equipmentIncidents.filter(i => i.status !== 'Resolved').length;
  const machineryHealthAverage = equipments.length > 0 
    ? Math.round(equipments.reduce((sum, e) => sum + e.healthRate, 0) / equipments.length) 
    : 100;
  const totalCosts = maintenanceLogs.reduce((sum, l) => sum + (l.cost || 0), 0) + 
    equipmentIncidents.reduce((sum, i) => sum + (i.repairCost || 0), 0);

  // Categories helper
  const categories = Array.from(new Set(equipments.map(e => e.category)));

  // Tác vụ giả lập đã được gỡ bỏ theo yêu cầu của anh Thao.

  // File upload reader
  const handleFileUpload = async (file: File, isEdit: boolean) => {
    if (file && file.type.startsWith('image/')) {
      try {
        const compressed = await compressImageFile(file, 500, 500, 0.4);
        if (compressed) {
          if (isEdit) {
            setEditingEq(prev => prev ? { ...prev, imageUrl: compressed } : null);
          } else {
            setNewEq(prev => ({ ...prev, imageUrl: compressed }));
          }
          return;
        }
      } catch (err) {
        console.error("[Machinery Sync Image Err]:", err);
      }

      // Fallback
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          if (isEdit) {
            setEditingEq(prev => prev ? { ...prev, imageUrl: event.target!.result as string } : null);
          } else {
            setNewEq(prev => ({ ...prev, imageUrl: event.target!.result as string }));
          }
        }
      };
      reader.readAsDataURL(file);
    } else {
      alert('Vui lòng chỉ tải lên các định dạng file hình ảnh!');
    }
  };

  // Actions for Equipment Form submit
  const handleAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    guardAction(() => {
      if (!newEq.name) {
        alert('Vui lòng nhập tên thiết bị máy móc!');
        return;
      }
      const item: EquipmentItem = {
        id: `EQP-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`,
        name: newEq.name,
        category: newEq.category || 'Máy phụ trợ khác',
        status: (newEq.status as any) || 'Running',
        healthRate: Number(newEq.healthRate) || 99,
        location: newEq.location || 'Khu vực xưởng sản xuất',
        lastMaintenanceDate: newEq.lastMaintenanceDate || new Date().toLocaleDateString('vi-VN'),
        nextMaintenanceDate: newEq.nextMaintenanceDate || new Date(Date.now() + 15 * 24 * 3600 * 1000).toLocaleDateString('vi-VN'),
        maintainFrequency: (newEq.maintainFrequency as any) || 'Hằng tháng',
        responsiblePerson: newEq.responsiblePerson || 'Hà Khắc Việt',
        manufacturer: newEq.manufacturer || 'DKBike Supplier Industrial',
        specifications: newEq.specifications || 'Tiêu chuẩn xưởng lắp ráp 2026',
        manufactureYear: Number(newEq.manufactureYear) || 2024,
        imageUrl: newEq.imageUrl || ''
      };

      setEquipments([item, ...equipments]);
      setShowAddEqModal(false);
      setNewEq({
        name: '',
        category: 'Dây chuyền SX',
        status: 'Running',
        healthRate: 95,
        location: '',
        lastMaintenanceDate: new Date().toLocaleDateString('vi-VN'),
        nextMaintenanceDate: '',
        maintainFrequency: 'Hằng tháng',
        responsiblePerson: staff[0]?.name || 'Hà Khắc Việt',
        manufacturer: '',
        specifications: '',
        manufactureYear: 2024,
        imageUrl: ''
      });
      alert(`Đã thêm máy móc/thiết bị mới: [${item.name}] thành công!`);
    });
  };

  const handleEditEquipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEq) return;
    guardAction(() => {
      if (!editingEq.name) {
        alert('Tên thiết bị không được để trống!');
        return;
      }
      setEquipments(prev => prev.map(eq => eq.id === editingEq.id ? editingEq : eq));
      setEditingEq(null);
      alert(`Đã cập nhật thông tin thiết bị [${editingEq.name}] thành công!`);
    });
  };

  const handleDeleteEquipment = (id: string, name: string) => {
    guardAction(() => {
      if (window.confirm(`⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA THIẾT BỊ [${name}] KHÔNG?\nLưu ý: Hành động này không tác động tới lịch sử logs cũ nhưng máy sẽ biến mất khỏi danh mục tổng.`)) {
        setEquipments(prev => prev.filter(e => e.id !== id));
        alert('Đã xóa thiết bị thành công!');
      }
    });
  };

  // Actions for Maintenance Submission
  const handleAddMaintenanceLog = (e: React.FormEvent) => {
    e.preventDefault();
    guardAction(() => {
      if (!newLog.equipmentId) {
        alert('Vui lòng chọn thiết bị thực hiện bảo dưỡng!');
        return;
      }
      const targetEq = equipments.find(item => item.id === newLog.equipmentId);
      if (!targetEq) return;

      const logItem: MaintenanceLog = {
        id: `MNL-${Math.floor(300 + Math.random() * 700)}`,
        equipmentId: newLog.equipmentId,
        equipmentName: targetEq.name,
        maintenanceDate: new Date().toLocaleDateString('vi-VN'),
        technician: newLog.technician || currentUser.name,
        type: (newLog.type as any) || 'Định kỳ',
        details: newLog.details || 'Bảo dưỡng tiêu chuẩn vận hành',
        replacedParts: newLog.replacedParts || 'Không thay thế vật tư',
        cost: Number(newLog.cost) || 0,
        status: (newLog.status as any) || 'Thành công'
      };

      setMaintenanceLogs([logItem, ...maintenanceLogs]);

      // Boost Health of that engine
      setEquipments(prev => prev.map(item => item.id === newLog.equipmentId ? {
        ...item,
        status: 'Running',
        healthRate: 100,
        lastMaintenanceDate: new Date().toLocaleDateString('vi-VN')
      } : item));

      setShowAddLogModal(false);
      setNewLog({
        equipmentId: '',
        type: 'Định kỳ',
        details: '',
        replacedParts: '',
        cost: 0,
        technician: staff[0]?.name || 'Hà Khắc Việt',
        status: 'Thành công'
      });
      alert(`Đã hoàn tất lưu trữ nhật ký bảo dưỡng thiết bị [${targetEq.name}] và nâng chỉ số khỏe lên 100%!`);
    });
  };

  // Actions for Malfunction / Incident Reporting
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
        id: `INC-${Math.floor(300 + Math.random() * 750)}`,
        equipmentId: newInc.equipmentId,
        equipmentName: targetEq.name,
        incidentDate: new Date().toLocaleDateString('vi-VN'),
        reportedBy: newInc.reportedBy || currentUser.name,
        severity: (newInc.severity as any) || 'Warning',
        downtimeMinutes: Number(newInc.downtimeMinutes) || 0,
        description: newInc.description || 'Ghi nhận dừng lỗi vận hành',
        status: 'Pending'
      };

      setEquipmentIncidents([incItem, ...equipmentIncidents]);

      // Degrade state of this Machine
      setEquipments(prev => prev.map(item => item.id === newInc.equipmentId ? {
        ...item,
        status: 'Under Repair',
        healthRate: Math.max(20, item.healthRate - 30)
      } : item));

      setShowAddIncModal(false);
      setNewInc({
        equipmentId: '',
        severity: 'Warning',
        description: '',
        downtimeMinutes: 0,
        reportedBy: currentUser.name
      });
      alert(`⚠️ Đã ghi nhận sự cố của [${targetEq.name}]. Chuyền máy đã chuyển tự động sang trạng thái [Sửa chữa / Chờ khắc phục].`);
    });
  };

  // Resolve Malfunction Submit
  const handleResolveIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResolveIncModal) return;

    guardAction(() => {
      setEquipmentIncidents(prev => prev.map(inc => inc.id === showResolveIncModal.id ? {
        ...inc,
        status: 'Resolved',
        resolvedDate: new Date().toLocaleDateString('vi-VN'),
        rootCause: resolveRootCause || 'Sụt áp tải linh kiện đột ngột',
        repairAction: resolveRepairAction || 'Thay thế bảo ôn cơ bạt dập',
        technician: resolveTechnician || currentUser.name,
        repairCost: Number(resolveRepairCost) || 0,
        downtimeMinutes: Number(resolveDowntime) || 0
      } : inc));

      // Reset the machine health and status back to Running!
      setEquipments(prev => prev.map(eq => eq.id === showResolveIncModal.equipmentId ? {
        ...eq,
        status: 'Running',
        healthRate: 95
      } : eq));

      setShowResolveIncModal(null);
      setResolveRootCause('');
      setResolveRepairAction('');
      setResolveRepairCost(0);
      setResolveDowntime(30);
      alert(`✅ Đã giải quyết xong sự cố cho thiết bị [${showResolveIncModal.equipmentName}]. Trạng thái máy móc phục hồi về [Vận hành bình thường].`);
    });
  };

  // Clear or remove an incident log
  const handleDeleteIncident = (id: string) => {
    guardAction(() => {
      if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi sự cố dừng hỏng này không?')) {
        setEquipmentIncidents(prev => prev.filter(i => i.id !== id));
        alert('Đã xóa sự cố thành công!');
      }
    });
  };

  // Filter machines based on search criteria
  const filteredEquipments = equipments.filter(eq => {
    const matchCat = eqFilterCategory === 'All' || eq.category === eqFilterCategory;
    const matchStatus = eqFilterStatus === 'All' || eq.status === eqFilterStatus;
    const matchWord = !eqSearch || 
      eq.name.toLowerCase().includes(eqSearch.toLowerCase()) ||
      eq.id.toLowerCase().includes(eqSearch.toLowerCase()) ||
      eq.responsiblePerson.toLowerCase().includes(eqSearch.toLowerCase());
    return matchCat && matchStatus && matchWord;
  });

  const filteredLogs = maintenanceLogs.filter(log => {
    const matchType = mLogFilterType === 'All' || log.type === mLogFilterType;
    const matchWord = !mLogSearch || 
      log.equipmentName.toLowerCase().includes(mLogSearch.toLowerCase()) ||
      log.technician.toLowerCase().includes(mLogSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(mLogSearch.toLowerCase());
    return matchType && matchWord;
  });

  const filteredIncidents = equipmentIncidents.filter(inc => {
    const matchSeverity = incFilterSeverity === 'All' || inc.severity === incFilterSeverity;
    const matchStatus = incFilterStatus === 'All' || inc.status === incFilterStatus;
    const matchWord = !incSearch || 
      inc.equipmentName.toLowerCase().includes(incSearch.toLowerCase()) ||
      inc.description.toLowerCase().includes(incSearch.toLowerCase()) ||
      (inc.reportedBy && inc.reportedBy.toLowerCase().includes(incSearch.toLowerCase()));
    return matchSeverity && matchStatus && matchWord;
  });

  return (
    <div className="space-y-6" id="machinery_maintenance_module">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl border border-indigo-850/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-slate-900 font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-sm tracking-widest font-mono">NEW MODULE</span>
            <span className="text-slate-350 text-xs font-semibold">Tích hợp Hệ Thống ISO & Chất Lượng DKBike 2026</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-400 rotate-45 animate-pulse" />
            Giám Sát & Bảo Dưỡng Thiết Bị Dây Chuyền Sản Xuất
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Theo dõi tình trạng vận hành, sức khỏe thiết bị tại các dây chuyền dập phôi, lốp, hàn định hình khung, máy nén khí và trạm sát hạch sát OQC. Ghi nhận nhật ký bảo dưỡng định kỳ và các sự cố dừng máy để tính toán chỉ số hiệu năng thiết bị toàn phần OEE.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => setShowAddEqModal(true)}
            className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold flex items-center gap-1.5 shadow-md cursor-pointer text-white transition active:scale-95"
          >
            <Plus className="w-4 h-4" /> Thêm Thiết Bị
          </button>
          <button
            onClick={() => setShowAddLogModal(true)}
            className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 rounded-xl font-bold flex items-center gap-1.5 shadow-md cursor-pointer text-white transition active:scale-95"
          >
            <CheckCircle className="w-4 h-4" /> Báo Bảo Dưỡng
          </button>
          <button
            onClick={() => setShowAddIncModal(true)}
            className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold flex items-center gap-1.5 shadow-md cursor-pointer text-white transition active:scale-95"
          >
            <AlertTriangle className="w-4 h-4" /> Báo Sự Cố Dừng Máy
          </button>
        </div>
      </div>

      {/* METRIC STATISTICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="eq_statistics_bento">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Tổng Thiết Bị Dây Chuyền</p>
            <h3 className="text-2xl font-black text-slate-800">{equipments.length} <span className="text-xs font-semibold text-slate-400">máy móc</span></h3>
            <p className="text-[11px] text-slate-500">
              Đang hoạt động: <span className="text-emerald-600 font-bold">{equipments.filter(e => e.status === 'Running').length}</span> | Dừng: <span className="text-amber-600 font-bold">{equipments.filter(e => e.status === 'Stopped').length}</span>
            </p>
          </div>
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Settings className="w-6 h-6 animate-spin-slow" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1 relative">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Trạng Thái Lỗi / Sửa Chữa</p>
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-1.5">
              {activeBreakdownsCount} 
              {activeBreakdownsCount > 0 ? (
                <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-700 font-black text-[9px] rounded-full animate-pulse">SỰ CỐ</span>
              ) : (
                <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-700 font-black text-[9px] rounded-full">AN TOÀN</span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500">
              Lỗi Critical nguy cấp: <span className="text-rose-600 font-bold">{equipmentIncidents.filter(i => i.status !== 'Resolved' && i.severity === 'Critical').length}</span> máy
            </p>
          </div>
          <div className={`p-3.5 rounded-2xl ${activeBreakdownsCount > 0 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Sức Khỏe Bình Quân (Health Rate)</p>
            <h3 className="text-2xl font-black text-slate-800">{machineryHealthAverage}%</h3>
            <div className="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full ${
                  machineryHealthAverage >= 90 ? 'bg-emerald-500' : machineryHealthAverage >= 75 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${machineryHealthAverage}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-505 font-medium mt-1">Chu kỳ hiệu chuẩn & bảo trì đạt chuẩn</p>
          </div>
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
            <Activity className="w-6 h-6 text-blue-502" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Tổng Sút Thời Gian & Chi Phí</p>
            <h3 className="text-2xl font-black text-slate-800">
              {(totalCosts / 1000000).toFixed(1)} <span className="text-xs font-semibold text-slate-400">Triệu VNĐ</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Dừng máy lũy kế: <span className="text-rose-600 font-bold">{totalDowntime} phút</span>
            </p>
          </div>
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 bg-white p-1.5 rounded-xl">
        <button
          onClick={() => setSubTab('overview')}
          className={`px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
            subTab === 'overview' 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4" /> Danh Mục Thiết Bị & Trạng Thái ({filteredEquipments.length})
        </button>
        <button
          onClick={() => setSubTab('maintenance')}
          className={`px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
            subTab === 'maintenance' 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" /> Nhật Ký Bảo Trì Phòng QLCL Mở ({filteredLogs.length})
        </button>
        <button
          onClick={() => setSubTab('incidents')}
          className={`px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
            subTab === 'incidents' 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4 animate-bounce-slow" /> Sự Cố Thiết Bị & Phục Hồi ({filteredIncidents.length})
        </button>
      </div>

      {/* SUB-TAB CONTENTS */}
      {subTab === 'overview' && (
        <div className="space-y-4" id="view_overview_equipment">
          {/* SEARCH & FILTER SECTION */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm máy, ID, hoặc người phụ trách..."
                  value={eqSearch}
                  onChange={(e) => setEqSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-xs focus:bg-white focus:border-indigo-500 focus:outline-none placeholder-slate-400 font-medium"
                />
              </div>

              {/* Category Filter */}
              <select
                value={eqFilterCategory}
                onChange={(e) => setEqFilterCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-700 cursor-pointer focus:border-indigo-500 focus:outline-none"
              >
                <option value="All">🛠️ Tất cả nhóm dây chuyền</option>
                <option value="Dập & Gá Khớp">Dập & Gá Khớp (Stamping & Welding)</option>
                <option value="Sơn Sấy Tự Động">Sơn Sấy Tự Động (Painting)</option>
                <option value="Lắp Ráp Hoàn Thiện">Lắp Ráp Hoàn Thiện (Assembly)</option>
                <option value="Kiểm Định KCS (OQC)">Kiểm Định KCS (OQC)</option>
                <option value="Đóng Gói & Xuất Xưởng">Đóng Gói & Xuất Xưởng</option>
                <option value="Hệ Thống Phụ Trợ">Hệ Thống Phụ Trợ</option>
              </select>

              {/* Status Filter */}
              <select
                value={eqFilterStatus}
                onChange={(e) => setEqFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-700 cursor-pointer focus:border-indigo-500 focus:outline-none"
              >
                <option value="All">⚙️ Tất cả trạng thái máy</option>
                <option value="Running">🟢 Running (Đang chạy)</option>
                <option value="Stopped">🟡 Stopped (Tạm dừng)</option>
                <option value="Maintenance">🔵 Maintenance (Bảo trì)</option>
                <option value="Under Repair">🔴 Under Repair (Sửa sự cố)</option>
                <option value="Offline">⚪ Offline (Ngoại vi)</option>
              </select>

              {/* View Mode Toggle Switch */}
              <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 gap-1 shadow-xs shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    viewMode === 'list'
                      ? 'bg-indigo-650 text-white shadow-xs font-extrabold'
                      : 'text-slate-650 hover:text-indigo-600 hover:bg-white'
                  }`}
                  title="Hiển thị dạng Danh sách Bảng"
                >
                  <List className="w-3.5 h-3.5" /> Dạng danh sách
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    viewMode === 'grid'
                      ? 'bg-indigo-650 text-white shadow-xs'
                      : 'text-slate-650 hover:text-indigo-600 hover:bg-white'
                  }`}
                  title="Hiển thị dạng Lưới bento hình ảnh"
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Dạng lưới
                </button>
              </div>
            </div>

            <div className="text-[10px] text-slate-405 font-mono">
              Hiển thị {filteredEquipments.length} / {equipments.length} thiết bị dây chuyền
            </div>
          </div>

          {/* EQUIPMENTS DATA RENDER: LIST VIEW OR GRID VIEW */}
          {viewMode === 'list' ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" id="machinery_devices_list_mode">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs select-text">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider select-none font-mono">
                      <th className="p-4 w-20">Mã Thiết Bị</th>
                      <th className="p-4 min-w-[240px]">Tên Thiết Bị / Máy Móc</th>
                      <th className="p-4">Phân Loại Dây Chuyền</th>
                      <th className="p-4">Trạng Thái</th>
                      <th className="p-4 w-40">Chỉ Số Khỏe</th>
                      <th className="p-4">📍 Vị Trí Lắp Đặt</th>
                      <th className="p-4">👤 Phụ Trách</th>
                      <th className="p-4">📅 Bảo Dưỡng Kế</th>
                      <th className="p-4 text-right w-48">Thao Tác Bảo Trì</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredEquipments.map((eq) => {
                      const activeInc = equipmentIncidents.find(i => i.equipmentId === eq.id && i.status !== 'Resolved');
                      return (
                        <tr 
                          key={eq.id} 
                          className={`hover:bg-indigo-50/15 transition-colors duration-150 ${
                            eq.status === 'Under Repair' ? 'bg-rose-50/20' :
                            eq.status === 'Maintenance' ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          <td className="p-4 font-mono font-bold text-slate-450 text-[10px] select-all">{eq.id}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {eq.imageUrl ? (
                                <img 
                                  src={eq.imageUrl} 
                                  className="w-11 h-11 object-cover rounded-lg border border-slate-200 cursor-zoom-in shrink-0 hover:scale-105 transition-transform" 
                                  referrerPolicy="no-referrer" 
                                  alt={eq.name} 
                                  onClick={() => setLocalZoomImage(eq.imageUrl || null)} 
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-450 border border-slate-200 shrink-0">
                                  <Wrench className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-extrabold text-slate-850 text-xs hover:text-indigo-600 transition block leading-tight truncate max-w-[240px]" title={eq.name}>
                                  {eq.name}
                                </span>
                                
                                {activeInc ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] bg-red-100 text-red-800 font-black px-1.5 py-0.5 rounded border border-red-200 mt-1 animate-pulse uppercase leading-none">
                                    <AlertTriangle className="w-2.5 h-2.5" /> LỖI ĐẾN: {activeInc.id}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-450 font-sans mt-0.5 block truncate max-w-[240px]" title={eq.specifications || 'N/A'}>
                                    Specs: {eq.specifications || 'Chưa ghi nhận thông số kỹ thuật'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-0.5 bg-slate-100 font-extrabold text-slate-650 border border-slate-200 rounded text-[9px] tracking-wide uppercase">
                              {eq.category}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wide border inline-block select-none ${
                              eq.status === 'Running' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' :
                              eq.status === 'Stopped' ? 'bg-slate-100 text-slate-655 border-slate-250' :
                              eq.status === 'Maintenance' ? 'bg-amber-50 text-amber-705 border-amber-250' :
                              eq.status === 'Under Repair' ? 'bg-rose-50 text-rose-700 border-rose-250 animate-pulse' :
                              'bg-slate-50 text-slate-705 border-slate-200'
                            }`}>
                              {eq.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1 w-32">
                              <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-450 select-none">
                                <span>Health rate</span>
                                <span className={
                                  eq.healthRate >= 90 ? 'text-emerald-500 font-mono font-bold' :
                                  eq.healthRate >= 75 ? 'text-amber-500 font-mono font-bold' : 'text-red-500 font-mono font-bold'
                                }>{eq.healthRate}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${
                                    eq.healthRate >= 90 ? 'bg-emerald-500' :
                                    eq.healthRate >= 75 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${eq.healthRate}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-[10px] leading-tight text-slate-650">
                              <span className="font-bold text-slate-800 block">📍 {eq.location}</span>
                              <span className="text-[9px] md:text-[10px] text-slate-450 block mt-0.5 font-sans">
                                Hãng: {eq.manufacturer || 'DKBike'} ({eq.manufactureYear || '2025'})
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setEditingEq(eq)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-150 rounded transition cursor-pointer"
                                title="Sửa thông số máy móc"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteEquipment(eq.id, eq.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-150 rounded transition cursor-pointer"
                                title="Xóa máy móc khởi hệ thống"
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
            /* EQUIPMENTS GRID SECTION */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" id="machinery_devices_grid">
              {filteredEquipments.map((eq) => {
                const activeInc = equipmentIncidents.find(i => i.equipmentId === eq.id && i.status !== 'Resolved');
                return (
                  <div 
                    key={eq.id} 
                    className={`bg-white rounded-2xl border transition-all duration-350 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md ${
                      eq.status === 'Under Repair' ? 'border-red-200 shadow-red-50/50 bg-red-50/10' :
                      eq.status === 'Maintenance' ? 'border-amber-200 shadow-amber-50/50 bg-amber-50/10' :
                      'border-slate-200 hover:border-slate-350 bg-white'
                    }`}
                  >
                    {/* Status header accent bar */}
                    <div className={`h-1.5 w-full ${
                      eq.status === 'Running' ? 'bg-emerald-500' :
                      eq.status === 'Stopped' ? 'bg-slate-400' :
                      eq.status === 'Maintenance' ? 'bg-amber-500' :
                      eq.status === 'Under Repair' ? 'bg-red-500 animate-pulse' : 'bg-slate-500'
                    }`}></div>

                    {/* Machinery Image Header */}
                    <div 
                      onClick={() => eq.imageUrl && setLocalZoomImage(eq.imageUrl)}
                      className="relative h-44 bg-slate-900 border-b border-slate-100 flex items-center justify-center overflow-hidden group cursor-zoom-in"
                    >
                      {eq.imageUrl ? (
                        <img 
                          src={eq.imageUrl} 
                          alt={eq.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500 space-y-1">
                          <Wrench className="w-8 h-8 stroke-1 text-slate-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Không có hình ảnh</span>
                        </div>
                      )}
                      {/* Live Badges on Image */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="bg-slate-900/85 backdrop-blur-xs text-white text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded-sm shadow-sm border border-slate-800/40">
                          {eq.category}
                        </span>
                      </div>

                      {eq.manufactureYear && (
                        <div className="absolute top-3 right-3">
                          <span className="bg-indigo-950/90 backdrop-blur-xs text-indigo-200 text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded-md shadow-sm border border-indigo-800/40">
                            Năm SX: {eq.manufactureYear}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      {/* Header line info */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono font-bold tracking-tight uppercase">ID: {eq.id}</span>
                          <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wide border ${
                            eq.status === 'Running' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' :
                            eq.status === 'Stopped' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                            eq.status === 'Maintenance' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            eq.status === 'Under Repair' ? 'bg-rose-50 text-rose-700 border-rose-250 animate-pulse' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {eq.status}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-800 text-sm leading-tight hover:text-indigo-600 transition truncate" title={eq.name}>
                          {eq.name}
                        </h4>
                      </div>

                      {/* Machine Specifications */}
                      <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                        <span className="text-[9px] text-slate-455 font-black uppercase tracking-wider block">Thông số kỹ thuật</span>
                        <p className="text-[11px] text-slate-700 font-semibold leading-relaxed line-clamp-3">
                          {eq.specifications || 'Chưa ghi nhận thông số kỹ thuật tối cao'}
                        </p>
                      </div>

                      {/* Health meter gauge */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                          <span>Chỉ Số Khỏe (Health Metric)</span>
                          <span className={
                            eq.healthRate >= 90 ? 'text-emerald-500 font-mono font-bold' :
                            eq.healthRate >= 75 ? 'text-amber-500 font-mono font-bold' : 'text-red-500 font-mono font-bold'
                          }>{eq.healthRate}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              eq.healthRate >= 90 ? 'bg-emerald-500' :
                              eq.healthRate >= 75 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${eq.healthRate}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Meta location and maintenance details */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-3.5 text-[10px] text-slate-505 border-t border-slate-100 pt-3.5 font-medium">
                        <div>
                          <span className="text-slate-400 block tracking-tight uppercase font-black">📍 Vị trí lắp đặt</span>
                          <span className="font-bold text-slate-800 truncate block mt-0.5" title={eq.location}>{eq.location}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block tracking-tight uppercase font-black">👤 Phụ trách QLCL</span>
                          <span className="font-bold text-slate-800 truncate block mt-0.5" title={eq.responsiblePerson}>{eq.responsiblePerson}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block tracking-tight uppercase font-black">🏗️ Hãng sản xuất</span>
                          <span className="font-bold text-slate-800 truncate block mt-0.5" title={eq.manufacturer}>{eq.manufacturer || 'DKBike'}</span>
                        </div>
                        <div>
                          <span className="text-slate-405 block tracking-tight text-amber-600 font-black uppercase">📅 Bảo dưỡng tiếp</span>
                          <span className="font-bold text-slate-800 block mt-0.5">{eq.nextMaintenanceDate || 'Chưa lên lịch'}</span>
                        </div>
                      </div>

                      {/* Active incident warning block if any */}
                      {activeInc && (
                        <div className="bg-red-50 border border-red-150 p-2.5 rounded-xl text-[11px] text-red-800 space-y-1 animate-pulse">
                          <div className="flex items-center gap-1 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            <span>MÁY ĐANG LỖI: {activeInc.id}</span>
                          </div>
                          <p className="font-medium leading-normal block-clamp-1">{activeInc.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Operational controls foot */}
                    <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingEq(eq)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                          title="Chỉnh sửa thông số & hình ảnh thiết bị"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEquipment(eq.id, eq.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Xóa máy móc ra khỏi danh mục"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
              <Settings className="w-12 h-12 text-slate-300 mx-auto mb-2 animate-spin-slow" />
              <p className="text-xs font-bold text-slate-500">Không tìm thấy thiết bị nào khớp với từ khóa lọc và tìm kiếm!</p>
            </div>
          )}
        </div>
      )}

      {/* 2.2 PREVENTATIVE MAINTENANCE SUB-TAB */}
      {subTab === 'maintenance' && (
        <div className="space-y-4" id="view_maintenance_logs">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm nhật ký thiết bị, kỹ sư, phụ tùng..."
                  value={mLogSearch}
                  onChange={(e) => setMLogSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* Maintenance Category Type */}
              <select
                value={mLogFilterType}
                onChange={(e) => setMLogFilterType(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-700 cursor-pointer focus:border-indigo-505 focus:outline-none"
              >
                <option value="All">🛠 Tất cả loại hình bảo trì</option>
                <option value="Định kỳ">Định kỳ hằng tháng</option>
                <option value="Đột xuất">Sửa chữa đột xuất</option>
                <option value="Hiệu chuẩn">Kiểm chuẩn thiết bị</option>
                <option value="Nâng cấp">Nâng cấp cấu hình</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddLogModal(true)}
              className="bg-indigo-600 hover:bg-indigo-505 text-white font-bold text-xs px-3.5 py-2 rounded-lg gap-1.5 cursor-pointer flex items-center transition"
            >
              <Plus className="w-4 h-4" /> Thêm Biên Bản Bảo Trì
            </button>
          </div>

          {/* LOGS TABLE LIST */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="maintenance_records_list">
            <div className="overflow-x-auto font-sans text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-[10px] tracking-wider">
                    <th className="p-4 w-20">Mã Số Log</th>
                    <th className="p-4 w-52">Thiết Bị Máy Móc</th>
                    <th className="p-4 w-28">Ngày Làm</th>
                    <th className="p-4 w-28">Kỹ Sư Phụ Trách</th>
                    <th className="p-4 w-28">Dạng Bảo Trì</th>
                    <th className="p-4">Nội Dung Thực Hiện Chi Tiết</th>
                    <th className="p-4">Vật Tư & Phụ Kiện</th>
                    <th className="p-4 w-28 text-right">Chi Phí (VNĐ)</th>
                    <th className="p-4 w-12 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700 font-medium">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/65 transition-colors">
                      <td className="p-4 font-mono font-bold text-indigo-700">{log.id}</td>
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 text-xs">{log.equipmentName}</div>
                        <div className="text-[9px] text-slate-400 font-mono">ID thiết bị: {log.equipmentId}</div>
                      </td>
                      <td className="p-4 font-mono font-semibold text-slate-500">{log.maintenanceDate}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                          {log.technician}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded font-black text-[9px] border uppercase ${
                          log.type === 'Định kỳ' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                          log.type === 'Hiệu chuẩn' ? 'bg-cyan-100 text-cyan-800 border-cyan-200' :
                          log.type === 'Nâng cấp' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="p-4 max-w-sm leading-relaxed text-slate-600 font-normal">
                        {log.details}
                      </td>
                      <td className="p-4 max-w-xs text-slate-500 italic">
                        {log.replacedParts || 'Không phát sinh phụ kiện'}
                      </td>
                      <td className="p-4 font-mono font-black text-right text-emerald-700 text-xs">
                        {(log.cost || 0).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            guardAction(() => {
                              if (window.confirm('Có chắc chắn muốn xóa bản ghi nhật ký bảo hiểm này không?')) {
                                setMaintenanceLogs(prev => prev.filter(l => l.id !== log.id));
                                alert('Đã xóa log thành công!');
                              }
                            });
                          }}
                          className="p-1 px-1.5 hover:bg-rose-50 rounded-md text-slate-300 hover:text-rose-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                        Chưa ghi nhận hoặc không có biên bản bảo dưỡng nào được ghi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2.3 INCIDENTS SUB-TAB */}
      {subTab === 'incidents' && (
        <div className="space-y-4" id="view_equipment_incidents">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm sự cố máy móc, báo cáo bởi..."
                  value={incSearch}
                  onChange={(e) => setIncSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* Severity Filter */}
              <select
                value={incFilterSeverity}
                onChange={(e) => setIncFilterSeverity(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-700 cursor-pointer focus:border-indigo-505 focus:outline-none"
              >
                <option value="All">🔴 Mọi cấp độ nghiêm trọng</option>
                <option value="Critical">Critical (Rất khẩn cấp)</option>
                <option value="Warning">Warning (Cảnh báo lỗi)</option>
                <option value="Minor">Minor (Lỗi nhỏ gập)</option>
              </select>

              {/* Status Filter */}
              <select
                value={incFilterStatus}
                onChange={(e) => setIncFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-700 cursor-pointer focus:border-indigo-505 focus:outline-none"
              >
                <option value="All">🚦 Mọi trạng thái xử lý</option>
                <option value="Pending">Pending (Chờ xử lý)</option>
                <option value="Repairing">Repairing (Đang sửa)</option>
                <option value="Resolved">Resolved (Hoàn thành)</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddIncModal(true)}
              className="bg-rose-600 hover:bg-rose-505 text-white font-bold text-xs px-3.5 py-2 rounded-lg gap-1.5 cursor-pointer flex items-center transition"
            >
              <Plus className="w-4 h-4" /> Ghi Nhận Sự Cố Máy Mới
            </button>
          </div>

          {/* INCIDENTS LIST TIMELINE / TABLE */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="incident_records_table">
            <div className="overflow-x-auto font-sans text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-[10px] tracking-wider">
                    <th className="p-4 w-20">Mã Sự Cố</th>
                    <th className="p-4 w-52">Thiết Bị Dừng Lỗi</th>
                    <th className="p-4 w-24">Ngày Đột Xuất</th>
                    <th className="p-4 w-24">Phát hiện bởi</th>
                    <th className="p-4 w-24">Nghiêm Trọng</th>
                    <th className="p-4 w-24">Thời gian Dừng (phút)</th>
                    <th className="p-4">Hiện tượng gập sụt & Biện pháp Sửa chữa</th>
                    <th className="p-4 w-24">Chi Phí (VNĐ)</th>
                    <th className="p-4 w-24 text-center">Trạng Thái</th>
                    <th className="p-4 w-28 text-center">Xử Lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700 font-medium">
                  {filteredIncidents.map((inc) => (
                    <tr 
                      key={inc.id} 
                      className={`transition-colors ${
                        inc.status !== 'Resolved' && inc.severity === 'Critical' ? 'bg-rose-50/20' : 'hover:bg-slate-50/65'
                      }`}
                    >
                      <td className="p-4 font-mono font-extrabold text-slate-800">{inc.id}</td>
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 text-xs">{inc.equipmentName}</div>
                        <div className="text-[9px] text-slate-400 font-mono">ID thiết bị: {inc.equipmentId}</div>
                      </td>
                      <td className="p-4 font-mono font-semibold text-slate-500">{inc.incidentDate}</td>
                      <td className="p-4 font-bold text-slate-650">{inc.reportedBy || 'Giám chuyền'}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black uppercase text-center block ${
                          inc.severity === 'Critical' ? 'bg-red-500 text-white animate-pulse font-extrabold' :
                          inc.severity === 'Warning' ? 'bg-amber-100 text-amber-800 border-amber-200 border' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="p-4 font-black font-mono text-center text-slate-700">{inc.downtimeMinutes || 0} p</td>
                      <td className="p-4 text-xs leading-relaxed font-normal text-slate-600">
                        <div>
                          <p className="font-bold text-slate-800">⚠️ Hiện tượng:</p>
                          <p>{inc.description}</p>
                        </div>
                        {inc.status === 'Resolved' && (
                          <div className="mt-2 bg-slate-50/50 p-2 rounded-lg border border-slate-100 italic space-y-1">
                            <p className="text-emerald-700 font-bold">✔ Biện pháp khắc phục ({inc.technician}):</p>
                            <p><strong className="not-italic text-slate-600">Nguyên nhân:</strong> {inc.rootCause}</p>
                            <p><strong className="not-italic text-slate-600">Khắc phục:</strong> {inc.repairAction}</p>
                            <p className="text-[9px] text-slate-400 font-mono">Xử lý ngày: {inc.resolvedDate}</p>
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-mono font-black text-right text-rose-700">
                        {inc.repairCost ? `${inc.repairCost.toLocaleString('vi-VN')} đ` : '-'}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase border inline-block ${
                          inc.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          inc.status === 'Repairing' ? 'bg-amber-500 text-slate-900 border-amber-400' :
                          'bg-red-500 text-white animate-pulse'
                        }`}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col gap-1 items-center justify-center">
                          {inc.status !== 'Resolved' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setResolveTechnician(staff[0]?.name || '');
                                setResolveDowntime(30);
                                setResolveRepairCost(250000);
                                setShowResolveIncModal(inc);
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black rounded cursor-pointer transition uppercase"
                              title="Ấn để mở giao diện nghiệm thu sửa máy và phục hồi Running"
                            >
                              ⚡ Nghiệm Thu
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-bold uppercase">XONG</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteIncident(inc.id)}
                            className="text-slate-350 hover:text-rose-600 p-1 rounded hover:bg-rose-50 text-[10px] cursor-pointer"
                            title="Xóa biên bản sự cố"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredIncidents.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                        Tuyệt vời! Không có thiết bị máy móc nào gặp sự cố dừng máy lúc này.
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
      {/* MODAL WINDOWS FOR CRUD OPERATIONS */}
      {/* ========================================================================= */}

      {/* MODAL 1: ADD EQUIPMENT */}
      {showAddEqModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden font-sans text-xs">
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-400 animate-spin-slow" />
                <h3 className="text-sm font-bold text-slate-100">Khai Báo Thiết Bị Máy Dây Chuyền Mới</h3>
              </div>
              <button onClick={() => setShowAddEqModal(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleAddEquipment} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase">Tên thiết bị chuyên dụng ({staff.length > 0 ? "Staff loaded" : "Empty"})</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Máy dập uốn ống tỳ ga sườn sau"
                  value={newEq.name}
                  onChange={(e) => setNewEq({ ...newEq, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Phân ban / Dây chuyền</label>
                  <select
                    value={newEq.category}
                    onChange={(e) => setNewEq({ ...newEq, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 focus:border-indigo-500 focus:outline-none transition-colors"
                  >
                    <option value="Phòng QLCL">Phòng QLCL</option>
                    <option value="Dây chuyền SX">Dây chuyền SX</option>
                    <option value="Kho Linh kiện">Kho Linh kiện</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Bao Sức Khỏe Lần Đầu (%)</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={newEq.healthRate}
                    onChange={(e) => setNewEq({ ...newEq, healthRate: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Vị Trí Lắp Đặt</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Gian A3 - Phân xưởng hàn"
                    value={newEq.location}
                    onChange={(e) => setNewEq({ ...newEq, location: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Người phụ trách QLCL</label>
                  <select
                    value={newEq.responsiblePerson}
                    onChange={(e) => setNewEq({ ...newEq, responsiblePerson: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  >
                    {staff.map(s => <option key={s.name} value={s.name}>{s.name} ({s.role.split(' ')[0]})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Hạn Bảo Trì dự kiến tiếp theo</label>
                  <input
                    type="text"
                    placeholder="Định dạng: DD/MM/YYYY"
                    value={newEq.nextMaintenanceDate}
                    onChange={(e) => setNewEq({ ...newEq, nextMaintenanceDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Tần Suất Định Kỳ</label>
                  <select
                    value={newEq.maintainFrequency}
                    onChange={(e) => setNewEq({ ...newEq, maintainFrequency: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  >
                    <option value="Hằng tuần">Hằng tuần</option>
                    <option value="Hằng tháng">Hằng tháng</option>
                    <option value="Hằng quý">Hằng quý</option>
                    <option value="Định kỳ hằng năm">Định kỳ hằng năm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Hãng sản xuất</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: DKBike Supplier"
                    value={newEq.manufacturer || ''}
                    onChange={(e) => setNewEq({ ...newEq, manufacturer: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Năm sản xuất</label>
                  <input
                    type="number"
                    min="1990"
                    max="2030"
                    placeholder="Ví dụ: 2026"
                    value={newEq.manufactureYear || ''}
                    onChange={(e) => setNewEq({ ...newEq, manufactureYear: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase">Thông Số Kỹ Thuật Chủ Chốt</label>
                <textarea
                  placeholder="Dòng điện sụt áp, mã sườn pitton, kích thước khuôn dưỡng, dung lượng thủy lực..."
                  value={newEq.specifications}
                  onChange={(e) => setNewEq({ ...newEq, specifications: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                ></textarea>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase">Hình ảnh thiết bị (Tải lên hoặc kéo thả)</label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isNewDragOver ? 'border-indigo-505 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400 bg-slate-50'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsNewDragOver(true); }}
                  onDragLeave={() => setIsNewDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setIsNewDragOver(false); if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0], false); }}
                  onClick={() => document.getElementById('new_eq_file_input')?.click()}
                >
                  <input 
                    type="file" 
                    id="new_eq_file_input" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], false); }} 
                  />
                  {newEq.imageUrl ? (
                    <div className="relative group/img">
                      <img src={newEq.imageUrl} alt="Preview" className="h-28 mx-auto object-contain rounded-md border" />
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setNewEq(prev => ({ ...prev, imageUrl: '' })); }} 
                        className="absolute top-1 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition"
                        title="Xóa hình ảnh này"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1 text-slate-500">
                      <Plus className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-[11px] font-bold">Kéo thả hình ảnh vào đây hoặc nhấp để chọn file</p>
                      <p className="text-[10px] text-slate-400">Chấp nhận PNG, JPG, GIF dạng dữ liệu Base64 tối giản</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddEqModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-505 text-white rounded font-bold cursor-pointer"
                >
                  Xác Nhận Thêm Thiết Bị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1.5: EDIT EQUIPMENT */}
      {editingEq && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden font-sans text-xs">
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">Hiệu Chỉnh Thông Số & Hình Ảnh Thiết Bị</h3>
              </div>
              <button onClick={() => setEditingEq(null)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleEditEquipmentSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase">Tên thiết bị chuyên dụng</label>
                <input
                  type="text"
                  value={editingEq.name}
                  onChange={(e) => setEditingEq({ ...editingEq, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Phân ban / Dây chuyền</label>
                  <select
                    value={editingEq.category}
                    onChange={(e) => setEditingEq({ ...editingEq, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  >
                    <option value="Phòng QLCL">Phòng QLCL</option>
                    <option value="Dây chuyền SX">Dây chuyền SX</option>
                    <option value="Kho Linh kiện">Kho Linh kiện</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Chỉ Số Khỏe (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editingEq.healthRate}
                    onChange={(e) => setEditingEq({ ...editingEq, healthRate: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Vị Trí Lắp Đặt</label>
                  <input
                    type="text"
                    value={editingEq.location}
                    onChange={(e) => setEditingEq({ ...editingEq, location: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Người phụ trách QLCL</label>
                  <select
                    value={editingEq.responsiblePerson}
                    onChange={(e) => setEditingEq({ ...editingEq, responsiblePerson: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  >
                    {staff.map(s => <option key={s.name} value={s.name}>{s.name} ({s.role.split(' ')[0]})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Hạn Bảo Trì dự kiến tiếp theo</label>
                  <input
                    type="text"
                    value={editingEq.nextMaintenanceDate}
                    onChange={(e) => setEditingEq({ ...editingEq, nextMaintenanceDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Tần Suất Định Kỳ</label>
                  <select
                    value={editingEq.maintainFrequency}
                    onChange={(e) => setEditingEq({ ...editingEq, maintainFrequency: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  >
                    <option value="Hằng tuần">Hằng tuần</option>
                    <option value="Hằng tháng">Hằng tháng</option>
                    <option value="Hằng quý">Hằng quý</option>
                    <option value="Định kỳ hằng năm">Định kỳ hằng năm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Hãng sản xuất</label>
                  <input
                    type="text"
                    value={editingEq.manufacturer || ''}
                    onChange={(e) => setEditingEq({ ...editingEq, manufacturer: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Năm sản xuất</label>
                  <input
                    type="number"
                    min="1990"
                    max="2030"
                    value={editingEq.manufactureYear || ''}
                    onChange={(e) => setEditingEq({ ...editingEq, manufactureYear: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase">Thông Số Kỹ Thuật Chủ Chốt</label>
                <textarea
                  value={editingEq.specifications}
                  onChange={(e) => setEditingEq({ ...editingEq, specifications: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                ></textarea>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase">Hình ảnh thiết bị (Tải lên hoặc kéo thả)</label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isEditDragOver ? 'border-indigo-505 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400 bg-slate-50'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsEditDragOver(true); }}
                  onDragLeave={() => setIsEditDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setIsEditDragOver(false); if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0], true); }}
                  onClick={() => document.getElementById('edit_eq_file_input')?.click()}
                >
                  <input 
                    type="file" 
                    id="edit_eq_file_input" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], true); }} 
                  />
                  {editingEq.imageUrl ? (
                    <div className="relative group/img">
                      <img src={editingEq.imageUrl} alt="Preview" className="h-28 mx-auto object-contain rounded-md border" />
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setEditingEq(prev => prev ? ({ ...prev, imageUrl: '' }) : null); }} 
                        className="absolute top-1 right-2 bg-red-650 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition"
                        title="Xóa hình ảnh này"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1 text-slate-500">
                      <Plus className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-[11px] font-bold">Kéo thả hình ảnh vào đây hoặc nhấp để chọn file</p>
                      <p className="text-[10px] text-slate-400">Chấp nhận PNG, JPG, GIF dạng dữ liệu Base64 tối giản</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingEq(null)}
                  className="px-4 py-2 bg-slate-100 rounded text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-505 text-white rounded font-bold cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD MAINTENANCE LOG */}
      {showAddLogModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden font-sans text-xs">
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Báo Cáo Nghiệm Thu Bảo Dưỡng Thiết Bị</h3>
              </div>
              <button onClick={() => setShowAddLogModal(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleAddMaintenanceLog} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase">Chọn thiết bị đã bảo dưỡng</label>
                <select
                  value={newLog.equipmentId}
                  onChange={(e) => setNewLog({ ...newLog, equipmentId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 text-xs font-bold"
                  required
                >
                  <option value="">-- Chọn máy móc bảo dưỡng --</option>
                  {equipments.map(item => <option key={item.id} value={item.id}>[{item.id}] - {item.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Dạng Thức Bảo Dưỡng</label>
                  <select
                    value={newLog.type}
                    onChange={(e) => setNewLog({ ...newLog, type: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  >
                    <option value="Định kỳ">Định kỳ</option>
                    <option value="Đột xuất">Đột xuất (Repair)</option>
                    <option value="Hiệu chuẩn">Kiểm chuẩn (Calibration)</option>
                    <option value="Nâng cấp">Nâng cấp cơ khí</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Lượng Chi Phí Đo (VNĐ)</label>
                  <input
                    type="number"
                    value={newLog.cost}
                    onChange={(e) => setNewLog({ ...newLog, cost: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Kỹ Sư hoặc Nhà Thầu làm</label>
                  <select
                    value={newLog.technician}
                    onChange={(e) => setNewLog({ ...newLog, technician: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  >
                    {staff.map(s => <option key={s.name} value={s.name}>{s.name} ({s.role.substring(0, 10)}...)</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Trạng Thái Biên Bản</label>
                  <select
                    value={newLog.status}
                    onChange={(e) => setNewLog({ ...newLog, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 text-xs font-bold"
                  >
                    <option value="Thành công">🟢 Thành công (Boost 100% Health)</option>
                    <option value="Chờ phê duyệt">🟡 Chờ phê duyệt</option>
                    <option value="Tạm dừng">🔴 Tạm dừng</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase">Vật Tư & Phụ Kiện Thay Thế</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lõi lọc nén khí, dây đai truyền tải 12,..."
                  value={newLog.replacedParts}
                  onChange={(e) => setNewLog({ ...newLog, replacedParts: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-805"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase">Nội Dung Nghiệm Thu / Ghi Chú Bảo Dưỡng</label>
                <textarea
                  placeholder="Ghi nhận rõ thao tác mở bộc đầu lốc, kiểm van, nạp dải keo dính hay hiệu chuẩn tọa độ cụ thể."
                  value={newLog.details}
                  onChange={(e) => setNewLog({ ...newLog, details: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  required
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddLogModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold cursor-pointer"
                >
                  Hoàn Tất Nghiệm Thu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD INCIDENT */}
      {showAddIncModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden font-sans text-xs">
            <div className="bg-red-950 p-5 text-white flex justify-between items-center border-b border-rose-900">
              <div className="flex items-center gap-2 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-bold text-rose-105">Báo Cáo Sự Cố Dừng Chuyền / Máy Mới</h3>
              </div>
              <button onClick={() => setShowAddIncModal(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleAddIncident} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase">Chọn máy gặp sự cố hỏng hóc</label>
                <select
                  value={newInc.equipmentId}
                  onChange={(e) => setNewInc({ ...newInc, equipmentId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 text-xs font-bold"
                  required
                >
                  <option value="">-- Chọn máy và vị trí kẹt lỗi --</option>
                  {equipments.map(item => <option key={item.id} value={item.id}>[{item.id}] - {item.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Mức Độ Nghiêm Trọng</label>
                  <select
                    value={newInc.severity}
                    onChange={(e) => setNewInc({ ...newInc, severity: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  >
                    <option value="Warning">Warning (Cảnh báo chạy giật lùi)</option>
                    <option value="Critical">Critical (Dừng chuyền sản xuất gấp!)</option>
                    <option value="Minor">Minor (Chỉ số kẹt nhẹ ngoại vi)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Người Khai Báo / Phát Hiện</label>
                  <input
                    type="text"
                    value={newInc.reportedBy}
                    onChange={(e) => setNewInc({ ...newInc, reportedBy: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase">Chi Tiết Hiện Tượng Lỗi / Dừng Chuyền máy</label>
                <textarea
                  placeholder="Mô tả hiện tượng kẹt bavia, sụt áp suất hơi, lệch cam, hoặc tiếng gầm rú rung giật..."
                  value={newInc.description}
                  onChange={(e) => setNewInc({ ...newInc, description: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  required
                ></textarea>
              </div>

              <div className="p-3 bg-red-50 text-red-800 rounded-xl leading-relaxed text-[11px] border border-red-150">
                <strong>💡 Lưu ý xử lý của QC:</strong>
                <p className="mt-0.5">Khai báo xong, hệ thống sẽ tự đặt máy móc này về tình trạng <strong>[Sửa Chữa - Under Repair]</strong> và giảm 30 điểm sức khỏe. Muốn kích hoạt máy chạy lại, hãy sang thẻ 'Xử lý nghiệm thu sự cố' để đóng biên bản sau khi thợ thầu sửa xong.</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddIncModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-505 text-white rounded font-bold cursor-pointer"
                >
                  Khai Báo Sự Cố Dừng Máy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: FIX / RESOLVE INCIDENT */}
      {showResolveIncModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden font-sans text-xs">
            <div className="bg-emerald-950 p-5 text-white flex justify-between items-center border-b border-emerald-900">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Nghiệm Thu Khắc Phục Lỗi Sự Cố Thiết Bị</h3>
              </div>
              <button onClick={() => setShowResolveIncModal(null)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 bg-slate-50 border-b flex justify-between text-[11px] text-slate-600 font-medium">
              <span>Sự sự cố: <strong className="font-mono text-indigo-700">{showResolveIncModal.id}</strong></span>
              <span>Thiết Bị: <strong className="text-slate-800">{showResolveIncModal.equipmentName}</strong></span>
            </div>

            <form onSubmit={handleResolveIncidentSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Kỹ Sư Đã Sửa Chữa Chốt</label>
                  <select
                    value={resolveTechnician}
                    onChange={(e) => setResolveTechnician(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  >
                    {staff.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Số Phút Dừng Máy Thực Tế</label>
                  <input
                    type="number"
                    value={resolveDowntime}
                    onChange={(e) => setResolveDowntime(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Tổng Chi Phí Vật Tư & Sửa (VNĐ)</label>
                  <input
                    type="number"
                    value={resolveRepairCost}
                    onChange={(e) => setResolveRepairCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-black uppercase">Ngày Sửa Thành Công</label>
                  <input
                    type="text"
                    value={new Date().toLocaleDateString('vi-VN')}
                    className="w-full bg-slate-200 border border-slate-200 rounded p-2 text-slate-500 cursor-not-allowed"
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase font-bold">Nguyên Nhân Gốc Rễ (Root Cause Analysis)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Rò rỉ gioăng áp lực thủy lực hoặc đấu nối nguồn điện ngược pha..."
                  value={resolveRootCause}
                  onChange={(e) => setResolveRootCause(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-black uppercase font-bold">Hành Động Khắc Phục / Chi Tiết Sửa</label>
                <textarea
                  placeholder="Mô tả kỹ thao tác quấn cao su, xiết chặn béc hàn hoặc đấu nối đảo pha pha cấp nguồn máy nén..."
                  value={resolveRepairAction}
                  onChange={(e) => setResolveRepairAction(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  required
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowResolveIncModal(null)}
                  className="px-4 py-2 bg-slate-100 rounded text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold cursor-pointer"
                >
                  Hoàn Tất Khắc Phục Lỗi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
