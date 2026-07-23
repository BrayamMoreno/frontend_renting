import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-700">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-1">
          <h2 class="text-4xl font-black text-slate-900 tracking-tight">Gestión de Usuarios</h2>
          <p class="text-slate-500 font-medium border-l-4 border-brand pl-4 py-1">Administre las cuentas de acceso y asigne roles del sistema.</p>
        </div>
        <button *ngIf="!showForm()" (click)="onNewUser()" class="bg-brand hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-3 shadow-xl shadow-orange-500/30 group">
          <mat-icon class="group-hover:rotate-90 transition-transform">person_add</mat-icon>
          Nuevo Usuario
        </button>
      </div>

      <!-- Toast de éxito -->
      <div *ngIf="successMsg()"
           class="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-500/30 animate-in slide-in-from-right duration-300 font-bold text-sm">
        <mat-icon class="scale-90">check_circle</mat-icon>
        {{ successMsg() }}
      </div>

      <!-- Toast de error global -->
      <div *ngIf="errorMsg()"
           class="fixed top-6 right-6 z-50 flex items-center gap-3 bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-red-500/30 animate-in slide-in-from-right duration-300 font-bold text-sm max-w-sm">
        <mat-icon class="scale-90 flex-shrink-0">error_outline</mat-icon>
        <span>{{ errorMsg() }}</span>
      </div>

      <!-- Create/Edit User Form -->
      <div *ngIf="showForm()" class="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-500">
        <div class="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="p-3 bg-orange-100 text-brand rounded-2xl">
               <mat-icon>{{ isEditing() ? 'edit_note' : 'person_add_alt' }}</mat-icon>
            </div>
            <div>
               <h4 class="text-xl font-bold text-slate-800">{{ isEditing() ? 'Editar Perfil' : 'Registro de Usuario' }}</h4>
               <p class="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Información de Identidad y Acceso</p>
            </div>
          </div>
          <button (click)="onCancel()" class="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-2xl hover:bg-slate-100 transition-all">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        
        <form [formGroup]="userForm" (ngSubmit)="onSubmit()" class="p-10 space-y-8">

          <!-- Banner de error del servidor -->
          <div *ngIf="formError()"
               class="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 animate-in fade-in duration-300">
            <mat-icon class="flex-shrink-0 scale-90 mt-0.5">error</mat-icon>
            <div class="text-sm font-medium leading-relaxed" [innerHTML]="formError()"></div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

            <!-- Username -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Username <span class="text-red-400">*</span>
              </label>
              <div class="relative group">
                <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand transition-colors scale-75">alternate_email</mat-icon>
                <input type="text" formControlName="username"
                       [class.border-red-400]="isFieldInvalid('username')"
                       class="w-full pl-12 pr-6 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all font-bold text-slate-700 bg-slate-50/30"
                       placeholder="ej. jmoreno">
              </div>
              <p *ngIf="isFieldInvalid('username')" class="text-xs text-red-500 font-medium ml-1 flex items-center gap-1">
                <mat-icon class="scale-75 !w-4 !h-4">warning_amber</mat-icon>
                {{ getFieldError('username') }}
              </p>
            </div>

            <!-- Nombres -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Nombres <span class="text-red-400">*</span>
              </label>
              <input type="text" formControlName="first_name"
                     [class.border-red-400]="isFieldInvalid('first_name')"
                     class="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all font-bold text-slate-700 bg-slate-50/30"
                     placeholder="Nombre">
              <p *ngIf="isFieldInvalid('first_name')" class="text-xs text-red-500 font-medium ml-1 flex items-center gap-1">
                <mat-icon class="scale-75 !w-4 !h-4">warning_amber</mat-icon>
                El nombre es obligatorio
              </p>
            </div>

            <!-- Apellidos -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Apellidos <span class="text-red-400">*</span>
              </label>
              <input type="text" formControlName="last_name"
                     [class.border-red-400]="isFieldInvalid('last_name')"
                     class="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all font-bold text-slate-700 bg-slate-50/30"
                     placeholder="Apellido">
              <p *ngIf="isFieldInvalid('last_name')" class="text-xs text-red-500 font-medium ml-1 flex items-center gap-1">
                <mat-icon class="scale-75 !w-4 !h-4">warning_amber</mat-icon>
                El apellido es obligatorio
              </p>
            </div>

            <!-- Email -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Email Corporativo <span class="text-red-400">*</span>
              </label>
              <input type="email" formControlName="email"
                     [class.border-red-400]="isFieldInvalid('email')"
                     class="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all font-bold text-slate-700 bg-slate-50/30"
                     placeholder="correo@empresa.com">
              <p *ngIf="isFieldInvalid('email')" class="text-xs text-red-500 font-medium ml-1 flex items-center gap-1">
                <mat-icon class="scale-75 !w-4 !h-4">warning_amber</mat-icon>
                {{ getFieldError('email') }}
              </p>
            </div>

            <!-- Password (solo en creación) -->
            <div class="space-y-1.5" *ngIf="!isEditing()">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Password Temporal <span class="text-red-400">*</span>
              </label>
              <div class="relative group">
                <input [type]="showPassword() ? 'text' : 'password'" formControlName="password"
                       [class.border-red-400]="isFieldInvalid('password')"
                       class="w-full px-6 pr-12 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all font-bold text-slate-700 bg-slate-50/30"
                       placeholder="Mín. 6 caracteres">
                <button type="button" (click)="togglePassword()"
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  <mat-icon class="scale-75">{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
              <p *ngIf="isFieldInvalid('password')" class="text-xs text-red-500 font-medium ml-1 flex items-center gap-1">
                <mat-icon class="scale-75 !w-4 !h-4">warning_amber</mat-icon>
                {{ getFieldError('password') }}
              </p>
            </div>

            <!-- Rol -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Asignar Rol <span class="text-red-400">*</span>
              </label>
              <div class="relative">
                <select formControlName="role"
                        [class.border-red-400]="isFieldInvalid('role')"
                        class="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all bg-slate-50/30 appearance-none font-bold text-slate-700">
                   <option value="" disabled>Seleccionar rol...</option>
                   <option *ngFor="let rol of roles()" [value]="rol.nombre">{{ rol.nombre }}</option>
                   <option value="ADMIN">ADMIN (Super Administrador)</option>
                   <option value="BODEGA">BODEGA (Por defecto)</option>
                </select>
                <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</mat-icon>
              </div>
              <p *ngIf="isFieldInvalid('role')" class="text-xs text-red-500 font-medium ml-1 flex items-center gap-1">
                <mat-icon class="scale-75 !w-4 !h-4">warning_amber</mat-icon>
                Debes seleccionar un rol
              </p>
            </div>

          </div>

          <p class="text-xs text-slate-400 font-medium">
            <span class="text-red-400">*</span> Campos obligatorios
          </p>

          <div class="flex justify-end gap-4 pt-8 border-t border-slate-100">
            <button type="button" (click)="onCancel()" class="px-10 py-4 rounded-2xl font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs">
              Descartar
            </button>
            <button type="submit" [disabled]="isLoading()" class="bg-brand hover:bg-orange-600 text-white px-14 py-4 rounded-2xl font-black transition-all flex items-center gap-3 disabled:opacity-50 shadow-2xl shadow-orange-500/40 uppercase tracking-widest text-xs">
              <mat-icon *ngIf="!isLoading()">verified_user</mat-icon>
              <div *ngIf="isLoading()" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {{ isEditing() ? 'Actualizar Usuario' : 'Crear Cuenta' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Users List -->
      <div class="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <div class="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
           <h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Listado de Personal</h3>
           <div class="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-white px-4 py-2 rounded-full border border-slate-100">
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
              {{ users().length }} Usuarios Activos
           </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-white border-b border-slate-50">
                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identidad</th>
                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contacto</th>
                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Permisos / Rol</th>
                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
                <tr *ngFor="let user of users()" class="hover:bg-orange-50/30 transition-all group">
                <td class="px-8 py-6">
                  <div class="flex items-center gap-4">
                    <div *ngIf="!user.avatar_url" class="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand to-orange-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                      {{ user.username.charAt(0).toUpperCase() }}
                    </div>
                    <img *ngIf="user.avatar_url" [src]="user.avatar_url" [alt]="user.username" referrerpolicy="no-referrer" class="w-12 h-12 rounded-2xl object-cover shadow-lg group-hover:scale-110 transition-transform">
                    <div class="flex flex-col">
                       <span class="font-black text-slate-800 text-base leading-tight">{{ user.username }}</span>
                       <span class="text-xs text-slate-500 font-medium">{{ user.first_name }} {{ user.last_name }}</span>
                    </div>
                  </div>
                </td>
                <td class="px-8 py-6">
                   <div class="flex flex-col gap-1">
                      <span class="text-sm text-slate-600 font-bold flex items-center gap-2">
                         <mat-icon class="text-slate-300 scale-75">email</mat-icon>
                         {{ user.email }}
                      </span>
                   </div>
                </td>
                <td class="px-8 py-6">
                  <div class="flex flex-wrap gap-2">
                    <span [ngClass]="{
                      'bg-orange-500 text-white shadow-lg shadow-orange-500/20': user.role === 'ADMIN',
                      'bg-slate-100 text-slate-600': user.role !== 'ADMIN'
                    }" class="px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">
                      {{ user.rol_entidad_nombre || user.role }}
                    </span>
                    <span *ngIf="user.is_superuser" class="bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">Superuser</span>
                    <span *ngIf="user.is_approved === false" class="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest animate-pulse">Pendiente</span>
                    <span *ngIf="user.is_approved !== false" class="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">Aprobado</span>
                  </div>
                </td>
                <td class="px-8 py-6 text-right">
                  <div class="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button *ngIf="user.is_approved === false" (click)="openApproveModal(user)" class="w-10 h-10 flex items-center justify-center text-emerald-500 bg-emerald-50 hover:bg-emerald-500 hover:text-white rounded-xl transition-all" matTooltip="Aprobar Usuario">
                      <mat-icon class="scale-90">check_circle</mat-icon>
                    </button>
                    <button (click)="onEdit(user)" class="w-10 h-10 flex items-center justify-center text-brand bg-orange-50 hover:bg-brand hover:text-white rounded-xl transition-all" matTooltip="Configurar Acceso">
                      <mat-icon class="scale-90">settings</mat-icon>
                    </button>
                    <button *ngIf="user.id !== authService.currentUser()?.id" (click)="openDeleteModal(user.id)" class="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all" matTooltip="Remover Usuario">
                      <mat-icon class="scale-90">delete_outline</mat-icon>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════ -->
    <!-- MODAL: Aprobar acceso de cuenta Google        -->
    <!-- ══════════════════════════════════════════════ -->
    <div *ngIf="approveModal().show"
         class="fixed inset-0 z-50 flex items-center justify-center p-4"
         (click)="closeApproveModal()">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"></div>

      <!-- Card -->
      <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300"
           (click)="$event.stopPropagation()">

        <!-- Top accent bar -->
        <div class="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500"></div>

        <div class="p-8">
          <!-- Icon + title -->
          <div class="flex items-start gap-5 mb-6">
            <div class="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <mat-icon class="text-emerald-500 !text-3xl !w-8 !h-8">verified_user</mat-icon>
            </div>
            <div>
              <h3 class="text-xl font-black text-slate-900 leading-tight">Aprobar acceso al sistema</h3>
              <p class="text-sm text-slate-500 mt-1">Esta acción concede acceso completo a la plataforma.</p>
            </div>
          </div>

          <!-- User info card -->
          <div class="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 mb-6 border border-slate-100">
            <div *ngIf="!approveModal().user?.avatar_url"
                 class="w-12 h-12 rounded-xl bg-gradient-to-br from-brand to-orange-600 text-white flex items-center justify-center font-black text-lg flex-shrink-0">
              {{ approveModal().user?.username?.charAt(0)?.toUpperCase() }}
            </div>
            <img *ngIf="approveModal().user?.avatar_url"
                 [src]="approveModal().user?.avatar_url"
                 [alt]="approveModal().user?.username"
                 referrerpolicy="no-referrer"
                 class="w-12 h-12 rounded-xl object-cover flex-shrink-0">
            <div class="min-w-0">
              <p class="font-black text-slate-800 truncate">
                {{ approveModal().user?.first_name || '' }} {{ approveModal().user?.last_name || '' }}
              </p>
              <p class="text-xs text-slate-500 font-medium truncate">{{ approveModal().user?.email }}</p>
              <span class="inline-flex items-center gap-1 mt-1">
                <svg viewBox="0 0 48 48" class="w-3 h-3"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.8 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8.1 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.9 1.1 8.1 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.3 35.4 26.8 36 24 36c-5.3 0-9.7-3.2-11.3-7.8l-6.5 5C9.6 39.6 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.2 5.2C41.2 36.1 44 30.5 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuenta Google</span>
              </span>
            </div>
          </div>

          <!-- Warning note -->
          <div class="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-8">
            <mat-icon class="text-amber-400 scale-75 flex-shrink-0 mt-0.5">info</mat-icon>
            <p class="text-xs text-amber-700 font-medium leading-relaxed">
              Una vez aprobado, el usuario podrá iniciar sesión inmediatamente con su cuenta de Google.
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-3">
            <button (click)="closeApproveModal()"
                    class="flex-1 py-3.5 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all text-sm">
              Cancelar
            </button>
            <button (click)="confirmApprove()"
                    [disabled]="isLoading()"
                    class="flex-1 py-3.5 rounded-2xl font-black text-white bg-emerald-500 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-500/30 disabled:opacity-60">
              <div *ngIf="isLoading()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <mat-icon *ngIf="!isLoading()" class="scale-90">check_circle</mat-icon>
              {{ isLoading() ? 'Aprobando...' : 'Sí, aprobar acceso' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════ -->
    <!-- MODAL: Confirmar eliminación de usuario       -->
    <!-- ══════════════════════════════════════════════ -->
    <div *ngIf="deleteModal().show"
         class="fixed inset-0 z-50 flex items-center justify-center p-4"
         (click)="closeDeleteModal()">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"></div>

      <!-- Card -->
      <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300"
           (click)="$event.stopPropagation()">

        <!-- Top accent bar -->
        <div class="h-1.5 bg-gradient-to-r from-red-400 to-rose-500"></div>

        <div class="p-8">
          <!-- Icon + title -->
          <div class="flex items-start gap-4 mb-6">
            <div class="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <mat-icon class="text-red-500 !text-3xl !w-8 !h-8">person_remove</mat-icon>
            </div>
            <div>
              <h3 class="text-xl font-black text-slate-900 leading-tight">Eliminar usuario</h3>
              <p class="text-sm text-slate-500 mt-1">Esta acción no se puede deshacer.</p>
            </div>
          </div>

          <p class="text-sm text-slate-600 mb-8 leading-relaxed">
            ¿Estás seguro de que deseas eliminar permanentemente este usuario del sistema?
          </p>

          <!-- Actions -->
          <div class="flex gap-3">
            <button (click)="closeDeleteModal()"
                    class="flex-1 py-3.5 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all text-sm">
              Cancelar
            </button>
            <button (click)="confirmDelete()"
                    [disabled]="isLoading()"
                    class="flex-1 py-3.5 rounded-2xl font-black text-white bg-red-500 hover:bg-red-600 transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-500/30 disabled:opacity-60">
              <div *ngIf="isLoading()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <mat-icon *ngIf="!isLoading()" class="scale-90">delete_forever</mat-icon>
              {{ isLoading() ? 'Eliminando...' : 'Sí, eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class UsersComponent implements OnInit {
  authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private api = inject(ApiService);

  users = signal<any[]>([]);
  roles = signal<any[]>([]);
  showForm = signal(false);
  isEditing = signal(false);
  editingUserId = signal<number | null>(null);
  isLoading = signal(false);
  showPassword = signal(false);

  // Mensajes de feedback
  successMsg = signal<string>('');
  errorMsg = signal<string>('');
  formError = signal<string>('');

  // Estado de los modales
  approveModal = signal<{ show: boolean; user: any | null }>({ show: false, user: null });
  deleteModal = signal<{ show: boolean; userId: number | null }>({ show: false, userId: null });

  userForm: FormGroup = this.fb.group({
    username: ['', Validators.required],
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    role: ['BODEGA', Validators.required]
  });

  ngOnInit() {
    this.loadUsers();
    this.loadRoles();
  }

  loadUsers() {
    this.authService.getUsers().subscribe({
      next: (users) => this.users.set(users),
      error: (err) => this.showError('Error al cargar usuarios: ' + this.parseError(err))
    });
  }

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  async loadRoles() {
    try {
      const roles = await firstValueFrom(this.api.getRoles());
      this.roles.set(roles);
    } catch (e) {
      console.error('Error cargando roles', e);
    }
  }

  onNewUser() {
    this.isEditing.set(false);
    this.editingUserId.set(null);
    this.userForm.reset({ role: 'BODEGA' });
    this.userForm.markAsUntouched();
    this.userForm.markAsPristine();
    this.formError.set('');
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.showForm.set(true);
  }

  onEdit(user: any) {
    this.isEditing.set(true);
    this.editingUserId.set(user.id);
    this.userForm.patchValue({
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.rol_entidad_nombre || user.role
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.userForm.markAsUntouched();
    this.formError.set('');
    this.showForm.set(true);
  }

  onCancel() {
    this.showForm.set(false);
    this.isEditing.set(false);
    this.editingUserId.set(null);
    this.formError.set('');
    this.userForm.reset();
  }

  onSubmit() {
    // Marcar todos los campos como tocados para mostrar errores
    this.userForm.markAllAsTouched();

    if (this.userForm.invalid) {
      this.formError.set('Por favor completa todos los campos obligatorios correctamente.');
      return;
    }

    this.formError.set('');
    this.isLoading.set(true);

    if (this.isEditing() && this.editingUserId()) {
      const data = { ...this.userForm.value };
      delete data.password;

      this.authService.updateUser(this.editingUserId()!, data).subscribe({
        next: () => this.handleSuccess('Usuario actualizado correctamente.'),
        error: (err) => {
          this.isLoading.set(false);
          this.formError.set(this.parseError(err));
        }
      });
    } else {
      this.authService.createUser(this.userForm.value).subscribe({
        next: () => this.handleSuccess('Cuenta creada exitosamente.'),
        error: (err) => {
          this.isLoading.set(false);
          this.formError.set(this.parseError(err));
        }
      });
    }
  }

  handleSuccess(msg: string) {
    this.isLoading.set(false);
    this.showForm.set(false);
    this.formError.set('');
    this.loadUsers();
    this.showSuccess(msg);
  }

  /** Convierte errores del backend (DRF) en un string legible */
  parseError(err: any): string {
    if (!err) return 'Error desconocido.';
    const data = err.error;
    if (!data) {
      if (err.status === 0) return 'No se pudo conectar con el servidor. Verifica tu conexión.';
      if (err.status === 401) return 'No tienes autorización. Inicia sesión nuevamente.';
      if (err.status === 403) return 'Acceso denegado. Se requieren permisos de administrador.';
      if (err.status === 500) return 'Error interno del servidor. Intenta nuevamente más tarde.';
      return `Error ${err.status || ''}: ${err.message || 'Error desconocido.'}`;
    }
    if (typeof data === 'string') return data;
    // DRF devuelve un objeto con claves -> arrays de mensajes
    const messages: string[] = [];
    for (const key of Object.keys(data)) {
      const vals = Array.isArray(data[key]) ? data[key] : [data[key]];
      const label = this.fieldLabel(key);
      for (const v of vals) {
        messages.push(label ? `<b>${label}:</b> ${v}` : String(v));
      }
    }
    return messages.join('<br>') || 'Error desconocido.';
  }

  fieldLabel(key: string): string {
    const map: Record<string, string> = {
      username: 'Username',
      email: 'Correo',
      password: 'Contraseña',
      first_name: 'Nombre',
      last_name: 'Apellido',
      role: 'Rol',
      non_field_errors: '',
      detail: ''
    };
    return map[key] ?? key;
  }

  /** Mensajes de error por campo para validaciones locales */
  isFieldInvalid(field: string): boolean {
    const ctrl = this.userForm.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  getFieldError(field: string): string {
    const ctrl = this.userForm.get(field);
    if (!ctrl || !ctrl.errors) return '';
    if (ctrl.errors['required']) return 'Este campo es obligatorio';
    if (ctrl.errors['email']) return 'Ingresa un correo electrónico válido';
    if (ctrl.errors['minlength']) {
      const min = ctrl.errors['minlength'].requiredLength;
      return `Mínimo ${min} caracteres requeridos`;
    }
    return 'Campo inválido';
  }

  showSuccess(msg: string) {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 4000);
  }

  showError(msg: string) {
    this.errorMsg.set(msg);
    setTimeout(() => this.errorMsg.set(''), 5000);
  }

  // ── Modal Aprobar ─────────────────────────────────────────────────────────
  openApproveModal(user: any) {
    this.approveModal.set({ show: true, user });
  }

  closeApproveModal() {
    this.approveModal.set({ show: false, user: null });
  }

  confirmApprove() {
    const user = this.approveModal().user;
    if (!user) return;
    this.isLoading.set(true);
    this.authService.approveUser(user.id).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.closeApproveModal();
        this.loadUsers();
        this.showSuccess('Usuario aprobado exitosamente.');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showError(this.parseError(err));
      }
    });
  }

  // ── Modal Eliminar ────────────────────────────────────────────────────────
  openDeleteModal(userId: number) {
    this.deleteModal.set({ show: true, userId });
  }

  closeDeleteModal() {
    this.deleteModal.set({ show: false, userId: null });
  }

  confirmDelete() {
    const id = this.deleteModal().userId;
    if (!id) return;
    this.isLoading.set(true);
    this.authService.deleteUser(id).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.closeDeleteModal();
        this.loadUsers();
        this.showSuccess('Usuario eliminado correctamente.');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showError(this.parseError(err));
      }
    });
  }
}
