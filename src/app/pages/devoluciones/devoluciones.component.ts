import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { StorageService } from '../../services/storage';
import { AuthService } from '../../services/auth.service';
import { Asset, InventarioItem, Devolucion } from '../../models/app-state';
import { ActaDevolucionComponent } from '../../components/reports/acta-devolucion/acta-devolucion';
import { CameraComponent } from '../../components/camera/camera.component';
import { SignaturePadComponent } from '../../components/signature-pad/signature-pad.component';
import { ApiService, InventarioItemPayload } from '../../services/api';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-devoluciones',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, ActaDevolucionComponent, CameraComponent, SignaturePadComponent],
  template: `
    <!-- Modales fuera del contenedor animado para evitar problemas con position: fixed y CSS transforms -->
    <!-- Acta Preview Modal -->
    <div *ngIf="showActaPreview() && lastCreatedDevolucion()" class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative">
         <app-acta-devolucion [devolucion]="lastCreatedDevolucion()" [hideDownload]="true" (close)="closeActa()"></app-acta-devolucion>
      </div>
    </div>

    <!-- Multi-Select Peripheral Modal -->
    <div *ngIf="showMultiAddModal" class="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-300">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-brand/10 text-brand rounded-full flex items-center justify-center flex-shrink-0">
            <mat-icon>devices_other</mat-icon>
          </div>
          <h3 class="text-xl font-bold text-slate-800">Equipos Encontrados</h3>
        </div>
        <p class="text-sm text-slate-600 mb-6 font-medium">Se encontraron periféricos asociados a este ítem. Selecciona cuáles quieres incluir en la devolución:</p>
        
        <div class="space-y-3 mb-8 max-h-[300px] overflow-y-auto pr-2">
          <label *ngFor="let item of pendingSearchItems" class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer hover:bg-slate-50 transition-colors" [class.border-brand]="item.selected" [class.bg-orange-50]="item.selected">
            <input type="checkbox" [(ngModel)]="item.selected" class="mt-1 w-4 h-4 text-brand rounded border-slate-300 focus:ring-brand">
            <div>
              <p class="font-bold text-slate-800 text-sm">{{ item.marca }} {{ item.modelo }}</p>
              <p class="text-[10px] text-slate-500 font-bold uppercase">{{ item.tipo_producto || 'N/A' }} | Serial: {{ item.serial }}</p>
            </div>
          </label>
        </div>

        <div class="flex gap-3">
          <button (click)="cancelMultiAdd()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all">
            Cancelar
          </button>
          <button (click)="confirmMultiAdd()" class="flex-1 bg-brand hover:bg-orange-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-200 transition-all">
            Agregar Seleccionados
          </button>
        </div>
      </div>
    </div>

    <!-- Deliverer Signature Modal -->
    <div *ngIf="showConfirmModal" class="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full p-8 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto space-y-6">
        <div class="flex justify-between items-start border-b pb-4">
          <div>
            <h3 class="text-2xl font-black text-slate-800">Datos de Quien Entrega</h3>
            <p class="text-xs text-slate-500 font-medium">Lote de devolución con {{ returnList().length }} equipos.</p>
          </div>
          <button (click)="showConfirmModal = false" class="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition-all">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="space-y-4">
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase">Nombre Completo *</label>
            <input [(ngModel)]="nombreEntregador" placeholder="Nombre de quien devuelve..." class="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-brand text-sm">
          </div>

          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase">Cédula de Ciudadanía *</label>
            <input [(ngModel)]="cedulaEntregador" placeholder="Número de identificación..." class="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-brand text-sm">
          </div>

          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Foto Identificativa *</label>
            <div *ngIf="!fotoEntregador" class="border border-slate-200 rounded-xl p-2 bg-slate-50">
              <app-camera (photoCaptured)="fotoEntregador = $event"></app-camera>
            </div>
            <div *ngIf="fotoEntregador" class="relative group aspect-video rounded-xl overflow-hidden border">
              <img [src]="fotoEntregador" class="w-full h-full object-cover">
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button (click)="fotoEntregador = ''" class="bg-white text-red-500 px-3 py-1.5 rounded-lg text-xs font-bold shadow hover:bg-slate-100 transition-all flex items-center gap-1">
                  <mat-icon class="scale-75">replay</mat-icon>
                  Recapturar
                </button>
              </div>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase">Firma Digital Entregador *</label>
            <div class="border border-slate-200 rounded-xl bg-slate-50 p-2">
              <app-signature-pad label="Firma del Entregador" (signatureChange)="firmaEntregador = $event"></app-signature-pad>
            </div>
          </div>
        </div>

        <!-- Acciones de modal -->
        <div class="flex gap-4 pt-6 border-t">
          <button (click)="showConfirmModal = false" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-2xl font-bold transition-all">
            Cancelar
          </button>
          <button (click)="executeProcessReturn()" [disabled]="!isFormValid() || processingReturn" class="flex-1 bg-brand disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2">
            <mat-icon *ngIf="!processingReturn">check_circle</mat-icon>
            <div *ngIf="processingReturn" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {{ processingReturn ? 'Procesando...' : 'Registrar Devolución' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Approver Signature Modal (Tab Aprobación) -->
    <div *ngIf="approvingDevId() !== null" class="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div class="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full p-8 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto space-y-6">
        <div class="flex justify-between items-start border-b pb-4">
          <div>
            <h3 class="text-2xl font-black text-slate-800">Aprobación Interna</h3>
            <p class="text-xs text-slate-500 font-medium">Lote de devolución #{{ approvingDevId() }}</p>
          </div>
          <button (click)="cancelApproval()" class="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition-all">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="space-y-4">
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase">Aprobador Logueado</label>
            <div class="w-full px-4 py-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-sm font-bold cursor-not-allowed">
              {{ approverName }}
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase">Firma Digital Aprobador *</label>
            <div class="border border-slate-200 rounded-xl bg-slate-50 p-2">
              <app-signature-pad label="Firma del Aprobador" (signatureChange)="firmaAprobador = $event"></app-signature-pad>
            </div>
          </div>
        </div>

        <!-- Acciones de modal -->
        <div class="flex gap-4 pt-6 border-t">
          <button (click)="cancelApproval()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-2xl font-bold transition-all">
            Cancelar
          </button>
          <button (click)="executeApproval()" [disabled]="!firmaAprobador || processingApproval" class="flex-1 bg-brand disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2">
            <mat-icon *ngIf="!processingApproval">verified_user</mat-icon>
            <div *ngIf="processingApproval" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {{ processingApproval ? 'Aprobando...' : 'Aprobar Devolución' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL CREAR EQUIPO EN DEVOLUCIÓN ────────── -->
    <div *ngIf="showCreateEquipForm" class="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div class="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-300">
        <div class="p-6 text-white text-center" style="background: linear-gradient(135deg, #7c3aed, #4f46e5)">
          <div class="w-16 h-16 bg-white/20 rounded-2xl rotate-12 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <mat-icon class="scale-[1.8] -rotate-12">add_box</mat-icon>
          </div>
          <h3 class="text-xl font-black mb-1">
            Crear Equipo en Devolución
          </h3>
          <p class="text-violet-100 text-sm">
            El equipo con serial/ítem <strong>"{{ searchTerm }}"</strong> no existe in inventario. Regístralo aquí para poder agregarlo a la devolución.
          </p>
        </div>

        <div class="mx-6 mt-5 flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-xl p-3">
          <mat-icon class="text-violet-600 flex-shrink-0 mt-0.5 scale-90">info</mat-icon>
          <div class="text-xs text-violet-800 space-y-1">
            <p class="font-bold">⚡ Registro Rápido — Devolución Directa</p>
            <p>Este equipo se creará con estado <strong>ENTREGADO</strong> temporalmente para poder ser marcado en la devolución actual.</p>
          </div>
        </div>

        <div class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nro Ítem</label>
              <input type="number" [(ngModel)]="newEquipForAssociation.item" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand transition-all" placeholder="Nro Ítem">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serial *</label>
              <input [(ngModel)]="newEquipForAssociation.serial" style="text-transform: uppercase;" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand transition-all" placeholder="Serial del equipo">
            </div>
            <div class="col-span-2 sm:col-span-1 space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Producto</label>
              <select [(ngModel)]="newEquipForAssociation.tipo_producto" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand">
                <option value="">Seleccione Tipo de Producto...</option>
                <option *ngFor="let tipo of tiposProducto()" [value]="tipo">{{ tipo }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Marca *</label>
              <select [(ngModel)]="newEquipForAssociation.marca" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand">
                <option value="">Seleccione Marca...</option>
                <option *ngFor="let marca of marcas()" [value]="marca">{{ marca }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modelo *</label>
              <input [(ngModel)]="newEquipForAssociation.modelo" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand transition-all" placeholder="Modelo">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Procesador</label>
              <select [(ngModel)]="newEquipForAssociation.procesador" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand">
                <option value="">Seleccione Procesador...</option>
                <option *ngFor="let proc of procesadores()" [value]="proc">{{ proc }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Memoria RAM</label>
              <select [(ngModel)]="newEquipForAssociation.ram" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand">
                <option value="">Seleccione RAM...</option>
                <option *ngFor="let r of rams()" [value]="r">{{ r }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Disco</label>
              <select [(ngModel)]="newEquipForAssociation.disco" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand">
                <option value="">Seleccione Disco...</option>
                <option *ngFor="let d of discos()" [value]="d">{{ d }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Disco</label>
              <select [(ngModel)]="newEquipForAssociation.tipo_disco" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand">
                <option value="">Seleccione Tipo de Disco...</option>
                <option *ngFor="let td of tiposDisco()" [value]="td">{{ td }}</option>
              </select>
            </div>
            <div class="col-span-2 space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ubicación</label>
              <select [(ngModel)]="newEquipForAssociation.ubicacion" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand">
                <option value="">Seleccione Ubicación...</option>
                <option *ngFor="let ub of ubicaciones()" [value]="ub.path">{{ ub.path }}</option>
              </select>
            </div>
            <div class="col-span-2 space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Anotación / Motivo <span class="text-slate-300 normal-case font-normal">(opcional)</span></label>
              <input [(ngModel)]="newEquipForAssociation.anotacion_recepcion" 
                     class="w-full bg-violet-50 border border-violet-200 text-sm p-2.5 rounded-lg outline-none focus:border-violet-400 transition-all" 
                     placeholder="Ej: Equipo previo no registrado en sistema...">
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button (click)="cancelCreateEquip()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all">
              Cancelar
            </button>
            <button (click)="createEquipAndAssociate()" 
                    [disabled]="!newEquipForAssociation.serial || !newEquipForAssociation.marca || !newEquipForAssociation.modelo || isCreatingEquip()"
                    style="background: linear-gradient(135deg, #7c3aed, #4f46e5)"
                    class="flex-1 text-white py-3 rounded-xl font-bold shadow-lg shadow-violet-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90">
              <div *ngIf="isCreatingEquip()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <mat-icon class="scale-90" *ngIf="!isCreatingEquip()">add_box</mat-icon>
              {{ isCreatingEquip() ? 'Guardando en sistema...' : 'Registrar y Continuar' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Validation Error Modal -->
    <div *ngIf="validationError()" class="fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div class="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-300">
        <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <mat-icon class="scale-150">error_outline</mat-icon>
        </div>
        <h3 class="text-xl font-bold text-slate-800 mb-2">Error de Validación</h3>
        <p class="text-sm text-slate-600 mb-6 font-medium">{{ validationError() }}</p>
        <button (click)="validationError.set('')" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors">
          Entendido
        </button>
      </div>
    </div>

    <!-- Contenido Principal Animado -->
    <div class="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-left duration-500">
      <div class="flex flex-col gap-1">
        <h2 class="text-3xl font-bold tracking-tight">Logística Inversa</h2>
        <p class="text-slate-500">Gestión de devoluciones y activos antiguos.</p>
      </div>

      <!-- Tab selectors -->
      <div *ngIf="auth.hasPermission('generar_devolucion') && auth.hasPermission('aprobar_devolucion')" class="flex border-b border-slate-200">
        <button (click)="activeTab.set('registrar')" 
                [class.border-brand]="activeTab() === 'registrar'" 
                [class.text-brand]="activeTab() === 'registrar'"
                [class.border-transparent]="activeTab() !== 'registrar'"
                [class.text-slate-500]="activeTab() !== 'registrar'"
                class="px-6 py-3 border-b-2 font-bold text-sm transition-all focus:outline-none cursor-pointer">
          Registrar Devolución
        </button>
        <button (click)="activeTab.set('aprobar')" 
                [class.border-brand]="activeTab() === 'aprobar'" 
                [class.text-brand]="activeTab() === 'aprobar'"
                [class.border-transparent]="activeTab() !== 'aprobar'"
                [class.text-slate-500]="activeTab() !== 'aprobar'"
                class="px-6 py-3 border-b-2 font-bold text-sm transition-all focus:outline-none cursor-pointer relative">
          Aprobación Interna
          <span *ngIf="pendingApprovalCount() > 0" class="ml-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {{ pendingApprovalCount() }}
          </span>
        </button>
      </div>

      <!-- Tab 1: Registrar Devolución Content -->
      <div *ngIf="activeTab() === 'registrar'" class="space-y-8">
        <!-- Main Form -->
        <div class="card space-y-6">
          <div class="flex items-center justify-between border-b pb-4">
            <h3 class="text-xl font-semibold">Registro de Devolución</h3>
            <div class="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <mat-icon class="scale-75">warning</mat-icon>
              Permite Equipos Fantasma
            </div>
          </div>

          <div class="space-y-4">
            <div class="flex gap-2">
              <div class="flex-1 space-y-1">
                 <label class="text-xs font-bold text-slate-500 uppercase">Buscar por Serial o Número de Item</label>
                 <div class="relative">
                   <input [(ngModel)]="searchTerm" (keyup.enter)="searchAndAdd()" placeholder="Ingrese el serial o número de item y presione Enter..." style="text-transform: uppercase;" class="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg outline-none focus:border-brand">
                   <mat-icon class="absolute left-3 top-3.5 text-slate-400">search</mat-icon>
                 </div>
              </div>
              <div class="flex items-end">
                <button (click)="searchAndAdd()" [disabled]="!searchTerm" class="btn-secondary h-[50px] px-6 flex items-center justify-center gap-2">
                  <mat-icon>add</mat-icon>
                  Agregar
                </button>
              </div>
            </div>
          </div>

          <div class="space-y-4 pt-6">
            <h4 class="font-bold text-slate-700">Equipos para Devolver</h4>
            <div class="border rounded-xl overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                  <tr>
                    <th class="px-4 py-3">Serial</th>
                    <th class="px-4 py-3">Tipo</th>
                    <th class="px-4 py-3">Referencia</th>
                    <th class="px-4 py-3">Origen</th>
                    <th class="px-4 py-3 w-1/3">Estado de Devolución</th>
                    <th class="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 italic">
                  <tr *ngFor="let item of returnList(); let i = index" class="group">
                    <td class="px-4 py-3 font-mono font-medium text-brand">{{ item.asset.serial }}</td>
                    <td class="px-4 py-3 text-slate-500 font-bold uppercase text-[10px]">{{ item.asset.tipo_producto || 'N/A' }}</td>
                    <td class="px-4 py-3">{{ item.asset.marca }} {{ item.asset.modelo }}</td>
                    <td class="px-4 py-3">
                      <span *ngIf="item.isGhost" class="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Fantasma</span>
                      <span *ngIf="!item.isGhost" class="text-brand bg-orange-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Existente</span>
                    </td>
                    <td class="px-4 py-3">
                      <input [(ngModel)]="item.asset.comentario_devolucion" placeholder="Ej: Pantalla rota, sin cargador..." class="w-full text-xs bg-slate-50 border-none rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-brand/30 transition-all italic">
                    </td>
                    <td class="px-4 py-3 text-right">
                      <button (click)="removeFromList(i)" class="text-red-400 hover:text-red-600 transition-colors">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="returnList().length === 0">
                    <td colspan="6" class="py-12 text-center text-slate-400">Agregue activos para proceder con el acta de devolución.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="space-y-1 pt-4 border-t">
             <label class="text-xs font-bold text-slate-500 uppercase">Comentario General de la Devolución (Opcional)</label>
             <textarea [(ngModel)]="comentarioGeneral" placeholder="Escribe observaciones o motivos generales de esta devolución..." class="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:border-brand text-sm" rows="3"></textarea>
          </div>

          <div class="flex justify-end pt-4 border-t">
            <button (click)="confirmProcessReturn()" [disabled]="returnList().length === 0" class="btn-primary flex items-center gap-2">
              <mat-icon>file_download_done</mat-icon>
              Generar Acta de Devolución
            </button>
          </div>
        </div>
      </div>

      <!-- Tab 2: Aprobación Interna Content -->
      <div *ngIf="activeTab() === 'aprobar'" class="space-y-6">
        <div class="card space-y-4">
          <div class="border-b pb-4">
            <h3 class="text-xl font-bold text-slate-800">Lotes Pendientes de Aprobación</h3>
            <p class="text-xs text-slate-400 font-medium">Revisa las devoluciones entregadas y fírmalas para proceder con el envío.</p>
          </div>

          <div class="space-y-6">
            <!-- List of pending lots -->
            <div *ngFor="let dev of pendingDevolucionesForApproval()" class="border border-slate-100 rounded-[2rem] p-6 hover:shadow-xl transition-all bg-white relative overflow-hidden shadow-sm">
              <div class="absolute left-0 top-0 bottom-0 w-2 bg-amber-500"></div>

              <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                    <mat-icon class="scale-110">local_shipping</mat-icon>
                  </div>
                  <div>
                    <h4 class="text-lg font-black text-slate-800">Lote #{{ dev.id }}</h4>
                    <p class="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                      <mat-icon class="scale-[0.6] w-3.5 h-3.5 flex items-center justify-center">schedule</mat-icon> 
                      {{ dev.fecha_creacion | date:'medium' }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-3 ml-auto">
                  <button (click)="openApproveModal(dev.id)" class="bg-[#FF6B00] hover:bg-orange-600 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2">
                    <mat-icon class="scale-90">draw</mat-icon>
                    Firmar y Aprobar
                  </button>
                </div>
              </div>

              <!-- Entregador info -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs font-medium text-slate-600">
                <p>Entregado por: <strong class="text-slate-800">{{ dev.nombre_persona_devolucion }}</strong> (C.C. {{ dev.cedula_persona_devolucion }})</p>
                <p *ngIf="dev.comentarios">Observaciones: <strong class="text-slate-800">"{{ dev.comentarios }}"</strong></p>
              </div>

              <!-- Items inside lot -->
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Equipos Incluidos ({{ dev.items.length }})</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div *ngFor="let item of dev.items" class="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-4">
                    <div>
                      <p class="font-bold text-slate-800 text-xs">{{ item.marca }} {{ item.modelo }}</p>
                      <p class="font-mono text-[10px] text-[#FF6B00] font-black mt-0.5">{{ item.serial }}</p>
                    </div>
                    <span class="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200/50 uppercase font-bold text-slate-400">{{ item.tipo_producto || 'Equipo' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty state -->
            <div *ngIf="pendingApprovalCount() === 0" class="py-16 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/20">
              <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                <mat-icon class="scale-125">fact_check</mat-icon>
              </div>
              <p class="text-lg font-bold text-slate-700">Sin lotes pendientes de aprobación</p>
              <p class="text-xs text-slate-400 mt-1">Todos los lotes de devolución han sido aprobados internamente.</p>
            </div>
          </div>
        </div>
    </div>
  `
})
export class DevolucionesComponent implements OnInit {
  private storage = inject(StorageService);
  private api = inject(ApiService);
  auth = inject(AuthService); // Hacerlo publico para usar en template

