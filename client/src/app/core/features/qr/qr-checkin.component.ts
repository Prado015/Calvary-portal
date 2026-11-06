import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsQR from 'jsqr';
import { ServiceTypeService, ServiceTypeRecord } from '../../core/services/service-type.service';
import { MemberAttendanceService, QrCheckInResult } from '../../core/services/member-attendance.service';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { AvatarComponent } from '../../shared/components/common/avatar.component';

interface ScanEntry { name: string; time: Date; kind: 'ok' | 'already' | 'error'; text: string; }

const todayLocal = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// Most recent date (today or earlier) that falls on the given weekday (0 = Sunday)
function lastWeekday(weekday: number): string {
  const d = new Date();
  while (d.getDay() !== weekday) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Door scanner: point the phone at a member's QR card and they are marked present.
@Component({
  selector: 'app-qr-checkin',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, AvatarComponent],
  template: `
    <app-page-header title="QR Check-in" subtitle="Scan member cards at the door"></app-page-header>

    <div class="grid gap-4 lg:grid-cols-2 max-w-5xl">
      <div>
        <!-- Which service -->
        <div class="grid grid-cols-2 gap-2 mb-3">
          <select [(ngModel)]="typeId" (ngModelChange)="onTypeChange()" class="h-11 bg-navy-card border border-brand-border rounded-brand text-sm px-3 text-brand-text">
            <option *ngFor="let t of types" [value]="t._id">{{ t.name }}</option>
          </select>
          <input type="date" [(ngModel)]="date" [max]="today" class="h-11 bg-navy-card border border-brand-border rounded-brand text-sm px-3 text-brand-text" />
        </div>
        <label class="flex items-center gap-2 text-sm text-brand-muted mb-3 select-none cursor-pointer">
          <input type="checkbox" [(ngModel)]="markLate" class="accent-gold w-4 h-4" /> Mark people as <span class="text-brand-text">late</span> (use after the service has started)
        </label>

        <!-- Camera -->
        <div class="relative rounded-brand overflow-hidden bg-black border border-brand-border aspect-square sm:aspect-[4/3]">
          <video #video playsinline muted class="absolute inset-0 w-full h-full object-cover" [class.invisible]="!scanning"></video>
          <canvas #canvas class="hidden"></canvas>

          <div *ngIf="scanning" class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-2/3 max-w-[260px] aspect-square rounded-2xl border-2 border-gold/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"></div>
          </div>

          <div *ngIf="!scanning" class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p class="text-sm text-brand-muted max-w-xs">{{ cameraMessage || 'Tap start, then allow camera access. Hold the phone about a hand-width from the card.' }}</p>
            <button type="button" (click)="start()" [disabled]="!typeId || starting"
                    class="h-12 px-8 rounded-brand bg-gold-btn text-navy font-semibold disabled:opacity-50">{{ starting ? 'Starting…' : 'Start scanning' }}</button>
          </div>

          <!-- Result flash -->
          <div *ngIf="flash" class="absolute inset-x-3 bottom-3 rounded-brand p-3 flex items-center gap-3 shadow-lg backdrop-blur"
               [ngClass]="flash.kind === 'ok' ? 'bg-brand-green/90' : flash.kind === 'already' ? 'bg-gold/90' : 'bg-brand-error/90'">
            <app-avatar *ngIf="flashMember" [name]="flashMember.name" [src]="flashMember.photoUrl" [size]="52"></app-avatar>
            <div class="min-w-0 text-navy">
              <p class="font-bold leading-tight truncate">{{ flash.name || 'Not recorded' }}</p>
              <p class="text-sm leading-tight">{{ flash.text }}</p>
              <p *ngIf="flashMember?.cellgroup" class="text-xs opacity-80 truncate">{{ flashMember!.cellgroup }}</p>
            </div>
          </div>
        </div>

        <div class="flex gap-2 mt-3" *ngIf="scanning">
          <button type="button" (click)="stop()" class="flex-1 h-11 rounded-brand bg-navy-card border border-brand-border text-sm text-brand-text">Stop</button>
          <button type="button" (click)="flip()" class="flex-1 h-11 rounded-brand bg-navy-card border border-brand-border text-sm text-brand-text">Switch camera</button>
          <button *ngIf="torchSupported" type="button" (click)="toggleTorch()" class="flex-1 h-11 rounded-brand bg-navy-card border border-brand-border text-sm text-brand-text">{{ torchOn ? 'Light off' : 'Light on' }}</button>
        </div>
      </div>

      <!-- Session log -->
      <div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="bg-navy-card border border-brand-border rounded-brand p-4">
            <p class="text-xs text-brand-muted">Checked in this session</p>
            <p class="text-3xl font-bold text-white">{{ checkedIn }}</p>
          </div>
          <div class="bg-navy-card border border-brand-border rounded-brand p-4">
            <p class="text-xs text-brand-muted">Already scanned</p>
            <p class="text-3xl font-bold text-white">{{ duplicates }}</p>
          </div>
        </div>
        <div class="bg-navy-card border border-brand-border rounded-brand p-4">
          <p class="text-[11px] uppercase tracking-wide text-gold-light font-semibold mb-2">Recent scans</p>
          <p *ngIf="!log.length" class="text-sm text-brand-muted">Nothing scanned yet.</p>
          <ul class="space-y-2">
            <li *ngFor="let e of log" class="flex items-center justify-between gap-3 text-sm">
              <span class="truncate" [ngClass]="e.kind === 'error' ? 'text-brand-error' : 'text-brand-text'">{{ e.name || e.text }}</span>
              <span class="shrink-0 text-xs"
                    [ngClass]="e.kind === 'ok' ? 'text-brand-green' : e.kind === 'already' ? 'text-gold-light' : 'text-brand-error'">
                {{ e.kind === 'ok' ? 'Present' : e.kind === 'already' ? 'Already in' : 'Not counted' }} · {{ e.time | date: 'h:mm:ss a' }}
              </span>
            </li>
          </ul>
        </div>
        <p class="text-xs text-brand-muted mt-3">Someone without their card? Mark them on the Attendance page. Prayer meetings are also marked there.</p>
      </div>
    </div>
  `
})
export class QrCheckinComponent implements OnInit, OnDestroy {
  private typeApi = inject(ServiceTypeService);
  private attApi = inject(MemberAttendanceService);
  private zone = inject(NgZone);

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  types: ServiceTypeRecord[] = [];
  typeId = '';
  date = todayLocal();
  today = todayLocal();
  markLate = false;

