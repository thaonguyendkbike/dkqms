/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ==========================================
// 1. EMPLOYEES TABLE (Nhân viên Phòng QLCL & Nhà Máy)
// ==========================================
export interface Employee {
  id: string; // STF-01, STF-02, ...
  name: string;
  role: string;
  email: string;
  phone?: string;
  permission?: 'view' | 'edit';
}

// Retain alias for backwards compatibility
export type QualityStaff = Employee;

// ==========================================
// 2. WORK ITEMS TABLE (Bảng Công việc nghiệp vụ QLCL)
// ==========================================
export interface WorkItem {
  id?: string; // Unified primary key
  WorkID?: string; // For backwards compatibility
  date?: string;
  Date?: string;
  week?: number;
  Week?: number;
  month?: number;
  Month?: number;
  category?: '5S' | 'Công việc phát sinh' | 'KCS đầu ra' | 'Kiểm tra đầu vào' | 'Kiểm tra linh kiện NCC' | 'PTSP' | 'CAPA' | 'Hồ sơ chất lượng' | 'Hệ thống chất lượng' | 'Cải tiến' | string;
  Category?: string;
  content?: string; // task description
  TaskDescription?: string;
  target?: number;
  Target?: number;
  result?: number;
  ActualResult?: number;
  status?: 'Completed' | 'Pending' | 'Overdue' | string;
  Status?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  Priority?: string;
  assignee?: string;
  Owner?: string;
  kpiId?: string;
  KPIReference?: string;
  supplierId?: string;
  SupplierReference?: string;
  projectId?: string;
  ProjectReference?: string;
  capaId?: string;
  CAPAReference?: string;
  rootCause?: string;
  RootCause?: string;
  nextAction?: string;
  NextAction?: string;
  dueDate?: string;
  DueDate?: string;
}

// For backwards compatibility with old Task usage
export interface Task {
  id: string;
  date: string;
  week: number;
  month: number;
  assignee: string;
  category: string;
  content: string;
  target: number;
  result: number;
  status: 'Completed' | 'Pending' | 'Overdue';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  
  // Custom information fields requested by user
  issueCondition?: string; // Vấn đề/tình trạng
  locationOfOrigin?: string; // Nơi phát sinh
  rootCausePending?: string; // Nguyên nhân gốc rễ
  proposedSolution?: string; // Phương án / nhiệm vụ xử lý
  
  kpiId?: string;
  projectId?: string;
  supplierId?: string;
  nextPlan: string;
  weeksUnresolved?: number;
  images?: string[];
}

// ==========================================
// 3. KPIs TABLE (Chỉ tiêu Hiệu suất chất lượng)
// ==========================================
export interface KPI {
  id: string; // KPI-001, KPI-002...
  name: string;
  target: string;
  result: string;
  unit: string;
  status: 'Đạt' | 'Không đạt';
  history: { label: string; value: number }[]; // Lịch sử đo đứt quãng qua các tháng
  trend: 'Cải thiện' | 'Xấu đi' | 'Ổn định';
  rootCause: string; // Giải trình nguyên nhân nếu không đạt
  group?: 'Sản lượng' | 'Nhân sự' | 'Chi phí bộ phận' | '6S' | 'Cải tiến' | 'Báo cáo kế hoạch' | 'Chất lượng IQC' | 'Chất lượng PQC' | 'Chất lượng OQC';
  weight?: number; // Trọng số của KPI trong phòng (ví dụ 10%)
}

// ==========================================
// 4. CAPAs TABLE (Hành động khắc phục & Phòng ngừa)
// ==========================================
export interface CAPA {
  id?: string; // Preferred primary key
  CAPAID?: string; // For backwards compatibility
  
  title?: string;
  Issue?: string; // Alias
  issue?: string; // Unified camelCase
  
  source?: string;
  assignee?: string;
  Owner?: string; // Alias
  owner?: string; // Unified camelCase
  
  targetDate?: string;
  DueDate?: string; // Alias
  dueDate?: string; // Unified camelCase
  
  status?: string;
  Status?: 'Mở' | 'Đã đóng' | 'Quá hạn' | string; // Alias
  
  rootCause?: string;
  RootCause?: string; // Alias
  
  actions?: string | string[];
  Correction?: string; // Alias
  correction?: string; // Unified camelCase
  