  activeTab = signal<'registrar' | 'aprobar'>('registrar');
  approvingDevId = signal<number | null>(null);

  // Modal properties for adding new equipment
  showCreateEquipForm = false;
  newEquipForAssociation: Asset = {
    item: undefined,
    serial: '',
    marca: '',
    modelo: '',
    tipo_producto: '',
    ram: '',
    disco: '',
    tipo_disco: '',
    procesador: '',
    ubicacion: '',
    anotacion_recepcion: ''
  };
  tiposProducto = signal<string[]>([]);
  marcas = signal<string[]>([]);
  ubicaciones = signal<any[]>([]);
  tiposDisco = signal<string[]>([]);
  procesadores = signal<string[]>([]);
  rams = signal<string[]>([]);
  discos = signal<string[]>([]);
  validationError = signal('');
  isCreatingEquip = signal(false);

  ngOnInit() {
    if (!this.auth.hasPermission('generar_devolucion') && this.auth.hasPermission('aprobar_devolucion')) {
      this.activeTab.set('aprobar');
    }
    this.api.getTiposProducto().subscribe(res => {
      if (res && res.length > 0) {
        this.tiposProducto.set(res.map(r => r.nombre));
      }
    });
    this.api.getMarcas().subscribe(res => {
      if (res && res.length > 0) this.marcas.set(res.map(r => r.nombre));
    });
    this.api.getUbicaciones().subscribe(res => {
      if (res) {
        const sorted = res.sort((a, b) => a.path.localeCompare(b.path));
        this.ubicaciones.set(sorted);
      }
    });
    this.api.getTiposDisco().subscribe(res => {
      if (res && res.length > 0) this.tiposDisco.set(res.map(r => r.nombre));
    });
    this.api.getProcesadores().subscribe(res => {
      if (res && res.length > 0) this.procesadores.set(res.map(r => r.nombre));
    });
    this.api.getRam().subscribe(res => {
      if (res && res.length > 0) this.rams.set(res.map(r => r.nombre));
    });
    this.api.getDiscos().subscribe(res => {
      if (res && res.length > 0) this.discos.set(res.map(r => r.nombre));
    });
  }

