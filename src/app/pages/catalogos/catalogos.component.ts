import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api';
import { StorageService } from '../../services/storage';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-catalogos',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Catálogos del Sistema</h1>
        <p class="text-sm text-slate-500 mt-1">Gestión de catálogos globales: dispositivos, ubicaciones, alistamiento y proveedores.</p>
      </div>

      <div class="flex gap-4 border-b border-slate-200">
        <button class="pb-3 px-2 font-bold text-sm flex items-center gap-2 transition-colors relative"
                [class.text-brand]="activeTab() === 'dispositivos'"
                [class.text-slate-500]="activeTab() !== 'dispositivos'"
                (click)="activeTab.set('dispositivos')">
          <mat-icon class="scale-90">devices</mat-icon> Dispositivos
          <div *ngIf="activeTab() === 'dispositivos'" class="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-brand"></div>
        </button>
        <button class="pb-3 px-2 font-bold text-sm flex items-center gap-2 transition-colors relative"
                [class.text-brand]="activeTab() === 'ubicaciones'"
                [class.text-slate-500]="activeTab() !== 'ubicaciones'"
                (click)="activeTab.set('ubicaciones')">
          <mat-icon class="scale-90">place</mat-icon> Ubicaciones
          <div *ngIf="activeTab() === 'ubicaciones'" class="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-brand"></div>
        </button>
        <button class="pb-3 px-2 font-bold text-sm flex items-center gap-2 transition-colors relative"
                [class.text-brand]="activeTab() === 'alistamiento'"
                [class.text-slate-500]="activeTab() !== 'alistamiento'"
                (click)="activeTab.set('alistamiento')">
          <mat-icon class="scale-90">checklist</mat-icon> Puntos de Alistamiento
          <div *ngIf="activeTab() === 'alistamiento'" class="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-brand"></div>
        </button>
        <button class="pb-3 px-2 font-bold text-sm flex items-center gap-2 transition-colors relative"
                [class.text-brand]="activeTab() === 'proveedores'"
                [class.text-slate-500]="activeTab() !== 'proveedores'"
                (click)="activeTab.set('proveedores')">
          <mat-icon class="scale-90">local_shipping</mat-icon> Proveedores
          <div *ngIf="activeTab() === 'proveedores'" class="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-brand"></div>
        </button>
        <button class="pb-3 px-2 font-bold text-sm flex items-center gap-2 transition-colors relative"
                [class.text-brand]="activeTab() === 'correos'"
                [class.text-slate-500]="activeTab() !== 'correos'"
                (click)="activeTab.set('correos')">
          <mat-icon class="scale-90">email</mat-icon> Correos de Baja
          <div *ngIf="activeTab() === 'correos'" class="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-brand"></div>
        </button>
      </div>

      <!-- Tab Content: Dispositivos -->
      <div *ngIf="activeTab() === 'dispositivos'" class="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <!-- Marcas -->
        <div class="bg-white rounded-2xl border shadow-sm p-6">
          <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand">branding_watermark</mat-icon> Marcas
          </h2>
          <div class="flex gap-2 mb-4">
            <input [(ngModel)]="newMarca" class="flex-1 bg-slate-50 border border-slate-200 text-sm p-2 rounded-lg outline-none focus:border-brand" placeholder="Nueva marca...">
            <button class="bg-[#FF6B00] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#E65A00] transition-colors" (click)="addMarca()" [disabled]="!newMarca.trim()">Agregar</button>
          </div>
          <div class="space-y-2 max-h-96 overflow-y-auto pr-2">
            <div *ngFor="let m of marcas()" class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200">
              <span class="font-medium text-slate-700">{{ m.nombre }}</span>
              <button class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" (click)="requestDelete('marca', m.id, m.nombre)">
                <mat-icon class="scale-90">delete</mat-icon>
              </button>
            </div>
            <div *ngIf="marcas().length === 0" class="text-center py-4 text-slate-400 text-sm">No hay marcas registradas.</div>
          </div>
        </div>

        <!-- Tipos de Producto -->
        <div class="bg-white rounded-2xl border shadow-sm p-6">
          <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand">category</mat-icon> Tipos de Producto
          </h2>
          <div class="flex flex-col gap-2 mb-4">
            <div class="flex gap-2">
              <input [(ngModel)]="newTipo" class="flex-1 bg-slate-50 border border-slate-200 text-sm p-2 rounded-lg outline-none focus:border-brand" placeholder="Nuevo tipo de producto...">
              <button class="bg-[#FF6B00] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#E65A00] transition-colors" (click)="addTipo()" [disabled]="!newTipo.trim()">Agregar</button>
            </div>
            <div class="flex flex-col gap-1.5 px-1">
              <label class="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input type="checkbox" [(ngModel)]="newTipoAlistamiento" class="accent-brand"> Requiere Alistamiento Técnico
              </label>
              <label class="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input type="checkbox" [(ngModel)]="newTipoItemUnico" class="accent-brand"> Requiere Número de Ítem Único
              </label>
              <label class="flex items-center gap-2 text-xs font-medium text-violet-700">
                <input type="checkbox" [(ngModel)]="newTipoPeriferico" class="accent-violet-600"> Es Periférico (mouse, teclado, cable, etc.)
              </label>
            </div>
          </div>
          <div class="space-y-2 max-h-96 overflow-y-auto pr-2">
            <div *ngFor="let t of tipos()" class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200">
              <div class="flex flex-col">
                <span class="font-medium text-slate-700">{{ t.nombre }}</span>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-[10px] font-bold uppercase" [class.text-brand]="t.requiere_alistamiento" [class.text-slate-400]="!t.requiere_alistamiento">
                    {{ t.requiere_alistamiento ? 'Alistamiento' : 'Sin Alistamiento' }}
                  </span>
                  <span class="text-[10px] font-bold uppercase" [class.text-indigo-600]="t.item_unico" [class.text-slate-400]="!t.item_unico">
                    {{ t.item_unico ? 'Ítem Único' : 'Ítem Libre' }}
                  </span>
                  <span class="text-[10px] font-bold uppercase" [class.text-violet-600]="t.es_periferico" [class.text-slate-400]="!t.es_periferico">
                    {{ t.es_periferico ? '🖱 Periférico' : '💻 Equipo' }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <button (click)="toggleTipoAlistamiento(t)" class="p-1.5 rounded-lg text-slate-400 hover:text-brand transition-colors" [title]="t.requiere_alistamiento ? 'Desactivar alistamiento' : 'Activar alistamiento'">
                   <mat-icon class="scale-90">{{ t.requiere_alistamiento ? 'checklist' : 'block' }}</mat-icon>
                </button>
                <button (click)="toggleTipoItemUnico(t)" class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors" [title]="t.item_unico ? 'Desactivar ítem único' : 'Activar ítem único'">
                   <mat-icon class="scale-90">{{ t.item_unico ? 'looks_one' : 'filter_none' }}</mat-icon>
                </button>
                <button (click)="toggleTipoPeriferico(t)" class="p-1.5 rounded-lg transition-colors" [class.text-violet-500]="t.es_periferico" [class.text-slate-400]="!t.es_periferico" [title]="t.es_periferico ? 'Marcar como Equipo de Cómputo' : 'Marcar como Periférico'">
                   <mat-icon class="scale-90">{{ t.es_periferico ? 'mouse' : 'computer' }}</mat-icon>
                </button>
                <button class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" (click)="requestDelete('tipo_producto', t.id, t.nombre)">
                  <mat-icon class="scale-90">delete</mat-icon>
                </button>
              </div>
            </div>
            <div *ngIf="tipos().length === 0" class="text-center py-4 text-slate-400 text-sm">No hay tipos registrados.</div>
          </div>
        </div>

        <!-- Tipos de Disco -->
        <div class="bg-white rounded-2xl border shadow-sm p-6">
          <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand">save</mat-icon> Tipos de Disco
          </h2>
          <div class="flex gap-2 mb-4">
            <input [(ngModel)]="newTipoDisco" class="flex-1 bg-slate-50 border border-slate-200 text-sm p-2 rounded-lg outline-none focus:border-brand" placeholder="Nuevo tipo de disco (SSD, NVMe)...">
            <button class="bg-[#FF6B00] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#E65A00] transition-colors" (click)="addTipoDisco()" [disabled]="!newTipoDisco.trim()">Agregar</button>
          </div>
          <div class="space-y-2 max-h-96 overflow-y-auto pr-2">
            <div *ngFor="let td of tiposDisco()" class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200">
              <span class="font-medium text-slate-700">{{ td.nombre }}</span>
              <button class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" (click)="requestDelete('tipo_disco', td.id, td.nombre)">
                <mat-icon class="scale-90">delete</mat-icon>
              </button>
            </div>
            <div *ngIf="tiposDisco().length === 0" class="text-center py-4 text-slate-400 text-sm">No hay tipos de disco registrados.</div>
          </div>
        </div>

        <!-- Procesadores -->
        <div class="bg-white rounded-2xl border shadow-sm p-6">
          <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand">memory</mat-icon> Procesadores
          </h2>
          <div class="flex gap-2 mb-4">
            <input [(ngModel)]="newProcesador" class="flex-1 bg-slate-50 border border-slate-200 text-sm p-2 rounded-lg outline-none focus:border-brand" placeholder="Nuevo procesador (Ej: Core i5)...">
            <button class="bg-[#FF6B00] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#E65A00] transition-colors" (click)="addProcesador()" [disabled]="!newProcesador.trim()">Agregar</button>
          </div>
          <div class="space-y-2 max-h-96 overflow-y-auto pr-2">
            <div *ngFor="let p of procesadores()" class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200">
              <span class="font-medium text-slate-700">{{ p.nombre }}</span>
              <button class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" (click)="requestDelete('procesador', p.id, p.nombre)">
                <mat-icon class="scale-90">delete</mat-icon>
              </button>
            </div>
            <div *ngIf="procesadores().length === 0" class="text-center py-4 text-slate-400 text-sm">No hay procesadores registrados.</div>
          </div>
        </div>
        <!-- Memorias RAM -->
        <div class="bg-white rounded-2xl border shadow-sm p-6">
          <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand">memory</mat-icon> Memorias RAM
          </h2>
          <div class="flex gap-2 mb-4">
            <input [(ngModel)]="newRam" class="flex-1 bg-slate-50 border border-slate-200 text-sm p-2 rounded-lg outline-none focus:border-brand" placeholder="Nueva RAM (Ej: 16 GB)...">
            <button class="bg-[#FF6B00] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#E65A00] transition-colors" (click)="addRam()" [disabled]="!newRam.trim()">Agregar</button>
          </div>
          <div class="space-y-2 max-h-96 overflow-y-auto pr-2">
            <div *ngFor="let r of rams()" class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200">
              <span class="font-medium text-slate-700">{{ r.nombre }}</span>
              <button class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" (click)="requestDelete('ram', r.id, r.nombre)">
                <mat-icon class="scale-90">delete</mat-icon>
              </button>
            </div>
            <div *ngIf="rams().length === 0" class="text-center py-4 text-slate-400 text-sm">No hay memorias RAM registradas.</div>
          </div>
        </div>

        <!-- Tamaños de Disco -->
        <div class="bg-white rounded-2xl border shadow-sm p-6">
          <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand">album</mat-icon> Tamaños de Disco
          </h2>
          <div class="flex gap-2 mb-4">
            <input [(ngModel)]="newDisco" class="flex-1 bg-slate-50 border border-slate-200 text-sm p-2 rounded-lg outline-none focus:border-brand" placeholder="Nuevo tamaño de disco (Ej: 512 GB)...">
            <button class="bg-[#FF6B00] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#E65A00] transition-colors" (click)="addDisco()" [disabled]="!newDisco.trim()">Agregar</button>
          </div>
          <div class="space-y-2 max-h-96 overflow-y-auto pr-2">
            <div *ngFor="let d of discos()" class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200">
              <span class="font-medium text-slate-700">{{ d.nombre }}</span>
              <button class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" (click)="requestDelete('disco', d.id, d.nombre)">
                <mat-icon class="scale-90">delete</mat-icon>
              </button>
            </div>
            <div *ngIf="discos().length === 0" class="text-center py-4 text-slate-400 text-sm">No hay tamaños de disco registrados.</div>
          </div>
        </div>
      </div>

      <!-- Tab Content: Ubicaciones -->
      <div *ngIf="activeTab() === 'ubicaciones'" class="grid grid-cols-1 gap-6">
        <div class="bg-white rounded-2xl border shadow-sm p-6 md:col-span-2">
          <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand">place</mat-icon> Ubicaciones (Principal > Sub-Ubicación)
          </h2>
          <div class="flex gap-2 mb-4">
            <input [(ngModel)]="newUbicacion" class="flex-1 bg-slate-50 border border-slate-200 text-sm p-2 rounded-lg outline-none focus:border-brand" placeholder="Nombre de la ubicación (Ej: Bogotá, Piso 2, 134 RTM)...">
            <select [(ngModel)]="selectedPadre" class="w-1/3 bg-slate-50 border border-slate-200 text-sm p-2 rounded-lg outline-none focus:border-brand">
              <option [ngValue]="null">-- Ubicación Principal --</option>
              <option *ngFor="let u of ubicaciones()" [ngValue]="u.id">{{ u.path }}</option>
            </select>
            <button class="bg-[#FF6B00] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#E65A00] transition-colors" (click)="addUbicacion()" [disabled]="!newUbicacion.trim()">Agregar</button>
          </div>
          <div class="space-y-2 max-h-96 overflow-y-auto pr-2">
            <div *ngFor="let u of ubicaciones()" class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200">
              <span class="font-medium text-slate-700">{{ u.path }}</span>
              <button class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" (click)="requestDelete('ubicacion', u.id, u.path)">
                <mat-icon class="scale-90">delete</mat-icon>
              </button>
            </div>
            <div *ngIf="ubicaciones().length === 0" class="text-center py-4 text-slate-400 text-sm">No hay ubicaciones registradas.</div>
          </div>
        </div>
      </div>

      <!-- Tab Content: Puntos de Alistamiento -->
      <div *ngIf="activeTab() === 'alistamiento'" class="space-y-4">
        <div class="bg-white rounded-2xl border shadow-sm p-6">
          <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand">checklist</mat-icon> Puntos de Alistamiento
            <span class="ml-auto text-xs font-normal text-slate-400">{{ puntosAlistamiento().length }} puntos</span>
          </h2>

          <div class="flex gap-2 mb-6">
            <input [(ngModel)]="newPunto" class="flex-1 bg-slate-50 border border-slate-200 text-sm p-2 rounded-lg outline-none focus:border-brand" placeholder="Nuevo punto de alistamiento...">
            <label class="flex items-center gap-2 text-sm font-medium text-slate-600 whitespace-nowrap px-3 bg-slate-50 border border-slate-200 rounded-lg">
              <input type="checkbox" [(ngModel)]="newPuntoEvidencia" class="accent-brand"> Requiere Evidencia
            </label>
            <button class="bg-[#FF6B00] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#E65A00] transition-colors" (click)="addPunto()" [disabled]="!newPunto.trim()">Agregar</button>
          </div>

          <div class="space-y-2">
            <div *ngFor="let p of puntosAlistamiento(); let i = index"
                 class="flex items-center gap-3 p-3 rounded-xl border transition-colors bg-white hover:shadow-md"
                 [class.opacity-50]="!p.activo">
              
              <!-- Reorder Buttons -->
              <div class="flex flex-col gap-0.5">
                <button (click)="moveUp(i)" [disabled]="i === 0" class="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-brand disabled:opacity-30">
                  <mat-icon style="font-size: 18px; width: 18px; height: 18px;">expand_less</mat-icon>
                </button>
                <button (click)="moveDown(i)" [disabled]="i === puntosAlistamiento().length - 1" class="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-brand disabled:opacity-30">
                  <mat-icon style="font-size: 18px; width: 18px; height: 18px;">expand_more</mat-icon>
                </button>
              </div>

              <span class="text-xs font-bold text-slate-400 w-4 text-center">{{ i + 1 }}</span>
              <span class="flex-1 text-sm font-medium text-slate-700">{{ p.nombre }}</span>
              <span *ngIf="p.requiere_evidencia" class="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <mat-icon class="scale-[0.6]">photo_camera</mat-icon> Evidencia
              </span>
              <button (click)="togglePunto(p)" class="p-1.5 rounded-lg transition-colors"
                      [class.text-emerald-500]="p.activo"
                      [class.text-slate-400]="!p.activo"
                      [title]="p.activo ? 'Desactivar' : 'Activar'">
                <mat-icon class="scale-90">{{ p.activo ? 'toggle_on' : 'toggle_off' }}</mat-icon>
              </button>
              <button class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" (click)="requestDelete('punto_alistamiento', p.id, p.nombre)">
                <mat-icon class="scale-90">delete</mat-icon>
              </button>
            </div>
            <div *ngIf="puntosAlistamiento().length === 0" class="text-center py-8 text-slate-400 text-sm">No hay puntos configurados.</div>
          </div>
        </div>
      </div>

      <!-- Tab Content: Proveedores -->
      <div *ngIf="activeTab() === 'proveedores'" class="space-y-4">
        <div class="bg-white rounded-2xl border shadow-sm p-6">
          <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand">local_shipping</mat-icon>
            {{ editingProveedor() ? 'Editar Proveedor' : 'Agregar Proveedor' }}
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-slate-500 uppercase">Nombre del Proveedor *</label>
              <input [(ngModel)]="newProveedorNombre" class="bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand" placeholder="Ej: Computadores S.A.">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-slate-500 uppercase">Teléfono</label>
              <input [(ngModel)]="newProveedorTelefono" class="bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand" placeholder="Ej: +57 312 345 6789">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-slate-500 uppercase">Contacto Principal</label>
              <input [(ngModel)]="newProveedorContacto" class="bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand" placeholder="Ej: Juan Pérez">
            </div>
          </div>

          <div class="flex justify-end gap-2 mb-6">
            <button *ngIf="editingProveedor()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold transition-colors" (click)="cancelEditProveedor()">Cancelar</button>
            <button class="bg-[#FF6B00] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#E65A00] transition-colors"
                    [disabled]="!newProveedorNombre.trim()"
                    (click)="editingProveedor() ? saveProveedor() : addProveedor()">
              {{ editingProveedor() ? 'Guardar Cambios' : 'Agregar Proveedor' }}
            </button>
          </div>

          <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Proveedores Registrados ({{ proveedores().length }})</h3>
          
          <div class="space-y-2">
            <div *ngFor="let prov of proveedores()" class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200">
              <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                <div class="flex flex-col">
                  <span class="text-xs font-bold text-slate-400 uppercase">Nombre</span>
                  <span class="font-bold text-slate-700">{{ prov.nombre }}</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-xs font-bold text-slate-400 uppercase">Teléfono</span>
                  <span class="text-sm text-slate-600 font-medium">{{ prov.telefono || '—' }}</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-xs font-bold text-slate-400 uppercase">Contacto</span>
                  <span class="text-sm text-slate-600 font-medium">{{ prov.contacto || '—' }}</span>
                </div>
              </div>
              <div class="flex items-center gap-1.5 ml-4">
                <button class="text-slate-400 hover:text-brand hover:bg-orange-50 p-1.5 rounded-lg transition-colors" (click)="editProveedor(prov)" title="Editar">
                  <mat-icon class="scale-90">edit</mat-icon>
                </button>
                <button class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" (click)="requestDelete('proveedor', prov.id, prov.nombre)" title="Eliminar">
                  <mat-icon class="scale-90">delete</mat-icon>
                </button>
              </div>
            </div>
            <div *ngIf="proveedores().length === 0" class="text-center py-8 text-slate-400 text-sm">No hay proveedores registrados.</div>
          </div>
        </div>
      </div>

      <!-- Tab Content: Correos de Baja -->
      <div *ngIf="activeTab() === 'correos'" class="space-y-4">
        <div class="bg-white rounded-2xl border shadow-sm p-6">
          <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand">email</mat-icon>
            {{ editingConfig() ? 'Editar Configuración de Correo' : 'Nueva Configuración de Correo' }}
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="flex flex-col gap-1 md:col-span-2">
              <label class="text-xs font-bold text-slate-500 uppercase">Categorías / Tipos de Producto *</label>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                <label *ngFor="let t of tiposSinConfig()" class="flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-bold text-slate-700">
                  <input type="checkbox" [checked]="isTipoSelected(t.id)" (change)="toggleTipoSelection(t.id)" class="accent-brand">
                  {{ t.nombre }}
                </label>
              </div>
              <div *ngIf="tiposSinConfig().length === 0" class="text-xs text-slate-400 mt-1">No hay más categorías disponibles para configurar.</div>
            </div>
            <div class="flex flex-col gap-1 md:col-span-2">
              <label class="text-xs font-bold text-slate-500 uppercase">Correo Destinatario *</label>
              <input type="email" [(ngModel)]="newConfigDestinatario" class="bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand" placeholder="Ej: admin@proveedor.com">
            </div>
            <div class="flex flex-col gap-1 md:col-span-2">
              <label class="text-xs font-bold text-slate-500 uppercase">Asunto del Correo *</label>
              <input [(ngModel)]="newConfigAsunto" class="bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand" placeholder="Ej: Notificación de Baja de {{ '{' }}tipo_producto{{ '}' }} - Serial: {{ '{' }}serial{{ '}' }}">
            </div>
            <div class="flex flex-col gap-1 md:col-span-2">
              <label class="text-xs font-bold text-slate-500 uppercase">Cuerpo del Correo *</label>
              <textarea rows="6" [(ngModel)]="newConfigCuerpo" class="bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand" placeholder="Escriba el cuerpo del correo aquí..."></textarea>
              <div class="text-[11px] text-slate-400 mt-1">
                Puedes usar marcadores que se reemplazarán automáticamente:
                <code class="bg-slate-100 px-1 py-0.5 rounded text-brand font-mono">{{ '{' }}item{{ '}' }}</code>,
                <code class="bg-slate-100 px-1 py-0.5 rounded text-brand font-mono">{{ '{' }}serial{{ '}' }}</code>,
                <code class="bg-slate-100 px-1 py-0.5 rounded text-brand font-mono">{{ '{' }}marca{{ '}' }}</code>,
                <code class="bg-slate-100 px-1 py-0.5 rounded text-brand font-mono">{{ '{' }}modelo{{ '}' }}</code>,
                <code class="bg-slate-100 px-1 py-0.5 rounded text-brand font-mono">{{ '{' }}tipo_producto{{ '}' }}</code>,
                <code class="bg-slate-100 px-1 py-0.5 rounded text-brand font-mono">{{ '{' }}proveedor{{ '}' }}</code>,
                <code class="bg-slate-100 px-1 py-0.5 rounded text-brand font-mono">{{ '{' }}fecha_baja{{ '}' }}</code>,
                <code class="bg-slate-100 px-1 py-0.5 rounded text-brand font-mono">{{ '{' }}comentarios{{ '}' }}</code>,
                <code class="bg-slate-100 px-1 py-0.5 rounded text-brand font-mono">{{ '{' }}comentario_devolucion{{ '}' }}</code>.
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 mb-6">
            <button *ngIf="editingConfig()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold transition-colors" (click)="cancelEditConfig()">Cancelar</button>
            <button class="bg-[#FF6B00] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#E65A00] transition-colors"
                    [disabled]="selectedTiposConfig.length === 0 || !newConfigDestinatario.trim() || !newConfigAsunto.trim() || !newConfigCuerpo.trim()"
                    (click)="editingConfig() ? saveConfig() : addConfig()">
              {{ editingConfig() ? 'Guardar Cambios' : 'Crear Configuración' }}
            </button>
          </div>

          <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Configuraciones de Correos de Baja ({{ configuracionesEmail().length }})</h3>
          
          <div class="space-y-4">
            <div *ngFor="let cfg of configuracionesEmail()" class="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200">
              <div class="flex items-start justify-between">
                <div class="space-y-2 flex-1">
                  <div class="flex items-center gap-2">
                    <div class="flex flex-wrap gap-1">
                      <span *ngFor="let name of cfg.tipos_producto_nombres" class="bg-orange-100 text-brand text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {{ name }}
                      </span>
                    </div>
                    <span class="text-xs text-slate-400 font-medium">
                      Para: <strong class="text-slate-600 font-semibold">{{ cfg.destinatario }}</strong>
                    </span>
                  </div>
                  <div>
                    <span class="text-xs font-bold text-slate-400 uppercase block">Asunto</span>
                    <span class="text-sm font-bold text-slate-800">{{ cfg.asunto }}</span>
                  </div>
                  <div>
                    <span class="text-xs font-bold text-slate-400 uppercase block">Cuerpo</span>
                    <p class="text-xs text-slate-600 whitespace-pre-wrap bg-white border border-slate-100 p-2.5 rounded-lg max-h-32 overflow-y-auto mt-1 font-mono">
                      {{ cfg.cuerpo }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 ml-4">
                  <button class="text-slate-400 hover:text-brand hover:bg-orange-50 p-1.5 rounded-lg transition-colors" (click)="editConfig(cfg)" title="Editar">
                    <mat-icon class="scale-90">edit</mat-icon>
                  </button>
                  <button class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" (click)="requestDelete('configuracion_email_baja', cfg.id, cfg.tipos_producto_nombres ? cfg.tipos_producto_nombres.join(', ') : '')" title="Eliminar">
                    <mat-icon class="scale-90">delete</mat-icon>
                  </button>
                </div>
              </div>
            </div>
            <div *ngIf="configuracionesEmail().length === 0" class="text-center py-8 text-slate-400 text-sm">No hay configuraciones registradas.</div>
          </div>
        </div>
      </div>

      <!-- Modal de Confirmación -->
      <div *ngIf="itemToDelete()" class="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div class="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300">
          <div class="p-6 text-center">
            <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <mat-icon class="scale-150">warning</mat-icon>
            </div>
            <h3 class="text-xl font-bold text-slate-800 mb-2">Confirmar Eliminación</h3>
            <p class="text-sm text-slate-500">{{ deleteMessage() }}</p>
          </div>
          <div class="flex border-t border-slate-100">
            <button (click)="cancelDelete()" class="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancelar</button>
            <div class="w-px bg-slate-100"></div>
            <button (click)="confirmDelete()" class="flex-1 py-4 font-bold text-red-500 hover:bg-red-50 transition-colors">Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CatalogosComponent implements OnInit {
  private api = inject(ApiService);
  private storage = inject(StorageService);

  activeTab = signal<'dispositivos' | 'ubicaciones' | 'alistamiento' | 'proveedores' | 'correos'>('dispositivos');

  marcas = signal<any[]>([]);
  tipos = signal<any[]>([]);
  tiposDisco = signal<any[]>([]);
  procesadores = signal<any[]>([]);
  rams = signal<any[]>([]);
  discos = signal<any[]>([]);
  ubicaciones = signal<any[]>([]);
  puntosAlistamiento = signal<any[]>([]);
  proveedores = signal<any[]>([]);
  configuracionesEmail = signal<any[]>([]);

  newMarca = '';
  newTipo = '';
  newTipoAlistamiento = true;
  newTipoItemUnico = false;
  newTipoPeriferico = false;
  newTipoDisco = '';
  newProcesador = '';
  newRam = '';
  newDisco = '';
  newUbicacion = '';
  newPunto = '';
  newPuntoEvidencia = false;
  selectedPadre: number | null = null;

  newProveedorNombre = '';
  newProveedorTelefono = '';
  newProveedorContacto = '';
  editingProveedor = signal<any | null>(null);

  selectedTiposConfig: number[] = [];
  newConfigDestinatario = '';
  newConfigAsunto = '';
  newConfigCuerpo = '';
  editingConfig = signal<any | null>(null);

  itemToDelete = signal<{ type: string, id: number, name?: string } | null>(null);
  deleteMessage = signal<string>('');

  ngOnInit() {
    this.loadCatalogos();
  }

  loadCatalogos() {
    this.api.getBulkCatalogos().subscribe(res => {
      if (res.marcas) this.marcas.set(res.marcas);
      if (res.tipos_producto) this.tipos.set(res.tipos_producto);
      if (res.tipos_disco) this.tiposDisco.set(res.tipos_disco);
      if (res.procesadores) this.procesadores.set(res.procesadores);
      if (res.ram) this.rams.set(res.ram);
      if (res.discos) this.discos.set(res.discos);
      if (res.ubicaciones) {
        const sorted = res.ubicaciones.sort((a: any, b: any) => (a.path || '').localeCompare(b.path || ''));
        this.ubicaciones.set(sorted);
      }
      if (res.puntos_alistamiento) {
        const sorted = res.puntos_alistamiento.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
        this.puntosAlistamiento.set(sorted);
      }
      if (res.proveedores) {
        const sorted = res.proveedores.sort((a: any, b: any) => (a.nombre || '').localeCompare(b.nombre || ''));
        this.proveedores.set(sorted);
      }
      if (res.configuraciones_email) this.configuracionesEmail.set(res.configuraciones_email);
    });
  }

  addMarca() {
    if (!this.newMarca.trim()) return;
    this.api.createMarca({ nombre: this.newMarca.trim() }).subscribe(() => {
      this.newMarca = '';
      this.loadCatalogos();
    });
  }

  addTipo() {
    if (!this.newTipo.trim()) return;
    this.api.createTipoProducto({ 
      nombre: this.newTipo.trim(),
      requiere_alistamiento: this.newTipoAlistamiento,
      item_unico: this.newTipoItemUnico,
      es_periferico: this.newTipoPeriferico
    }).subscribe(() => {
      this.newTipo = '';
      this.newTipoAlistamiento = true;
      this.newTipoItemUnico = false;
      this.newTipoPeriferico = false;
      this.loadCatalogos();
    });
  }

  toggleTipoAlistamiento(t: any) {
    this.api.updateTipoProducto(t.id, { requiere_alistamiento: !t.requiere_alistamiento }).subscribe(() => {
      this.loadCatalogos();
      // Reload inventory in case the backend auto-updated statuses from RECIBIDO/ALISTAMIENTO to DISPONIBLE
      this.storage.loadInventarioFromApi();
    });
  }

  toggleTipoItemUnico(t: any) {
    this.api.updateTipoProducto(t.id, { item_unico: !t.item_unico }).subscribe(() => {
      this.loadCatalogos();
    });
  }

  toggleTipoPeriferico(t: any) {
    this.api.updateTipoProducto(t.id, { es_periferico: !t.es_periferico }).subscribe(() => {
      this.loadCatalogos();
      this.storage.loadInventarioFromApi();
    });
  }

  addTipoDisco() {
    if (!this.newTipoDisco.trim()) return;
    this.api.createTipoDisco({ nombre: this.newTipoDisco.trim() }).subscribe(() => {
      this.newTipoDisco = '';
      this.loadCatalogos();
    });
  }

  addProcesador() {
    if (!this.newProcesador.trim()) return;
    this.api.createProcesador({ nombre: this.newProcesador.trim() }).subscribe(() => {
      this.newProcesador = '';
      this.loadCatalogos();
    });
  }

  addRam() {
    if (!this.newRam.trim()) return;
    this.api.createRam({ nombre: this.newRam.trim() }).subscribe(() => {
      this.newRam = '';
      this.loadCatalogos();
    });
  }

  addDisco() {
    if (!this.newDisco.trim()) return;
    this.api.createDisco({ nombre: this.newDisco.trim() }).subscribe(() => {
      this.newDisco = '';
      this.loadCatalogos();
    });
  }

  addUbicacion() {
    if (!this.newUbicacion.trim()) return;
    this.api.createUbicacion({ nombre: this.newUbicacion.trim(), padre: this.selectedPadre }).subscribe(() => {
      this.newUbicacion = '';
      this.selectedPadre = null;
      this.loadCatalogos();
    });
  }

  addPunto() {
    if (!this.newPunto.trim()) return;
    const orden = this.puntosAlistamiento().length + 1;
    this.api.createPuntoAlistamiento({
      nombre: this.newPunto.trim(),
      requiere_evidencia: this.newPuntoEvidencia,
      activo: true,
      orden
    }).subscribe(() => {
      this.newPunto = '';
      this.newPuntoEvidencia = false;
      this.loadCatalogos();
    });
  }

  togglePunto(p: any) {
    this.api.updatePuntoAlistamiento(p.id, { activo: !p.activo }).subscribe(() => this.loadCatalogos());
  }

  addProveedor() {
    if (!this.newProveedorNombre.trim()) return;
    const payload = {
      nombre: this.newProveedorNombre.trim(),
      telefono: this.newProveedorTelefono.trim() || undefined,
      contacto: this.newProveedorContacto.trim() || undefined
    };
    this.api.createProveedor(payload).subscribe(() => {
      this.clearProveedorForm();
      this.loadCatalogos();
    });
  }

  editProveedor(prov: any) {
    this.editingProveedor.set(prov);
    this.newProveedorNombre = prov.nombre;
    this.newProveedorTelefono = prov.telefono || '';
    this.newProveedorContacto = prov.contacto || '';
  }

  saveProveedor() {
    const active = this.editingProveedor();
    if (!active || !this.newProveedorNombre.trim()) return;
    const payload = {
      nombre: this.newProveedorNombre.trim(),
      telefono: this.newProveedorTelefono.trim() || undefined,
      contacto: this.newProveedorContacto.trim() || undefined
    };
    this.api.updateProveedor(active.id, payload).subscribe(() => {
      this.clearProveedorForm();
      this.loadCatalogos();
    });
  }

  cancelEditProveedor() {
    this.clearProveedorForm();
  }

  private clearProveedorForm() {
    this.newProveedorNombre = '';
    this.newProveedorTelefono = '';
    this.newProveedorContacto = '';
    this.editingProveedor.set(null);
  }

  tiposSinConfig() {
    return this.tipos();
  }

  addConfig() {
    if (this.selectedTiposConfig.length === 0 || !this.newConfigDestinatario.trim() || !this.newConfigAsunto.trim() || !this.newConfigCuerpo.trim()) return;
    const payload = {
      tipos_producto: this.selectedTiposConfig,
      destinatario: this.newConfigDestinatario.trim(),
      asunto: this.newConfigAsunto.trim(),
      cuerpo: this.newConfigCuerpo.trim()
    };
    this.api.createConfiguracionEmailBaja(payload).subscribe(() => {
      this.clearConfigForm();
      this.loadCatalogos();
    });
  }

  editConfig(cfg: any) {
    this.editingConfig.set(cfg);
    this.selectedTiposConfig = cfg.tipos_producto ? [...cfg.tipos_producto] : [];
    this.newConfigDestinatario = cfg.destinatario;
    this.newConfigAsunto = cfg.asunto;
    this.newConfigCuerpo = cfg.cuerpo;
  }

  saveConfig() {
    const active = this.editingConfig();
    if (!active || this.selectedTiposConfig.length === 0 || !this.newConfigDestinatario.trim() || !this.newConfigAsunto.trim() || !this.newConfigCuerpo.trim()) return;
    const payload = {
      tipos_producto: this.selectedTiposConfig,
      destinatario: this.newConfigDestinatario.trim(),
      asunto: this.newConfigAsunto.trim(),
      cuerpo: this.newConfigCuerpo.trim()
    };
    this.api.updateConfiguracionEmailBaja(active.id, payload).subscribe(() => {
      this.clearConfigForm();
      this.loadCatalogos();
    });
  }

  cancelEditConfig() {
    this.clearConfigForm();
  }

  private clearConfigForm() {
    this.selectedTiposConfig = [];
    this.newConfigDestinatario = '';
    this.newConfigAsunto = '';
    this.newConfigCuerpo = '';
    this.editingConfig.set(null);
  }

  isTipoSelected(id: number): boolean {
    return this.selectedTiposConfig.includes(id);
  }

  toggleTipoSelection(id: number) {
    if (this.selectedTiposConfig.includes(id)) {
      this.selectedTiposConfig = this.selectedTiposConfig.filter(x => x !== id);
    } else {
      this.selectedTiposConfig = [...this.selectedTiposConfig, id];
    }
  }

  requestDelete(type: string, id: number, name?: string) {
    this.itemToDelete.set({ type, id, name });
    
    let msg = '¿Estás seguro de eliminar este elemento?';
    switch(type) {
      case 'marca': msg = `¿Eliminar la marca "${name}"?`; break;
      case 'tipo_producto': msg = `¿Eliminar el tipo de producto "${name}"?`; break;
      case 'tipo_disco': msg = `¿Eliminar el tipo de disco "${name}"?`; break;
      case 'procesador': msg = `¿Eliminar el procesador "${name}"?`; break;
      case 'ram': msg = `¿Eliminar la RAM "${name}"?`; break;
      case 'disco': msg = `¿Eliminar el tamaño de disco "${name}"?`; break;
      case 'ubicacion': msg = `¿Eliminar la ubicación "${name}" y todas sus sub-ubicaciones?`; break;
      case 'punto_alistamiento': msg = `¿Eliminar el punto de alistamiento "${name}"?`; break;
      case 'proveedor': msg = `¿Eliminar el proveedor "${name}"?`; break;
      case 'configuracion_email_baja': msg = `¿Eliminar la configuración de correo de baja para "${name}"?`; break;
    }
    this.deleteMessage.set(msg);
  }

  cancelDelete() {
    this.itemToDelete.set(null);
  }

  confirmDelete() {
    const item = this.itemToDelete();
    if (!item) return;

    const req$ = 
      item.type === 'marca' ? this.api.deleteMarca(item.id) :
      item.type === 'tipo_producto' ? this.api.deleteTipoProducto(item.id) :
      item.type === 'tipo_disco' ? this.api.deleteTipoDisco(item.id) :
      item.type === 'procesador' ? this.api.deleteProcesador(item.id) :
      item.type === 'ram' ? this.api.deleteRam(item.id) :
      item.type === 'disco' ? this.api.deleteDisco(item.id) :
      item.type === 'ubicacion' ? this.api.deleteUbicacion(item.id) :
      item.type === 'punto_alistamiento' ? this.api.deletePuntoAlistamiento(item.id) :
      item.type === 'proveedor' ? this.api.deleteProveedor(item.id) :
      this.api.deleteConfiguracionEmailBaja(item.id);

    req$.subscribe(() => {
      this.loadCatalogos();
      this.cancelDelete();
    });
  }

  moveUp(index: number) {
    if (index <= 0) return;
    this.swap(index, index - 1);
  }

  moveDown(index: number) {
    if (index >= this.puntosAlistamiento().length - 1) return;
    this.swap(index, index + 1);
  }

  private swap(idx1: number, idx2: number) {
    const list = [...this.puntosAlistamiento()];
    const p1 = list[idx1];
    const p2 = list[idx2];

    const order1 = p1.orden || (idx1 + 1);
    const order2 = p2.orden || (idx2 + 1);

    const finalOrder1 = order1 === order2 ? order1 + 1 : order2;
    const finalOrder2 = order1;

    p1.orden = finalOrder1;
    p2.orden = finalOrder2;
    this.puntosAlistamiento.set([...list].sort((a, b) => a.orden - b.orden));

    forkJoin([
      this.api.updatePuntoAlistamiento(p1.id, { orden: finalOrder1 }),
      this.api.updatePuntoAlistamiento(p2.id, { orden: finalOrder2 })
    ]).subscribe(() => {
      this.loadCatalogos();
    });
  }
}
