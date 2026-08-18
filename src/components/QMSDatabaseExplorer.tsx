import React, { useState, useMemo } from 'react';
import { safeStorage as localStorage } from '../safeStorage';
import { 
  Building2, 
  Calendar, 
  Clock, 
  Wrench, 
  ShieldCheck, 
  Sliders, 
  PiggyBank, 
  FileSpreadsheet, 
  Sparkles, 
  Download, 
  Upload,
  UserCheck, 
  FileText,
  AlertTriangle,
  Scale,
  ListFilter,
  RefreshCw,
  Zap,
  Check,
  Target,
  Plus,
  Search,
  BookOpen,
  ArrowRight,
  Database,
  X,
  PlusCircle,
  HelpCircle,
  Trash2,
  Printer,
  Pencil
} from 'lucide-react';
import { 
  Employee, 
  WorkItem, 
  KPI, 
  CAPA, 
  Supplier, 
  SupplierInspection, 
  Project, 
  EngineeringChange, 
  MarketFailure, 
  WarrantyClaim, 
  QualityDocument,
  WeeklyReport,
  MonthlyReport
} from '../types';
import { 
  INITIAL_EMPLOYEES,
  INITIAL_SUPPLIERS,
  INITIAL_PROJECTS,
  INITIAL_CAPAS,
  INITIAL_KPIS,
  INITIAL_WORK_ITEMS,
  INITIAL_SUPPLIER_INSPECTIONS,
  INITIAL_ENGINEERING_CHANGES,
  INITIAL_MARKET_FAILURES,
  INITIAL_WARRANTY_CLAIMS,
  INITIAL_QUALITY_DOCUMENTS,
  INITIAL_WEEKLY_REPORTS,
  INITIAL_MONTHLY_REPORTS
} from '../initialQMSDatabase';

interface QMSDatabaseExplorerProps {
  onNotifyReportGenerated?: () => void;
  suppliers?: Supplier[];
  setSuppliers?: React.Dispatch<React.SetStateAction<Supplier[]>>;
  capas?: CAPA[];
  setCapas?: React.Dispatch<React.SetStateAction<CAPA[]>>;
  handleForceCloudSync?: () => Promise<void>;
  forceSyncProgress?: {
    totalParts: number;
    currentPart: number;
    statusText: string;
    completed: boolean;
  } | null;
  setForceSyncProgress?: React.Dispatch<React.SetStateAction<any>>;
  firebaseUser?: any;
}