  pendingDevolucionesForApproval = computed(() => 
    this.storage.devoluciones().filter(d => d.estado === 'PENDIENTE')
  );

  pendingApprovalCount = computed(() => this.pendingDevolucionesForApproval().length);

  approvingDev = computed(() => {
    const id = this.approvingDevId();
    if (id === null) return null;
    return this.pendingDevolucionesForApproval().find(d => d.id === id) || null;
  });

  nombreEntregador = '';
  cedulaEntregador = '';
  fotoEntregador = '';
  firmaEntregador = '';
  firmaAprobador = '';

  get approverName(): string {
    const user = this.auth.currentUser();
    if (!user) return 'Usuario de Bodega';
    const full = [user.first_name, user.last_name].filter(Boolean).join(' ');
    return full || user.username;
  }

  isFormValid(): boolean {
    return !!this.nombreEntregador.trim() &&
           !!this.cedulaEntregador.trim() &&
           !!this.fotoEntregador &&
           !!this.firmaEntregador;
  }

  searchTerm = '';
  showGhostForm = false;
  ghostAsset: Asset = { serial: '', marca: '', modelo: '', tipo_producto: '', comentarios: '' };
  comentarioGeneral = '';
  showConfirmModal = false;
  processingReturn = false;
  
  showMultiAddModal = false;
  pendingSearchItems: any[] = [];

