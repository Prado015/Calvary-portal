import { Occurrence, BoardMember } from '../services/attendance-board.service';
import { CHURCH } from '../config/church.config';
import { dayOf } from './dates';

export interface Signatory { name: string; title: string; }

export interface AttendancePdfInput {
  ministryName: string;            // "Youth Ministries"
  cellgroupLabel: string | null;   // "Elijah" — null when the report covers every cellgroup
  monthName: string; year: number; today: string;
  occurrences: Occurrence[];       // the columns, in order
  members: BoardMember[];          // the rows (include inactive ones if they should be listed)
  marks: Record<string, Record<string, string>>; // memberId -> occurrence key -> status
  preparedBy: Signatory;
  notedBy: Signatory[];            // cellgroup leader, church pastor ...
  logoLeft?: string | null;        // data URL of the logo shown on the left of the header
  logoRight?: string | null;       // optional second logo on the right
}

const COUNTED = ['present', 'late'];
type Rgb = [number, number, number];
const GROUP: Record<string, { fill: Rgb; text: Rgb }> = {
  gold: { fill: [255, 215, 0], text: [0, 0, 0] }, teal: { fill: [74, 222, 128], text: [0, 0, 0] }, blue: { fill: [96, 165, 250], text: [0, 0, 0] },
  purple: { fill: [192, 132, 252], text: [0, 0, 0] }, green: { fill: [74, 222, 128], text: [0, 0, 0] }, red: { fill: [248, 113, 113], text: [0, 0, 0] }
};
const NAVY: Rgb = [13, 21, 37];
const GOLD: Rgb = [201, 146, 42];
const HEAD_TEAL: Rgb = [27, 188, 157];
const ROW_ACTIVE: Rgb = [200, 247, 197];
const ROW_INACTIVE: Rgb = [255, 204, 204];

const applies = (m: BoardMember, o: Occurrence) => o.departmentIds.length === 0 || (!!m.department && o.departmentIds.includes(m.department._id));
const safeName = (s: string) => s.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');

