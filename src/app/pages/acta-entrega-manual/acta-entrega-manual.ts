import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { StorageService } from '../../services/storage';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api';
import { ActaEntregaComponent, ActaEntregaData } from '../../components/reports/acta-entrega/acta-entrega';
import { generateUUID } from '../../utils/uuid';

interface ActivoRow {
  id: string;
  item?: number;
  serial: string;
  tipo_producto: string;
  marca: string;
  modelo: string;
  procesador?: string;
  ram?: string;
  disco?: string;
  tipo_disco?: string;
  from_database: boolean;
}

type TipoCategoria = 'equipo' | 'periferico';

// Tipos que se consideran "equipos" y muestran specs avanzadas
const TIPOS_EQUIPO_AVANZADOS = [
  'equipo de cómputo', 'laptop', 'portátil', 'desktop', 'computador',
  'servidor', 'workstation', 'all-in-one', 'minipc', 'mini pc', 'tablet'
];

function esEquipoAvanzado(tipo: string): boolean {
  return TIPOS_EQUIPO_AVANZADOS.some(t => tipo.toLowerCase().includes(t));
}

@Component({
  selector: 'app-acta-entrega-manual',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, ActaEntregaComponent],
  template: `
    <div class="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-left duration-500 pb-24">
      <div class="flex flex-col gap-1">
        <h2 class="text-3xl font-bold tracking-tight text-slate-800">Generar Acta de Entrega</h2>
        <p class="text-slate-500">Genera e imprime actas de entrega buscando por serial/ítem o ingresando datos manualmente.</p>
      </div>

      <!-- Recipient details card -->
      <div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
        <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
          <mat-icon class="text-brand">person_outline</mat-icon>
          Datos de Quien Recibe
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre Completo *</label>
            <input type="text" [(ngModel)]="recipientName" placeholder="Ej. Juan Pérez"
              class="px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand w-full bg-slate-50/50">
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Cédula / Documento *</label>
            <input type="text" [(ngModel)]="recipientCedula" placeholder="Ej. 1.234.567.890"
              class="px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand w-full bg-slate-50/50">
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Empresa / Entidad *</label>
            <input type="text" [(ngModel)]="recipientEmpresa" placeholder="Ej. BOGOTÁ D.C."
              class="px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand w-full bg-slate-50/50">
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Nota de entrega</label>
          <textarea [(ngModel)]="recipientNota" rows="2" placeholder="Comentarios adicionales o notas de entrega..."
            class="px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand w-full bg-slate-50/50 resize-none"></textarea>
        </div>

        <!-- Inventory Action Options -->
        <div class="space-y-4 pt-4 border-t border-slate-100">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Acción sobre el Inventario</label>
              <select [(ngModel)]="inventoryAction" class="px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand w-full bg-slate-50/50 cursor-pointer">
                <option value="deliver">Registrar Entrega (Cambiar estado a 'ENTREGADO')</option>
                <option value="available">Marcar como Listos (Cambiar estado a 'DISPONIBLE')</option>
                <option value="none">No actualizar inventario (Solo generar PDF)</option>
              </select>
            </div>

            <!-- Location selector, visible only if action is 'deliver' -->
            <div *ngIf="inventoryAction === 'deliver'" class="flex flex-col gap-1 animate-in slide-in-from-top-2 duration-200">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Ubicación de la Entrega *</label>
              <select [(ngModel)]="deliveryLocation" class="px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand w-full bg-slate-50/50 cursor-pointer">
                <option value="">Seleccione una ubicación...</option>
                <option *ngFor="let ub of ubicaciones()" [value]="ub.path">{{ ub.path }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Assets Block -->
      <div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div class="flex flex-wrap gap-4 items-center justify-between border-b pb-4">
          <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
            <mat-icon class="text-brand">devices</mat-icon>
            Equipos y Periféricos a Entregar
          </h3>
        </div>

        <!-- Search Bar -->
        <div class="flex gap-2">
          <input type="text" [(ngModel)]="searchQuery" (keydown.enter)="buscarYAgregar()"
            placeholder="Buscar por serial o número de ítem en inventario..."
            class="px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand flex-1 bg-slate-50/50">
          <button (click)="buscarYAgregar()"
            class="bg-brand hover:bg-orange-600 text-white px-5 rounded-xl font-bold flex items-center justify-center gap-1 shadow-md shadow-orange-100 transition-all cursor-pointer border-none">
            <mat-icon>search</mat-icon>
            Buscar
          </button>
        </div>

        <!-- Add manually form -->
        <div class="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 space-y-4">
          <h4 class="text-sm font-bold text-slate-600 flex items-center gap-2">
            <mat-icon class="scale-75 text-slate-400">add_circle_outline</mat-icon>
            Agregar Equipo / Periférico Manualmente
          </h4>

          <!-- Row 1: Item, Serial, Tipo, Marca, Modelo -->
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nro Ítem</label>
              <input type="number" [(ngModel)]="newItem.item" placeholder="Ítem"
                class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serial *</label>
              <input type="text" [(ngModel)]="newItem.serial" placeholder="Serial" style="text-transform:uppercase"
                class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo *</label>
              <select [(ngModel)]="newItem.tipo_producto" (ngModelChange)="onNewItemTipoChange($event)"
                class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full cursor-pointer">
                <option value="">Seleccione tipo...</option>
                <option *ngFor="let t of tiposProducto()" [value]="t">{{ t }}</option>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Marca *</label>
              <select [(ngModel)]="newItem.marca"
                class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full cursor-pointer">
                <option value="">Seleccione marca...</option>
                <option *ngFor="let m of marcas()" [value]="m">{{ m }}</option>
              </select>
            </div>
            <div class="flex flex-col gap-1 col-span-2 md:col-span-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modelo *</label>
              <input type="text" [(ngModel)]="newItem.modelo" placeholder="Modelo"
                class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full">
            </div>
          </div>

          <!-- Row 2: Specs (only for equipment types) -->
          <div *ngIf="newItemEsEquipo()"
            class="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-dashed border-slate-200 animate-in slide-in-from-top-2 duration-200">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Procesador</label>
              <select [(ngModel)]="newItem.procesador"
                class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full cursor-pointer">
                <option value="">Procesador...</option>
                <option *ngFor="let p of procesadores()" [value]="p">{{ p }}</option>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RAM</label>
              <select [(ngModel)]="newItem.ram"
                class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full cursor-pointer">
                <option value="">RAM...</option>
                <option *ngFor="let r of ramList()" [value]="r">{{ r }}</option>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Disco</label>
              <select [(ngModel)]="newItem.disco"
                class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full cursor-pointer">
                <option value="">Disco...</option>
                <option *ngFor="let d of discoList()" [value]="d">{{ d }}</option>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo Disco</label>
              <select [(ngModel)]="newItem.tipo_disco"
                class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full cursor-pointer">
                <option value="">Tipo disco...</option>
                <option *ngFor="let td of tiposDisco()" [value]="td">{{ td }}</option>
              </select>
            </div>
          </div>

          <!-- Add button -->
          <div class="flex justify-end pt-1">
            <button (click)="agregarItem()"
              [disabled]="!newItem.serial || !newItem.tipo_producto || !newItem.marca || !newItem.modelo"
              class="bg-brand hover:bg-orange-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-none disabled:cursor-not-allowed shadow-md shadow-orange-100 disabled:shadow-none">
              <mat-icon class="scale-90">add_circle</mat-icon>
              Agregar a la Lista
            </button>
          </div>
        </div>

        <!-- Assets List -->
        <div class="space-y-3" *ngIf="activos().length > 0">
          <div *ngFor="let activo of activos(); let i = index"
            [class.border-red-300]="isActivoIncompleto(activo.id)"
            [class.bg-red-50]="isActivoIncompleto(activo.id)"
            class="p-5 bg-slate-50/50 rounded-2xl border border-slate-150 relative space-y-3 transition-all hover:border-slate-300">

            <!-- Card Header -->
            <div class="flex justify-between items-center pb-2 border-b border-slate-100">
              <div class="flex items-center gap-2 flex-wrap">
                <mat-icon class="scale-90 text-slate-400">{{ esEquipoAvanzado(activo.tipo_producto) ? 'computer' : 'cable' }}</mat-icon>
                <span class="text-sm font-bold text-slate-700">
                  {{ activo.tipo_producto || 'Sin tipo' }}
                  <span *ngIf="activo.marca" class="font-normal text-slate-500">— {{ activo.marca }} {{ activo.modelo }}</span>
                </span>
                <span *ngIf="activo.from_database" class="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase select-none">Inventario</span>
                <span *ngIf="!activo.from_database" class="text-[9px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold uppercase select-none">Manual</span>
                <span *ngIf="isActivoIncompleto(activo.id)" class="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold uppercase select-none flex items-center gap-0.5">
                  <mat-icon style="font-size:10px;height:10px;width:10px;line-height:10px">warning</mat-icon>
                  Incompleto
                </span>
              </div>
              <button (click)="eliminarActivo(activo.id)"
                class="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-xl transition-all cursor-pointer border-none bg-transparent">
                <mat-icon class="scale-90">delete_outline</mat-icon>
              </button>
            </div>

            <!-- Fields Row 1 -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nro Ítem</label>
                <input type="number" [(ngModel)]="activo.item" placeholder="Ítem"
                  class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full">
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serial *</label>
                <input type="text" [(ngModel)]="activo.serial" placeholder="Serial"
                  class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full">
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo</label>
                <select [(ngModel)]="activo.tipo_producto"
                  class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full cursor-pointer">
                  <option value="">Seleccione tipo...</option>
                  <option *ngFor="let t of tiposProducto()" [value]="t">{{ t }}</option>
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Marca *</label>
                <select [(ngModel)]="activo.marca"
                  class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full cursor-pointer">
                  <option value="">Seleccione marca...</option>
                  <option *ngFor="let m of marcas()" [value]="m">{{ m }}</option>
                </select>
              </div>
              <div class="flex flex-col gap-1 col-span-2 md:col-span-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modelo *</label>
                <input type="text" [(ngModel)]="activo.modelo" placeholder="Modelo"
                  class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full">
              </div>
            </div>

            <!-- Specs Row (only for equipment types) -->
            <div *ngIf="esEquipoAvanzado(activo.tipo_producto)"
              class="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-dashed border-slate-200 animate-in slide-in-from-top-2 duration-200">
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Procesador</label>
                <select [(ngModel)]="activo.procesador"
                  class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full cursor-pointer">
                  <option value="">Procesador...</option>
                  <option *ngFor="let p of procesadores()" [value]="p">{{ p }}</option>
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RAM</label>
                <select [(ngModel)]="activo.ram"
                  class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full cursor-pointer">
                  <option value="">RAM...</option>
                  <option *ngFor="let r of ramList()" [value]="r">{{ r }}</option>
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Disco</label>
                <select [(ngModel)]="activo.disco"
                  class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full cursor-pointer">
                  <option value="">Disco...</option>
                  <option *ngFor="let d of discoList()" [value]="d">{{ d }}</option>
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo Disco</label>
                <select [(ngModel)]="activo.tipo_disco"
                  class="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-brand w-full cursor-pointer">
                  <option value="">Tipo disco...</option>
                  <option *ngFor="let td of tiposDisco()" [value]="td">{{ td }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div *ngIf="activos().length === 0"
          class="text-center py-10 text-slate-400 text-sm italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <mat-icon class="block mx-auto mb-2 opacity-20 scale-125">inventory_2</mat-icon>
          No hay equipos o periféricos en la lista.<br>
          <span class="text-xs">Busca por serial/ítem o agrega uno manualmente.</span>
        </div>
      </div>

      <!-- Generate Button -->
      <div class="flex flex-col items-end gap-2">
        <button (click)="visualizarActa()" [disabled]="!isFormValid()"
          class="bg-brand hover:bg-orange-600 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-100 disabled:shadow-none transition-all cursor-pointer border-none">
          <mat-icon>visibility</mat-icon>
          Visualizar Acta de Entrega
        </button>
        <p *ngIf="formValidationMessage()" class="text-xs text-red-500 font-medium flex items-center gap-1">
          <mat-icon style="font-size:14px;height:14px;width:14px;line-height:14px">info</mat-icon>
          {{ formValidationMessage() }}
        </p>
      </div>

      <!-- Preview Modal -->
      <div *ngIf="showPreview() && previewData" class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative">
          <app-acta-entrega [data]="previewData" (close)="closePreview()"></app-acta-entrega>
        </div>
      </div>

      <!-- Validation Modal -->
      <div *ngIf="validationError()" class="fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div class="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-300">
          <div class="w-16 h-16 bg-orange-100 text-brand rounded-full flex items-center justify-center mx-auto mb-4">
            <mat-icon class="scale-150">error_outline</mat-icon>
          </div>
          <h3 class="text-xl font-bold text-slate-800 mb-2">Aviso del Sistema</h3>
          <p class="text-sm text-slate-600 mb-6 font-medium">{{ validationError() }}</p>
          <button (click)="validationError.set('')" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors border-none cursor-pointer">
            Entendido
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bg-brand { background-color: #FF6B00; }
    .text-brand { color: #FF6B00; }
    .focus\\:border-brand:focus { border-color: #FF6B00; }
  `]
})
export class ActaEntregaManualComponent implements OnInit {
  private storage = inject(StorageService);
  private auth = inject(AuthService);
  private api = inject(ApiService);

