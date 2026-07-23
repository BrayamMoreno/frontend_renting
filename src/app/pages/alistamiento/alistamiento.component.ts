import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { StorageService } from '../../services/storage';
import { ApiService } from '../../services/api';
import { AuthService, User } from '../../services/auth.service';
import { CameraComponent } from '../../components/camera/camera.component';
import { Alistamiento, InventarioItem } from '../../models/app-state';
import { ActaEntregaComponent, ActaEntregaData } from '../../components/reports/acta-entrega/acta-entrega';

@Component({
  selector: 'app-alistamiento',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, CameraComponent, ActaEntregaComponent],
  template: `
    <div class="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-right duration-500 pb-24">
      <div class="flex flex-col gap-1">
        <h2 class="text-3xl font-bold tracking-tight">Alistamiento Técnico</h2>
        <p class="text-slate-500">Asignación, trazabilidad y puesta a punto de activos.</p>
      </div>

      <!-- Tabs -->
      <div class="flex gap-4 border-b border-slate-200">
        <button (click)="activeTab.set('asignacion')" 
                class="px-6 py-3 font-bold transition-colors border-b-2"
                [class.border-brand]="activeTab() === 'asignacion'"
                [class.text-brand]="activeTab() === 'asignacion'"
                [class.border-transparent]="activeTab() !== 'asignacion'"
                [class.text-slate-500]="activeTab() !== 'asignacion'">
          Asignación y Trazabilidad
        </button>
        <button (click)="activeTab.set('ejecucion')" 
                class="px-6 py-3 font-bold transition-colors border-b-2"
                [class.border-brand]="activeTab() === 'ejecucion'"
                [class.text-brand]="activeTab() === 'ejecucion'"
                [class.border-transparent]="activeTab() !== 'ejecucion'"
                [class.text-slate-500]="activeTab() !== 'ejecucion'">
          Realizar Alistamiento
        </button>
      </div>

      <!-- TAB: ASIGNACIÓN Y TRAZABILIDAD -->
      <div *ngIf="activeTab() === 'asignacion'" class="space-y-6 animate-in fade-in duration-300">
        
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-bold text-slate-800">Equipos Pendientes de Alistamiento</h3>
          <div class="flex gap-2">
             <input [(ngModel)]="filterText" placeholder="Buscar por serial o marca..." class="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-brand">
          </div>
        </div>

        <div class="card p-0 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                  <th class="p-4 font-bold">Equipo</th>
                  <th class="p-4 font-bold">Estado</th>
                  <th class="p-4 font-bold">Técnico Asignado</th>
                  <th class="p-4 font-bold">Tiempo Transcurrido</th>
                  <th *ngIf="authService.hasPermission('gestionar_usuarios')" class="p-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-sm">
                <tr *ngFor="let item of equiposPendientes()" class="hover:bg-slate-50/50 transition-colors">
                  <td class="p-4">
                    <div class="font-bold text-slate-800">{{ item.serial }}</div>
                    <div class="text-xs text-slate-500">{{ item.marca }} {{ item.modelo }}</div>
                    <div *ngIf="item.item" class="text-[10px] font-bold text-brand/70 mt-0.5">#Ítem {{ item.item }}</div>
                  </td>
                  <td class="p-4">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider"
                          [class.bg-amber-100]="item.estado === 'RECIBIDO'"
                          [class.text-amber-700]="item.estado === 'RECIBIDO'"
                          [class.bg-brand/10]="item.estado === 'ALISTAMIENTO'"
                          [class.text-brand]="item.estado === 'ALISTAMIENTO'">
                      {{ item.estado }}
                    </span>
                  </td>
                  <td class="p-4">
                    <div *ngIf="item.tecnico_asignado_nombre" class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {{ item.tecnico_asignado_nombre.charAt(0).toUpperCase() }}
                      </div>
                      <span class="font-medium text-slate-700">{{ item.tecnico_asignado_nombre }}</span>
                    </div>
                    <span *ngIf="!item.tecnico_asignado_nombre" class="text-slate-400 italic text-xs">Sin asignar</span>
                  </td>
                  <td class="p-4">
                    <div class="flex items-center gap-1 text-slate-600 font-medium" *ngIf="item.fecha_asignacion_alistamiento">
                      <mat-icon class="scale-75 text-slate-400">schedule</mat-icon>
                      {{ getTiempoTranscurrido(item.fecha_asignacion_alistamiento) }}
                    </div>
                    <span *ngIf="!item.fecha_asignacion_alistamiento" class="text-slate-300">-</span>
                  </td>
                  <td *ngIf="authService.hasPermission('gestionar_usuarios')" class="p-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <select [(ngModel)]="asignacionesDraft[item.serial]" class="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-brand bg-white min-w-[150px]">
                        <option [ngValue]="undefined">Seleccionar técnico...</option>
                        <option *ngFor="let u of tecnicos()" [ngValue]="u.id">{{ u.first_name }} {{ u.last_name }} ({{ u.username }})</option>
                      </select>
                      <button (click)="asignarAlistamiento(item)" 
                              [disabled]="!asignacionesDraft[item.serial] || asignacionesDraft[item.serial] === item.tecnico_asignado"
                              class="btn-primary py-1.5 px-3 text-xs flex items-center gap-1 disabled:opacity-50">
                        <mat-icon class="scale-75">assignment_ind</mat-icon> Asignar
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="equiposPendientes().length === 0">
                  <td colspan="5" class="p-8 text-center text-slate-400">
                    No hay equipos pendientes de alistamiento.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB: EJECUCIÓN -->
      <div *ngIf="activeTab() === 'ejecucion'" class="space-y-6 animate-in fade-in duration-300">
        <!-- Mis Asignaciones (si hay) -->
        <div *ngIf="!selectedAsset() && misEquiposAsignados().length > 0" class="card space-y-4 mb-8">
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <mat-icon class="text-brand">assignment_ind</mat-icon>
            Mis Equipos Asignados
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <div *ngFor="let item of misEquiposAsignados()" class="border border-slate-200 rounded-xl p-4 hover:border-brand/50 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div class="flex justify-between items-start mb-2">
                  <span class="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand/10 text-brand">{{ item.estado }}</span>
                  <span class="text-xs text-slate-500 font-medium" *ngIf="item.fecha_asignacion_alistamiento">Hace {{ getTiempoTranscurrido(item.fecha_asignacion_alistamiento) }}</span>
                </div>
                <h4 class="font-bold text-slate-800 text-lg leading-tight">{{ item.serial }}</h4>
                <p class="text-sm text-slate-500">{{ item.marca }} {{ item.modelo }}</p>
                <p *ngIf="item.item" class="text-xs font-bold text-brand/70 mt-0.5">#Ítem {{ item.item }}</p>
              </div>
              <button (click)="iniciarAlistamiento(item.serial)" class="mt-4 w-full btn-primary py-2 text-sm flex justify-center items-center gap-2">
                <mat-icon class="scale-75">play_circle</mat-icon> Iniciar Alistamiento
              </button>
            </div>
          </div>
        </div>

        <!-- Buscar Activo -->
        <div *ngIf="!selectedAsset()" class="card space-y-4">
          <h3 class="text-lg font-semibold">1. Buscar Activo Asignado</h3>
          <p class="text-sm text-slate-500">Ingrese el serial del activo que le ha sido asignado para alistamiento.</p>
          <div class="flex gap-4">
            <input [(ngModel)]="searchSerial"
                  type="text"
                  placeholder="Ingrese serial o número de ítem..."
                  style="text-transform: uppercase;"
                  class="flex-1 px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  (keydown.enter)="search()">
            <button (click)="search()" class="btn-primary flex items-center gap-2">
              <mat-icon>search</mat-icon>
              Buscar
            </button>
          </div>
          <p *ngIf="searchError" class="text-sm text-red-500 font-medium">{{ searchError }}</p>
        </div>

        <!-- Proceso de Alistamiento -->
        <div *ngIf="selectedAsset()" class="space-y-6">
          <div class="card p-6 border-l-8 border-l-brand flex items-center justify-between shadow-sm mb-8">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-orange-50 text-brand rounded-lg flex items-center justify-center">
                <mat-icon>computer</mat-icon>
              </div>
              <div *ngIf="selectedAsset() as asset">
                <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Equipo Seleccionado</p>
                <h4 class="text-xl font-bold mb-0 text-slate-800">{{ asset.serial }} — {{ asset.marca }} {{ asset.modelo }}</h4>
                <p class="text-xs text-slate-500 mt-0.5 font-medium">
                  {{ asset.tipo_producto }} | {{ asset.ubicacion || 'Sin ubicación' }}
                  <span *ngIf="asset.item" class="ml-2 font-bold text-brand/80">· #Ítem {{ asset.item }}</span>
                </p>
              </div>
            </div>
            <button (click)="cancel()" class="text-slate-300 hover:text-red-500 transition-colors">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Paso A: Foto Técnico -->
          <div *ngIf="!tecnicoPhoto()" class="card space-y-4">
            <h3 class="text-lg font-bold text-slate-800">2. Identificación del Técnico</h3>
            <p class="text-sm text-slate-500 mb-6">Capture su biometría para certificar el Checklist.</p>
            <app-camera (photoCaptured)="tecnicoPhoto.set($event)"></app-camera>
          </div>

          <!-- Paso B: Checklist -->
          <div *ngIf="tecnicoPhoto()" class="card space-y-6">
            <div class="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
              <img [src]="tecnicoPhoto()" class="w-16 h-16 rounded-full object-cover border-2 border-brand ring-4 ring-orange-50">
              <div>
                <h3 class="font-bold text-slate-800 mb-1">Checklist Técnico Certificado</h3>
                <p class="text-sm text-slate-500">Operador: <strong>{{ authService.currentUser()?.first_name }} {{ authService.currentUser()?.last_name }}</strong></p>
              </div>
              <!-- Progress -->
              <div class="ml-auto text-right">
                <p class="text-2xl font-black text-brand">{{ completedCount() }}<span class="text-slate-300">/{{ activePuntos().length }}</span></p>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completados</p>
              </div>
            </div>

            <div *ngIf="isLoading()" class="py-12 text-center text-slate-400">
              <div class="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Cargando checklist...
            </div>

            <div class="space-y-6" *ngIf="!isLoading()">
              <div *ngFor="let punto of activePuntos(); let i = index"
                  [id]="'punto-' + punto.id"
                  class="rounded-xl border p-4 transition-all"
                  [class.border-red-300]="validationErrors()[punto.id]"
                  [class.bg-red-50/20]="validationErrors()[punto.id]"
                  [class.border-emerald-200]="isCompleted(punto.id) && !validationErrors()[punto.id]"
                  [class.bg-emerald-50/40]="isCompleted(punto.id) && !validationErrors()[punto.id]"
                  [class.border-slate-100]="!isCompleted(punto.id) && !validationErrors()[punto.id]">
                <div class="flex items-start gap-3">
                  <!-- Check circle -->
                  <div class="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                      [class.bg-emerald-500]="isCompleted(punto.id)"
                      [class.text-white]="isCompleted(punto.id)"
                      [class.bg-slate-100]="!isCompleted(punto.id)"
                      [class.text-slate-400]="!isCompleted(punto.id)">
                    <mat-icon class="scale-75">{{ isCompleted(punto.id) ? 'check' : 'radio_button_unchecked' }}</mat-icon>
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="font-bold text-slate-800 text-sm">{{ i + 1 }}. {{ punto.nombre }}</span>
                      <span *ngIf="punto.requiere_evidencia" class="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <mat-icon class="scale-[0.55]">photo_camera</mat-icon> Evidencia requerida
                      </span>
                    </div>
 
                    <!-- Yes/No buttons -->
                    <div class="flex gap-2 mb-2">
                      <button (click)="setAnswer(punto.id, 'SI')"
                              class="px-4 py-1.5 rounded-lg font-bold text-xs transition-all"
                              [class.bg-emerald-500]="answers()[punto.id]?.valor === 'SI'"
                              [class.text-white]="answers()[punto.id]?.valor === 'SI'"
                              [class.shadow-sm]="answers()[punto.id]?.valor === 'SI'"
                              [class.bg-slate-100]="answers()[punto.id]?.valor !== 'SI'"
                              [class.text-slate-600]="answers()[punto.id]?.valor !== 'SI'">✓ Cumple</button>
                      <button (click)="setAnswer(punto.id, 'NO')"
                              class="px-4 py-1.5 rounded-lg font-bold text-xs transition-all"
                              [class.bg-red-500]="answers()[punto.id]?.valor === 'NO'"
                              [class.text-white]="answers()[punto.id]?.valor === 'NO'"
                              [class.bg-slate-100]="answers()[punto.id]?.valor !== 'NO'"
                              [class.text-slate-600]="answers()[punto.id]?.valor !== 'NO'">✗ No cumple</button>
                      <button (click)="setAnswer(punto.id, 'NA')"
                              class="px-4 py-1.5 rounded-lg font-bold text-xs transition-all"
                              [class.bg-slate-500]="answers()[punto.id]?.valor === 'NA'"
                              [class.text-white]="answers()[punto.id]?.valor === 'NA'"
                              [class.bg-slate-100]="answers()[punto.id]?.valor !== 'NA'"
                              [class.text-slate-600]="answers()[punto.id]?.valor !== 'NA'">N/A</button>
                    </div>
 
                    <!-- Observaciones -->
                    <textarea *ngIf="answers()[punto.id]?.valor"
                              [(ngModel)]="observaciones[punto.id]"
                              class="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-brand resize-none"
                              rows="2"
                              placeholder="Observaciones (opcional)..."></textarea>
 
                    <!-- Evidencia -->
                    <div *ngIf="punto.requiere_evidencia && answers()[punto.id]?.valor" class="mt-2">
                      <div *ngIf="!evidencias()[punto.id]" class="flex items-center gap-2">
                        <input type="file" [id]="'file-' + punto.id" class="hidden" accept="image/*"
                              (change)="capturarEvidencia(punto.id, $event)">
                        <label [for]="'file-' + punto.id"
                              class="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-amber-100 flex items-center gap-1">
                          <mat-icon class="scale-75">upload</mat-icon> Subir foto de evidencia
                        </label>
                      </div>
                      <img *ngIf="evidencias()[punto.id]" [src]="evidencias()[punto.id]"
                          class="h-20 rounded-lg border-2 border-emerald-200 object-cover cursor-pointer"
                          (click)="removeEvidencia(punto.id)"
                          title="Clic para eliminar">
                    </div>

                    <!-- Mensaje de Validación -->
                    <div *ngIf="validationErrors()[punto.id]" class="mt-2.5 text-xs text-red-600 font-bold flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 w-fit">
                      <mat-icon class="scale-75 text-red-500">error_outline</mat-icon>
                      {{ validationErrors()[punto.id] }}
                    </div>
                  </div>
                </div>
              </div>
 
              <!-- Observaciones generales -->
              <div class="border-t pt-4">
                <label class="font-bold text-slate-800 block mb-2">Observaciones Generales</label>
                <textarea [(ngModel)]="observacionesGenerales"
                          class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                          rows="3"
                          placeholder="Cualquier observación general sobre el equipo..."></textarea>
              </div>
 
              <div class="flex justify-between items-center pt-4 border-t">
                <div class="text-sm text-slate-500">
                  <span class="font-bold text-slate-800">{{ completedCount() }}</span> de
                  <span class="font-bold text-slate-800">{{ activePuntos().length }}</span> puntos completados
                </div>
                <div class="flex items-center gap-4">
                  <span *ngIf="missingEvidences() || completedCount() < activePuntos().length" class="text-xs text-red-500 font-bold bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 animate-pulse">
                    Checklist incompleto o sin evidencias
                  </span>
                  <button (click)="saveAlistamiento()"
                          class="btn-primary flex items-center gap-2">
                    <mat-icon>save</mat-icon>
                    Finalizar Alistamiento
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── CONFIRMACIÓN DE FINALIZACIÓN ────────── -->
      <div *ngIf="confirmingSave()" 
           class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="confirmingSave.set(false)"></div>
        
        <div class="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
          <div class="bg-amber-500 p-8 text-white text-center">
            <div class="w-20 h-20 bg-white/20 rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <mat-icon class="scale-[2] -rotate-12">fact_check</mat-icon>
            </div>
            <h3 class="text-2xl font-black mb-2">¿Finalizar Alistamiento?</h3>
            <p class="text-amber-50 text-sm">Se registrarán los {{ completedCount() }} puntos del checklist como registro inmutable.</p>
          </div>

          <div class="p-8 space-y-6">
            <div class="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-center gap-3">
              <mat-icon class="text-amber-600">info</mat-icon>
              <p class="text-xs text-amber-800 font-medium">Una vez finalizado, el equipo quedará automáticamente marcado como <strong>DISPONIBLE</strong>.</p>
            </div>

            <div class="flex flex-col gap-3">
              <button (click)="executeSave()" 
                      class="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-amber-200 transition-all flex items-center justify-center gap-2">
                <mat-icon>save</mat-icon>
                Guardar y Finalizar
              </button>
              <button (click)="confirmingSave.set(false)" 
                      class="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-2xl font-bold transition-all">
                Seguir Revisando
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── POPUP: CREACIÓN DE ACTA DE ENTREGA ────────── -->
      <div *ngIf="showActaModal() && !actaPreviewData()" 
           class="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="closeActaModal()"></div>
        
        <div class="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
          <div class="bg-brand p-8 text-white text-center">
            <div class="w-20 h-20 bg-white/20 rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <mat-icon class="scale-[2] -rotate-12">description</mat-icon>
            </div>
            <h3 class="text-2xl font-black mb-2">Generar Acta de Entrega</h3>
            <p class="text-orange-50 text-sm">Ingrese los datos del destinatario para generar el acta lista para imprimir.</p>
          </div>

          <div class="p-8 space-y-6">
            <div class="space-y-4">
              <div class="space-y-1">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre Completo de quien recibe *</label>
                <input [(ngModel)]="actaNombre" placeholder="Ej: Brayam Moreno" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-sm text-slate-700">
              </div>

              <div class="space-y-1">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Cédula / Documento de Identidad *</label>
                <input [(ngModel)]="actaCedula" placeholder="Ej: 1020304050" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-sm text-slate-700">
              </div>

              <div class="space-y-1">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Empresa *</label>
                <input [(ngModel)]="actaEmpresa" placeholder="Ej: AutoMás S.A." class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-sm text-slate-700">
              </div>

              <div class="space-y-1">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nota de entrega</label>
                <textarea [(ngModel)]="actaNotaEntrega" placeholder="Ej: Observaciones de la entrega..." class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-sm text-slate-700 h-24 resize-none"></textarea>
              </div>
            </div>

            <div class="flex flex-col gap-3">
              <button (click)="showActaEntregaPreview()" 
                      [disabled]="!actaNombre.trim() || !actaCedula.trim() || !actaEmpresa.trim()"
                      class="w-full bg-brand hover:bg-brand-dark disabled:opacity-50 text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand/20 transition-all flex items-center justify-center gap-2">
                <mat-icon>visibility</mat-icon>
                Ver Acta de Entrega
              </button>
              <button (click)="closeActaModal()" 
                      class="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-2xl font-bold transition-all">
                Cerrar sin Generar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── VISTA PREVIA DEL ACTA DE ENTREGA ────────── -->
      <div *ngIf="actaPreviewData()" class="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-[2rem] shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto relative animate-in zoom-in-95 duration-300">
          <app-acta-entrega [data]="actaPreviewData()" (close)="closeActaPreview()"></app-acta-entrega>
        </div>
      </div>

      <!-- ── NOTIFICACIÓN DE ÉXITO ────────── -->
      <div *ngIf="showSuccess()" 
           class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
        <div class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
          <mat-icon class="scale-75">check</mat-icon>
        </div>
        <div>
          <p class="text-sm font-bold">Alistamiento Guardado</p>
          <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">El equipo ahora está disponible</p>
        </div>
      </div>
    </div>
  `
})
export class AlistamientoComponent implements OnInit, OnDestroy {
  private storage = inject(StorageService);
  private api = inject(ApiService);
  authService = inject(AuthService);

