import { Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { IconComponent } from '../components/icon/icon.component';
import { PwaService } from '../../core/services/pwa.service';

export interface ShellNavItem {
  key: string;
  label: string;
  short?: string;      // shorter label for the phone bottom bar
  icon: string;
  link: any[];
  exact?: boolean;
  badge?: string;
}

// One responsive frame used by both the Admin back office and every ministry portal.
//   phones   (< 768px)  : top bar + bottom tab bar (4 key pages + "More") + slide-in drawer with everything
//   tablets  (768-1023) : slim icon rail (labels via tooltip) — maximum room for content
//   desktops (>= 1024)  : full sidebar, collapsible to an icon rail
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="min-h-[100dvh] bg-navy text-brand-text md:flex">

      <!-- ═════════ Tablet / desktop sidebar ═════════ -->
      <aside class="print:hidden hidden md:flex sticky top-0 h-[100dvh] shrink-0 flex-col bg-navy-card border-r border-brand-border transition-[width] duration-200 md:w-16"
             [ngClass]="collapsed ? '' : 'lg:w-60'">
        <div class="h-16 shrink-0 flex items-center gap-3 px-4 border-b border-brand-border justify-center"
             [ngClass]="collapsed ? '' : 'lg:justify-start'">
          <div class="w-8 h-8 shrink-0 rounded bg-gold-btn flex items-center justify-center text-navy font-bold text-xs">CT</div>
          <div class="leading-tight min-w-0" [ngClass]="collapsed ? 'hidden' : 'hidden lg:block'">
            <p class="text-sm font-bold text-white truncate">Calvary Tabernacle</p>
            <p class="text-[10px] text-gold-light uppercase tracking-wide truncate">{{ subtitle }}</p>
          </div>
        </div>
        <nav class="flex-1 overflow-y-auto py-4 px-2 space-y-1" aria-label="Main navigation">
          <ng-container *ngTemplateOutlet="navLinks; context: { rail: true }"></ng-container>
        </nav>
      </aside>

      <!-- ═════════ Content column ═════════ -->
      <div class="flex-1 min-w-0 flex flex-col min-h-[100dvh]">
        <header class="print:hidden sticky top-0 z-30 bg-navy/90 backdrop-blur border-b border-brand-border pt-[env(safe-area-inset-top)]">
          <div class="h-14 md:h-16 flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6">
            <div class="flex items-center gap-1 min-w-0">
              <button type="button" class="icon-btn md:hidden -ml-1" (click)="openDrawer()" aria-label="Open menu">
                <app-icon name="menu" [size]="22"></app-icon>
              </button>
              <button type="button" class="icon-btn hidden lg:inline-flex" (click)="collapsed = !collapsed" aria-label="Toggle sidebar">
                <app-icon name="menu" [size]="20"></app-icon>
              </button>
              <div class="md:hidden flex items-center gap-2 min-w-0 ml-1">
                <div class="w-8 h-8 shrink-0 rounded bg-gold-btn flex items-center justify-center text-navy font-bold text-xs">CT</div>
                <div class="leading-tight min-w-0">
                  <p class="text-sm font-bold text-white truncate">Calvary Tabernacle</p>
                  <p class="text-[10px] text-gold-light uppercase tracking-wide truncate">{{ subtitle }}</p>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <app-icon *ngIf="showBell" name="bell" [size]="19" extraClass="text-brand-muted hidden sm:block"></app-icon>
              <div class="flex items-center gap-2">
                <div class="w-9 h-9 rounded-full bg-gold-btn flex items-center justify-center text-navy text-xs font-bold">{{ initials }}</div>
                <div class="hidden sm:block text-sm leading-tight">
                  <p class="font-medium max-w-[160px] truncate">{{ userName }}</p>
                  <button type="button" (click)="logout.emit()" class="text-xs text-brand-muted hover:text-gold-light">Log out</button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main class="flex-1 w-full max-w-[1600px] mx-auto p-3 sm:p-4 md:p-6 mobile-nav-pad md:!pb-6">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- ═════════ Phone bottom tab bar ═════════ -->
      <nav class="print:hidden md:hidden fixed bottom-0 inset-x-0 z-40 bg-navy-card/95 backdrop-blur border-t border-brand-border pb-[env(safe-area-inset-bottom)]" aria-label="Quick navigation">
        <div class="grid" [style.grid-template-columns]="'repeat(' + (bottomItems.length + 1) + ', minmax(0, 1fr))'">
          <a *ngFor="let item of bottomItems; trackBy: trackKey"
             [routerLink]="item.link"
             routerLinkActive="!text-gold-light"
             [routerLinkActiveOptions]="{ exact: !!item.exact }"
             class="flex flex-col items-center justify-center gap-1 h-14 text-[10px] font-medium text-brand-muted active:bg-navy-input transition-colors">
            <app-icon [name]="item.icon" [size]="21"></app-icon>
            <span class="truncate max-w-full px-1">{{ item.short || item.label }}</span>
          </a>
          <button type="button" (click)="openDrawer()"
                  class="flex flex-col items-center justify-center gap-1 h-14 text-[10px] font-medium text-brand-muted active:bg-navy-input transition-colors">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
            <span>More</span>
          </button>
        </div>
      </nav>

      <!-- ═════════ Phone slide-in drawer ═════════ -->
      <div class="print:hidden md:hidden fixed inset-0 z-50 transition-[visibility]"
           [ngClass]="drawerOpen ? 'visible' : 'invisible delay-200 pointer-events-none'"
           [attr.aria-hidden]="!drawerOpen">
        <div class="absolute inset-0 bg-black/60 transition-opacity duration-200"
             [ngClass]="drawerOpen ? 'opacity-100' : 'opacity-0'" (click)="closeDrawer()"></div>
        <aside class="absolute inset-y-0 left-0 w-[84%] max-w-xs bg-navy-card border-r border-brand-border flex flex-col transition-transform duration-200 ease-out"
               [ngClass]="drawerOpen ? 'translate-x-0' : '-translate-x-full'" role="dialog" aria-label="Menu">
          <div class="shrink-0 flex items-center justify-between gap-2 px-4 border-b border-brand-border h-14 mt-[env(safe-area-inset-top)]">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-8 h-8 shrink-0 rounded bg-gold-btn flex items-center justify-center text-navy font-bold text-xs">CT</div>
              <div class="leading-tight min-w-0">
                <p class="text-sm font-bold text-white truncate">Calvary Tabernacle</p>
                <p class="text-[10px] text-gold-light uppercase tracking-wide truncate">{{ subtitle }}</p>
              </div>
            </div>
            <button type="button" class="icon-btn -mr-2" (click)="closeDrawer()" aria-label="Close menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="shrink-0 flex items-center gap-3 px-4 py-4 border-b border-brand-border">
            <div class="w-10 h-10 rounded-full bg-gold-btn flex items-center justify-center text-navy text-sm font-bold">{{ initials }}</div>
            <p class="font-medium text-white truncate">{{ userName }}</p>
          </div>

          <nav class="flex-1 overflow-y-auto overscroll-contain py-3 px-3 space-y-1" aria-label="All pages">
            <ng-container *ngTemplateOutlet="navLinks; context: { rail: false }"></ng-container>
          </nav>

          <div class="shrink-0 p-3 border-t border-brand-border pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-2">
            <ng-container *ngIf="pwa.canInstall">
              <button type="button" (click)="installApp()"
                      class="w-full flex items-center justify-center gap-2 h-12 rounded-brand bg-gold/15 border border-gold/40 text-sm font-medium text-gold-light active:scale-[0.98] transition-transform">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
                Install app on this phone
              </button>
              <p *ngIf="showIosHint" class="text-xs text-brand-muted px-1">In Safari, tap the Share button, then “Add to Home Screen”.</p>
            </ng-container>
            <button type="button" (click)="closeDrawer(); logout.emit()"
                    class="w-full flex items-center justify-center gap-2 h-12 rounded-brand bg-navy-input border border-brand-border text-sm font-medium text-brand-text active:scale-[0.98] transition-transform">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
              Log out
            </button>
          </div>
        </aside>
      </div>
    </div>

    <!-- Shared nav-link list (rail = icon-only on tablets / collapsed sidebar) -->
    <ng-template #navLinks let-rail="rail">
      <a *ngFor="let item of items; trackBy: trackKey"
         [routerLink]="item.link"
         routerLinkActive="bg-gold/15 text-gold-light font-medium"
         [routerLinkActiveOptions]="{ exact: !!item.exact }"
         [attr.title]="rail ? item.label : null"
         (click)="closeDrawer()"
         class="flex items-center gap-3 px-3 rounded-lg text-sm text-brand-muted hover:bg-navy-input hover:text-brand-text active:bg-navy-input transition-colors"
         [ngClass]="rail ? ('py-2.5 justify-center ' + (collapsed ? '' : 'lg:justify-start')) : 'py-3.5'">
        <app-icon [name]="item.icon" [size]="19"></app-icon>
        <span class="flex-1 truncate" [ngClass]="rail ? (collapsed ? 'hidden' : 'hidden lg:inline') : ''">{{ item.label }}</span>
        <span *ngIf="item.badge" class="text-[9px] bg-brand-green text-navy font-bold px-1.5 py-0.5 rounded"
              [ngClass]="rail ? (collapsed ? 'hidden' : 'hidden lg:inline') : ''">{{ item.badge }}</span>
      </a>
    </ng-template>
  `
})
export class AppShellComponent implements OnChanges, OnDestroy {
  @Input() items: ShellNavItem[] = [];
  @Input() subtitle = '';
  @Input() userName = '';
  @Input() initials = '';
  @Input() showBell = false;
  /** Keys of the pages shown in the phone bottom bar (max 4). Falls back to the first four items. */
  @Input() primaryKeys: string[] = [];
  @Output() logout = new EventEmitter<void>();

  collapsed = false;      // desktop sidebar → icon rail
  drawerOpen = false;     // phone drawer
  bottomItems: ShellNavItem[] = [];

  private doc = inject(DOCUMENT);
  pwa = inject(PwaService);
  showIosHint = false;

  constructor(router: Router) {
    router.events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => this.closeDrawer());
  }

  ngOnChanges(): void {
    const picked = this.primaryKeys.length
      ? this.primaryKeys.map((k) => this.items.find((i) => i.key === k)).filter((i): i is ShellNavItem => !!i)
      : this.items;
    this.bottomItems = picked.slice(0, 4);
  }

  trackKey = (_: number, item: ShellNavItem) => item.key;

  installApp(): void {
    if (this.pwa.canPrompt()) { this.pwa.install(); return; }
    if (this.pwa.isIos) this.showIosHint = !this.showIosHint;
  }

  openDrawer(): void {
    this.drawerOpen = true;
    this.doc.body.style.overflow = 'hidden'; // don't scroll the page behind the drawer
  }

  closeDrawer(): void {
    if (!this.drawerOpen) return;
    this.drawerOpen = false;
    this.doc.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape') onEscape(): void { this.closeDrawer(); }
  @HostListener('window:resize') onResize(): void {
    if (this.doc.defaultView && this.doc.defaultView.innerWidth >= 768) this.closeDrawer();
  }

  ngOnDestroy(): void { this.doc.body.style.overflow = ''; }
}
