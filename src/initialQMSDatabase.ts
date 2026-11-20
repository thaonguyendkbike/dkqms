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
} from './types';

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'STF-01', name: 'Nguyễn Xuân Thao', role: 'Trưởng phòng Quản lý chất lượng, phó bộ phận PTSP (SQC, CAPA, IQC)', email: 'thaonguyendkbike@gmail.com', permission: 'edit' },
  { id: 'STF-02', name: 'Hà Khắc Việt', role: 'Phụ trách kiểm tra đầu vào (IQC Section Lead)', email: 'khacvietls@gmail.com', permission: 'edit' },
  { id: 'STF-03', name: 'Hoàng Văn Phấn', role: 'Tổ trưởng Tổ kiểm soát chất lượng lắp ráp trong dây chuyền (PQC Line Supervisor)', email: 'hoangphan250991@gmail.com', permission: 'edit' },
  { id: 'STF-04', name: 'Đoàn Anh Hùng', role: 'Chuyên viên kiểm tra, xử lý linh kiện đầu vào DK, đầu vào dây chuyền', email: 'anhhung.doan@dkbike.vn', permission: 'view' },
  { id: 'STF-05', name: 'Liễu Tùng Lâm', role: 'Sát hạch viên, nhân viên kiểm thử OQC (OQC Quality Assurance)', email: 'tunglam.lieu@dkbike.vn', permission: 'view' },
  { id: 'STF-06', name: 'Lành Xuân Hải', role: 'Sát hạch viên, nhân viên kiểm thử OQC (OQC Quality Assurance)', email: 'lanhxuanhai1990@gmail.com', permission: 'edit' },
  { id: 'STF-15', name: 'Trần Thế Quảng', role: 'Nhân viên kỹ thuật', email: 'thequang.tran@dkbike.vn', permission: 'edit' }
];
export const INITIAL_SUPPLIERS: Supplier[] = [];
export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_CAPAS: CAPA[] = [];
export const INITIAL_KPIS: KPI[] = [];
export const INITIAL_WORK_ITEMS: WorkItem[] = [];
export const INITIAL_SUPPLIER_INSPECTIONS: SupplierInspection[] = [];
export const INITIAL_ENGINEERING_CHANGES: EngineeringChange[] = [];
export const INITIAL_MARKET_FAILURES: MarketFailure[] = [];
export const INITIAL_WARRANTY_CLAIMS: WarrantyClaim[] = [];
export const INITIAL_QUALITY_DOCUMENTS: QualityDocument[] = [];
export const INITIAL_WEEKLY_REPORTS: WeeklyReport[] = [];
export const INITIAL_MONTHLY_REPORTS: MonthlyReport[] = [];
