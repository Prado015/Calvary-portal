import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// Dependency-free SVG line chart (0–100% scale) for attendance trends.
@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg viewBox="0 0 400 200" class="w-full h-52">
      <g *ngFor="let t of [0,25,50,75,100]">
        <line x1="36" [attr.x2]="390" [attr.y1]="y(t)" [attr.y2]="y(t)" stroke="rgba(255,255,255,0.06)" />
        <text x="30" [attr.y]="y(t) + 3" text-anchor="end" fill="#6b7f99" font-size="9">{{ t }}%</text>
      </g>
      <polyline *ngIf="points.length > 1" [attr.points]="polyline" fill="none" stroke="#c9922a" stroke-width="2.5" />
      <g *ngFor="let p of points; let i = index">
        <circle [attr.cx]="x(i)" [attr.cy]="y(p.rate)" r="3.5" fill="#c9922a" />
        <text [attr.x]="x(i)" y="195" text-anchor="middle" fill="#6b7f99" font-size="9">{{ p.date.slice(5) }}</text>
      </g>
    </svg>
  `
})
export class LineChartComponent {
  @Input() points: { date: string; rate: number }[] = [];

  x(i: number): number {
    const n = Math.max(this.points.length - 1, 1);
    return 46 + (i * 330) / n;
  }
  y(rate: number): number {
    return 170 - (Math.min(Math.max(rate, 0), 100) * 150) / 100;
  }
  get polyline(): string {
    return this.points.map((p, i) => `${this.x(i)},${this.y(p.rate)}`).join(' ');
  }
}
