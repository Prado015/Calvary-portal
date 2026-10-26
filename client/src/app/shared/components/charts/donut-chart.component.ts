import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DonutSlice { name: string; value: number; color: string; }

// CSS conic-gradient donut — no charting library needed.
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-5">
      <div class="relative w-32 h-32 shrink-0 rounded-full" [style.background]="gradient">
        <div class="absolute inset-[22px] rounded-full bg-navy-card flex items-center justify-center text-white font-bold">{{ total }}</div>
      </div>
      <div class="space-y-1.5 flex-1">
        <div *ngFor="let s of slices" class="flex items-center justify-between text-xs">
          <span class="flex items-center gap-2 text-brand-muted"><span class="w-2 h-2 rounded-full" [style.background]="s.color"></span>{{ s.name }}</span>
          <span class="text-brand-text">{{ s.value }}</span>
        </div>
      </div>
    </div>
  `
})
export class DonutChartComponent {
  @Input() slices: DonutSlice[] = [];

  get total(): number { return this.slices.reduce((a, s) => a + s.value, 0); }

  get gradient(): string {
    if (!this.total) return '#13213a';
    let acc = 0;
    const stops = this.slices.map((s) => {
      const start = (acc / this.total) * 100;
      acc += s.value;
      const end = (acc / this.total) * 100;
      return `${s.color} ${start}% ${end}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }
}
