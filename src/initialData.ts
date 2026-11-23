import { Task, KPI, Supplier, CAPA, PTSPProject, MarketDefect, ECOChange, COPQMetric, CustomForm, QualityStaff, DKBikeModel, EquipmentItem, MaintenanceLog, EquipmentIncident, Dealer } from './types';

export const INITIAL_STAFF: QualityStaff[] = [
  { id: 'STF-01', name: 'Nguyễn Xuân Thao', role: 'Trưởng phòng Quản lý chất lượng, phó bộ phận PTSP (SQC, CAPA, IQC)', email: 'thaonguyendkbike@gmail.com', permission: 'edit' },
  { id: 'STF-02', name: 'Hà Khắc Việt', role: 'Phụ trách kiểm tra đầu vào (IQC Section Lead)', email: 'khacvietls@gmail.com', permission: 'edit' },
  { id: 'STF-03', name: 'Hoàng Văn Phấn', role: 'Tổ trưởng Tổ kiểm soát chất lượng lắp ráp trong dây chuyền (PQC Line Supervisor)', email: 'hoangphan250991@gmail.com', permission: 'edit' },
  { id: 'STF-04', name: 'Đoàn Anh Hùng', role: 'Chuyên viên kiểm tra, xử lý linh kiện đầu vào DK, đầu vào dây chuyền', email: 'doananhhung.22031981@gmail.com', permission: 'edit' },
  { id: 'STF-05', name: 'Liễu Tùng Lâm', role: 'Sát hạch viên, nhân viên kiểm thử OQC (OQC Quality Assurance)', email: 'tunglam.lieu@dkbike.vn', permission: 'view' },
  { id: 'STF-06', name: 'Lành Xuân Hải', role: 'Sát hạch viên, nhân viên kiểm thử OQC (OQC Quality Assurance)', email: 'lanhxuanhai1990@gmail.com', permission: 'edit' },
  { id: 'STF-07', name: 'Nguyễn Đức Linh', role: 'Phó Giám đốc Sản xuất', email: 'linh.nguyen@dkbike.vn', permission: 'edit' },
  { id: 'STF-08', name: 'Nguyễn Văn Diệm', role: 'Bảo hành/sự cố thị trường', email: 'diemnguyenls@gmail.com', permission: 'view' },
  { id: 'STF-09', name: 'Nguyễn Văn A', role: 'QC', email: 'ngutrenbanphim@gmail.com', permission: 'edit' },
  { id: 'STF-10', name: 'Hoàng Thị Huệ', role: 'HCNS', email: 'hue.hoang@dkbike.vn', permission: 'view' },
  { id: 'STF-12', name: 'MKT', role: 'MKT', email: 'dkbike.mkt@gmail.com', permission: 'view' },
  { id: 'STF-13', name: 'Đoàn Minh Cương', role: 'Đăng kiểm', email: 'cuong.doan@dkbike.vn', permission: 'view' },
  { id: 'STF-14', name: 'Trần Thanh Hiển', role: 'Kho TP', email: 'hieno0o92@gmail.com', permission: 'edit' },
  { id: 'STF-15', name: 'Trần Thế Quảng', role: 'Nhân viên kỹ thuật', email: 'tranquangls1308@gmail.com', permission: 'edit' }
];

