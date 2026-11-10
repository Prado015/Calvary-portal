import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DepartmentService, DepartmentRecord } from '../../../core/services/department.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ButtonComponent } from '../../../shared/components/ui/button.component';

interface PortalShortcut { slug: string; name: string; description: string; icon: string; colorClass: string; }

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ButtonComponent],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  showPassword = false;
  form = { email: '', password: '', department: '' };
  departments: DepartmentRecord[] = [];
  error = '';
  loading = false;

  // ---- self-registration (creates a pending account for an admin to approve)
  registerOpen = false;
  regLoading = false;
  regError = '';
  regDone = '';
  regShowPassword = false;
  reg = { firstName: '', lastName: '', email: '', password: '', confirm: '', position: '', department: '' };
  regPositions = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Leader', 'Assistant Leader', 'Pastor', 'Minister'];

  quickModules = [
    { icon: 'user', label: 'Members' },
    { icon: 'users', label: 'Visitors' },
    { icon: 'clipboard-check', label: 'Attendance' },
    { icon: 'users-round', label: 'Cellgroups' },
    { icon: 'bar-chart-3', label: 'Reports' }
  ];

  portalShortcuts: PortalShortcut[] = [
    { slug: 'lm', name: 'LM Portal', description: 'Ladies Ministries Access Portal', icon: 'heart-handshake', colorClass: 'bg-purple-500/80' },
    { slug: 'youth', name: 'Youth Portal', description: 'Youth Ministry Access Portal', icon: 'users-round', colorClass: 'bg-blue-500/80' },
    { slug: 'amm', name: 'AMM Portal', description: 'Apostolic Men Ministry Access Portal', icon: 'user-plus', colorClass: 'bg-green-600/80' }
  ];

  constructor(
    private auth: AuthService,
    private departmentService: DepartmentService,
    private permissions: PermissionsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.departmentService.listPublic().subscribe({
      next: (depts) => (this.departments = depts),
      error: () => (this.departments = [])
    });
  }

  handlePortalClick(slug: string): void {
    this.form.department = slug;
  }

  openRegister(): void {
    this.reg = { firstName: '', lastName: '', email: '', password: '', confirm: '', position: '', department: '' };
    this.regError = ''; this.regDone = ''; this.registerOpen = true;
  }

  handleRegister(): void {
    this.regError = '';
    if (this.reg.password.length < 8) { this.regError = 'Password must be at least 8 characters.'; return; }
    if (this.reg.password !== this.reg.confirm) { this.regError = 'The two passwords do not match.'; return; }
    this.regLoading = true;
    const { confirm, ...payload } = this.reg;
    this.auth.signup(payload).subscribe({
      next: (r) => { this.regLoading = false; this.regDone = r.message; },
      error: (e) => { this.regLoading = false; this.regError = e.error?.message || 'Could not send your request. Please try again.'; }
    });
  }

  handleSubmit(): void {
    this.error = '';
    this.loading = true;
    this.auth.login(this.form.email, this.form.password).subscribe({
      next: ({ user }) => {
        this.loading = false;
        this.router.navigateByUrl(this.permissions.getPortalPath(user));
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Invalid credentials';
      }
    });
  }
}