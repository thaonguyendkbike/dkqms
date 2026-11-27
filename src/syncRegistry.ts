/**
 * Single Source of Truth cho toàn bộ danh sách khóa đồng bộ Cloud Firestore (dk_db_sync)
 * Công ty TNHH Xe điện DK Việt Nhật — DKBike — Phòng Quản lý chất lượng (QLCL / DK QMS)
 */

export const CHUNKED_KEYS: string[] = [
  'dk_oqc_records',
  'dk_part_evaluations',
];

export const SUBCOLLECTION_KEYS: string[] = [
  'dk_iqc_records',
  'dk_pqc_records',
  'dk_daily_logs',
  'dk_tasks',
  'dk_weekly_plans',
  'dk_monthly_plans',
  'dk_ptsp_tasks',
  'dk_capas',
  'dk_ecos',
  'dk_defects',
  'dk_report_notes',
  'dk_qms_bm_records',
  'dk_fmea',
  'dk_improvement_actions',
  'dk_qms_quality_planning_tasks',
];

export const EQUIPMENT_SYNC_KEYS: string[] = [
  'dk_equipments',
  'dk_maintenance_logs',
  'dk_equipment_incidents',
  'dk_fabrication_jobs',
];

export const COMPONENT_EXTERNAL_SYNC_KEYS: string[] = [
  'dk_qms_app_showcase_v1',
  'dk_qms_products_v2',
  'dk_qms_standards_custom_v1',
  'dk_qms_component_standards_link',
  'dk_qms_flow_steps_v2',
  'dk_custom_defect_analyses',
];

/**
 * Các cấu hình vận hành từng chỉ lưu cục bộ nay được đưa lên đồng bộ Cloud
 * để dùng chung giữa Thiết bị A và Thiết bị B.
 */
export const OPERATIONAL_SETTINGS_SYNC_KEYS: string[] = [
  'dk_planning_threads',
  'dk_selected_planning_thread',
  'dk_thread_recipients',
  'dk_ignored_daily_log_stts',
  'dk_ignored_sqc_iqc_ids',
  'dk_oqc_takt_break_minutes',
];

export const STANDARD_DOC_SYNC_KEYS: string[] = [
  'dk_staff',
  'dk_oqc_part_codes',
  'dk_supplier_production_audits',
  'dk_models',
  'dk_copqs',
  'dk_ptsp_models',
  'dk_qc_detailed_tasks',
  'dk_kpis',
  'dk_staff_kpi_evaluations',
  'dk_equipments',
  'dk_maintenance_logs',
  'dk_equipment_incidents',
  'dk_fabrication_jobs',
  'dk_suppliers',
  'dk_dealers',
  'dk_projects',
  'dk_custom_forms',
  'dk_custom_pqc_items',
  'dk_pqc_saved_history_templates',
  'dk_custom_fpy_targets',
  'dk_custom_sqc_items',
  'dk_custom_iqc_notes',
  'dk_iqc_saved_notes',
  'dk_weekly_assemblies_all',
  'dk_monthly_assemblies_all',
  'dk_weekly_supplies_all',
  'dk_monthly_supplies_all',
  'dk_weekly_timelines_all',
  'dk_monthly_timelines_all',
  ...COMPONENT_EXTERNAL_SYNC_KEYS,
  ...OPERATIONAL_SETTINGS_SYNC_KEYS,
];

export const STANDALONE_LISTENER_KEYS: string[] = [
  'dk_oqc_handover_list',
  'dk_oqc_color_changes',
];

export const ALL_SYNC_KEYS: string[] = Array.from(
  new Set([
    ...CHUNKED_KEYS,
    ...SUBCOLLECTION_KEYS,
    ...STANDARD_DOC_SYNC_KEYS,
    ...STANDALONE_LISTENER_KEYS,
  ])
);

export const SYNCABLE_STARTUP_KEYS_SET = new Set<string>(ALL_SYNC_KEYS);

