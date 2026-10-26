import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MemberService, MemberRecord } from '../../../core/services/member.service';
import { CellgroupService, CellgroupRecord } from '../../../core/services/cellgroup.service';
import { DepartmentRecord } from '../../../core/services/department.service';
import { MEMBER_STATUSES } from '../../../core/utils/member-status';
import { ButtonComponent } from '../ui/button.component';

const blank = () => ({
  firstName: '', lastName: '', middleInitial: '', contact: '', email: '', gender: '', department: '', cellgroup: '',
  cgPosition: '', ageGroup: '',
  status: 'active', dateJoined: new Date().toISOString().split('T')[0],
  birthdate: '',
  age: '' as string | number, location: '', occupationType: '', occupationDetail: '', ministries: '',
  profilingForm: false, baptizedWater: false, baptizedHolyGhost: false
});

// Add / edit a member. In a portal the department is fixed (fixedDepartmentId);
// in admin the user picks one from `departments`. From a cell group report the
// cellgroup can be preset (presetCellgroupId).
@Component({
  selector: 'app-member-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div *ngIf="open" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form (ngSubmit)="save()" class="bg-navy-card border border-brand-border rounded-brand p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 class="text-white font-bold mb-4">{{ member ? 'Edit Member' : 'Add Member' }}</h3>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <input [(ngModel)]="form.firstName" name="firstName" placeholder="First name" required class="inp" />
          <input [(ngModel)]="form.lastName" name="lastName" placeholder="Last name" required class="inp" />
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <input [(ngModel)]="form.middleInitial" name="middleInitial" maxlength="5" placeholder="Middle initial" class="inp" />
          <select [(ngModel)]="form.gender" name="gender" class="inp">
            <option value="">Gender</option><option>Male</option><option>Female</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <input type="date" [(ngModel)]="form.birthdate" (ngModelChange)="onBirthdateChange()" name="birthdate" title="Birthdate" class="inp" />
          <input [(ngModel)]="form.age" name="age" type="number" min="0" max="120" placeholder="Age" class="inp" />
        </div>
        <input [(ngModel)]="form.location" name="location" placeholder="Location (e.g. barangay / city)" class="inp w-full mb-3" />
        <div class="grid grid-cols-2 gap-3 mb-3">
          <input [(ngModel)]="form.contact" name="contact" placeholder="Contact number" class="inp" />
          <input [(ngModel)]="form.email" name="email" type="email" placeholder="Email" class="inp" />
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <select [(ngModel)]="form.occupationType" name="occupationType" class="inp">
            <option value="">Student / Working?</option><option value="student">Student</option><option value="working">Working</option>
          </select>
          <input [(ngModel)]="form.occupationDetail" name="occupationDetail" [disabled]="!form.occupationType"
                 [placeholder]="form.occupationType === 'student' ? 'Level (e.g. Grade 11)' : form.occupationType === 'working' ? 'Position / company' : 'Details'" class="inp" />
        </div>
        <input [(ngModel)]="form.ministries" name="ministries" placeholder="Ministries, comma-separated (blank = None)" class="inp w-full mb-3" />

        <select *ngIf="!fixedDepartmentId" [(ngModel)]="form.department" (ngModelChange)="onDepartmentChange()" name="department" required class="inp w-full mb-3">
          <option value="">Select department</option>
          <option *ngFor="let d of departments" [value]="d._id">{{ d.name }}</option>
        </select>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <select [(ngModel)]="form.cellgroup" name="cellgroup" class="inp">
            <option value="">No cellgroup</option>
            <option *ngFor="let cg of cellgroups" [value]="cg._id">{{ cg.name }}</option>
          </select>
          <select [(ngModel)]="form.cgPosition" name="cgPosition" class="inp">
            <option value="">CG position</option>
            <option *ngFor="let p of positions" [value]="p">{{ p }}</option>
          </select>
        </div>
        <select [(ngModel)]="form.ageGroup" name="ageGroup" class="inp w-full mb-3">
          <option value="">Age group (Children's only)</option>
          <option *ngFor="let g of ageGroups" [value]="g">{{ g }}</option>
        </select>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <select [(ngModel)]="form.status" name="status" class="inp">
            <option *ngFor="let s of statuses" [value]="s.value">{{ s.label }}</option>
          </select>
          <input type="date" [(ngModel)]="form.dateJoined" name="dateJoined" class="inp" />
        </div>

        <div class="flex flex-col gap-2 mb-4 text-sm text-[#e0e8f5]">
          <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="form.profilingForm" name="profilingForm" /> Completed profiling form</label>
          <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="form.baptizedWater" name="baptizedWater" /> Baptized in water</label>
          <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="form.baptizedHolyGhost" name="baptizedHolyGhost" /> Baptized in Holy Ghost</label>
        </div>

        <p *ngIf="error" class="text-brand-error text-sm mb-3">{{ error }}</p>
        <div class="flex gap-3">
          <app-button variant="ghost" (click)="closed.emit()">Cancel</app-button>
          <app-button type="submit" [disabled]="saving">{{ saving ? 'Saving…' : 'Save Member' }}</app-button>
        </div>
      </form>
    </div>
  `,
  styles: [`.inp { background:#0d1a2e; border:1px solid rgba(255,255,255,0.08); border-radius:14px; font-size:14px; padding:12px 16px; color:#e0e8f5; outline:none; } .inp:disabled { opacity:.5; }`]
})
export class MemberFormComponent implements OnChanges {
  private memberApi = inject(MemberService);
  private cellgroupApi = inject(CellgroupService);

  @Input() open = false;
  @Input() member: MemberRecord | null = null;
  @Input() departments: DepartmentRecord[] = [];
  @Input() fixedDepartmentId: string | null = null;
  @Input() presetCellgroupId: string | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  statuses = MEMBER_STATUSES;
  positions = ['Leader', 'Assistant Leader', 'Secretary', 'Member'];
  ageGroups = ['Toddlers 1', 'Toddlers 2', 'Beginners 1', 'Beginners 2', 'Primary', 'Junior'];
  form = blank();
  cellgroups: CellgroupRecord[] = [];
  saving = false;
  error = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.error = '';
      if (this.member) {
        const m: any = this.member; // `any` so the new fields compile even if MemberRecord isn't updated yet
        this.form = {
          firstName: m.firstName, lastName: m.lastName, middleInitial: m.middleInitial || '',
          contact: m.contact || '', email: m.email || '', gender: m.gender || '',
          department: m.department?._id || this.fixedDepartmentId || '',
          cellgroup: m.cellgroup?._id || '', cgPosition: m.cgPosition || '', ageGroup: m.ageGroup || '',
          status: m.status,
          dateJoined: (m.dateJoined || '').split('T')[0],
          birthdate: (m.birthdate || '').split('T')[0],
          age: m.age ?? '', location: m.location || '',
          occupationType: m.occupationType || '', occupationDetail: m.occupationDetail || '',
          ministries: (m.ministries || []).join(', '),
          profilingForm: !!m.profilingForm, baptizedWater: !!m.baptizedWater, baptizedHolyGhost: !!m.baptizedHolyGhost
        };
      } else {
        this.form = { ...blank(), department: this.fixedDepartmentId || '', cellgroup: this.presetCellgroupId || '' };
      }
      this.loadCellgroups();
    }
  }

  onDepartmentChange(): void {
    this.form.cellgroup = ''; // a cellgroup belongs to exactly one department
    this.loadCellgroups();
  }

  onBirthdateChange(): void {
    if (!this.form.birthdate) return;
    const b = new Date(this.form.birthdate);
    if (isNaN(b.getTime())) return;
    const now = new Date();
    let a = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
    if (a >= 0 && a <= 120) this.form.age = a;
  }

  loadCellgroups(): void {
    const dept = this.fixedDepartmentId || this.form.department;
    if (!dept) { this.cellgroups = []; return; }
    this.cellgroupApi.list({ department: dept }).subscribe((l) => (this.cellgroups = l));
  }

  save(): void {
    const department = this.fixedDepartmentId || this.form.department;
    if (!department) { this.error = 'Please choose a department'; return; }
    this.saving = true;
    this.error = '';

    const { ministries, age, ...rest } = this.form;
    const payload: any = {
      ...rest,
      department,
      age: age === '' || age === null ? null : Number(age),
      birthdate: rest.birthdate || null,
      ministries: String(ministries || '').split(',').map((x) => x.trim()).filter(Boolean),
      occupationDetail: rest.occupationType ? rest.occupationDetail : ''
    };
    if (!payload.cellgroup) payload.cellgroup = null;

    const req = this.member ? this.memberApi.update(this.member._id, payload) : this.memberApi.create(payload);
    req.subscribe({
      next: () => { this.saving = false; this.saved.emit(); },
      error: (e) => { this.saving = false; this.error = e.error?.message || 'Could not save member'; }
    });
  }
}