  // Expose helper to template
  esEquipoAvanzado = esEquipoAvanzado;

  // Form Fields
  recipientName = '';
  recipientCedula = '';
  recipientEmpresa = '';
  recipientNota = '';

  inventoryAction = 'deliver';
  deliveryLocation = '';

  searchQuery = '';
  validationError = signal('');

  // New item form model
  newItem: ActivoRow = this.emptyRow();

  activos = signal<ActivoRow[]>([]);

  // Catalogs
  tiposProducto = signal<string[]>([]);
  marcas = signal<string[]>([]);
  procesadores = signal<string[]>([]);
  ramList = signal<string[]>([]);
  discoList = signal<string[]>([]);
  tiposDisco = signal<string[]>([]);
  ubicaciones = signal<any[]>([]);

  // Preview management
  showPreview = signal(false);
  previewData: ActaEntregaData | null = null;

  private emptyRow(): ActivoRow {
    return {
      id: generateUUID(),
      item: undefined,
      serial: '',
      tipo_producto: '',
      marca: '',
      modelo: '',
      procesador: '',
      ram: '',
      disco: '',
      tipo_disco: '',
      from_database: false
    };
  }

  newItemEsEquipo(): boolean {
    return esEquipoAvanzado(this.newItem.tipo_producto);
  }

