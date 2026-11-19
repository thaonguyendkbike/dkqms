export interface KpiPeriodOverride {
  actual?: string;
  target?: string;
  status?: 'Đạt' | 'Không đạt' | 'Đang cải tiến' | 'Theo dõi';
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
  status: 'Đạt' | 'Không đạt' | 'Đang cải tiến' | 'Theo dõi';
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
// HỒ SƠ CHỈ TIÊU KPI NGHIỆP VỤ CÁ NHÂN BÁM SÁT 8 BẢN GIAO NHIỆM VỤ & 5 MTCV (/bm)
// ============================================================================
export const STAFF_BM_KPI_PROFILES: StaffBmKpiProfile[] = [
  {
    staffName: 'Nguyễn Xuân Thao',
    aliases: ['nguyễn xuân thao', 'nguyen xuan thao'],
    roleTitle: 'Trưởng Phòng Quản Lý Chất Lượng',
    bmDocCode: 'BG-NV-01',
    mtcvCode: 'MTCV-TP (doc-mtcv-01)',
    summary: 'Chịu trách nhiệm toàn diện (Accountable) về hệ thống QMS ISO 9001, chất lượng xe xuất xưởng FPY, tỷ lệ lỗi thị trường và hiệu năng đội ngũ QLCL.',
    metrics: [
      {
        id: 'BM-TP-01',
        name: 'Tỷ lệ hoàn thành Bộ chỉ tiêu KPI toàn Phòng QLCL',
        bmReference: 'BG-NV-01 / MTCV-TP (Quản trị hệ thống QMS)',
        weight: 20,
        unit: '%',
        target: '>= 90%',
        targetValue: 90,
        direction: 'higher_is_better',
        autoMetricKey: 'DEPT_OVERALL_KPI'
      },
      {
        id: 'BM-TP-02',
        name: 'Tỷ lệ xe thành phẩm đạt chuẩn xuất xưởng ngay lần đầu (FPY - OQC/KCS)',
        bmReference: 'BG-NV-01 / MTCV-TP (Mục tiêu FPY >= 98%)',
        weight: 15,
        unit: '%',
        target: '>= 98%',
        targetValue: 98,
        direction: 'higher_is_better',
        autoMetricKey: 'OQC_FPY_RATE'
      },
      {
        id: 'BM-TP-03',
        name: 'Tỷ lệ đóng hồ sơ CAPA đúng hạn & kiểm soát lỗi thị trường (<= 1%)',
        bmReference: 'BG-NV-01 / MTCV-TP (Cải tiến 8D & Bảo hành)',
        weight: 15,
        unit: '%',
        target: '>= 90%',
        targetValue: 90,
        direction: 'higher_is_better',
        autoMetricKey: 'CAPA_CLOSURE_RATE'
      }
    ]
  },
  {
    staffName: 'Liễu Tùng Lâm',
    aliases: ['liễu tùng lâm', 'lieu tung lam'],
    roleTitle: 'Kỹ Sư Đảm Bảo Chất Lượng (QA / QE / SQE)',
    bmDocCode: 'BG-NV-07',
    mtcvCode: 'MTCV-QA (doc-mtcv-02)',
    summary: 'Đảm bảo chất lượng hệ thống, đánh giá định kỳ Nhà cung cấp (SQE), quản lý tiêu chuẩn kỹ thuật và theo dõi đóng hồ sơ cải tiến CAR/PAR (CAPA).',
    metrics: [
      {
        id: 'BM-QA-01',
        name: 'Đánh giá năng lực NCC định kỳ & kiểm soát xử lý lỗi SQC',
        bmReference: 'BG-NV-07 / MTCV-QA (Quản lý chất lượng NCC - SQE)',
        weight: 20,
        unit: '%',
        target: '>= 90%',
        targetValue: 90,
        direction: 'higher_is_better',
        autoMetricKey: 'SQC_SUPPLIER_EVAL_RATE'
      },
      {
        id: 'BM-QA-02',
        name: 'Tỷ lệ lập & theo dõi đóng hồ sơ cải tiến CAR/PAR (CAPA - 8D) đúng hạn',
        bmReference: 'BG-NV-07 / MTCV-QA (Quản lý CAPA & Cải tiến)',
        weight: 15,
        unit: '%',
        target: '>= 90%',
        targetValue: 90,
        direction: 'higher_is_better',
        autoMetricKey: 'CAPA_CLOSURE_RATE'
      },
      {
        id: 'BM-QA-03',
        name: 'Kiểm soát hồ sơ tổn thất COPQ & thu hồi bồi hoàn lỗi NCC',
        bmReference: 'BG-NV-07 / MTCV-QA (Kiểm soát COPQ)',
        weight: 15,
        unit: '%',
        target: '>= 90%',
        targetValue: 90,
        direction: 'higher_is_better',
        autoMetricKey: 'COPQ_CLOSED_RATE'
      }
    ]
  },
  {
    staffName: 'Hoàng Văn Phấn',
    aliases: ['hoàng văn phấn', 'hoàng văn phan', 'hoang van phan'],
    roleTitle: 'Kỹ Sư Thẩm Định Kỹ Thuật (KTTĐ)',
    bmDocCode: 'BG-NV-04',
    mtcvCode: 'MTCV-KTTD (doc-mtcv-03)',
    summary: 'Thẩm định kỹ thuật linh kiện mới, mổ xẻ phân tích linh kiện bảo hành (IC, động cơ, ắc quy - BM-KTTD-01) và quản lý sổ cái hiệu chuẩn thiết bị đo (BM-KTTD-02).',
    metrics: [
      {
        id: 'BM-KTTD-P01',
        name: 'Thẩm định kỹ thuật linh kiện mới & phê duyệt mẫu đầu (BM-KTTD-01)',
        bmReference: 'BG-NV-04 / BM-KTTD-01 (Thẩm định linh kiện & PTSP)',
        weight: 20,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'PART_EVAL_PTSP_RATE'
      },
      {
        id: 'BM-KTTD-P02',
        name: 'Quản lý sổ cái & hiệu chuẩn thiết bị đo lường đúng hạn (BM-KTTD-02)',
        bmReference: 'BG-NV-04 / BM-KTTD-02 (100% thiết bị tem xanh hợp lệ)',
        weight: 15,
        unit: '%',
        target: '100%',
        targetValue: 100,
        direction: 'higher_is_better',
        autoMetricKey: 'EQUIPMENT_CALIBRATION_RATE'
      },
      {
        id: 'BM-KTTD-P03',
        name: 'Phân tích kỹ thuật chuyên sâu & xử lý lỗi bảo hành thị trường',
        bmReference: 'BG-NV-04 / MTCV-KTTD (Giám định bảo hành)',
        weight: 15,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'MARKET_DEFECT_RESOLVED_RATE'
      }
    ]
  },
  {
    staffName: 'Đoàn Anh Hùng',
    aliases: ['đoàn anh hùng', 'doan anh hung'],
    roleTitle: 'Nhân Viên Kỹ Thuật Chất Lượng (KTTĐ & Gia công/Đo kiểm)',
    bmDocCode: 'BM-KTTD-03',
    mtcvCode: 'MTCV-KTTD (doc-mtcv-03)',
    summary: 'Giám định lỗi xe bảo hành đại lý trả về (BM-KTTD-01), gia công linh kiện mẫu/đồ gá & sửa chữa chuyên sâu, quản lý CCDC/thiết bị đo lường (BM-KTTD-02) và tham gia kiểm tra IQC (BM-QC-01).',
    metrics: [
      {
        id: 'BM-KTTD-H01',
        name: 'Giám định lỗi xe/linh kiện bảo hành trả về & thẩm định kỹ thuật (BM-KTTD-01)',
        bmReference: 'BM-KTTD-03 Mục II.1 & III.1 (Giám định trong 24h-48h)',
        weight: 20,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'MARKET_DEFECT_RESOLVED_RATE'
      },
      {
        id: 'BM-KTTD-H02',
        name: 'Quản lý CCDC, hiệu chuẩn thiết bị đo (BM-KTTD-02) & gia công đồ gá/linh kiện mẫu',
        bmReference: 'BM-KTTD-03 Mục II.2, II.3 & III.3 (Thiết bị & Gia công mẫu)',
        weight: 15,
        unit: '%',
        target: '100%',
        targetValue: 100,
        direction: 'higher_is_better',
        autoMetricKey: 'EQUIPMENT_CALIBRATION_RATE'
      },
      {
        id: 'BM-KTTD-H03',
        name: 'Tham gia kiểm tra IQC đầu vào (BM-QC-01) & hỗ trợ xưởng tinh chỉnh xe không đạt',
        bmReference: 'BM-KTTD-03 Mục II.4 & III.4 (Hỗ trợ IQC & Xưởng lắp ráp)',
        weight: 15,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'IQC_PASS_RATE'
      }
    ]
  },
  {
    staffName: 'Trần Thế Quang',
    aliases: ['trần thế quang', 'trần thế quảng', 'tran the quang'],
    roleTitle: 'Nhân Viên QC Hiện Trường — Giám Sát Công Đoạn Lắp Ráp (PQC/IPQC)',
    bmDocCode: 'BG-NV-02',
    mtcvCode: 'MTCV-IQC-IPQC (doc-mtcv-04)',
    summary: 'Tuần tra giám sát chất lượng hiện trường, kiểm tra nghiệm thu bán thành phẩm các công đoạn lắp ráp (BM-QC-03/04) và ngăn chặn lỗi dây chuyền.',
    metrics: [
      {
        id: 'BM-PQC-Q01',
        name: 'Thực hiện kiểm tra & nghiệm thu bán thành phẩm công đoạn lắp ráp (BM-QC-03/04)',
        bmReference: 'BG-NV-02 / BM-QC-03 & BM-QC-04 (Tuần tra công đoạn PQC)',
        weight: 20,
        unit: '%',
        target: '>= 98%',
        targetValue: 98,
        direction: 'higher_is_better',
        autoMetricKey: 'PQC_PASS_RATE'
      },
      {
        id: 'BM-PQC-Q02',
        name: 'Kiểm soát lỗi lắp ráp lặp lại & phối hợp đóng CAPA hiện trường đúng hạn',
        bmReference: 'BG-NV-02 / MTCV-IQC-IPQC (Kiểm soát lỗi công đoạn)',
        weight: 15,
        unit: '%',
        target: '>= 90%',
        targetValue: 90,
        direction: 'higher_is_better',
        autoMetricKey: 'CAPA_CLOSURE_RATE'
      },
      {
        id: 'BM-PQC-Q03',
        name: 'Chất lượng phối hợp đầu ra chuyền lắp ráp bàn giao sang KCS/OQC (FPY)',
        bmReference: 'BG-NV-02 / MTCV-IQC-IPQC (Hỗ trợ mục tiêu FPY >= 98%)',
        weight: 15,
        unit: '%',
        target: '>= 98%',
        targetValue: 98,
        direction: 'higher_is_better',
        autoMetricKey: 'OQC_FPY_RATE'
      }
    ]
  },
  {
    staffName: 'Nguyễn Văn Điểm',
    aliases: ['nguyễn văn điểm', 'nguyễn văn diệm', 'nguyen van diem'],
    roleTitle: 'Nhân Viên QC Hiện Trường — Kiểm Soát Chất Lượng Đầu Vào (IQC)',
    bmDocCode: 'BG-NV-03',
    mtcvCode: 'MTCV-IQC-IPQC (doc-mtcv-04)',
    summary: 'Kiểm tra chất lượng linh kiện vật tư đầu vào theo tiêu chuẩn AQL (BM-QC-01/02), dán tem nhận diện và quản lý khu vực cách ly phế phẩm.',
    metrics: [
      {
        id: 'BM-IQC-D01',
        name: 'Thực hiện kiểm tra nghiệm thu lô vật tư linh kiện đầu vào theo AQL (BM-QC-01/02)',
        bmReference: 'BG-NV-03 / BM-QC-01 & BM-QC-02 (100% lô nhập qua IQC)',
        weight: 20,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'IQC_PASS_RATE'
      },
      {
        id: 'BM-IQC-D02',
        name: 'Phát hiện, cách ly lô hàng NCC lỗi & lập hồ sơ cảnh báo SQC chính xác',
        bmReference: 'BG-NV-03 / MTCV-IQC-IPQC (Quản lý kho cách ly & NCR)',
        weight: 15,
        unit: '%',
        target: '>= 90%',
        targetValue: 90,
        direction: 'higher_is_better',
        autoMetricKey: 'SQC_SUPPLIER_EVAL_RATE'
      },
      {
        id: 'BM-IQC-D03',
        name: 'Phối hợp thẩm định linh kiện mới / lô hàng mẫu đầu vào (BM-KTTD-01)',
        bmReference: 'BG-NV-03 / MTCV-IQC-IPQC (Kiểm soát linh kiện mới)',
        weight: 15,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'PART_EVAL_PTSP_RATE'
      }
    ]
  },
  {
    staffName: 'Lãnh Xuân Hải',
    aliases: ['lãnh xuân hải', 'lành xuân hải', 'lanh xuan hai'],
    roleTitle: 'Nhân Viên QC Hiện Trường — Kiểm Soát Linh Kiện & Tuần Tra Lắp Ráp (IQC/IPQC)',
    bmDocCode: 'BG-NV-06',
    mtcvCode: 'MTCV-IQC-IPQC (doc-mtcv-04)',
    summary: 'Kiểm soát chất lượng linh kiện đầu vào kết hợp tuần tra giám sát công đoạn lắp ráp (IQC/IPQC), kiểm soát ngoại quan, cơ khí và mối hàn.',
    metrics: [
      {
        id: 'BM-IPQC-H01',
        name: 'Kiểm soát chất lượng linh kiện đầu vào (IQC - BM-QC-01/02)',
        bmReference: 'BG-NV-06 / BM-QC-01 & BM-QC-02 (Kiểm soát linh kiện)',
        weight: 20,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'IQC_PASS_RATE'
      },
      {
        id: 'BM-IPQC-H02',
        name: 'Tuần tra giám sát chất lượng bán thành phẩm công đoạn lắp ráp (PQC - BM-QC-03/04)',
        bmReference: 'BG-NV-06 / BM-QC-03 & BM-QC-04 (Tuần tra công đoạn)',
        weight: 15,
        unit: '%',
        target: '>= 98%',
        targetValue: 98,
        direction: 'higher_is_better',
        autoMetricKey: 'PQC_PASS_RATE'
      },
      {
        id: 'BM-IPQC-H03',
        name: 'Phối hợp xử lý lỗi hiện trường & đóng hồ sơ khắc phục CAPA',
        bmReference: 'BG-NV-06 / MTCV-IQC-IPQC (Xử lý lỗi hiện trường)',
        weight: 15,
        unit: '%',
        target: '>= 90%',
        targetValue: 90,
        direction: 'higher_is_better',
        autoMetricKey: 'CAPA_CLOSURE_RATE'
      }
    ]
  },
  {
    staffName: 'Hà Khắc Việt',
    aliases: ['hà khắc việt', 'ha khac viet'],
    roleTitle: 'Nhân Viên Nghiệm Thu Thành Phẩm (OQC / KCS)',
    bmDocCode: 'BG-NV-05',
    mtcvCode: 'MTCV-OQC (doc-mtcv-05)',
    summary: 'Kiểm tra 100% xe thành phẩm xuất xưởng (BM-QC-05/06), chạy thử đường trường, đối soát số Khung/số Máy, dán tem hợp chuẩn KCS và bàn giao kho thành phẩm.',
    metrics: [
      {
        id: 'BM-OQC-V01',
        name: 'Nghiệm thu 100% xe thành phẩm xuất xưởng & tỷ lệ đạt chuẩn lần đầu (FPY - BM-QC-05/06)',
        bmReference: 'BG-NV-05 / BM-QC-05 & BM-QC-06 (Nghiệm thu OQC/KCS)',
        weight: 20,
        unit: '%',
        target: '>= 98%',
        targetValue: 98,
        direction: 'higher_is_better',
        autoMetricKey: 'OQC_FPY_RATE'
      },
      {
        id: 'BM-OQC-V02',
        name: 'Kiểm soát không để xe lỗi nghiêm trọng / sai số Khung-Máy lọt ra thị trường',
        bmReference: 'BG-NV-05 / MTCV-OQC (0% lỗi nghiêm trọng lọt cổng KCS)',
        weight: 15,
        unit: '%',
        target: '<= 1.0%',
        targetValue: 1.0,
        direction: 'lower_is_better',
        autoMetricKey: 'MARKET_DEFECT_RATE'
      },
      {
        id: 'BM-OQC-V03',
        name: 'Phối hợp phản hồi & xử lý dứt điểm lỗi chất lượng đầu ra / đại lý',
        bmReference: 'BG-NV-05 / MTCV-OQC (Truy vết & cải tiến OQC)',
        weight: 15,
        unit: '%',
        target: '>= 95%',
        targetValue: 95,
        direction: 'higher_is_better',
        autoMetricKey: 'MARKET_DEFECT_RESOLVED_RATE'
      }
    ]
  }
];
