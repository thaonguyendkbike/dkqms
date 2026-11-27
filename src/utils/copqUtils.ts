/**
 * Chuẩn hóa giá trị COPQ về đơn vị VNĐ trên toàn hệ thống (App, KPIDashboard, ReportsHub, CopqSpreadsheetEntry).
 * - Nếu có `totalAmount` (VNĐ) -> dùng trực tiếp.
 * - Nếu chỉ có `amount` (bản ghi cũ lưu theo đơn vị triệu VNĐ, thường < 100.000) -> nhân 1.000.000 để quy ra VNĐ.
 */
export function resolveCopqVnd(c: any): number {
  if (!c) return 0;
  if (c.totalAmount !== undefined && c.totalAmount !== null && c.totalAmount !== '') {
    const t = Number(c.totalAmount);
    if (Number.isFinite(t)) return t;
  }
  const a = Number(c.amount ?? 0);
  if (!Number.isFinite(a) || a === 0) return 0;
  // Giá trị < 100.000 được hiểu là đơn vị triệu VNĐ (ví dụ 12.5 => 12.500.000 VNĐ)
  return Math.abs(a) < 100000 ? a * 1_000_000 : a;
}