  onNewItemTipoChange(tipo: string) {
    if (!esEquipoAvanzado(tipo)) {
      this.newItem.procesador = '';
      this.newItem.ram = '';
      this.newItem.disco = '';
      this.newItem.tipo_disco = '';
    }
  }

  ngOnInit() {
    this.storage.syncAllFromApi().then(() => {
      const tipos = this.storage.tiposProducto();
      if (tipos && tipos.length > 0) this.tiposProducto.set(tipos.map((r: any) => r.nombre));

      const marcas = this.storage.marcas();
      if (marcas && marcas.length > 0) this.marcas.set(marcas.map((r: any) => r.nombre));

      const procs = this.storage.procesadores();
      if (procs && procs.length > 0) this.procesadores.set(procs.map((r: any) => r.nombre));

      const rams = this.storage.ram();
      if (rams && rams.length > 0) this.ramList.set(rams.map((r: any) => r.nombre));

      const discos = this.storage.discos();
      if (discos && discos.length > 0) this.discoList.set(discos.map((r: any) => r.nombre));

      const tDiscos = this.storage.tiposDisco();
      if (tDiscos && tDiscos.length > 0) this.tiposDisco.set(tDiscos.map((r: any) => r.nombre));

      this.ubicaciones.set(this.storage.ubicaciones());
    });
  }

