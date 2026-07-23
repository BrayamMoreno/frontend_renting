import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-8 animate-fade-in pb-20">
      <!-- Header Principal -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight">Configuración de Cuenta</h2>
          <p class="text-slate-500 mt-1">Administra tu información personal y seguridad.</p>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Sidebar Izquierdo -->
        <div class="lg:col-span-4 space-y-6">
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center sticky top-8">
            <div class="w-24 h-24 rounded-2xl overflow-hidden mx-auto mb-4 border-2 border-orange-100 bg-orange-50 flex items-center justify-center">
              <img *ngIf="authService.currentUser()?.avatar_url" 
                   [src]="authService.currentUser()?.avatar_url" 
                   [alt]="authService.currentUser()?.first_name"
                   referrerpolicy="no-referrer"
                   class="w-full h-full object-cover">
              <mat-icon *ngIf="!authService.currentUser()?.avatar_url" class="text-brand text-4xl" style="width: 40px; height: 40px; font-size: 40px;">person</mat-icon>
            </div>
            <h3 class="text-xl font-bold text-slate-900">{{ authService.currentUser()?.first_name }} {{ authService.currentUser()?.last_name }}</h3>
            <div class="flex justify-center mt-2">
              <span class="bg-orange-50 text-brand border border-orange-100 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                {{ authService.currentUser()?.role }}
              </span>
            </div>
            <p class="text-sm text-slate-500 mt-4">{{ authService.currentUser()?.email }}</p>
            
            <div class="mt-8 pt-6 border-t border-slate-50 space-y-3">
              <button (click)="activeSection.set('personal')" 
                [class]="activeSection() === 'personal' ? 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all bg-orange-50 text-brand shadow-sm ring-1 ring-orange-100' : 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-slate-500 hover:bg-slate-50'">
                <mat-icon>badge</mat-icon> Personal
              </button>
              <button *ngIf="!authService.currentUser()?.is_google_user" (click)="activeSection.set('security')" 
                [class]="activeSection() === 'security' ? 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all bg-orange-50 text-brand shadow-sm ring-1 ring-orange-100' : 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-slate-500 hover:bg-slate-50'">
                <mat-icon>security</mat-icon> Seguridad
              </button>
            </div>
          </div>
        </div>

        <!-- Contenido Derecho -->
        <div class="lg:col-span-8">
          
          <!-- SECCIÓN PERSONAL -->
          <div *ngIf="activeSection() === 'personal'" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-slide-up">
            <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div class="flex items-center gap-3">
                <mat-icon class="text-slate-400">badge</mat-icon>
                <h4 class="font-bold text-slate-800">Información Personal</h4>
              </div>
              <div class="flex items-center gap-2">
                <button *ngIf="!isEditing()" type="button" (click)="toggleEdit()" 
                  class="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B00] text-white rounded-xl font-bold hover:bg-[#E65A00] transition-all shadow-lg shadow-orange-500/20 border-none cursor-pointer">
                  <mat-icon class="text-sm">edit</mat-icon> Editar
                </button>
                <ng-container *ngIf="isEditing()">
                  <button type="button" (click)="onCancelEdit()" class="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-white rounded-lg transition-all">
                    Cancelar
                  </button>
                  <button type="button" (click)="onSubmitProfile()" [disabled]="profileForm.invalid || isLoading()" 
                    class="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B00] text-white rounded-xl font-bold hover:bg-[#E65A00] transition-all shadow-lg shadow-orange-500/20 border-none cursor-pointer">
                    <mat-icon *ngIf="!isLoading()" class="text-sm">check</mat-icon>
                    <div *ngIf="isLoading()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Confirmar
                  </button>
                </ng-container>
              </div>
            </div>
            <form [formGroup]="profileForm" class="p-8 space-y-6">
              <div *ngIf="successMessage()" class="bg-green-50 text-green-600 p-4 rounded-xl text-sm font-medium border border-green-200 flex items-center gap-3 mb-4 animate-fade-in">
                <mat-icon>check_circle</mat-icon> {{ successMessage() }}
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="space-y-2">
                  <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre</label>
                  <input type="text" formControlName="first_name" [readonly]="!isEditing()" 
                    [class]="!isEditing() ? 'w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 cursor-default' : 'w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-brand transition-all bg-white'">
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Apellido</label>
                  <input type="text" formControlName="last_name" [readonly]="!isEditing()" 
                    [class]="!isEditing() ? 'w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 cursor-default' : 'w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-brand transition-all bg-white'">
                </div>
                <div class="md:col-span-2 space-y-2">
                  <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Correo Electrónico</label>
                  <input type="email" formControlName="email" [readonly]="!isEditing()" 
                    [class]="!isEditing() ? 'w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 cursor-default' : 'w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-brand transition-all bg-white'">
                </div>
              </div>
            </form>
          </div>

          <!-- SECCIÓN SEGURIDAD -->
          <div *ngIf="activeSection() === 'security' && !authService.currentUser()?.is_google_user" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-slide-up">
            <div class="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30">
              <mat-icon class="text-slate-400">lock</mat-icon>
              <h4 class="font-bold text-slate-800">Actualizar Contraseña</h4>
            </div>
            
            <form [formGroup]="passwordForm" (ngSubmit)="onSubmitPassword()" class="p-8 space-y-6">
              <div *ngIf="passwordSuccess()" class="bg-green-50 text-green-600 p-4 rounded-xl text-sm font-medium border border-green-200 flex items-center gap-3 mb-4 animate-fade-in">
                <mat-icon>check_circle</mat-icon> {{ passwordSuccess() }}
              </div>
              <div *ngIf="passwordError()" class="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-200 flex items-center gap-3 mb-4 animate-fade-in">
                <mat-icon>error</mat-icon> {{ passwordError() }}
              </div>

              <div class="space-y-6 max-w-lg">
                <!-- Nueva Contraseña con Indicador de Fuerza -->
                <div class="space-y-3">
                  <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Nueva Contraseña</label>
                  <input type="password" formControlName="new_password" (input)="checkStrength()"
                    class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-brand transition-all bg-white" placeholder="Mínimo 6 caracteres">
                  
                  <!-- Indicador de Fuerza -->
                  <div class="space-y-2" *ngIf="passwordForm.get('new_password')?.value">
                    <div class="flex gap-1 h-1.5">
                      <div *ngFor="let step of [1,2,3,4]" class="flex-1 rounded-full transition-all duration-500"
                        [class.bg-slate-100]="strength() < step"
                        [class.bg-red-500]="strength() >= step && strength() === 1"
                        [class.bg-orange-500]="strength() >= step && strength() === 2"
                        [class.bg-yellow-500]="strength() >= step && strength() === 3"
                        [class.bg-green-500]="strength() >= step && strength() === 4">
                      </div>
                    </div>
                    <p class="text-[10px] font-bold uppercase tracking-widest"
                      [class.text-red-500]="strength() === 1"
                      [class.text-orange-500]="strength() === 2"
                      [class.text-yellow-500]="strength() === 3"
                      [class.text-green-500]="strength() === 4">
                      {{ strengthText() }}
                    </p>
                  </div>
                </div>

                <!-- Confirmar Contraseña -->
                <div class="space-y-2">
                  <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Confirmar Nueva Contraseña</label>
                  <input type="password" formControlName="confirm_password"
                    class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-brand transition-all bg-white" 
                    [class.border-red-500]="passwordForm.errors?.['mismatch'] && passwordForm.get('confirm_password')?.touched"
                    placeholder="Repite la contraseña">
                  <p *ngIf="passwordForm.errors?.['mismatch'] && passwordForm.get('confirm_password')?.touched" 
                    class="text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1">
                    <mat-icon class="text-xs" style="width:14px; height:14px; font-size:14px;">error_outline</mat-icon>
                    Las contraseñas no coinciden
                  </p>
                </div>
              </div>

              <div class="flex justify-end pt-6 border-t border-slate-50">
                <button type="submit" [disabled]="passwordForm.invalid || isPasswordLoading()" 
                  class="bg-slate-900 hover:bg-slate-800 text-white px-10 py-3 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-900/10 border-none cursor-pointer">
                  <mat-icon *ngIf="!isPasswordLoading()">key</mat-icon>
                  <div *ngIf="isPasswordLoading()" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Actualizar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  activeSection = signal<'personal' | 'security'>('personal');
  
  profileForm: FormGroup = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]]
  });

  passwordForm: FormGroup = this.fb.group({
    new_password: ['', [Validators.required, Validators.minLength(6)]],
    confirm_password: ['', Validators.required]
  }, { validators: this.passwordMatchValidator });

  isEditing = signal(false);
  isLoading = signal(false);
  successMessage = signal('');

  isPasswordLoading = signal(false);
  passwordSuccess = signal('');
  passwordError = signal('');
  
  // Fuerza de contraseña
  strength = signal(0);
  strengthText = signal('');

  ngOnInit() {
    this.resetForm();
  }

  passwordMatchValidator(g: FormGroup) {
    const isMismatch = g.get('new_password')?.value !== g.get('confirm_password')?.value;
    return isMismatch ? { 'mismatch': true } : null;
  }

  checkStrength() {
    const p = this.passwordForm.get('new_password')?.value || '';
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    
    this.strength.set(s);
    switch(s) {
      case 1: this.strengthText.set('Débil'); break;
      case 2: this.strengthText.set('Media'); break;
      case 3: this.strengthText.set('Fuerte'); break;
      case 4: this.strengthText.set('Muy Segura'); break;
      default: this.strengthText.set(''); break;
    }
  }

  resetForm() {
    const user = this.authService.currentUser();
    if (user) {
      this.profileForm.patchValue({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email
      });
    }
  }

  toggleEdit() {
    this.isEditing.set(true);
  }

  onCancelEdit() {
    this.isEditing.set(false);
    this.resetForm();
  }

  onSubmitProfile() {
    if (this.profileForm.invalid) return;
    this.isLoading.set(true);
    this.successMessage.set('');

    this.authService.updateProfile(this.profileForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isEditing.set(false);
        this.successMessage.set('Perfil actualizado correctamente.');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onSubmitPassword() {
    if (this.passwordForm.invalid) return;
    this.isPasswordLoading.set(true);
    this.passwordSuccess.set('');
    this.passwordError.set('');

    const { new_password } = this.passwordForm.value;
    this.authService.changePassword({ new_password }).subscribe({
      next: (res) => {
        this.isPasswordLoading.set(false);
        this.passwordSuccess.set('Contraseña actualizada con éxito.');
        this.passwordForm.reset();
        this.strength.set(0);
        setTimeout(() => this.passwordSuccess.set(''), 3000);
      },
      error: (err) => {
        this.isPasswordLoading.set(false);
        this.passwordError.set(err.error?.error || 'Error al cambiar la contraseña.');
      }
    });
  }
}