// Builds the Service Attendance Report (landscape A4) and returns the finished PDF.
// jsPDF is loaded only when this runs, so it never slows down the rest of the app.
export async function buildAttendancePdf(input: AttendancePdfInput): Promise<{ doc: any; filename: string }> {
  const [{ jsPDF }, tableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  // The production bundler can wrap this package differently from `ng serve`, so `default`
  // may be an object instead of the function. Pick whichever export is really callable.
    // The production bundler can wrap this package differently from `ng serve`, so `default`
  // may be an object instead of the function. Pick whichever export is really callable.
  const mod: any = tableModule;
  const autoTable: any = [mod.autoTable, mod.default, mod.default?.autoTable, mod.default?.default].find((f) => typeof f === 'function');
  if (!autoTable) throw new Error('jspdf-autotable did not load as a function');

  const doc: any = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const M = 28;
  const flat = input.occurrences;

  // ───────── numbers
  const isPast = (o: Occurrence) => o.date <= input.today;
  const present = (m: BoardMember, o: Occurrence) => COUNTED.includes((input.marks[m._id] || {})[o.key] || '');
  const totals = flat.map((o) => (isPast(o) ? input.members.filter((m) => applies(m, o) && present(m, o)).length : null));
  const held = totals.filter((t) => t !== null && t > 0) as number[];
  const avg = held.length ? Math.round((held.reduce((a, b) => a + b, 0) / held.length) * 10) / 10 : 0;
  const inactive = input.members.filter((m) => m.status === 'inactive').length;
  const active = input.members.length - inactive;

  // ───────── letterhead (first page)
  const LOGO = 58;
  const drawLogo = (data: string | null | undefined, x: number): boolean => {
    if (!data) return false;
    try { doc.addImage(data, 'PNG', x, 18, LOGO, LOGO); return true; } catch { return false; }
  };
  if (!drawLogo(input.logoLeft, M)) {
    // No logo available: fall back to a plain "CT" monogram so the header never looks empty
    doc.setFillColor(...NAVY); doc.roundedRect(M, 22, 50, 50, 8, 8, 'F');
    doc.setTextColor(...GOLD); doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.text('CT', M + 25, 54, { align: 'center' });
  }
  drawLogo(input.logoRight, W - M - LOGO);

  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(21);
  doc.text(input.ministryName.toUpperCase(), W / 2, 50, { align: 'center' });
  doc.setFont('helvetica', 'italic'); doc.setFontSize(10.5);
  doc.text(CHURCH.name.toUpperCase(), W / 2, 67, { align: 'center' });
  doc.setDrawColor(190, 190, 190); doc.setLineWidth(0.6); doc.line(M, 88, W - M, 88);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(0, 0, 0);
  doc.text('SERVICE ATTENDANCE REPORT', M, 108);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(10);
  let y = 124;
  if (input.cellgroupLabel) { doc.text(`CELLGROUP: ${input.cellgroupLabel}`, M, y); y += 15; }
  doc.text(`MONTH: ${input.monthName} ${input.year}`, M, y);
  const tableTop = y + 14;

  // ───────── table
  const groups: { name: string; color: string; count: number }[] = [];
  for (const o of flat) {
    const last = groups[groups.length - 1];
    if (last && last.name === o.typeName && last.color === o.color) last.count++;
    else groups.push({ name: o.typeName, color: o.color, count: 1 });
  }
  const col = (c: string) => GROUP[c] || GROUP['gold'];
  const head1: any[] = [
    { content: '#', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: HEAD_TEAL, textColor: [255, 255, 255], fontStyle: 'bold' } },
    { content: 'MEMBER', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: HEAD_TEAL, textColor: [255, 255, 255], fontStyle: 'bold' } },
    ...groups.map((g) => ({ content: g.name.toUpperCase(), colSpan: g.count, styles: { halign: 'center', fillColor: col(g.color).fill, textColor: col(g.color).text, fontStyle: 'bolditalic' } }))
  ];
  const head2: any[] = flat.map((o) => ({ content: String(dayOf(o.date)), styles: { halign: 'center', fillColor: col(o.color).fill, textColor: col(o.color).text, fontStyle: 'bold' } }));

  const body: any[] = input.members.map((m, i) => {
    const fill = m.status === 'inactive' ? ROW_INACTIVE : ROW_ACTIVE;
    return [
      { content: String(i + 1), styles: { halign: 'center', fillColor: fill } },
      { content: `${m.firstName} ${m.lastName}`, styles: { fontStyle: 'bold', fillColor: fill } },
      ...flat.map((o) => ({ content: '', mark: isPast(o) && applies(m, o) && present(m, o), styles: { fillColor: fill } }))
    ];
  });
  body.push([
    { content: 'TOTAL', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 243, 176] } },
    ...totals.map((t) => ({ content: t === null ? '' : String(t), styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 243, 176] } }))
  ]);

  const nameW = 150, numW = 26;
  const dateW = Math.max(14, Math.min(40, (W - 2 * M - nameW - numW) / Math.max(1, flat.length)));
  const columnStyles: Record<number, any> = { 0: { cellWidth: numW }, 1: { cellWidth: nameW } };
  flat.forEach((_, i) => (columnStyles[i + 2] = { cellWidth: dateW }));

  autoTable(doc, {
    startY: tableTop, head: [head1, head2], body, theme: 'grid', columnStyles, showHead: 'everyPage', rowPageBreak: 'avoid',
    margin: { left: M, right: M, top: 34, bottom: 46 },
    styles: { font: 'helvetica', fontSize: flat.length > 20 ? 7.5 : 8.5, cellPadding: { top: 3.4, bottom: 3.4, left: 4, right: 4 }, lineColor: [0, 0, 0], lineWidth: 0.3, textColor: [20, 20, 20], valign: 'middle', overflow: 'ellipsize' },
    // A check mark is drawn as two lines, so no special font is needed
    didDrawCell: (d: any) => {
      if (d.section !== 'body' || !d.cell.raw || !d.cell.raw.mark) return;
      const cx = d.cell.x + d.cell.width / 2, cy = d.cell.y + d.cell.height / 2;
      doc.setDrawColor(18, 92, 45); doc.setLineWidth(1.3);
      doc.line(cx - 3.4, cy + 0.2, cx - 1.1, cy + 2.8); doc.line(cx - 1.1, cy + 2.8, cx + 3.8, cy - 3);
    }
  });

  // ───────── summary + signatures (kept together on one page)
  let yy = doc.lastAutoTable.finalY + 22;
  if (yy + 150 > H - 50) { doc.addPage(); yy = 50; }

  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
  doc.text(`AVG. ATTENDANCE: ${avg}`, M, yy);
  doc.text(`ACTIVE: ${active}`, M, yy + 15);
  doc.text(`INACTIVE: ${inactive}`, M, yy + 30);

  const sigTop = yy + 58;
  const colW = (W - 2 * M) / 3;
  const people: { label: string; s: Signatory }[] = [{ label: 'Prepared By:', s: input.preparedBy }, ...input.notedBy.filter((n) => n.name || n.title).map((s) => ({ label: 'Noted By:', s }))];
  people.slice(0, 3).forEach((p, i) => {
    const x = M + i * colW;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.text(p.label, x, sigTop);
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.6); doc.line(x, sigTop + 40, x + colW - 40, sigTop + 40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text((p.s.name || '').toUpperCase(), x, sigTop + 54);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text((p.s.title || '').toUpperCase(), x, sigTop + 67);
  });

  // ───────── footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 120, 120);
    doc.text(`© ${input.year} ${CHURCH.footer}`, W / 2, H - 24, { align: 'center' });
    doc.text(`Page ${p} of ${pages}`, W - M, H - 24, { align: 'right' });
  }

  const filename = `Attendance-${safeName(input.ministryName)}${input.cellgroupLabel ? '-' + safeName(input.cellgroupLabel) : ''}-${input.monthName}-${input.year}.pdf`;
  return { doc, filename };
}

// Shrinks an image to a small PNG so the report stays light (null if it can't be loaded).
function shrinkToPng(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 200;
        const ctx = c.getContext('2d')!; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 200, 200);
        const r = Math.min(200 / img.width, 200 / img.height);   // keep the logo's proportions
        ctx.drawImage(img, (200 - img.width * r) / 2, (200 - img.height * r) / 2, img.width * r, img.height * r);
        resolve(c.toDataURL('image/png'));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** A logo kept in the app's public folder, e.g. loadLogo('ctc_logo.png'). Empty name = no logo. */
export function loadLogo(url: string): Promise<string | null> {
  return url ? shrinkToPng(url) : Promise.resolve(null);
}

/** A logo the person picked from their own device in the Export PDF window. */
export function logoFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = () => shrinkToPng(String(reader.result)).then(resolve);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}