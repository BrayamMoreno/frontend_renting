import { Component, inject, computed, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage';
import { AuthService } from '../../services/auth.service';
import { Devolucion } from '../../models/app-state';
import { ActaDevolucionComponent } from '../../components/reports/acta-devolucion/acta-devolucion';

@Component({
  selector: 'app-historial-devoluciones',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, ActaDevolucionComponent, FormsModule],
  template: `
    <!-- Modales fuera del contenedor animado para evitar problemas con position: fixed y CSS transforms -->
    <!-- ── MODAL DE DETALLE DE LA DEVOLUCIÓN (NUEVO ADAPTADO) ────────── -->
    <div *ngIf="selectedDevolucion() as dev" 
         class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div class="relative bg-slate-900 shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col outline-none"
           style="border-radius: 2.5rem; background-color: #0f172a;">
        
        <!-- Header Modal -->
        <div class="bg-slate-900 text-white p-8 flex-shrink-0 flex justify-between items-center"
             style="border-top-left-radius: 2.5rem; border-top-right-radius: 2.5rem;">
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detalle del Lote</p>
            <h3 class="text-2xl font-black mb-1">Lote de Devolución #{{ dev.id }}</h3>
            <p class="text-xs text-slate-300">Creado el {{ dev.fecha_creacion | date:'medium' }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span *ngIf="dev.estado === 'CONFIRMADA'" class="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider">
              CONFIRMADA
            </span>
            <span *ngIf="dev.estado === 'PENDIENTE'" class="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider">
              EN TRÁNSITO
            </span>
            <button (click)="selectedDevolucion.set(null)" class="text-slate-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>

        <!-- Contenido Modal -->
        <div class="p-8 space-y-6 overflow-y-auto flex-1 bg-white">
          
          <!-- Sección de Novedades (Lo que acabamos de crear) -->
          <div class="border rounded-2xl p-6"
               [class.border-emerald-200]="!dev.tiene_novedad"
               [class.bg-emerald-50/20]="!dev.tiene_novedad"
               [class.border-red-200]="dev.tiene_novedad"
               [class.bg-red-50/20]="dev.tiene_novedad">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-sm font-bold uppercase tracking-wider flex items-center gap-2"
                  [class.text-emerald-700]="!dev.tiene_novedad"
                  [class.text-red-700]="dev.tiene_novedad">
                <mat-icon>{{ dev.tiene_novedad ? 'report_problem' : 'check_circle' }}</mat-icon>
                Estado de Recepción del Proveedor
              </h4>
              <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                    [class.bg-emerald-100]="!dev.tiene_novedad"
                    [class.text-emerald-800]="!dev.tiene_novedad"
                    [class.border-emerald-200]="!dev.tiene_novedad"
                    [class.bg-red-100]="dev.tiene_novedad"
                    [class.text-red-800]="dev.tiene_novedad"
                    [class.border-red-200]="dev.tiene_novedad">
                {{ dev.tiene_novedad ? 'CON NOVEDADES' : 'SIN NOVEDADES' }}
              </span>
            </div>

            <!-- Mensaje de Novedad -->
            <div *ngIf="dev.tiene_novedad" class="space-y-3">
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Novedad Reportada</p>
                <div class="mt-1 max-h-24 overflow-y-auto pr-1 break-words whitespace-pre-wrap">
                  <p class="text-sm text-slate-700 font-semibold leading-relaxed">{{ dev.mensaje_novedad }}</p>
                </div>
              </div>

              <!-- Documento Adjunto -->
              <div *ngIf="dev.documento_novedad" class="pt-2">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Documento / Evidencia Adjunta</p>
                
                <!-- Si es imagen, se muestra inline -->
                <div *ngIf="dev.documento_novedad.startsWith('data:image/'); else downloadBtn" class="relative group w-48 rounded-xl overflow-hidden border border-red-100 shadow-sm cursor-pointer"
                     (click)="verEvidenciaCompleta(dev.documento_novedad)">
                  <img [src]="dev.documento_novedad" class="w-full h-32 object-cover hover:scale-105 transition-transform duration-300" alt="Evidencia novedad">
                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-300">
                    <mat-icon class="scale-90">zoom_in</mat-icon>
                    <span class="text-[10px] font-bold ml-1">Ampliar Imagen</span>
                  </div>
                </div>
                <!-- Botón de descarga si no es imagen directamente visualizable -->
                <ng-template #downloadBtn>
                  <button (click)="descargarDocumento(dev.documento_novedad, dev.id)" class="text-xs font-bold text-red-700 bg-red-100/50 hover:bg-red-100 px-4 py-2 rounded-xl flex items-center gap-2 border border-red-200 transition-colors">
                    <mat-icon class="scale-75">download</mat-icon>
                    Descargar Documento Adjunto
                  </button>
                </ng-template>
              </div>
            </div>
            
            <div *ngIf="!dev.tiene_novedad">
              <p class="text-xs text-emerald-700 font-medium">El lote ha sido recibido sin ninguna novedad reportada por el proveedor. Todos los equipos se encuentran en óptimas condiciones de acuerdo con la validación.</p>
            </div>
          </div>

          <!-- Información General de Confirmación -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="border border-slate-100 bg-slate-50 rounded-2xl p-4">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Información de Custodia</p>
              <div class="mt-2 text-xs space-y-1.5 text-slate-600 font-medium">
                <p>Confirmado por: <strong class="text-slate-800">{{ dev.confirmado_por_nombre || 'Pendiente' }}</strong></p>
                <p>Fecha Confirmación: <strong class="text-slate-800">{{ (dev.fecha_confirmacion | date:'medium') || 'Pendiente' }}</strong></p>
              </div>
            </div>
            <div class="border border-slate-100 bg-slate-50 rounded-2xl p-4">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Observaciones Adicionales</p>
              <div class="mt-2 max-h-24 overflow-y-auto pr-1 break-words whitespace-pre-wrap">
                <p class="text-xs text-slate-600 italic leading-relaxed">
                  {{ dev.comentario_confirmacion ? '"' + dev.comentario_confirmacion + '"' : 'Sin observaciones adicionales registradas.' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Listado de Equipos -->
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Equipos en el Lote ({{ dev.items.length }})</p>
            <div class="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th class="px-4 py-3">Ítem / Serial</th>
                    <th class="px-4 py-3">Equipo</th>
                    <th class="px-4 py-3">Comentario Devolución</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  <tr *ngFor="let item of dev.items" class="hover:bg-orange-50/20 transition-colors">
                    <td class="px-4 py-3 font-mono">
                      <div class="font-bold text-brand">{{ item.serial }}</div>
                      <div class="text-[10px] text-slate-400 font-medium mt-0.5">Placa #{{ item.item || 'N/A' }}</div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-bold text-slate-800">{{ item.tipo_producto || 'No Definido' }}</div>
                      <div class="text-[10px] text-slate-500">{{ item.marca }} {{ item.modelo }}</div>
                    </td>
                    <td class="px-4 py-3 text-slate-600 italic">
                      {{ item.comentario_devolucion || 'Sin comentarios' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Evidencia Fotográfica del Acta -->
          <div *ngIf="dev.foto_receptor || dev.foto_entregador || dev.foto_alistador">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Evidencia Fotográfica de Entrega</p>
            <div class="grid grid-cols-3 gap-4">
              <div *ngIf="dev.foto_receptor" class="border border-slate-100 bg-slate-50 rounded-xl p-3 text-center">
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Receptor</p>
                <img [src]="dev.foto_receptor" class="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90" (click)="verEvidenciaCompleta(dev.foto_receptor)">
              </div>
              <div *ngIf="dev.foto_entregador" class="border border-slate-100 bg-slate-50 rounded-xl p-3 text-center">
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Entregador</p>
                <img [src]="dev.foto_entregador" class="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90" (click)="verEvidenciaCompleta(dev.foto_entregador)">
              </div>
              <div *ngIf="dev.foto_alistador" class="border border-slate-100 bg-slate-50 rounded-xl p-3 text-center">
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Alistador</p>
                <img [src]="dev.foto_alistador" class="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90" (click)="verEvidenciaCompleta(dev.foto_alistador)">
              </div>
            </div>
          </div>

        </div>

        <!-- Footer Modal -->
        <div class="p-8 border-t border-slate-100 bg-slate-50 flex-shrink-0 flex gap-3"
             style="border-bottom-left-radius: 2.5rem; border-bottom-right-radius: 2.5rem;">
          <button (click)="viewingActaDevolucion.set(dev)" 
                  class="flex-1 bg-brand hover:bg-brand-dark text-white py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2">
            <mat-icon>print</mat-icon>
            Ver Acta
          </button>
          <button (click)="downloadActa(dev)" 
                  class="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3.5 rounded-2xl font-bold transition-all flex items-center justify-center gap-2">
            <mat-icon>download</mat-icon>
            Descargar PDF
          </button>
          <button (click)="selectedDevolucion.set(null)" 
                  class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3.5 rounded-2xl font-bold transition-all">
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL DEL ACTA OFICIAL (OTRO LUGAR) ────────── -->
    <div *ngIf="viewingActaDevolucion() as dev" 
         class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white rounded-[2rem] shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto relative animate-in zoom-in-95 duration-300">
         <app-acta-devolucion [devolucion]="dev" (close)="viewingActaDevolucion.set(null)"></app-acta-devolucion>
      </div>
    </div>

    <!-- ── ACTA EN MODO DESCARGA AUTOMÁTICA (invisible) ────────── -->
    <div *ngIf="downloadingActa()" style="position:fixed;top:-9999px;left:-9999px;width:0;height:0;overflow:hidden;z-index:-1;">
      <app-acta-devolucion 
        [devolucion]="downloadingActa()" 
        [autoDownload]="true"
        (close)="downloadingActa.set(null)">
      </app-acta-devolucion>
    </div>

    <!-- ── LIGHTBOX PARA AMPLIAR IMAGEN DE EVIDENCIA/NOVEDAD ────────── -->
    <div *ngIf="expandedImage()" 
         class="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
         (click)="expandedImage.set('')">
      <img [src]="expandedImage()" class="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl animate-in zoom-in-95 duration-200">
      <button class="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl backdrop-blur-sm transition-colors"
              (click)="expandedImage.set('')">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <!-- Contenido Principal Animado -->
    <div class="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div class="flex flex-col gap-1">
        <h2 class="text-3xl font-bold tracking-tight">Historial de Devoluciones</h2>
        <p class="text-slate-500">Registro histórico de equipos retornados y confirmados.</p>
      </div>

      <div class="card p-0 overflow-hidden">
        <div class="p-6 border-b flex flex-col md:flex-row md:items-center justify-between bg-white gap-4">
           <div>
             <h3 class="text-xl font-semibold text-slate-800">Registros de Devolución</h3>
             <p class="text-xs text-slate-400 font-medium">Visualización completa de lotes en tránsito y confirmados.</p>
           </div>
           <div class="flex flex-wrap items-center gap-3">
             <div class="relative w-full sm:w-64">
               <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 scale-90">search</mat-icon>
               <input [(ngModel)]="searchQuery" (ngModelChange)="currentPage.set(1)"
                      type="text" 
                      placeholder="Buscar por #Lote o Serial..." 
                      class="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all">
             </div>

             <select [(ngModel)]="statusFilter" (ngModelChange)="currentPage.set(1)" 
                     class="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand cursor-pointer">
               <option value="">Todos los Estados</option>
               <option value="PENDIENTE">En Tránsito</option>
               <option value="CONFIRMADA">Confirmadas</option>
             </select>

             <div class="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-amber-100">
                <mat-icon class="scale-75">pending_actions</mat-icon>
                {{ pendingCount() }} Pendientes
             </div>
             <div class="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-emerald-100">
                <mat-icon class="scale-75">verified</mat-icon>
                {{ confirmedCount() }} Completadas
             </div>
           </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
              <tr>
                <th class="px-6 py-4 text-left">Lote</th>
                <th class="px-6 py-4 text-left">Fecha Creación</th>
                <th class="px-6 py-4 text-left">Responsable / Confirmación</th>
                <th class="px-6 py-4 text-center">Items</th>
                <th class="px-6 py-4 text-center">Estado</th>
                <th class="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              <tr *ngFor="let dev of paginatedDevoluciones()" class="hover:bg-slate-50 transition-colors group">
                <td class="px-6 py-4 text-center">
                   <div class="font-bold text-slate-700">#{{ dev.id }}</div>
                   <div class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{{ dev.items[0]?.marca }}...</div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-slate-700 font-medium">{{ dev.fecha_creacion | date:'shortDate' }}</div>
                  <div class="text-[10px] text-slate-400">{{ dev.fecha_creacion | date:'shortTime' }}</div>
                </td>
                <td class="px-6 py-4">
                   <div *ngIf="dev.estado === 'CONFIRMADA'; else pendingResp" class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-[10px] font-bold shadow-sm">
                         {{ dev.confirmado_por_nombre?.substring(0,2) | uppercase }}
                      </div>
                      <div>
                        <p class="font-bold text-slate-700 text-xs leading-none">{{ dev.confirmado_por_nombre }}</p>
                        <p class="text-[10px] text-slate-400 mt-1">{{ dev.fecha_confirmacion | date:'short' }}</p>
                      </div>
                   </div>
                   <ng-template #pendingResp>
                     <div class="flex items-center gap-2 opacity-40">
                        <div class="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                          <mat-icon class="scale-75">person_outline</mat-icon>
                        </div>
                        <span class="text-xs font-medium text-slate-400 italic">Esperando proveedor...</span>
                     </div>
                   </ng-template>
                </td>
                <td class="px-6 py-4 text-center">
                   <span class="px-2 py-1 bg-slate-100 rounded-md font-mono font-bold text-slate-600">{{ dev.items.length }}</span>
                </td>
                <td class="px-6 py-4 text-center">
                   <span *ngIf="dev.estado === 'CONFIRMADA'" class="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                      <mat-icon style="font-size: 12px; width: 12px; height: 12px;">verified</mat-icon>
                      Confirmada
                   </span>
                   <span *ngIf="dev.estado === 'PENDIENTE'" class="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-200">
                      <mat-icon style="font-size: 12px; width: 12px; height: 12px;">schedule</mat-icon>
                      En Tránsito
                   </span>
                </td>
                <td class="px-6 py-4 text-right">
                   <button (click)="selectedDevolucion.set(dev)" 
                           class="w-10 h-10 flex items-center justify-center text-brand hover:bg-orange-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100 group-hover:border-brand" 
                           title="Ver Detalle">
                      <mat-icon>visibility</mat-icon>
                   </button>
                </td>
              </tr>
              <tr *ngIf="filteredDevoluciones().length === 0">
                <td colspan="6" class="py-24 text-center text-slate-400 bg-slate-50/30">
                   <div class="flex flex-col items-center">
                     <div class="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-300 mb-4 rotate-12 group-hover:rotate-0 transition-transform">
                        <mat-icon class="scale-[2.5]">search_off</mat-icon>
                     </div>
                     <p class="text-xl font-black text-slate-300 uppercase tracking-widest">No hay resultados</p>
                     <p class="text-sm text-slate-400 mt-1">Intente con otro filtro o término de búsqueda.</p>
                   </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación Footer -->
        <div class="bg-white px-6 py-4 border-t border-slate-100 flex items-center justify-between">
           <div class="text-xs text-slate-400 font-medium italic">
             Mostrando {{ paginatedDevoluciones().length }} de {{ filteredDevoluciones().length }} registros
           </div>
           
           <div class="flex items-center gap-1">
             <button (click)="prevPage()" [disabled]="currentPage() === 1" 
                     class="p-2 rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <mat-icon class="scale-90">chevron_left</mat-icon>
             </button>
             <div class="flex items-center gap-1">
                <span class="w-8 h-8 flex items-center justify-center bg-brand text-white rounded-lg text-xs font-bold shadow-sm">{{ currentPage() }}</span>
                <span class="text-xs text-slate-400 font-bold mx-1">/</span>
                <span class="text-xs text-slate-600 font-bold">{{ totalPages() }}</span>
             </div>
             <button (click)="nextPage()" [disabled]="currentPage() === totalPages()" 
                     class="p-2 rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <mat-icon class="scale-90">chevron_right</mat-icon>
             </button>
           </div>
        </div>
      </div>
    </div>
  `
})
export class HistorialDevolucionesComponent implements OnInit {
  private storage = inject(StorageService);
  private auth = inject(AuthService);
  private router = inject(Router);