  activeTab = signal<'asignacion' | 'ejecucion'>('asignacion');

  searchSerial = '';
  searchError = '';

  selectedAsset = signal<InventarioItem | undefined>(undefined);
  tecnicoPhoto = signal('');
  isLoading = signal(false);

  activePuntos = signal<any[]>([]);
  tiposProducto = signal<any[]>([]);
  answers = signal<Record<string, { valor: string }>>({});
  observaciones: Record<string, string> = {};
  evidencias = signal<Record<string, string>>({});
  observacionesGenerales = '';
  
  confirmingSave = signal(false);
  showSuccess = signal(false);
  showActaModal = signal(false);
  actaPreviewData = signal<ActaEntregaData | null>(null);

  // Form fields for the receipt certificate:
  actaNombre = '';
  actaCedula = '';
  actaEmpresa = '';
  actaNotaEntrega = '';
  completedAlistamientoData: any = null;
  completedAssetData: any = null;

  validationErrors = signal<Record<number, string>>({});

  tecnicos = signal<User[]>([]);
  filterText = '';
  asignacionesDraft: Record<string, number | undefined> = {};
  private timerInterval: any;
  currentDate = signal<Date>(new Date());

  completedCount = computed(() => Object.keys(this.answers()).filter(k => this.answers()[k]?.valor).length);