export const INITIAL_MODELS: DKBikeModel[] = [
  {
    "id": "MDL-01",
    "name": "DK D2",
    "status": "Đang sản xuất",
    "releaseYear": 2025
  },
  {
    "id": "MDL-02",
    "name": "DK EZ3",
    "status": "Đang sản xuất",
    "releaseYear": 2025
  },
  {
    "id": "MDL-03",
    "name": "DK Gogo Smart",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-04",
    "name": "DK Nova",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-05",
    "name": "DK Roma SX V2",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-06",
    "name": "DK S3",
    "status": "Đang sản xuất",
    "releaseYear": 2025
  },
  {
    "id": "MDL-07",
    "name": "DK V1",
    "status": "Đang sản xuất",
    "releaseYear": 2024
  },
  {
    "id": "MDL-08",
    "name": "DK V2",
    "status": "Đang sản xuất",
    "releaseYear": 2025
  },
  {
    "id": "MDL-09",
    "name": "DK Apollo",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-10",
    "name": "DK Cola",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-11",
    "name": "DK Crea Mono",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-12",
    "name": "DK Crea Mono 50CC",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-13",
    "name": "DK D1",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-14",
    "name": "DK EC5",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-15",
    "name": "DK ET1",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-16",
    "name": "DK EZ1",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-17",
    "name": "DK EZ1-App",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-18",
    "name": "DK EZ2_App",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-19",
    "name": "DK EZ3 _ App",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-20",
    "name": "DK EZ5",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-21",
    "name": "DK EZ5+",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-22",
    "name": "DK Gogo",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-23",
    "name": "DK Gogo New",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-24",
    "name": "DK Gogo NewS",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-25",
    "name": "DK Gogo S",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-26",
    "name": "DK Miku",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-27",
    "name": "DK Moda",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-28",
    "name": "DK Retro 50CC",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-29",
    "name": "DK ROMA GT",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-30",
    "name": "DK Roma GT 50cc",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-31",
    "name": "DK ROMA GT_App",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-32",
    "name": "DK Roma Lite S",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-33",
    "name": "DK Roma Lite S (v)",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-34",
    "name": "DK Roma Lite S (V) 50CC",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-35",
    "name": "DK Roma SX",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-36",
    "name": "DK Roma SX v2 50cc",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-37",
    "name": "DK ROMA SX v2_App",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-38",
    "name": "DK RomaSE 50CC",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-39",
    "name": "DK RomaSX (V) 50CC",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-40",
    "name": "DK RomaSX 50CC",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-41",
    "name": "DK RomaSX II (V) NFC",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-42",
    "name": "DK RomaSX II 50CC",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-43",
    "name": "DK RomaSX New (V)",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-44",
    "name": "DK RomaSX New (V) NFC",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-45",
    "name": "DK S1",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-46",
    "name": "DK S2",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-47",
    "name": "DK S2 App",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-48",
    "name": "DK S2.1",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-49",
    "name": "DK S3 App",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-50",
    "name": "DK S5",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-51",
    "name": "DK S5 +",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-52",
    "name": "DK Samurai",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-53",
    "name": "DK Siri 50CC",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-54",
    "name": "DK Sparta",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-55",
    "name": "DK Tron",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-56",
    "name": "DK V1_App",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-57",
    "name": "DK V1_App.2Y",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-58",
    "name": "DK V1.2Y",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-59",
    "name": "DK Xman X1",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-60",
    "name": "DK Xmen",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-61",
    "name": "DK Xmen NFC",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-62",
    "name": "DK Xmen v1",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-63",
    "name": "DK Xmen v2",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-64",
    "name": "DK Z-Buff",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-65",
    "name": "DK Z-Buff v2",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-66",
    "name": "DK Z-MTP",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  },
  {
    "id": "MDL-67",
    "name": "Xe mẫu",
    "status": "Đang sản xuất",
    "releaseYear": 2026
  }
];

export const INITIAL_TASKS: Task[] = [];
export const INITIAL_KPIS: KPI[] = [];
export const INITIAL_SUPPLIERS: Supplier[] = [];
export const INITIAL_CAPAS: CAPA[] = [];
export const INITIAL_PROJECTS: PTSPProject[] = [];
export const INITIAL_DEFECTS: MarketDefect[] = [];
export const INITIAL_ECOS: ECOChange[] = [];
export const INITIAL_COPQS: COPQMetric[] = [];

export interface FMEARecord {
  id: string;
  processStep: string;
  potentialFailureMode: string;
  potentialEffect: string;
  severity: number;
  potentialCause: string;
  occurrence: number;
  currentControl: string;
  detection: number;
  rpn: number;
  riskLevel: 'Cao' | 'Trung bình' | 'Thấp';
  proposedAction: string;
  imageUrl?: string;
}

export const INITIAL_FMEA: FMEARecord[] = [];
export const INITIAL_FORMS: CustomForm[] = [];
export const INITIAL_EQUIPMENT: EquipmentItem[] = [];
export const INITIAL_MAINTENANCE_LOGS: MaintenanceLog[] = [];
export const INITIAL_EQUIPMENT_INCIDENTS: EquipmentIncident[] = [];

export const INITIAL_DEALERS: Dealer[] = [
  { id: 'DLR-01', name: 'Đại lý Hà Nội', phone: '0981234567', address: '12 Cầu Giấy, Hà Nội' },
  { id: 'DLR-02', name: 'Đại lý Hải Phòng 2', phone: '0977654321', address: '34 Lạch Tray, Hải Phòng' },
  { id: 'DLR-03', name: 'Đại lý Lạng Sơn', phone: '0912345678', address: '56 Trần Hưng Đạo, Lạng Sơn' },
  { id: 'DLR-04', name: 'Đại lý Bắc Giang', phone: '0966554433', address: '78 Nguyễn Văn Cừ, Bắc Giang' },
  { id: 'DLR-05', name: 'Đại lý Đà Nẵng', phone: '0905123456', address: '90 Lê Duẩn, Đà Nẵng' },
  { id: 'DLR-06', name: 'Đại lý TP.HCM', phone: '0938112233', address: '101 Nguyễn Thị Minh Khai, Quận 1, TP.HCM' },
  { id: 'DLR-07', name: 'ĐL THÀNH TRUNG - LÊ THỊ GÁI EM (THÀNH TRUNG)', phone: '0912345678', address: 'Đại lý ủy nhiệm DKBike' },
  { id: 'DLR-08', name: 'ĐL Hoàn Hợi - Hải Dương', phone: '', address: 'Hải Dương' },
  { id: 'DLR-09', name: 'ĐL Chính Tuyết - Thái Bình', phone: '', address: 'Thái Bình' }
];