  returnList = signal<{ asset: Asset, isGhost: boolean }[]>([]);
  showActaPreview = signal(false);
  lastCreatedDevolucion = signal<Devolucion | null>(null);

  searchAndAdd() {
    this.searchTerm = this.searchTerm.trim().toUpperCase();
    if (!this.searchTerm) return;

    const existings = this.storage.getAssets(this.searchTerm);
    
    if (existings && existings.length > 0) {
      if (existings.length === 1) {
        this._addItemsToList(existings);
      } else {
        // Multiples encontrados (equipo + periféricos), abrimos modal
        this.pendingSearchItems = existings.map(item => ({
          ...item,
          selected: true // Por defecto seleccionamos todos
        }));
        this.showMultiAddModal = true;
      }
    } else {
      this.newEquipForAssociation = {
        serial: this.searchTerm.trim(),
        marca: '',
        modelo: '',
        tipo_producto: '',
        ram: '',
        disco: '',
        tipo_disco: '',
        procesador: '',
        ubicacion: '',
        anotacion_recepcion: ''
      };
      this.showCreateEquipForm = true;
    }
    // We clear search term either way
    this.searchTerm = '';
  }

  confirmMultiAdd() {
    const selectedItems = this.pendingSearchItems.filter(i => i.selected);
    this._addItemsToList(selectedItems);
    this.showMultiAddModal = false;
  }

