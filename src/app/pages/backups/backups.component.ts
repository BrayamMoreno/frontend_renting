import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-backups',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-6 md:p-10 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">

      <!-- Header Section -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              <mat-icon class="scale-110">backup</mat-icon>
            </div>
            <div>
              <h2 class="text-2xl font-black text-slate-800 tracking-tight">Copias de Seguridad</h2>
              <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Gestión de Backups Condicionales y Manuales</p>
            </div>
          </div>
          <p class="text-slate-500 text-sm max-w-2xl mt-2 leading-relaxed">
            El sistema monitorea en tiempo real los cambios registrados en el inventario. El <strong>Backup Condicional</strong> evalúa automáticamente si existen modificaciones desde la última copia antes de realizar el respaldo.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <button (click)="cargarBackups()" [disabled]="isLoading()"
                  class="px-5 py-3 rounded-2xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm transition-all flex items-center gap-2 border border-slate-200 shadow-sm disabled:opacity-50">
            <mat-icon class="scale-90" [class.animate-spin]="isLoading()">refresh</mat-icon>
            Actualizar Lista
          </button>
        </div>
      </div>

      <!-- General Status Card -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Status Indicator Card -->
        <div class="md:col-span-2 p-6 rounded-3xl border transition-all shadow-lg flex flex-col justify-between relative overflow-hidden"
             [ngClass]="hayCambiosPendientes() ? 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border-amber-200' : 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white border-emerald-200'">
          
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
                   [ngClass]="hayCambiosPendientes() ? 'bg-amber-500' : 'bg-emerald-500'">
                <mat-icon>{{ hayCambiosPendientes() ? 'warning_amber' : 'check_circle' }}</mat-icon>
              </div>
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest"
                      [ngClass]="hayCambiosPendientes() ? 'text-amber-600' : 'text-emerald-600'">
                  Estado del Backup Condicional
                </span>
                <h3 class="text-xl font-black text-slate-800">
                  {{ hayCambiosPendientes() ? 'Cambios Detectados — Respaldo Recomendado' : 'Sistema al Día — Sin Cambios Pendientes' }}
                </h3>
              </div>
            </div>

            <span class="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm"
                  [ngClass]="hayCambiosPendientes() ? 'bg-amber-500 text-white animate-pulse' : 'bg-emerald-100 text-emerald-800'">
              {{ hayCambiosPendientes() ? 'Requiere Backup' : 'Protegido' }}
            </span>
          </div>

          <p class="text-xs text-slate-600 my-4 leading-relaxed font-semibold">
            {{ hayCambiosPendientes() 
                ? 'Se han registrado movimientos (ingresos, alistamientos, bajas o devoluciones) posteriores al último respaldo generado. Al ejecutar un backup condicional, se creará una nueva copia con los cambios actualizados.'
                : 'La base de datos se encuentra sincronizada con la última copia de seguridad guardada. Si ejecutas un backup condicional en este momento, no se generará un archivo redundante.' 
            }}
          </p>

          <div class="flex flex-wrap items-center gap-6 pt-3 border-t border-slate-200/60 text-xs text-slate-500 font-bold">
            <div class="flex items-center gap-1.5">
              <mat-icon class="scale-75 text-slate-400">history</mat-icon>
              Último Cambio: <strong class="text-slate-800">{{ ultimoCambioFecha() ? (ultimoCambioFecha() | date:'medium') : 'Sin datos' }}</strong>
            </div>
            <div class="flex items-center gap-1.5">
              <mat-icon class="scale-75 text-slate-400">folder_zip</mat-icon>
              Total Respaldos: <strong class="text-slate-800">{{ backups().length }}</strong>
            </div>
          </div>
        </div>

        <!-- Quick Action Card -->
        <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between space-y-4">
          <div>
            <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Acciones Rápidas</h4>
            <h3 class="text-lg font-black text-slate-800">Generar Respaldo</h3>
            <p class="text-xs text-slate-500 mt-1">Selecciona el tipo de copia de seguridad que deseas ejecutar.</p>
          </div>

          <div class="space-y-3">
            <!-- Botón Backup Condicional -->
            <button (click)="ejecutarBackup('condicional')" [disabled]="isGenerating()"
                    style="background: linear-gradient(135deg, #FF6B00, #E65A00)"
                    class="w-full text-white p-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border-none cursor-pointer">
              <div *ngIf="isGenerating() && currentMode() === 'condicional'" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <mat-icon class="scale-90" *ngIf="!(isGenerating() && currentMode() === 'condicional')">alt_route</mat-icon>
              {{ isGenerating() && currentMode() === 'condicional' ? 'Evaluando y respaldando...' : 'Backup Condicional' }}
            </button>

            <!-- Botón Backup Forzado -->
            <button (click)="ejecutarBackup('manual')" [disabled]="isGenerating()"
                    class="w-full bg-slate-900 hover:bg-slate-800 text-white p-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-slate-900/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border-none cursor-pointer">
              <div *ngIf="isGenerating() && currentMode() === 'manual'" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <mat-icon class="scale-90" *ngIf="!(isGenerating() && currentMode() === 'manual')">save_as</mat-icon>
              {{ isGenerating() && currentMode() === 'manual' ? 'Generando copia...' : 'Forzar Copia Completa' }}
            </button>
          </div>
        </div>

      </div>

      <!-- Mensaje / Notificación de Resultado -->
      <div *ngIf="feedbackMessage()" class="p-4 rounded-2xl border animate-in slide-in-from-top-3 flex items-center justify-between"
           [ngClass]="feedbackType() === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : (feedbackType() === 'info' ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-red-50 border-red-200 text-red-900')">
        <div class="flex items-center gap-3 text-sm font-semibold">
          <mat-icon [ngClass]="feedbackType() === 'success' ? 'text-emerald-600' : (feedbackType() === 'info' ? 'text-blue-600' : 'text-red-600')">
            {{ feedbackType() === 'success' ? 'check_circle' : (feedbackType() === 'info' ? 'info' : 'error') }}
          </mat-icon>
          <span>{{ feedbackMessage() }}</span>
        </div>
        <button (click)="feedbackMessage.set('')" class="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer">
          <mat-icon class="scale-75">close</mat-icon>
        </button>
      </div>

      <!-- Table Section: Backups List -->
      <div class="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        
        <div class="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-black text-slate-800">Historial de Copias de Seguridad</h3>
            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Archivos almacenados en el servidor</p>
          </div>

          <div class="relative w-full sm:w-64">
            <input type="text" [(ngModel)]="filterQuery" placeholder="Buscar por archivo o usuario..."
                   class="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl outline-none focus:border-brand transition-all">
            <mat-icon class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 scale-75">search</mat-icon>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th class="px-6 py-4">Archivo / Nombre</th>
                <th class="px-6 py-4">Fecha de Creación</th>
                <th class="px-6 py-4">Tipo</th>
                <th class="px-6 py-4">Tamaño</th>
                <th class="px-6 py-4">Generado Por</th>
                <th class="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-xs">
              <tr *ngFor="let item of filteredBackups()" class="hover:bg-slate-50/60 transition-colors">
                
                <td class="px-6 py-4 font-mono font-bold text-slate-800">
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-amber-500 scale-90">folder_zip</mat-icon>
                    <span>{{ item.filename }}</span>
                  </div>
                </td>

                <td class="px-6 py-4 font-semibold text-slate-600">
                  {{ item.fecha_creacion | date:'medium' }}
                </td>

                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                        [ngClass]="item.modo === 'condicional' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700'">
                    {{ item.modo === 'condicional' ? 'Condicional' : 'Manual / Forzado' }}
                  </span>
                </td>

                <td class="px-6 py-4 font-mono font-bold text-slate-600">
                  {{ item.size_human || 'N/A' }}
                </td>

                <td class="px-6 py-4 font-semibold text-slate-700">
                  <div class="flex items-center gap-1.5">
                    <mat-icon class="scale-75 text-slate-400">person</mat-icon>
                    <span>{{ item.usuario || 'Sistema' }}</span>
                  </div>
                </td>

                <td class="px-6 py-4 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <!-- Download -->
                    <a [href]="api.descargarBackupUrl(item.filename)" target="_blank"
                       title="Descargar Respaldo"
                       class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center justify-center">
                      <mat-icon class="scale-85">download</mat-icon>
                    </a>

                    <!-- Delete -->
                    <button (click)="confirmarEliminacion(item.filename)"
                            title="Eliminar Respaldo"
                            class="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border-none transition-colors cursor-pointer inline-flex items-center justify-center">
                      <mat-icon class="scale-85">delete_outline</mat-icon>
                    </button>
                  </div>
                </td>

              </tr>

              <tr *ngIf="filteredBackups().length === 0">
                <td colspan="6" class="p-12 text-center text-slate-400">
                  <mat-icon class="scale-150 mb-2 text-slate-300">find_in_page</mat-icon>
                  <p class="font-bold text-sm text-slate-600">No se encontraron copias de seguridad</p>
                  <p class="text-xs text-slate-400 mt-1">Presiona "Backup Condicional" para generar la primera copia del sistema.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      <!-- Modal Confirmación de Eliminación -->
      <div *ngIf="backupToDelete() as filename" class="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
          
          <!-- Header -->
          <div class="p-6 bg-gradient-to-r from-red-600 to-rose-600 text-white text-center relative">
            <div class="w-16 h-16 bg-white/20 rounded-2xl rotate-12 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <mat-icon class="scale-[1.8] -rotate-12">delete_forever</mat-icon>
            </div>
            <h3 class="text-xl font-black mb-1">Eliminar Copia de Seguridad</h3>
            <p class="text-red-100 text-xs font-medium">Esta acción eliminará el archivo del servidor de forma permanente.</p>
          </div>

          <!-- Body -->
          <div class="p-6 text-center space-y-3">
            <p class="text-slate-600 text-sm leading-relaxed">
              ¿Estás seguro de que deseas eliminar la siguiente copia de seguridad?
            </p>
            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 font-mono text-xs text-slate-800 font-bold break-all">
              {{ filename }}
            </div>
          </div>

          <!-- Actions -->
          <div class="p-6 pt-0 flex gap-3">
            <button (click)="backupToDelete.set(null)" [disabled]="isDeleting()"
                    class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all border-none cursor-pointer">
              Cancelar
            </button>
            <button (click)="ejecutarEliminacion()" [disabled]="isDeleting()"
                    class="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 border-none cursor-pointer disabled:opacity-50">
              <div *ngIf="isDeleting()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <mat-icon class="scale-90" *ngIf="!isDeleting()">delete</mat-icon>
              {{ isDeleting() ? 'Eliminando...' : 'Sí, Eliminar' }}
            </button>
          </div>

        </div>
      </div>

    </div>
  `
})
export class BackupsComponent implements OnInit {
  public api = inject(ApiService);
  public auth = inject(AuthService);
  private router = inject(Router);

  backups = signal<any[]>([]);
  hayCambiosPendientes = signal<boolean>(false);
  ultimoCambioFecha = signal<string | null>(null);

  isLoading = signal<boolean>(false);
  isGenerating = signal<boolean>(false);
  isDeleting = signal<boolean>(false);
  backupToDelete = signal<string | null>(null);

  currentMode = signal<'condicional' | 'manual'>('condicional');
  filterQuery = '';

  feedbackMessage = signal<string>('');
  feedbackType = signal<'success' | 'info' | 'error'>('success');

  ngOnInit() {
    if (!this.auth.hasPermission('gestionar_usuarios')) {
      this.router.navigate(['/profile']);
      return;
    }
    this.cargarBackups();
  }

  cargarBackups() {
    this.isLoading.set(true);
    this.api.getBackups().subscribe({
      next: (res) => {
        this.backups.set(res.backups || []);
        this.hayCambiosPendientes.set(res.hay_cambios_pendientes);
        this.ultimoCambioFecha.set(res.ultimo_cambio?.ultima_fecha || null);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando backups:', err);
        this.isLoading.set(false);
      }
    });
  }

  ejecutarBackup(modo: 'condicional' | 'manual') {
    this.isGenerating.set(true);
    this.currentMode.set(modo);
    this.feedbackMessage.set('');

    this.api.generarBackup(modo).subscribe({
      next: (res) => {
        this.isGenerating.set(false);
        if (res.status === 'created') {
          this.feedbackType.set('success');
          this.feedbackMessage.set(res.message);
        } else if (res.status === 'no_changes') {
          this.feedbackType.set('info');
          this.feedbackMessage.set(res.message);
        } else {
          this.feedbackType.set('error');
          this.feedbackMessage.set(res.message || 'Error al generar respaldo.');
        }
        this.cargarBackups();
      },
      error: (err) => {
        this.isGenerating.set(false);
        this.feedbackType.set('error');
        this.feedbackMessage.set(err?.error?.detail || 'Error en el servidor al generar respaldo.');
      }
    });
  }

  confirmarEliminacion(filename: string) {
    this.backupToDelete.set(filename);
  }

  ejecutarEliminacion() {
    const filename = this.backupToDelete();
    if (!filename) return;

    this.isDeleting.set(true);
    this.api.eliminarBackup(filename).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.backupToDelete.set(null);
        this.feedbackType.set('success');
        this.feedbackMessage.set(`Respaldo "${filename}" eliminado correctamente.`);
        this.cargarBackups();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.feedbackType.set('error');
        this.feedbackMessage.set(err?.error?.detail || 'Error al eliminar respaldo.');
      }
    });
  }

  filteredBackups = computed(() => {
    const q = this.filterQuery.toLowerCase().trim();
    if (!q) return this.backups();
    return this.backups().filter(b => 
      (b.filename && b.filename.toLowerCase().includes(q)) ||
      (b.usuario && b.usuario.toLowerCase().includes(q)) ||
      (b.modo && b.modo.toLowerCase().includes(q))
    );
  });
}
