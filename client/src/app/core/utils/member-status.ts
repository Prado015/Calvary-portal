// Member statuses, matching the masterlist's status column:
// blank = active, Sunday Goer, Bible Study, Inactive, Other Church.
export const MEMBER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'sunday_goer', label: 'Sunday goer only' },
  { value: 'bible_study', label: 'Bible study' },
  { value: 'needs_followup', label: 'Needs follow-up' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'other_church', label: 'From other church' }
];

export function statusLabel(value: string | undefined | null): string {
  return MEMBER_STATUSES.find((s) => s.value === value)?.label || value || '';
}

// "Student — Grade 11" / "Working — Cashier, ABC Corp" / ''
export function occupationText(m: { occupationType?: string; occupationDetail?: string }): string {
  const base = m.occupationType === 'student' ? 'Student' : m.occupationType === 'working' ? 'Working' : '';
  if (!base) return '';
  return m.occupationDetail ? `${base} — ${m.occupationDetail}` : base;
}

export function ministryText(m: { ministries?: string[] }): string {
  return m.ministries && m.ministries.length ? m.ministries.join(', ') : 'None';
}