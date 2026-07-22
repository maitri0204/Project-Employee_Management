/** Company holidays (in addition to Sundays and 2nd Saturdays). */

export type CompanyHoliday = {
  date: string; // YYYY-MM-DD
  name: string;
};

export const COMPANY_HOLIDAYS: CompanyHoliday[] = [
  // 2026
  { date: "2026-08-15", name: "Independence Day" },
  { date: "2026-08-28", name: "Raksha Bandhan" },
  { date: "2026-09-14", name: "Ganesh Chaturthi" },
  { date: "2026-10-02", name: "Gandhi Jayanti" },
  { date: "2026-10-20", name: "Dussehra" },
  { date: "2026-11-07", name: "Nark Chaturdashi / Kali Chaudas" },
  { date: "2026-11-09", name: "Diwali" },
  { date: "2026-11-10", name: "New Year" },
  { date: "2026-11-11", name: "Bhai Bij" },
  // 2027
  { date: "2027-01-01", name: "New Year" },
  { date: "2027-01-14", name: "Makarsankrati" },
  { date: "2027-01-26", name: "Republic Day" },
  { date: "2027-03-23", name: "Holi / Dhuleti" },
  { date: "2027-08-15", name: "Independence Day" },
  { date: "2027-08-17", name: "Raksha Bandhan" },
  { date: "2027-09-04", name: "Ganesh Chaturthi" },
  { date: "2027-10-02", name: "Gandhi Jayanti" },
  { date: "2027-10-09", name: "Dussehra" },
  { date: "2027-10-29", name: "Diwali" },
  { date: "2027-10-30", name: "New Year" },
  { date: "2027-10-31", name: "Bhai Bij" },
  { date: "2027-11-28", name: "Nark Chaturdashi / Kali Chaudas" },
];

const holidayMap = new Map(COMPANY_HOLIDAYS.map((h) => [h.date, h.name]));

export function getCompanyHolidayName(dateKey: string): string | undefined {
  return holidayMap.get(dateKey);
}

export function isCompanyHoliday(dateKey: string): boolean {
  return holidayMap.has(dateKey);
}

export function getCompanyHolidaysInRange(startKey: string, endKey: string): CompanyHoliday[] {
  return COMPANY_HOLIDAYS.filter((h) => h.date >= startKey && h.date <= endKey);
}
