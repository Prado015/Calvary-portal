import { Injectable, signal } from '@angular/core';

// Lets the app offer its own "Install app" button.
//  - Android / desktop Chrome & Edge: the browser hands us an install prompt we can trigger.
//  - iPhone / iPad Safari has no prompt, so we show how to "Add to Home Screen" instead.
@Injectable({ providedIn: 'root' })
export class PwaService {
  private deferred: any = null;
  readonly canPrompt = signal(false);
  readonly installed = signal(this.isStandalone());
  readonly isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;

  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferred = e;
      this.canPrompt.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.canPrompt.set(false);
      this.installed.set(true);
    });
  }

  private isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  }

  /** True when there is something useful to show in the menu. */
  get canInstall(): boolean {
    return !this.installed() && (this.canPrompt() || this.isIos);
  }

  async install(): Promise<void> {
    if (!this.deferred) return;
    this.deferred.prompt();
    await this.deferred.userChoice;
    this.deferred = null;
    this.canPrompt.set(false);
  }
}
