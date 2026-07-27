import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage';
import { ApiService } from '../../services/api';
import { AuthService, User } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';
import { InventarioItem } from '../../models/app-state';

@Component({
  selector: 'app-pendientes-devolucion',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="space-y-8 animate-in slide-in-from-bottom duration-500">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-200">
              <mat-icon>hourglass_top</mat-icon>
            </div>
            <h2 class="text-3xl font-bold tracking-tight">Pendientes de Acta de Devolución</h2>
          </div>
          <p class="text-slate-500 ml-13">Equipos reemplazados que aún no tienen acta de devolución generada.</p>
        </div>
        <button (click)="verificarAlertas()" [disabled]="verificando()"
          class="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 font-bold text-sm border border-amber-200 hover:bg-amber-100 transition-all disabled:opacity-50">
          <div *ngIf="verificando()" class="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <mat-icon *ngIf="!verificando()" class="scale-90">refresh</mat-icon>
          {{ verificando() ? 'Verificando...' : 'Verificar Alertas' }}
        </button>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="card p-5 flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <mat-icon>hourglass_empty</mat-icon>
          </div>
          <div>
            <p class="text-2xl font-black text-slate-800">{{ enEspera().length }}</p>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">En Espera</p>
          </div>
        </div>
        <div class="card p-5 flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
            <mat-icon>warning</mat-icon>
          </div>
          <div>
            <p class="text-2xl font-black text-slate-800">{{ vencidos().length }}</p>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Más de 7 días</p>
          </div>
        </div>
        <div class="card p-5 flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <mat-icon>notifications_active</mat-icon>
          </div>
          <div>
            <p class="text-2xl font-black text-slate-800">{{ alertasActivas().length }}</p>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Alertas Activas</p>
          </div>
        </div>
      </div>

      <!-- Tabs (Proveedores vs Propios) -->
      <div class="flex border-b border-slate-200">
        <button (click)="activeTabDev.set('proveedores'); currentPage.set(1)" 
                [class.border-brand]="activeTabDev() === 'proveedores'" 
                [class.text-brand]="activeTabDev() === 'proveedores'"
                [class.border-transparent]="activeTabDev() !== 'proveedores'"
                [class.text-slate-500]="activeTabDev() !== 'proveedores'"
                class="px-6 py-3 border-b-2 font-bold text-sm transition-all focus:outline-none cursor-pointer flex items-center gap-2">
          <mat-icon class="scale-75">business</mat-icon> Equipos Proveedores (Renting)
        </button>
        <button (click)="activeTabDev.set('propios'); currentPage.set(1)" 
                [class.border-brand]="activeTabDev() === 'propios'" 
                [class.text-brand]="activeTabDev() === 'propios'"
                [class.border-transparent]="activeTabDev() !== 'propios'"
                [class.text-slate-500]="activeTabDev() !== 'propios'"
                class="px-6 py-3 border-b-2 font-bold text-sm transition-all focus:outline-none cursor-pointer flex items-center gap-2">
          <mat-icon class="scale-75">home</mat-icon> Equipos Propios
        </button>
      </div>

      <!-- Toolbar con Filtros -->
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative w-full sm:w-64">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 scale-90">search</mat-icon>
          <input [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event); currentPage.set(1)"
                 type="text" 
                 placeholder="Buscar serial, marca..." 
                 class="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all">
        </div>

        <select [ngModel]="ubicacionFilter()" (ngModelChange)="ubicacionFilter.set($event); currentPage.set(1)" class="bg-white border border-slate-200 text-slate-600 text-sm rounded-xl px-4 py-2 shadow-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand cursor-pointer max-w-[200px] truncate">
          <option value="">Todas las Ubicaciones</option>
          <option *ngFor="let u of ubicaciones()" [value]="u">{{ u }}</option>
        </select>

        <select [ngModel]="responsableFilter()" (ngModelChange)="responsableFilter.set($event); currentPage.set(1)" class="bg-white border border-slate-200 text-slate-600 text-sm rounded-xl px-4 py-2 shadow-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand cursor-pointer max-w-[200px] truncate">
          <option value="">Todos los Responsables</option>
          <option *ngFor="let r of responsables()" [value]="r">{{ r }}</option>
        </select>
      </div>

      <!-- Equipment Table -->
      <div class="card p-0 overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-800">Equipos en Espera</h3>
          <span class="text-xs text-slate-400 font-medium">Se actualiza automáticamente al cargar</span>
        </div>

        <div *ngIf="loading()" class="flex items-center justify-center py-16">
          <div class="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div *ngIf="!loading()">
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left" *ngIf="filteredEnEspera().length > 0">
              <thead class="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wider">
                <tr>
                  <th class="px-4 py-3">Serial Reemplazado</th>
                  <th class="px-4 py-3"># Item</th>
                  <th class="px-4 py-3">Equipo</th>
                  <th class="px-4 py-3">Ubicación del Equipo</th>
                  <th class="px-4 py-3">Responsable</th>
                  <th class="px-4 py-3">Fecha Inicio</th>
                  <th class="px-4 py-3">Días Transcurridos</th>
                  <th class="px-4 py-3">Estado</th>
                  <th class="px-4 py-3" *ngIf="activeTabDev() === 'propios'">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let item of paginatedEnEspera()" class="hover:bg-slate-50 transition-colors"
                    [class.bg-red-50]="getDias(item.fecha_inicio_reemplazo) >= 7">
                  <td class="px-4 py-3 font-mono font-bold text-brand">{{ item.serial }}</td>
                  <td class="px-4 py-3 font-mono text-slate-600">{{ item.item || 'N/A' }}</td>
                  <td class="px-4 py-3">
                    <p class="font-semibold text-slate-800">{{ item.marca }} {{ item.modelo }}</p>
                    <p class="text-xs text-slate-400">{{ item.tipo_producto || 'N/A' }}</p>
                    <div *ngIf="getReplacementInfo(item) as repInfo" class="mt-1 text-[10px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 w-fit flex items-center gap-1">
                      <mat-icon class="scale-[0.5] -mx-1">swap_horiz</mat-icon>
                      Será reemplazado por {{ repInfo.displayText }}
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <span class="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded">
                      {{ item.ubicacion || '—' }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-1.5">
                      <div *ngIf="item.responsable_devolucion" class="flex items-center gap-1 text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100 w-fit">
                        <mat-icon class="scale-[0.6] w-3 h-3 flex items-center justify-center">person</mat-icon> {{ item.responsable_devolucion }}
                      </div>
                      <span *ngIf="!item.responsable_devolucion" class="text-slate-400 text-xs italic">—</span>
                      <button *ngIf="isAdmin()"
                              (click)="openAssignRespModal(item)"
                              title="Asignar o editar responsable de devolución (Solo Administradores)"
                              class="p-1 text-slate-400 hover:text-brand hover:bg-slate-100 rounded-lg transition-all">
                        <mat-icon class="scale-75">edit</mat-icon>
                      </button>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-slate-500 text-xs">
                    {{ item.fecha_inicio_reemplazo | date:'dd/MM/yyyy HH:mm' }}
                  </td>
                  <td class="px-4 py-3">
                    <span [class]="getDiasClass(getDias(item.fecha_inicio_reemplazo))"
                          class="px-2 py-1 rounded-full text-xs font-bold">
                      {{ getDias(item.fecha_inicio_reemplazo) }} día(s)
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div *ngIf="getDias(item.fecha_inicio_reemplazo) >= 7"
                         class="flex items-center gap-1 text-red-600 font-bold text-xs">
                      <mat-icon class="scale-75">warning</mat-icon>
                      VENCIDO
                    </div>
                    <div *ngIf="getDias(item.fecha_inicio_reemplazo) < 7"
                         class="flex items-center gap-1 text-amber-600 font-bold text-xs">
                      <mat-icon class="scale-75">schedule</mat-icon>
                      EN TIEMPO
                    </div>
                  </td>
                  <td class="px-4 py-3" *ngIf="activeTabDev() === 'propios'">
                    <button (click)="storeOwnAsset(item)"
                            class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition-all">
                      <mat-icon class="scale-75">archive</mat-icon> Almacenar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div *ngIf="filteredEnEspera().length === 0" class="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <mat-icon class="scale-[2] opacity-20">check_circle</mat-icon>
            <p class="font-semibold">No se encontraron equipos pendientes.</p>
            <p class="text-sm">Ajusta los filtros o todos los reemplazos están al día.</p>
          </div>

          <!-- Paginación -->
          <div *ngIf="filteredEnEspera().length > 0" class="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
            <div class="text-xs text-slate-500">
              Mostrando <span class="font-bold text-slate-700">{{ (currentPage() - 1) * pageSize() + 1 }}</span> a 
              <span class="font-bold text-slate-700">{{ showingTo() }}</span> de 
              <span class="font-bold text-slate-700">{{ filteredEnEspera().length }}</span> registros
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
      </div>

      <!-- Panel de Alertas Críticas -->
      <div class="card p-0 overflow-hidden" *ngIf="alertasActivas().length > 0">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <mat-icon class="text-red-500">notifications_active</mat-icon>
            <h3 class="font-bold text-slate-800">Alertas Críticas</h3>
            <span *ngIf="alertasNoLeidas().length > 0"
              class="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {{ alertasNoLeidas().length }} nuevas
            </span>
          </div>
          <button *ngIf="alertasNoLeidas().length > 0"
            (click)="marcarTodas()"
            class="text-xs font-bold text-slate-500 hover:text-brand transition-colors px-3 py-1 rounded-lg hover:bg-slate-50">
            Marcar todas como leídas
          </button>
        </div>
        <div class="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
          <div *ngFor="let alerta of alertasActivas()" (click)="marcarLeida(alerta)"
               class="flex items-start gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
               [class.opacity-50]="alerta.leida">
            <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                 [class]="alerta.leida ? 'bg-slate-100 text-slate-400' : 'bg-red-100 text-red-600'">
               <mat-icon class="scale-75">{{ alerta.leida ? 'check' : 'warning' }}</mat-icon>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-800 leading-snug">{{ alerta.mensaje }}</p>
              <p class="text-xs text-slate-400 mt-1">{{ alerta.fecha_creacion | date:'dd/MM/yyyy HH:mm' }}</p>
            </div>
            <span *ngIf="!alerta.leida" class="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-2"></span>
          </div>
        </div>
      </div>

      <!-- Modal Asignar Responsable -->
      <div *ngIf="selectedItemForResp()" class="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
                <mat-icon>assignment_ind</mat-icon>
              </div>
              <div>
                <h3 class="font-bold text-slate-800 text-lg">Asignar Responsable</h3>
                <p class="text-xs text-slate-500">Serial: {{ selectedItemForResp()?.serial }}</p>
              </div>
            </div>
            <button (click)="closeAssignRespModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Seleccionar Usuario (Admin, Google o Aplicación)</label>
              <select [ngModel]="selectedUserResp()" (ngModelChange)="selectedUserResp.set($event)" class="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer">
                <option value="">-- Sin Responsable --</option>
                <option *ngFor="let u of approvedUsers()" [value]="getUserValue(u)">
                  {{ getUserLabel(u) }}
                </option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button (click)="closeAssignRespModal()" class="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">
              Cancelar
            </button>
            <button (click)="saveResponsable()" [disabled]="isSavingResp()" class="px-5 py-2 text-sm font-bold text-white bg-brand hover:bg-brand/90 rounded-xl shadow-lg shadow-brand/20 transition-all disabled:opacity-50 flex items-center gap-2">
              <div *ngIf="isSavingResp()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Guardar Responsable
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class PendientesDevolucionComponent implements OnInit {
  storage = inject(StorageService);
  private api = inject(ApiService);
  private authService = inject(AuthService);

  loading = signal(true);
  verificando = signal(false);
  enEspera = signal<any[]>([]);
  usersList = signal<User[]>([]);

  // Modal responsable
  selectedItemForResp = signal<any | null>(null);
  selectedUserResp = signal<string>('');
  isSavingResp = signal(false);

  // Filtros
  searchQuery = signal<string>('');
  ubicacionFilter = signal<string>('');
  responsableFilter = signal<string>('');
  activeTabDev = signal<'proveedores' | 'propios'>('proveedores');

  // Paginación
  currentPage = signal(1);
  pageSize = signal(10);

  ubicaciones = computed(() => {
    const list = this.enEspera().map(i => i.ubicacion).filter(Boolean);
    return Array.from(new Set(list)).sort();
  });

  responsables = computed(() => {
    const list = this.enEspera().map(i => i.responsable_devolucion).filter(Boolean);
    return Array.from(new Set(list)).sort();
  });

  filteredEnEspera = computed(() => {
    const items = this.enEspera();
    const query = this.searchQuery().toLowerCase();
    const ubi = this.ubicacionFilter();
    const resp = this.responsableFilter();
    const tab = this.activeTabDev();

    return items.filter(item => {
      const matchesTab = tab === 'propios' ? (item.es_propio === true) : (!item.es_propio);

      const matchesSearch = !query ||
        item.serial.toLowerCase().includes(query) ||
        item.marca.toLowerCase().includes(query) ||
        item.modelo.toLowerCase().includes(query) ||
        (item.tipo_producto && item.tipo_producto.toLowerCase().includes(query));

      const matchesUbi = !ubi || item.ubicacion === ubi;
      const matchesResp = !resp || item.responsable_devolucion === resp;

      return matchesTab && matchesSearch && matchesUbi && matchesResp;
    });
  });

  paginatedEnEspera = computed(() => {
    const all = this.filteredEnEspera();
    const start = (this.currentPage() - 1) * this.pageSize();
    return all.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredEnEspera().length / this.pageSize())));

  showingTo = computed(() => {
    const end = this.currentPage() * this.pageSize();
    const total = this.filteredEnEspera().length;
    return end > total ? total : end;
  });

  nextPage() {
    if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1);
  }

  prevPage() {
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  vencidos = computed(() => this.enEspera().filter(i => !i.es_propio && this.getDias(i.fecha_inicio_reemplazo) >= 7));

  // Only show alerts whose equipment serial is still pending (in enEspera list)
  alertasActivas = computed(() => {
    const serialesPendientes = new Set(this.enEspera().filter(i => !i.es_propio).map(i => i.serial));
    return this.storage.alertas().filter(a => serialesPendientes.has(a.serial_equipo));
  });

  alertasNoLeidas = computed(() => this.alertasActivas().filter(a => !a.leida));

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    this.loading.set(true);
    try {
      const [items, _, users] = await Promise.all([
        firstValueFrom(this.api.getEnEsperaDevolucion()),
        this.storage.loadAlertasFromApi(),
        firstValueFrom(this.authService.getUsers()).catch(() => [])
      ]);
      this.enEspera.set(items);
      this.usersList.set(users || []);
    } catch (e) {
      console.error('Error cargando pendientes:', e);
    } finally {
      this.loading.set(false);
    }
  }

  approvedUsers = computed(() => {
    return this.usersList().filter((u: any) => u.is_approved !== false);
  });

  getUserLabel(u: any): string {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || u.email;
    let type = u.role || (u.is_superuser || u.is_staff ? 'ADMIN' : 'Usuario');
    if (u.is_google_user) {
      type += ' / Google';
    }
    return `${name} (${type})`;
  }

  getUserValue(u: any): string {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return name || u.username || u.email;
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  openAssignRespModal(item: any) {
    if (!this.isAdmin()) return;
    this.selectedItemForResp.set(item);
    this.selectedUserResp.set(item.responsable_devolucion || '');
  }

  closeAssignRespModal() {
    this.selectedItemForResp.set(null);
    this.selectedUserResp.set('');
  }

  async saveResponsable() {
    if (!this.isAdmin()) return;
    const item = this.selectedItemForResp();
    if (!item) return;

    const respName = this.selectedUserResp().trim();
    this.isSavingResp.set(true);

    try {
      await this.storage.updateAssetStatus(item.serial, item.estado, {
        responsable_devolucion: respName || null
      });
      await this.cargarDatos();
      this.closeAssignRespModal();
    } catch (err) {
      console.error('Error actualizando responsable:', err);
    } finally {
      this.isSavingResp.set(false);
    }
  }

  async verificarAlertas() {
    this.verificando.set(true);
    try {
      await firstValueFrom(this.api.verificarAlertas());
      await this.storage.loadAlertasFromApi();
      await this.cargarDatos();
    } finally {
      this.verificando.set(false);
    }
  }

  async marcarLeida(alerta: any) {
    if (!alerta.leida) {
      await this.storage.marcarAlertaLeida(alerta.id);
    }
  }

  async marcarTodas() {
    await this.storage.marcarTodasAlertsLeidas();
  }

  async storeOwnAsset(item: any) {
    if (confirm(`¿Confirmar almacenamiento en bodega del equipo propio ${item.marca} ${item.modelo} (${item.serial})?`)) {
      try {
        await firstValueFrom(this.api.updateInventarioItem(item.id || item._backendId, { estado: 'ALMACENADO' }));
        await this.cargarDatos();
      } catch (e) {
        console.error('Error al almacenar equipo propio:', e);
        alert('Hubo un error al almacenar el equipo.');
      }
    }
  }

  getDias(fecha?: string): number {
    if (!fecha) return 0;
    const inicio = new Date(fecha);
    const ahora = new Date();
    return Math.floor((ahora.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  }

  getDiasClass(dias: number): string {
    if (dias >= 7) return 'bg-red-100 text-red-700';
    if (dias >= 4) return 'bg-amber-100 text-amber-700';
    return 'bg-green-100 text-green-700';
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
