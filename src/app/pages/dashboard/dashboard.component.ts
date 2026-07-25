import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, FormsModule],
  template: `
    <div class="space-y-8 animate-in fade-in duration-500">
      <div class="flex flex-col gap-1">
        <h2 class="text-3xl font-bold tracking-tight">Resumen Operativo</h2>
        <p class="text-slate-500">Estado actual del inventario, asignaciones y devoluciones.</p>
      </div>

      <!-- KPIs Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Figure 1: Total Activos -->
        <div class="relative overflow-hidden bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center group hover:shadow-md transition-all">
          <div class="absolute -right-6 -top-6 w-32 h-32 bg-slate-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <div class="relative z-10 w-20 h-20 rounded-[1.5rem] rotate-3 bg-slate-800 text-white flex items-center justify-center mb-4 shadow-lg shadow-slate-200 group-hover:rotate-6 transition-transform">
            <mat-icon class="scale-150 -rotate-3 group-hover:-rotate-6 transition-transform">inventory_2</mat-icon>
          </div>
          <div class="relative z-10">
            <p class="text-4xl font-black tracking-tight text-slate-800 mb-1">{{ totalAssets() }}</p>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Activos</p>
          </div>
        </div>

        <!-- Figure 2: Entregados -->
        <div class="relative overflow-hidden bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center group hover:shadow-md transition-all">
          <div class="absolute -left-6 -bottom-6 w-32 h-32 bg-blue-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <div class="relative z-10 w-20 h-20 rounded-full bg-blue-500 text-white flex items-center justify-center mb-4 shadow-lg shadow-blue-200 group-hover:-translate-y-1 transition-transform">
            <mat-icon class="scale-150">how_to_reg</mat-icon>
          </div>
          <div class="relative z-10">
            <p class="text-4xl font-black tracking-tight text-slate-800 mb-1">{{ entregados() }}</p>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entregados / En Uso</p>
          </div>
        </div>

        <!-- Figure 3: Disponibles -->
        <div class="relative overflow-hidden bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center group hover:shadow-md transition-all">
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-50 rounded-full group-hover:scale-125 transition-transform duration-500"></div>
          <div class="relative z-10 w-20 h-20 rounded-t-full rounded-bl-full rounded-br-lg bg-emerald-500 text-white flex items-center justify-center mb-4 shadow-lg shadow-emerald-200 group-hover:rotate-12 transition-transform">
            <mat-icon class="scale-150">check_circle</mat-icon>
          </div>
          <div class="relative z-10">
            <p class="text-4xl font-black tracking-tight text-slate-800 mb-1">{{ available() }}</p>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Disponibles</p>
          </div>
        </div>

        <!-- Figure 4: En Alistamiento -->
        <div class="relative overflow-hidden bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center group hover:shadow-md transition-all">
          <div class="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <div class="relative z-10 w-20 h-20 rounded-xl rotate-12 bg-amber-500 text-white flex items-center justify-center mb-4 shadow-lg shadow-amber-200 group-hover:rotate-0 transition-transform">
            <mat-icon class="scale-150 -rotate-12 group-hover:rotate-0 transition-transform">build</mat-icon>
          </div>
          <div class="relative z-10">
            <p class="text-4xl font-black tracking-tight text-slate-800 mb-1">{{ inPreparation() }}</p>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En Alistamiento</p>
          </div>
        </div>

        <!-- Figure 5: Pendientes Devolución -->
        <div class="relative overflow-hidden bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center group hover:shadow-md transition-all">
          <div class="absolute -top-6 -left-6 w-32 h-32 bg-purple-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <div class="relative z-10 w-20 h-20 rounded-full bg-purple-500 text-white flex items-center justify-center mb-4 shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
            <mat-icon class="scale-150">keyboard_return</mat-icon>
          </div>
          <div class="relative z-10">
            <p class="text-4xl font-black tracking-tight text-slate-800 mb-1">{{ pendientesDevolucion() }}</p>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pendientes Devolución</p>
          </div>
        </div>

        <!-- Figure 6: Total Recepciones -->
        <div class="relative overflow-hidden bg-orange-500 rounded-[2rem] p-6 shadow-sm border border-orange-600 flex flex-col items-center justify-center text-center group hover:shadow-md transition-all">
          <div class="absolute -right-8 -bottom-8 w-40 h-40 border-[20px] border-orange-600 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <div class="relative z-10 w-20 h-20 rounded-xl bg-white text-orange-600 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
            <mat-icon class="scale-150">move_to_inbox</mat-icon>
          </div>
          <div class="relative z-10">
            <p class="text-4xl font-black tracking-tight text-white mb-1">{{ totalRecepciones() }}</p>
            <p class="text-[10px] font-bold text-orange-100 uppercase tracking-widest">Recepciones (Ingresos)</p>
          </div>
        </div>
        
        <!-- Figure 7: Total Devoluciones -->
        <div class="relative overflow-hidden bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-900 flex flex-col items-center justify-center text-center group hover:shadow-md transition-all lg:col-span-2">
          <div class="absolute -left-8 -top-8 w-40 h-40 border-[20px] border-slate-700 rounded-full group-hover:scale-110 transition-transform duration-500 opacity-50"></div>
          <div class="absolute -right-8 -bottom-8 w-40 h-40 border-[20px] border-slate-700 rounded-full group-hover:scale-110 transition-transform duration-500 opacity-50"></div>
          <div class="relative z-10 w-20 h-20 rounded-full bg-white text-slate-800 flex items-center justify-center mb-4 shadow-lg shadow-slate-900/50 group-hover:scale-110 transition-transform">
            <mat-icon class="scale-150">outbox</mat-icon>
          </div>
          <div class="relative z-10">
            <p class="text-4xl font-black tracking-tight text-white mb-1">{{ totalDevoluciones() }}</p>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actas de Devolución Procesadas</p>
          </div>
        </div>
      </div>

      <!-- Critical Alerts Banner -->
      <div *ngIf="storage.alertasNoLeidas().length > 0"
        class="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-2xl animate-pulse">
        <div class="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center flex-shrink-0">
          <mat-icon>warning</mat-icon>
        </div>
        <div class="flex-1">
          <p class="font-bold text-red-800">{{ storage.alertasNoLeidas().length }} Alerta(s) Crítica(s) sin leer</p>
          <p class="text-sm text-red-600">Existen alertas sin revisar, probablemente relacionadas con equipos sin acta de devolución.</p>
        </div>
        <a routerLink="/pendientes-devolucion"
          class="flex-shrink-0 px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition-colors">
          Ver Alertas
        </a>
      </div>

      <!-- Charts & Tables Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left Column: Activity & Stats -->
        <div class="lg:col-span-2 space-y-8">
          


          <!-- Per-person Statistics -->
          <div class="card p-6">
            <h3 class="text-lg font-semibold mb-4">Equipos Asignados por Persona</h3>

            <div class="overflow-x-auto rounded-xl border border-slate-100">
              <table class="min-w-full bg-white">
                <thead class="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Técnico / Persona</th>
                    <th class="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Pend. Alist.</th>
                    <th class="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Máx. Días</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  <ng-container *ngFor="let p of personStats()">
                    <tr *ngIf="p.pending > 0 && p.name && p.name !== 'Sin asignar'" class="hover:bg-slate-50 transition-colors">
                      <td class="px-4 py-3 text-sm font-medium text-slate-800 flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">{{ p.name.charAt(0).toUpperCase() }}</div>
                        {{ p.name }}
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{{ p.pending }}</span>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <ng-container *ngIf="getMaxDiasEnAlistamiento(p.name) as maxDias">
                          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                            [class.bg-emerald-100]="maxDias < 3"
                            [class.text-emerald-700]="maxDias < 3"
                            [class.bg-amber-100]="maxDias >= 3 && maxDias <= 7"
                            [class.text-amber-700]="maxDias >= 3 && maxDias <= 7"
                            [class.bg-red-100]="maxDias > 7"
                            [class.text-red-700]="maxDias > 7">
                            <mat-icon class="scale-[0.55] leading-none">schedule</mat-icon>
                            {{ maxDias }}d
                          </span>
                        </ng-container>
                        <span *ngIf="getMaxDiasEnAlistamiento(p.name) === 0" class="text-slate-300 text-xs">—</span>
                      </td>
                    </tr>
                    <tr *ngIf="getPendingItems(p.name).length > 0" class="bg-slate-50">
                      <td colspan="3" class="px-4 py-2">
                        <table class="w-full text-sm">
                          <thead class="bg-slate-100">
                             <tr>
                               <th class="px-2 py-1 text-left font-medium">Nº Item</th>
                               <th class="px-2 py-1 text-left font-medium">Tipo Equipo</th>
                               <th class="px-2 py-1 text-center font-medium">Días en Alist.</th>
                             </tr>
                           </thead>
                           <tbody>
                             <tr *ngFor="let item of getPendingItems(p.name)">
                               <td class="px-2 py-1">{{ item.item || item.serial }}</td>
                               <td class="px-2 py-1">{{ item.tipo_producto ?? 'N/A' }}</td>
                               <td class="px-2 py-1 text-center">
                                 <span *ngIf="item.fecha_asignacion_alistamiento"
                                   class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                                   [class.bg-emerald-100]="getDiasEnAlistamiento(item.fecha_asignacion_alistamiento) < 3"
                                   [class.text-emerald-700]="getDiasEnAlistamiento(item.fecha_asignacion_alistamiento) < 3"
                                   [class.bg-amber-100]="getDiasEnAlistamiento(item.fecha_asignacion_alistamiento) >= 3 && getDiasEnAlistamiento(item.fecha_asignacion_alistamiento) <= 7"
                                   [class.text-amber-700]="getDiasEnAlistamiento(item.fecha_asignacion_alistamiento) >= 3 && getDiasEnAlistamiento(item.fecha_asignacion_alistamiento) <= 7"
                                   [class.bg-red-100]="getDiasEnAlistamiento(item.fecha_asignacion_alistamiento) > 7"
                                   [class.text-red-700]="getDiasEnAlistamiento(item.fecha_asignacion_alistamiento) > 7">
                                   {{ getDiasEnAlistamiento(item.fecha_asignacion_alistamiento) }}d
                                 </span>
                                 <span *ngIf="!item.fecha_asignacion_alistamiento" class="text-slate-300 text-xs">—</span>
                               </td>
                             </tr>
                           </tbody>
                        </table>
                      </td>
                    </tr>
                  </ng-container>
                  <tr *ngIf="personStats().length === 0">
                    <td colspan="3" class="px-4 py-8 text-center text-slate-400">No hay asignaciones para este periodo.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Right Column: Charts & Progress -->
        <div class="space-y-6">
          
          <!-- Distribución de Estados -->
          <div class="card p-6 flex flex-col items-center">
            <h3 class="text-lg font-semibold mb-6 w-full text-left">Distribución de Estados</h3>
            
            <!-- Donut Chart -->
            <div class="relative w-48 h-48 rounded-full mb-8 shadow-inner border border-slate-100 transition-all hover:scale-105 duration-500" [style.background]="pieChartGradient()">
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-32 h-32 bg-white rounded-full shadow-md flex flex-col items-center justify-center">
                  <span class="text-3xl font-black text-slate-800">{{ totalAssets() }}</span>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activos</span>
                </div>
              </div>
            </div>

            <!-- Chart Legend -->
            <div class="w-full space-y-3">
              <a *ngFor="let stat of statusSummary()" 
                 [routerLink]="['/inventario']" 
                 [queryParams]="{estado: stat.estadoQuery}"
                 class="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                <div class="flex items-center gap-3">
                  <div class="w-3 h-3 rounded-full shadow-sm" [style.backgroundColor]="stat.colorHex"></div>
                  <span class="font-medium text-slate-600">{{ stat.label }}</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="font-bold text-slate-800">{{ stat.count }}</span>
                  <span class="text-xs text-slate-400 w-8 text-right font-mono">{{ stat.percent | number:'1.0-0' }}%</span>
                </div>
              </a>
            </div>
          </div>


        </div>
      </div>

      <!-- Equipos por Ubicación -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-6">Equipos por Ubicación</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-6">
          <a *ngFor="let ubi of topUbicaciones()" 
             [routerLink]="['/inventario']" 
             [queryParams]="{ubicacion: ubi.name}"
             class="space-y-1 group cursor-pointer block">
            <div class="flex justify-between text-sm">
              <span class="font-medium text-slate-700 truncate pr-2 group-hover:text-emerald-600 transition-colors" [title]="ubi.name">{{ ubi.name }}</span>
              <span class="font-bold text-slate-900 shrink-0">{{ ubi.count }} <span class="text-slate-400 text-xs font-normal">({{ ubi.percent | number:'1.0-0' }}%)</span></span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
              <div class="bg-emerald-500 h-2 rounded-full transition-all duration-1000 group-hover:bg-emerald-400" [style.width]="ubi.percent + '%'"></div>
            </div>
          </a>
          <div *ngIf="topUbicaciones().length === 0" class="text-center text-slate-400 text-sm py-4 col-span-full">Sin datos registrados</div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Actividad Reciente</h3>
          <div class="flex gap-2">
            <button (click)="recentTab = 'ingresos'" [class.bg-brand]="recentTab === 'ingresos'" [class.text-white]="recentTab === 'ingresos'" [class.bg-slate-100]="recentTab !== 'ingresos'" [class.text-slate-600]="recentTab !== 'ingresos'" class="px-3 py-1 rounded-lg text-sm font-bold transition-colors">Ingresos</button>
            <button (click)="recentTab = 'devoluciones'" [class.bg-brand]="recentTab === 'devoluciones'" [class.text-white]="recentTab === 'devoluciones'" [class.bg-slate-100]="recentTab !== 'devoluciones'" [class.text-slate-600]="recentTab !== 'devoluciones'" class="px-3 py-1 rounded-lg text-sm font-bold transition-colors">Devoluciones</button>
          </div>
        </div>
        
        <div class="card p-0 overflow-hidden">
          <!-- Ingresos Table -->
          <table *ngIf="recentTab === 'ingresos'" class="w-full text-sm text-left animate-in fade-in">
            <thead class="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
              <tr>
                <th class="px-6 py-4">Serial</th>
                <th class="px-6 py-4">Marca/Modelo</th>
                <th class="px-6 py-4">Estado</th>
                <th class="px-6 py-4">Fecha</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let item of recentAssets()" class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 font-mono font-medium text-brand">{{ item.serial }}</td>
                <td class="px-6 py-4">{{ item.marca }} {{ item.modelo }}</td>
                <td class="px-6 py-4">
                  <span [class]="getStatusClass(item.estado)" class="px-2 py-1 rounded-full text-xs font-semibold">
                    {{ formatStatus(item.estado) }}
                  </span>
                </td>
                <td class="px-6 py-4 text-slate-500">{{ item.fecha_ingreso | date:'short' }}</td>
              </tr>
              <tr *ngIf="recentAssets().length === 0">
                <td colspan="4" class="px-6 py-12 text-center text-slate-400">No hay activos registrados aún.</td>
              </tr>
            </tbody>
          </table>

          <!-- Devoluciones Table -->
          <table *ngIf="recentTab === 'devoluciones'" class="w-full text-sm text-left animate-in fade-in">
            <thead class="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
              <tr>
                <th class="px-6 py-4">ID</th>
                <th class="px-6 py-4">Estado</th>
                <th class="px-6 py-4">Fecha Creación</th>
                <th class="px-6 py-4">Fecha Conf.</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let dev of recentDevolucionesList()" class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 font-mono font-medium text-brand">#{{ dev.id }}</td>
                <td class="px-6 py-4">
                  <span [class.bg-green-100]="dev.estado === 'CONFIRMADA'" [class.text-green-700]="dev.estado === 'CONFIRMADA'" [class.bg-amber-100]="dev.estado === 'PENDIENTE'" [class.text-amber-700]="dev.estado === 'PENDIENTE'" class="px-2 py-1 rounded-full text-xs font-bold uppercase tracking-tighter">
                    {{ dev.estado }}
                  </span>
                </td>
                <td class="px-6 py-4 text-slate-500">{{ dev.fecha_creacion | date:'short' }}</td>
                <td class="px-6 py-4 text-slate-500">{{ dev.fecha_confirmacion ? (dev.fecha_confirmacion | date:'short') : '-' }}</td>
              </tr>
              <tr *ngIf="recentDevolucionesList().length === 0">
                <td colspan="4" class="px-6 py-12 text-center text-slate-400">No hay devoluciones registradas aún.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  public storage = inject(StorageService);

  recentTab: 'ingresos' | 'devoluciones' = 'ingresos';

  // Statistics per person (tecnico asignado)
  personStats = computed(() => {
    const map = new Map<string, { pending: number; pendingReturn: number; total: number }>();
    this.storage.inventario().forEach(item => {
      if (item.estado !== 'ALISTAMIENTO' || !item.tecnico_asignado_nombre) return;

      const person = item.tecnico_asignado_nombre;
      if (!map.has(person)) {
        map.set(person, { pending: 0, pendingReturn: 0, total: 0 });
      }
      const stats = map.get(person)!;
      stats.total++;
      stats.pending++;
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  });

  // Helper to retrieve pending alistamiento items for a given person
  getPendingItems = (person: string) => {
    return this.storage.inventario().filter(i => i.tecnico_asignado_nombre === person && i.estado === 'ALISTAMIENTO');
  };

  ngOnInit() {
    this.storage.syncAllFromApi();
  }

  // KPIs
  totalAssets = computed(() => this.storage.inventario().filter(a => a.estado !== 'DEVUELTO' && a.estado !== 'DADO_DE_BAJA').length);
  inPreparation = computed(() => this.storage.inventario().filter(a => a.estado === 'RECIBIDO' || a.estado === 'ALISTAMIENTO').length);
  available = computed(() => this.storage.inventario().filter(a => a.estado === 'DISPONIBLE').length);
  entregados = computed(() => this.storage.inventario().filter(a => a.estado === 'ENTREGADO').length);
  pendientesDevolucion = computed(() => this.storage.inventario().filter(a => a.estado === 'EN_ESPERA_DEVOLUCION' || a.estado === 'PENDIENTE_DEVOLUCION').length);
  totalRecepciones = computed(() => this.storage.recepciones().length);
  totalDevoluciones = computed(() => this.storage.devoluciones().length);

  // Recent Activity
  recentAssets = computed(() => [...this.storage.inventario()].sort((a, b) => {
    const timeA = a.fecha_ingreso ? new Date(a.fecha_ingreso).getTime() : 0;
    const timeB = b.fecha_ingreso ? new Date(b.fecha_ingreso).getTime() : 0;
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  }).slice(0, 5));

  recentDevolucionesList = computed(() => [...this.storage.devoluciones()].sort((a, b) => {
    const timeA = a.fecha_creacion ? new Date(a.fecha_creacion).getTime() : 0;
    const timeB = b.fecha_creacion ? new Date(b.fecha_creacion).getTime() : 0;
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  }).slice(0, 5));
  // Progress Bars Data
  topProductos = computed(() => {
    const counts = new Map<string, number>();
    const total = this.totalAssets() || 1;
    this.storage.inventario().filter(a => a.estado !== 'DEVUELTO' && a.estado !== 'DADO_DE_BAJA').forEach(item => {
      const type = item.tipo_producto || 'Desconocido';
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count, percent: (count / total) * 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });



  topUbicaciones = computed(() => {
    const counts = new Map<string, number>();
    
    // Filtramos solo los que están entregados
    const entregados = this.storage.inventario().filter(a => a.estado === 'ENTREGADO');
    const total = entregados.length || 1;
    
    entregados.forEach(item => {
      const ubi = item.ubicacion || 'Sin Ubicación';
      counts.set(ubi, (counts.get(ubi) || 0) + 1);
    });
    
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count, percent: (count / total) * 100 }))
      .sort((a, b) => b.count - a.count);
  });

  // Status Summary for Donut Chart
  statusSummary = computed(() => {
    const total = this.totalAssets() || 1;
    const groups: Record<string, { colorHex: string; label: string; estados: string[] }> = {
      'RECIBIDOS':             { colorHex: '#cbd5e1', label: 'Recibidos', estados: ['RECIBIDO'] },
      'ALISTAMIENTO':          { colorHex: '#f59e0b', label: 'En Alistamiento', estados: ['ALISTAMIENTO'] },
      'DISPONIBLE':            { colorHex: '#10b981', label: 'Disponibles', estados: ['DISPONIBLE'] },
      'ENTREGADO':             { colorHex: '#3b82f6', label: 'Entregados / Uso', estados: ['ENTREGADO'] },
      'ESPERA_DEVOLUCION':     { colorHex: '#a855f7', label: 'Proceso Devolución', estados: ['EN_ESPERA_DEVOLUCION', 'PENDIENTE_DEVOLUCION'] },
    };

    return Object.entries(groups).map(([statusKey, config]) => {
      const count = this.storage.inventario().filter(a => config.estados.includes(a.estado)).length;
      return {
        label: config.label,
        count,
        percent: (count / total) * 100,
        colorHex: config.colorHex,
        estadoQuery: statusKey === 'ESPERA_DEVOLUCION' ? 'ESPERA_DEVOLUCION_GROUP' : config.estados[0]
      };
    }).filter(s => s.count > 0); // Solo mostramos los que tienen valores
  });

  pieChartGradient = computed(() => {
    const summary = this.statusSummary();
    if (this.totalAssets() === 0) return 'conic-gradient(#f1f5f9 0% 100%)';

    let currentAngle = 0;
    const gradients = summary.map(g => {
      const start = currentAngle;
      const end = currentAngle + g.percent;
      currentAngle = end;
      return `${g.colorHex} ${start}% ${end}%`;
    });
    
    return `conic-gradient(${gradients.join(', ')})`;
  });

  getDiasEnAlistamiento(fechaStr: string | undefined): number {
    if (!fechaStr) return 0;
    const now = Date.now();
    const start = new Date(fechaStr).getTime();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  }

  getMaxDiasEnAlistamiento(person: string): number {
    const items = this.getPendingItems(person);
    if (!items.length) return 0;
    return items.reduce((max, item) => {
      const dias = this.getDiasEnAlistamiento(item.fecha_asignacion_alistamiento);
      return dias > max ? dias : max;
    }, 0);
  }

  formatStatus(status: string): string {
    const map: Record<string, string> = {
      'PENDIENTE_DEVOLUCION': 'PENDIENTE CONF. PROVEEDOR',
      'EN_ESPERA_DEVOLUCION': 'EN ESPERA DEVOLUCIÓN',
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'RECIBIDO':             return 'bg-slate-100 text-slate-700 uppercase font-bold tracking-tighter px-2 py-0.5 rounded text-[10px]';
      case 'ALISTAMIENTO':         return 'bg-amber-100 text-amber-700 uppercase font-bold tracking-tighter px-2 py-0.5 rounded text-[10px]';
      case 'DISPONIBLE':           return 'bg-emerald-100 text-emerald-700 uppercase font-bold tracking-tighter px-2 py-0.5 rounded text-[10px]';
      case 'ENTREGADO':            return 'bg-blue-100 text-blue-700 uppercase font-bold tracking-tighter px-2 py-0.5 rounded text-[10px]';
      case 'PENDIENTE_DEVOLUCION': return 'bg-purple-100 text-purple-700 uppercase font-bold tracking-tighter px-2 py-0.5 rounded text-[10px]';
      case 'EN_ESPERA_DEVOLUCION': return 'bg-purple-200 text-purple-800 uppercase font-bold tracking-tighter px-2 py-0.5 rounded text-[10px]';
      default:                     return 'bg-slate-50 text-slate-600 uppercase px-2 py-0.5 rounded text-[10px]';
    }
  }
}