  CorrectiveAction?: string; // Alias
  correctiveAction?: string; // Unified camelCase
  
  PreventiveAction?: string; // Alias
  preventiveAction?: string; // Unified camelCase
  
  effectiveness?: 'Chưa đánh giá' | 'Hiệu quả' | 'Kém hiệu quả' | string;
  Effectiveness?: 'Chưa đánh giá' | 'Hiệu quả' | 'Kém hiệu quả' | string; // Alias
  
  isRepeated?: boolean;
  imageUrl?: string;
  supplierName?: string;
  modelName?: string;
  locationOfOrigin?: string;
  images?: string[];
}

// ==========================================
// 5. SUPPLIERS TABLE (Danh mục Nhà cung cấp linh kiện)
// ==========================================
export interface Supplier {
  id?: string; // Primary key
  SupplierID?: string; // For backwards compatibility
  
  name?: string;
  SupplierName?: string; // Alias
  
  componentType?: string;
  ComponentType?: string; // Alias
  
  ppm?: number;
  PPM?: number; // Alias
  
  qualityRating?: 'A' | 'B' | 'C' | 'D' | string;
  QualityRating?: 'A' | 'B' | 'C' | 'D' | string; // Alias
  
  lastAuditDate?: string;
  LastAuditDate?: string; // Alias
  
  status?: string;
  Status?: 'Active' | 'Under Audit' | 'Suspended' | string; // Alias
  
  defectRate?: string | number;
  totalParts?: number;
  faultyParts?: number;
  trends?: (string | number)[];
  suppliedComponentCount?: number;
  defectTypes?: string[];
  address?: string;
  phone?: string;
}

// ==========================================
// 6. SUPPLIER INSPECTIONS TABLE (Kiểm soát chất lượng nhận hàng đầu vào - IQC)
// ==========================================
export interface SupplierInspection {
  id?: string; // Unified
  InspectionID?: string; // For backwards compatibility
  supplierId?: string;
  SupplierID?: string; // For backwards compatibility
  supplierName?: string;
  SupplierName?: string; // For backwards compatibility
  date?: string;
  Date?: string;
  component?: string;
  Component?: string;
  batchSize?: number;
  BatchSize?: number;
  inspectedQty?: number;
  InspectedQty?: number;
  defectiveQty?: number;
  DefectiveQty?: number;
  status?: 'Pass' | 'Fail' | string;
  Status?: 'Pass' | 'Fail' | string;
  defectType?: string;
  DefectType?: string;
  category?: 'IQC' | 'PQC' | 'OQC' | string;
  Category?: 'IQC' | 'PQC' | 'OQC' | string;
}

// ==========================================
// 7. PROJECTS TABLE (Dự án Phát triển Sản phẩm mới - R&D/PTSP)
// ==========================================
export interface Project {
  id?: string; // Unified
  ProjectID?: string; // For backwards compatibility
  vehicleModel?: string;
  VehicleModel?: string;
  projectName?: string;
  ProjectName?: string;
  stage?: 'Nghiên cứu thị trường' | 'Thiết kế concept' | 'Chế tạo mẫu thử' | 'Kiểm thử thực tế' | 'Sản xuất thử nghiệm lô nhỏ' | 'Áp dụng đại trà' | string;
  Stage?: string;
  progress?: number;
  Progress?: number;
  riskLevel?: 'Cao' | 'Trung bình' | 'Thấp' | string;
  RiskLevel?: string;
  dueDate?: string;
  DueDate?: string;
}

// For backwards compatibility
export interface PTSPProject {
  id: string;
  name: string;
  type: 'Dự án mới' | 'Dự án cải tiến' | 'Thử nghiệm' | 'Đã áp dụng';
  progress: number;
  status: 'Đúng hạn' | 'Chậm tiến độ';
  manager: string;
  openTasksCount: number;
  risksDescription?: string;
  regCertDate?: string;
  massProductionDate?: string;
  imageUrl?: string;
  actualDocRate?: number;
  targetDocRate?: number;
  stage?: string;
}

export interface PTSPTask {
  id: string;
  projectId: string;
  stage: number;
  stageName: string;
  itemCode: string;
  name: string;
  description: string;
  unit: string;
  target: string;
  executor: string;
  cooperator: string;
  startDate: string;
  endDate: string;
  duration: number;
  progress: number;
  result: string;
  isCritical: boolean;
  link?: string;
}

