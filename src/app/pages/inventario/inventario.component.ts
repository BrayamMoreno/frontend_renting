import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { StorageService } from '../../services/storage';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { InventarioItem, Devolucion, AssetStatus } from '../../models/app-state';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="space-y-8 animate-in fade-in duration-500">
      <!-- API Loading Banner -->
      <div *ngIf="isLoading()" class="flex items-center gap-3 bg-sky-50 border border-sky-200 text-sky-700 px-4 py-3 rounded-xl text-sm font-medium">
        <div class="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
        Sincronizando inventario con el servidor...
      </div>
      <!-- API Error Banner -->
      <div *ngIf="apiError()" class="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm font-medium">
        <mat-icon class="scale-90 flex-shrink-0">warning</mat-icon>
        {{ apiError() }}
      </div>
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 class="text-3xl font-bold tracking-tight text-slate-800">Inventario Global</h2>
          <p class="text-slate-500 mt-1">Gestión detallada y seguimiento de todos los activos IT.</p>
        </div>
        
        <div class="flex flex-wrap items-center gap-3">
          <select [ngModel]="viewMode()" (ngModelChange)="onViewModeChange($event)" class="bg-[#FF6B00] text-white font-bold text-sm rounded-xl px-4 py-2 shadow-sm outline-none cursor-pointer border-none">
            <option value="activos" class="bg-white text-slate-800">Equipos Actuales (Inventario)</option>
            <option value="devoluciones" class="bg-white text-slate-800">Pendientes de Devolución</option>
            <option value="bajas" class="bg-white text-slate-800">Equipos Dados de Baja</option>
          </select>

          <div class="relative w-full sm:w-64">
            <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 scale-90">search</mat-icon>
            <input [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event); currentPage.set(1)"
                   type="text" 
                   placeholder="Buscar serial, marca, modelo..." 
                   class="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all">
          </div>
          
          <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event); currentPage.set(1)" class="bg-white border border-slate-200 text-slate-600 text-sm rounded-xl px-4 py-2 shadow-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand cursor-pointer">
            <option value="">Todos los Estados</option>
            <ng-container *ngIf="viewMode() === 'activos'">
              <option value="RECIBIDO">Recibido</option>
              <option value="ALISTAMIENTO">En Alistamiento</option>
              <option value="DISPONIBLE">Disponible</option>
              <option value="ENTREGADO">Entregado</option>
              <option value="ALMACENADO">Almacenado (Propio)</option>
              <option value="EN_ESPERA_DEVOLUCION">En Espera de Devolución</option>
              <option value="PENDIENTE_DEVOLUCION">Pendiente Confirmación Proveedor</option>
            </ng-container>
            <ng-container *ngIf="viewMode() === 'devoluciones'">
              <option value="EN_ESPERA_DEVOLUCION">En Espera de Devolución</option>
              <option value="PENDIENTE_DEVOLUCION">Pendiente Confirmación Proveedor</option>
              <option value="DEVUELTO">Devuelto</option>
            </ng-container>
            <ng-container *ngIf="viewMode() === 'bajas'">
              <option value="DADO_DE_BAJA">Dado de Baja</option>
            </ng-container>
          </select>

          <select [ngModel]="propioFilter()" (ngModelChange)="propioFilter.set($event); currentPage.set(1)" class="bg-white border border-slate-200 text-slate-600 text-sm rounded-xl px-4 py-2 shadow-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand cursor-pointer">
            <option value="">Propios y Rentados</option>
            <option value="propio">Solo Propios</option>
            <option value="rentado">Solo Rentados</option>
          </select>

          <!-- Filtro: Equipos Incompletos -->
          <button (click)="incompleteFilter.set(!incompleteFilter()); currentPage.set(1)"
                  [class.bg-amber-500]="incompleteFilter()"
                  [class.text-white]="incompleteFilter()"
                  [class.bg-white]="!incompleteFilter()"
                  [class.text-amber-600]="!incompleteFilter()"
                  class="border border-amber-300 text-sm rounded-xl px-4 py-2 shadow-sm font-bold flex items-center gap-2 transition-all hover:shadow-md">
            <mat-icon class="scale-75">warning_amber</mat-icon>
            {{ incompleteFilter() ? 'Todos' : 'Incompletos' }}
            <span *ngIf="incompleteCount() > 0" class="bg-white/30 text-xs font-black px-1.5 py-0.5 rounded-full"
                  [class.text-white]="incompleteFilter()"
                  [class.text-amber-600]="!incompleteFilter()">
              {{ incompleteCount() }}
            </span>
          </button>

          <select [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event); currentPage.set(1)" class="bg-white border border-slate-200 text-slate-600 text-sm rounded-xl px-4 py-2 shadow-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand cursor-pointer">
            <option value="">Todos los Tipos</option>
            <option *ngFor="let type of catalogTypes()" [value]="type">{{ type }}</option>
          </select>

          <select [ngModel]="ubicacionFilter()" (ngModelChange)="ubicacionFilter.set($event); currentPage.set(1)" class="bg-white border border-slate-200 text-slate-600 text-sm rounded-xl px-4 py-2 shadow-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand cursor-pointer max-w-[200px] truncate">
            <option value="">Todas las Ubicaciones</option>
            <option *ngFor="let u of ubicaciones()" [value]="u.path">{{ u.path }}</option>
          </select>

          <button (click)="exportData()" class="bg-[#FF6B00] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm shadow-orange-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2">
            <mat-icon class="scale-90">download</mat-icon> Exportar
          </button>
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-widest border-b border-slate-200">
              <tr>
                <th class="px-5 py-4 w-16">Item</th>
                <th class="px-5 py-4">Identificación</th>
                <th class="px-5 py-4">Equipo</th>
                <th class="px-5 py-4">Especificaciones</th>
                <th class="px-5 py-4">Estado</th>
                <th class="px-5 py-4">Responsable Entrega</th>
                <th class="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let item of paginatedInventory()" class="hover:bg-orange-50/30 transition-colors group">
                <td class="px-5 py-3 text-slate-400 font-bold">#{{ item.item || '-' }}</td>
                <td class="px-5 py-3">
                  <div class="font-mono text-brand font-bold">{{ item.serial }}</div>
                  <div class="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <mat-icon class="scale-50 text-slate-400">location_on</mat-icon> 
                    {{ item.ubicacion || 'Sin Ubicación' }}
                  </div>
                </td>
                <td class="px-5 py-3">
                  <div class="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                    {{ item.tipo_producto || 'No Definido' }}
                    <span *ngIf="item.es_propio" class="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-tighter">Propio</span>
                    <span *ngIf="!item.es_propio" class="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">Rentado</span>
                    <!-- Badge Incompleto -->
                    <span *ngIf="item.creado_automaticamente"
                          class="inline-flex items-center gap-0.5 text-[9px] bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded font-black uppercase tracking-tight animate-pulse"
                          title="Este equipo fue creado automáticamente y tiene datos pendientes de completar">
                      <mat-icon style="font-size:10px;height:10px;width:10px;">warning_amber</mat-icon> Incompleto
                    </span>
                  </div>
                  <div class="text-xs text-slate-500">{{ item.marca }} {{ item.modelo }}</div>
                  
                  <div *ngIf="getPeripheralsCount(item._backendId) > 0" class="text-[10px] text-brand font-bold mt-1.5 flex items-center gap-1 bg-brand/5 w-fit px-2 py-0.5 rounded-full border border-brand/10">
                    <mat-icon class="scale-[0.5] -mx-1">devices_other</mat-icon>
                    {{ getPeripheralsCount(item._backendId) }} periférico(s) asociado(s)
                  </div>
                  
                  <div *ngIf="isPeripheral(item) && item.equipo_asociado" class="text-[10px] text-slate-600 font-bold mt-1.5 flex items-center gap-1 bg-slate-100 w-fit px-2 py-0.5 rounded-full border border-slate-200">
                    <mat-icon class="scale-[0.5] -mx-1">link</mat-icon>
                    Asociado al Ítem #{{ getAssociatedItemNumber(item.equipo_asociado) }}
                  </div>

                </td>
                <td class="px-5 py-3 text-xs text-slate-600">
                  <ng-container *ngIf="item.procesador || item.ram || item.disco; else noSpecs">
                    <div class="flex flex-col gap-0.5">
                      <span *ngIf="item.procesador"><strong class="font-semibold text-slate-400">CPU:</strong> {{ item.procesador }}</span>
                      <span>
                        <strong *ngIf="item.ram" class="font-semibold text-slate-400">RAM:</strong> {{ item.ram || '-' }} &bull;
                        <strong *ngIf="item.disco" class="font-semibold text-slate-400">Disco:</strong> {{ item.disco || '-' }} {{ item.tipo_disco || '' }}
                      </span>
                    </div>
                  </ng-container>
                  <ng-template #noSpecs><span class="text-slate-400 italic">No registradas</span></ng-template>
                </td>
                <td class="px-5 py-3">
                  <div class="flex flex-col items-start gap-1">
                    <span [class]="getStatusClass(item.estado)" class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border">
                      {{ formatStatus(item.estado) }}
                    </span>
                    <span class="text-[10px] text-slate-400 font-medium">{{ item.fecha_ingreso | date:'shortDate' }}</span>
                    <!-- Fecha de baja para equipos dados de baja -->
                    <span *ngIf="item.estado === 'DADO_DE_BAJA' && item.fecha_baja"
                          class="text-[9px] text-rose-500 font-bold flex items-center gap-0.5">
                      <mat-icon class="scale-[0.5] w-3 h-3 flex items-center justify-center">event_busy</mat-icon>
                      Baja: {{ item.fecha_baja | date:'shortDate' }}
                    </span>
                  </div>
                </td>
                <!-- Responsable column -->
                <td class="px-5 py-3">
                  <div *ngIf="item.responsable_devolucion && (item.estado === 'EN_ESPERA_DEVOLUCION' || item.estado === 'PENDIENTE_DEVOLUCION')"
                       class="flex items-center gap-1.5 text-xs text-red-700 font-semibold bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 w-fit">
                    <mat-icon class="scale-[0.65] flex-shrink-0">person</mat-icon>
                    <span>{{ item.responsable_devolucion }}</span>
                  </div>
                  <span *ngIf="!item.responsable_devolucion || (item.estado !== 'EN_ESPERA_DEVOLUCION' && item.estado !== 'PENDIENTE_DEVOLUCION')"
                        class="text-slate-300 text-xs">—</span>
                </td>
                <td class="px-5 py-3 text-right">
                  <div class="relative inline-block text-left actions-menu-container">
                    <!-- Actions Trigger Button -->
                    <button (click)="toggleActionsMenu(item, $event); $event.stopPropagation()" 
                            [class.bg-orange-100]="activeMenuId() === item.serial"
                            [class.text-brand]="activeMenuId() === item.serial"
                            class="text-slate-400 hover:text-[#FF6B00] p-2 rounded-xl hover:bg-orange-50/50 transition-all duration-200 focus:outline-none actions-menu-container"
                            title="Acciones">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    
                    <!-- Dropdown Floating Menu -->
                    <div *ngIf="activeMenuId() === item.serial" 
                         [ngStyle]="{ 'position': 'fixed', 'top': menuPosition.top || null, 'bottom': menuPosition.bottom || null, 'left': menuPosition.left }"
                         class="w-64 rounded-2xl shadow-2xl bg-white border border-slate-100 z-[80] py-2 animate-in fade-in slide-in-from-top-2 duration-200 focus:outline-none">
                      
                      <!-- Header/Title inside menu -->
                      <div class="px-4 py-2 border-b border-slate-50 text-left">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Acciones del Activo</span>
                        <span class="text-[10px] font-mono text-slate-500 truncate block max-w-full mt-0.5">{{ item.serial }}</span>
                      </div>

                      <!-- General Actions -->
                      <div class="py-1">
                        <button (click)="openModal(item); activeMenuId.set(null)" 
                                class="flex items-center w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-brand gap-2.5 transition-colors">
                          <mat-icon class="text-slate-400 scale-75">visibility</mat-icon> Ver Detalle Completo
                        </button>
                        <!-- Completar Datos Equipo -->
                        <button *ngIf="item.creado_automaticamente"
                                (click)="abrirModalCompletarEquipo(item); activeMenuId.set(null)"
                                class="flex items-center w-full px-4 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-50/50 gap-2.5 transition-colors">
                          <mat-icon class="text-amber-500 scale-75">computer</mat-icon> Completar como Equipo
                        </button>
                        <!-- Completar Datos Periférico -->
                        <button *ngIf="item.creado_automaticamente"
                                (click)="abrirModalCompletarPeriferico(item); activeMenuId.set(null)"
                                class="flex items-center w-full px-4 py-2.5 text-xs font-bold text-teal-700 hover:bg-teal-50/50 gap-2.5 transition-colors">
                          <mat-icon class="text-teal-500 scale-75">mouse</mat-icon> Completar como Periférico
                        </button>
                      </div>
                      
                      <!-- State Transitions -->
                      <div class="py-1 border-t border-slate-50">
                        <!-- Entregar Equipo -->
                        <button *ngIf="item.estado === 'DISPONIBLE'"
                                (click)="entregarEquipo(item); activeMenuId.set(null)" 
                                class="flex items-center w-full px-4 py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50/40 gap-2.5 transition-colors">
                          <mat-icon class="text-emerald-500 scale-75">assignment_turned_in</mat-icon> Entregar Equipo
                        </button>
                        
                        <!-- Reasignar Periférico -->
                        <button *ngIf="canReassignPeripheral(item)"
                                (click)="openReassignModal(item); activeMenuId.set(null)"
                                class="flex items-center w-full px-4 py-2.5 text-xs font-bold text-[#FF6B00] hover:bg-orange-50/40 gap-2.5 transition-colors">
                          <mat-icon class="text-brand scale-75">link</mat-icon> Reasignar a Equipo
                        </button>
                        
                        <!-- Marcar Pendiente de Devolución -->
                        <button *ngIf="item.estado !== 'DEVUELTO' && item.estado !== 'EN_ESPERA_DEVOLUCION' && item.estado !== 'ALMACENADO' && !(item.es_propio && item.estado === 'PENDIENTE_DEVOLUCION') && item.estado !== 'DADO_DE_BAJA'"
                                (click)="markAsPendingReturn(item); activeMenuId.set(null)"
                                class="flex items-center w-full px-4 py-2.5 text-xs font-bold text-amber-600 hover:bg-amber-50/40 gap-2.5 transition-colors">
                          <mat-icon class="text-amber-500 scale-75">hourglass_top</mat-icon> Pendiente Devolución
                        </button>
                        
                        <!-- Almacenar Equipo Propio -->
                        <button *ngIf="item.es_propio && (item.estado === 'EN_ESPERA_DEVOLUCION' || item.estado === 'PENDIENTE_DEVOLUCION')"
                                (click)="confirmarAlmacenamiento(item); activeMenuId.set(null)"
                                class="flex items-center w-full px-4 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50/40 gap-2.5 transition-colors">
                          <mat-icon class="text-indigo-500 scale-75">inventory_2</mat-icon> Almacenar Equipo Propio
                        </button>
                        
                        <!-- Reingresar Equipo -->
                        <button *ngIf="item.estado === 'ALMACENADO'"
                                (click)="confirmarReingreso(item); activeMenuId.set(null)"
                                class="flex items-center w-full px-4 py-2.5 text-xs font-bold text-sky-600 hover:bg-sky-50/40 gap-2.5 transition-colors">
                          <mat-icon class="text-sky-500 scale-75">restore</mat-icon> Reingresar Equipo
                        </button>
                        
                        <!-- Volver a Circular -->
                        <button *ngIf="item.estado === 'DADO_DE_BAJA' && item.es_propio"
                                (click)="confirmarReactivacion(item); activeMenuId.set(null)"
                                class="flex items-center w-full px-4 py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50/40 gap-2.5 transition-colors">
                          <mat-icon class="text-emerald-500 scale-75">replay</mat-icon> Volver a Circular
                        </button>
                      </div>
                      
                      <!-- Destructive Actions -->
                      <div class="py-1 border-t border-slate-50" *ngIf="(auth.hasPermission('eliminar_equipo') || auth.isAdmin()) && item.estado !== 'DADO_DE_BAJA'">
                        <button (click)="deleteEquipo(item); activeMenuId.set(null)"
                                class="flex items-center w-full px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50/40 gap-2.5 transition-colors">
                          <mat-icon class="text-rose-500 scale-75">archive</mat-icon> Dar de Baja Equipo
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>

              <!-- Empty State -->
              <tr *ngIf="filteredInventory().length === 0">
                <td colspan="7" class="py-16">
                  <div class="flex flex-col items-center justify-center text-slate-400">
                    <mat-icon class="scale-150 mb-4 opacity-50">inventory_2</mat-icon>
                    <p class="font-semibold text-slate-600 mb-1">No se encontraron activos</p>
                    <p class="text-sm">Ajusta los filtros de búsqueda para ver más resultados.</p>
                    <button (click)="clearFilters()" class="mt-4 text-[#FF6B00] font-bold text-sm hover:underline">Limpiar Filtros</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div *ngIf="filteredInventory().length > 0" class="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
          <div class="text-xs text-slate-500">
            Mostrando <span class="font-bold text-slate-700">{{ (currentPage() - 1) * pageSize() + 1 }}</span> a 
            <span class="font-bold text-slate-700">{{ showingTo() }}</span> de 
            <span class="font-bold text-slate-700">{{ filteredInventory().length }}</span> registros
          </div>
          <div class="flex items-center gap-2">
            <select [ngModel]="pageSize()" (ngModelChange)="pageSize.set($event); currentPage.set(1)" class="text-xs border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-brand/20">
              <option [value]="10">10 por pág</option>
              <option [value]="25">25 por pág</option>
              <option [value]="50">50 por pág</option>
              <option [value]="100">100 por pág</option>
            </select>
            <div class="flex items-center gap-1">
              <button (click)="prevPage()" [disabled]="currentPage() === 1" class="p-1 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <mat-icon class="scale-75">chevron_left</mat-icon>
              </button>
              <span class="text-xs font-bold text-slate-700 px-2">Pág {{ currentPage() }} / {{ totalPages() }}</span>
              <button (click)="nextPage()" [disabled]="currentPage() === totalPages()" class="p-1 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <mat-icon class="scale-75">chevron_right</mat-icon>
              </button>
            </div>
          </div>
        </div>

      </div>
    
    <!-- ── CONFIRMACIÓN DE ENTREGA (CUSTOM MODAL) ────────── -->
    <div *ngIf="confirmingDelivery() as asset" 
         class="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="confirmingDelivery.set(null)"></div>
      
      <div class="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div class="bg-emerald-500 p-8 text-white text-center">
          <div class="w-20 h-20 bg-white/20 rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <mat-icon class="scale-[2] -rotate-12">assignment_turned_in</mat-icon>
          </div>
          <h3 class="text-2xl font-black mb-2">Confirmar Entrega</h3>
          <p class="text-emerald-50 text-sm">Estás por formalizar la entrega de este activo al usuario final.</p>
        </div>

        <div class="p-8 space-y-6">
          <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-600">
                <mat-icon>computer</mat-icon>
              </div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipo a Entregar</p>
                <p class="font-bold text-slate-800">{{ asset.marca }} {{ asset.modelo }}</p>
                <p class="text-xs font-mono text-emerald-600">{{ asset.serial }}</p>
              </div>
            </div>
          </div>
          
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asignar Ubicación Final</label>
            <select [(ngModel)]="deliveryUbicacion" class="w-full bg-slate-50 border border-slate-200 text-sm p-3 rounded-xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all cursor-pointer">
              <option value="">Selecciona la ubicación...</option>
              <option *ngFor="let u of ubicaciones()" [value]="u.path">{{ u.path }}</option>
            </select>
          </div>

          <div class="flex flex-col gap-3">
            <button (click)="executeDelivery(asset)" 
                    class="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2">
              <mat-icon>check_circle</mat-icon>
              Confirmar Entrega Ahora
            </button>
            <button (click)="confirmingDelivery.set(null)" 
                    class="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-2xl font-bold transition-all">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- ── CONFIRMACIÓN DE DAR DE BAJA (CUSTOM MODAL) ────────── -->
    <div *ngIf="deletingAsset() as asset" 
         class="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="deletingAsset.set(null)"></div>
      
      <div class="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div class="bg-red-500 p-8 text-white text-center">
          <div class="w-20 h-20 bg-white/20 rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <mat-icon class="scale-[2] -rotate-12">archive</mat-icon>
          </div>
          <h3 class="text-2xl font-black mb-2">Dar de Baja Equipo</h3>
          <p class="text-red-50 text-sm">Esta acción cambiará el estado del equipo a Dado de Baja.</p>
        </div>

        <div class="p-8 space-y-6">
          <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-red-500">
                <mat-icon>archive</mat-icon>
              </div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipo a Dar de Baja</p>
                <p class="font-bold text-slate-800">{{ asset.marca }} {{ asset.modelo }}</p>
                <p class="text-xs font-mono text-red-500">{{ asset.serial }}</p>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <button (click)="executeDelete(asset)" 
                    class="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2">
              <mat-icon>check_circle</mat-icon>
              Sí, Dar de Baja
            </button>
            <button (click)="deletingAsset.set(null)" 
                    class="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-2xl font-bold transition-all">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── CONFIRMACIÓN DE DEVOLUCIÓN (CUSTOM MODAL) ────────── -->
    <div *ngIf="pendingReturnAsset() as asset" 
         class="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="pendingReturnAsset.set(null)"></div>
      
      <div class="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div class="bg-amber-500 p-8 text-white text-center">
          <div class="w-20 h-20 bg-white/20 rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <mat-icon class="scale-[2] -rotate-12">hourglass_top</mat-icon>
          </div>
          <h3 class="text-2xl font-black mb-2">Pendiente de Devolución</h3>
          <p class="text-amber-50 text-sm">Estás por marcar este activo como pendiente de devolución.</p>
        </div>

        <div class="p-8 space-y-6">
          <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-amber-500">
                <mat-icon>keyboard_return</mat-icon>
              </div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipo a Marcar</p>
                <p class="font-bold text-slate-800">{{ asset.marca }} {{ asset.modelo }}</p>
                <p class="text-xs font-mono text-amber-500">{{ asset.serial }}</p>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <button (click)="executePendingReturn(asset)" 
                    class="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-amber-200 transition-all flex items-center justify-center gap-2">
              <mat-icon>check_circle</mat-icon>
              Sí, Marcar Pendiente
            </button>
            <button (click)="pendingReturnAsset.set(null)" 
                    class="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-2xl font-bold transition-all">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── CONFIRMACIÓN ALMACENAMIENTO EQUIPO PROPIO (CUSTOM MODAL) ────────── -->
    <div *ngIf="almacenandoAsset() as asset" 
         class="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="almacenandoAsset.set(null)"></div>
      
      <div class="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div class="bg-indigo-600 p-8 text-white text-center">
          <div class="w-20 h-20 bg-white/20 rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <mat-icon class="scale-[2] -rotate-12">inventory_2</mat-icon>
          </div>
          <h3 class="text-2xl font-black mb-2">Almacenar Equipo Propio</h3>
          <p class="text-indigo-100 text-sm">Este equipo es propio y será marcado como almacenado internamente.</p>
        </div>

        <div class="p-8 space-y-6">
          <div class="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
            <mat-icon class="text-indigo-500 flex-shrink-0 mt-0.5">info</mat-icon>
            <div>
              <p class="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-1">Sin Acta de Devolución</p>
              <p class="text-xs text-indigo-600">Al ser un equipo propio, no se generará acta al proveedor. El equipo quedará en estado <strong>Almacenado</strong>.</p>
            </div>
          </div>

          <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-500">
                <mat-icon>inventory_2</mat-icon>
              </div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipo a Almacenar</p>
                <p class="font-bold text-slate-800">{{ asset.marca }} {{ asset.modelo }}</p>
                <p class="text-xs font-mono text-indigo-500">{{ asset.serial }}</p>
                <p class="text-[10px] text-slate-400 mt-0.5">Estado actual: <span class="font-bold text-slate-600">{{ formatStatus(asset.estado) }}</span></p>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <button (click)="executeAlmacenamiento(asset)" 
                    class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2">
              <mat-icon>check_circle</mat-icon>
              Sí, Almacenar Equipo
            </button>
            <button (click)="almacenandoAsset.set(null)" 
                    class="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-2xl font-bold transition-all">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── CONFIRMACIÓN REINGRESO EQUIPO ALMACENADO (CUSTOM MODAL) ────────── -->
    <div *ngIf="reingresandoAsset() as asset" 
         class="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="reingresandoAsset.set(null)"></div>
      
      <div class="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div class="bg-sky-500 p-8 text-white text-center">
          <div class="w-20 h-20 bg-white/20 rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <mat-icon class="scale-[2] -rotate-12">restore</mat-icon>
          </div>
          <h3 class="text-2xl font-black mb-2">Reingresar Equipo</h3>
          <p class="text-sky-50 text-sm">Este equipo almacenado volverá al estado Recibido para iniciar un nuevo ciclo de alistamiento y asignación.</p>
        </div>

        <div class="p-8 space-y-6">
          <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-sky-500">
                <mat-icon>devices</mat-icon>
              </div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipo a Reingresar</p>
                <p class="font-bold text-slate-800">{{ asset.marca }} {{ asset.modelo }}</p>
                <p class="text-xs font-mono text-sky-500">{{ asset.serial }}</p>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <button (click)="executeReingreso(asset)" 
                    class="w-full bg-sky-500 hover:bg-sky-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-sky-200 transition-all flex items-center justify-center gap-2">
              <mat-icon>check_circle</mat-icon>
              Sí, Reingresar Equipo
            </button>
            <button (click)="reingresandoAsset.set(null)" 
                    class="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-2xl font-bold transition-all">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── CONFIRMACIÓN VOLVER A CIRCULAR (EQUIPOS PROPIOS DADOS DE BAJA) ────────── -->
    <div *ngIf="reactivandoAsset() as asset" 
         class="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="reactivandoAsset.set(null)"></div>
      
      <div class="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div class="bg-emerald-600 p-8 text-white text-center">
          <div class="w-20 h-20 bg-white/20 rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <mat-icon class="scale-[2] -rotate-12">replay</mat-icon>
          </div>
          <h3 class="text-2xl font-black mb-2">Volver a Circular</h3>
          <p class="text-emerald-50 text-sm">Este equipo propio dado de baja volverá al estado <strong>Recibido</strong> e iniciará un nuevo ciclo.</p>
        </div>

        <div class="p-8 space-y-6">
          <div class="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <mat-icon class="text-emerald-500 flex-shrink-0 mt-0.5">info</mat-icon>
            <div>
              <p class="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Solo Equipos Propios</p>
              <p class="text-xs text-emerald-600">Únicamente los equipos <strong>propios</strong> pueden volver a circular tras ser dados de baja. El estado cambiará a <strong>Recibido</strong>.</p>
            </div>
          </div>

          <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-600">
                <mat-icon>devices</mat-icon>
              </div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipo a Reactivar</p>
                <p class="font-bold text-slate-800">{{ asset.marca }} {{ asset.modelo }}</p>
                <p class="text-xs font-mono text-emerald-600">{{ asset.serial }}</p>
                <span class="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-tighter">Propio</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <button (click)="executeReactivacion(asset)" 
                    class="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2">
              <mat-icon>check_circle</mat-icon>
              Sí, Volver a Circular
            </button>
            <button (click)="reactivandoAsset.set(null)" 
                    class="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-2xl font-bold transition-all">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── MODAL DE DETALLE ───────────────────────────────── -->
    <div *ngIf="selectedItem()" 
         class="fixed inset-0 z-50 flex items-center justify-center p-4"
         (click)="closeModal()">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>

      <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
           (click)="$event.stopPropagation()">
        
        <!-- Header Modal -->
        <div class="sticky top-0 bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between rounded-t-3xl z-10">
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ficha Técnica del Activo</p>
            <h3 class="text-xl font-black text-slate-800">{{ selectedItem()?.serial }}</h3>
          </div>
          <div class="flex items-center gap-3">
            <!-- Botón de Entregar Equipo -->
            <button *ngIf="selectedItem()?.estado === 'DISPONIBLE'"
                    (click)="entregarEquipo(selectedItem()!)"
                    class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-md transition-colors flex items-center gap-1">
              <mat-icon class="scale-75">assignment_turned_in</mat-icon> Entregar Equipo
            </button>
            <span [class]="getStatusClass(selectedItem()?.estado || '')" class="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border">
              {{ formatStatus(selectedItem()?.estado || '') }}
            </span>
            <button (click)="closeModal()" class="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>

        <div class="p-8 space-y-8" *ngIf="selectedItem() as asset">

          <!-- Identificación Básica -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-slate-50 rounded-2xl p-4 text-center">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ítem</p>
              <p class="text-2xl font-black text-slate-800">#{{ asset.item || '-' }}</p>
            </div>
            <div class="bg-orange-50 rounded-2xl p-4 text-center col-span-2">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Marca / Modelo</p>
              <p class="text-xl font-black text-slate-800">{{ asset.marca }} {{ asset.modelo }}</p>
              <p class="text-xs text-slate-500 mt-0.5">{{ asset.tipo_producto }}</p>
              <div class="flex justify-center items-center gap-2 mt-2">
                <span *ngIf="asset.es_propio" class="text-[10px] text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Propio</span>
                <span *ngIf="!asset.es_propio" class="text-[10px] text-slate-500 bg-white/70 px-2 py-0.5 rounded border border-orange-200/50 font-bold uppercase tracking-wider">Rentado</span>
              </div>
            </div>
            <div class="bg-slate-50 rounded-2xl p-4 text-center">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fecha Ingreso</p>
              <p class="text-sm font-bold text-slate-800">{{ asset.fecha_ingreso | date:'mediumDate' }}</p>
            </div>
            <!-- Fecha de baja (solo si aplica) -->
            <div *ngIf="asset.estado === 'DADO_DE_BAJA' && asset.fecha_baja"
                 class="col-span-2 md:col-span-4 bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
              <div class="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-500 flex-shrink-0">
                <mat-icon>event_busy</mat-icon>
              </div>
              <div>
                <p class="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Fecha de Baja</p>
                <p class="text-sm font-bold text-rose-700">{{ asset.fecha_baja | date:'medium' }}</p>
                <p class="text-[10px] text-rose-400 mt-0.5">Equipo confirmado como recibido por el proveedor y dado de baja del inventario activo.</p>
              </div>
            </div>
          </div>

          <!-- Asociaciones -->
          <div *ngIf="getPeripheralsCount(asset._backendId) > 0 || (isPeripheral(asset) && asset.equipo_asociado)" class="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Relaciones en Inventario</p>
            <div class="flex flex-col gap-4">
              <!-- Si este equipo ES un periférico asociado a otro -->
              <div *ngIf="isPeripheral(asset) && asset.equipo_asociado" class="flex items-center gap-2 text-slate-700 font-bold text-sm bg-white border border-slate-200 px-3 py-2 rounded-xl w-fit">
                <mat-icon class="scale-90 text-slate-400">link</mat-icon>
                Periférico asociado al Equipo Principal Ítem #{{ getAssociatedItemNumber(asset.equipo_asociado) }}
              </div>

              <!-- Si este equipo tiene periféricos asociados → tabla detallada -->
              <div *ngIf="getPeripheralsCount(asset._backendId) > 0">
                <div class="flex items-center gap-2 text-brand font-bold text-sm mb-3">
                  <mat-icon class="scale-90">devices_other</mat-icon>
                  {{ getPeripheralsCount(asset._backendId) }} periférico(s) asociado(s)
                </div>
                <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <table class="w-full text-sm text-left">
                    <thead class="bg-slate-50">
                      <tr class="text-[10px] text-slate-500 uppercase tracking-wider">
                        <th class="px-3 py-2">Item</th>
                        <th class="px-3 py-2">Serial</th>
                        <th class="px-3 py-2">Tipo / Marca / Modelo</th>
                        <th class="px-3 py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      <tr *ngFor="let per of getPeripherals(asset._backendId)" class="hover:bg-slate-50/60 transition-colors">
                        <td class="px-3 py-2 font-bold text-slate-400">#{{ per.item || '-' }}</td>
                        <td class="px-3 py-2 font-mono text-brand font-bold text-xs">{{ per.serial }}</td>
                        <td class="px-3 py-2 text-xs">
                          <span class="font-bold">{{ per.tipo_producto || '-' }}</span><br>
                          {{ per.marca }} {{ per.modelo }}
                        </td>
                        <td class="px-3 py-2">
                          <span [class]="getStatusClass(per.estado)" class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border">
                            {{ formatStatus(per.estado) }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- Especificaciones Técnicas -->
          <div>
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <mat-icon class="scale-75">memory</mat-icon> Especificaciones de Hardware
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div class="border border-slate-100 rounded-xl p-3">
                <p class="text-[10px] text-slate-400 font-bold uppercase">Procesador</p>
                <p class="text-sm font-semibold text-slate-700 mt-0.5">{{ asset.procesador || 'No registrado' }}</p>
              </div>
              <div class="border border-slate-100 rounded-xl p-3">
                <p class="text-[10px] text-slate-400 font-bold uppercase">Memoria RAM</p>
                <p class="text-sm font-semibold text-slate-700 mt-0.5">{{ asset.ram || 'No registrado' }}</p>
              </div>
              <div class="border border-slate-100 rounded-xl p-3">
                <p class="text-[10px] text-slate-400 font-bold uppercase">Almacenamiento</p>
                <p class="text-sm font-semibold text-slate-700 mt-0.5">{{ asset.disco ? asset.disco + ' ' + (asset.tipo_disco || '') : 'No registrado' }}</p>
              </div>
              <div class="border border-slate-100 rounded-xl p-3">
                <p class="text-[10px] text-slate-400 font-bold uppercase">Ubicación</p>
                <p class="text-sm font-semibold text-slate-700 mt-0.5">{{ asset.ubicacion || 'Sin ubicación' }}</p>
              </div>
              <div class="border border-slate-100 rounded-xl p-3" *ngIf="asset.comentarios">
                <p class="text-[10px] text-slate-400 font-bold uppercase">Comentarios</p>
                <p class="text-sm text-slate-700 mt-0.5 italic">{{ asset.comentarios }}</p>
              </div>
              <div class="border border-amber-100 bg-amber-50 rounded-xl p-3" *ngIf="asset.es_cambio">
                <p class="text-[10px] text-amber-600 font-bold uppercase">Reemplaza Ítem</p>
                <p class="text-sm font-bold text-amber-800 mt-0.5">#{{ asset.cambio_por }}</p>
              </div>
              <div class="border border-purple-100 bg-purple-50 rounded-xl p-3" *ngIf="getReplacementInfo(asset) as repInfo">
                <p class="text-[10px] text-purple-600 font-bold uppercase">
                  {{ (asset.estado === 'DADO_DE_BAJA' || asset.estado === 'DEVUELTO') ? 'Reemplazado por' : 'Este equipo será reemplazado por' }}
                </p>
                <p class="text-sm font-bold text-purple-900 mt-0.5 flex items-center gap-1.5">
                  <mat-icon class="scale-75 text-purple-600">swap_horiz</mat-icon>
                  <span>{{ repInfo.displayText }}</span>
                  <span *ngIf="repInfo.itemNumber && repInfo.serial" class="text-xs font-normal text-purple-600">({{ repInfo.serial }})</span>
                </p>
              </div>
              <div class="border border-red-100 bg-red-50 rounded-xl p-3" *ngIf="asset.responsable_devolucion && (asset.estado === 'EN_ESPERA_DEVOLUCION' || asset.estado === 'PENDIENTE_DEVOLUCION')">
                <p class="text-[10px] text-red-600 font-bold uppercase">Responsable Devolución</p>
                <p class="text-sm font-bold text-red-800 mt-0.5 flex items-center gap-1">
                  <mat-icon class="scale-[0.8] w-4 h-4 flex items-center justify-center">assignment_ind</mat-icon> {{ asset.responsable_devolucion }}
                </p>
              </div>
              <div class="border border-red-100 bg-red-50 rounded-xl p-3" *ngIf="getDevolucion(asset) as dev">
                <p class="text-[10px] text-red-600 font-bold uppercase">Comentario General Devolución</p>
                <p class="text-xs text-red-800 font-semibold mt-0.5 italic">{{ dev.comentarios || 'Sin observaciones generales' }}</p>
              </div>
            </div>
          </div>

          <!-- Responsables del Proceso (COLORES E ICONOS RESTAURADOS) -->
          <div>
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <mat-icon class="scale-75">manage_accounts</mat-icon> Responsables del Activo
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

              <!-- ENTREGA -->
              <div class="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div class="bg-sky-50 px-4 py-3 flex items-center gap-2">
                  <div class="w-7 h-7 bg-sky-500 text-white rounded-full flex items-center justify-center">
                    <mat-icon style="font-size: 16px; width: 16px; height: 16px;">person_remove</mat-icon>
                  </div>
                  <div>
                    <p class="text-xs font-bold text-sky-700">Entregador</p>
                    <p class="text-[10px] text-sky-500 uppercase font-bold tracking-tighter">Handover</p>
                  </div>
                </div>
                <div class="p-4">
                  <div class="aspect-video w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                    <img *ngIf="getFotoEntregador(asset) as foto; else noFotoE" [src]="foto" class="w-full h-full object-cover" alt="Entrega">
                    <ng-template #noFotoE>
                      <div class="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
                        <mat-icon class="scale-90">no_photography</mat-icon>
                        <span class="text-[8px] font-bold uppercase">Sin Evidencia</span>
                      </div>
                    </ng-template>
                  </div>
                  <div *ngIf="getEntregadorInfo(asset) as info" class="mt-2 text-[10px] text-slate-400 font-medium text-center">
                    {{ info.nombre }} · {{ info.fecha | date:'shortDate' }}
                  </div>
                </div>
              </div>

              <!-- RECIBE -->
              <div class="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div class="bg-emerald-50 px-4 py-3 flex items-center gap-2">
                  <div class="w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                    <mat-icon style="font-size: 16px; width: 16px; height: 16px;">person_add</mat-icon>
                  </div>
                  <div>
                    <p class="text-xs font-bold text-emerald-700">Receptor</p>
                    <p class="text-[10px] text-emerald-500 uppercase font-bold tracking-tighter">Receiving</p>
                  </div>
                </div>
                <div class="p-4">
                  <div class="aspect-video w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                    <img *ngIf="getFotoReceptor(asset) as foto; else noFotoR" [src]="foto" class="w-full h-full object-cover" alt="Recibe">
                    <ng-template #noFotoR>
                      <div class="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
                        <mat-icon class="scale-90">no_photography</mat-icon>
                        <span class="text-[8px] font-bold uppercase">Sin Evidencia</span>
                      </div>
                    </ng-template>
                  </div>
                  <div *ngIf="getReceptorInfo(asset) as info" class="mt-2 text-[10px] text-slate-400 font-medium text-center">
                    {{ info.nombre }} · {{ info.fecha | date:'shortDate' }}
                  </div>
                </div>
              </div>

              <!-- ALISTA -->
              <div class="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div class="bg-amber-50 px-4 py-3 flex items-center gap-2">
                  <div class="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center">
                    <mat-icon style="font-size: 16px; width: 16px; height: 16px;">engineering</mat-icon>
                  </div>
                  <div>
                    <p class="text-xs font-bold text-amber-700">Alistamiento</p>
                    <p class="text-[10px] text-amber-500 uppercase font-bold tracking-tighter">Preparation</p>
                  </div>
                </div>
                <div class="p-4">
                  <div class="aspect-video w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                    <img *ngIf="getFotoAlistador(asset) as foto; else noFotoA" [src]="foto" class="w-full h-full object-cover" alt="Alista">
                    <ng-template #noFotoA>
                      <div class="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
                        <mat-icon class="scale-90">no_photography</mat-icon>
                        <span class="text-[8px] font-bold uppercase">Sin Evidencia</span>
                      </div>
                    </ng-template>
                  </div>
                  <div *ngIf="getAlistamiento(asset) as ali" class="mt-2 text-[10px] text-slate-400 font-medium text-center">
                    {{ ali.tecnico_nombre }} · {{ ali.fecha | date:'shortDate' }}
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- ── HISTORIAL DE ALISTAMIENTOS ───────────── -->
          <div class="mt-8 border-t border-slate-200 pt-6">
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <mat-icon class="scale-75">history</mat-icon> Historial de Alistamientos
            </h4>

            <div *ngIf="getAllAlistamientos(asset).length > 0; else noAlistamientos" class="space-y-6">
              <div *ngFor="let ali of getAllAlistamientos(asset)" class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <!-- Cabecera del Alistamiento -->
                <div class="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full border border-slate-200 bg-white overflow-hidden shadow-sm flex-shrink-0 flex items-center justify-center">
                      <img *ngIf="ali.foto_tecnico" [src]="ali.foto_tecnico" class="w-full h-full object-cover cursor-pointer hover:opacity-90" (click)="viewingEvidence = ali.foto_tecnico">
                      <mat-icon *ngIf="!ali.foto_tecnico" class="text-slate-300">person</mat-icon>
                    </div>
                    <div class="flex flex-col">
                      <span class="text-xs font-bold text-slate-800">{{ ali.fecha | date:'medium' }}</span>
                      <span class="text-[10px] text-slate-500 uppercase">Alistado por: <strong class="text-slate-700">{{ ali.tecnico_nombre }}</strong></span>
                    </div>
                  </div>
                  <span class="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full uppercase tracking-wider hidden sm:block">
                    Registro Inmutable
                  </span>
                </div>

                <!-- Detalles del Alistamiento -->
                <div class="p-4 space-y-2">
                  <ng-container *ngFor="let entry of getChecklistEntries(ali)">
                    <div class="flex items-start gap-3 p-3 rounded-xl border transition-colors"
                         [class.border-emerald-100]="entry.valor === 'SI'"
                         [class.bg-emerald-50/40]="entry.valor === 'SI'"
                         [class.border-red-100]="entry.valor === 'NO'"
                         [class.bg-red-50/40]="entry.valor === 'NO'"
                         [class.border-slate-100]="entry.valor === 'NA' || entry.valor === 'SIN_RESPONDER'">
                      
                      <!-- Badge de estado -->
                      <span class="flex-shrink-0 text-[10px] font-black px-2 py-1 rounded-lg w-16 text-center"
                            [class.bg-emerald-500]="entry.valor === 'SI'"
                            [class.text-white]="entry.valor === 'SI' || entry.valor === 'NO'"
                            [class.bg-red-500]="entry.valor === 'NO'"
                            [class.bg-slate-200]="entry.valor === 'NA'"
                            [class.text-slate-600]="entry.valor === 'NA'"
                            [class.bg-slate-100]="entry.valor === 'SIN_RESPONDER'"
                            [class.text-slate-400]="entry.valor === 'SIN_RESPONDER'">
                        {{ entry.valor === 'SI' ? '✓ Cumple' : entry.valor === 'NO' ? '✗ No cumple' : entry.valor === 'NA' ? 'N/A' : 'S/R' }}
                      </span>

                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-slate-700">{{ entry.nombre }}</p>
                        <p *ngIf="entry.observacion" class="text-xs text-slate-500 italic mt-0.5">{{ entry.observacion }}</p>
                        <!-- Evidencia fotográfica -->
                        <img *ngIf="entry.evidencia" [src]="entry.evidencia"
                             class="mt-2 h-24 rounded-xl border-2 border-amber-200 object-cover cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                             [title]="'Evidencia: ' + entry.nombre"
                             (click)="viewingEvidence = entry.evidencia">
                      </div>
                    </div>
                  </ng-container>

                  <!-- Observaciones generales -->
                  <div *ngIf="ali.respuestas['observaciones_generales']" class="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Observaciones Generales</p>
                    <p class="text-sm text-slate-600 italic">{{ ali.respuestas['observaciones_generales'] }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State para Alistamientos -->
            <ng-template #noAlistamientos>
              <div class="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
                <mat-icon class="text-slate-300 scale-150 mb-2">history_toggle_off</mat-icon>
                <p class="text-sm font-semibold text-slate-600">Sin historial de alistamientos</p>
                <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Este equipo aún no ha sido alistado bajo el nuevo sistema, o no tiene registros de preparación previos.</p>
              </div>
            </ng-template>
          </div>

          <!-- ── LÍNEA DE TIEMPO DEL ACTIVO (HISTORIAL) ── -->
          <div class="mt-8 border-t border-slate-200 pt-6">
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <mat-icon class="scale-75">timeline</mat-icon> Línea de Tiempo del Activo
            </h4>

            <div *ngIf="historialActivo().length > 0; else noHistorial" class="relative pl-8 border-l-2 border-slate-100 space-y-8 ml-4">
              <div *ngFor="let log of historialActivo()" class="relative">
                
                <!-- Dot / Icono del Evento -->
                <span class="absolute -left-[41px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                      [class.bg-blue-500]="log.evento === 'CREACION'"
                      [class.text-white]="log.evento === 'CREACION'"
                      [class.bg-amber-500]="log.evento === 'ALISTAMIENTO'"
                      [class.text-white]="log.evento === 'ALISTAMIENTO'"
                      [class.bg-indigo-500]="log.evento === 'CAMBIO_ESTADO'"
                      [class.text-white]="log.evento === 'CAMBIO_ESTADO'"
                      [class.bg-rose-500]="log.evento === 'BAJA'"
                      [class.text-white]="log.evento === 'BAJA'">
                  <mat-icon class="scale-75">
                    {{ 
                      log.evento === 'CREACION' ? 'add_circle' :
                      log.evento === 'ALISTAMIENTO' ? 'engineering' :
                      log.evento === 'BAJA' ? 'delete_forever' :
                      'swap_horiz' 
                    }}
                  </mat-icon>
                </span>

                <!-- Contenido de la Línea de Tiempo -->
                <div class="bg-slate-50 hover:bg-slate-100/70 p-4 rounded-2xl border border-slate-100 transition-colors">
                  <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span class="text-xs font-black text-slate-800 uppercase tracking-wider">
                      {{ 
                        log.evento === 'CREACION' ? 'Ingreso a Sistema' :
                        log.evento === 'ALISTAMIENTO' ? 'Alistamiento Técnico' :
                        log.evento === 'BAJA' ? 'Dado de Baja' :
                        'Transición de Estado' 
                      }}
                    </span>
                    <span class="text-[10px] font-bold text-slate-400">
                      {{ log.fecha | date:'medium' }}
                    </span>
                  </div>

                  <p class="text-xs text-slate-600 leading-relaxed font-semibold">
                    {{ log.detalles || 'Sin observaciones registradas.' }}
                  </p>

                  <div class="flex items-center gap-4 mt-2.5 pt-2 border-t border-slate-200/50 text-[10px] font-bold text-slate-400">
                    <span class="flex items-center gap-1">
                      <mat-icon class="scale-75 w-4 h-4 flex items-center justify-center">person</mat-icon>
                      Responsable: <strong class="text-slate-600">{{ log.usuario_nombre }}</strong>
                    </span>
                    <span *ngIf="log.estado_anterior" class="flex items-center gap-1">
                      <mat-icon class="scale-75 w-4 h-4 flex items-center justify-center">undo</mat-icon>
                      Antes: <strong class="text-slate-500">{{ formatStatus(log.estado_anterior) }}</strong>
                    </span>
                    <span class="flex items-center gap-1">
                      <mat-icon class="scale-75 w-4 h-4 flex items-center justify-center">redo</mat-icon>
                      Nuevo: <strong class="text-brand">{{ formatStatus(log.estado_nuevo) }}</strong>
                    </span>
                  </div>
                </div>

              </div>
            </div>

            <ng-template #noHistorial>
              <div class="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
                <mat-icon class="text-slate-300 scale-150 mb-2">timeline</mat-icon>
                <p class="text-sm font-semibold text-slate-600">Sin historial de eventos</p>
                <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">No se encontraron registros de eventos para este equipo.</p>
              </div>
            </ng-template>
          </div>

        </div>
      </div>
    </div>
    <!-- ── MODAL REASIGNACIÓN MANUAL DE PERIFÉRICO ────────── -->
    <div *ngIf="reassociatingPeripheral() as peripheral" 
         class="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="closeReassignModal()"></div>
      
      <div class="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div class="bg-[#FF6B00] p-8 text-white text-center">
          <div class="w-20 h-20 bg-white/20 rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <mat-icon class="scale-[2] -rotate-12">link</mat-icon>
          </div>
          <h3 class="text-2xl font-black mb-2">Reasignar Periférico</h3>
          <p class="text-orange-50 text-sm">Vincular periférico a un equipo de cómputo.</p>
        </div>

        <div class="p-8 space-y-6">
          <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Periférico Seleccionado</p>
            <p class="font-bold text-slate-800">{{ peripheral.tipo_producto }} - {{ peripheral.marca }} {{ peripheral.modelo }}</p>
            <p class="text-xs font-mono text-brand">{{ peripheral.serial }}</p>
          </div>

          <div class="space-y-1 relative">
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Buscar Equipo Principal</label>
            <div class="relative">
              <input [ngModel]="reassociationSearchQuery()" 
                     (ngModelChange)="reassociationSearchQuery.set($event); showReassociateDropdown.set(true)"
                     (focus)="showReassociateDropdown.set(true)"
                     type="text" 
                     placeholder="Buscar por serial, marca, modelo..." 
                     class="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 text-sm rounded-xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all">
              <mat-icon class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 scale-90">search</mat-icon>
            </div>

            <!-- Dropdown Results -->
            <div *ngIf="showReassociateDropdown() && filteredReassignmentComputers().length > 0" 
                 class="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 divide-y divide-slate-100">
              <button *ngFor="let comp of filteredReassignmentComputers()" 
                      (click)="selectedReassociationComputer.set(comp); reassociationSearchQuery.set(comp.item ? comp.item + ' - ' + comp.marca + ' ' + comp.modelo + ' (' + comp.serial + ')' : comp.marca + ' ' + comp.modelo + ' (' + comp.serial + ')'); showReassociateDropdown.set(false)"
                      class="w-full text-left px-4 py-3 hover:bg-orange-50/50 transition-colors flex flex-col">
                <span class="text-xs font-bold text-slate-800">{{ comp.tipo_producto }} &bull; {{ comp.marca }} {{ comp.modelo }}</span>
                <span class="text-[10px] text-slate-400 font-mono mt-0.5">Serial: {{ comp.serial }} &bull; Ítem: #{{ comp.item || '-' }}</span>
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <button (click)="executeReassociation()" 
                    [disabled]="!selectedReassociationComputer()"
                    class="w-full bg-[#FF6B00] hover:bg-orange-600 disabled:opacity-50 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2">
              <mat-icon>check_circle</mat-icon>
              Confirmar Reasociación
            </button>
            <button (click)="closeReassignModal()" 
                    class="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-2xl font-bold transition-all">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Evidence Lightbox -->
    <div *ngIf="viewingEvidence" class="fixed inset-0 z-[60] flex items-center justify-center p-4"
         (click)="viewingEvidence = ''">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
      <img [src]="viewingEvidence" class="relative max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain">
      <button class="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl backdrop-blur-sm transition-colors"
              (click)="viewingEvidence = ''; $event.stopPropagation()">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <!-- ── MODAL COMPLETAR DATOS EQUIPO ────── -->
    <div *ngIf="completandoEquipoItem()" class="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
        <!-- Header -->
        <div class="p-6 text-white text-center" style="background: linear-gradient(135deg, #d97706, #b45309)">
          <div class="w-16 h-16 bg-white/20 rounded-2xl rotate-12 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <mat-icon class="scale-[1.8] -rotate-12">computer</mat-icon>
          </div>
          <h3 class="text-xl font-black mb-1">Completar Datos del Equipo</h3>
          <p class="text-amber-100 text-sm">
            Equipo creado automáticamente · Serial: <strong>{{ completandoEquipoItem()?.serial }}</strong>
          </p>
        </div>

        <!-- Aviso -->
        <div class="mx-6 mt-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <mat-icon class="text-amber-600 flex-shrink-0 mt-0.5 scale-90">info</mat-icon>
          <p class="text-xs text-amber-800">
            Completa la información técnica del Equipo. Al guardar, dejará de aparecer como "Incompleto".
          </p>
        </div>

        <!-- Formulario -->
        <div class="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nro Ítem</label>
              <input type="number" [(ngModel)]="completarForm.item" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-amber-400 transition-all" placeholder="Nro Ítem">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serial *</label>
              <input [(ngModel)]="completarForm.serial" style="text-transform: uppercase;" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-amber-400 transition-all" placeholder="Serial">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Producto</label>
              <select [(ngModel)]="completarForm.tipo_producto" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-amber-400">
                <option value="">Tipo de equipo...</option>
                <option *ngFor="let tipo of getTiposEquipo()" [value]="tipo.nombre">{{ tipo.nombre }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Marca</label>
              <select [(ngModel)]="completarForm.marca" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-amber-400">
                <option value="">Marca...</option>
                <option *ngFor="let marca of marcas()" [value]="marca">{{ marca }}</option>
              </select>
            </div>
            <div class="col-span-2 space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modelo</label>
              <input [(ngModel)]="completarForm.modelo" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-amber-400 transition-all" placeholder="Modelo">
            </div>
            
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Procesador</label>
              <select [(ngModel)]="completarForm.procesador" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-amber-400">
                <option value="">Procesador...</option>
                <option *ngFor="let proc of procesadores()" [value]="proc">{{ proc }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Memoria RAM</label>
              <select [(ngModel)]="completarForm.ram" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-amber-400">
                <option value="">Memoria RAM...</option>
                <option *ngFor="let ram of ramList()" [value]="ram">{{ ram }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Disco</label>
              <select [(ngModel)]="completarForm.disco" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-amber-400">
                <option value="">Capacidad de Disco...</option>
                <option *ngFor="let disco of discoList()" [value]="disco">{{ disco }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Disco</label>
              <select [(ngModel)]="completarForm.tipo_disco" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-amber-400">
                <option value="">Tipo de Disco...</option>
                <option *ngFor="let tipo of tiposDisco()" [value]="tipo">{{ tipo }}</option>
              </select>
            </div>
            
            <div class="col-span-2 space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ubicación</label>
              <select [(ngModel)]="completarForm.ubicacion" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-amber-400">
                <option value="">Sin ubicación...</option>
                <option *ngFor="let u of ubicaciones()" [value]="u.path">{{ u.path }}</option>
              </select>
            </div>
            <div class="col-span-2 space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comentarios</label>
              <textarea [(ngModel)]="completarForm.comentarios" rows="2" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-amber-400 transition-all resize-none" placeholder="Observaciones adicionales..."></textarea>
            </div>
          </div>
        </div>

        <!-- Acciones -->
        <div class="p-6 pt-0 flex gap-3">
          <button (click)="cerrarModalCompletar()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all">
            Cancelar
          </button>
          <button (click)="guardarCompletar()"
                  [disabled]="isCompletando()"
                  style="background: linear-gradient(135deg, #d97706, #b45309)"
                  class="flex-1 text-white py-3 rounded-xl font-bold shadow-lg shadow-amber-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90">
            <div *ngIf="isCompletando()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <mat-icon class="scale-90" *ngIf="!isCompletando()">check_circle</mat-icon>
            {{ isCompletando() ? 'Guardando...' : 'Guardar y Completar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL COMPLETAR DATOS PERIFERICO ────── -->
    <div *ngIf="completandoPerifericoItem()" class="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
        <!-- Header -->
        <div class="p-6 text-white text-center" style="background: linear-gradient(135deg, #0d9488, #0f766e)">
          <div class="w-16 h-16 bg-white/20 rounded-2xl rotate-12 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <mat-icon class="scale-[1.8] -rotate-12">mouse</mat-icon>
          </div>
          <h3 class="text-xl font-black mb-1">Completar Datos del Periférico</h3>
          <p class="text-teal-100 text-sm">
            Equipo creado automáticamente · Serial: <strong>{{ completandoPerifericoItem()?.serial }}</strong>
          </p>
        </div>

        <!-- Aviso -->
        <div class="mx-6 mt-5 flex items-start gap-3 bg-teal-50 border border-teal-200 rounded-xl p-3">
          <mat-icon class="text-teal-600 flex-shrink-0 mt-0.5 scale-90">info</mat-icon>
          <p class="text-xs text-teal-800">
            Completa la información técnica del Periférico. Al guardar, dejará de aparecer como "Incompleto".
          </p>
        </div>

        <!-- Formulario -->
        <div class="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nro Ítem</label>
              <input type="number" [(ngModel)]="completarForm.item" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-teal-400 transition-all" placeholder="Nro Ítem">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serial *</label>
              <input [(ngModel)]="completarForm.serial" style="text-transform: uppercase;" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-teal-400 transition-all" placeholder="Serial">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Producto</label>
              <select [(ngModel)]="completarForm.tipo_producto" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-teal-400">
                <option value="">Tipo de periférico...</option>
                <option *ngFor="let tipo of getTiposPeriferico()" [value]="tipo.nombre">{{ tipo.nombre }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Marca</label>
              <select [(ngModel)]="completarForm.marca" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-teal-400">
                <option value="">Marca...</option>
                <option *ngFor="let marca of marcas()" [value]="marca">{{ marca }}</option>
              </select>
            </div>
            <div class="col-span-2 space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modelo</label>
              <input [(ngModel)]="completarForm.modelo" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-teal-400 transition-all" placeholder="Modelo">
            </div>
            
            <div class="col-span-2 space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ubicación</label>
              <select [(ngModel)]="completarForm.ubicacion" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-teal-400">
                <option value="">Sin ubicación...</option>
                <option *ngFor="let u of ubicaciones()" [value]="u.path">{{ u.path }}</option>
              </select>
            </div>
            <div class="col-span-2 space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comentarios</label>
              <textarea [(ngModel)]="completarForm.comentarios" rows="2" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-teal-400 transition-all resize-none" placeholder="Observaciones adicionales..."></textarea>
            </div>
          </div>
        </div>

        <!-- Acciones -->
        <div class="p-6 pt-0 flex gap-3">
          <button (click)="cerrarModalCompletar()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all">
            Cancelar
          </button>
          <button (click)="guardarCompletar()"
                  [disabled]="isCompletando()"
                  style="background: linear-gradient(135deg, #0d9488, #0f766e)"
                  class="flex-1 text-white py-3 rounded-xl font-bold shadow-lg shadow-teal-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90">
            <div *ngIf="isCompletando()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <mat-icon class="scale-90" *ngIf="!isCompletando()">check_circle</mat-icon>
            {{ isCompletando() ? 'Guardando...' : 'Guardar y Completar' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class InventarioComponent implements OnInit {
  private storage = inject(StorageService);
  private api = inject(ApiService);
  public auth = inject(AuthService);

  isLoading = this.storage.isLoading;
  apiError = this.storage.apiError;

  searchQuery = signal('');
  statusFilter = signal('');
  typeFilter = signal('');
  ubicacionFilter = signal('');
  propioFilter = signal<'' | 'propio' | 'rentado'>('');
  viewMode = signal<'activos' | 'devoluciones' | 'bajas'>('activos');
  selectedItem = signal<InventarioItem | null>(null);
  historialActivo = signal<any[]>([]);
  confirmingDelivery = signal<InventarioItem | null>(null);
  pendingReturnAsset = signal<InventarioItem | null>(null);
  almacenandoAsset = signal<InventarioItem | null>(null);
  reingresandoAsset = signal<InventarioItem | null>(null);
  reactivandoAsset = signal<InventarioItem | null>(null);
  deliveryUbicacion = signal<string>('');
  deletingAsset = signal<InventarioItem | null>(null);
  viewingEvidence = '';

  activeMenuId = signal<string | null>(null);
  reassociatingPeripheral = signal<InventarioItem | null>(null);
  reassociationSearchQuery = signal('');
  selectedReassociationComputer = signal<InventarioItem | null>(null);
  showReassociateDropdown = signal(false);
  tiposProductoFull = signal<any[]>([]);
  menuPosition: { top?: string; bottom?: string; left: string } = { top: '0px', left: '0px' };

  // ── Completar Equipo Creado Automáticamente ───────────────────────────────
  incompleteFilter = signal(false);
  completandoEquipoItem = signal<InventarioItem | null>(null);
  completandoPerifericoItem = signal<InventarioItem | null>(null);
  isCompletando = signal(false);
  completarForm: { item?: number; serial?: string; tipo_producto?: string; marca?: string; modelo?: string; procesador?: string; ram?: string; disco?: string; tipo_disco?: string; ubicacion?: string; comentarios?: string } = {};

  catalogTypes = signal<string[]>([]);
  ubicaciones = signal<any[]>([]);
  currentPage = signal(1);
  pageSize = signal(10);

  marcas = signal<string[]>([]);
  procesadores = signal<string[]>([]);
  ramList = signal<string[]>([]);
  discoList = signal<string[]>([]);
  tiposDisco = signal<string[]>([]);

  onViewModeChange(mode: 'activos' | 'devoluciones' | 'bajas') {
    this.viewMode.set(mode);
    this.statusFilter.set('');
    this.typeFilter.set('');
    this.ubicacionFilter.set('');
    this.propioFilter.set('');
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit() {
    if (!this.auth.hasPermission('ver_inventario')) {
      this.router.navigate(['/profile']);
      return;
    }

    const estadoParam = this.route.snapshot.queryParamMap.get('estado');
    if (estadoParam) {
      this.statusFilter.set(estadoParam);
      // Auto-select the correct tab based on the estado param
      if (['EN_ESPERA_DEVOLUCION', 'PENDIENTE_DEVOLUCION', 'DEVUELTO'].includes(estadoParam)) {
        this.viewMode.set('devoluciones');
      } else {
        this.viewMode.set('activos');
      }
    }

    const ubicacionParam = this.route.snapshot.queryParamMap.get('ubicacion');
    if (ubicacionParam) {
      this.ubicacionFilter.set(ubicacionParam);
    }

    this.storage.syncAllFromApi().then(() => {
      this.ubicaciones.set(this.storage.ubicaciones());
      const tipos = this.storage.tiposProducto();
      this.tiposProductoFull.set(tipos);
      this.catalogTypes.set(tipos.map((t: any) => t.nombre).sort());

      const marcas = this.storage.marcas();
      if (marcas && marcas.length > 0) this.marcas.set(marcas.map((r: any) => r.nombre));

      const tDiscos = this.storage.tiposDisco();
      if (tDiscos && tDiscos.length > 0) this.tiposDisco.set(tDiscos.map((r: any) => r.nombre));

      const procs = this.storage.procesadores();
      if (procs && procs.length > 0) this.procesadores.set(procs.map((r: any) => r.nombre));

      const rams = this.storage.ram();
      if (rams && rams.length > 0) this.ramList.set(rams.map((r: any) => r.nombre));

      const discos = this.storage.discos();
      if (discos && discos.length > 0) this.discoList.set(discos.map((r: any) => r.nombre));
    });
  }

  incompleteCount = computed(() => this.storage.inventario().filter(i => i.creado_automaticamente).length);

  // ── Métodos: Completar Equipo Creado Automáticamente ─────────────────────
  getTiposEquipo() {
    return this.tiposProductoFull().filter(t => !t.es_periferico);
  }

  getTiposPeriferico() {
    return this.tiposProductoFull().filter(t => t.es_periferico);
  }

  abrirModalCompletarEquipo(item: InventarioItem) {
    this.completandoEquipoItem.set(item);
    this.completarForm = {
      item: item.item,
      serial: item.serial,
      tipo_producto: item.tipo_producto || '',
      marca: item.marca || '',
      modelo: item.modelo || '',
      procesador: item.procesador || '',
      ram: item.ram || '',
      disco: item.disco || '',
      tipo_disco: item.tipo_disco || '',
      ubicacion: item.ubicacion || '',
      comentarios: item.comentarios || ''
    };
  }

  abrirModalCompletarPeriferico(item: InventarioItem) {
    this.completandoPerifericoItem.set(item);
    this.completarForm = {
      item: item.item,
      serial: item.serial,
      tipo_producto: item.tipo_producto || '',
      marca: item.marca || '',
      modelo: item.modelo || '',
      ubicacion: item.ubicacion || '',
      comentarios: item.comentarios || ''
    };
  }

  cerrarModalCompletar() {
    this.completandoEquipoItem.set(null);
    this.completandoPerifericoItem.set(null);
    this.completarForm = {};
  }

  async guardarCompletar() {
    const item = this.completandoEquipoItem() || this.completandoPerifericoItem();
    if (!item) return;
    const itemId = item._backendId || (item as any).id;
    if (!itemId) return;

    this.isCompletando.set(true);
    try {
      const payload: any = {};
      if (this.completarForm.item !== undefined && this.completarForm.item !== null) payload.item = this.completarForm.item;
      if (this.completarForm.serial) payload.serial = this.completarForm.serial.trim().toUpperCase();
      if (this.completarForm.tipo_producto) payload.tipo_producto = this.completarForm.tipo_producto;
      if (this.completarForm.marca) payload.marca = this.completarForm.marca;
      if (this.completarForm.modelo) payload.modelo = this.completarForm.modelo;
      if (this.completarForm.ubicacion) payload.ubicacion = this.completarForm.ubicacion;
      if (this.completarForm.comentarios !== undefined) payload.comentarios = this.completarForm.comentarios;

      if (this.completandoEquipoItem()) {
        if (this.completarForm.procesador) payload.procesador = this.completarForm.procesador;
        if (this.completarForm.ram) payload.ram = this.completarForm.ram;
        if (this.completarForm.disco) payload.disco = this.completarForm.disco;
        if (this.completarForm.tipo_disco) payload.tipo_disco = this.completarForm.tipo_disco;
      }

      await firstValueFrom(this.api.completarEquipoAutomatico(itemId, payload));
      this.storage.loadInventarioFromApi();
      this.cerrarModalCompletar();
    } catch (error: any) {
      console.error('Error completando datos:', error);
      alert(error?.error?.detail || error?.error?.serial?.[0] || 'No se pudieron guardar los datos. Verifique e intente nuevamente.');
    } finally {
      this.isCompletando.set(false);
    }
  }

  filteredInventory = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const status = this.statusFilter();
    const type = this.typeFilter();
    const ubicacion = this.ubicacionFilter();
    const propio = this.propioFilter();
    const mode = this.viewMode();
    const soloIncompletos = this.incompleteFilter();
    const items = this.storage.inventario();

    // Define which statuses belong to each view mode
    const ACTIVOS_STATES = new Set(['RECIBIDO', 'ALISTAMIENTO', 'DISPONIBLE', 'ENTREGADO', 'ALMACENADO', 'EN_ESPERA_DEVOLUCION', 'PENDIENTE_DEVOLUCION']);
    const DEVOLUCIONES_STATES = new Set(['EN_ESPERA_DEVOLUCION', 'PENDIENTE_DEVOLUCION', 'DEVUELTO']);
    const BAJAS_STATES = new Set(['DADO_DE_BAJA']);

    const filtered = items.filter(i => {
      // 1. Filter by view mode (tab)
      const matchesMode =
        mode === 'activos' ? ACTIVOS_STATES.has(i.estado) :
          mode === 'devoluciones' ? DEVOLUCIONES_STATES.has(i.estado) :
            BAJAS_STATES.has(i.estado);
      if (!matchesMode) return false;

      // 2. Text search
      const matchesSearch = !query ||
        i.serial.toLowerCase().includes(query) ||
        i.marca.toLowerCase().includes(query) ||
        i.modelo.toLowerCase().includes(query) ||
        (i.tipo_producto && i.tipo_producto.toLowerCase().includes(query)) ||
        (i.item && i.item.toString() === query);

      // 3. Status sub-filter
      const matchesStatus = !status || i.estado === status;

      // 4. Propio / Rentado filter
      const matchesPropio =
        !propio ||
        (propio === 'propio' && i.es_propio === true) ||
        (propio === 'rentado' && !i.es_propio);

      // 5. Type filter
      const matchesType = !type || i.tipo_producto === type;

      // 6. Location filter
      const matchesUbicacion = !ubicacion || i.ubicacion === ubicacion;

      // 7. Incomplete filter
      const matchesIncompleto = !soloIncompletos || i.creado_automaticamente === true;

      return matchesSearch && matchesStatus && matchesPropio && matchesType && matchesUbicacion && matchesIncompleto;
    });

    // En modo bajas: ordenar por fecha_baja descendente (más recientes primero)
    // En otros modos: ordenar por fecha_ingreso descendente
    return filtered.sort((a, b) => {
      if (mode === 'bajas') {
        const timeA = a.fecha_baja ? new Date(a.fecha_baja).getTime() : 0;
        const timeB = b.fecha_baja ? new Date(b.fecha_baja).getTime() : 0;
        return timeB - timeA;
      }
      const timeA = a.fecha_ingreso ? new Date(a.fecha_ingreso).getTime() : 0;
      const timeB = b.fecha_ingreso ? new Date(b.fecha_ingreso).getTime() : 0;
      return timeB - timeA;
    });
  });

  paginatedInventory = computed(() => {
    const all = this.filteredInventory();
    const start = (this.currentPage() - 1) * this.pageSize();
    return all.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredInventory().length / this.pageSize())));

  showingTo = computed(() => {
    const end = this.currentPage() * this.pageSize();
    const total = this.filteredInventory().length;
    return end > total ? total : end;
  });

  nextPage() {
    if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1);
  }

  prevPage() {
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  exportData() {
    const items = this.filteredInventory();
    if (items.length === 0) return;
    const BOM = '\\uFEFF';
    const headers = ['Ítem', 'Serial', 'Marca', 'Modelo', 'Tipo de Producto', 'Procesador', 'RAM', 'Disco', 'Tipo Disco', 'Ubicación', 'Estado', 'Comentarios', 'Reemplaza'];
    const rows = items.map(i => [
      i.item || '',
      i.serial,
      i.marca,
      i.modelo,
      i.tipo_producto || '',
      i.procesador || '',
      i.ram || '',
      i.disco || '',
      i.tipo_disco || '',
      i.ubicacion || '',
      this.formatStatus(i.estado),
      i.comentarios || '',
      i.es_cambio ? i.cambio_por || '' : ''
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  openModal(item: InventarioItem) {
    this.selectedItem.set(item);
    this.historialActivo.set([]);
    const itemId = item._backendId || (item as any).id;
    if (itemId) {
      this.api.getHistorialItem(itemId).subscribe({
        next: (history) => this.historialActivo.set(history),
        error: (err) => console.error('Error loading item history:', err)
      });
    }
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.selectedItem.set(null);
    document.body.style.overflow = '';
  }

  entregarEquipo(asset: InventarioItem) {
    this.deliveryUbicacion.set(asset.ubicacion || '');
    this.confirmingDelivery.set(asset);
  }

  async executeDelivery(asset: InventarioItem) {
    const extraFields: Partial<any> = {};
    if (this.deliveryUbicacion()) {
      extraFields['ubicacion'] = this.deliveryUbicacion();
    }

    await this.storage.updateAssetStatus(asset.serial, 'ENTREGADO', extraFields);

    // Entregar periféricos asociados automáticamente (excluyendo aquellos pendientes de devolución, ya devueltos o dados de baja)
    const mainAssetId = asset._backendId || (asset as any).id;
    const itemNum = asset.item;
    if (mainAssetId || itemNum) {
      const excludedStates = ['EN_ESPERA_DEVOLUCION', 'PENDIENTE_DEVOLUCION', 'DEVUELTO', 'DADO_DE_BAJA'];
      const associatedPeripherals = this.storage.inventario().filter(
        a => ((mainAssetId && a.equipo_asociado === mainAssetId) || (itemNum && a.equipo_asociado === itemNum)) &&
          (!a.estado || !excludedStates.includes(a.estado.toUpperCase()))
      );
      for (const peripheral of associatedPeripherals) {
        await this.storage.updateAssetStatus(peripheral.serial, 'ENTREGADO', extraFields);
      }
    }

    // Actualizamos el signal del item seleccionado para que la vista del modal se refresque
    const updatedItem = this.storage.inventario().find(i => i.serial === asset.serial);
    if (updatedItem && this.selectedItem()?.serial === asset.serial) {
      this.selectedItem.set(updatedItem);
      const itemId = updatedItem._backendId || (updatedItem as any).id;
      if (itemId) {
        this.api.getHistorialItem(itemId).subscribe(h => this.historialActivo.set(h));
      }
    }
    this.confirmingDelivery.set(null);
  }

  markAsPendingReturn(asset: InventarioItem) {
    this.pendingReturnAsset.set(asset);
  }

  confirmarAlmacenamiento(asset: InventarioItem) {
    this.almacenandoAsset.set(asset);
  }

  async executeAlmacenamiento(asset: InventarioItem) {
    await this.storage.updateAssetStatus(asset.serial, 'ALMACENADO', {
      tecnico_asignado: null,
      tecnico_asignado_nombre: null,
      fecha_asignacion_alistamiento: null
    });
    const updatedItem = this.storage.inventario().find(i => i.serial === asset.serial);
    if (updatedItem && this.selectedItem()?.serial === asset.serial) {
      this.selectedItem.set(updatedItem);
      const itemId = updatedItem._backendId || (updatedItem as any).id;
      if (itemId) {
        this.api.getHistorialItem(itemId).subscribe(h => this.historialActivo.set(h));
      }
    }
    this.almacenandoAsset.set(null);
  }

  confirmarReingreso(asset: InventarioItem) {
    this.reingresandoAsset.set(asset);
  }

  async executeReingreso(asset: InventarioItem) {
    await this.storage.updateAssetStatus(asset.serial, 'RECIBIDO', {
      tecnico_asignado: null,
      tecnico_asignado_nombre: null,
      fecha_asignacion_alistamiento: null
    });
    const updatedItem = this.storage.inventario().find(i => i.serial === asset.serial);
    if (updatedItem && this.selectedItem()?.serial === asset.serial) {
      this.selectedItem.set(updatedItem);
      const itemId = updatedItem._backendId || (updatedItem as any).id;
      if (itemId) {
        this.api.getHistorialItem(itemId).subscribe(h => this.historialActivo.set(h));
      }
    }
    this.reingresandoAsset.set(null);
  }

  confirmarReactivacion(asset: InventarioItem) {
    this.reactivandoAsset.set(asset);
  }

  async executeReactivacion(asset: InventarioItem) {
    await this.storage.updateAssetStatus(asset.serial, 'RECIBIDO', {
      fecha_baja: null,
      tecnico_asignado: null,
      tecnico_asignado_nombre: null,
      fecha_asignacion_alistamiento: null
    });
    const updatedItem = this.storage.inventario().find(i => i.serial === asset.serial);
    if (updatedItem && this.selectedItem()?.serial === asset.serial) {
      this.selectedItem.set(updatedItem);
      const itemId = updatedItem._backendId || (updatedItem as any).id;
      if (itemId) {
        this.api.getHistorialItem(itemId).subscribe(h => this.historialActivo.set(h));
      }
    }
    this.reactivandoAsset.set(null);
  }

  async executePendingReturn(asset: InventarioItem) {
    const user = this.auth.currentUser();
    const responsable = user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Usuario Desconocido';
    await this.storage.updateAssetStatus(asset.serial, 'EN_ESPERA_DEVOLUCION', { responsable_devolucion: responsable });

    // Sincronizar responsable_devolucion y poner en EN_ESPERA_DEVOLUCION sus periféricos asociados
    const mainAssetId = asset._backendId || (asset as any).id;
    if (mainAssetId) {
      const periphs = this.getPeripherals(mainAssetId);
      for (const p of periphs) {
        const extra: any = { responsable_devolucion: responsable };
        const newStatus = (p.estado === 'EN_ESPERA_DEVOLUCION' || p.estado === 'PENDIENTE_DEVOLUCION' || p.estado === 'DEVUELTO' || p.estado === 'DADO_DE_BAJA')
          ? p.estado
          : 'EN_ESPERA_DEVOLUCION';
        await this.storage.updateAssetStatus(p.serial, newStatus as AssetStatus, extra);
      }
    }

    // Actualizamos el modal si está abierto
    const updatedItem = this.storage.inventario().find(i => i.serial === asset.serial);
    if (updatedItem && this.selectedItem()?.serial === asset.serial) {
      this.selectedItem.set(updatedItem);
    }
    this.pendingReturnAsset.set(null);
  }

  deleteEquipo(asset: InventarioItem) {
    this.deletingAsset.set(asset);
  }

  async executeDelete(asset: InventarioItem) {
    try {
      const fechaBaja = new Date().toISOString();
      await this.storage.updateAssetStatus(asset.serial, 'DADO_DE_BAJA', { fecha_baja: fechaBaja });
      if (this.selectedItem()?.serial === asset.serial) {
        // Refrescar el modal si está abierto
        const updatedItem = this.storage.inventario().find(i => i.serial === asset.serial);
        if (updatedItem) {
          this.selectedItem.set(updatedItem);
        }
      }
      this.deletingAsset.set(null);
    } catch (err) {
      console.error('Error al dar de baja el equipo:', err);
      alert('Hubo un error al dar de baja el equipo. Verifica tu conexión.');
      this.deletingAsset.set(null);
    }
  }

  getRecepcion(asset: InventarioItem) {
    return this.storage.recepciones().find(r => r.id === asset.id_recepcion_origen) ?? null;
  }

  getAlistamiento(asset: InventarioItem) {
    return this.storage.alistamientos().find(a => a.inventario_item === asset._backendId) ?? null;
  }

  getAllAlistamientos(asset: InventarioItem) {
    return this.storage.alistamientos().filter(a => a.inventario_item === asset._backendId);
  }

  getDevolucion(asset: InventarioItem) {
    if (!asset.id_devolucion) return null;
    return this.storage.devoluciones().find(d => d.id === asset.id_devolucion) ?? null;
  }

  getFotoEntregador(asset: InventarioItem): string | null {
    const dev = this.getDevolucion(asset);
    if (dev?.foto_entregador) return dev.foto_entregador;
    const rec = this.getRecepcion(asset);
    return rec?.entregador.foto || null;
  }

  getFotoReceptor(asset: InventarioItem): string | null {
    const dev = this.getDevolucion(asset);
    if (dev?.foto_receptor) return dev.foto_receptor;
    const rec = this.getRecepcion(asset);
    return rec?.receptor.foto || null;
  }

  getEntregadorInfo(asset: InventarioItem): { nombre: string, fecha: string } | null {
    const dev = this.getDevolucion(asset);
    if (dev?.foto_entregador) {
      return {
        nombre: 'Entrega por Devolución',
        fecha: dev.fecha_creacion
      };
    }
    const rec = this.getRecepcion(asset);
    if (rec?.entregador.nombre) {
      return {
        nombre: rec.entregador.nombre,
        fecha: rec.fecha
      };
    }
    return null;
  }

  getReceptorInfo(asset: InventarioItem): { nombre: string, fecha: string } | null {
    const dev = this.getDevolucion(asset);
    if (dev?.foto_receptor) {
      return {
        nombre: 'Recepción por Devolución',
        fecha: dev.fecha_creacion
      };
    }
    const rec = this.getRecepcion(asset);
    if (rec?.receptor.nombre) {
      return {
        nombre: rec.receptor.nombre,
        fecha: rec.fecha
      };
    }
    return null;
  }

  getFotoAlistador(asset: InventarioItem): string | null {
    const dev = this.getDevolucion(asset);
    if (dev?.foto_alistador) return dev.foto_alistador;
    const ali = this.getAlistamiento(asset);
    return ali?.foto_tecnico || null;
  }

  getChecklistEntries(ali: any): Array<{ nombre: string, valor: string, observacion: string, evidencia: string }> {
    if (!ali?.respuestas) return [];
    return Object.values(ali.respuestas)
      .filter((v: any) => typeof v === 'object' && v !== null && 'nombre' in v)
      .map((v: any) => ({
        nombre: v.nombre || '',
        valor: v.valor || 'SIN_RESPONDER',
        observacion: v.observacion || '',
        evidencia: v.evidencia || ''
      }));
  }

  clearFilters() {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.typeFilter.set('');
    this.ubicacionFilter.set('');
    this.propioFilter.set('');
  }

  formatStatus(status: string): string {
    if (status === 'PENDIENTE_DEVOLUCION') return 'PENDIENTE CONF. PROVEEDOR';
    if (status === 'EN_ESPERA_DEVOLUCION') return 'EN ESPERA DEVOLUCIÓN';
    if (status === 'ALMACENADO') return 'ALMACENADO';
    if (status === 'DADO_DE_BAJA') return 'DADO DE BAJA';
    return status;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'RECIBIDO': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'ALISTAMIENTO': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DISPONIBLE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ENTREGADO': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'EN_ESPERA_DEVOLUCION': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'PENDIENTE_DEVOLUCION': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DEVUELTO': return 'bg-red-50 text-red-700 border-red-200';
      case 'ALMACENADO': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'DADO_DE_BAJA': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }

  isPeripheral(item?: InventarioItem | null): boolean {
    if (!item || !item.tipo_producto) return false;
    const tpList = this.storage.tiposProducto();
    const tp = tpList.find((t: any) => t.nombre.toUpperCase() === String(item.tipo_producto).toUpperCase());
    return tp ? !!tp.es_periferico : false;
  }

  getPeripheralsCount(assetId?: number): number {
    if (!assetId) return 0;
    return this.getPeripherals(assetId).length;
  }

  getPeripherals(assetId?: number): InventarioItem[] {
    if (!assetId) return [];
    return this.storage.inventario().filter(a =>
      a.equipo_asociado === assetId &&
      a._backendId !== assetId &&
      (a as any).id !== assetId &&
      a.item !== assetId &&
      this.isPeripheral(a)
    );
  }

  getAssociatedItemNumber(associatedId?: number): number | string {
    if (!associatedId) return '-';
    const mainAsset = this.storage.inventario().find(a => a._backendId === associatedId || (a as any).id === associatedId);
    return mainAsset ? (mainAsset.item || '-') : '-';
  }

  getReplacementInfo(asset?: InventarioItem | null): { itemNumber?: number | string; serial?: string; displayText: string } | null {
    if (!asset) return null;
    const inventario = this.storage.inventario();

    if (asset.equipo_reemplazante_serial) {
      const rep = inventario.find(a => a.serial?.toUpperCase() === asset.equipo_reemplazante_serial?.toUpperCase());
      if (rep && rep.item) {
        return { itemNumber: rep.item, serial: rep.serial, displayText: `Ítem #${rep.item}` };
      }
      return { serial: asset.equipo_reemplazante_serial, displayText: `Serial ${asset.equipo_reemplazante_serial}` };
    }

    const rep = inventario.find(a => a.es_cambio && (
      (asset.item != null && String(a.cambio_por).trim() === String(asset.item).trim()) ||
      (asset.serial && String(a.cambio_por).trim().toUpperCase() === asset.serial.trim().toUpperCase())
    ));

    if (rep) {
      if (rep.item) {
        return { itemNumber: rep.item, serial: rep.serial, displayText: `Ítem #${rep.item}` };
      }
      return { serial: rep.serial, displayText: `Serial ${rep.serial}` };
    }

    return null;
  }

  toggleActionsMenu(item: InventarioItem, event: MouseEvent) {
    // Prevent click from bubbling to document listener
    if (event) {
      event.stopPropagation();
    }
    const el = (event.currentTarget as HTMLElement) || (event.target as HTMLElement);
    if (!el) { console.warn('toggleActionsMenu: no element reference'); return; }
    const rect = el.getBoundingClientRect();
    if (this.activeMenuId() === item.serial) {
      this.activeMenuId.set(null);
    } else {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // We estimate the menu height to be around 280px.
      // If there is not enough space below, and there is more space above, we open it upwards.
      if (spaceBelow < 280 && spaceAbove > spaceBelow) {
        this.menuPosition = {
          bottom: `${window.innerHeight - rect.top + 8}px`,
          left: `${rect.right - 256}px`
        };
      } else {
        this.menuPosition = {
          top: `${rect.bottom + 8}px`,
          left: `${rect.right - 256}px`
        };
      }
      this.activeMenuId.set(item.serial);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target && typeof target.closest === 'function') {
      const inside = target.closest('.actions-menu-container');
      if (!inside) {
        this.activeMenuId.set(null);
      }
    } else {
      this.activeMenuId.set(null);
    }
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.activeMenuId.set(null);
  }

  canReassignPeripheral(item: InventarioItem): boolean {
    if (!this.isPeripheral(item)) return false;
    const excludedStates = ['EN_ESPERA_DEVOLUCION', 'PENDIENTE_DEVOLUCION', 'DEVUELTO', 'DADO_DE_BAJA'];
    return !item.estado || !excludedStates.includes(item.estado.toUpperCase());
  }

  openReassignModal(peripheral: InventarioItem) {
    if (!this.canReassignPeripheral(peripheral)) return;
    this.reassociatingPeripheral.set(peripheral);
    this.reassociationSearchQuery.set('');
    this.selectedReassociationComputer.set(null);
    this.showReassociateDropdown.set(false);
    this.activeMenuId.set(null);
  }

  closeReassignModal() {
    this.reassociatingPeripheral.set(null);
    this.reassociationSearchQuery.set('');
    this.selectedReassociationComputer.set(null);
  }

  filteredReassignmentComputers = computed(() => {
    const query = this.reassociationSearchQuery().toLowerCase().trim();
    const tipos = this.tiposProductoFull();
    const allAssets = this.storage.inventario();
    const excludedStates = ['DADO_DE_BAJA', 'DEVUELTO', 'PENDIENTE_DEVOLUCION', 'EN_ESPERA_DEVOLUCION'];

    const allowedAssets = allAssets.filter(a => {
      const tpName = a.tipo_producto ? a.tipo_producto.trim().toUpperCase() : '';
      const tipoObj = tipos.find(t => t.nombre.trim().toUpperCase() === tpName);
      const isPeriph = tipoObj ? !!tipoObj.es_periferico : false;
      const isNotExcluded = !a.estado || !excludedStates.includes(a.estado.toUpperCase());
      return !isPeriph && isNotExcluded;
    });

    if (!query) return allowedAssets.slice(0, 10);
    return allowedAssets.filter(a =>
      (a.serial?.toLowerCase().includes(query)) ||
      (a.item?.toString().includes(query)) ||
      (a.marca?.toLowerCase().includes(query)) ||
      (a.modelo?.toLowerCase().includes(query)) ||
      (a.tipo_producto?.toLowerCase().includes(query))
    ).slice(0, 30);
  });

  async executeReassociation() {
    const peripheral = this.reassociatingPeripheral();
    const computer = this.selectedReassociationComputer();
    if (!peripheral || !computer) return;

    const excludedStates = ['DADO_DE_BAJA', 'DEVUELTO', 'PENDIENTE_DEVOLUCION', 'EN_ESPERA_DEVOLUCION'];
    if (computer.estado && excludedStates.includes(computer.estado.toUpperCase())) {
      alert('No se puede asociar el periférico a un equipo devuelto o dado de baja.');
      return;
    }

    const targetId = computer.item || computer._backendId || (computer as any).id;
    if (targetId && peripheral._backendId) {
      try {
        await firstValueFrom(this.api.updateInventarioItem(peripheral._backendId, {
          equipo_asociado: targetId,
          ...(computer.ubicacion ? { ubicacion: computer.ubicacion } : {})
        }));
        await this.storage.loadInventarioFromApi();
        this.closeReassignModal();
      } catch (err: any) {
        console.error('Error reassigning peripheral:', err);
        let msg = 'No se pudo reasignar el periférico.';
        if (err?.error?.equipo_asociado) {
          const detail = Array.isArray(err.error.equipo_asociado) ? err.error.equipo_asociado.join(', ') : err.error.equipo_asociado;
          msg = `Error de asociación: ${detail}`;
        } else if (err?.error?.detail) {
          msg = err.error.detail;
        }
        alert(msg);
      }
    }
  }
}
