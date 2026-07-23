import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../services/api';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-right duration-500">
      <div class="flex flex-col gap-1">
        <h2 class="text-3xl font-bold tracking-tight text-slate-800">Gestión de Roles y Permisos</h2>
        <p class="text-slate-500 font-medium border-l-4 border-brand pl-4 py-1">Configure los niveles de acceso a cada módulo del sistema.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Listado de Roles -->
        <div class="lg:col-span-1 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Roles Existentes</h3>
            <button (click)="newRole()" class="bg-orange-50 text-brand hover:bg-brand hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border border-orange-100">
              <mat-icon class="scale-75">add_circle</mat-icon>
              Nuevo
            </button>
          </div>
          
          <div class="space-y-3">
            <div *ngFor="let rol of roles()" 
                 (click)="selectRole(rol)"
                 [class.border-brand]="selectedRole?.id === rol.id"
                 [class.bg-orange-50]="selectedRole?.id === rol.id"
                 [class.shadow-md]="selectedRole?.id === rol.id"
                 [class.translate-x-2]="selectedRole?.id === rol.id"
                 class="p-5 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:border-brand/50 hover:bg-slate-50 transition-all flex items-center justify-between group relative overflow-hidden">
              <div *ngIf="selectedRole?.id === rol.id" class="absolute left-0 top-0 bottom-0 w-1 bg-brand"></div>
              <div class="flex flex-col">
                 <span class="font-bold text-slate-700">{{ rol.nombre }}</span>
                 <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{{ rol.permisos.length }} Permisos Asignados</span>
              </div>
              <mat-icon class="text-slate-300 group-hover:text-brand transition-colors">security</mat-icon>
            </div>
            <div *ngIf="roles().length === 0" class="p-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 flex flex-col items-center gap-3">
              <mat-icon class="text-5xl opacity-20">admin_panel_settings</mat-icon>
              <span class="text-sm font-medium">No hay roles creados.</span>
            </div>
          </div>
        </div>

        <!-- Editor de Rol -->
        <div class="lg:col-span-2">
          <div *ngIf="selectedRole || isCreating" class="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
            <div class="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
               <div class="flex flex-col">
                  <h3 class="text-2xl font-bold text-slate-800">
                    {{ isCreating ? 'Crear Nuevo Rol' : 'Editando Rol' }}
                  </h3>
                  <p class="text-sm text-slate-500" *ngIf="!isCreating">{{ selectedRole?.nombre }}</p>
               </div>
               <div class="flex gap-3">
                  <button *ngIf="!isCreating" (click)="deleteRole()" class="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all" matTooltip="Eliminar Rol">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                  <button (click)="saveRole()" [disabled]="!roleName.trim()" class="bg-brand hover:bg-brand-dark text-white px-10 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-brand/30 disabled:opacity-50 active:scale-95">
                    <mat-icon class="scale-90">save</mat-icon>
                    Confirmar y Guardar
                  </button>
               </div>
            </div>

            <div class="p-8 space-y-10">
               <div class="space-y-2">
                 <label class="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre Identificador</label>
                 <input [(ngModel)]="roleName" placeholder="Ej: Gestor de Devoluciones" class="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-brand/10 focus:bg-white transition-all text-xl font-bold text-slate-700 placeholder:text-slate-300">
               </div>

               <div class="space-y-6">
                 <div class="flex items-center gap-3 border-b pb-4">
                    <div class="p-2 bg-orange-100 text-brand rounded-xl">
                       <mat-icon class="scale-90">rule</mat-icon>
                    </div>
                    <label class="text-sm font-bold text-slate-700 uppercase tracking-widest">Matriz de Permisos</label>
                 </div>
                 
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div *ngFor="let perm of allPermisos()" 
                        (click)="togglePermission(perm.id)"
                        class="group flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all hover:shadow-md"
                        [class.border-brand]="hasPermission(perm.id)"
                        [class.bg-orange-50/30]="hasPermission(perm.id)"
                        [class.border-slate-100]="!hasPermission(perm.id)">
                     
                     <div class="w-10 h-10 rounded-xl border flex items-center justify-center transition-all shrink-0"
                          [class.bg-brand]="hasPermission(perm.id)"
                          [class.border-brand]="hasPermission(perm.id)"
                          [class.shadow-lg]="hasPermission(perm.id)"
                          [class.shadow-orange-500/30]="hasPermission(perm.id)"
                          [class.bg-white]="!hasPermission(perm.id)"
                          [class.border-slate-200]="!hasPermission(perm.id)">
                       <mat-icon *ngIf="hasPermission(perm.id)" class="text-white scale-75">check</mat-icon>
                       <mat-icon *ngIf="!hasPermission(perm.id)" class="text-slate-300 scale-75 group-hover:text-slate-400 transition-colors">add</mat-icon>
                     </div>

                     <div class="flex flex-col min-w-0">
                        <span class="text-sm font-bold text-slate-700 truncate capitalize">{{ perm.nombre.split('_').join(' ') }}</span>
                        <span class="text-[10px] text-slate-500 leading-tight line-clamp-2">{{ perm.descripcion || 'Sin descripción' }}</span>
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>

          <div *ngIf="!selectedRole && !isCreating" class="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50 py-32 animate-in fade-in duration-500">
             <div class="text-center space-y-6">
                <div class="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto text-slate-200">
                   <mat-icon class="text-6xl">admin_panel_settings</mat-icon>
                </div>
                <div class="space-y-2">
                   <p class="text-xl font-bold text-slate-800">Panel de Seguridad</p>
                   <p class="text-slate-500 text-sm max-w-[280px] mx-auto">Seleccione un rol de la lista para ver sus privilegios o cree una nueva configuración.</p>
                </div>
                <button (click)="newRole()" class="bg-white hover:bg-slate-50 text-slate-700 px-8 py-3 rounded-2xl font-bold transition-all border border-slate-200 shadow-sm flex items-center gap-2 mx-auto">
                   <mat-icon class="text-brand">add_circle</mat-icon>
                   Crear Rol
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Modal Popup (Confirm/Alert) -->
    <div *ngIf="modal.show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" (click)="closeModal()"></div>
      
      <!-- Modal Content Card -->
      <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 p-8 flex flex-col items-center text-center">
        <!-- Icon Container based on type -->
        <div [ngClass]="{
          'bg-red-50 text-red-500 border border-red-100': modal.type === 'confirm' || modal.type === 'error',
          'bg-emerald-50 text-emerald-500 border border-emerald-100': modal.type === 'success'
        }" class="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
          <mat-icon class="scale-125">{{ modal.type === 'success' ? 'check_circle' : (modal.type === 'confirm' ? 'help_outline' : 'error_outline') }}</mat-icon>
        </div>

        <!-- Title & Description -->
        <h3 class="text-xl font-bold text-slate-800 mb-2">{{ modal.title }}</h3>
        <p class="text-slate-500 text-sm mb-8 leading-relaxed">{{ modal.message }}</p>

        <!-- Actions -->
        <div class="flex gap-3 w-full">
          <button *ngIf="modal.type === 'confirm'" (click)="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-2xl font-bold transition-all border border-slate-200 outline-none">
            Cancelar
          </button>
          <button (click)="confirmModalAction()" [ngClass]="{
            'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20': modal.type === 'confirm' || modal.type === 'error',
            'bg-brand hover:bg-brand-dark text-white shadow-lg shadow-brand/20': modal.type === 'success'
          }" class="flex-1 py-3.5 rounded-2xl font-bold transition-all outline-none">
            {{ modal.type === 'confirm' ? 'Eliminar' : 'Aceptar' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class RolesComponent implements OnInit {
  private api = inject(ApiService);

  roles = signal<any[]>([]);
  allPermisos = signal<any[]>([]);
  
  selectedRole: any = null;
  isCreating = false;
  roleName = '';
  selectedPermIds: number[] = [];

  modal = {
    show: false,
    type: 'success' as 'success' | 'error' | 'confirm',
    title: '',
    message: '',
    action: null as (() => void) | null
  };

  openModal(type: 'success' | 'error' | 'confirm', title: string, message: string, action: (() => void) | null = null) {
    this.modal = {
      show: true,
      type,
      title,
      message,
      action
    };
  }

  closeModal() {
    this.modal.show = false;
  }

  confirmModalAction() {
    if (this.modal.action) {
      this.modal.action();
    } else {
      this.closeModal();
    }
  }

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    try {
      const [r, p] = await Promise.all([
        firstValueFrom(this.api.getRoles()),
        firstValueFrom(this.api.getPermisos())
      ]);
      this.roles.set(r);
      this.allPermisos.set(p);
    } catch (e) {
      console.error('Error cargando roles/permisos', e);
    }
  }

  selectRole(rol: any) {
    this.isCreating = false;
    this.selectedRole = rol;
    this.roleName = rol.nombre;
    this.selectedPermIds = [...rol.permisos];
  }

  newRole() {
    this.isCreating = true;
    this.selectedRole = null;
    this.roleName = '';
    this.selectedPermIds = [];
  }

  hasPermission(id: number): boolean {
    return this.selectedPermIds.includes(id);
  }

  togglePermission(id: number) {
    if (this.hasPermission(id)) {
      this.selectedPermIds = this.selectedPermIds.filter(pid => pid !== id);
    } else {
      this.selectedPermIds.push(id);
    }
  }

  async saveRole() {
    const payload = {
      nombre: this.roleName,
      permisos: this.selectedPermIds
    };

    try {
      if (this.isCreating) {
        await firstValueFrom(this.api.createRol(payload));
      } else {
        await firstValueFrom(this.api.updateRol(this.selectedRole.id, payload));
      }
      this.openModal('success', 'Rol Guardado', 'El rol se ha guardado correctamente.');
      this.loadData();
      this.isCreating = false;
      this.selectedRole = null;
    } catch (e) {
      this.openModal('error', 'Error al Guardar', 'Hubo un problema al intentar guardar el rol.');
    }
  }

  deleteRole() {
    this.openModal(
      'confirm',
      '¿Eliminar Rol?',
      `¿Está seguro de que desea eliminar el rol "${this.selectedRole.nombre}"? Esta acción no se puede deshacer.`,
      async () => {
        try {
          await firstValueFrom(this.api.deleteRol(this.selectedRole.id));
          this.openModal('success', 'Rol Eliminado', 'El rol ha sido eliminado correctamente.');
          this.loadData();
          this.selectedRole = null;
        } catch (e) {
          this.openModal('error', 'Error al Eliminar', 'No se pudo eliminar el rol debido a un error.');
        }
      }
    );
  }
}
