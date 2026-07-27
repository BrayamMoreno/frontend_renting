import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { StorageService } from '../../services/storage';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { InventarioItem } from '../../models/app-state';

@Component({
  selector: 'app-bajas',
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
          <h2 class="text-3xl font-bold tracking-tight text-slate-800">Equipos Dados de Baja</h2>
          <p class="text-slate-500 mt-1">Historial y registro de todos los activos IT que han sido retirados del inventario.</p>
        </div>
        
        <div class="flex flex-wrap items-center gap-3">
          <div class="relative w-full sm:w-64">
            <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 scale-90">search</mat-icon>
            <input [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event); currentPage.set(1)"
                   type="text" 
                   placeholder="Buscar serial, marca, modelo..." 
                   class="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all">
          </div>

          <select [ngModel]="propioFilter()" (ngModelChange)="propioFilter.set($event); currentPage.set(1)" class="bg-white border border-slate-200 text-slate-600 text-sm rounded-xl px-4 py-2 shadow-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand cursor-pointer">
            <option value="">Propios y Rentados</option>
            <option value="propio">Solo Propios</option>
            <option value="rentado">Solo Rentados</option>
          </select>

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
                <th class="px-5 py-4">Fecha de Baja</th>
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
                  <div class="font-bold text-slate-800 flex items-center gap-2">
                    {{ item.tipo_producto || 'No Definido' }}
                    <span *ngIf="item.es_propio" class="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-tighter">Propio</span>
                    <span *ngIf="!item.es_propio" class="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">Rentado</span>
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

                  <div *ngIf="getReplacementInfo(item) as repInfo" class="text-[10px] text-purple-700 font-bold mt-1 flex items-center gap-1 bg-purple-50 w-fit px-2 py-0.5 rounded-full border border-purple-200">
                    <mat-icon class="scale-[0.5] -mx-1">swap_horiz</mat-icon>
                    Reemplazado por {{ repInfo.displayText }}
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
                  <span [class]="getStatusClass(item.estado)" class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border">
                    {{ formatStatus(item.estado) }}
                  </span>
                  <span class="text-[10px] text-slate-400 font-medium block mt-1">Ingreso: {{ item.fecha_ingreso | date:'shortDate' }}</span>
                </td>
                <td class="px-5 py-3">
                  <span *ngIf="item.fecha_baja" class="inline-flex items-center gap-1 text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-md border border-rose-100 leading-none whitespace-nowrap">
                    <mat-icon class="!text-[12px] !w-[12px] !h-[12px] !leading-none shrink-0">event_busy</mat-icon>
                    Baja: {{ item.fecha_baja | date:'dd/MM/yyyy' }}
                  </span>
                </td>
                <td class="px-5 py-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button (click)="openModal(item)" 
                            class="text-slate-400 hover:text-[#FF6B00] p-1.5 rounded-lg hover:bg-orange-50 transition-colors" 
                            title="Ver detalle completo">
                      <mat-icon>visibility</mat-icon>
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Empty State -->
              <tr *ngIf="filteredInventory().length === 0">
                <td colspan="6" class="py-16">
                  <div class="flex flex-col items-center justify-center text-slate-400">
                    <mat-icon class="scale-150 mb-4 opacity-50">archive</mat-icon>
                    <p class="font-semibold text-slate-600 mb-1">No se encontraron activos dados de baja</p>
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
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ficha Técnica del Activo (Dado de Baja)</p>
              <h3 class="text-xl font-black text-slate-800">{{ selectedItem()?.serial }}</h3>
            </div>
            <div class="flex items-center gap-3">
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
              <!-- Fecha de baja (si aplica) -->
              <div *ngIf="asset.fecha_baja" class="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <p class="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">Fecha de Baja</p>
                <p class="text-sm font-bold text-rose-800 leading-snug">{{ asset.fecha_baja | date:'mediumDate' }}</p>
              </div>
            </div>

            <!-- Asociaciones -->
            <div *ngIf="getPeripheralsCount(asset._backendId) > 0 || asset.equipo_asociado" class="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Relaciones en Inventario</p>
              <div class="flex flex-col gap-4">
                <div *ngIf="asset.equipo_asociado" class="flex items-center gap-2 text-slate-700 font-bold text-sm bg-white border border-slate-200 px-3 py-2 rounded-xl w-fit">
                  <mat-icon class="scale-90 text-slate-400">link</mat-icon>
                  Periférico asociado al Equipo Principal Ítem #{{ getAssociatedItemNumber(asset.equipo_asociado) }}
                </div>

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
                  <p class="text-[10px] text-purple-600 font-bold uppercase">Reemplazado por</p>
                  <p class="text-sm font-bold text-purple-900 mt-0.5 flex items-center gap-1.5">
                    <mat-icon class="scale-75 text-purple-600">swap_horiz</mat-icon>
                    <span>{{ repInfo.displayText }}</span>
                    <span *ngIf="repInfo.itemNumber && repInfo.serial" class="text-xs font-normal text-purple-600">({{ repInfo.serial }})</span>
                  </p>
                </div>
              </div>
            </div>

            <!-- Responsables del Proceso -->
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

            <!-- HISTORIAL DE ALISTAMIENTOS -->
            <div class="mt-8 border-t border-slate-200 pt-6">
              <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <mat-icon class="scale-75">history</mat-icon> Historial de Alistamientos
              </h4>
              <div *ngIf="getAllAlistamientos(asset).length > 0; else noAlistamientoHistory" class="space-y-4">
                <div *ngFor="let ali of getAllAlistamientos(asset)" class="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm space-y-4">
                  <div class="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div class="flex items-center gap-2">
                      <mat-icon class="text-amber-500">engineering</mat-icon>
                      <div>
                        <span class="font-bold text-slate-700 text-sm">{{ ali.tecnico_nombre }}</span>
                        <span class="text-xs text-slate-400 block">Técnico Asignado</span>
                      </div>
                    </div>
                    <div class="text-right">
                      <span class="text-xs font-bold text-slate-500 block">{{ ali.fecha | date:'medium' }}</span>
                      <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">Finalizado</span>
                    </div>
                  </div>

                  <!-- Checklist -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div *ngFor="let entry of getChecklistEntries(ali)" class="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <mat-icon [class]="entry.valor === 'OK' ? 'text-emerald-500' : entry.valor === 'FALSO' ? 'text-red-500' : 'text-slate-400'" class="scale-90 flex-shrink-0 mt-0.5">
                        {{ entry.valor === 'OK' ? 'check_circle' : entry.valor === 'FALSO' ? 'cancel' : 'help_outline' }}
                      </mat-icon>
                      <div class="flex-1 min-w-0">
                        <p class="text-xs font-bold text-slate-700 truncate" [title]="entry.nombre">{{ entry.nombre }}</p>
                        <p class="text-[10px] text-slate-500 mt-0.5" *ngIf="entry.observacion">
                          <strong class="font-semibold">Obs:</strong> {{ entry.observacion }}
                        </p>
                        <button *ngIf="entry.evidencia" (click)="viewingEvidence = entry.evidencia" class="mt-1.5 flex items-center gap-1 text-[10px] text-brand font-bold hover:underline">
                          <mat-icon style="font-size: 10px; width: 10px; height: 10px;">photo</mat-icon> Ver evidencia
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            <!-- Historial de alistamientos empty state fallback -->
            <ng-template #noAlistamientoHistory>
              <div class="p-6 bg-slate-50 rounded-2xl text-center text-slate-400 border border-slate-100 text-xs italic">
                No se registran alistamientos previos para este activo.
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

      <!-- Evidence zoom modal -->
      <div *ngIf="viewingEvidence" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80" (click)="viewingEvidence = ''">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        <img [src]="viewingEvidence" class="relative max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain">
        <button class="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl backdrop-blur-sm transition-colors"
                (click)="viewingEvidence = ''; $event.stopPropagation()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>
  `
})
export class BajasComponent implements OnInit {
  private storage = inject(StorageService);
  private api = inject(ApiService);
  public auth = inject(AuthService);
  private router = inject(Router);

  isLoading = this.storage.isLoading;
  apiError = this.storage.apiError;

  searchQuery = signal('');
  typeFilter = signal('');
  ubicacionFilter = signal('');
  propioFilter = signal<'' | 'propio' | 'rentado'>('');
  selectedItem = signal<InventarioItem | null>(null);
  historialActivo = signal<any[]>([]);
  viewingEvidence = '';

  catalogTypes = signal<string[]>([]);
  ubicaciones = signal<any[]>([]);
  currentPage = signal(1);
  pageSize = signal(10);

  ngOnInit() {
    if (!this.auth.hasPermission('ver_inventario')) {
      this.router.navigate(['/profile']);
      return;
    }
    this.storage.loadInventarioFromApi();
    this.storage.loadRecepcionesFromApi();
    this.storage.loadDevolucionesFromApi();
    this.storage.loadAlistamientosFromApi();
    this.api.getUbicaciones().subscribe({
      next: (res) => {
        const sorted = res.sort((a, b) => a.path.localeCompare(b.path));
        this.ubicaciones.set(sorted);
      },
      error: (err) => console.error('Error cargando ubicaciones:', err)
    });
    this.api.getTiposProducto().subscribe({
      next: (res) => this.catalogTypes.set(res.map(t => t.nombre).sort()),
      error: (err) => console.error('Error cargando tipos:', err)
    });
  }

  filteredInventory = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const type = this.typeFilter();
    const ubicacion = this.ubicacionFilter();
    const propio = this.propioFilter();
    const items = this.storage.inventario();

    const filtered = items.filter(i => {
      // 1. Filter only written-off items (DADO_DE_BAJA)
      if (i.estado !== 'DADO_DE_BAJA') return false;

      // 2. Text search
      const matchesSearch = !query ||
        i.serial.toLowerCase().includes(query) ||
        i.marca.toLowerCase().includes(query) ||
        i.modelo.toLowerCase().includes(query) ||
        (i.tipo_producto && i.tipo_producto.toLowerCase().includes(query)) ||
        (i.item && i.item.toString() === query);

      // 3. Propio / Rentado filter
      const matchesPropio =
        !propio ||
        (propio === 'propio' && i.es_propio === true) ||
        (propio === 'rentado' && !i.es_propio);

      // 4. Type filter
      const matchesType = !type || i.tipo_producto === type;

      // 5. Location filter
      const matchesUbicacion = !ubicacion || i.ubicacion === ubicacion;

      return matchesSearch && matchesPropio && matchesType && matchesUbicacion;
    });

    // Sort by fecha_baja descending (most recently written off first)
    return filtered.sort((a, b) => {
      const timeA = a.fecha_baja ? new Date(a.fecha_baja).getTime() : 0;
      const timeB = b.fecha_baja ? new Date(b.fecha_baja).getTime() : 0;
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
    const BOM = '\uFEFF';
    const headers = ['Ítem', 'Serial', 'Marca', 'Modelo', 'Tipo de Producto', 'Procesador', 'RAM', 'Disco', 'Tipo Disco', 'Ubicación', 'Estado', 'Fecha de Baja', 'Comentarios'];
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
      i.fecha_baja ? new Date(i.fecha_baja).toISOString().split('T')[0] : '',
      i.comentarios || ''
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `equipos_de_baja_${new Date().toISOString().split('T')[0]}.csv`;
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
    this.typeFilter.set('');
    this.ubicacionFilter.set('');
    this.propioFilter.set('');
  }

  formatStatus(status: string): string {
    if (status === 'DADO_DE_BAJA') return 'DADO DE BAJA';
    return status;
  }

  getStatusClass(status: string): string {
    if (status === 'DADO_DE_BAJA') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  }

  isPeripheral(item?: InventarioItem | null): boolean {
    if (!item || !item.tipo_producto) return false;
    const tpList = this.storage.tiposProducto();
    const tp = tpList.find((t: any) => t.nombre.toUpperCase() === String(item.tipo_producto).toUpperCase());
    return tp ? !!tp.es_periferico : false;
  }

  getPeripheralsCount(assetId: number | undefined): number {
    if (!assetId) return 0;
    return this.getPeripherals(assetId).length;
  }

  getPeripherals(assetId: number | undefined): InventarioItem[] {
    if (!assetId) return [];
    return this.storage.inventario().filter(a =>
      a.equipo_asociado === assetId &&
      a._backendId !== assetId &&
      (a as any).id !== assetId &&
      a.item !== assetId &&
      this.isPeripheral(a)
    );
  }

  getAssociatedItemNumber(associatedId: number | undefined): number | string {
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
}
