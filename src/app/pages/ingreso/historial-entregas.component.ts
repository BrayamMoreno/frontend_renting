import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-historial-entregas',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="space-y-8 animate-in fade-in duration-500">

      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 class="text-3xl font-bold tracking-tight text-slate-800">Historial de Entregas</h2>
          <p class="text-slate-500 mt-1">Registro completo de todas las recepciones de equipos realizadas.</p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <!-- Search -->
          <div class="relative w-full sm:w-72">
            <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 scale-90">search</mat-icon>
            <input [(ngModel)]="searchQuery" (ngModelChange)="currentPage.set(1)"
                   type="text" placeholder="Buscar entregador, cédula, empresa..."
                   class="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all">
          </div>
          <!-- Proveedor filter -->
          <select [(ngModel)]="proveedorFilter" (ngModelChange)="currentPage.set(1)"
                  class="bg-white border border-slate-200 text-slate-600 text-sm rounded-xl px-4 py-2 shadow-sm outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer">
            <option value="">Todos los proveedores</option>
            <option *ngFor="let p of proveedoresUnicos()" [value]="p">{{ p }}</option>
          </select>
          <!-- Refresh -->
          <button (click)="cargar()" [disabled]="isLoading()"
                  class="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl px-4 py-2 shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50">
            <mat-icon class="scale-90" [class.animate-spin]="isLoading()">refresh</mat-icon>
            Actualizar
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex items-center gap-3 bg-sky-50 border border-sky-200 text-sky-700 px-4 py-3 rounded-xl text-sm font-medium">
        <div class="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
        Cargando historial de entregas...
      </div>

      <!-- Stats cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4" *ngIf="!isLoading()">
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Entregas</p>
          <p class="text-3xl font-black text-slate-800 mt-1">{{ recepciones().length }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Entregadores únicos</p>
          <p class="text-3xl font-black text-[#FF6B00] mt-1">{{ entregadoresUnicos().length }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Empresas</p>
          <p class="text-3xl font-black text-slate-800 mt-1">{{ proveedoresUnicos().length }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Equipos Ingresados</p>
          <p class="text-3xl font-black text-emerald-600 mt-1">{{ totalEquipos() }}</p>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" *ngIf="!isLoading()">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-slate-50 border-b border-slate-100">
              <tr class="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                <th class="px-5 py-3">#</th>
                <th class="px-5 py-3">Fecha</th>
                <th class="px-5 py-3">Entregador</th>
                <th class="px-5 py-3">Cédula</th>
                <th class="px-5 py-3">Empresa / Proveedor</th>
                <th class="px-5 py-3">Receptor</th>
                <th class="px-5 py-3 text-center">Equipos</th>
                <th class="px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr *ngIf="paginados().length === 0">
                <td colspan="8" class="px-5 py-16 text-center text-slate-400 text-sm">
                  <mat-icon class="scale-150 mb-3 block mx-auto text-slate-300">inbox</mat-icon>
                  No se encontraron entregas
                </td>
              </tr>
              <tr *ngFor="let rec of paginados()"
                  class="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                  (click)="verDetalle(rec)">
                <td class="px-5 py-3 font-mono text-xs text-slate-400">{{ rec.id }}</td>
                <td class="px-5 py-3">
                  <p class="font-bold text-slate-700 text-xs">{{ rec.fecha | date:'dd/MM/yyyy' }}</p>
                  <p class="text-[10px] text-slate-400">{{ rec.fecha | date:'HH:mm' }}</p>
                </td>
                <td class="px-5 py-3">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <mat-icon class="scale-[0.6] text-[#FF6B00]">person</mat-icon>
                    </div>
                    <div>
                      <p class="font-semibold text-slate-800 text-xs">{{ rec.entregador_nombre || '—' }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-3 font-mono text-xs text-slate-500">{{ rec.entregador_cedula || '—' }}</td>
                <td class="px-5 py-3">
                  <span *ngIf="rec.proveedor_nombre"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                    <mat-icon class="scale-[0.55]">business</mat-icon>
                    {{ rec.proveedor_nombre }}
                  </span>
                  <span *ngIf="!rec.proveedor_nombre" class="text-slate-400 text-xs">—</span>
                </td>
                <td class="px-5 py-3 text-xs text-slate-600">{{ rec.receptor_nombre }}</td>
                <td class="px-5 py-3 text-center">
                  <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black"
                        [class]="(rec.equipos?.length || 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'">
                    {{ rec.equipos?.length || 0 }}
                  </span>
                </td>
                <td class="px-5 py-3">
                  <button (click)="verDetalle(rec); $event.stopPropagation()"
                          class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs font-bold text-[#FF6B00] hover:underline">
                    <mat-icon class="scale-75">open_in_new</mat-icon>
                    Ver
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="px-5 py-4 border-t border-slate-100 flex items-center justify-between" *ngIf="totalPages() > 1">
          <p class="text-xs text-slate-500 font-medium">
            Mostrando {{ (currentPage()-1)*pageSize + 1 }}–{{ paginacionHasta() }} de {{ filtrados().length }}
          </p>
          <div class="flex items-center gap-1">
            <button (click)="currentPage.update(p => p - 1)" [disabled]="currentPage() === 1"
                    class="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-all">
              <mat-icon class="scale-75">chevron_left</mat-icon>
            </button>
            <ng-container *ngFor="let p of pageNumbers()">
              <button (click)="currentPage.set(p)"
                      class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all"
                      [class]="p === currentPage() ? 'bg-[#FF6B00] text-white shadow-md' : 'border border-slate-200 text-slate-500 hover:bg-slate-50'">
                {{ p }}
              </button>
            </ng-container>
            <button (click)="currentPage.update(p => p + 1)" [disabled]="currentPage() === totalPages()"
                    class="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-all">
              <mat-icon class="scale-75">chevron_right</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Detalle -->
      <div *ngIf="recepcionSeleccionada()"
           class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
           (click)="cerrarDetalle()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
             (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h3 class="text-lg font-bold text-slate-800">Detalle de Entrega #{{ recepcionSeleccionada()?.id }}</h3>
              <p class="text-xs text-slate-400 mt-0.5">{{ recepcionSeleccionada()?.fecha | date:'dd/MM/yyyy HH:mm' }}</p>
            </div>
            <button (click)="cerrarDetalle()" class="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
              <mat-icon class="scale-90">close</mat-icon>
            </button>
          </div>

          <div class="p-6 space-y-6" *ngIf="recepcionSeleccionada() as rec">
            <!-- Entregador & Receptor -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <p class="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">Entregador</p>
                <div class="flex items-center gap-3 mb-3">
                  <div *ngIf="rec.entregador_foto; else noFotoEnt"
                       class="w-14 h-14 rounded-xl overflow-hidden border-2 border-orange-200 flex-shrink-0">
                    <img [src]="rec.entregador_foto" class="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" (click)="imagenAmpliada.set(rec.entregador_foto)">
                  </div>
                  <ng-template #noFotoEnt>
                    <div class="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <mat-icon class="text-orange-400">person</mat-icon>
                    </div>
                  </ng-template>
                  <div>
                    <p class="font-bold text-slate-800">{{ rec.entregador_nombre || '—' }}</p>
                    <p class="text-xs text-slate-500 font-mono">{{ rec.entregador_cedula || '—' }}</p>
                    <span *ngIf="rec.proveedor_nombre"
                          class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                      <mat-icon class="scale-[0.55]">business</mat-icon>
                      {{ rec.proveedor_nombre }}
                    </span>
                  </div>
                </div>
                <div *ngIf="rec.entregador_firma" class="mt-2">
                  <p class="text-[10px] text-orange-400 font-bold mb-1">FIRMA</p>
                  <img [src]="rec.entregador_firma" class="h-12 object-contain rounded border border-orange-100 bg-white p-1 cursor-pointer hover:opacity-90 transition-opacity" (click)="imagenAmpliada.set(rec.entregador_firma)">
                </div>
              </div>

              <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Receptor</p>
                <div class="flex items-center gap-3">
                  <div *ngIf="rec.receptor_foto; else noFotoRec"
                       class="w-14 h-14 rounded-xl overflow-hidden border-2 border-slate-200 flex-shrink-0">
                    <img [src]="rec.receptor_foto" class="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" (click)="imagenAmpliada.set(rec.receptor_foto)">
                  </div>
                  <ng-template #noFotoRec>
                    <div class="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <mat-icon class="text-slate-400">badge</mat-icon>
                    </div>
                  </ng-template>
                  <div>
                    <p class="font-bold text-slate-800">{{ rec.receptor_nombre }}</p>
                  </div>
                </div>
                <div *ngIf="rec.receptor_firma" class="mt-2">
                  <p class="text-[10px] text-slate-400 font-bold mb-1">FIRMA</p>
                  <img [src]="rec.receptor_firma" class="h-12 object-contain rounded border border-slate-200 bg-white p-1 cursor-pointer hover:opacity-90 transition-opacity" (click)="imagenAmpliada.set(rec.receptor_firma)">
                </div>
              </div>
            </div>

            <!-- Equipos -->
            <div>
              <p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                Equipos recibidos ({{ rec.equipos?.length || 0 }})
              </p>
              <div *ngIf="!rec.equipos?.length" class="text-sm text-slate-400 italic py-4 text-center">Sin equipos registrados</div>
              <div class="space-y-2">
                <div *ngFor="let eq of rec.equipos"
                     class="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <mat-icon class="scale-75 text-slate-400">laptop</mat-icon>
                    </div>
                    <div class="min-w-0">
                      <p class="font-bold text-slate-800 text-sm truncate">{{ eq.marca }} {{ eq.modelo }}</p>
                      <p class="font-mono text-[10px] text-slate-400 truncate">{{ eq.serial }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 flex-shrink-0">
                    <span *ngIf="eq.item" class="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">Item {{ eq.item }}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          [class]="getEstadoClass(eq.estado)">
                      {{ eq.estado }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Visor de Imagen/Firma Ampliada -->
      <div *ngIf="imagenAmpliada()" 
           class="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 cursor-pointer"
           (click)="imagenAmpliada.set('')">
        <div class="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden p-2 shadow-2xl animate-in zoom-in-95 duration-200" (click)="$event.stopPropagation()">
          <img [src]="imagenAmpliada()" class="max-w-full max-h-[80vh] rounded-2xl object-contain">
          <button (click)="imagenAmpliada.set('')" class="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/75 text-white rounded-full flex items-center justify-center transition-colors">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

    </div>
  `
})
export class HistorialEntregasComponent implements OnInit {
  private api = inject(ApiService);

  isLoading = signal(false);
  recepciones = signal<any[]>([]);
  recepcionSeleccionada = signal<any | null>(null);
  imagenAmpliada = signal<string>('');

  searchQuery = '';
  proveedorFilter = '';
  currentPage = signal(1);
  readonly pageSize = 15;

  filtrados = computed(() => {
    let data = this.recepciones();
    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      const terms = q.split(/\s+/);
      data = data.filter(r => {
        const entNombre = (r.entregador_nombre || '').toLowerCase();
        const entCedula = (r.entregador_cedula || '').toLowerCase();
        const prov = (r.proveedor_nombre || '').toLowerCase();
        const rec = (r.receptor_nombre || '').toLowerCase();
        const equiposText = (r.equipos || []).map((eq: any) =>
          `${eq.item || ''} ${eq.serial || ''} ${eq.marca || ''} ${eq.modelo || ''} ${eq.tipo_producto || ''}`
        ).join(' ').toLowerCase();

        const fullText = `${entNombre} ${entCedula} ${prov} ${rec} ${equiposText}`;
        return terms.every(term => fullText.includes(term));
      });
    }
    if (this.proveedorFilter) {
      data = data.filter(r => r.proveedor_nombre === this.proveedorFilter);
    }
    return data;
  });

  paginados = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtrados().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtrados().length / this.pageSize)));

  paginacionHasta = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.filtrados().length)
  );

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  proveedoresUnicos = computed(() => {
    const names = this.recepciones()
      .map(r => r.proveedor_nombre)
      .filter((n): n is string => !!n);
    return [...new Set(names)].sort();
  });

  entregadoresUnicos = computed(() => {
    const cedulas = this.recepciones()
      .map(r => r.entregador_cedula)
      .filter((c): c is string => !!c);
    return [...new Set(cedulas)];
  });

  totalEquipos = computed(() =>
    this.recepciones().reduce((acc, r) => acc + (r.equipos?.length || 0), 0)
  );

  ngOnInit() {
    this.cargar();
  }

  async cargar() {
    this.isLoading.set(true);
    try {
      const data = await firstValueFrom(this.api.getRecepciones());
      // ordenar de más reciente a más antigua
      this.recepciones.set(
        (data as any[]).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  verDetalle(rec: any) {
    this.recepcionSeleccionada.set(rec);
  }

  cerrarDetalle() {
    this.recepcionSeleccionada.set(null);
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      RECIBIDO:            'bg-sky-100 text-sky-700',
      ALISTAMIENTO:        'bg-amber-100 text-amber-700',
      DISPONIBLE:          'bg-emerald-100 text-emerald-700',
      ENTREGADO:           'bg-violet-100 text-violet-700',
      EN_ESPERA_DEVOLUCION:'bg-orange-100 text-orange-700',
      PENDIENTE_DEVOLUCION:'bg-red-100 text-red-700',
      DEVUELTO:            'bg-slate-100 text-slate-600',
      DADO_DE_BAJA:        'bg-gray-100 text-gray-500',
    };
    return map[estado] || 'bg-slate-100 text-slate-600';
  }
}