  scanning = false;
  starting = false;
  cameraMessage = '';
  facing: 'environment' | 'user' = 'environment';
  torchSupported = false;
  torchOn = false;

  checkedIn = 0;
  duplicates = 0;
  log: ScanEntry[] = [];
  flash: ScanEntry | null = null;
  flashMember: QrCheckInResult['member'] | null = null;

  private stream: MediaStream | null = null;
  private raf = 0;
  private lastTick = 0;
  private lastToken = '';
  private lastTokenAt = 0;
  private busy = false;
  private flashTimer: any;
  private audio: AudioContext | null = null;

  ngOnInit(): void {
    this.typeApi.list().subscribe((all) => {
      this.types = all.filter((t) => t.kind === 'weekly');
      const sunday = this.types.find((t) => t.code === 'sunday') || this.types[0];
      if (sunday) { this.typeId = sunday._id; this.onTypeChange(); }
    });
  }

  ngOnDestroy(): void { this.stop(); clearTimeout(this.flashTimer); this.audio?.close().catch(() => {}); }

  onTypeChange(): void {
    const t = this.types.find((x) => x._id === this.typeId);
    if (t && t.weekday !== null) this.date = lastWeekday(t.weekday);
  }

  async start(): Promise<void> {
    if (this.scanning || this.starting) return;
    this.starting = true; this.cameraMessage = '';
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      this.audio = this.audio || new (window.AudioContext || (window as any).webkitAudioContext)();
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: this.facing }, width: { ideal: 1280 } }, audio: false });
      const video = this.videoRef.nativeElement;
      video.srcObject = this.stream;
      await video.play();
      const track = this.stream.getVideoTracks()[0];
      this.torchSupported = !!(track.getCapabilities?.() as any)?.torch;
      this.scanning = true;
      this.zone.runOutsideAngular(() => this.tick());
    } catch (err: any) {
      this.cameraMessage = err?.name === 'NotAllowedError'
        ? 'Camera access was blocked. Allow the camera for this site in your browser settings, then tap start again.'
        : err?.message === 'unsupported' ? 'This browser cannot use the camera. Try Chrome or Safari, and make sure the page is opened with https.'
        : 'Could not start the camera. Close other apps that use it and try again.';
      this.stop();
    } finally { this.starting = false; }
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.scanning = false; this.torchOn = false; this.torchSupported = false;
  }

  async flip(): Promise<void> {
    this.facing = this.facing === 'environment' ? 'user' : 'environment';
    this.stop();
    await this.start();
  }

  async toggleTorch(): Promise<void> {
    const track = this.stream?.getVideoTracks()[0];
    if (!track) return;
    this.torchOn = !this.torchOn;
    try { await track.applyConstraints({ advanced: [{ torch: this.torchOn } as any] }); } catch { this.torchOn = !this.torchOn; }
  }

  // Looks at the camera ~8 times a second for a QR code.
  private tick = (): void => {
    this.raf = requestAnimationFrame(this.tick);
    const now = performance.now();
    if (now - this.lastTick < 120) return;
    this.lastTick = now;
    const video = this.videoRef?.nativeElement, canvas = this.canvasRef?.nativeElement;
    if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return;
    const scale = Math.min(1, 640 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (code?.data) this.zone.run(() => this.onCode(code.data));
  };

  private onCode(token: string): void {
    const now = Date.now();
    if (this.busy) return;
    if (token === this.lastToken && now - this.lastTokenAt < 4000) return; // same card still in view
    this.lastToken = token; this.lastTokenAt = now;
    this.busy = true;

    this.attApi.qrCheckIn({ token, typeId: this.typeId, date: this.date, status: this.markLate ? 'late' : 'present' }).subscribe({
      next: (r) => {
        this.busy = false;
        const time = r.checkedInAt ? new Date(r.checkedInAt) : new Date();
        if (r.already) {
          this.duplicates++;
          this.show({ name: r.member.name, time, kind: 'already', text: `Already checked in at ${time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` }, r.member);
          this.feedback('warn');
        } else {
          this.checkedIn++;
          this.show({ name: r.member.name, time: new Date(), kind: 'ok', text: r.status === 'late' ? 'Marked late' : 'Marked present' }, r.member);
          this.feedback('ok');
        }
      },
      error: (e) => {
        this.busy = false;
        this.show({ name: '', time: new Date(), kind: 'error', text: e.error?.message || 'Could not check in' }, null);
        this.feedback('error');
      }
    });
  }

  private show(entry: ScanEntry, member: QrCheckInResult['member'] | null): void {
    this.flash = entry; this.flashMember = member;
    this.log = [entry, ...this.log].slice(0, 12);
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => { this.flash = null; this.flashMember = null; }, 3500);
  }

  private feedback(kind: 'ok' | 'warn' | 'error'): void {
    try { navigator.vibrate?.(kind === 'ok' ? 80 : [60, 60, 60]); } catch { /* not supported */ }
    try {
      if (!this.audio) return;
      const osc = this.audio.createOscillator(), gain = this.audio.createGain();
      osc.frequency.value = kind === 'ok' ? 880 : kind === 'warn' ? 520 : 220;
      gain.gain.value = 0.08;
      osc.connect(gain); gain.connect(this.audio.destination);
      osc.start(); osc.stop(this.audio.currentTime + (kind === 'ok' ? 0.12 : 0.25));
    } catch { /* sound is optional */ }
  }
}
