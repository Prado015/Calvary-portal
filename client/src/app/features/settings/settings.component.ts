import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { DepartmentStore } from '../../core/services/department-store.service';
import { PageHeaderComponent } from '../../shared/components/common/page-header.component';
import { ChartCardComponent } from '../../shared/components/charts/chart-card.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';

// Account settings for everyone (profile + change password); inside a portal it
// also shows the department the account belongs to.
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, ChartCardComponent, ButtonComponent],
  template: `
    <app-page-header title="Settings" subtitle="Your account"></app-page-header>
    <div class="grid lg:grid-cols-2 gap-4">
      <app-chart-card title="Profile">
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between"><dt class="text-brand-muted">Name</dt><dd>{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</dd></div>
          <div class="flex justify-between"><dt class="text-brand-muted">Email</dt><dd>{{ auth.user()?.email }}</dd></div>
          <div class="flex justify-between"><dt class="text-brand-muted">Role</dt><dd>{{ auth.user()?.role }}</dd></div>
          <div class="flex justify-between"><dt class="text-brand-muted">Portal</dt><dd>{{ store?.department()?.name || auth.user()?.department?.name || 'Admin back office' }}</dd></div>
        </dl>
      </app-chart-card>

      <app-chart-card title="Change password">
        <form (ngSubmit)="submit()">
          <input type="password" [(ngModel)]="current" name="current" placeholder="Current password" required class="w-full mb-3 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
          <input type="password" [(ngModel)]="next" name="next" placeholder="New password (min 8 characters)" required minlength="8" class="w-full mb-3 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
          <input type="password" [(ngModel)]="confirm" name="confirm" placeholder="Confirm new password" required class="w-full mb-4 bg-navy-input border border-brand-border rounded-brand text-sm py-3 px-4 text-brand-text outline-none" />
          <p *ngIf="error" class="text-brand-error text-sm mb-3">{{ error }}</p>
          <p *ngIf="success" class="text-brand-green text-sm mb-3">{{ success }}</p>
          <app-button type="submit" [disabled]="saving">{{ saving ? 'Updating…' : 'Update password' }}</app-button>
        </form>
      </app-chart-card>
    </div>
  `
})
export class SettingsComponent {
  auth = inject(AuthService);
  store = inject(DepartmentStore, { optional: true });
  current = ''; next = ''; confirm = '';
  error = ''; success = ''; saving = false;

  submit(): void {
    this.error = ''; this.success = '';
    if (this.next !== this.confirm) { this.error = 'New passwords do not match'; return; }
    if (this.next.length < 8) { this.error = 'New password must be at least 8 characters'; return; }
    this.saving = true;
    this.auth.changePassword(this.current, this.next).subscribe({
      next: () => { this.saving = false; this.success = 'Password updated.'; this.current = this.next = this.confirm = ''; },
      error: (e) => { this.saving = false; this.error = e.error?.message || 'Could not update password'; }
    });
  }
}