  constructor() {
    effect(() => {
      const dev = this.selectedDevolucion();
      const viewingActa = this.viewingActaDevolucion();
      const expandedImg = this.expandedImage();
      const isOpen = !!dev || !!viewingActa || !!expandedImg;
      
      if (typeof document !== 'undefined') {
        if (isOpen) {
          document.body.classList.add('overflow-hidden');
        } else {
          document.body.classList.remove('overflow-hidden');
        }
      }
    });
  }

  searchQuery = signal('');
  statusFilter = signal('');
  currentPage = signal(1);
  pageSize = signal(10);
  selectedDevolucion = signal<any | null>(null);

  // Nuevas señales para el flujo del acta y visualizador de novedad
  viewingActaDevolucion = signal<any | null>(null);
  downloadingActa = signal<any | null>(null);
  expandedImage = signal<string>('');

  allDevoluciones = computed(() => 
    [...this.storage.devoluciones()].sort((a, b) => b.id - a.id)
  );

  filteredDevoluciones = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    
    return this.allDevoluciones().filter(dev => {
      const matchesStatus = !status || dev.estado === status;
      const matchesQuery = !query || 
        dev.id.toString().includes(query) || 
        dev.items.some(i => i.serial.toLowerCase().includes(query) || i.marca.toLowerCase().includes(query));
      
      return matchesStatus && matchesQuery;
    });
  });

  paginatedDevoluciones = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredDevoluciones().slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.filteredDevoluciones().length / this.pageSize()) || 1);

  pendingCount = computed(() => 
    this.storage.devoluciones().filter(d => d.estado === 'PENDIENTE').length
  );

  confirmedCount = computed(() => 
    this.storage.devoluciones().filter(d => d.estado === 'CONFIRMADA').length
  );

  ngOnInit() {
    if (!this.auth.hasPermission('ver_inventario')) {
      this.router.navigate(['/profile']);
      return;
    }
    this.storage.loadDevolucionesFromApi();
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  verEvidenciaCompleta(url: string) {
    this.expandedImage.set(url);
  }

  descargarDocumento(base64: string, loteId: number) {
    const link = document.createElement('a');
    link.href = base64;
    link.download = `evidencia_novedad_lote_${loteId}`;
    link.click();
  }

  /**
   * Descarga el acta de devolución directamente como PDF
   * sin abrir el visor del acta en pantalla.
   */
  downloadActa(dev: any) {
    if (!dev) return;
    this.downloadingActa.set(dev);
    setTimeout(() => this.downloadingActa.set(null), 3000);
  }
}
