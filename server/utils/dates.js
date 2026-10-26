// Date helpers that work on plain "YYYY-MM-DD" strings so results never depend
// on the server's timezone (a Sunday is a Sunday on every machine).
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n) => String(n).padStart(2, '0');

function isIsoDate(s) {
  if (typeof s !== 'string' || !ISO.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !isNaN(d) && d.toISOString().slice(0, 10) === s; // rejects 2026-02-30
}

const weekdayOf = (s) => new Date(`${s}T00:00:00Z`).getUTCDay(); // 0 = Sunday
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m = 1..12
const monthDates = (y, m) => Array.from({ length: daysInMonth(y, m) }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`);
const monthRange = (y, m) => ({ from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(daysInMonth(y, m))}` });
const todayUtc = () => new Date().toISOString().slice(0, 10);

function addDays(s, n) {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Same day-of-month `offset` months later; clamps (31st -> last day of a shorter month).
function sameDayInMonthOffset(s, offset) {
  const [y, m, d] = s.split('-').map(Number);
  const total = (y * 12 + (m - 1)) + offset;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${pad(nm)}-${pad(Math.min(d, daysInMonth(ny, nm)))}`;
}

module.exports = { isIsoDate, weekdayOf, daysInMonth, monthDates, monthRange, todayUtc, addDays, sameDayInMonthOffset, pad };