// ==========================================
// 8. ENGINEERING CHANGES TABLE (Thay đổi thiết kế kỹ thuật - ECO/ECR)
// ==========================================
export interface EngineeringChange {
  id?: string; // Unified
  ECOID?: string; // For backwards compatibility
  vehicleModel?: string;
  VehicleModel?: string;
  component?: string;
  Component?: string;
  changeDescription?: string;
  ChangeDescription?: string;
  reason?: string;
  Reason?: string;
  approvalStatus?: 'Đề xuất' | 'Đang thử nghiệm' | 'Đã áp dụng' | 'Thất bại' | string;
  ApprovalStatus?: 'Đề xuất' | 'Đang thử nghiệm' | 'Đã áp dụng' | 'Thất bại' | string;
  implementationDate?: string;
  ImplementationDate?: string;
}

// For backwards compatibility
export interface ECOChange {
  id: string;
  ecrId: string;
  model: string;
  component: string;
  content: string;
  rootCause: string;
  proposer: string;
  approver: string;
  applyDate: string;
  status: 'Đề xuất' | 'Đang thử nghiệm' | 'Đã áp dụng' | 'Thất bại';
  category: 'Thiết kế' | 'Vật liệu' | 'Nhà cung cấp' | 'Quy trình' | 'Tiêu chuẩn';
  imageUrl?: string;
  auditChecklist?: {
    riskAssessed: boolean;
    toolingDone: boolean;
    sopCreated: boolean;
    iqcTestDone: boolean;
  };
  auditNotes?: string;
}

// ==========================================
// 9. MARKET FAILURES TABLE (Sự cố lỗi thị trường của khách hàng)
// ==========================================
export interface MarketFailure {
  id?: string; // Unified
  FailureID?: string; // For backwards compatibility
  vehicleModel?: string;
  VehicleModel?: string;
  vin?: string;
  VIN?: string;
  dealer?: string;
  Dealer?: string;
  failureDate?: string;
  FailureDate?: string;
  failureCategory?: string;
  FailureCategory?: string;
  severity?: 'A' | 'B' | 'C' | 'D' | string;
  Severity?: 'A' | 'B' | 'C' | 'D' | string;
  rootCause?: string;
  RootCause?: string;
  capaId?: string;
  CAPAReference?: string;
  status?: 'Chưa xử lý' | 'Đang xử lý' | 'Đã xử lý' | string;
  Status?: string;
  correction?: string;
  Correction?: string;
  correctiveAction?: string;
  CorrectiveAction?: string;
  preventiveAction?: string;
  PreventiveAction?: string;
  assignee?: string;
  Assignee?: string;
  dueDate?: string;
  DueDate?: string;
}

// For backwards compatibility with Defects
export interface MarketDefect {
  id: string;
  feedbackType: 'Lỗi xe từ khách hàng' | 'Đề xuất cải tiến' | 'Khác' | string;
  model: string;
  chassisNo: string;
  engineNo: string;
  saleDate: string;
  dealer: string;
  defectDate: string;
  type: string;
  description: string;
  severity: 'A' | 'B' | 'C' | 'D' | 'Cao' | 'Nghiêm trọng' | 'Trung bình' | 'Thấp' | string;
  rootCause: string;
  capaId?: string;
  status: 'Đã xử lý' | 'Đang xử lý' | 'Chưa xử lý' | 'Đề xuất cải tiến' | string;
  imageUrl?: string;
  supplierName?: string;
  correction?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  assignee?: string;
  targetDate?: string;
  locationOfOrigin?: string;
  images?: string[];
  // Additional customer feedback fields:
  customerName?: string;
  sourceDate?: string;
  originalCategory?: string; // Loại phản ánh gốc (Chất lượng, Lắp ráp, Cung ứng...)
  customerRating?: string; // Đánh giá KH (Hài lòng, Chưa hài lòng...)
  severityRationale?: string; // Cơ sở phân loại mức độ
  dataNotes?: string; // Ghi chú dữ liệu
}

