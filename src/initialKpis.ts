export interface KpiPeriodOverride {
  actual?: string;
  target?: string;
  status?: 'Đạt' | 'Không đạt' | 'Đang cải tiến' | 'Theo dõi' | 'Chờ dữ liệu';
  note?: string;
  scorePercent?: number; // 0..100
  updatedAt?: string;
}

export interface DetailedKPI {
  id: string;
  category:
  | 'Sản lượng'
  | 'Nhân sự'
  | 'Chi phí bộ phận'
  | '6S, Cải tiến'
  | 'Báo cáo kế hoạch'
  | 'Chất lượng NCC'
  | 'IQC - Chất lượng đầu vào'
  | 'PQC - Chất lượng quá trình'
  | 'OQC - Chất lượng đầu ra'
  | 'Hệ thống & Hồ sơ';
  type: 'Mục tiêu hoạt động chung' | 'Mục tiêu hoạt động chuyên môn';
  groupWeight: number; // Trọng số nhóm (ví dụ 15%, 10%, 25%...)
  weight?: number;     // Trọng số riêng của chỉ tiêu (tổng 16 chỉ tiêu = 100%)
  indicator: string;   // Tên chỉ tiêu
  definition: string;  // Định nghĩa & phương pháp đo
  unit: string;        // Đơn vị tính
  target: string;      // Mục tiêu hiển thị
  targetValue?: number;// Ngưỡng số học chuẩn để so sánh tự động
  direction?: 'higher_is_better' | 'lower_is_better';
  sourceType?: 'auto' | 'manual' | 'hybrid';
  autoMetricKey?: string;
  actual: string;      // Giá trị mặc định / nhập tay
  status: 'Đạt' | 'Không đạt' | 'Đang cải tiến' | 'Theo dõi' | 'Chờ dữ liệu';
  details?: string;    // Ghi chú / dẫn chứng
  month?: number;
  year?: number;
  periodOverrides?: Record<string, KpiPeriodOverride>;
}

export interface StaffRoleMetricTemplate {
  id: string;
  name: string;
  bmReference: string;
  weight: number; // Tổng nhóm Nghiệp vụ = 50
  unit: string;
  target: string;
  targetValue: number;
  direction: 'higher_is_better' | 'lower_is_better';
  autoMetricKey: string;
}

export interface StaffBmKpiProfile {
  staffName: string;
  aliases: string[];
  roleTitle: string;
  bmDocCode: string;
  mtcvCode: string;
  summary: string;
  metrics: StaffRoleMetricTemplate[];
}