  isFormValid(): boolean {
    if (!this.recipientName.trim() || !this.recipientCedula.trim() || !this.recipientEmpresa.trim()) {
      return false;
    }
    if (this.inventoryAction === 'deliver' && !this.deliveryLocation) {
      return false;
    }
    if (this.activos().length === 0) {
      return false;
    }
    return this.activosIncompletos().length === 0;
  }

  /** Returns IDs of items that are missing required fields */
  activosIncompletos(): string[] {
    return this.activos()
      .filter(a => !a.serial.trim() || !a.marca.trim() || !a.modelo.trim() || !a.tipo_producto.trim())
      .map(a => a.id);
  }

  isActivoIncompleto(id: string): boolean {
    return this.activosIncompletos().includes(id);
  }

  formValidationMessage(): string {
    if (!this.recipientName.trim() || !this.recipientCedula.trim() || !this.recipientEmpresa.trim()) {
      return 'Completa los datos de quien recibe (nombre, cédula y empresa).';
    }
    if (this.inventoryAction === 'deliver' && !this.deliveryLocation) {
      return 'Selecciona la ubicación de entrega.';
    }
    if (this.activos().length === 0) {
      return 'Agrega al menos un equipo o periférico.';
    }
    const inc = this.activosIncompletos().length;
    if (inc > 0) {
      return `${inc} elemento(s) en la lista están incompletos (falta serial, tipo, marca o modelo).`;
    }
    return '';
  }