// ==========================================
// 10. WARRANTY CLAIMS TABLE (Yêu cầu bảo hành linh kiện lỗi của hệ thống Đại lý)
// ==========================================
export interface WarrantyClaim {
  id: string; // Unified
  ClaimID?: string; // For backwards compatibility
  vehicleModel: string;
  VehicleModel?: string;
  component: string;
  Component?: string;
  dealer: string;
  Dealer?: string;
  claimDate: string;
  ClaimDate?: string;
  cost: number;
  Cost?: number;
  status: 'Approved' | 'Pending' | 'Rejected' | string;
  Status?: 'Approved' | 'Pending' | 'Rejected' | string;
}

// ==========================================
// 11. QUALITY DOCUMENTS TABLE (Tài liệu Quy trình & Tiêu chuẩn Chất lượng ISO QMS)
// ==========================================
export interface QualityDocument {
  id: string; // Unified
  DocumentID?: string; // For backwards compatibility
  title: string;
  Title?: string;
  category: 'Tiêu chuẩn SOP' | 'Quy trình SOP' | 'Checklist' | 'Hướng dẫn kỹ thuật' | string;
  Category?: string;
  version: string;
  Version?: string;
  status: 'Có hiệu lực' | 'Hết hiệu lực' | 'Dự thảo' | string;
  Status?: string;
  owner: string;
  Owner?: string;
  lastUpdated: string;
  LastUpdated?: string;
}

// ==========================================
// 12. WEEKLY & MONTHLY REPORTS TABLE (Tổng hợp báo cáo chất lượng tự động)
// ==========================================
export interface WeeklyReport {
  id: string; // Unified
  ReportID?: string; // For backwards compatibility
  week: number;
  Week?: number;
  month: number;
  Month?: number;
  year: number;
  Year?: number;
  generatedDate: string;
  GeneratedDate?: string;
  generalAnalysis: string;
  GeneralAnalysis?: string;
  criticalAlerts: string[];
  CriticalAlerts?: string[];
  actionRecommendations: string[];
  ActionRecommendations?: string[];
  score: number;
  Score?: number;
}

export interface MonthlyReport {
  id: string; // Unified
  ReportID?: string; // For backwards compatibility
  month: number;
  Month?: number;
  year: number;
  Year?: number;
  generatedDate: string;
  GeneratedDate?: string;
  overallAssessment: string;
  OverallAssessment?: string;
  kpiEvaluation: { kpiId: string; name: string; score: string; comment: string }[];
  KPIEvaluation?: { kpiId: string; name: string; score: string; comment: string }[];
  supplierDeteriorationAnalysis: string[];
  SupplierDeteriorationAnalysis?: string[];
  actionRecommendations: string[];
  ActionRecommendations?: string[];
  score: number;
  Score?: number;
}

// Additional helper types in system
export interface COPQMetric {
  id: string;
  category: 'Tái chế' | 'Sửa chữa' | 'Bảo hành' | 'Đổi trả' | 'Dừng chuyền' | 'Kiểm tra lại' | string;
  amount: number;
  trend: 'Tăng' | 'Giảm' | 'Ổn định' | string;
  details: string;
  month?: number;
  year?: number;
  costOrigin?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  notes?: string;
}

export interface CustomForm {
  id: string;
  title: string;
  description: string;
  fields: { name: string; type: string; purpose: string; isRequired: boolean }[];
  relatedKPIs: string[];
  suggestedDashboard: string;
  createdAt: string;
}

export interface DKBikeModel {
  id: string;
  name: string;
  status: 'Đang sản xuất' | 'Sắp ra mắt' | 'R&D';
  releaseYear: number;
}

export interface Dealer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
}

// ==========================================
// 13. PLANNING & APPROVAL SYSTEM (Kế hoạch tuần & tháng)
// ==========================================
export interface PlanTarget {
  id: string;
  category: string;
  content: string;
  unit: string;
  targetValue: string | number;
  explanation: string;
  assignee: string;
  collaborator: string;
  actualValue?: string | number;
  achieved?: boolean;
}

export interface WeeklyPlan {
  id: string;
  year: number;
  month: number;
  week: string; // T1, T2, T3, T4, T5
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
  submitDate?: string;
  approveDate?: string;
  directorFeedback?: string;
  targets: PlanTarget[];
}

export interface MonthlyPlan {
  id: string;
  year: number;
  month: number;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
  submitDate?: string;
  approveDate?: string;
  directorFeedback?: string;
  targets: PlanTarget[];
}

