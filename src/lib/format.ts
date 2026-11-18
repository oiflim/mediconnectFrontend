export function prettyDate(value?: string | Date) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
export function prettyDateTime(value?: string | Date) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
export function initials(name?: string) { return (name || 'M').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'M'; }
export function titleCase(value?: string) { return (value || '').replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase()); }
export function localIso(date: Date) {
  // Date instances created from local date/time inputs represent the correct instant;
  // UTC ISO strings are offset-aware and accepted by the backend date parser.
  return date.toISOString();
}
export function roleLabel(role?: string) { return titleCase(role || 'patient'); }

export function dateInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
