/**
 * Canonical Date & ISO 8601 Week Utilities for DK QMS (Local Timezone Safe — GMT+7)
 * Avoids UTC shifts from `toISOString().split('T')[0]` during 00:00–06:59 local time.
 */

export const WEEKDAY_LABELS_MON_FIRST = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

export function getLocalYmd(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getLocalDmy(d: Date = new Date()): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateShortVi(d: Date): string {
  return getLocalDmy(d);
}

export function parseFlexibleDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  if (!clean) return null;

  // YYYY-MM-DD or YYYY/MM/DD (optionally with time)
  const ymd = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    const rawY = dmy[3];
    const y = rawY.length === 2 ? 2000 + Number(rawY) : Number(rawY);
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
  }

  // DD/MM or DD-MM (fallback to current year)
  const dm = clean.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (dm) {
    const d = Number(dm[1]);
    const m = Number(dm[2]);
    const y = new Date().getFullYear();
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
  }

  const fallback = new Date(clean);
  if (!Number.isNaN(fallback.getTime())) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 12, 0, 0, 0);
  }
  return null;
}

export function formatDateStrVi(dateStr?: string | null): string {
  const d = parseFlexibleDate(dateStr);
  return d ? getLocalDmy(d) : (dateStr || '--');
}

export function getWeekdayIndexMonFirst(d: Date): number {
  const day = d.getDay(); // 0=Sun..6=Sat
  return day === 0 ? 6 : day - 1; // 0=T2..6=CN
}

export function getIsoWeekInfo(date: Date): { isoYear: number; isoWeek: number } {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utc.getUTCDay() || 7; // Mon=1..Sun=7
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum); // Thursday of current ISO week
  const isoYear = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { isoYear, isoWeek };
}

export function getIsoWeeksInYear(isoYear: number): number {
  const dec28 = new Date(isoYear, 11, 28, 12, 0, 0);
  return getIsoWeekInfo(dec28).isoWeek;
}

export function getIsoWeekRange(isoYear: number, isoWeek: number): { start: Date; end: Date } {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // Mon=1..Sun=7
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  const targetMonday = new Date(week1Monday);
  targetMonday.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);

  const start = new Date(
    targetMonday.getUTCFullYear(),
    targetMonday.getUTCMonth(),
    targetMonday.getUTCDate(),
    0, 0, 0, 0
  );
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Legacy T1..T5 week-in-month mapping (Monday -> Sunday aligned)
 * Shared between App.tsx and QualityInspectionRecords.tsx so T1..T5 filters never drift.
 */
const weekAndMonthCache = new Map<string, { week: string; month: number; year: number }>();

export function getWeekAndMonthFromDate(dateStr: string): { week: string; month: number; year: number } {
  const today = new Date();
  if (!dateStr || typeof dateStr !== 'string') {
    return { week: 'T1', month: today.getMonth() + 1, year: today.getFullYear() };
  }
  const clean = dateStr.trim();
  const cached = weekAndMonthCache.get(clean);
  if (cached) return cached;

  const parsed = parseFlexibleDate(clean);
  const target = parsed || today;
  const month = target.getMonth() + 1;
  const year = target.getFullYear();

  const firstDayOfMonth = new Date(year, month - 1, 1);
  const dow = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon..6=Sat
  const mon1Day =
    dow === 1 ? 1 :
    dow === 2 ? 0 :
    dow === 3 ? -1 :
    dow === 4 ? -2 :
    dow === 5 ? 4 :
    dow === 6 ? 3 : 2;
  const mon1Date = new Date(year, month - 1, mon1Day);
  const diffDays = Math.floor((target.getTime() - mon1Date.getTime()) / 86400000);
  const weekNum = Math.max(1, Math.min(5, Math.floor(diffDays / 7) + 1));
  const result = { week: `T${weekNum}`, month, year };

  if (weekAndMonthCache.size > 3000) weekAndMonthCache.clear();
  weekAndMonthCache.set(clean, result);
  return result;
}