  cancelMultiAdd() {
    this.showMultiAddModal = false;
  }

  private _addItemsToList(items: any[]) {
    let addedCount = 0;
    let alreadyInListCount = 0;
    let propiosCount = 0;

    for (const existing of items) {
      if (existing.es_propio) {
        propiosCount++;
        continue;
      }

      const alreadyInList = this.returnList().some(item => item.asset.serial === existing.serial);
      if (!alreadyInList) {
        this.returnList.update(list => [
          ...list, 
          { 
            asset: { ...existing }, 
            isGhost: false 
          }
        ]);
        addedCount++;
      } else {
        alreadyInListCount++;
      }
    }

    if (alreadyInListCount > 0 && items.length === alreadyInListCount + propiosCount) {
      alert('El equipo (o equipos) ya está en la lista de devolución.');
    } else if (propiosCount > 0) {
      alert(`Se omitieron ${propiosCount} equipo(s) porque son propios y no se devuelven al proveedor.`);
    }
  }

  async createEquipAndAssociate() {
    if (this.newEquipForAssociation.serial) {
      this.newEquipForAssociation.serial = this.newEquipForAssociation.serial.trim().toUpperCase();
    }
    if (!this.newEquipForAssociation.serial || !this.newEquipForAssociation.marca || !this.newEquipForAssociation.modelo) return;

    const anotacion = this.newEquipForAssociation.anotacion_recepcion ||
      'Creado automáticamente desde devolución';

    const payload: InventarioItemPayload = {
      item: this.newEquipForAssociation.item ? Number(this.newEquipForAssociation.item) : undefined,
      serial: this.newEquipForAssociation.serial,
      marca: this.newEquipForAssociation.marca,
      modelo: this.newEquipForAssociation.modelo,
      tipo_producto: this.newEquipForAssociation.tipo_producto || '',
      procesador: this.newEquipForAssociation.procesador || undefined,
      disco: this.newEquipForAssociation.disco || undefined,
      tipo_disco: this.newEquipForAssociation.tipo_disco || undefined,
      ram: this.newEquipForAssociation.ram || undefined,
      ubicacion: this.newEquipForAssociation.ubicacion || '',
      estado: 'ENTREGADO',
      comentarios: anotacion
    };

    this.isCreatingEquip.set(true);
    let success = false;
    let createdItem: any = null;

    try {
      createdItem = await firstValueFrom(this.api.createInventarioItem(payload));
      // Recargar inventario para reflejar el nuevo equipo
      await this.storage.loadInventarioFromApi();
      success = true;
    } catch (error: any) {
      this.validationError.set(
        'No se pudo registrar el equipo en el sistema. Verifique que el serial no esté duplicado e intente nuevamente.'
      );
    } finally {
      this.isCreatingEquip.set(false);
    }

    if (success && createdItem) {
      this.showCreateEquipForm = false;
      
      const match = this.storage.inventario().find(a => a.serial === createdItem.serial);
      const assetToReturn = match ? { ...match } : {
        ...createdItem,
        _backendId: createdItem.id
      };

      this.returnList.update(list => [
        ...list,
        {
          asset: assetToReturn,
          isGhost: false
        }
      ]);

      this.newEquipForAssociation = {
        item: undefined,
        serial: '',
        marca: '',
        modelo: '',
        tipo_producto: '',
        ram: '',
        disco: '',
        tipo_disco: '',
        procesador: '',
        ubicacion: '',
        anotacion_recepcion: ''
      };
    }
  }