  agregarItem() {
    const item = this.newItem;
    if (!item.serial || !item.tipo_producto || !item.marca || !item.modelo) return;

    const dup = this.activos().some(a => a.serial.toLowerCase() === item.serial.toLowerCase());
    if (dup) {
      this.validationError.set(`El serial "${item.serial}" ya está en la lista.`);
      return;
    }

    this.activos.update(l => [...l, { ...item, id: generateUUID() }]);
    this.newItem = this.emptyRow();
  }

  buscarYAgregar() {
    if (!this.searchQuery.trim()) return;

    const query = this.searchQuery.trim().toLowerCase();
    const allAssets = this.storage.inventario();

    const match = allAssets.find(a =>
      a.serial.toLowerCase() === query ||
      (a.item && a.item.toString() === query)
    );

    if (match) {
      if (match.estado === 'DADO_DE_BAJA') {
        this.validationError.set(`El activo "${match.serial}" está DADO DE BAJA y no puede incluirse en el acta.`);
        this.searchQuery = '';
        return;
      }

      const exists = this.activos().some(a => a.serial.toLowerCase() === match.serial.toLowerCase());
      if (exists) {
        this.validationError.set(`El activo con serial ${match.serial} ya está en la lista.`);
        this.searchQuery = '';
        return;
      }

      this.activos.update(l => [
        ...l,
        {
          id: generateUUID(),
          item: match.item,
          serial: match.serial,
          tipo_producto: match.tipo_producto || '',
          marca: match.marca,
          modelo: match.modelo,
          procesador: match.procesador || '',
          ram: match.ram || '',
          disco: match.disco || '',
          tipo_disco: match.tipo_disco || '',
          from_database: true
        }
      ]);

      // Auto-load associated peripherals (excluding pending return, returned or decommissioned)
      const matchedId = match._backendId || (match as any).id;
      const matchedItem = match.item;
      if (matchedId || matchedItem) {
        const excludedStates = ['EN_ESPERA_DEVOLUCION', 'PENDIENTE_DEVOLUCION', 'DEVUELTO', 'DADO_DE_BAJA'];
        const associated = allAssets.filter(a =>
          ((matchedId && a.equipo_asociado === matchedId) || (matchedItem && a.equipo_asociado === matchedItem)) &&
          (!a.estado || !excludedStates.includes(a.estado.toUpperCase()))
        );
        associated.forEach(p => {
          const pExists = this.activos().some(a => a.serial.toLowerCase() === p.serial.toLowerCase());
          if (!pExists) {
            this.activos.update(l => [
              ...l,
              {
                id: generateUUID(),
                item: p.item,
                serial: p.serial,
                tipo_producto: p.tipo_producto || '',
                marca: p.marca,
                modelo: p.modelo,
                procesador: '',
                ram: '',
                disco: '',
                tipo_disco: '',
                from_database: true
              }
            ]);
          }
        });
      }

      this.searchQuery = '';
    } else {
      const isNum = !isNaN(Number(query));
      this.activos.update(l => [
        ...l,
        {
          id: generateUUID(),
          item: isNum ? Number(query) : undefined,
          serial: isNum ? '' : this.searchQuery,
          tipo_producto: '',
          marca: '',
          modelo: '',
          procesador: '',
          ram: '',
          disco: '',
          tipo_disco: '',
          from_database: false
        }
      ]);
      this.validationError.set(`"${this.searchQuery}" no fue encontrado en el inventario. Se agregó una fila manual para completar.`);
      this.searchQuery = '';
    }
  }