export interface StaffKpiPeriodEvaluation {
  staffKey: string;
  periodKey: string;
  // Tùy chỉnh kết quả hoặc ghi đè điểm cho các chỉ tiêu Nghiệp vụ (50%)
  metricOverrides?: Record<
    string,
    {
      actualText?: string;
      targetText?: string;
      scorePercent?: number; // 0..100% của trọng số chỉ tiêu đó
      weight?: number;
      name?: string;
      note?: string;
    }
  >;
  // Thêm chỉ tiêu nghiệp vụ tùy chỉnh riêng nếu Trưởng phòng bổ sung
  customMetrics?: Array<{
    id: string;
    name: string;
    bmReference?: string;
    weight: number;
    targetText: string;
    actualText: string;
    scorePercent: number; // 0..100
  }>;
  // Nhóm 3: Trưởng phòng đánh giá (20 điểm = 10đ thái độ/phối hợp + 10đ cải tiến/5S/kỷ luật)
  managerResponsibilityScore: number; // 0..10
  managerInitiativeScore: number;     // 0..10
  managerComment: string;
  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_DETAILED_KPIS: DetailedKPI[] = [
  // =========================================================================
  // I. MỤC TIÊU HOẠT ĐỘNG CHUNG (TỔNG TRỌNG SỐ: 35%)
  // =========================================================================

  // 1. Chi phí & COPQ (15%)
  {
    id: 'KPI-COM-01',
    category: 'Chi phí bộ phận',
    type: 'Mục tiêu hoạt động chung',
    groupWeight: 15,
    weight: 8,
    indicator: 'Kiểm soát tổng Chi phí kém chất lượng (COPQ) phát sinh trong kỳ',
    definition: 'Tổng chi phí lỗi chất lượng nội bộ, ngoại vi và bồi hoàn phát sinh từ phân hệ COPQ trong kỳ so với định mức cho phép.',
    unit: 'VNĐ',
    target: '<= 20.000.000',
    targetValue: 20000000,
    direction: 'lower_is_better',
    sourceType: 'auto',
    autoMetricKey: 'COPQ_TOTAL',
    actual: '0',
    status: 'Đạt',
    details: 'Tự động tổng hợp từ dữ liệu Chi phí chất lượng (dk_copqs) trong kỳ đánh giá.'
  },
  {
    id: 'KPI-COM-02',
    category: 'Chi phí bộ phận',
    type: 'Mục tiêu hoạt động chung',
    groupWeight: 15,
    weight: 4,
    indicator: 'Tỷ lệ xử lý & đóng hồ sơ tổn thất chất lượng / bồi hoàn NCC',
    definition: 'Số hồ sơ COPQ đã xử lý dứt điểm, quy trách nhiệm hoặc thu hồi bồi hoàn trên tổng số hồ sơ COPQ phát sinh trong kỳ.',
    unit: '%',
    target: '>= 90%',
    targetValue: 90,
    direction: 'higher_is_better',
    sourceType: 'auto',
    autoMetricKey: 'COPQ_CLOSED_RATE',
    actual: '100%',
    status: 'Đạt',
    details: 'Tự động tính tỷ lệ hồ sơ COPQ có trạng thái Đã xử lý / Đóng trong kỳ.'
  },
  {
    id: 'KPI-COM-03',
    category: 'Chi phí bộ phận',
    type: 'Mục tiêu hoạt động chung',
    groupWeight: 15,
    weight: 3,
    indicator: 'Tuân thủ ngân sách vận hành & định mức VPP / vật tư tiêu hao bộ phận',
    definition: 'Tỷ lệ sử dụng chi phí hành chính, văn phòng phẩm, vật tư kiểm nghiệm của Phòng QLCL so với kế hoạch ngân sách được duyệt.',
    unit: '%',
    target: '<= 100%',
    targetValue: 100,
    direction: 'lower_is_better',
    sourceType: 'manual',
    actual: '95%',
    status: 'Đạt',
    details: 'Trưởng phòng nhập kết quả kiểm soát ngân sách hành chính bộ phận theo kỳ.'
  },

  // 2. Hệ thống & Kế hoạch (10%)
  {
    id: 'KPI-COM-04',
    category: 'Báo cáo kế hoạch',
    type: 'Mục tiêu hoạt động chung',
    groupWeight: 10,
    weight: 5,
    indicator: 'Tỷ lệ hoàn thành Kế hoạch chất lượng Tuần / Tháng đúng hạn',
    definition: 'Tỷ lệ các hạng mục công việc trong phân hệ Lập kế hoạch chất lượng (Tuần / Tháng) thuộc kỳ đánh giá đạt trạng thái Hoàn thành.',
    unit: '%',
    target: '>= 90%',
    targetValue: 90,
    direction: 'higher_is_better',
    sourceType: 'auto',
    autoMetricKey: 'PLAN_COMPLETION_RATE',
    actual: '95%',
    status: 'Đạt',
    details: 'Tự động đối soát từ dữ liệu Kế hoạch chất lượng Tuần/Tháng đã đồng bộ.'
  },
  {
    id: 'KPI-COM-05',
    category: 'Hệ thống & Hồ sơ',
    type: 'Mục tiêu hoạt động chung',
    groupWeight: 10,
    weight: 5,
    indicator: 'Duy trì hệ thống biểu mẫu QMS (/bm), ISO 9001 & báo cáo định kỳ đúng hạn',
    definition: 'Duy trì nhật trình báo cáo chất lượng hàng ngày và cập nhật đầy đủ hệ thống tài liệu, biểu mẫu chuẩn hóa trong /bm.',
    unit: '%',
    target: '>= 95%',
    targetValue: 95,
    direction: 'higher_is_better',
    sourceType: 'hybrid',
    autoMetricKey: 'DAILY_REPORT_DAYS_RATE',
    actual: '100%',
    status: 'Đạt',
    details: 'Tự động theo dõi tần suất ghi nhận Nhật trình ngày kết hợp đánh giá duy trì hồ sơ ISO/QMS.'
  },

  // 3. Nhân sự & Kỷ luật (10%)
  {
    id: 'KPI-COM-06',
    category: 'Nhân sự',
    type: 'Mục tiêu hoạt động chung',
    groupWeight: 10,
    weight: 5,
    indicator: 'Tỷ lệ hoàn thành nhiệm vụ & báo cáo ngày của đội ngũ nhân sự QLCL',
    definition: 'Tỷ lệ tác vụ được giao trong Nhật trình báo cáo chất lượng hàng ngày của toàn phòng đạt trạng thái Hoàn thành trong kỳ.',
    unit: '%',
    target: '>= 90%',
    targetValue: 90,
    direction: 'higher_is_better',
    sourceType: 'auto',
    autoMetricKey: 'DAILY_TASK_COMPLETION_RATE',
    actual: '92%',
    status: 'Đạt',
    details: 'Tự động tổng hợp từ toàn bộ bản ghi Nhật trình công việc hàng ngày (dk_daily_logs) trong kỳ.'
  },
  {
    id: 'KPI-COM-07',
    category: '6S, Cải tiến',
    type: 'Mục tiêu hoạt động chung',
    groupWeight: 10,
    weight: 5,
    indicator: 'Đào tạo nội bộ, hướng dẫn nghiệp vụ QC & tuân thủ 5S / Nội quy / ATLĐ',
    definition: 'Thực hiện đào tạo kỹ năng kiểm tra cho nhân viên QC, duy trì 5S khu vực đo kiểm/văn phòng và không có vi phạm kỷ luật.',
    unit: '%',
    target: '100%',
    targetValue: 100,
    direction: 'higher_is_better',
    sourceType: 'manual',
    actual: '100%',
    status: 'Đạt',
    details: 'Trưởng phòng chấm điểm thực hiện 5S, kỷ luật lao động và đào tạo nội bộ trong kỳ.'
  },

  // =========================================================================
  // II. MỤC TIÊU HOẠT ĐỘNG CHUYÊN MÔN (TỔNG TRỌNG SỐ: 65%)
  // =========================================================================

  // 1. Chất lượng NCC & IQC (15%)
  {
    id: 'KPI-PRO-01',
    category: 'Chất lượng NCC',
    type: 'Mục tiêu hoạt động chuyên môn',
    groupWeight: 15,
    weight: 5,
    indicator: 'Tỷ lệ đánh giá năng lực NCC & kiểm soát xử lý lỗi SQC theo kế hoạch',
    definition: 'Tỷ lệ Nhà cung cấp được đánh giá định kỳ và các vụ việc chất lượng linh kiện NCC (SQC) được lập hồ sơ xử lý trong kỳ.',
    unit: '%',
    target: '>= 90%',
    targetValue: 90,
    direction: 'higher_is_better',
    sourceType: 'auto',
    autoMetricKey: 'SQC_SUPPLIER_EVAL_RATE',
    actual: '95%',
    status: 'Đạt',
    details: 'Tự động tính từ danh mục Nhà cung cấp (dk_suppliers) & hồ sơ SQC (dk_supplier_production_audits).'
  },
  {
    id: 'KPI-PRO-02',
    category: 'IQC - Chất lượng đầu vào',
    type: 'Mục tiêu hoạt động chuyên môn',
    groupWeight: 15,
    weight: 6,
    indicator: 'Kiểm soát nghiệm thu vật tư đầu vào (IQC) & tỷ lệ linh kiện đạt chuẩn',
    definition: 'Tỷ lệ linh kiện vật tư đầu vào qua kiểm tra IQC (BM-QC-01/02) đạt yêu cầu kỹ thuật và được kiểm soát chặt trước khi nhập kho.',
    unit: '%',
    target: '>= 95%',
    targetValue: 95,
    direction: 'higher_is_better',
    sourceType: 'auto',
    autoMetricKey: 'IQC_PASS_RATE',
    actual: '96.5%',
    status: 'Đạt',
    details: 'Tự động tính từ sổ nhật ký kiểm tra đầu vào IQC (dk_iqc_records) trong kỳ.'
  },
  {
    id: 'KPI-PRO-03',
    category: 'IQC - Chất lượng đầu vào',
    type: 'Mục tiêu hoạt động chuyên môn',
    groupWeight: 15,
    weight: 4,
    indicator: 'Tỷ lệ thẩm định linh kiện mới / PTSP hoàn thành đúng tiến độ (BM-KTTD-01)',
    definition: 'Tỷ lệ phiếu thẩm định kỹ thuật linh kiện (dk_part_evaluations) và các vấn đề PTSP phát sinh trong kỳ được kết luận & xử lý.',
    unit: '%',
    target: '>= 95%',
    targetValue: 95,
    direction: 'higher_is_better',
    sourceType: 'auto',
    autoMetricKey: 'PART_EVAL_PTSP_RATE',
    actual: '100%',
    status: 'Đạt',
    details: 'Tự động tính từ dữ liệu Thẩm định linh kiện (dk_part_evaluations) và Phát triển sản phẩm (dk_ptsp_models).'
  },

  // 2. Kiểm soát Sản xuất PQC & OQC (25%)
  {
    id: 'KPI-PRO-04',
    category: 'PQC - Chất lượng quá trình',
    type: 'Mục tiêu hoạt động chuyên môn',
    groupWeight: 25,
    weight: 8,
    indicator: 'Tỷ lệ đạt chất lượng bán thành phẩm công đoạn lắp ráp (PQC)',
    definition: 'Tỷ lệ sản lượng bán thành phẩm kiểm tra trên chuyền lắp ráp (BM-QC-03/04) đạt chuẩn kỹ thuật ngay tại công đoạn.',
    unit: '%',
    target: '>= 98%',
    targetValue: 98,
    direction: 'higher_is_better',
    sourceType: 'auto',
    autoMetricKey: 'PQC_PASS_RATE',
    actual: '98.5%',
    status: 'Đạt',
    details: 'Tự động tính từ dữ liệu kiểm tra công đoạn PQC (dk_pqc_records) trong kỳ.'
  },
  {
    id: 'KPI-PRO-05',
    category: 'OQC - Chất lượng đầu ra',
    type: 'Mục tiêu hoạt động chuyên môn',
    groupWeight: 25,
    weight: 10,
    indicator: 'Tỷ lệ xe thành phẩm đạt chuẩn xuất xưởng ngay lần đầu (FPY - OQC/KCS)',
    definition: 'Tỷ lệ xe hoàn thiện qua kiểm tra KCS cuối chuyền & chạy thử đường trường (BM-QC-05/06) đạt chuẩn xuất xưởng ngay lần đầu.',
    unit: '%',
    target: '>= 98%',
    targetValue: 98,
    direction: 'higher_is_better',
    sourceType: 'auto',
    autoMetricKey: 'OQC_FPY_RATE',
    actual: '99.1%',
    status: 'Đạt',
    details: 'Tự động tính từ dữ liệu nghiệm thu thành phẩm OQC (dk_oqc_records) trong kỳ.'
  },
  {
    id: 'KPI-PRO-06',
    category: 'PQC - Chất lượng quá trình',
    type: 'Mục tiêu hoạt động chuyên môn',
    groupWeight: 25,
    weight: 7,
    indicator: 'Tỷ lệ xử lý lỗi nội bộ & đóng hồ sơ hành động khắc phục CAPA đúng hạn',
    definition: 'Tỷ lệ hồ sơ CAPA (CAR/PAR - 8D) trong kỳ được điều tra nguyên nhân gốc rễ và đóng hồ sơ đúng thời hạn cam kết.',
    unit: '%',
    target: '>= 90%',
    targetValue: 90,
    direction: 'higher_is_better',
    sourceType: 'auto',
    autoMetricKey: 'CAPA_CLOSURE_RATE',
    actual: '95%',
    status: 'Đạt',
    details: 'Tự động tính từ danh sách hồ sơ CAPA (dk_capas) trong kỳ.'
  },

  // 3. Chất lượng Thị trường & Bảo hành (15%)
  {
    id: 'KPI-PRO-07',
    category: 'OQC - Chất lượng đầu ra',
    type: 'Mục tiêu hoạt động chuyên môn',
    groupWeight: 15,
    weight: 10,
    indicator: 'Kiểm soát tỷ lệ lỗi chất lượng thị trường / khiếu nại đại lý',
    definition: 'Tỷ lệ số xe/vụ việc lỗi thị trường & bảo hành phát sinh trong kỳ so với tổng sản lượng xe xuất xưởng OQC.',
    unit: '%',
    target: '<= 1.0%',
    targetValue: 1.0,
    direction: 'lower_is_better',
    sourceType: 'auto',
    autoMetricKey: 'MARKET_DEFECT_RATE',
    actual: '0.35%',
    status: 'Đạt',
    details: 'Tự động đối chiếu số lượng lỗi thị trường (dk_defects) trên tổng sản lượng xe kiểm OQC trong kỳ.'
  },
  {
    id: 'KPI-PRO-08',
    category: 'OQC - Chất lượng đầu ra',
    type: 'Mục tiêu hoạt động chuyên môn',
    groupWeight: 15,
    weight: 5,
    indicator: 'Tỷ lệ xử lý dứt điểm phản hồi chất lượng thị trường & giám định bảo hành',
    definition: 'Tỷ lệ các vụ việc khiếu nại chất lượng đại lý / lỗi bảo hành trong kỳ đã được giám định kỹ thuật và phản hồi phương án xử lý.',
    unit: '%',
    target: '>= 95%',
    targetValue: 95,
    direction: 'higher_is_better',
    sourceType: 'auto',
    autoMetricKey: 'MARKET_DEFECT_RESOLVED_RATE',
    actual: '96%',
    status: 'Đạt',
    details: 'Tự động tính từ trạng thái xử lý của các bản ghi lỗi thị trường (dk_defects) trong kỳ.'
  },

  // 4. Thiết bị Đo lường & CCDC (10%)
  {
    id: 'KPI-PRO-09',
    category: 'Hệ thống & Hồ sơ',
    type: 'Mục tiêu hoạt động chuyên môn',
    groupWeight: 10,
    weight: 10,
    indicator: 'Tỷ lệ thiết bị đo lường, kiểm nghiệm được hiệu chuẩn & bảo trì đúng hạn (BM-KTTD-02)',
    definition: 'Tỷ lệ trang thiết bị đo lường, dưỡng kiểm của Phòng QLCL ở trạng thái hoạt động tốt và còn hạn hiệu chuẩn hợp lệ.',
    unit: '%',
    target: '100%',
    targetValue: 100,
    direction: 'higher_is_better',
    sourceType: 'auto',
    autoMetricKey: 'EQUIPMENT_CALIBRATION_RATE',
    actual: '100%',
    status: 'Đạt',
    details: 'Tự động kiểm tra trạng thái & hạn hiệu chuẩn từ danh mục Thiết bị đo kiểm (dk_equipments).'
  }
];

// ============================================================================
// HỒ SƠ CHỈ TIÊU KPI NGHIỆP VỤ CÁ NHÂN BÁM SÁT 8 BẢN GIAO NHIỆM VỤ & MA TRẬN ĐỐI SOÁT (/bm)
// ============================================================================
export const STAFF_BM_KPI_PROFILES: StaffBmKpiProfile[] = [
  {
    staffName: 'Nguyễn Xuân Thao',
    aliases: ['nguyễn xuân thao', 'nguyen xuan thao'],
    roleTitle: 'Trưởng Phòng Quản Lý Chất Lượng',
    bmDocCode: 'BG-NV-01',
    mtcvCode: 'CN-QLCL-01..03 / CN-QAQE-01',
    summary: 'Tổ chức quản lý, điều hành toàn bộ hệ thống kiểm soát chất lượng Công ty; trực tiếp định hướng chuyên môn Bộ phận QA/QE & KTV Tư vấn kỹ thuật; thẩm định phê duyệt SOP, CAR/PAR, quản lý chất lượng Nhà cung cấp (SQE), chủ trì Internal Audit và ra quyết định Stop-line.',
    metrics: [
      {
        id: 'BM-TP-01',
        name: 'Quản trị toàn diện P.QLCL, phê duyệt ban hành SOP/Tiêu chuẩn, chủ trì Internal Audit & hoàn thành KPI Phòng',
        bmReference: 'BG-NV-01 [NV-QA-01, NV-QA-02, NV-QLCL-01 | SOP: QT-QLCL-01, QT-QA-01]',
        weight: 20,
        unit: '%',
        target: '>= 90%',
        targetValue: 90,
        direction: 'higher_is_better',
        autoMetricKey: 'DEPT_OVERALL_KPI'
      },
      {
        id: 'BM-TP-02',
        name: 'Phê duyệt phương án khắc phục/phòng ngừa lỗi (CAR/PAR) & đánh giá hiệu quả cải tiến thực tế',
        bmReference: 'BG-NV-01 [NV-QLCL-05, NV-QA-06 | SOP: QT-QLCL-03, QT-QA-02]',
        weight: 15,
        unit: '%',
        target: '>= 90%',
        targetValue: 90,
        direction: 'higher_is_better',
        autoMetricKey: 'CAPA_CLOSURE_RATE'
      },
      {
        id: 'BM-TP-03',
        name: 'Quản lý chất lượng Nhà cung cấp (SQE): Đàm phán, chốt tiêu chuẩn kỹ thuật & phán quyết năng lực NCC',
        bmReference: 'BG-NV-01 [NV-QA-03, NV-QA-04, NV-QA-07 | SOP: QT-QA-01, QT-QA-02]',
        weight: 15,
        unit: '%',
        target: '>= 90%',
        targetValue: 90,
        direction: 'higher_is_better',
        autoMetricKey: 'SQC_SUPPLIER_EVAL_RATE'
      }
    ]
  },
  {
    staffName: 'Trần Thế Quảng',
    aliases: ['trần thế quảng', 'trần thế quang', 'tran the quang'],
    roleTitle: 'Chuyên Viên Đảm Bảo Chất Lượng (QA) — Định Hướng Trợ Lý Trưởng Phòng QLCL',
    bmDocCode: 'BG-NV-02',
    mtcvCode: 'CN-QAQE-01 / CN-QAQE-02',
    summary: 'Hỗ trợ trực tiếp Trưởng phòng QLCL: Dự thảo, định dạng và lưu trữ quy trình SOP/biểu mẫu; tổng hợp dữ liệu lỗi từ QC & KTV Tư vấn để dự thảo lệnh CAR/PAR và đôn đốc khắc phục; lập Bảng chấm điểm năng lực Nhà cung cấp định kỳ và chuẩn bị hồ sơ Internal Audit / Đào tạo.',
    metrics: [
      {
        id: 'BM-QA-Q01',
        name: 'Tổng hợp dữ liệu lỗi, thiết lập dự thảo Lệnh khắc phục/phòng ngừa (CAR/PAR) & đôn đốc NCC/Xưởng đúng hạn',
        bmReference: 'BG-NV-02 [NV-QA-05, NV-QA-06, NV-QA-07 | SOP: QT-QA-02]',
        weight: 20,
        unit: '%',
        target: '>= 90%',
        targetValue: 90,
        direction: 'higher_is_better',
        autoMetricKey: 'CAPA_CLOSURE_RATE'
      },
      {
        id: 'BM-QA-Q02',
        name: 'Tổng hợp hồ sơ, dữ liệu giao hàng & chất lượng linh kiện lập Bảng chấm điểm năng lực Nhà cung cấp định kỳ',
        bmReference: 'BG-NV-02 [NV-QA-03, NV-QA-04 | SOP: QT-QA-01]',
        weight: 15,
        unit: '%',
        target: '>= 90%',
        targetValue: 90,
        direction: 'higher_is_better',
        autoMetricKey: 'SQC_SUPPLIER_EVAL_RATE'
      },
      {
        id: 'BM-QA-Q03',
        name: 'Soạn thảo, kiểm soát lưu hành SOP/biểu mẫu; chuẩn bị tài liệu Đánh giá nội bộ (Internal Audit) & Đào tạo chất lượng',
        bmReference: 'BG-NV-02 [NV-QA-01, NV-QA-02, NV-QA-08 | SOP: QT-QA-01]',
        weight: 15,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'QA_SOP_AUDIT_TRAINING'
      }
    ]
  },
  {
    staffName: 'Nguyễn Văn Diệm',
    aliases: ['nguyễn văn diệm', 'nguyễn văn điểm', 'nguyen van diem', 'diệm', 'điểm'],
    roleTitle: 'Kỹ Thuật Viên Tư Vấn Kỹ Thuật (Bộ Phận Kỹ Thuật Thẩm Định)',
    bmDocCode: 'BG-NV-03',
    mtcvCode: 'CN-KTTĐ-01 / CN-KTTĐ-02',
    summary: 'Cầu nối chuyên môn giữa nhà máy và thị trường: Tư vấn, hướng dẫn kỹ thuật từ xa cho hệ thống đại lý; tiếp nhận, giám định và trực tiếp sửa chữa/phục hồi xe, linh kiện lỗi bảo hành quay đầu; tổng hợp dữ liệu lỗi thị trường chuyển giao cho QA/QE phân tích cải tiến và phối hợp R&D chạy thử xe mẫu.',
    metrics: [
      {
        id: 'BM-KTTD-D01',
        name: 'Tư vấn kỹ thuật từ xa cho đại lý; tiếp nhận, giám định & trực tiếp sửa chữa/phục hồi xe, linh kiện lỗi bảo hành quay đầu',
        bmReference: 'BG-NV-03 [NV-KTTĐ-01, NV-KTTĐ-02, NV-KTTĐ-05, NV-KTTĐ-06 | SOP: QT-KTTD-01]',
        weight: 20,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'PART_EVAL_BM_KTTD_01'
      },
      {
        id: 'BM-KTTD-D02',
        name: 'Tổng hợp dữ liệu phản ánh thị trường chuyển giao cho QA phân tích lỗi & phối hợp QE đề xuất nâng cấp linh kiện',
        bmReference: 'BG-NV-03 [NV-KTTĐ-03, Phối hợp NV-QA-05, NV-QA-06 | SOP: QT-QA-02]',
        weight: 15,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'MARKET_DEFECT_RESOLVED_RATE'
      },
      {
        id: 'BM-KTTD-D03',
        name: 'Tham gia cùng bộ phận R&D chạy thử nghiệm (đường trường, tải trọng, tính năng) & đánh giá chất lượng xe mẫu mới',
        bmReference: 'BG-NV-03 [Phối hợp NV-RD-04]',
        weight: 15,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'PTSP_SAMPLE_AND_ROAD_TEST'
      }
    ]
  },
  {
    staffName: 'Hoàng Văn Phấn',
    aliases: ['hoàng văn phấn', 'hoàng văn phan', 'hoang van phan', 'phấn', 'phan'],
    roleTitle: 'Nhân Viên Kiểm Soát Chất Lượng (IQC & IPQC)',
    bmDocCode: 'BG-NV-04',
    mtcvCode: 'CN-QC-01 / CN-QC-02',
    summary: 'Trực tiếp thực thi đo lường, kiểm tra ngoại quan & tính năng vật tư đầu vào (IQC), dán tem nhận diện và lập biên bản/check-sheet; tuần tra giám sát chất lượng các trạm trên dây chuyền lắp ráp (IPQC); tham gia sửa chữa linh kiện lỗi, tinh chỉnh xe lỗi nặng và hỗ trợ lắp ráp xe mẫu R&D / Đăng kiểm.',
    metrics: [
      {
        id: 'BM-QC-P01',
        name: 'Trực tiếp đo lường, kiểm tra linh kiện vật tư đầu vào (IQC), dán tem trạng thái & lập biên bản/check-sheet kiểm tra',
        bmReference: 'BG-NV-04 [NV-QC-01, NV-QC-06 | SOP: QT-QC-01, QT-QC-02]',
        weight: 20,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'IQC_PASS_RATE'
      },
      {
        id: 'BM-QC-P02',
        name: 'Tuần tra, giám sát chất lượng tại các trạm trên dây chuyền lắp ráp (IPQC), ghi nhật ký & báo cáo kịp thời sai lệch',
        bmReference: 'BG-NV-04 [NV-QC-04 | SOP: QT-QC-01]',
        weight: 15,
        unit: '%',
        target: '>= 98%',
        targetValue: 98,
        direction: 'higher_is_better',
        autoMetricKey: 'PQC_PASS_RATE'
      },
      {
        id: 'BM-QC-P03',
        name: 'Tham gia sửa chữa linh kiện lỗi, tinh chỉnh xe lỗi nặng; hỗ trợ lắp ráp xe mẫu R&D & hỗ trợ kiểm tra xe tại Cục Đăng kiểm',
        bmReference: 'BG-NV-04 [NV-KTTĐ-05, Phối hợp NV-RD-03, NV-ĐK-01]',
        weight: 15,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'PTSP_SAMPLE_AND_ROAD_TEST'
      }
    ]
  },
  {
    staffName: 'Hà Khắc Việt',
    aliases: ['hà khắc việt', 'ha khac viet', 'việt'],
    roleTitle: 'Tổ Trưởng Kiểm Soát Chất Lượng (Tổ Trưởng QC)',
    bmDocCode: 'BG-NV-05',
    mtcvCode: 'CN-QC-01 / CN-QC-02 / CN-QLCL-01',
    summary: 'Tổ chức, quản lý trực tiếp hoạt động kiểm soát chất lượng hiện trường của đội ngũ QC; trực tiếp thực thi IQC & tuần tra IPQC; kiểm tra xác suất (Cross-check) xe thành phẩm sau OQC và chạy thử nội bộ; chủ trì Hội đồng đánh giá vật tư hỏng (MRB); hỗ trợ kỹ thuật bậc cao cho R&D, Đăng kiểm và tham gia đánh giá NCC.',
    metrics: [
      {
        id: 'BM-QC-V01',
        name: 'Quản lý đội ngũ QC hiện trường; trực tiếp thực thi kiểm tra IQC, tuần tra dây chuyền IPQC & chủ trì Hội đồng MRB',
        bmReference: 'BG-NV-05 [NV-QC-01, NV-QC-02, NV-QC-04 | SOP: QT-QC-01, QT-LPB-03]',
        weight: 20,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'IQC_PASS_RATE'
      },
      {
        id: 'BM-QC-V02',
        name: 'Kiểm tra xác suất (Cross-check) xe thành phẩm sau OQC & chạy thử nội bộ trước khi xuất xưởng (chốt chặn kỹ thuật cuối)',
        bmReference: 'BG-NV-05 [NV-QC-05 | SOP: QT-QC-02]',
        weight: 15,
        unit: '%',
        target: '>= 98%',
        targetValue: 98,
        direction: 'higher_is_better',
        autoMetricKey: 'OQC_FPY_RATE'
      },
      {
        id: 'BM-QC-V03',
        name: 'Gia công linh kiện mẫu, lắp ráp & chạy thử xe mẫu R&D; hỗ trợ Đăng kiểm tại Cục Đăng kiểm & tham gia đánh giá NCC',
        bmReference: 'BG-NV-05 [NV-KTTĐ-05, NV-RD-03, 04, 06, NV-ĐK-01, NV-QA-03]',
        weight: 15,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'PTSP_SAMPLE_AND_ROAD_TEST'
      }
    ]
  },
  {
    staffName: 'Lành Xuân Hải',
    aliases: ['lành xuân hải', 'lãnh xuân hải', 'lanh xuan hai', 'hải'],
    roleTitle: 'Nhân Viên Kiểm Soát Xuất Xưởng (Nhân Viên OQC - KCS)',
    bmDocCode: 'BG-NV-06',
    mtcvCode: 'CN-QC-01 / CN-QC-02',
    summary: 'Cửa ngõ nối giữa Xưởng lắp ráp và Kho thành phẩm: Trực tiếp kiểm tra ngoại quan, chức năng xe sau lắp ráp (OQC) và lập phiếu báo lỗi; số hóa thống kê nhập dữ liệu lỗi OQC lên phần mềm hệ thống; quét mã (Scan Barcode/QR) xe Đạt (PASS) bàn giao nhập Kho thành phẩm và phối hợp Điều vận ưu tiên đơn hàng gấp.',
    metrics: [
      {
        id: 'BM-OQC-H01',
        name: 'Trực tiếp kiểm tra ngoại quan, chức năng xe sau lắp ráp (OQC); ghi chú chính xác phiếu báo lỗi & chuyển sửa chữa',
        bmReference: 'BG-NV-06 [NV-QC-05, NV-QC-06 | SOP: QT-QC-02]',
        weight: 20,
        unit: '%',
        target: '>= 98%',
        targetValue: 98,
        direction: 'higher_is_better',
        autoMetricKey: 'OQC_FPY_RATE'
      },
      {
        id: 'BM-OQC-H02',
        name: 'Số hóa dữ liệu chất lượng: Thống kê, ghi chép & trực tiếp nhập số liệu lỗi OQC lên phần mềm quản lý kịp thời, trung thực',
        bmReference: 'BG-NV-06 [NV-QC-07 | SOP: QT-LPB-03]',
        weight: 15,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'OQC_DIGITIZATION_RATE'
      },
      {
        id: 'BM-OQC-H03',
        name: 'Quét mã (Scan Barcode/QR) xe Đạt (PASS) bàn giao Kho thành phẩm chuẩn xác 100% & chạy thử đường trường nội bộ',
        bmReference: 'BG-NV-06 [NV-QC-07 / Nghiệp vụ Bàn giao Kho]',
        weight: 15,
        unit: '%',
        target: '>= 98%',
        targetValue: 98,
        direction: 'higher_is_better',
        autoMetricKey: 'OQC_HANDOVER_SCAN_RATE'
      }
    ]
  },
  {
    staffName: 'Liễu Tùng Lâm',
    aliases: ['liễu tùng lâm', 'lieu tung lam', 'lâm', 'tùng'],
    roleTitle: 'Trưởng Nhóm Nghiệm Thu Xuất Xưởng (Trưởng Nhóm OQC)',
    bmDocCode: 'BG-NV-07',
    mtcvCode: 'CN-QC-01 / CN-QC-02 / CN-QLCL-01',
    summary: 'Chốt kiểm soát và xác nhận chất lượng đầu ra cuối cùng trước khi xe đóng gói lưu kho: Trực tiếp kiểm tra, nghiệm thu 100% xe thành phẩm (ngoại quan, chức năng, hệ thống điện, chạy thử Dyno/đường trường); ghi phiếu báo lỗi, lưu hồ sơ truy xuất, cách ly xe lỗi; phản hồi cảnh báo trực tiếp cho dây chuyền lắp ráp và hỗ trợ kiểm soát phụ kiện đi kèm.',
    metrics: [
      {
        id: 'BM-OQC-L01',
        name: 'Trực tiếp kiểm tra, nghiệm thu 100% xe thành phẩm (ngoại quan, chức năng, điện) & chạy thử trên thiết bị Dyno / đường trường',
        bmReference: 'BG-NV-07 [NV-QC-05 | SOP: QT-QC-02]',
        weight: 20,
        unit: '%',
        target: '>= 98%',
        targetValue: 98,
        direction: 'higher_is_better',
        autoMetricKey: 'OQC_FPY_RATE'
      },
      {
        id: 'BM-OQC-L02',
        name: 'Ghi chép phiếu báo lỗi, lưu hồ sơ truy xuất từng xe, cách ly xe lỗi & chặn đứng không để xe lỗi lọt ra thị trường',
        bmReference: 'BG-NV-07 [NV-QC-06, NV-QC-07 | SOP: QT-QC-02, QT-LPB-03]',
        weight: 15,
        unit: '%',
        target: '>= 98%',
        targetValue: 98,
        direction: 'higher_is_better',
        autoMetricKey: 'OQC_TRACEABILITY_RATE'
      },
      {
        id: 'BM-OQC-L03',
        name: 'Phản hồi, cảnh báo lỗi trực tiếp cho công đoạn dây chuyền lắp ráp khắc phục tại chỗ & hỗ trợ kiểm soát phụ kiện theo xe',
        bmReference: 'BG-NV-07 [CN-QC-02 / Phản hồi dây chuyền lắp ráp]',
        weight: 15,
        unit: '%',
        target: '>= 98%',
        targetValue: 98,
        direction: 'higher_is_better',
        autoMetricKey: 'PQC_PASS_RATE'
      }
    ]
  },
  {
    staffName: 'Đoàn Anh Hùng',
    aliases: ['đoàn anh hùng', 'doan anh hung', 'hùng'],
    roleTitle: 'Nhân Viên Kỹ Thuật Chất Lượng',
    bmDocCode: 'BG-NV-08',
    mtcvCode: 'CN-KTTĐ-01 / CN-KTTĐ-02 / CN-QC-01',
    summary: 'Thực thi các nghiệp vụ kỹ thuật chuyên sâu: Phối hợp kiểm tra, giám định kỹ thuật xác định nguyên nhân gốc rễ xe lỗi bảo hành đại lý trả về; trực tiếp sửa chữa chuyên sâu, gia công linh kiện mẫu, chế tạo/sửa chữa đồ gá chuyên dụng; quản lý toàn bộ hệ thống CCDC & thiết bị đo lường Phòng QLCL; tham gia kiểm tra IQC và phối hợp Xưởng tinh chỉnh xe thành phẩm lỗi.',
    metrics: [
      {
        id: 'BM-KTTD-H01',
        name: 'Phối hợp kiểm tra, đánh giá & giám định kỹ thuật xác định nguyên nhân gốc rễ xe lỗi bảo hành đại lý trả về',
        bmReference: 'BG-NV-08 [NV-KTTĐ-02 | SOP: QT-KTTD-01]',
        weight: 20,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'PART_EVAL_BM_KTTD_01'
      },
      {
        id: 'BM-KTTD-H02',
        name: 'Trực tiếp quản lý, bảo quản CCDC & thiết bị đo lường Phòng QLCL; chế tạo/sửa chữa đồ gá & gia công linh kiện mẫu',
        bmReference: 'BG-NV-08 [NV-KTTĐ-04, NV-KTTĐ-05 | SOP: QT-KTTD-02]',
        weight: 15,
        unit: '%',
        target: '100%',
        targetValue: 100,
        direction: 'higher_is_better',
        autoMetricKey: 'EQUIPMENT_CALIBRATION_RATE'
      },
      {
        id: 'BM-KTTD-H03',
        name: 'Thực hiện kiểm tra đo lường linh kiện đầu vào (IQC) theo phân công & phối hợp Xưởng lắp ráp tinh chỉnh, sửa chữa xe lỗi',
        bmReference: 'BG-NV-08 [NV-QC-01 | SOP: QT-QC-01]',
        weight: 15,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'IQC_PASS_RATE'
      }
    ]
  }
];