// ==========================================
// 14. EQUIPMENT MAINTENANCE & BREAKDOWN SYSTEM
// ==========================================
export interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  status: 'Running' | 'Stopped' | 'Maintenance' | 'Under Repair' | 'Offline';
  healthRate: number;
  location: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  maintainFrequency: 'Hằng tuần' | 'Hằng tháng' | 'Hằng quý' | 'Định kỳ hằng năm';
  responsiblePerson: string;
  manufacturer: string;
  specifications: string;
  manufactureYear?: number;
  imageUrl?: string;
}

export interface MaintenanceLog {
  id: string;
  equipmentId: string;
  equipmentName: string;
  maintenanceDate: string;
  technician: string;
  type: 'Định kỳ' | 'Đột xuất' | 'Hiệu chuẩn' | 'Nâng cấp';
  details: string;
  replacedParts: string;
  cost: number;
  nextCalibrationDate?: string;
  status: 'Thành công' | 'Chờ phê duyệt' | 'Tạm dừng';
}

export interface EquipmentIncident {
  id: string;
  equipmentId: string;
  equipmentName: string;
  incidentDate: string;
  reportedBy: string;
  severity: 'Critical' | 'Warning' | 'Minor';
  downtimeMinutes: number;
  description: string;
  status: 'Pending' | 'Repairing' | 'Resolved';
  resolvedDate?: string;
  rootCause?: string;
  repairAction?: string;
  technician?: string;
  repairCost?: number;
}

export interface SupplierProductionAudit {
  id: string; // SPA-001, SPA-002, etc.
  supplierName: string; // Tên nhà cung cấp
  componentName: string; // Tên linh kiện kích hoạt giám sát
  requestDate: string; // Ngày gửi yêu cầu
  targetSpecification: string; // Chỉ tiêu / Thông số kỹ thuật yêu cầu
  actualValueStr?: string; // Giá trị đo lường thực tế gửi về
  requirementType: 'image_only' | 'spec_only' | 'both'; // Loại yêu cầu: Chỉ ảnh, Chỉ thông số, Cả hai
  status: 'pending' | 'updated' | 'approved' | 'rejected'; // Trạng thái: Chờ phản hồi, Nhà NCC cập nhật, Đạt yêu cầu, Sai lệch kỹ thuật (cảnh báo)
  supplierNote?: string; // Ghi chú từ nhà cung cấp
  dkNote?: string; // Nhận xét từ DKBike QC
  imageUrl?: string; // Ảnh xác nhận từ nhà cung cấp
  checkedBy: string; // Người chủ động kiểm tra
  dailyLogStt?: number;
  dailyLogTitle?: string;
}

// ==========================================
// 15. IMPROVEMENT ACTIONS TABLE (Hành động cải tiến ECO)
// ==========================================
export interface ImprovementAction {
  id: string;          // Định dạng mã hành động: ACT-XXXX (Ví dụ: ACT-5001)
  defectId: string;    // Liên kết tới ID của bản ghi Đề xuất cải tiến (DEF-XXXX)
  model: string;       // Dòng xe DKBike liên quan
  content: string;     // Nội dung hành động cải tiến
  assignee: string;    // Kỹ sư chịu trách nhiệm thực hiện (PIC)
  targetDate: string;  // Hạn hoàn thành cam kết
  status: 'Chưa thực hiện' | 'Đang thực hiện' | 'Đã hoàn thành';
  ecoResult: string;   // Kết quả ECO (Ví dụ: Đổi thiết kế bản vẽ phanh, thay mã linh kiện...)
  applyDate?: string;  // Ngày áp dụng ECO thực tế
  supplierName?: string; // NCC liên quan
  cooperator?: string; // Người phối hợp
  linkedContent?: string; // Nội dung được link từ Phản ánh/Đề xuất
}

// ==========================================
// 16. CHAT NOTES TABLE (Ghi chú trao đổi & Thảo luận chất lượng)
// ==========================================
export interface ChatNoteMessage {
  id: string;
  text: string;
  senderName: string;
  senderEmail: string;
  senderPhoto?: string;
  timestamp: number; // Unix timestamp
  isPinned: boolean;
  pinnedBy?: string;
  fileUrl?: string; // base64 string for file/image
  fileName?: string;
  fileSize?: string;
  fileType?: 'image' | 'file';
}