  missingEvidences = computed(() => {
    return this.activePuntos().some(p => {
      if (p.requiere_evidencia && this.answers()[p.id]?.valor) {
        return !this.evidencias()[p.id];
      }
      return false;
    });
  });

  misEquiposAsignados = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return [];
    return this.equiposPendientes().filter(item => item.tecnico_asignado === currentUserId);
  });

  equiposPendientes = computed(() => {
    const inventario = this.storage.inventario();
    const tipos = this.tiposProducto();
    
    return inventario.filter(item => {
      if (item.estado !== 'RECIBIDO' && item.estado !== 'ALISTAMIENTO') return false;
      const tipoConfig = tipos.find(t => t.nombre === item.tipo_producto);
      if (tipoConfig && !tipoConfig.requiere_alistamiento) return false;
      if (this.filterText) {
        const text = this.filterText.toLowerCase();
        return item.serial.toLowerCase().includes(text) || 
               item.marca.toLowerCase().includes(text) ||
               (item.tecnico_asignado_nombre || '').toLowerCase().includes(text);
      }
      return true;
    }).sort((a, b) => {
      const dateA = a.fecha_ingreso ? new Date(a.fecha_ingreso).getTime() : 0;
      const dateB = b.fecha_ingreso ? new Date(b.fecha_ingreso).getTime() : 0;
      return dateA - dateB;
    });
  });

  ngOnInit() {
    this.isLoading.set(true);
    this.api.getTiposProducto().subscribe(res => this.tiposProducto.set(res));
    this.api.getPuntosAlistamiento().subscribe(res => {
      const sorted = res.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
      this.activePuntos.set(sorted.filter((p: any) => p.activo));
    });
    this.authService.getUsers().subscribe(users => {
      this.tecnicos.set(users);
      this.isLoading.set(false);
    });
    this.storage.loadInventarioFromApi().then(() => {
      this.initDrafts();
    });

    this.timerInterval = setInterval(() => {
      this.currentDate.set(new Date());
    }, 60000);
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  initDrafts() {
    const drafts: Record<string, number | undefined> = {};
    this.storage.inventario().forEach(item => {
      drafts[item.serial] = item.tecnico_asignado;
    });
    this.asignacionesDraft = drafts;
  }

  async asignarAlistamiento(item: InventarioItem) {
    const tecnicoId = this.asignacionesDraft[item.serial];
    if (!tecnicoId) return;
    const tecnico = this.tecnicos().find(t => t.id === tecnicoId);
    if (!tecnico) return;

    try {
      await this.storage.assignAlistamiento(item.serial, tecnico.id, tecnico.username);
    } catch (e) {
      console.error('Error al asignar', e);
    }
  }

  getTiempoTranscurrido(fechaStr: string | undefined): string {
    if (!fechaStr) return '';
    const now = this.currentDate().getTime();
    const start = new Date(fechaStr).getTime();
    const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return `${diffDays} día${diffDays !== 1 ? 's' : ''}`;
  }

  iniciarAlistamiento(serial: string) {
    this.searchSerial = serial;
    this.search();
  }

  isCompleted(id: number): boolean {
    return !!this.answers()[id]?.valor;
  }

  search() {
    this.searchSerial = this.searchSerial.trim().toUpperCase();
    const asset = this.storage.getAsset(this.searchSerial);
    if (!asset) {
      this.searchError = 'Serial o ítem no encontrado en inventario.';
      return;
    }

    const tipoConfig = this.tiposProducto().find(t => t.nombre === asset.tipo_producto);
    if (tipoConfig && !tipoConfig.requiere_alistamiento) {
      this.searchError = `Los equipos de tipo "${asset.tipo_producto}" no requieren alistamiento técnico.`;
      return;
    }

    if (asset.estado !== 'RECIBIDO' && asset.estado !== 'ALISTAMIENTO') {
      this.searchError = 'El alistamiento solo se puede realizar a equipos que estén en estado Recibido o en Alistamiento.';
      return;
    }

    const currentUserId = this.authService.currentUser()?.id;
    if (asset.tecnico_asignado && asset.tecnico_asignado !== currentUserId) {
       this.searchError = `Atención: Este equipo está asignado a ${asset.tecnico_asignado_nombre}. Asegúrese de tener permiso para realizar este alistamiento.`;
    } else {
       this.searchError = '';
    }

    this.selectedAsset.set(asset);
  }

  cancel() {
    this.selectedAsset.set(undefined);
    this.tecnicoPhoto.set('');
    this.answers.set({});
    this.observaciones = {};
    this.evidencias.set({});
    this.observacionesGenerales = '';
    this.validationErrors.set({});
  }

  setAnswer(id: number, valor: string) {
    this.answers.update(a => ({ ...a, [id]: { valor } }));
    if (this.validationErrors()[id]) {
      this.validationErrors.update(errors => {
        const next = { ...errors };
        delete next[id];
        return next;
      });
    }
  }

  capturarEvidencia(id: number, event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => { 
      this.evidencias.update(ev => ({ ...ev, [id]: e.target.result }));
      if (this.validationErrors()[id]) {
        this.validationErrors.update(errors => {
          const next = { ...errors };
          delete next[id];
          return next;
        });
      }
    };
    reader.readAsDataURL(file);
  }

  removeEvidencia(id: number) {
    this.evidencias.update(ev => {
      const newEv = { ...ev };
      delete newEv[id];
      return newEv;
    });
  }

  scrollToPunto(puntoId: number, reason: 'unanswered' | 'missing-evidence') {
    const msg = reason === 'unanswered' ? 'Por favor, responde este punto.' : 'Este punto requiere evidencia fotográfica.';
    this.validationErrors.update(errors => ({ ...errors, [puntoId]: msg }));
 
    setTimeout(() => {
      const element = document.getElementById(`punto-${puntoId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-red-500', 'border-red-200');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-red-500', 'border-red-200');
        }, 3000);
      }
    }, 50);
  }

  saveAlistamiento() {
    this.validationErrors.set({});
 
    const firstUnanswered = this.activePuntos().find(p => !this.answers()[p.id]?.valor);
    if (firstUnanswered) {
      this.scrollToPunto(firstUnanswered.id, 'unanswered');
      return;
    }
 
    const firstMissingEv = this.activePuntos().find(p => {
      if (p.requiere_evidencia && this.answers()[p.id]?.valor) {
        return !this.evidencias()[p.id];
      }
      return false;
    });
    if (firstMissingEv) {
      this.scrollToPunto(firstMissingEv.id, 'missing-evidence');
      return;
    }
 
    this.confirmingSave.set(true);
  }

  async executeSave() {
    this.confirmingSave.set(false);
    const respuestas: Record<string, any> = {};
    this.activePuntos().forEach(p => {
      respuestas[p.id] = {
        nombre: p.nombre,
        valor: this.answers()[p.id]?.valor || 'SIN_RESPONDER',
        observacion: this.observaciones[p.id] || '',
        evidencia: this.evidencias()[p.id] || null
      };
    });

    const alistamiento: Alistamiento = {
      id: crypto.randomUUID(),
      serial: this.selectedAsset()!.serial,
      inventario_item: this.selectedAsset()!._backendId!,
      tecnico: this.authService.currentUser()!.id,
      fecha: new Date().toISOString(),
      foto_tecnico: this.tecnicoPhoto(),
      respuestas,
      tecnico_nombre: `${this.authService.currentUser()?.first_name || ''} ${this.authService.currentUser()?.last_name || ''}`.trim()
    };

    try {
      await this.storage.addAlistamiento(alistamiento);
      this.completedAlistamientoData = alistamiento;
      this.completedAssetData = { ...this.selectedAsset()! };

      this.showSuccess.set(true);
      setTimeout(() => {
        this.showSuccess.set(false);
        this.showActaModal.set(true);
      }, 1500);
    } catch (e) {
      console.error('Error guardando alistamiento:', e);
    }
  }

  closeActaModal() {
    this.showActaModal.set(false);
    this.actaPreviewData.set(null);
    this.actaNombre = '';
    this.actaCedula = '';
    this.actaEmpresa = '';
    this.actaNotaEntrega = '';
    this.completedAlistamientoData = null;
    this.completedAssetData = null;
    this.cancel();
  }

  closeActaPreview() {
    this.actaPreviewData.set(null);
    this.closeActaModal();
  }

  showActaEntregaPreview() {
    if (!this.completedAlistamientoData || !this.completedAssetData) return;

    const asset = this.completedAssetData;
    const alistamiento = this.completedAlistamientoData;

    const allAssets = this.storage.inventario();
    const peripherals = allAssets.filter(a => a.equipo_asociado === asset._backendId);

    const data: ActaEntregaData = {
      asset: {
        item: asset.item,
        tipo_producto: asset.tipo_producto,
        marca: asset.marca,
        modelo: asset.modelo,
        procesador: asset.procesador,
        disco: asset.disco,
        tipo_disco: asset.tipo_disco,
        ram: asset.ram,
        serial: asset.serial,
        ubicacion: asset.ubicacion
      },
      peripherals: peripherals.map(p => ({
        item: p.item,
        tipo_producto: p.tipo_producto,
        marca: p.marca,
        modelo: p.modelo,
        serial: p.serial,
        estado: p.estado
      })),
      nombre: this.actaNombre,
      cedula: this.actaCedula,
      empresa: this.actaEmpresa,
      tecnicoNombre: alistamiento.tecnico_nombre,
      checklistData: alistamiento.respuestas,
      observaciones: this.observacionesGenerales || undefined,
      notaEntrega: this.actaNotaEntrega || undefined
    };

    // Mark laptop and associated peripherals as DISPONIBLE in the database
    this.storage.updateAssetStatus(asset.serial, 'DISPONIBLE');
    peripherals.forEach(p => {
      this.storage.updateAssetStatus(p.serial, 'DISPONIBLE');
    });

    this.actaPreviewData.set(data);
  }
}
