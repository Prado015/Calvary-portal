// Tiny dependency-free CSV export. Values are quoted and quotes escaped; cells
// starting with = + - @ are prefixed with ' so spreadsheets don't execute them
// as formulas (CSV injection).
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined): string => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