  eliminarActivo(id: string) {
    this.activos.update(l => l.filter(a => a.id !== id));
  }

  async visualizarActa() {
    if (!this.isFormValid()) return;

    const list = this.activos();

    // Update status in the database according to chosen action
    if (this.inventoryAction === 'deliver') {
      for (const a of list) {
        if (a.from_database) {
          await this.storage.updateAssetStatus(a.serial, 'ENTREGADO', { ubicacion: this.deliveryLocation });
        }
      }
    } else if (this.inventoryAction === 'available') {
      for (const a of list) {
        if (a.from_database) {
          await this.storage.updateAssetStatus(a.serial, 'DISPONIBLE');
        }
      }
    }

    const currentTech = this.auth.currentUser();
    const techName = currentTech
      ? `${currentTech.first_name || ''} ${currentTech.last_name || ''}`.trim() || currentTech.username
      : undefined;

    // The first item is the "principal" (asset), the rest are peripherals
    const [principal, ...rest] = list;

    const activePeripherals = rest.map(p => ({
      item: p.item,
      tipo_producto: p.tipo_producto,
      marca: p.marca,
      modelo: p.modelo,
      serial: p.serial,
      estado: 'Bueno'
    }));

    this.previewData = {
      asset: {
        item: principal.item,
        tipo_producto: principal.tipo_producto,
        marca: principal.marca,
        modelo: principal.modelo,
        procesador: principal.procesador || undefined,
        ram: principal.ram || undefined,
        disco: principal.disco || undefined,
        tipo_disco: principal.tipo_disco || undefined,
        serial: principal.serial
      },
      peripherals: activePeripherals.length > 0 ? activePeripherals : undefined,
      nombre: this.recipientName,
      cedula: this.recipientCedula,
      empresa: this.recipientEmpresa,
      tecnicoNombre: techName,
      notaEntrega: this.recipientNota || undefined
    };

    this.showPreview.set(true);
  }

  closePreview() {
    this.showPreview.set(false);
    this.previewData = null;
  }
}
