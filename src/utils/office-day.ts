/**
 * Days, as the office writes them.
 *
 * An L.R. carries a date and no clock, and `lrDate` is a DATE column holding
 * it at UTC midnight. Everything here works in that pair — a yyyy-mm-dd string
 * and the UTC midnight that stores it — so a day never picks up an hour on its
 * way through.
 *
 * "Today" is Ahmedabad's day rather than the server's. A container running in
 * UTC would otherwise roll the dashboard's window over at half past five in
 * the morning, and one in another region at some other hour; naming the zone
 * here means the answer does not depend on where this is deployed.
 */

export const OFFICE_ZONE = "Asia/Kolkata";

/** en-CA formats as yyyy-mm-dd, which is the only reason it is asked. */
const officeDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: OFFICE_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today in the office, as the clerk would write it. */
export function officeToday(): string {
  return officeDate.format(new Date());
}

/** A yyyy-mm-dd as the UTC midnight a date column holds. */
export function utcDay(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** A date column as the day written on the L.R. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from one day to another, negative if `to` is the earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcDay(to).getTime() - utcDay(from).getTime()) / DAY_MS);
}

/** The day `days` after this one. Counts in days, so no hour to lose. */
export function addDays(iso: string, days: number): string {
  const shifted = utcDay(iso);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return isoDay(shifted);
}