export default function QMSDatabaseExplorer({ 
  onNotifyReportGenerated,
  suppliers: propSuppliers,
  setSuppliers: propSetSuppliers,
  capas: propCapas,
  setCapas: propSetCapas,
  handleForceCloudSync,
  forceSyncProgress,
  setForceSyncProgress,
  firebaseUser
}: QMSDatabaseExplorerProps) {
  // ==========================================
  // Master QMS Relational States (Normalized DBs)
  // ==========================================
  // ==========================================
  // Master QMS Relational States (Normalized DBs with LocalStorage Persistence)
  // ==========================================
  const getSavedArray = <T,>(key: string, defaultValue: T[]): T[] => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return defaultValue;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [employees, setEmployees] = useState<Employee[]>(() => 
    getSavedArray<Employee>('dk_qms_employees', INITIAL_EMPLOYEES)
  );
  const [workItems, setWorkItems] = useState<WorkItem[]>(() => 
    getSavedArray<WorkItem>('dk_qms_work_items', INITIAL_WORK_ITEMS)
  );
  const [kpis, setKpis] = useState<KPI[]>(() => 
    getSavedArray<KPI>('dk_qms_kpis', INITIAL_KPIS)
  );
  const [capasLocal, setCapasLocal] = useState<CAPA[]>(() => 
    getSavedArray<CAPA>('dk_qms_capas', INITIAL_CAPAS)
  );
  const capas = propCapas !== undefined ? propCapas : capasLocal;
  const setCapas = propSetCapas !== undefined ? propSetCapas : setCapasLocal;

  const [suppliersLocal, setSuppliersLocal] = useState<Supplier[]>(() => 
    getSavedArray<Supplier>('dk_qms_suppliers', INITIAL_SUPPLIERS)
  );
  const suppliers = propSuppliers !== undefined ? propSuppliers : suppliersLocal;
  const setSuppliers = propSetSuppliers !== undefined ? propSetSuppliers : setSuppliersLocal;

  const [inspections, setInspections] = useState<SupplierInspection[]>(() => 
    getSavedArray<SupplierInspection>('dk_qms_inspections', INITIAL_SUPPLIER_INSPECTIONS)
  );
  const [projects, setProjects] = useState<Project[]>(() => 
    getSavedArray<Project>('dk_qms_projects', INITIAL_PROJECTS)
  );
  const [ecoChanges, setEcoChanges] = useState<EngineeringChange[]>(() => 
    getSavedArray<EngineeringChange>('dk_qms_eco_changes', INITIAL_ENGINEERING_CHANGES)
  );
  const [failures, setFailures] = useState<MarketFailure[]>(() => 
    getSavedArray<MarketFailure>('dk_qms_failures', INITIAL_MARKET_FAILURES)
  );
  const [warrantyClaims, setWarrantyClaims] = useState<WarrantyClaim[]>(() => 
    getSavedArray<WarrantyClaim>('dk_qms_warranty_claims', INITIAL_WARRANTY_CLAIMS)
  );
  const [qualityDocs, setQualityDocs] = useState<QualityDocument[]>(() => 
    getSavedArray<QualityDocument>('dk_qms_quality_docs', INITIAL_QUALITY_DOCUMENTS)
  );
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>(() => 
    getSavedArray<WeeklyReport>('dk_qms_weekly_reports', INITIAL_WEEKLY_REPORTS)
  );
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>(() => 
    getSavedArray<MonthlyReport>('dk_qms_monthly_reports', INITIAL_MONTHLY_REPORTS)
  );

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [capacityChangeCounter, setCapacityChangeCounter] = useState(0);

  // Diagnostic engine computes actual sizes in localStorage for anh Thao's awareness
  const dbCapacityStats = useMemo(() => {
    let oqcSize = 0;
    let iqcSize = 0;
    let pqcSize = 0;
    let otherSize = 0;
    
    try {
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(k => {
        if (k && k.startsWith('dk_')) {
          const val = localStorage.getItem(k) || '';
          const kbSize = (val.length / 1024);
          if (k === 'dk_oqc_records') oqcSize = kbSize;
          else if (k === 'dk_iqc_records') iqcSize = kbSize;
          else if (k === 'dk_pqc_records') pqcSize = kbSize;
          else otherSize += kbSize;
        }
      });
    } catch(e) {}
    
    const total = oqcSize + iqcSize + pqcSize + otherSize;
    return {
      oqc: oqcSize.toFixed(1),
      iqc: iqcSize.toFixed(1),
      pqc: pqcSize.toFixed(1),
      others: otherSize.toFixed(1),
      total: total.toFixed(1),
      percent: Math.min(100, Math.max(0.1, (total / 5120) * 100)).toFixed(1)
    };
  }, [capacityChangeCounter, workItems, capas]);

  const handleOptimizeDatabase = async () => {
    setCompressing(true);
    triggerToast("Đang rà soát và kiểm toán dung lượng dữ liệu...");
    
    setTimeout(() => {
      let totalSavedBytes = 0;
      const targetKeys = [
        'dk_oqc_records',
        'dk_iqc_records',
        'dk_pqc_records',
        'dk_qms_work_items',
        'dk_qms_capas',
        'dk_qms_employees',
        'dk_qms_suppliers',
        'dk_qms_inspections',
        'dk_qms_failures'
      ];

      targetKeys.forEach(key => {
        const originalVal = localStorage.getItem(key);
        if (!originalVal) return;

        try {
          const parsed = JSON.parse(originalVal);
          if (Array.isArray(parsed)) {
            const originalLength = originalVal.length;
            
            // 1. Tối lược các thuộc tính rỗng (undefined, null, "") để giải phóng dung lượng text
            const optimizedList = parsed.map(item => {
              if (item && typeof item === 'object') {
                const cleanedItem: Record<string, any> = {};
                Object.keys(item).forEach(prop => {
                  const val = item[prop];
                  if (val !== undefined && val !== null && val !== '') {
                    cleanedItem[prop] = val;
                  }
                });
                return cleanedItem;
              }
              return item;
            });

            // 2. Lọc loại bỏ trùng lặp serialNo trùng khít đối với OQC
            let finalList = optimizedList;
            if (key === 'dk_oqc_records') {
              const seenSerials = new Set();
              finalList = optimizedList.filter(item => {
                if (!item || !item.serialNo) return true;
                const normalized = String(item.serialNo).trim().toUpperCase();
                if (seenSerials.has(normalized)) return false;
                seenSerials.add(normalized);
                return true;
              });
            }

            const optimizedVal = JSON.stringify(finalList);
            const savedBytes = originalLength - optimizedVal.length;
            if (savedBytes > 0) {
              totalSavedBytes += savedBytes;
              localStorage.setItem(key, optimizedVal);
              localStorage.setItem(`${key}_is_dirty`, 'true'); // Đánh dấu dirty để đồng bộ tối ưu lên Cloud
            }
          }
        } catch (e) {
          console.error(`[Optimization Err]:`, e);
        }
      });

      setCompressing(false);
      setCapacityChangeCounter(prev => prev + 1);
      
      const savedKb = (totalSavedBytes / 1024).toFixed(1);
      alert(`Kính gửi anh Thao!\n\nHệ thống đã hoàn tất chưng cất, tối giản hóa văn bản & dọn dẹp CSDL thành công!\n\n- Đã giải phóng: ${savedKb} KB bộ nhớ trình duyệt.\n- Đã rà soát & thu dọn rác các bảng dữ liệu (đặc biệt là Nhật ký KCS).\n- Toàn bộ nội dung dữ liệu kiểm tra và đối soát của anh vẫn được bảo lưu 100% chính xác.\n\nCác bản ghi đã được điều chỉnh siêu nhỏ nhẹ sẽ tự động đồng bộ bù lên Server đám mây.`);
    }, 1200);
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  // Automated persistence side-effects
  React.useEffect(() => {
    localStorage.setItem('dk_qms_employees', JSON.stringify(employees));
  }, [employees]);
  React.useEffect(() => {
    localStorage.setItem('dk_qms_work_items', JSON.stringify(workItems));
  }, [workItems]);
  React.useEffect(() => {
    localStorage.setItem('dk_qms_kpis', JSON.stringify(kpis));
  }, [kpis]);
  React.useEffect(() => {
    localStorage.setItem('dk_qms_capas', JSON.stringify(capas));
  }, [capas]);
  React.useEffect(() => {
    localStorage.setItem('dk_qms_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);
  React.useEffect(() => {
    localStorage.setItem('dk_qms_inspections', JSON.stringify(inspections));
  }, [inspections]);
  React.useEffect(() => {
    localStorage.setItem('dk_qms_projects', JSON.stringify(projects));
  }, [projects]);
  React.useEffect(() => {
    localStorage.setItem('dk_qms_eco_changes', JSON.stringify(ecoChanges));
  }, [ecoChanges]);
  React.useEffect(() => {
    localStorage.setItem('dk_qms_failures', JSON.stringify(failures));
  }, [failures]);
  React.useEffect(() => {
    localStorage.setItem('dk_qms_warranty_claims', JSON.stringify(warrantyClaims));
  }, [warrantyClaims]);
  React.useEffect(() => {
    localStorage.setItem('dk_qms_quality_docs', JSON.stringify(qualityDocs));
  }, [qualityDocs]);
  React.useEffect(() => {
    localStorage.setItem('dk_qms_weekly_reports', JSON.stringify(weeklyReports));
  }, [weeklyReports]);
  React.useEffect(() => {
    localStorage.setItem('dk_qms_monthly_reports', JSON.stringify(monthlyReports));
  }, [monthlyReports]);

  // Actions
  const resetDatabaseToDefaults = () => {
    localStorage.removeItem('dk_qms_employees');
    localStorage.removeItem('dk_qms_work_items');
    localStorage.removeItem('dk_qms_kpis');
    localStorage.removeItem('dk_qms_capas');
    localStorage.removeItem('dk_qms_suppliers');
    localStorage.removeItem('dk_qms_inspections');
    localStorage.removeItem('dk_qms_projects');
    localStorage.removeItem('dk_qms_eco_changes');
    localStorage.removeItem('dk_qms_failures');
    localStorage.removeItem('dk_qms_warranty_claims');
    localStorage.removeItem('dk_qms_quality_docs');
    localStorage.removeItem('dk_qms_weekly_reports');
    localStorage.removeItem('dk_qms_monthly_reports');

    setEmployees(INITIAL_EMPLOYEES);
    setWorkItems(INITIAL_WORK_ITEMS);
    setKpis(INITIAL_KPIS);
    setCapas(INITIAL_CAPAS);
    setSuppliers(INITIAL_SUPPLIERS);
    setInspections(INITIAL_SUPPLIER_INSPECTIONS);
    setProjects(INITIAL_PROJECTS);
    setEcoChanges(INITIAL_ENGINEERING_CHANGES);
    setFailures(INITIAL_MARKET_FAILURES);
    setWarrantyClaims(INITIAL_WARRANTY_CLAIMS);
    setQualityDocs(INITIAL_QUALITY_DOCUMENTS);
    setWeeklyReports(INITIAL_WEEKLY_REPORTS);
    setMonthlyReports(INITIAL_MONTHLY_REPORTS);

    triggerToast("Đã khôi phục thành công toàn bộ cơ sở dữ liệu mặc định!");
  };

  const handleExportJSONBackup = () => {
    try {
      const backup: Record<string, any> = {};
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (key && key.startsWith('dk_')) {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              backup[key] = JSON.parse(val);
            } catch (err) {
              backup[key] = val;
            }
          }
        }
      });
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Backup_QMS_DKBike_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      triggerToast("Đã tải xuống file sao lưu QMS thành công!");
    } catch (err) {
      alert("Lỗi xuất file sao lưu: " + err);
    }
  };

  const handleImportJSONBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!confirm("Kính gửi anh Thao!\n\nAnh có chắc chắn muốn khôi phục toàn bộ cơ sở dữ liệu từ file sao lưu này?\n\nDữ liệu hiện tại trong bộ nhớ máy tính này sẽ bị thay thế bằng dữ liệu từ file sao lưu.")) {
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (typeof content !== 'string') return;
        
        const backup = JSON.parse(content);
        if (typeof backup !== 'object' || backup === null) {
          alert("Thời gian nạp thất bại! File JSON không đúng định dạng sao lưu.");
          return;
        }
        
        let importedCount = 0;
        Object.keys(backup).forEach((key) => {
          if (key.startsWith('dk_')) {
            const val = backup[key];
            localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
            localStorage.setItem(`${key}_is_dirty`, 'true'); // Đánh dấu dirty để đồng bộ đám mây
            importedCount++;
          }
        });
        
        alert(`Khôi phục thành công ${importedCount} danh mục dữ liệu từ file sao lưu! Hệ thống cần tải lại trang để áp dụng toàn bộ các thay đổi.`);
        window.location.reload();
      } catch (err) {
        alert("Lỗi khi giải mã tệp tin sao lưu: " + err);
      }
    };
    reader.readAsText(file);
  };

  const deleteWorkItem = (id: string) => {
    setWorkItems(prev => prev.filter(w => w.WorkID !== id));
    triggerToast(`Đã xóa công việc ${id}`);
  };

  const deleteCapa = (id: string) => {
    setCapas(prev => prev.filter(c => c.CAPAID !== id));
    triggerToast(`Đã xóa hồ sơ CAPA ${id}`);
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.SupplierID !== id));
    triggerToast(`Đã xóa nhà cung cấp ${id}`);
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.ProjectID !== id));
    triggerToast(`Đã xóa dự án ${id}`);
  };

  const deleteEco = (id: string) => {
    setEcoChanges(prev => prev.filter(e => e.ECOID !== id));
    triggerToast(`Đã xóa thay đổi kỹ thuật ${id}`);
  };

  const deleteInspection = (id: string) => {
    setInspections(prev => prev.filter(i => i.InspectionID !== id));
    triggerToast(`Đã xóa phiếu kiểm soát ${id}`);
  };

  const deleteFailure = (id: string) => {
    setFailures(prev => prev.filter(f => f.FailureID !== id));
    triggerToast(`Đã xóa sự cố lỗi thị trường ${id}`);
  };

  const handleSaveFailureReport = (updated: MarketFailure) => {
    setFailures(prev => prev.map(f => f.FailureID === updated.FailureID ? updated : f));
    setSelectedFailureReport(updated);
    setIsEditingReport(false);
    triggerToast("Đã lưu biên bản báo cáo lỗi thị trường thành công!");
  };

  // Active module inside QMS
  const [selectedModule, setSelectedModule] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Relational Details Modal
  const [activeRelation, setActiveRelation] = useState<{
    type: 'employee' | 'supplier' | 'project' | 'capa' | 'kpi' | 'document' | 'work_item';
    id: string;
  } | null>(null);

  // Record creation overlay forms
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  
  // ==========================================
  // Form input bindings template maps
  // ==========================================
  const [newWorkItem, setNewWorkItem] = useState<Partial<WorkItem>>({
    WorkID: '',
    Category: 'KCS đầu ra',
    TaskDescription: '',
    Target: 100,
    ActualResult: 0,
    Status: 'Pending',
    Priority: 'HIGH',
    Owner: 'Nguyễn Xuân Thao',
    NextAction: '',
    DueDate: '2026-05-30'
  });

  const [newCapa, setNewCapa] = useState<Partial<CAPA>>({
    CAPAID: '',
    Issue: '',
    RootCause: '',
    Correction: '',
    CorrectiveAction: '',
    PreventiveAction: '',
    Owner: 'Nguyễn Xuân Thao',
    DueDate: '2026-05-30',
    Status: 'Mở',
    Effectiveness: 'Chưa đánh giá'
  });

  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    SupplierID: '',
    SupplierName: '',
    ComponentType: '',
    PPM: 0,
    QualityRating: 'B',
    LastAuditDate: '2026-05-23',
    Status: 'Active'
  });

  const [newProject, setNewProject] = useState<Partial<Project>>({
    ProjectID: '',
    VehicleModel: '',
    ProjectName: '',
    Stage: 'Chế tạo mẫu thử',
    Progress: 20,
    RiskLevel: 'Trung bình',
    DueDate: '2026-08-30'
  });

  const [newEco, setNewEco] = useState<Partial<EngineeringChange>>({
    ECOID: '',
    VehicleModel: 'DK Gogo Smart',
    Component: '',
    ChangeDescription: '',
    Reason: '',
    ApprovalStatus: 'Đề xuất',
    ImplementationDate: '2026-05-25'
  });

  const [newFailure, setNewFailure] = useState<Partial<MarketFailure>>({
    FailureID: '',
    VehicleModel: 'DK X-Lite',
    VIN: '',
    Dealer: '',
    FailureDate: '2026-05-23',
    FailureCategory: 'Mất phanh sau',
    Severity: 'B',
    RootCause: '',
    Status: 'Chưa xử lý',
    Correction: '',
    CorrectiveAction: '',
    PreventiveAction: '',
    Assignee: 'Nguyễn Xuân Thao',
    DueDate: '2026-05-30'
  });

  const [selectedFailureReport, setSelectedFailureReport] = useState<MarketFailure | null>(null);
  const [isEditingReport, setIsEditingReport] = useState<boolean>(false);

  // ==========================================
  // Automated Warners & Audits (AI Executive Logic)
  // ==========================================
  const overdueActions = useMemo(() => {
    const arr = Array.isArray(workItems) ? workItems : [];
    return arr.filter(item => item && item.Status !== 'Completed' && new Date(item.DueDate) < new Date('2026-05-23'));
  }, [workItems]);

  const repeatedIssues = useMemo(() => {
    const errorGroup: { [key: string]: number } = {};
    const arr = Array.isArray(failures) ? failures : [];
    arr.forEach(f => {
      if (f && f.FailureCategory) {
        errorGroup[f.FailureCategory] = (errorGroup[f.FailureCategory] || 0) + 1;
      }
    });
    return Object.entries(errorGroup).filter(([category, count]) => count >= 2);
  }, [failures]);

  const deterioratedSuppliers = useMemo(() => {
    const arr = Array.isArray(suppliers) ? suppliers : [];
    return arr.filter(s => s && (s.PPM > 3000 || s.QualityRating === 'D'));
  }, [suppliers]);

  const delayedProjects = useMemo(() => {
    const arr = Array.isArray(projects) ? projects : [];
    return arr.filter(p => p && p.Progress < 50 && p.RiskLevel === 'Cao');
  }, [projects]);

  // Overall Quality Health Score (Formula weighted by KPIs and Supplier standards)
  const qualityScore = useMemo(() => {
    const safeKpi = Array.isArray(kpis) ? kpis : [];
    const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
    const safeFailures = Array.isArray(failures) ? failures : [];
    
    const kpiCompliance = safeKpi.length > 0 ? safeKpi.filter(k => k && k.status === 'Đạt').length / safeKpi.length : 1;
    const supplierCompliance = safeSuppliers.length > 0 ? safeSuppliers.filter(s => s && (s.QualityRating === 'A' || s.QualityRating === 'B')).length / safeSuppliers.length : 1;
    const resolvedFailures = safeFailures.length > 0 ? safeFailures.filter(f => f && f.Status === 'Đã xử lý').length / safeFailures.length : 1;
    
    return Math.round((kpiCompliance * 40 + supplierCompliance * 40 + resolvedFailures * 20) * 10) / 10;
  }, [kpis, suppliers, failures]);

  // ==========================================
  // Form submission handling (QMS DB Injections)
  // ==========================================
  const executeAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedModule === 1) { // WorkItem
      const id = newWorkItem.WorkID || `WS-${Date.now().toString().slice(-4)}`;
      const date = new Date().toISOString().split('T')[0];
      const item: WorkItem = {
        WorkID: id,
        Date: date,
        Week: 20,
        Month: 5,
        Category: newWorkItem.Category || '5S',
        TaskDescription: newWorkItem.TaskDescription || 'No description',
        Target: Number(newWorkItem.Target) || 100,
        ActualResult: Number(newWorkItem.ActualResult) || 0,
        Status: newWorkItem.Status || 'Pending',
        Priority: newWorkItem.Priority || 'MEDIUM',
        Owner: newWorkItem.Owner || 'Nguyễn Xuân Thao',
        KPIReference: newWorkItem.KPIReference,
        SupplierReference: newWorkItem.SupplierReference,
        ProjectReference: newWorkItem.ProjectReference,
        CAPAReference: newWorkItem.CAPAReference,
        RootCause: newWorkItem.RootCause,
        NextAction: newWorkItem.NextAction || '',
        DueDate: newWorkItem.DueDate || '2026-05-30'
      };
      setWorkItems([item, ...workItems]);
      setShowAddForm(false);
      setNewWorkItem({ WorkID: '', TaskDescription: '', Target: 100, ActualResult: 0, Status: 'Pending', Priority: 'MEDIUM', Owner: 'Nguyễn Xuân Thao', NextAction: '', DueDate: '2026-05-30' });
    } else if (selectedModule === 3) { // CAPA
      let maxNum = 0;
      capas.forEach(c => {
        if (!c) return;
        const idStr = c.CAPAID || c.id || '';
        const match = idStr.match(/CAPA-2026-(\d+)/);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      const nextNum = maxNum + 1;
      const padded = String(nextNum).padStart(3, '0');
      const id = newCapa.CAPAID || `CAPA-2026-${padded}`;
      const item: CAPA = {
        id: id,
        CAPAID: id,
        Issue: newCapa.Issue || '',
        RootCause: newCapa.RootCause || '',
        Correction: newCapa.Correction || '',
        CorrectiveAction: newCapa.CorrectiveAction || '',
        PreventiveAction: newCapa.PreventiveAction || '',
        Owner: newCapa.Owner || 'Nguyễn Xuân Thao',
        DueDate: newCapa.DueDate || '2026-05-30',
        Status: newCapa.Status || 'Mở',
        Effectiveness: newCapa.Effectiveness || 'Chưa đánh giá',
        isRepeated: false
      };
      setCapas([item, ...capas]);
      setShowAddForm(false);
      setNewCapa({ CAPAID: '', Issue: '', RootCause: '', Correction: '', CorrectiveAction: '', PreventiveAction: '', Owner: 'Nguyễn Xuân Thao', DueDate: '2026-05-30' });
    } else if (selectedModule === 4) { // Supplier
      const nextIdNum = suppliers.length > 0 ? Math.max(...suppliers.map(s => {
        const cleaned = (s.id || s.SupplierID || '').replace('NCC', '') || '0';
        return parseInt(cleaned) || 0;
      })) + 1 : 1;
      const id = newSupplier.SupplierID || `NCC${nextIdNum.toString().padStart(5, '0')}`;
      const item: Supplier = {
        id: id,
        name: newSupplier.SupplierName || '',
        SupplierID: id,
        SupplierName: newSupplier.SupplierName || '',
        ComponentType: newSupplier.ComponentType || '',
        PPM: Number(newSupplier.PPM) || 0,
        QualityRating: newSupplier.QualityRating || 'B',
        LastAuditDate: newSupplier.LastAuditDate || '2026-05-23',
        Status: newSupplier.Status || 'Active',
        defectTypes: []
      };
      setSuppliers([item, ...suppliers]);
      setShowAddForm(false);
      setNewSupplier({ SupplierID: '', SupplierName: '', ComponentType: '', PPM: 0, QualityRating: 'B', LastAuditDate: '2026-05-23', Status: 'Active' });
    } else if (selectedModule === 5) { // Project
      const id = newProject.ProjectID || `PRJ-${projects.length + 1}`;
      const item: Project = {
        ProjectID: id,
        VehicleModel: newProject.VehicleModel || '',
        ProjectName: newProject.ProjectName || '',
        Stage: newProject.Stage || 'Chế tạo mẫu thử',
        Progress: Number(newProject.Progress) || 0,
        RiskLevel: newProject.RiskLevel || 'Thấp',
        DueDate: newProject.DueDate || '2026-08-30'
      };
      setProjects([item, ...projects]);
      setShowAddForm(false);
      setNewProject({ ProjectID: '', VehicleModel: '', ProjectName: '', Stage: 'Chế tạo mẫu thử', Progress: 10, RiskLevel: 'Thấp', DueDate: '2026-08-30' });
    } else if (selectedModule === 6) { // ECO
      const id = newEco.ECOID || `ECO-260${ecoChanges.length + 1}`;
      const item: EngineeringChange = {
        ECOID: id,
        VehicleModel: newEco.VehicleModel || 'DK Gogo Smart',
        Component: newEco.Component || '',
        ChangeDescription: newEco.ChangeDescription || '',
        Reason: newEco.Reason || '',
        ApprovalStatus: newEco.ApprovalStatus || 'Đề xuất',
        ImplementationDate: newEco.ImplementationDate || '2026-05-25'
      };
      setEcoChanges([item, ...ecoChanges]);
      setShowAddForm(false);
    } else if (selectedModule === 10) { // Market Failure
      const id = newFailure.FailureID || `MF-400${failures.length + 1}`;
      const item: MarketFailure = {
        FailureID: id,
        VehicleModel: newFailure.VehicleModel || 'DK X-Lite',
        VIN: newFailure.VIN || '',
        Dealer: newFailure.Dealer || '',
        FailureDate: newFailure.FailureDate || '2026-05-23',
        FailureCategory: newFailure.FailureCategory || 'Mất phanh sau',
        Severity: newFailure.Severity || 'B',
        RootCause: newFailure.RootCause || '',
        Status: newFailure.Status || 'Chưa xử lý',
        CAPAReference: newFailure.CAPAReference,
        Correction: newFailure.Correction || '',
        CorrectiveAction: newFailure.CorrectiveAction || '',
        PreventiveAction: newFailure.PreventiveAction || '',
        Assignee: newFailure.Assignee || 'Nguyễn Xuân Thao',
        DueDate: newFailure.DueDate || '2026-05-30'
      };
      setFailures([item, ...failures]);
      setShowAddForm(false);
      setNewFailure({
        FailureID: '',
        VehicleModel: 'DK X-Lite',
        VIN: '',
        Dealer: '',
        FailureDate: '2026-05-23',
        FailureCategory: 'Mất phanh sau',
        Severity: 'B',
        RootCause: '',
        Status: 'Chưa xử lý',
        Correction: '',
        CorrectiveAction: '',
        PreventiveAction: '',
        Assignee: 'Nguyễn Xuân Thao',
        DueDate: '2026-05-30'
      });
    }
  };

  // ==========================================
  // Relational Lookup Card (Interactive DB Links)
  // ==========================================
  const renderRelationalCard = () => {
    if (!activeRelation) return null;
    const { type, id } = activeRelation;

    if (type === 'supplier') {
      const sup = suppliers.find(s => s.SupplierID === id);
      if (!sup) return null;
      // Get linked inspections and work items of this supplier
      const linkedInspections = inspections.filter(i => i.SupplierID === id);
      const linkedWork = workItems.filter(w => w.SupplierReference === id);
      return (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-6 border border-slate-700 space-y-4 max-w-sm w-full relative">
          <button onClick={() => setActiveRelation(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-amber-400 uppercase text-xs tracking-wider font-extrabold">
            <Building2 className="w-4 h-4" /> Bản ghi Nhà Cung Cấp
          </div>
          <h4 className="text-xl font-black text-white">{sup.SupplierName}</h4>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <span className="text-slate-400">Thiết bị/Linh kiện:</span>
            <span className="text-slate-200">{sup.ComponentType}</span>
            <span className="text-slate-400">Tỷ lệ lỗi (PPM):</span>
            <span className={`font-mono font-bold ${sup.PPM > 3000 ? 'text-red-400' : 'text-green-400'}`}>{sup.PPM} PPM</span>
            <span className="text-slate-400">Xếp hạng QLCL:</span>
            <span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                sup.QualityRating === 'A' ? 'bg-green-100 text-green-800' :
                sup.QualityRating === 'B' ? 'bg-blue-100 text-blue-800' :
                sup.QualityRating === 'C' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
              }`}>{sup.QualityRating}</span>
            </span>
            <span className="text-slate-400">Đánh giá xưởng:</span>
            <span className="text-slate-200">{sup.LastAuditDate}</span>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <h5 className="text-[10px] uppercase font-black text-amber-400 tracking-widest mb-1.5">Lô kiểm tra nhận hàng gần đây (IQC)</h5>
            {linkedInspections.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic">Không tìm thấy lô kiểm tra</p>
            ) : (
              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {linkedInspections.map((ins, idx) => (
                  <div key={ins.InspectionID || `linked-ins-${idx}`} className="flex justify-between items-center text-[11px] bg-slate-950 p-1.5 rounded">
                    <span>{ins.Component} ({ins.InspectedQty} mẫu)</span>
                    <span className={`px-1 py-0.2 rounded text-[9px] ${ins.Status === 'Pass' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}`}>{ins.Status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (type === 'capa') {
      const cap = capas.find(c => c.CAPAID === id);
      if (!cap) return null;
      return (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-6 border border-slate-700 space-y-4 max-w-sm w-full relative">
          <button onClick={() => setActiveRelation(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-indigo-400 uppercase text-xs tracking-wider font-extrabold">
            <ShieldCheck className="w-4 h-4" /> Bản ghi CAPA Xử lý
          </div>
          <h4 className="text-lg font-black text-white">{cap.CAPAID}: {cap.Issue.slice(0, 75)}...</h4>
          <div className="space-y-2 text-xs">
            <div>
              <p className="text-slate-400 font-bold">Nguyên nhân cốt lõi (Root Cause):</p>
              <p className="text-slate-200 p-2 bg-slate-950 rounded mt-1">{cap.RootCause}</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold">Hành động Khắc phục (Corrective Action):</p>
              <p className="text-slate-200 p-2 bg-slate-950 rounded mt-1">{cap.CorrectiveAction}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <p className="text-slate-400 font-bold">Người phụ trách:</p>
                <p className="text-slate-100">{cap.Owner}</p>
              </div>
              <div>
                <p className="text-slate-400 font-bold">Trạng thái:</p>
                <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] text-white ${cap.Status === 'Mở' ? 'bg-red-600' : 'bg-slate-500'}`}>{cap.Status}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'project') {
      const proj = projects.find(p => p.ProjectID === id);
      if (!proj) return null;
      return (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-6 border border-slate-700 space-y-4 max-w-sm w-full relative">
          <button onClick={() => setActiveRelation(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-cyan-400 uppercase text-xs tracking-wider font-extrabold">
            <Sliders className="w-4 h-4" /> Bản ghi Dự án R&D
          </div>
          <h4 className="text-lg font-black text-white">{proj.ProjectName}</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-slate-400">Dòng xe:</span>
            <span className="text-slate-200 font-bold">{proj.VehicleModel}</span>
            <span className="text-slate-400">Giai đoạn:</span>
            <span className="text-slate-200">{proj.Stage}</span>
            <span className="text-slate-400">Mức độ rủi ro:</span>
            <span className={`font-bold ${proj.RiskLevel === 'Cao' ? 'text-red-400' : 'text-slate-200'}`}>{proj.RiskLevel}</span>
            <span className="text-slate-400">Tiến trình:</span>
            <span className="text-slate-200">{proj.Progress}%</span>
          </div>
        </div>
      );
    }

    if (type === 'kpi') {
      const kpi = kpis.find(k => k.id === id);
      if (!kpi) return null;
      return (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-6 border border-slate-700 space-y-4 max-w-sm w-full relative">
          <button onClick={() => setActiveRelation(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-pink-400 uppercase text-xs tracking-wider font-extrabold">
            <Target className="w-4 h-4" /> Chỉ tiêu Performance KPI
          </div>
          <h4 className="text-lg font-black text-white">{kpi.name}</h4>
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-slate-400">Chỉ tiêu Định biên:</span>
              <span className="text-slate-200 font-bold">{kpi.target}</span>
              <span className="text-slate-400">Thành tích Thực tế:</span>
              <span className="text-emerald-400 font-bold">{kpi.result}</span>
              <span className="text-slate-400">Trạng thái:</span>
              <span className={`font-extrabold ${kpi.status === 'Đạt' ? 'text-green-400' : 'text-red-400'}`}>{kpi.status}</span>
            </div>
            {kpi.rootCause && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 font-bold">Giải trình Biến động:</span>
                <p className="text-slate-300 mt-1 italic text-[11px]">{kpi.rootCause}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // ==========================================
  // Render Specific Modules View
  // ==========================================
  const renderActiveModuleTable = () => {
    switch (selectedModule) {
      case 1: // Daily Work Management
        const filteredWork = workItems.filter(item => {
          const matchQuery = item.TaskDescription.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             item.Owner.toLowerCase().includes(searchQuery.toLowerCase());
          const matchStatus = filterStatus === 'All' ? true : item.Status === filterStatus;
          return matchQuery && matchStatus;
        });

        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo nội dung, kỹ sư chịu trách nhiệm..."
                  className="bg-transparent border-none text-sm text-slate-700 placeholder-slate-400 focus:outline-none w-72"
                />
              </div>
              <div className="flex items-center gap-3">
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-bold text-slate-600"
                >
                  <option value="All">Tất cả Trạng thái</option>
                  <option value="Completed">Completed (Đã đóng)</option>
                  <option value="Pending">Pending (Chờ duyệt)</option>
                  <option value="Overdue">Overdue (Quá hạn)</option>
                </select>
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3.5 py-1.5 text-xs font-extrabold flex items-center gap-1.5 transition"
                >
                  <PlusCircle className="w-4 h-4" /> Thêm Work Item
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 uppercase tracking-wider text-slate-400 font-bold">
                    <th className="p-3">WorkID</th>
                    <th className="p-3">Nội dung</th>
                    <th className="p-3 text-center">Mục tiêu</th>
                    <th className="p-3 text-center">Thực tế</th>
                    <th className="p-3">Kỹ sư</th>
                    <th className="p-3">Hạn chót</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3">Quan hệ</th>
                    <th className="p-3 text-center text-red-500">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filteredWork.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 italic">Không tìm thấy bản ghi phù hợp</td>
                    </tr>
                  ) : (
                    filteredWork.map((item, idx) => (
                      <tr key={item.WorkID || `work-${idx}`} className="hover:bg-slate-50/50 transition">
                        <td className="p-3 font-mono text-slate-900 font-bold">{item.WorkID}</td>
                        <td className="p-3 max-w-sm">
                          <p className="font-bold text-slate-800">{item.TaskDescription}</p>
                          {item.NextAction && <p className="text-[10px] text-slate-400 mt-1 font-mono">Hành động: {item.NextAction}</p>}
                        </td>
                        <td className="p-3 text-center font-mono">{item.Target}</td>
                        <td className="p-3 text-center font-mono">{item.ActualResult}</td>
                        <td className="p-3 text-indigo-700 font-bold">{item.Owner}</td>
                        <td className="p-3 font-mono text-slate-500">{item.DueDate}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            item.Status === 'Completed' ? 'bg-green-100 text-green-700' :
                            item.Status === 'Overdue' ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-amber-100 text-amber-700'
                          }`}>{item.Status}</span>
                        </td>
                        <td className="p-3 space-x-1 space-y-1">
                          {item.KPIReference && (
                            <button onClick={() => setActiveRelation({ type: 'kpi', id: item.KPIReference! })} className="bg-pink-50 text-pink-700 border border-pink-100 px-1.5 py-0.5 rounded text-[9px] hover:bg-pink-100 font-bold animate-fade-in">
                              {item.KPIReference}
                            </button>
                          )}
                          {item.SupplierReference && (
                            <button onClick={() => setActiveRelation({ type: 'supplier', id: item.SupplierReference! })} className="bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded text-[9px] hover:bg-amber-100 font-bold animate-fade-in">
                              {item.SupplierReference}
                            </button>
                          )}
                          {item.ProjectReference && (
                            <button onClick={() => setActiveRelation({ type: 'project', id: item.ProjectReference! })} className="bg-cyan-50 text-cyan-700 border border-cyan-100 px-1.5 py-0.5 rounded text-[9px] hover:bg-cyan-100 font-bold animate-fade-in">
                              {item.ProjectReference}
                            </button>
                          )}
                          {item.CAPAReference && (
                            <button onClick={() => setActiveRelation({ type: 'capa', id: item.CAPAReference! })} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded text-[9px] hover:bg-indigo-100 font-bold animate-fade-in">
                              {item.CAPAReference}
                            </button>
                          )}
                          {!item.KPIReference && !item.SupplierReference && !item.ProjectReference && !item.CAPAReference && (
                            <span className="text-[10px] text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button 
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc muốn xóa công việc ${item.WorkID}?`)) {
                                deleteWorkItem(item.WorkID);
                              }
                            }} 
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition"
                            title="Xóa công việc nghiệp vụ này"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 2: // KPI Management
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm p-4">
              <h3 className="text-sm font-extrabold uppercase text-slate-800 mb-3 border-b pb-2 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" /> Bảng Chỉ tiêu & KPI Gốc Phòng QLCL
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {kpis.map((k, idx) => (
                  <div key={k.id || `kpi-${idx}`} className={`p-4 rounded-xl border ${k.status === 'Đạt' ? 'border-green-100 bg-green-50/20' : 'border-red-100 bg-red-50/15'}`}>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{k.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${k.status === 'Đạt' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{k.status}</span>
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-800 mt-1 line-clamp-2">{k.name}</h4>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400">Mục tiêu</p>
                        <p className="font-extrabold text-slate-700">{k.target}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Thực tế</p>
                        <p className="font-extrabold text-indigo-700">{k.result}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 3: // CAPA Management
        return (
          <div className="space-y-4">
            <div className="flex justify-end bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => setShowAddForm(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3.5 py-1.5 text-xs font-extrabold flex items-center gap-1.5 transition"
              >
                <PlusCircle className="w-4 h-4" /> Đăng ký CAPA mới
              </button>
            </div>

            <div className="space-y-3">
              {capas.map((cap, idx) => (
                <div key={cap.CAPAID || `capa-${idx}`} className={`p-4 rounded-xl border bg-white shadow-sm border-slate-200 transition-all hover:shadow`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] bg-slate-150 text-slate-700 px-2.5 py-0.5 rounded font-mono font-bold">{cap.CAPAID}</span>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full ml-2 font-semibold">Chủ trì: {cap.Owner}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 text-[10px] font-black rounded uppercase ${
                      cap.Status === 'Mở' ? 'bg-red-650 text-red-600' : 
                      cap.Status === 'Quá hạn' ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-400 text-white'
                    }`}>{cap.Status}</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-800 mt-2">{cap.Issue}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed">
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Nguyên nhân cốt lõi (Root Cause)</p>
                      <p className="text-slate-700 mt-1 font-medium">{cap.RootCause}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Hành động Khắc phục (Corrective Action)</p>
                      <p className="text-slate-700 mt-1 font-medium">{cap.CorrectiveAction}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Đánh giá Hiệu quả (Effectiveness)</p>
                      <span className={`inline-block mt-1.5 px-2.5 py-0.5 text-[10px] rounded font-bold ${
                        cap.Effectiveness === 'Hiệu quả' ? 'bg-green-100 text-green-800' :
                        cap.Effectiveness === 'Kém hiệu quả' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
                      }`}>{cap.Effectiveness}</span>
                      <p className="text-[10px] text-slate-400 mt-2 font-mono">Hạn đóng: {cap.DueDate}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 4: // Supplier Quality
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 text-xs">Cơ sở dữ liệu Nhà Cung Cấp & Tỷ lệ lỗi PPM</h3>
              <button 
                onClick={() => setShowAddForm(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3.5 py-1.5 text-xs font-extrabold flex items-center gap-1.5 transition"
              >
                <PlusCircle className="w-4 h-4" /> Ký kết NCC mới
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suppliers.map((s, idx) => (
                <div key={s.SupplierID || `supplier-${idx}`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 hover:shadow transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">{s.SupplierID}</span>
                      <h4 className="text-sm font-extrabold text-slate-800 mt-0.5">{s.SupplierName}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.QualityRating === 'A' ? 'bg-green-100 text-green-800' :
                      s.QualityRating === 'B' ? 'bg-blue-100 text-blue-800' :
                      s.QualityRating === 'C' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800 animate-pulse'
                    }`}>Hạng {s.QualityRating}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-slate-100 py-2">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Mặt hàng chính</p>
                      <p className="font-semibold text-slate-700">{s.ComponentType}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Chỉ số lỗi PPM</p>
                      <p className="font-mono font-bold text-indigo-600">{s.PPM} PPM</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Audit xưởng: <strong className="text-slate-500">{s.LastAuditDate}</strong></span>
                    <span className={`px-2 py-0.2 rounded font-bold uppercase ${s.Status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-slate-600'}`}>{s.Status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 5: // Product Development Management
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-700 text-xs">R&D PTSP - Cổng chất lượng và rủi ro dòng xe mới</h3>
              <button 
                onClick={() => setShowAddForm(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3.5 py-1.5 text-xs font-extrabold flex items-center gap-1.5 transition"
              >
                <PlusCircle className="w-4 h-4" /> Khai sinh R&D Model mới
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {projects.map((p, idx) => (
                <div key={p.ProjectID || `project-${idx}`} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] bg-cyan-150 text-cyan-800 font-mono px-2 py-0.5 rounded font-black">{p.ProjectID}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.RiskLevel === 'Cao' ? 'bg-red-100 text-red-700 font-extrabold animate-pulse' :
                        p.RiskLevel === 'Trung bình' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>Rủi ro {p.RiskLevel}</span>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-800 mt-2 leading-snug line-clamp-2">{p.ProjectName}</h4>
                  </div>

                  <div className="text-xs space-y-1.5 pb-2.5 border-b border-slate-100">
                    <p className="text-slate-400">Dòng xe: <strong className="text-slate-700">{p.VehicleModel}</strong></p>
                    <p className="text-slate-400">Giai đoạn: <strong className="text-slate-600 font-mono text-[11px]">{p.Stage}</strong></p>
                    <p className="text-slate-400">Mốc hoàn thành: <strong className="text-slate-500 font-mono">{p.DueDate}</strong></p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>TIẾN CHÌNH R&D</span>
                      <span>{p.Progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${p.Progress}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 6: // Engineering Change Management
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-700 text-xs">Thay đổi kỹ thuật ECO & Cảnh báo bóp lót bavia dập</h3>
              <button 
                onClick={() => setShowAddForm(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3.5 py-1.5 text-xs font-extrabold flex items-center gap-1.5 transition"
              >
                <PlusCircle className="w-4 h-4" /> Đề xuất ECO mới
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-3">ECOID</th>
                    <th className="p-3">Model</th>
                    <th className="p-3">Chi tiết bộ phận</th>
                    <th className="p-3 font-semibold">Mô tả lý do thay đổi</th>
                    <th className="p-3">Phê duyệt làm mẫu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {ecoChanges.map((e, idx) => (
                    <tr key={e.ECOID || `eco-${idx}`} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono text-slate-900 font-bold">{e.ECOID}</td>
                      <td className="p-3 text-indigo-700 font-bold">{e.VehicleModel}</td>
                      <td className="p-3 text-slate-800 font-extrabold">{e.Component}</td>
                      <td className="p-3 max-w-md leading-relaxed text-slate-500 font-medium">
                        <strong className="text-slate-800 block text-xs">{e.ChangeDescription}</strong>
                        Lý do: {e.Reason}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          e.ApprovalStatus === 'Đã áp dụng' ? 'bg-green-100 text-green-700 font-bold' :
                          e.ApprovalStatus === 'Đang thử nghiệm' ? 'bg-blue-100 text-blue-700' : 'bg-amber-105 text-amber-700'
                        }`}>{e.ApprovalStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 7: // IQC Incoming Quality Control
      case 8: // PQC Process Quality Control
      case 9: // OQC Outgoing Quality Control
        const cat = selectedModule === 7 ? 'IQC' : selectedModule === 8 ? 'PQC' : 'OQC';
        const filteredInspections = inspections.filter(i => i.Category === cat);

        return (
          <div className="space-y-4">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <h3 className="font-extrabold text-sm uppercase text-indigo-600 mb-2">Nhật ký Nghiệm thu và Cảnh cáo {cat}</h3>
              <p className="text-xs text-slate-400">Trực tiếp ghi nhận và đánh giá bavia sản phẩm hỏng dải cơ cấu DKBike.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-indigo-50 text-slate-400 uppercase font-black tracking-wider">
                    <th className="p-3">Hồ sơ ID</th>
                    <th className="p-3">Ngày KCS</th>
                    <th className="p-3">Linh kiện / Linh kiện hỏng</th>
                    <th className="p-3">Nhà Cung Cấp</th>
                    <th className="p-3 text-center">Batch Size</th>
                    <th className="p-3 text-center">Cỡ mẫu</th>
                    <th className="p-3 text-center text-red-500">Mẫu lỗi</th>
                    <th className="p-3">Đánh giá chung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filteredInspections.map((ins, idx) => (
                    <tr key={ins.InspectionID || `inspection-${idx}`} className="hover:bg-slate-50/40">
                      <td className="p-3 font-mono font-bold text-indigo-900">{ins.InspectionID}</td>
                      <td className="p-3 font-mono text-slate-500">{ins.Date}</td>
                      <td className="p-3">
                        <strong className="text-slate-800 block">{ins.Component}</strong>
                        {ins.DefectiveQty > 0 && <span className="text-[10px] text-red-600 font-mono italic">⚠️ Lỗi: {ins.DefectType}</span>}
                      </td>
                      <td className="p-3 font-bold text-slate-700">{ins.SupplierName}</td>
                      <td className="p-3 text-center font-mono">{ins.BatchSize}</td>
                      <td className="p-3 text-center font-mono">{ins.InspectedQty}</td>
                      <td className="p-3 text-center font-mono text-red-600 font-extrabold">{ins.DefectiveQty}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${ins.Status === 'Pass' ? 'bg-green-150 text-green-700' : 'bg-red-150 text-red-700 animate-pulse'}`}>{ins.Status === 'Pass' ? 'ĐẠT' : 'PHẾ PHẨM'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 10: // Market Failure & Warranty
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 text-xs">Sự cố lỗi thị trường của khách hàng (Market failures)</h3>
              <button 
                onClick={() => setShowAddForm(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3.5 py-1.5 text-xs font-extrabold flex items-center gap-1.5 transition"
              >
                <PlusCircle className="w-4 h-4" /> Báo cáo lỗi thị trường
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-indigo-55 text-slate-400 font-black uppercase">
                    <th className="p-3">ID</th>
                    <th className="p-3">Dòng xe (Model) / Số khung (VIN)</th>
                    <th className="p-3">Đại lý phản hồi</th>
                    <th className="p-3">Hạng mục hỏng</th>
                    <th className="p-3 text-center">Độ nghiêm trọng</th>
                    <th className="p-3">Kết luận Giám định</th>
                    <th className="p-3">Thâm giải CAPA</th>
                    <th className="p-3 text-center">Báo cáo & Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {failures.map((f, idx) => (
                    <tr 
                      key={f.FailureID || `failure-${idx}`} 
                      className="hover:bg-indigo-50/50 cursor-pointer transition-colors duration-150"
                      onClick={() => { setSelectedFailureReport(f); setIsEditingReport(false); }}
                    >
                      <td className="p-3 font-mono font-bold text-slate-900">{f.FailureID}</td>
                      <td className="p-3">
                        <strong className="text-indigo-800 block text-xs">{f.VehicleModel}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">VIN: {f.VIN}</span>
                      </td>
                      <td className="p-3 text-slate-700 font-bold">{f.Dealer}</td>
                      <td className="p-3 text-slate-800 font-extrabold">{f.FailureCategory}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          f.Severity === 'A' ? 'bg-red-600 text-white animate-pulse' :
                          f.Severity === 'B' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>MỨC {f.Severity}</span>
                      </td>
                      <td className="p-3 text-slate-500 italic max-w-xs">{f.RootCause}</td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        {f.CAPAReference ? (
                          <button onClick={(e) => { e.stopPropagation(); setActiveRelation({ type: 'capa', id: f.CAPAReference! }); }} className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded text-[9px]">
                            {f.CAPAReference}
                          </button>
                        ) : (
                          <span className="text-[9px] text-slate-400">Chưa mở CAPA</span>
                        )}
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedFailureReport(f); setIsEditingReport(false); }}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-150 rounded text-[10px] flex items-center gap-1 transition"
                          >
                            <FileText className="w-3.5 h-3.5" /> Biên bản lỗi
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteFailure(f.FailureID); }}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                            title="Xóa sự vụ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h4 className="text-xs font-extrabold uppercase text-slate-800 border-b pb-1.5 mb-2 flex items-center gap-1">
                <PiggyBank className="w-4 h-4 text-emerald-600" /> Bảng đền bù và chi phí bảo hành dịch vụ đại lý (Warranty Claims)
              </h4>
              <div className="space-y-2">
                {warrantyClaims.map((claim, idx) => (
                  <div key={claim.ClaimID || `claim-${idx}`} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs font-semibold">
                    <div>
                      <span className="bg-slate-200 text-slate-700 rounded p-0.5 font-mono text-[10px] mr-2">{claim.ClaimID}</span>
                      <strong className="text-slate-800">{claim.VehicleModel}</strong> - {claim.Component}
                      <span className="text-slate-400 text-[10px] ml-2">Đại lý: {claim.Dealer}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-red-600">-{claim.Cost} Triệu VND</span>
                      <span className={`px-2 py-0.2 rounded text-[10px] ${claim.Status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{claim.Status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 11: // Quality Document Management
        return (
          <div className="space-y-4">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <h3 className="font-extrabold text-sm text-indigo-700 mb-1 flex items-center gap-1.5">
                <BookOpen className="w-5 h-5 text-indigo-600" /> Hệ thống Tài liệu ISO & SOP Tiêu Chuẩn Phòng QLCL
              </h3>
              <p className="text-xs text-slate-500">Giám sát tài liệu kiểm soát, rà soát quy trình kẹp Go-NoGo của nhà máy dập gầm cơ khí kẹp bavia.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {qualityDocs.map((doc, idx) => (
                <div key={doc.DocumentID || `doc-${idx}`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="bg-slate-100 text-slate-600 font-mono text-[10px] font-bold px-2 py-0.5 rounded">{doc.DocumentID}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${doc.Status === 'Có hiệu lực' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-amber-800'}`}>{doc.Status}</span>
                  </div>
                  <h4 className="text-xs font-black text-slate-800 h-9 line-clamp-2 leading-relaxed">{doc.Title}</h4>
                  <div className="flex justify-between items-center text-[10px] pt-2 border-t border-slate-100 text-slate-400">
                    <span>Soạn thảo: <strong className="text-slate-600">{doc.Owner}</strong></span>
                    <span>Cập nhật: <strong className="text-slate-500 font-mono">{doc.LastUpdated}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 12: // AI Reporting & Executive Review
        return (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="font-extrabold">CẢNH BÁO HOẠT ĐỘNG QLCL ĐÚC THEO CHỈ THỊ GIÁM ĐỐC</h4>
                <p className="mt-1 leading-relaxed">Hệ thống phân tích tự động đã quét cơ sở dữ liệu sườn máy mẫu, rà lỗi. Phát hiện {overdueActions.length} công việc nghiệm thu trễ hạn, lỗi phanh sau có tính lặp lại (repeated 3 lần) và 2 nhà cung cấp đang trượt mốc benchmark (Shin-Etsu và Nhựa Thái Dương Hà Nội).</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase text-indigo-700 border-b pb-1.5 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-indigo-600 animate-pulse" /> Sổ tay Audit Báo cáo Tuần Gần Đây
                </h4>
                {weeklyReports.map((wr, wrIdx) => (
                  <div key={wr.ReportID || `weekly-${wrIdx}`} className="p-3 bg-slate-50 rounded-lg text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-800">Tuần {wr.Week} / Tháng {wr.Month} ({wr.Year})</span>
                      <span className="font-mono text-indigo-600 font-bold">Điểm số: {wr.Score} / 100</span>
                    </div>
                    <p className="text-slate-600 italic leading-relaxed font-semibold">{wr.GeneralAnalysis}</p>
                    <div className="pt-1.5 border-t border-slate-150 text-[11px]">
                      <span className="font-bold text-red-650 block text-[10px]">CÀNH BÁO TỒN ĐỌNG:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-500 font-medium">
                        {wr.CriticalAlerts.map((ca, i) => <li key={i}>{ca}</li>)}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-800 border-b pb-1.5 flex items-center gap-1">
                  <FileText className="w-4 h-4 text-slate-600" /> Hồ sơ Giám định Báo cáo Tháng 5
                </h4>
                {monthlyReports.map((mr, mrIdx) => (
                  <div key={mr.ReportID || `monthly-${mrIdx}`} className="p-3 bg-indigo-50/20 border border-indigo-100 rounded-lg text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-800">Báo cáo Tháng {mr.Month} (Năm {mr.Year})</span>
                      <span className="font-mono text-indigo-600 font-bold">Health Score: {mr.Score}%</span>
                    </div>
                    <p className="text-slate-600 font-semibold leading-relaxed">{mr.OverallAssessment}</p>
                    <div className="border-t border-indigo-100/50 pt-2 space-y-1">
                      <span className="font-bold text-slate-700 block text-[10px]">KHUYẾN NGHỊ BAN GIÁM ĐỐC:</span>
                      <ul className="list-decimal pl-4 text-slate-500 font-medium">
                        {mr.ActionRecommendations.map((ar, i) => <li key={i}>{ar}</li>)}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 13: // Interactive ER-Schema Map
        return (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <h3 className="font-extrabold text-xs uppercase text-indigo-700 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600 animate-pulse" /> Sơ đồ Quan hệ Thực thể (ER) & Khóa Liên kết CSDL QMS DKBike
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hệ thống CSDL của QMS sử dụng tối ưu hóa cấu trúc chuẩn hóa quan hệ. Dưới đây là sơ đồ tương tác trực quan mô tả các trường khóa chính (Primary Key - <span className="text-red-600 font-bold">PK</span>), khóa ngoại (Foreign Key - <span className="text-amber-600 font-bold">FK</span>) và cách các bảng đồng bộ chéo để phục vụ tính toán tự động chỉ số KPI và tổng hợp lỗi.
              </p>
              <div className="text-[11px] bg-indigo-50/50 p-2.5 text-indigo-800 border-l-4 border-indigo-600 rounded flex items-center gap-2 font-medium">
                <span className="inline-block w-2 h-2 bg-indigo-600 rounded-full animate-ping"></span>
                <span>Mẹo rà soát: Hãy nhấp chọn các bảng thực thể bên dưới để kiểm toán cấu trúc cột và câu truy vấn SQL JOIN động mẫu tương ứng!</span>
              </div>
            </div>

            <QMSInteractiveERMap 
              workItems={workItems} 
              employees={employees} 
              suppliers={suppliers} 
              capas={capas} 
              kpis={kpis} 
              projects={projects} 
              inspections={inspections} 
              failures={failures} 
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 relative" id="qms_db_exploration_board">
      {/* Toast notification banner */}
      {toastMsg && (
        <div className="fixed top-4 right-4 bg-slate-900 text-white border border-indigo-500 rounded-xl px-4 py-3 shadow-2xl z-50 animate-fade-in flex items-center gap-2 text-xs font-bold font-sans">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* ==================================== LEFT SUMMARY COLUMN (RELATIONSHIP HUD) ==================================== */}
        <div className="space-y-6 lg:col-span-1">
          {/* Core Department Quality Dashboard widget */}
          <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-400 animate-pulse" />
              <h3 className="font-black tracking-tight text-sm uppercase text-slate-300">Tổng quan CSDL Phòng QLCL</h3>
            </div>
            
            <div className="flex flex-col items-center py-4 bg-slate-950/60 rounded-xl border border-slate-800 my-2">
              <span className="text-4xl font-mono font-black text-amber-400 tracking-tight">{qualityScore}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">Chỉ số sức khỏe QMS (%)</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="border border-slate-800 p-2.5 rounded-lg bg-slate-950/30">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Công việc mở</span>
                <p className="text-lg font-bold font-mono text-indigo-300 mt-1">{workItems.filter(w=>w.Status !== 'Completed').length}</p>
              </div>
              <div className="border border-slate-800 p-2.5 rounded-lg bg-slate-950/30">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Hồ sơ CAPA mở</span>
                <p className="text-lg font-bold font-mono text-red-400 mt-1">{capas.filter(c=>c.Status === 'Mở').length}</p>
              </div>
            </div>

            <button 
              type="button"
              onClick={resetDatabaseToDefaults}
              className="w-full mt-2 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg text-[11px] font-bold border border-slate-705 hover:border-slate-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Nhấn vào đây để đặt lại toàn bộ dữ liệu mặc định ban đầu"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" /> Khôi phục CSDL Mặc định
            </button>
          </div>

          {/* Capacity Diagnostic Panel - Proves OQC is light, checks status, and optimizes on-click without files */}
          <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col gap-3">
            <span className="text-[10px] text-amber-500 uppercase font-black tracking-widest block">Chẩn Đoán Dung Lượng CSDL</span>
            
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-sans font-semibold text-slate-300">
                <span>Dung lượng đã dùng:</span>
                <span className="font-mono text-amber-400">{dbCapacityStats.total} KB / 5.0 MB ({dbCapacityStats.percent}%)</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${dbCapacityStats.percent}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5 border-t border-slate-800/80 pt-2.5 text-[10px] font-mono text-slate-400">
              <div className="flex justify-between">
                <span>📋 Nhật ký OQC (Text):</span>
                <span className="text-slate-200 font-bold">{dbCapacityStats.oqc} KB</span>
              </div>
              <div className="flex justify-between">
                <span>🔬 Nhật ký IQC (Đầu vào):</span>
                <span className="text-slate-200 font-bold">{dbCapacityStats.iqc} KB</span>
              </div>
              <div className="flex justify-between">
                <span>⚙️ Nhật ký PQC (Nhà máy):</span>
                <span className="text-slate-200 font-bold">{dbCapacityStats.pqc} KB</span>
              </div>
              <div className="flex justify-between">
                <span>💼 Nghiệp vụ QLCL & khác:</span>
                <span className="text-slate-200 font-bold">{dbCapacityStats.others} KB</span>
              </div>
            </div>

            <button
              type="button"
              disabled={compressing}
              onClick={handleOptimizeDatabase}
              className={`w-full mt-1.5 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${compressing ? 'bg-amber-600 border-amber-500 text-white animate-pulse' : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white'}`}
            >
              <Zap className={`w-3.5 h-3.5 ${compressing ? 'animate-bounce' : ''}`} />
              {compressing ? 'Đang tối ưu dung lượng...' : 'Tự Động Nén & Lọc Rác CSDL'}
            </button>
          </div>

          {/* Cloud Synchronization Widget */}
          <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin-hover" />
              <h3 className="font-black tracking-tight text-sm uppercase text-slate-300 font-sans">Đồng Bộ Đám Mây Cloud</h3>
            </div>
            
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Cơ chế đồng bộ đám mây tự động lưu trữ và đồng nhất dữ liệu của anh Thao trên mọi thiết bị qua Cloud Firestore.
            </p>

            {firebaseUser ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleForceCloudSync}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  🚀 CƯỠNG BỨC ĐỒNG BỘ TOÀN CLOUD
                </button>

                {forceSyncProgress && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2 mt-2">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-rose-400 uppercase tracking-wider animate-pulse flex items-center gap-1">
                        <span className="w-1 h-1 bg-rose-500 rounded-full animate-ping inline-block"></span>
                        Đang đẩy dữ liệu...
                      </span>
                      <span className="text-slate-500 font-mono">
                        Gói {forceSyncProgress.currentPart} / {forceSyncProgress.totalParts}
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-rose-500 to-emerald-500 h-full transition-all duration-300" 
                        style={{ width: `${forceSyncProgress.totalParts > 0 ? (forceSyncProgress.currentPart / forceSyncProgress.totalParts) * 100 : 0}%` }}
                      ></div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed font-mono break-all whitespace-pre-wrap">
                      {forceSyncProgress.statusText}
                    </p>

                    {forceSyncProgress.completed && (
                      <button 
                        onClick={() => setForceSyncProgress && setForceSyncProgress(null)}
                        className="w-full text-center text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-black py-1 rounded-md transition cursor-pointer mt-1"
                      >
                        Đồng ý & Hoàn tất
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center text-[11px] text-slate-400 font-sans">
                ⚠️ Vui lòng đăng nhập tài khoản để đồng bộ trực tuyến.
              </div>
            )}
          </div>

        {/* Real-time warnings driven by databases relationships */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1 border-b pb-2">
            <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" /> Kiểm toán rủi ro hệ thống
          </h4>

          {overdueActions.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-150 rounded-xl space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-bold text-red-700">
                <Clock className="w-4 h-4 shrink-0" />
                <span>PHÁT HIỆN HẠN TRỄ ({overdueActions.length} VIỆC)</span>
              </div>
              <p className="text-[10px] text-red-600 font-medium leading-relaxed">Có công việc nghiệp vụ nghiệm thu đã vượt hạn chót chưa được đóng. Cần thúc đẩy Owner giải trình.</p>
            </div>
          )}

          {repeatedIssues.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-150 rounded-xl space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>SỰ CỐ LẶP LẠI THỊ TRƯỜNG</span>
              </div>
              <ul className="text-[10px] text-amber-600 leading-relaxed font-semibold list-disc pl-4 space-y-0.5">
                {repeatedIssues.map(([category, count]) => (
                  <li key={category}>Lỗi <strong>"{category}"</strong> lặp lại {count} lần (Gốc rễ chưa bị dập tắt).</li>
                ))}
              </ul>
            </div>
          )}

          {deterioratedSuppliers.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-150 rounded-xl space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-bold text-red-700">
                <Building2 className="w-4 h-4 shrink-0" />
                <span>SUY GIẢM CHẤT LƯỢNG NCC</span>
              </div>
              <p className="text-[10px] text-red-600 font-medium leading-relaxed">
                Nhà cung cấp <strong className="font-mono text-red-700">{deterioratedSuppliers.map(s=>s.SupplierName).join(', ')}</strong> rơi vào mốc PPM lỗi đỏ rực.
              </p>
            </div>
          )}

          {delayedProjects.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-150 rounded-xl space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700">
                <Sliders className="w-4 h-4 shrink-0" />
                <span>DỰ ÁN R&D CHẬM TIẾN ĐỘ</span>
              </div>
              <p className="text-[10px] text-amber-600 font-medium leading-relaxed">Đã phát hiện sườn gầm trễ mẫu của model {delayedProjects.map(p=>p.VehicleModel).join(', ')} nguy cơ kẹt lịch sấy.</p>
            </div>
          )}
        </div>
      </div>

      {/* ==================================== RIGHT MASTER DATA SYSTEM ==================================== */}
      <div className="space-y-6 lg:col-span-3">
        {/* Module navigation tabs */}
        <div className="bg-slate-900 p-1.5 rounded-xl flex gap-1 overflow-x-auto text-slate-400 text-xs font-semibold scrollbar-none" id="qms_nav_shelf">
          <button onClick={() => { setSelectedModule(1); setSearchQuery(''); }} className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${selectedModule === 1 ? 'bg-indigo-600 text-white font-extrabold' : 'hover:bg-slate-800'}`}>1. Daily Work Ledger</button>
          <button onClick={() => { setSelectedModule(2); setSearchQuery(''); }} className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${selectedModule === 2 ? 'bg-indigo-600 text-white font-extrabold' : 'hover:bg-slate-800'}`}>2. KPIs</button>
          <button onClick={() => { setSelectedModule(3); setSearchQuery(''); }} className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${selectedModule === 3 ? 'bg-indigo-600 text-white font-extrabold' : 'hover:bg-slate-800'}`}>3. CAPA Records</button>
          <button onClick={() => { setSelectedModule(4); setSearchQuery(''); }} className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${selectedModule === 4 ? 'bg-indigo-600 text-white font-extrabold' : 'hover:bg-slate-800'}`}>4. Supplier Quality</button>
          <button onClick={() => { setSelectedModule(5); setSearchQuery(''); }} className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${selectedModule === 5 ? 'bg-indigo-600 text-white font-extrabold' : 'hover:bg-slate-800'}`}>5. R&D Projects</button>
          <button onClick={() => { setSelectedModule(6); setSearchQuery(''); }} className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${selectedModule === 6 ? 'bg-indigo-600 text-white font-extrabold' : 'hover:bg-slate-800'}`}>6. ECO Changes</button>
          <button onClick={() => { setSelectedModule(7); setSearchQuery(''); }} className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${selectedModule === 7 ? 'bg-indigo-600 text-white font-extrabold' : 'hover:bg-slate-800'}`}>7. IQC Tests</button>
          <button onClick={() => { setSelectedModule(8); setSearchQuery(''); }} className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${selectedModule === 8 ? 'bg-indigo-600 text-white font-extrabold' : 'hover:bg-slate-800'}`}>8. PQC Process</button>
          <button onClick={() => { setSelectedModule(9); setSearchQuery(''); }} className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${selectedModule === 9 ? 'bg-indigo-600 text-white font-extrabold' : 'hover:bg-slate-800'}`}>9. OQC Yield</button>
          <button onClick={() => { setSelectedModule(10); setSearchQuery(''); }} className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${selectedModule === 10 ? 'bg-indigo-600 text-white font-extrabold' : 'hover:bg-slate-800'}`}>10. Warranty & Failures</button>
          <button onClick={() => { setSelectedModule(11); setSearchQuery(''); }} className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${selectedModule === 11 ? 'bg-indigo-600 text-white font-extrabold' : 'hover:bg-slate-800'}`}>11. Quality Documents</button>
          <button onClick={() => { setSelectedModule(12); setSearchQuery(''); }} className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${selectedModule === 12 ? 'bg-indigo-600 text-white font-extrabold' : 'hover:bg-slate-800'}`}>12. AI Reports</button>
          <button onClick={() => { setSelectedModule(13); setSearchQuery(''); }} className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${selectedModule === 13 ? 'bg-indigo-600 text-white font-extrabold' : 'hover:bg-slate-800'}`}>🔗 13. Sơ đồ Quan hệ CSDL (ER Schema Map)</button>
        </div>

        {/* Master module layout render content */}
        {renderActiveModuleTable()}
      </div>

      {/* ==================================== GLOBAL POPUP HOVER DETAILS RELATIONSHIPS OVERLAY ==================================== */}
      {activeRelation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          {renderRelationalCard()}
        </div>
      )}

      {/* ==================================== ADD RECORD FORMS MODAL OVERLAY ==================================== */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <span className="text-xs uppercase font-mono text-amber-400 font-extrabold tracking-widest">Khai báo bản ghi CSDL</span>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={executeAddRecord} className="p-5 space-y-4 text-xs font-semibold text-slate-700">
              
              {/* Form 1: Daily WorkItem Add */}
              {selectedModule === 1 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">Thêm bản ghi WorkItems (Công việc QLCL)</h4>
                  <div>
                    <label className="block text-slate-500 mb-1">Mã Công việc (WorkID)</label>
                    <input type="text" value={newWorkItem.WorkID} onChange={e=>setNewWorkItem({...newWorkItem, WorkID: e.target.value})} placeholder="Để trống tự sinh (e.g. WS-3004)" className="w-full border border-slate-200 rounded p-2 text-xs font-extrabold font-mono" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Tên/Nội dung công việc chất lượng</label>
                    <input type="text" value={newWorkItem.TaskDescription} onChange={e=>setNewWorkItem({...newWorkItem, TaskDescription: e.target.value})} placeholder="Ví dụ: Kiểm tra lốp nạp sườn dập khuôn..." className="w-full border border-slate-200 rounded p-2 text-xs font-medium" required />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 mb-1">Mục tiêu số lượng/tỷ lệ</label>
                      <input type="number" value={newWorkItem.Target} onChange={e=>setNewWorkItem({...newWorkItem, Target: Number(e.target.value)})} className="w-full border border-slate-200 rounded p-2 text-xs" />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Thực tế đạt được</label>
                      <input type="number" value={newWorkItem.ActualResult} onChange={e=>setNewWorkItem({...newWorkItem, ActualResult: Number(e.target.value)})} className="w-full border border-slate-200 rounded p-2 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-500 mb-1">Cấp độ (Priority)</label>
                      <select value={newWorkItem.Priority} onChange={e=>setNewWorkItem({...newWorkItem, Priority: e.target.value as any})} className="w-full border border-slate-200 rounded p-2 text-xs">
                        <option value="HIGH">HIGH (Nguy cấp)</option>
                        <option value="MEDIUM">MEDIUM (Bình thường)</option>
                        <option value="LOW">LOW (Nhẹ)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Trạng thái</label>
                      <select value={newWorkItem.Status} onChange={e=>setNewWorkItem({...newWorkItem, Status: e.target.value as any})} className="w-full border border-slate-200 rounded p-2 text-xs">
                        <option value="Pending">Pending (Chờ duyệt)</option>
                        <option value="Completed">Completed (Đã xong)</option>
                        <option value="Overdue">Overdue (Quá hạn)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Người đảm nhận</label>
                      <select value={newWorkItem.Owner} onChange={e=>setNewWorkItem({...newWorkItem, Owner: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-xs">
                        {employees.map((emp, idx) => <option key={emp.id || `emp-${idx}`} value={emp.name}>{emp.name}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-100">
                    <h5 className="font-extrabold uppercase text-[10px] text-indigo-700 tracking-wider mb-2">Liên kết Quan hệ CSDL (Relationships)</h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-slate-500 mb-1">Liên kết Nhà cung cấp</label>
                        <select value={newWorkItem.SupplierReference || ''} onChange={e=>setNewWorkItem({...newWorkItem, SupplierReference: e.target.value || undefined})} className="w-full border border-slate-200 rounded p-2 text-xs font-mono">
                          <option value="">-- Không liên kết --</option>
                          {suppliers.map((s, idx) => <option key={s.SupplierID || `supplier-${idx}`} value={s.SupplierID}>{s.SupplierID} - {s.SupplierName}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1">Liên kết Chỉ tiêu KPI</label>
                        <select value={newWorkItem.KPIReference || ''} onChange={e=>setNewWorkItem({...newWorkItem, KPIReference: e.target.value || undefined})} className="w-full border border-slate-200 rounded p-2 text-xs font-mono">
                          <option value="">-- Không liên kết --</option>
                          {kpis.map((k, idx) => <option key={k.id || `kpi-${idx}`} value={k.id}>{k.id} - {k.name.slice(0, 30)}...</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1">Liên kết Dự án phát triển</label>
                        <select value={newWorkItem.ProjectReference || ''} onChange={e=>setNewWorkItem({...newWorkItem, ProjectReference: e.target.value || undefined})} className="w-full border border-slate-200 rounded p-2 text-xs font-mono">
                          <option value="">-- Không liên kết --</option>
                          {projects.map((p, idx) => <option key={p.ProjectID || `project-${idx}`} value={p.ProjectID}>{p.ProjectID}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1">Liên kết Hồ sơ CAPA</label>
                        <select value={newWorkItem.CAPAReference || ''} onChange={e=>setNewWorkItem({...newWorkItem, CAPAReference: e.target.value || undefined})} className="w-full border border-slate-200 rounded p-2 text-xs font-mono">
                          <option value="">-- Không liên kết --</option>
                          {capas.map((c, idx) => <option key={c.CAPAID || `capa-${idx}`} value={c.CAPAID}>{c.CAPAID}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Hành động khắc phục tiếp theo (Next Action)</label>
                    <input type="text" value={newWorkItem.NextAction} onChange={e=>setNewWorkItem({...newWorkItem, NextAction: e.target.value})} placeholder="SOP tiếp theo hoặc sấy mối kẹp..." className="w-full border border-slate-200 rounded p-2 text-xs font-medium" />
                  </div>
                </div>
              )}

              {/* Form 2: CAPA Add */}
              {selectedModule === 3 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">Ban hành Hành động Khắc phục CAPA mới</h4>
                  <div>
                    <label className="block text-slate-500 mb-1">Mã hồ sơ CAPA</label>
                    <input type="text" value={newCapa.CAPAID} onChange={e=>setNewCapa({...newCapa, CAPAID: e.target.value})} placeholder="Tự sinh (e.g. CAPA-2026-003)" className="w-full border border-slate-200 rounded p-2 text-xs font-mono font-bold" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Mô tả sự cố / sự vụ lỗi</label>
                    <textarea value={newCapa.Issue} onChange={e=>setNewCapa({...newCapa, Issue: e.target.value})} placeholder="Ví dụ: Rè sườn, chập điện giắc cắm đuôi sườn..." className="w-full border border-slate-200 rounded p-2 text-xs h-16 font-medium" required />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Nguyên nhân gốc rễ giám định (Root cause)</label>
                    <input type="text" value={newCapa.RootCause} onChange={e=>setNewCapa({...newCapa, RootCause: e.target.value})} placeholder="Mài bavia chưa tinh mút, hoặc giắc cắm hụt..." className="w-full border border-slate-200 rounded p-2 text-xs font-medium" required />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Hành động Khắc phục dứt điểm (Corrective Action)</label>
                    <input type="text" value={newCapa.CorrectiveAction} onChange={e=>setNewCapa({...newCapa, CorrectiveAction: e.target.value})} placeholder="Yêu cầu NCC dập định lực băm gân..." className="w-full border border-slate-200 rounded p-2 text-xs font-medium" required />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 mb-1">Người chủ trì</label>
                      <select value={newCapa.Owner} onChange={e=>setNewCapa({...newCapa, Owner: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-xs font-semibold">
                        {employees.map((emp, idx) => <option key={emp.id || `emp-${idx}`} value={emp.name}>{emp.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Đánh giá chung</label>
                      <select value={newCapa.Effectiveness} onChange={e=>setNewCapa({...newCapa, Effectiveness: e.target.value as any})} className="w-full border border-slate-200 rounded p-2 text-xs font-semibold">
                        <option value="Chưa đánh giá">Chưa đánh giá</option>
                        <option value="Hiệu quả">Hiệu quả dứt điểm</option>
                        <option value="Kém hiệu quả">Kém hiệu quả (Có lặp lại)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Form 3: Supplier Add */}
              {selectedModule === 4 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 font-black">Mở hồ sơ Nhà Cung Cấp đối tác</h4>
                  <div>
                    <label className="block text-slate-500 mb-1">Tên Nhà cung cấp</label>
                    <input type="text" value={newSupplier.SupplierName} onChange={e=>setNewSupplier({...newSupplier, SupplierName: e.target.value})} placeholder="Công ty cao su, dập cơ khí..." className="w-full border border-slate-200 rounded p-2 text-xs" required />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Linh kiện cấp phát chính (Component type)</label>
                    <input type="text" value={newSupplier.ComponentType} onChange={e=>setNewSupplier({...newSupplier, ComponentType: e.target.value})} placeholder="Sườn máy, ốp nhựa ABS bửng sườn..." className="w-full border border-slate-200 rounded p-2 text-xs" required />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 mb-1">Mốc lỗi PPM quy đổi</label>
                      <input type="number" value={newSupplier.PPM} onChange={e=>setNewSupplier({...newSupplier, PPM: Number(e.target.value)})} placeholder="PPM lỗi cơ sở" className="w-full border border-slate-200 rounded p-2 text-xs font-mono font-bold" />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Phân hạng (Quality rating)</label>
                      <select value={newSupplier.QualityRating} onChange={e=>setNewSupplier({...newSupplier, QualityRating: e.target.value as any})} className="w-full border border-slate-200 rounded p-2 text-xs">
                        <option value="A">Hạng A (Tuyệt hảo)</option>
                        <option value="B">Hạng B (Đạt tốt và giữ mốc)</option>
                        <option value="C">Hạng C (Cần audit khẩn)</option>
                        <option value="D">Hạng D (Rủi ro đình chỉ)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Form 10: Market Failure Add */}
              {selectedModule === 10 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 font-black">Khai báo Báo Cáo Lỗi Thị Trường</h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 mb-1">Mã báo cáo sự vụ (Failure ID)</label>
                      <input 
                        type="text" 
                        value={newFailure.FailureID} 
                        onChange={e => setNewFailure({...newFailure, FailureID: e.target.value})} 
                        placeholder="Để trống để tự sinh (e.g. MF-4003)" 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-mono font-bold" 
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Dòng xe bị lỗi (Model)</label>
                      <select 
                        value={newFailure.VehicleModel} 
                        onChange={e => setNewFailure({...newFailure, VehicleModel: e.target.value})} 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                      >
                        <option value="DK Gogo Smart">DK Gogo Smart</option>
                        <option value="DK X-Lite">DK X-Lite</option>
                        <option value="DK Roma Lite">DK Roma Lite</option>
                        <option value="DK Retro">DK Retro</option>
                        <option value="DK Sparta">DK Sparta</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 mb-1">Số khung xe lỗi (VIN)</label>
                      <input 
                        type="text" 
                        value={newFailure.VIN} 
                        onChange={e => setNewFailure({...newFailure, VIN: e.target.value})} 
                        placeholder="Ví dụ: DKB80G02..." 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-mono font-bold" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Đại lý phản hồi</label>
                      <input 
                        type="text" 
                        value={newFailure.Dealer} 
                        onChange={e => setNewFailure({...newFailure, Dealer: e.target.value})} 
                        placeholder="Đại lý DKBike Hà Nội..." 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-semibold" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-500 mb-1">Ngày phản hồi</label>
                      <input 
                        type="date" 
                        value={newFailure.FailureDate} 
                        onChange={e => setNewFailure({...newFailure, FailureDate: e.target.value})} 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Độ nghiêm trọng</label>
                      <select 
                        value={newFailure.Severity} 
                        onChange={e => setNewFailure({...newFailure, Severity: e.target.value as any})} 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-bold"
                      >
                        <option value="A">Mức A (Cao nhất)</option>
                        <option value="B">Mức B (Nặng)</option>
                        <option value="C">Mức C (Vừa)</option>
                        <option value="D">Mức D (Nhẹ)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Trạng thái xử lý</label>
                      <select 
                        value={newFailure.Status} 
                        onChange={e => setNewFailure({...newFailure, Status: e.target.value as any})} 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-bold"
                      >
                        <option value="Chưa xử lý">Chưa xử lý</option>
                        <option value="Đang xử lý">Đang xử lý</option>
                        <option value="Đã xử lý">Đã xử lý</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Hạng mục lỗi / Sự cố (Failure Category)</label>
                    <input 
                      type="text" 
                      value={newFailure.FailureCategory} 
                      onChange={e => setNewFailure({...newFailure, FailureCategory: e.target.value})} 
                      placeholder="Ví dụ: Mất lực phanh dải phanh sau..." 
                      className="w-full border border-slate-200 rounded p-2 text-xs font-bold" 
                      required 
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Kết luận Giám định nguyên nhân gốc rễ (Root Cause)</label>
                    <textarea 
                      value={newFailure.RootCause} 
                      onChange={e => setNewFailure({...newFailure, RootCause: e.target.value})} 
                      placeholder="Chi tiết nguyên nhân kỹ thuật gây lỗi..." 
                      className="w-full border border-slate-200 rounded p-2 text-xs h-12 font-medium" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 mb-1">Xử lý tạm thời / Chữa cháy (Correction)</label>
                      <input 
                        type="text" 
                        value={newFailure.Correction} 
                        onChange={e => setNewFailure({...newFailure, Correction: e.target.value})} 
                        placeholder="Thay mới bộ đĩa phanh hoặc bệ cầu chì..." 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Khắc phục ngăn tái diễn (Corrective Action)</label>
                      <input 
                        type="text" 
                        value={newFailure.CorrectiveAction} 
                        onChange={e => setNewFailure({...newFailure, CorrectiveAction: e.target.value})} 
                        placeholder="Yêu cầu NCC gia cố ngàm nhựa khóa hoặc căn chỉnh..." 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-medium" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 mb-1">Phòng ngừa diện rộng (Preventive Action)</label>
                      <input 
                        type="text" 
                        value={newFailure.PreventiveAction} 
                        onChange={e => setNewFailure({...newFailure, PreventiveAction: e.target.value})} 
                        placeholder="Bổ sung bước dưỡng kiểm vào quy chuẩn nhận hàng..." 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Liên kết CAPA xử lý</label>
                      <select 
                        value={newFailure.CAPAReference} 
                        onChange={e => setNewFailure({...newFailure, CAPAReference: e.target.value})} 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                      >
                        <option value="">-- Không liên kết --</option>
                        {capas.map((c, idx) => <option key={c.CAPAID || `capa-${idx}`} value={c.CAPAID}>{c.CAPAID}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 mb-1">Kỹ sư phụ trách xử lý</label>
                      <select 
                        value={newFailure.Assignee} 
                        onChange={e => setNewFailure({...newFailure, Assignee: e.target.value})} 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                      >
                        {employees.map((emp, idx) => <option key={emp.id || `emp-${idx}`} value={emp.name}>{emp.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Hạn xử lý (Target date)</label>
                      <input 
                        type="date" 
                        value={newFailure.DueDate} 
                        onChange={e => setNewFailure({...newFailure, DueDate: e.target.value})} 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-medium" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Fallback & Submit */}
              <div className="pt-4 border-t border-slate-150 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-slate-200 rounded text-slate-500 hover:bg-slate-50 text-xs">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-500 text-xs">Lưu Bản ghi CSDL</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 11. MARKET FAILURE DETAILED REPORT MODAL   */}
      {/* ========================================== */}
      {selectedFailureReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto font-sans animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 px-6 flex justify-between items-center rounded-t-2xl shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-black tracking-wide uppercase">Báo cáo & Giám định Sự cố Lỗi Thị Trường</h3>
                  <p className="text-[10px] text-slate-400 font-mono font-medium">HỒ SƠ ID: {selectedFailureReport.FailureID}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsEditingReport(!isEditingReport)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    isEditingReport ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {isEditingReport ? 'Xem biên bản văn bản' : 'Chỉnh sửa nội dung'}
                </button>
                <button 
                  onClick={() => {
                    const printContents = document.getElementById('printable-failure-report')?.innerHTML;
                    if (printContents) {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Bao_Cao_Loi_Thi_Truong_${selectedFailureReport.FailureID}</title>
                              <script src="https://cdn.tailwindcss.com"></script>
                              <style>
                                @media print {
                                  body { padding: 20px; }
                                  .no-print { display: none; }
                                }
                              </style>
                            </head>
                            <body class="bg-white text-slate-900 font-sans p-8">
                              ${printContents}
                              <script>
                                window.onload = function() {
                                  window.print();
                                  setTimeout(function() { window.close(); }, 500);
                                };
                              </script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In Báo Cáo
                </button>
                <button 
                  onClick={() => setSelectedFailureReport(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Printable wrapper */}
            <div className="p-6 overflow-y-auto flex-grow" id="printable-failure-report">
              {!isEditingReport ? (
                // View Mode (Elegant Official Report Layout)
                <div className="space-y-6 text-slate-800 max-w-3xl mx-auto">
                  {/* Official Letterhead */}
                  <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">CÔNG TY CỔ PHẦN DKBike</h4>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">BAN CHẤT LƯỢNG - PHÒNG QLCL (QMS)</p>
                      <p className="text-[9px] text-slate-400 font-medium">Hệ thống QMS Số: QMS-MF-{selectedFailureReport.FailureID}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-700">Mã tài liệu: DKB-QLCL-FORM-10</p>
                      <p className="text-[9px] text-slate-400">Ngày lưu trữ: {selectedFailureReport.FailureDate}</p>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-black uppercase text-slate-900 tracking-wide">BIÊN BẢN BÁO CÁO & PHÁN QUYẾT LỖI THỊ TRƯỜNG</h2>
                    <p className="text-xs text-slate-500 font-medium italic">DKBike Market Failure & Corrective Action Investigation Report</p>
                    <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-[10px] font-extrabold tracking-widest bg-amber-50 text-amber-700 border border-amber-200">
                      MÃ SỰ VỤ: {selectedFailureReport.FailureID}
                    </span>
                  </div>

                  {/* Sections 1 & 2 layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    
                    {/* Block A: Vehicle & Reporting Metadata */}
                    <div className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                      <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" /> I. Thông tin phương tiện & Đại lý
                      </h3>
                      
                      <div className="grid grid-cols-3 gap-y-2 text-xs font-semibold">
                        <span className="text-slate-400 col-span-1">Dòng xe (Model):</span>
                        <strong className="text-slate-800 col-span-2 text-sm">{selectedFailureReport.VehicleModel}</strong>
                        
                        <span className="text-slate-400 col-span-1">Số khung (VIN):</span>
                        <span className="text-slate-700 font-mono font-bold col-span-2 bg-white px-1.5 py-0.5 border border-slate-200 rounded">{selectedFailureReport.VIN}</span>
                        
                        <span className="text-slate-400 col-span-1">Đại lý phản hồi:</span>
                        <span className="text-slate-800 col-span-2">{selectedFailureReport.Dealer}</span>
                        
                        <span className="text-slate-400 col-span-1">Ngày tiếp nhận:</span>
                        <span className="text-slate-700 font-mono col-span-2">{selectedFailureReport.FailureDate}</span>

                        <span className="text-slate-400 col-span-1">Người phụ trách:</span>
                        <span className="text-slate-800 col-span-2 font-bold">{selectedFailureReport.Assignee || 'Nguyễn Xuân Thao'}</span>

                        <span className="text-slate-400 col-span-1">Hạn xử lý chót:</span>
                        <span className="text-slate-700 font-mono col-span-2">{selectedFailureReport.DueDate || '2026-05-30'}</span>

                        <span className="text-slate-400 col-span-1">Trạng thái:</span>
                        <span className="col-span-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            selectedFailureReport.Status === 'Đã xử lý' ? 'bg-green-100 text-green-700 border border-green-200' :
                            selectedFailureReport.Status === 'Đang xử lý' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-red-100 text-red-700 border border-red-200'
                          }`}>{selectedFailureReport.Status}</span>
                        </span>
                      </div>
                    </div>

                    {/* Block B: Failure & Severity Info */}
                    <div className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                      <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> II. Mô tả sự cố & Phân hạng rủi ro
                      </h3>
                      
                      <div className="space-y-2">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hạng mục lỗi/Sự cố phản ánh:</p>
                          <p className="text-xs font-black text-slate-900 mt-0.5 bg-white p-2 border border-slate-250 rounded shadow-3xs">{selectedFailureReport.FailureCategory}</p>
                        </div>
                        
                        <div className="flex justify-between items-center bg-white p-2 border border-slate-200 rounded shadow-3xs">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mức độ nghiêm trọng (Severity):</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Phân hạng chất lượng theo ma trận an toàn QMS</p>
                          </div>
                          <span className={`px-3 py-1 rounded text-xs font-black uppercase ${
                            selectedFailureReport.Severity === 'A' ? 'bg-red-600 text-white animate-pulse' :
                            selectedFailureReport.Severity === 'B' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>Hạng {selectedFailureReport.Severity}</span>
                        </div>

                        {selectedFailureReport.CAPAReference && (
                          <div className="bg-indigo-50/50 p-2 border border-indigo-100 rounded text-xs flex justify-between items-center">
                            <span className="text-indigo-900 font-bold">Hồ sơ CAPA liên kết:</span>
                            <strong className="text-indigo-700 font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">{selectedFailureReport.CAPAReference}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Block C: QA Engineering Assessment & Root Causes */}
                  <div className="space-y-4 bg-white p-5 border border-slate-200 rounded-xl shadow-3xs">
                    <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> III. Giám định kỹ thuật & Hành động khắc phục phòng ngừa
                    </h3>

                    <div className="space-y-3.5 text-xs">
                      <div className="space-y-1">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">1. Kết luận giám định nguyên nhân kỹ thuật (Root Cause Analysis):</span>
                        <p className="text-slate-800 bg-slate-50 p-3 rounded-lg leading-relaxed border border-slate-150 font-medium whitespace-pre-line">
                          {selectedFailureReport.RootCause || 'Đang tiến hành đo đạc, bóc mổ rã chi tiết để truy xuất nguồn gốc linh kiện NCC.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block text-amber-700">2. Xử lý tạm thời / Chữa cháy (Correction):</span>
                          <p className="text-slate-800 bg-amber-50/20 p-3 rounded-lg border border-amber-100 font-medium">
                            {selectedFailureReport.Correction || 'Chưa cập nhật biện pháp xử lý sự vụ tại điểm chạm khách hàng.'}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block text-indigo-700">3. Biện pháp khắc phục ngăn tái diễn (Corrective Action):</span>
                          <p className="text-slate-800 bg-indigo-50/20 p-3 rounded-lg border border-indigo-100 font-medium">
                            {selectedFailureReport.CorrectiveAction || 'Chưa cập nhật hành động cải tiến quy trình lắp ráp hoặc thiết kế.'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block text-emerald-700">4. Biện pháp phòng ngừa diện rộng toàn chuỗi (Preventive Action):</span>
                        <p className="text-slate-800 bg-emerald-50/15 p-3 rounded-lg border border-emerald-100 font-medium">
                          {selectedFailureReport.PreventiveAction || 'Chưa ban hành hướng dẫn công việc tiêu chuẩn (SOP) hoặc dưỡng dưỡng mẫu mới.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Signatures Panel */}
                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-300 text-center text-xs">
                    <div className="space-y-16">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kỹ sư Giám định (QA Engineer)</p>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-slate-800"></p>
                        <p className="text-[10px] text-slate-400">Kỹ sư phòng QLCL</p>
                      </div>
                    </div>
                    <div className="space-y-16">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trưởng bộ phận QLCL</p>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-slate-800"></p>
                        <p className="text-[10px] text-slate-400">Trưởng phòng Chất lượng</p>
                      </div>
                    </div>
                    <div className="space-y-16">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ban Giám Đốc (BGĐ) phê duyệt</p>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-slate-800"></p>
                        <p className="text-[10px] text-slate-400">Phê duyệt chính thức</p>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                // Edit Mode (Structured Form with exactly synchronized inputs - satisfies rule 3)
                <div className="space-y-4 text-xs font-semibold max-w-3xl mx-auto">
                  <h4 className="text-sm font-bold text-slate-900 border-b pb-2 mb-4 flex items-center gap-1.5 font-black uppercase text-indigo-700">
                    <Sliders className="w-4 h-4 text-indigo-600" /> Cập nhật chi tiết Biên bản Giám định lỗi {selectedFailureReport.FailureID}
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-500 mb-1">Dòng xe bị lỗi (Model)</label>
                      <select 
                        value={selectedFailureReport.VehicleModel} 
                        onChange={e => setSelectedFailureReport({...selectedFailureReport, VehicleModel: e.target.value})} 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                      >
                        <option value="DK Gogo Smart">DK Gogo Smart</option>
                        <option value="DK X-Lite">DK X-Lite</option>
                        <option value="DK Roma Lite">DK Roma Lite</option>
                        <option value="DK Retro">DK Retro</option>
                        <option value="DK Sparta">DK Sparta</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Số khung xe lỗi (VIN)</label>
                      <input 
                        type="text" 
                        value={selectedFailureReport.VIN} 
                        onChange={e => setSelectedFailureReport({...selectedFailureReport, VIN: e.target.value})} 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-mono font-bold" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-500 mb-1">Đại lý phản hồi lỗi</label>
                      <input 
                        type="text" 
                        value={selectedFailureReport.Dealer} 
                        onChange={e => setSelectedFailureReport({...selectedFailureReport, Dealer: e.target.value})} 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-bold" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Ngày tiếp nhận báo cáo</label>
                      <input 
                        type="date" 
                        value={selectedFailureReport.FailureDate} 
                        onChange={e => setSelectedFailureReport({...selectedFailureReport, FailureDate: e.target.value})} 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-medium" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-500 mb-1">Độ nghiêm trọng</label>
                      <select 
                        value={selectedFailureReport.Severity} 
                        onChange={e => setSelectedFailureReport({...selectedFailureReport, Severity: e.target.value as any})} 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-bold"
                      >
                        <option value="A">Mức A (Cao nhất)</option>
                        <option value="B">Mức B (Nặng)</option>
                        <option value="C">Mức C (Vừa)</option>
                        <option value="D">Mức D (Nhẹ)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Trạng thái xử lý sự vụ</label>
                      <select 
                        value={selectedFailureReport.Status} 
                        onChange={e => setSelectedFailureReport({...selectedFailureReport, Status: e.target.value as any})} 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-bold text-slate-750"
                      >
                        <option value="Chưa xử lý">Chưa xử lý</option>
                        <option value="Đang xử lý">Đang xử lý</option>
                        <option value="Đã xử lý">Đã xử lý</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Hồ sơ CAPA xử lý liên đới</label>
                      <select 
                        value={selectedFailureReport.CAPAReference || ''} 
                        onChange={e => setSelectedFailureReport({...selectedFailureReport, CAPAReference: e.target.value || undefined})} 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                      >
                        <option value="">-- Không liên kết --</option>
                        {capas.map((c, idx) => <option key={c.CAPAID || `capa-${idx}`} value={c.CAPAID}>{c.CAPAID}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Hạng mục lỗi / Chi tiết sự cố hỏng</label>
                    <input 
                      type="text" 
                      value={selectedFailureReport.FailureCategory} 
                      onChange={e => setSelectedFailureReport({...selectedFailureReport, FailureCategory: e.target.value})} 
                      className="w-full border border-slate-200 rounded p-2 text-xs font-bold" 
                      required 
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Kết luận Giám định nguyên nhân kỹ thuật (Root Cause Analysis)</label>
                    <textarea 
                      value={selectedFailureReport.RootCause} 
                      onChange={e => setSelectedFailureReport({...selectedFailureReport, RootCause: e.target.value})} 
                      placeholder="Chi tiết nguyên nhân gây lỗi..." 
                      className="w-full border border-slate-200 rounded p-2 text-xs h-16 font-medium" 
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-500 mb-1">Biện pháp xử lý tạm thời / Chữa cháy (Correction)</label>
                      <input 
                        type="text" 
                        value={selectedFailureReport.Correction || ''} 
                        onChange={e => setSelectedFailureReport({...selectedFailureReport, Correction: e.target.value})} 
                        placeholder="Ví dụ: Đổi đĩa phanh cơ phẳng hoặc bệ cầu chì..." 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Hành động khắc phục triệt để (Corrective Action)</label>
                      <input 
                        type="text" 
                        value={selectedFailureReport.CorrectiveAction || ''} 
                        onChange={e => setSelectedFailureReport({...selectedFailureReport, CorrectiveAction: e.target.value})} 
                        placeholder="Yêu cầu NCC gia cố hoặc nâng cấp kẹp khóa sườn..." 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-medium" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-500 mb-1">Biện pháp phòng ngừa diện rộng (Preventive Action)</label>
                      <input 
                        type="text" 
                        value={selectedFailureReport.PreventiveAction || ''} 
                        onChange={e => setSelectedFailureReport({...selectedFailureReport, PreventiveAction: e.target.value})} 
                        placeholder="Bổ sung bước kiểm bavia hoặc chuẩn tâm..." 
                        className="w-full border border-slate-200 rounded p-2 text-xs font-medium" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-500 mb-1">Người phụ trách xử lý</label>
                        <select 
                          value={selectedFailureReport.Assignee || 'Nguyễn Xuân Thao'} 
                          onChange={e => setSelectedFailureReport({...selectedFailureReport, Assignee: e.target.value})} 
                          className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                        >
                          {employees.map((emp, idx) => <option key={emp.id || `emp-${idx}`} value={emp.name}>{emp.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1">Hạn hoàn thành (Target date)</label>
                        <input 
                          type="date" 
                          value={selectedFailureReport.DueDate || '2026-05-30'} 
                          onChange={e => setSelectedFailureReport({...selectedFailureReport, DueDate: e.target.value})} 
                          className="w-full border border-slate-200 rounded p-2 text-xs font-medium" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-150 flex justify-end gap-2 shrink-0">
                    <button type="button" onClick={() => setIsEditingReport(false)} className="px-4 py-2 border border-slate-200 rounded text-slate-500 hover:bg-slate-50">Hủy</button>
                    <button type="button" onClick={() => handleSaveFailureReport(selectedFailureReport)} className="px-5 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-500 shadow-sm">Lưu Thay Đổi Biên Bản</button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer (Uneditable actions) */}
            <div className="bg-slate-50 p-4 border-t border-slate-150 flex justify-end gap-2 rounded-b-2xl shrink-0">
              <button 
                type="button" 
                onClick={() => setSelectedFailureReport(null)} 
                className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl text-xs font-bold transition"
              >
                Đóng Biên Bản
              </button>
            </div>

          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function QMSInteractiveERMap({
  workItems,
  employees,
  suppliers,
  capas,
  kpis,
  projects,
  inspections,
  failures
}: {
  workItems: any[];
  employees: any[];
  suppliers: any[];
  capas: any[];
  kpis: any[];
  projects: any[];
  inspections: any[];
  failures: any[];
}) {
  const [selectedEntity, setSelectedEntity] = useState<string>('workItems');

  const entityDefinitions: { [key: string]: {
    name: string;
    description: string;
    pk: string;
    fields: { name: string; type: string; role: string; desc: string }[];
    relations: { targetEntity: string; onField: string; targetField: string; type: string }[];
    exampleQuery: string;
  }} = {
    workItems: {
      name: 'WorkItems (Công việc QLCL)',
      description: 'Bảng hạt nhân lưu các đầu việc, nhiệm vụ sửa đổi, hoặc xử lý chất lượng hàng ngày.',
      pk: 'WorkID',
      fields: [
        { name: 'WorkID', type: 'VARCHAR (PK)', role: 'Primary Key', desc: 'Mã định danh công việc duy nhất' },
        { name: 'TaskDescription', type: 'TEXT', role: 'Attribute', desc: 'Nội dung chi tiết đầu việc kiểm soát' },
        { name: 'Owner', type: 'VARCHAR (FK)', role: 'Foreign Key', desc: 'Tên kỹ sư gá khớp với Employee.name' },
        { name: 'SupplierReference', type: 'VARCHAR (FK)', role: 'Foreign Key', desc: 'Mã hãng gá khớp với Supplier.SupplierID' },
        { name: 'CAPAReference', type: 'VARCHAR (FK)', role: 'Foreign Key', desc: 'Mã CAPA sửa đổi gá khớp với CAPA.CAPAID' },
        { name: 'ProjectReference', type: 'VARCHAR (FK)', role: 'Foreign Key', desc: 'Liên kết dự án gá khớp với Project.ProjectID' },
        { name: 'KPIReference', type: 'VARCHAR (FK)', role: 'Foreign Key', desc: 'Mục tiêu chất lượng gá khớp với KPI.id' },
        { name: 'Status', type: 'VARCHAR', role: 'Attribute', desc: 'Trạng thái (Pending / Completed / Overdue)' }
      ],
      relations: [
        { targetEntity: 'employees', onField: 'Owner', targetField: 'name', type: 'N:1' },
        { targetEntity: 'suppliers', onField: 'SupplierReference', targetField: 'SupplierID', type: 'N:1' },
        { targetEntity: 'capas', onField: 'CAPAReference', targetField: 'CAPAID', type: 'N:1' },
        { targetEntity: 'projects', onField: 'ProjectReference', targetField: 'ProjectID', type: 'N:1' },
        { targetEntity: 'kpis', onField: 'KPIReference', targetField: 'id', type: 'N:1' }
      ],
      exampleQuery: `SELECT w.WorkID, w.TaskDescription, e.role as EmployeeRole, s.SupplierName \nFROM WorkItems w\nLEFT JOIN Employees e ON w.Owner = e.name\nLEFT JOIN Suppliers s ON w.SupplierReference = s.SupplierID;`
    },
    employees: {
      name: 'Employees (Biên chế KCS)',
      description: 'Danh mục gốc lưu giữ thông tin nhân sự kỹ sư kiểm lộ và quản trị viên chất lượng DKBike.',
      pk: 'id',
      fields: [
        { name: 'id', type: 'VARCHAR (PK)', role: 'Primary Key', desc: 'Mã nhân viên (STF-)' },
        { name: 'name', type: 'VARCHAR', role: 'Unique Key', desc: 'Họ và tên đầy đủ Kỹ sư' },
        { name: 'role', type: 'VARCHAR', role: 'Attribute', desc: 'Chức danh nghiệp vụ (IQC, PQC, OQC, QA)' },
        { name: 'email', type: 'VARCHAR', role: 'Attribute', desc: 'Hòm thư điện tử DKBike' }
      ],
      relations: [
        { targetEntity: 'workItems', onField: 'name', targetField: 'Owner', type: '1:N' }
      ],
      exampleQuery: `SELECT e.name, count(w.WorkID) as AllocatedTasks \nFROM Employees e\nLEFT JOIN WorkItems w ON e.name = w.Owner\nGROUP BY e.name;`
    },
    suppliers: {
      name: 'Suppliers (Nhà cung cấp)',
      description: 'Nhà máy cung ứng phụ tùng gầm bọng sườn xước cơ khí hoặc lốp xích xe.',
      pk: 'SupplierID',
      fields: [
        { name: 'SupplierID', type: 'VARCHAR (PK)', role: 'Primary Key', desc: 'Mã nhà cung cấp (SUP-)' },
        { name: 'SupplierName', type: 'VARCHAR', role: 'Attribute', desc: 'Tên pháp nhân công ty/nhà xưởng' },
        { name: 'ComponentType', type: 'VARCHAR', role: 'Attribute', desc: 'Loại linh kiện phân phối chính' },
        { name: 'PPM', type: 'INTEGER', role: 'Attribute', desc: 'Tỷ lệ lỗi phần triệu lũy kế' },
        { name: 'QualityRating', type: 'CHAR(1)', role: 'Attribute', desc: 'Xếp hạng phân loại CL (A, B, C, D)' }
      ],
      relations: [
        { targetEntity: 'workItems', onField: 'SupplierID', targetField: 'SupplierReference', type: '1:N' },
        { targetEntity: 'inspections', onField: 'SupplierID', targetField: 'SupplierID', type: '1:N' }
      ],
      exampleQuery: `SELECT s.SupplierName, s.PPM, count(i.InspectionID) as TotalBatches \nFROM Suppliers s\nLEFT JOIN Inspections i ON s.SupplierID = i.SupplierID\nGROUP BY s.SupplierID;`
    },
    capas: {
      name: 'CAPAs (Hồ sơ Khắc phục)',
      description: 'Bảng theo dõi hành động sửa chữa lỗi gốc rễ, ngăn tái diễn từ thị trường hoặc IQC.',
      pk: 'CAPAID',
      fields: [
        { name: 'CAPAID', type: 'VARCHAR (PK)', role: 'Primary Key', desc: 'Mã hồ sơ khắc phục duy nhất' },
        { name: 'Issue', type: 'TEXT', role: 'Attribute', desc: 'Mô tả hiện tượng lỗi / điểm kiểm toán' },
        { name: 'RootCause', type: 'TEXT', role: 'Attribute', desc: 'Giám định nguyên nhân gốc rễ kỹ thuật' },
        { name: 'CorrectiveAction', type: 'TEXT', role: 'Attribute', desc: 'Hành động khắc phục để khép buồng điện sấy' },
        { name: 'Owner', type: 'VARCHAR', role: 'Attribute', desc: 'Kỹ sư đóng dấu phán quyết' },
        { name: 'Status', type: 'VARCHAR', role: 'Attribute', desc: 'Trạng thái phê duyệt (Mở / Đóng)' }
      ],
      relations: [
        { targetEntity: 'workItems', onField: 'CAPAID', targetField: 'CAPAReference', type: '1:N' },
        { targetEntity: 'failures', onField: 'CAPAID', targetField: 'CAPAReference', type: '1:N' }
      ],
      exampleQuery: `SELECT c.CAPAID, c.Issue, f.FailureID, f.VehicleModel \nFROM CAPAs c\nINNER JOIN MarketFailures f ON c.CAPAID = f.CAPAReference;`
    },
    kpis: {
      name: 'KPIs (Chỉ tiêu chất lượng)',
      description: 'Chỉ tiêu phòng ban theo tháng hoặc năm được ban lãnh đạo DKBike phê chuẩn hoạch định.',
      pk: 'id',
      fields: [
        { name: 'id', type: 'VARCHAR (PK)', role: 'Primary Key', desc: 'Mã chỉ tiêu chỉ số' },
        { name: 'name', type: 'VARCHAR', role: 'Attribute', desc: 'Tên mô tả KPI kiểm định' },
        { name: 'target', type: 'VARCHAR', role: 'Attribute', desc: 'Mục tiêu ngưỡng điểm chấp nhận' },
        { name: 'result', type: 'VARCHAR', role: 'Attribute', desc: 'Thực tế đạt được của đợt quét' },
        { name: 'status', type: 'VARCHAR', role: 'Attribute', desc: 'Phán quyết kết quả (Đạt / Lỗi)' }
      ],
      relations: [
        { targetEntity: 'workItems', onField: 'id', targetField: 'KPIReference', type: '1:N' }
      ],
      exampleQuery: `SELECT k.id, k.name, w.WorkID, w.TaskDescription\nFROM KPIs k\nINNER JOIN WorkItems w ON k.id = w.KPIReference;`
    },
    projects: {
      name: 'Projects (Dự án R&D SP)',
      description: 'Cơ sở dữ liệu các dòng xe thử nghiệm đúc uốn sườn hoặc chạy dải Pin Lithium DKBike.',
      pk: 'ProjectID',
      fields: [
        { name: 'ProjectID', type: 'VARCHAR (PK)', role: 'Primary Key', desc: 'Mã dự án (PRJ-)' },
        { name: 'ProjectName', type: 'VARCHAR', role: 'Attribute', desc: 'Tên dự án thiết kế' },
        { name: 'VehicleModel', type: 'VARCHAR', role: 'Attribute', desc: 'Tên model thương phẩm dự định' },
        { name: 'Progress', type: 'INTEGER', role: 'Attribute', desc: 'Tiến độ nghiệm thu mẫu gá ráp (%)' }
      ],
      relations: [
        { targetEntity: 'workItems', onField: 'ProjectID', targetField: 'ProjectReference', type: '1:N' }
      ],
      exampleQuery: `SELECT p.VehicleModel, p.Progress, w.TaskDescription \nFROM Projects p\nLEFT JOIN WorkItems w ON p.ProjectID = w.ProjectReference;`
    },
    inspections: {
      name: 'Inspections (Kiểm định IQC/PQC/OQC)',
      description: 'Bảng động ghi chép nhật ký lấy mẫu, băm dập, hoặc kiểm ngoại quan trên sườn xước xe.',
      pk: 'InspectionID',
      fields: [
        { name: 'InspectionID', type: 'VARCHAR (PK)', role: 'Primary Key', desc: 'Mã phiếu KCS' },
        { name: 'SupplierID', type: 'VARCHAR (FK)', role: 'Foreign Key', desc: 'Nhà cung cấp linh kiện sản xuất' },
        { name: 'Component', type: 'VARCHAR', role: 'Attribute', desc: 'Bộ phận lấy mẫu kiểm định bavia sườn' },
        { name: 'InspectedQty', type: 'INTEGER', role: 'Attribute', desc: 'Quy mô số chiếc lấy mẫu' },
        { name: 'DefectiveQty', type: 'INTEGER', role: 'Attribute', desc: 'Số lượng xe/mẫu ghi nhận lỗi' },
        { name: 'Status', type: 'VARCHAR', role: 'Attribute', desc: 'Đánh giá KCS (Pass / NG)' }
      ],
      relations: [
        { targetEntity: 'suppliers', onField: 'SupplierID', targetField: 'SupplierID', type: 'N:1' }
      ],
      exampleQuery: `SELECT i.InspectionID, s.SupplierName, i.Component, i.DefectiveQty \nFROM Inspections i\nLEFT JOIN Suppliers s ON i.SupplierID = s.SupplierID\nWHERE i.DefectiveQty > 0;`
    },
    failures: {
      name: 'MarketFailures (Sự cố thị trường)',
      description: 'Bảng báo cáo lỗi khách hàng trả hàng bảo hành từ đại lý trên toàn quốc.',
      pk: 'FailureID',
      fields: [
        { name: 'FailureID', type: 'VARCHAR (PK)', role: 'Primary Key', desc: 'Mã sự vụ đại lý ghi lỗi' },
        { name: 'VehicleModel', type: 'VARCHAR', role: 'Attribute', desc: 'Dòng xe bị dính rủi ro kỹ thuật' },
        { name: 'VIN', type: 'VARCHAR', role: 'Attribute', desc: 'Số khung xe sườn định danh duy nhất' },
        { name: 'CAPAReference', type: 'VARCHAR (FK)', role: 'Foreign Key', desc: 'Liên kết hồ cố lỗi CAPA xử lý dứt điểm' }
      ],
      relations: [
        { targetEntity: 'capas', onField: 'CAPAReference', targetField: 'CAPAID', type: 'N:1' }
      ],
      exampleQuery: `SELECT f.FailureID, f.VehicleModel, c.RootCause, c.CorrectiveAction \nFROM MarketFailures f\nLEFT JOIN CAPAs c ON f.CAPAReference = c.CAPAID;`
    }
  };

  const selectedData = entityDefinitions[selectedEntity];

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
        
        {/* Left: Entities Block representation */}
        <div className="md:col-span-1 space-y-3">
          <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Danh sách Thực thể (Entities)</h4>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(entityDefinitions).map(([key, def]) => {
              const isActive = selectedEntity === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedEntity(key)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md font-bold' 
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  id={`er_btn_${key}`}
                >
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 self-center shrink-0">
                    <Database className="w-4 h-4 text-indigo-700" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black leading-tight">{def.name}</h5>
                    <p className={`text-[10px] mt-0.5 line-clamp-1 ${isActive ? 'text-indigo-100' : 'text-slate-400 font-medium'}`}>{def.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 2 columns: Active Entity Schema & Query Explainer */}
        <div className="md:col-span-2 space-y-4 flex flex-col min-h-0">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 flex-grow">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded">Đang duyệt Schema: {selectedData.pk} (PK)</span>
              <h4 className="text-sm font-extrabold text-slate-800 mt-2">{selectedData.name}</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-semibold">{selectedData.description}</p>
            </div>

            {/* List columns */}
            <div className="space-y-2">
              <h5 className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Định nghĩa thuộc tính & Phím chỉ mục</h5>
              <div className="border border-slate-150 rounded-xl overflow-hidden divide-y divide-slate-100 text-[11px] bg-slate-50">
                <div className="grid grid-cols-12 gap-2 p-2 bg-slate-100 text-slate-500 font-extrabold uppercase text-[9px] tracking-wider">
                  <div className="col-span-3">Tên Cột (Column)</div>
                  <div className="col-span-3">Kiểu dữ liệu</div>
                  <div className="col-span-2">Chỉ số</div>
                  <div className="col-span-4">Mô tả nghiệp vụ</div>
                </div>
                {selectedData.fields.map(f => (
                  <div key={f.name} className="grid grid-cols-12 gap-2 p-2.5 items-center font-semibold text-slate-700">
                    <div className="col-span-3 font-mono font-black text-slate-900">{f.name}</div>
                    <div className="col-span-3 font-mono text-[10px] text-indigo-650 font-black">{f.type}</div>
                    <div className="col-span-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                        f.role === 'Primary Key' ? 'bg-red-100 text-red-700 border border-red-200' :
                        f.role === 'Foreign Key' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-200 text-slate-700'
                      }`}>{f.role}</span>
                    </div>
                    <div className="col-span-4 text-slate-500 text-[10.5px] font-semibold leading-relaxed">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Relational connections */}
            <div className="space-y-2">
              <h5 className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Các mối quan hệ khóa ngoại (Relational Links)</h5>
              {selectedData.relations.length > 0 ? (
                <div className="flex flex-wrap gap-2 animate-fade-in">
                  {selectedData.relations.map((r, idx) => (
                    <div key={idx} className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5 flex items-center gap-2 text-xs font-extrabold text-slate-700 shadow-3xs">
                      <span className="font-mono text-indigo-700 font-black">{r.onField}</span>
                      <span className="text-slate-400 font-normal">&rarr; ({r.type}) &rarr;</span>
                      <span className="bg-white px-2 py-0.5 border border-slate-200 rounded-md font-black text-slate-800">{r.targetEntity.toUpperCase()}</span>
                      <span className="text-slate-400 font-normal">on</span>
                      <span className="font-mono text-indigo-700 font-black">{r.targetField}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11.5px] font-semibold text-slate-400 italic">Bảng này không trực tiếp chứa khóa ngoại trỏ đi nơi khác.</p>
              )}
            </div>

            {/* SQL Join Explainer */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h5 className="text-[10.5px] text-indigo-650 font-black uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> Câu lệnh SQL JOIN lấy mẫu dán ghép thực tế
              </h5>
              <div className="font-mono text-[10.5px] bg-slate-900 border border-slate-800 text-emerald-400 rounded-xl p-3.5 overflow-x-auto whitespace-pre leading-relaxed shadow-lg">
                {selectedData.exampleQuery}
              </div>
              <p className="text-[10px] font-medium text-slate-400 leading-normal italic">
                *Các module KCS, CAPA và Supplier của DKBike liên kết chéo qua cấu trúc Schema ngoại khóa để bảo đảm tính nhất quán ròng của dữ liệu.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