  cancelCreateEquip() {
    this.showCreateEquipForm = false;
    this.newEquipForAssociation = {
      item: undefined,
      serial: '',
      marca: '',
      modelo: '',
      tipo_producto: '',
      ram: '',
      disco: '',
      tipo_disco: '',
      procesador: '',
      ubicacion: '',
      anotacion_recepcion: ''
    };
  }

  removeFromList(index: number) {
    this.returnList.update(list => list.filter((_, i) => i !== index));
  }

  confirmProcessReturn() {
    this.showConfirmModal = true;
  }

  async executeProcessReturn() {
    if (!this.isFormValid()) return;
    this.processingReturn = true;
    try {
      const itemsToReturn = this.returnList().map(item => item.asset as InventarioItem);
      const extraData = {
        foto_persona_devolucion: this.fotoEntregador,
        firma_persona_devolucion: this.firmaEntregador,
        nombre_persona_devolucion: this.nombreEntregador,
        cedula_persona_devolucion: this.cedulaEntregador
      };

      const result = await this.storage.registerDevolucion(itemsToReturn, extraData, this.comentarioGeneral);
      this.lastCreatedDevolucion.set(result);
      this.showActaPreview.set(true);
      
      // Resetear campos
      this.returnList.set([]);
      this.comentarioGeneral = '';
      this.nombreEntregador = '';
      this.cedulaEntregador = '';
      this.fotoEntregador = '';
      this.firmaEntregador = '';
      this.firmaAprobador = '';
      this.showConfirmModal = false;
    } catch (e: any) {
      alert(`Error al registrar la devolución: ${e?.message || 'Error desconocido'}`);
      this.showConfirmModal = false;
    } finally {
      this.processingReturn = false;
    }
  }

  closeActa() {
    this.showActaPreview.set(false);
    this.lastCreatedDevolucion.set(null);
  }

  processingApproval = false;

  openApproveModal(devId: number) {
    this.firmaAprobador = '';
    this.approvingDevId.set(devId);
  }

  cancelApproval() {
    this.approvingDevId.set(null);
    this.firmaAprobador = '';
  }

  async executeApproval() {
    const id = this.approvingDevId();
    if (id === null || !this.firmaAprobador) return;
    this.processingApproval = true;
    try {
      await this.storage.approveDevolucion(id, this.approverName, this.firmaAprobador);
      this.cancelApproval();
    } catch (e: any) {
      alert(`Error al aprobar la devolución: ${e?.message || 'Error desconocido'}`);
    } finally {
      this.processingApproval = false;
    }
  }
}