export const SYNC_KEY_LABELS: Record<string, string> = {
  dk_defects: 'Sự cố lỗi thị trường (Market Defects)',
  dk_part_evaluations: 'Tổng hợp đánh giá linh kiện lỗi (BM-KTTD-01)',
  dk_report_notes: 'Nhận xét báo cáo Tuần / Tháng',
  dk_qms_bm_records: 'Biểu mẫu & Hồ sơ QMS (/bm)',
  dk_improvement_actions: 'Hành động cải tiến ECO (Improvement Actions)',
  dk_fmea: 'Phân tích FMEA',
  dk_capas: 'Hồ sơ khắc phục CAPA',
  dk_ecos: 'Đề xuất cải tiến ECO',
  dk_iqc_records: 'Kiểm soát đầu vào IQC',
  dk_pqc_records: 'Kiểm soát công đoạn PQC',
  dk_oqc_records: 'Kiểm soát đầu ra KCS/OQC',
  dk_oqc_handover_list: 'Báo phẩm bàn giao kho OQC',
  dk_oqc_color_changes: 'Danh sách xe đổi màu OQC',
  dk_daily_logs: 'Nhật trình công việc Daily Logs',
  dk_weekly_plans: 'Kế hoạch tuần Weekly Plans',
  dk_monthly_plans: 'Kế hoạch tháng Monthly Plans',
  dk_qms_quality_planning_tasks: 'Công việc Lập kế hoạch Chất lượng',
  dk_ptsp_tasks: 'Công việc PTSP (Legacy)',
  dk_ptsp_models: 'Hồ sơ Phát triển Sản phẩm (PTSP)',
  dk_projects: 'Danh mục Dự án',
  dk_tasks: 'Công việc QMS chung',
  dk_qc_detailed_tasks: 'Công việc QC chi tiết',
  dk_copqs: 'Chi phí kém chất lượng COPQ',
  dk_kpis: 'Chỉ tiêu chất lượng KPIs',
  dk_staff_kpi_evaluations: 'Đánh giá KPI nhân sự',
  dk_suppliers: 'Danh sách Nhà cung cấp',
  dk_supplier_production_audits: 'Đánh giá dây chuyền NCC (SQC)',
  dk_dealers: 'Danh sách Đại lý',
  dk_models: 'Danh mục Dòng xe / Model',
  dk_oqc_part_codes: 'Bảng mã xe & Màu sắc OQC',
  dk_equipments: 'Danh mục Thiết bị & CCDC (BM-KTTD-02)',
  dk_maintenance_logs: 'Nhật ký Hiệu chuẩn & Bảo dưỡng thiết bị',
  dk_equipment_incidents: 'Sự cố & Đình chỉ Thiết bị',
  dk_fabrication_jobs: 'Gia công Đồ gá, Mẫu & Sửa chữa (NV-KTTĐ-05)',
  dk_staff: 'Nhân sự Ban QMS',
  dk_custom_forms: 'Biểu mẫu tùy chỉnh',
  dk_qms_products_v2: 'Danh mục Sản phẩm (/bm)',
  dk_qms_standards_custom_v1: 'Tiêu chuẩn kỹ thuật (/bm)',
  dk_qms_component_standards_link: 'Liên kết Tiêu chuẩn Linh kiện (/bm)',
  dk_qms_flow_steps_v2: 'Quy trình QMS Workflow',
  dk_qms_app_showcase_v1: 'Giới thiệu ứng dụng QMS (/bm)',
  dk_custom_defect_analyses: 'Phân tích lỗi tùy chỉnh OQC',
  dk_planning_threads: 'Luồng Email Kế hoạch (Gmail)',
  dk_selected_planning_thread: 'Luồng Email đang chọn',
  dk_thread_recipients: 'Danh sách người nhận Email',
  dk_ignored_daily_log_stts: 'Bộ lọc loại trừ Báo cáo ngày SQC',
  dk_ignored_sqc_iqc_ids: 'Bộ lọc loại trừ IQC trong SQC',
  dk_oqc_takt_break_minutes: 'Cấu hình giờ nghỉ OQC TV',
};
