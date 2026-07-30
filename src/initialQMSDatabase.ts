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

export const INITIAL_EMPLOYEES: Employee[] = [];
export const INITIAL_SUPPLIERS: Supplier[] = [];
export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_CAPAS: CAPA[] = [];
export const INITIAL_KPIS: KPI[] = [];
export const INITIAL_WORK_ITEMS: WorkItem[] = [];
export const INITIAL_SUPPLIER_INSPECTIONS: SupplierInspection[] = [];
export const INITIAL_ENGINEERING_CHANGES: EngineeringChange[] = [];
export const INITIAL_MARKET_FAILURES: MarketFailure[] = [
  {
    FailureID: 'DEF-4001',
    VehicleModel: 'DK Gogo Smart',
    VIN: 'DKB80G0202607A11',
    Dealer: 'Đại lý DKBike Hà Nội',
    FailureDate: '2026-05-10',
    FailureCategory: 'Chập cầu chì động cơ chính',
    Severity: 'A',
    RootCause: 'Rung lắc khi vận hành trên đường xấu làm lỏng giắc cắm cầu chì đúc dẫn tới quá nhiệt cục bộ và nóng chảy chân cực',
    CAPAReference: 'CAPA-2026-001',
    Status: 'Đã xử lý',
    Correction: 'Thay mới bệ cầu chì dập nguội giắc lò xo chịu tải cao cho khách hàng',
    CorrectiveAction: 'Yêu cầu nhà cung ứng sườn/linh kiện gia cố ngàm nhựa khóa khóa giắc chống sụt sịt và bọc keo chống nước silicone',
    PreventiveAction: 'Tiến hành audit kiểm toán lại quy trình kiểm tra gá giắc lắp ráp của công nhân dây chuyền trước khi đóng ốp nhựa sườn xe',
    Assignee: 'Nguyễn Xuân Thao',
    DueDate: '2026-05-20'
  },
  {
    FailureID: 'DEF-4002',
    VehicleModel: 'DK X-Lite',
    VIN: 'DKB90XL202608B22',
    Dealer: 'Đại lý DKBike Đà Nẵng',
    FailureDate: '2026-05-15',
    FailureCategory: 'Mất lực phanh dải phanh sau',
    Severity: 'B',
    RootCause: 'Ốp đĩa phanh bị lệch tâm 0.3mm do bavia chưa được mài nhẵn bavia đúc từ xưởng dập cơ khí của nhà cung cấp',
    CAPAReference: 'CAPA-2026-002',
    Status: 'Đang xử lý',
    Correction: 'Mài phẳng bavia cơ khí mặt gá hoặc thay đĩa phanh dập chuẩn tâm',
    CorrectiveAction: 'Yêu cầu xưởng dập phụ tùng lắp cữ hiệu chỉnh tâm thủy lực tự động (Auto-Alignment) trước khi đóng hộp bàn giao bốc xếp',
    PreventiveAction: 'Bổ sung bước dưỡng dưỡng kiểm tâm đĩa phanh vào quy chuẩn IQC kiểm tra nhận hàng',
    Assignee: 'Nguyễn Xuân Thao',
    DueDate: '2026-05-30'
  }
];
export const INITIAL_WARRANTY_CLAIMS: WarrantyClaim[] = [];
export const INITIAL_QUALITY_DOCUMENTS: QualityDocument[] = [];
export const INITIAL_WEEKLY_REPORTS: WeeklyReport[] = [];
export const INITIAL_MONTHLY_REPORTS: MonthlyReport[] = [];
