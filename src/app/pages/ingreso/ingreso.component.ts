import { Component, inject, signal, computed, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { StorageService } from '../../services/storage';
import { AuthService } from '../../services/auth.service';
import { OcrService } from '../../services/ocr';
import { Asset, Recepcion } from '../../models/app-state';
import { CameraComponent } from '../../components/camera/camera.component';
import { SignaturePadComponent } from '../../components/signature-pad/signature-pad.component';
import { ApiService, InventarioItemPayload } from '../../services/api';
import { generateUUID } from '../../utils/uuid';

@Component({
  selector: 'app-ingreso',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    CameraComponent,
    SignaturePadComponent
  ],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom duration-500">
      <!-- Column 1: Identity & Process Flow (Left) -->
      <div class="lg:col-span-4 space-y-6">
        <div class="card p-5">
          <h3 class="label-mini mb-4">Identidad de Recepción</h3>
          
          <div class="space-y-4">
            <!-- Biometry Frame -->
            <div class="relative bg-slate-900 aspect-video rounded-lg overflow-hidden border-2" [class.border-brand]="biometricPhoto()" [class.border-slate-800]="!biometricPhoto()">
               <img *ngIf="biometricPhoto()" [src]="biometricPhoto()" class="w-full h-full object-cover opacity-80">
               <div *ngIf="!biometricPhoto()" class="w-full h-full flex flex-col items-center justify-center text-slate-600">
                 <mat-icon class="scale-125 mb-2">face</mat-icon>
                 <span class="text-[10px] uppercase font-bold tracking-widest">Awaiting Biometric</span>
               </div>
               <div *ngIf="biometricPhoto()" class="absolute bottom-2 left-2 px-2 py-0.5 bg-brand text-white text-[10px] rounded uppercase font-bold tracking-tighter">Match Verified</div>
            </div>

            <div class="space-y-3">
              <div>
                <label class="label-mini">Entregador</label>
                <p class="text-sm font-bold text-slate-800" *ngIf="entregadorForm.get('nombre')?.value; else noValue">
                  {{ entregadorForm.get('nombre')?.value }}
                </p>
                <ng-template #noValue><p class="text-xs text-slate-400 italic">Esperando datos...</p></ng-template>
                <p class="text-xs text-slate-400 font-medium">{{ obtenerProveedorNombreSeleccionado() || 'Pending Registry' }}</p>
              </div>

              <div class="h-px bg-slate-100"></div>

              <div>
                <label class="label-mini">Receptor Técnico</label>
                <p class="text-sm font-bold text-slate-800">{{ authService.currentUser()?.first_name }} {{ authService.currentUser()?.last_name }} [Usuario Logueado]</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Column 2: Main Logic Space -->
      <div class="lg:col-span-8 flex flex-col gap-6">
        <div class="card p-0 flex flex-col overflow-hidden min-h-[600px]">
          <div class="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-slate-800">Ingreso de Activos</h2>
              <p class="text-xs text-slate-500 font-medium mt-1">Sincronización manual o vía OCR Engine</p>
            </div>
            <div class="flex items-center gap-4">
               <button (click)="resetProcess()" class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 transition-all">
                 <mat-icon class="scale-75">restart_alt</mat-icon>
                 Reiniciar
               </button>
               <div class="flex gap-1">
                 <div class="w-1.5 h-1.5 rounded-full" [class]="step() >= 1 ? 'bg-brand' : 'bg-slate-200'"></div>
                 <div class="w-1.5 h-1.5 rounded-full" [class]="step() >= 2 ? 'bg-brand' : 'bg-slate-200'"></div>
                 <div class="w-1.5 h-1.5 rounded-full" [class]="step() >= 3 ? 'bg-brand' : 'bg-slate-200'"></div>
                 <div class="w-1.5 h-1.5 rounded-full" [class]="step() >= 4 ? 'bg-brand' : 'bg-slate-200'"></div>
               </div>
            </div>
          </div>

          <div #scrollContainer class="flex-1 p-8 overflow-y-auto bg-slate-50/50">
            <!-- Reuse existing step logic but with refined UI inside this panel -->
            
            <!-- Step 1: Form Inline -->
            <div *ngIf="step() === 1" class="space-y-6 max-w-xl mx-auto py-6">
              <h3 class="text-center font-bold text-xl text-slate-800 mb-6">Información del Trámite</h3>
              <form [formGroup]="entregadorForm" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <label class="label-mini text-brand">Nombre Entregador</label>
                    <input formControlName="nombre" class="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 outline-none focus:border-brand transition-all font-medium text-sm">
                  </div>
                  <div class="space-y-1">
                    <label class="label-mini text-brand">Cédula</label>
                    <input formControlName="cedula" 
                           type="text"
                           maxlength="10"
                           (input)="onCedulaInput($event)"
                           class="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 outline-none focus:border-brand transition-all font-medium text-sm"
                           [class.border-red-400]="entregadorForm.get('cedula')?.invalid && entregadorForm.get('cedula')?.touched">
                    <p *ngIf="entregadorForm.get('cedula')?.errors?.['pattern'] && entregadorForm.get('cedula')?.touched" class="text-[10px] text-red-500 mt-1 font-bold">Solo se permiten números</p>
                  </div>
                </div>

                <div class="space-y-1">
                  <div class="flex justify-between items-center">
                    <label class="label-mini text-brand">Empresa Remitente (Proveedor)</label>
                    <button type="button" (click)="abrirModalCrearProveedor()" class="text-xs text-brand hover:underline font-bold flex items-center gap-0.5">
                      <mat-icon class="scale-75">add</mat-icon> Crear Proveedor
                    </button>
                  </div>
                  <select formControlName="proveedor" class="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 outline-none focus:border-brand transition-all font-medium text-sm">
                    <option value="">Seleccione un proveedor...</option>
                    <option *ngFor="let prov of proveedores()" [value]="prov.id">{{ prov.nombre }}</option>
                  </select>
                </div>

                <div class="space-y-1">
                  <label class="label-mini text-brand">Receptor Técnico</label>
                  <div class="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded-lg px-4 py-3 font-medium text-sm cursor-not-allowed">
                    {{ authService.currentUser()?.first_name }} {{ authService.currentUser()?.last_name }} (Usuario Logueado)
                  </div>
                </div>
              </form>
              <div class="pt-8 flex justify-center">
                <button class="bg-[#FF6B00] text-white border-2 border-[#FF6B00] px-8 py-3.5 rounded-xl font-bold hover:bg-[#E65A00] hover:border-[#E65A00] hover:shadow-lg hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-3 w-full max-w-xs mx-auto" [disabled]="entregadorForm.invalid" (click)="nextStep()">
                  <mat-icon>fingerprint</mat-icon>
                  Iniciar Captura Biométrica
                </button>
              </div>
            </div>

            <!-- Step 2: Camera Inner -->
            <div *ngIf="step() === 2" class="space-y-6 flex flex-col items-center py-10">
              <div class="w-full max-w-lg space-y-8">
                 <!-- Entregador -->
                 <div class="space-y-4">
                   <h4 class="font-bold text-slate-700 text-center">1. Foto Entregador</h4>
                   <app-camera *ngIf="!biometricPhoto()" (photoCaptured)="setPhoto($event, 'entregador')"></app-camera>
                   <div *ngIf="biometricPhoto()" class="space-y-4">
                      <div class="card p-2 bg-orange-50 border-orange-200">
                        <img [src]="biometricPhoto()" class="w-full aspect-video rounded-lg object-cover">
                      </div>
                      <div class="flex gap-4">
                        <button class="bg-white text-[#FF6B00] border-2 border-[#FF6B00] px-6 py-3 rounded-xl font-bold hover:bg-orange-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 flex-1" (click)="biometricPhoto.set('')">
                          <mat-icon>replay</mat-icon> Recapturar
                        </button>
                      </div>
                   </div>
                 </div>

                 <!-- Receptor -->
                 <div class="space-y-4" *ngIf="biometricPhoto()">
                   <h4 class="font-bold text-slate-700 text-center">2. Foto Receptor (Técnico)</h4>
                   <app-camera *ngIf="!receptorPhoto()" (photoCaptured)="setPhoto($event, 'receptor')"></app-camera>
                   <div *ngIf="receptorPhoto()" class="space-y-4">
                      <div class="card p-2 bg-slate-50 border-slate-200">
                        <img [src]="receptorPhoto()" class="w-full aspect-video rounded-lg object-cover">
                      </div>
                      <div class="flex gap-4">
                        <button class="bg-white text-slate-600 border-2 border-slate-300 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 flex-1" (click)="receptorPhoto.set('')">
                          <mat-icon>replay</mat-icon> Recapturar
                        </button>
                      </div>
                   </div>
                 </div>

                 <div class="flex gap-4 pt-4" *ngIf="biometricPhoto() && receptorPhoto()">
                   <button class="bg-[#FF6B00] text-white border-2 border-[#FF6B00] px-6 py-3 rounded-xl font-bold hover:bg-[#E65A00] hover:border-[#E65A00] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 flex-1 w-full" (click)="nextStep()">
                     <mat-icon>verified_user</mat-icon> Validar Identidades
                   </button>
                 </div>
              </div>
            </div>

            <!-- Step 3: OCR Table Area -->
            <div *ngIf="step() === 3" class="space-y-6">
              <div class="flex items-center justify-between mb-4">
                <h4 class="font-bold text-slate-800">Agregar Equipos Principales</h4>
                <div class="flex gap-2">
                  <input type="file" #fileInput class="hidden" (change)="handleOcrUpload($event)" accept="image/*">
                  <button class="bg-white text-[#FF6B00] border-2 border-[#FF6B00] px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center gap-2" (click)="fileInput.click()">
                    <mat-icon class="scale-90">document_scanner</mat-icon>
                    <span>Extract OCR</span>
                  </button>
                </div>
              </div>

              <!-- Formulario para agregar un equipo -->
              <div class="bg-white p-4 rounded-xl border shadow-sm">
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-3">
                  <input type="number" [(ngModel)]="newAsset.item" class="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand" placeholder="Nro Ítem">
                  <input [(ngModel)]="newAsset.serial" style="text-transform: uppercase;" class="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand" placeholder="Serial">
                  
                  <select [(ngModel)]="newAsset.tipo_producto" class="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand">
                    <option value="">Tipo de Equipo...</option>
                    <option *ngFor="let tipo of tiposProductoEquipo()" [value]="tipo">{{ tipo }}</option>
                  </select>

                  <select [(ngModel)]="newAsset.marca" class="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand">
                    <option value="">Marca...</option>
                    <option *ngFor="let marca of marcas()" [value]="marca">{{ marca }}</option>
                  </select>

                  <input [(ngModel)]="newAsset.modelo" class="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand" placeholder="Modelo">
                  
                  <select [(ngModel)]="newAsset.procesador" class="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand">
                    <option value="">Procesador...</option>
                    <option *ngFor="let p of procesadores()" [value]="p">{{ p }}</option>
                  </select>
                  <select [(ngModel)]="newAsset.ram" class="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand">
                    <option value="">Memoria RAM...</option>
                    <option *ngFor="let r of ramList()" [value]="r">{{ r }}</option>
                  </select>
                  <select [(ngModel)]="newAsset.disco" class="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand">
                    <option value="">Disco...</option>
                    <option *ngFor="let d of discoList()" [value]="d">{{ d }}</option>
                  </select>
                  <select [(ngModel)]="newAsset.tipo_disco" class="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand">
                    <option value="">Tipo de Disco...</option>
                    <option *ngFor="let td of tiposDisco()" [value]="td">{{ td }}</option>
                  </select>
                  <div class="col-span-2 md:col-span-5 flex items-center gap-3">
                    <label class="flex items-center gap-1 text-xs text-slate-600 font-bold">
                      <input type="checkbox" [(ngModel)]="newAsset.es_cambio" class="accent-brand"> Es Cambio
                    </label>
                    <div *ngIf="newAsset.es_cambio" class="relative flex-1" (focusout)="onCambioFocusOut()">
                      <input type="text"
                             [(ngModel)]="searchCambioText"
                             (focus)="showCambioPorDropdown.set(true)"
                             (input)="onCambioQueryChange($event)"
                             class="w-full bg-amber-50 border border-amber-200 text-xs p-2 rounded outline-none focus:border-brand" 
                             placeholder="Buscar equipo a reemplazar (Item, Serial...)">
                      
                      <!-- Dropdown List -->
                      <div *ngIf="showCambioPorDropdown() && filteredCambioAssets().length > 0" 
                           class="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        <div *ngFor="let asset of filteredCambioAssets()" 
                             (mousedown)="selectCambioAsset(asset)"
                             class="p-2 hover:bg-slate-50 cursor-pointer text-xs flex justify-between items-center border-b border-slate-100 last:border-0">
                          <div class="text-left">
                            <p class="font-bold text-slate-800">{{ asset.marca }} {{ asset.modelo }}</p>
                            <p class="text-[10px] text-slate-500 font-mono">Serial: {{ asset.serial }} | Item: {{ asset.item }}</p>
                          </div>
                          <div class="flex items-center gap-1.5">
                            <span *ngIf="asset.estado" class="text-[9px] px-1.5 py-0.5 rounded font-bold"
                                  [class.bg-emerald-100]="asset.estado === 'DISPONIBLE'"
                                  [class.text-emerald-700]="asset.estado === 'DISPONIBLE'"
                                  [class.bg-blue-100]="asset.estado === 'ENTREGADO'"
                                  [class.text-blue-700]="asset.estado === 'ENTREGADO'"
                                  [class.bg-amber-100]="asset.estado === 'ALISTAMIENTO' || asset.estado === 'RECIBIDO'"
                                  [class.text-amber-700]="asset.estado === 'ALISTAMIENTO' || asset.estado === 'RECIBIDO'"
                                  [class.bg-slate-100]="asset.estado !== 'DISPONIBLE' && asset.estado !== 'ENTREGADO' && asset.estado !== 'ALISTAMIENTO' && asset.estado !== 'RECIBIDO'"
                                  [class.text-slate-600]="asset.estado !== 'DISPONIBLE' && asset.estado !== 'ENTREGADO' && asset.estado !== 'ALISTAMIENTO' && asset.estado !== 'RECIBIDO'">
                              {{ asset.estado }}
                            </span>
                            <span class="text-[10px] bg-slate-100 text-slate-600 px-1 rounded">{{ asset.tipo_producto }}</span>
                          </div>
                        </div>
                      </div>
                      <div *ngIf="showCambioPorDropdown() && filteredCambioAssets().length === 0" 
                           class="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-3 text-center text-xs text-slate-400 italic">
                        No se encontraron equipos
                      </div>
                    </div>
                    <label class="flex items-center gap-1 text-xs text-slate-600 font-bold">
                      <input type="checkbox" [(ngModel)]="newAsset.es_propio" class="accent-brand"> Equipo Propio
                    </label>
                    <input [(ngModel)]="newAsset.comentarios" class="flex-1 bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand" placeholder="Comentarios">
                  </div>
                </div>
                <div class="flex justify-end mt-2">
                  <button class="bg-[#FF6B00] text-white border-2 border-[#FF6B00] px-5 py-2.5 rounded-lg font-bold text-xs hover:bg-[#E65A00] hover:border-[#E65A00] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center gap-1.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed" (click)="addManualAsset()" [disabled]="!newAsset.serial || !newAsset.marca">
                    <mat-icon class="scale-90">add_circle</mat-icon> Agregar a la Tabla
                  </button>
                </div>
              </div>
              
              <!-- Tabla de visualización -->
              <div class="border rounded-xl bg-white overflow-hidden shadow-sm" *ngIf="equipmentList().length > 0">
                <table class="w-full text-sm text-left">
                  <thead class="bg-slate-50">
                    <tr class="text-[10px] text-slate-500 uppercase tracking-wider">
                      <th class="px-3 py-2">Item</th>
                      <th class="px-3 py-2">Serial</th>
                      <th class="px-3 py-2">Tipo / Marca / Modelo</th>
                      <th class="px-3 py-2">Specs</th>
                      <th class="px-3 py-2">Ubicación / Cambio</th>
                      <th class="px-3 py-2">Obs.</th>
                      <th class="w-20 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr *ngFor="let asset of equipmentList(); let i = index" 
                        class="hover:bg-slate-50"
                        [class.bg-violet-50]="asset.ingresado_en_recepcion">
                      <td class="px-3 py-2 font-bold text-slate-400">{{ asset.item }}</td>
                      <td class="px-3 py-2 font-mono text-brand">{{ asset.serial | uppercase }}</td>
                      <td class="px-3 py-2 text-xs">
                        <span class="font-bold">{{ asset.tipo_producto || '-' }}</span><br>
                        {{ asset.marca }} {{ asset.modelo }}
                        <span *ngIf="asset.ingresado_en_recepcion" 
                              class="inline-flex items-center gap-0.5 text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-bold ml-1 uppercase tracking-tight"
                              [title]="asset.anotacion_recepcion || 'Creado directamente en recepción'">
                          <mat-icon style="font-size:10px;height:10px;width:10px;">bolt</mat-icon> Recepción Directa
                        </span>
                      </td>
                      <td class="px-3 py-2 text-xs text-slate-500">
                        {{ asset.procesador || '-' }} | {{ asset.ram || '-' }} | {{ asset.disco || '-' }} {{ asset.tipo_disco || '' }}
                      </td>
                      <td class="px-3 py-2 text-xs">
                        <span *ngIf="asset.es_propio" class="text-indigo-600 bg-indigo-50 px-1 rounded font-bold ml-1">Propio</span><br>
                        <span *ngIf="asset.es_cambio" class="text-amber-600 bg-amber-50 px-1 rounded font-bold">Reemplaza Ítem: {{ asset.cambio_por }}</span>
                        <span *ngIf="asset.ingresado_en_recepcion && asset.anotacion_recepcion" 
                              class="block text-violet-600 italic mt-0.5">📝 {{ asset.anotacion_recepcion }}</span>
                      </td>
                      <td class="px-3 py-2 text-xs italic">{{ asset.comentarios || '-' }}</td>
                      <td class="px-3 py-2 text-right">
                        <div class="flex items-center justify-end gap-1">
                          <button (click)="editAsset(i)" class="p-1.5 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200" title="Editar"><mat-icon class="scale-90">edit</mat-icon></button>
                          <button (click)="removeAsset(i)" class="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200" title="Eliminar"><mat-icon class="scale-90">delete_outline</mat-icon></button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div *ngIf="equipmentList().length === 0" class="text-center py-6 text-slate-400 text-sm italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <mat-icon class="block mx-auto mb-2 opacity-20 scale-125">inventory_2</mat-icon>
                No hay equipos principales en la lista.
              </div>

              <!-- PERIPHERALS SECTION START -->
              <div class="mt-8 pt-8 border-t border-slate-200 space-y-4">
                <h4 class="font-bold text-slate-800">Agregar Periféricos (Opcional)</h4>
                
                <div class="bg-white p-4 rounded-xl border shadow-sm">
                  <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                    <input type="number" [(ngModel)]="newPeripheral.item" class="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand" placeholder="Nro Ítem">
                    <input [(ngModel)]="newPeripheral.serial" style="text-transform: uppercase;" class="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand" placeholder="Serial">
                    <select [(ngModel)]="newPeripheral.tipo_producto" class="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand">
                      <option value="">Tipo (Mouse, Cable...)</option>
                      <option *ngFor="let tipo of tiposProductoPeriferico()" [value]="tipo">{{ tipo }}</option>
                    </select>
                    
                    <select [(ngModel)]="newPeripheral.marca" class="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand">
                      <option value="">Marca...</option>
                      <option *ngFor="let marca of marcas()" [value]="marca">{{ marca }}</option>
                    </select>
                    <input [(ngModel)]="newPeripheral.modelo" class="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand" placeholder="Modelo">

                    <div class="relative col-span-2 md:col-span-3 w-full" (focusout)="onAsociarFocusOut()">
                      <input type="text"
                             [(ngModel)]="searchAsociarText"
                             (focus)="showAsociarDropdown.set(true)"
                             (input)="onAsociarQueryChange($event)"
                             class="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand" 
                             placeholder="Asociar a Ítem/Serial...">
                      
                      <!-- Dropdown List -->
                      <div *ngIf="showAsociarDropdown() && filteredAsociarAssets().length > 0" 
                           class="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        <div *ngFor="let asset of filteredAsociarAssets()" 
                             (mousedown)="selectAsociarAsset(asset)"
                             class="p-2 hover:bg-slate-50 cursor-pointer text-xs flex justify-between items-center border-b border-slate-100 last:border-0">
                          <div class="text-left">
                            <p class="font-bold text-slate-800">
                              {{ asset.marca }} {{ asset.modelo }}
                              <span *ngIf="asset.isLocal" class="text-[9px] bg-blue-100 text-blue-700 px-1 rounded ml-1 font-normal">Nuevo (Local)</span>
                            </p>
                            <p class="text-[10px] text-slate-500 font-mono">Serial: {{ asset.serial }} | Item: {{ asset.item }}</p>
                          </div>
                          <span class="text-[10px] bg-slate-100 text-slate-600 px-1 rounded">{{ asset.tipo_producto }}</span>
                        </div>
                      </div>
                      <div *ngIf="showAsociarDropdown() && filteredAsociarAssets().length === 0" 
                           class="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-3 text-center text-xs text-slate-400 italic">
                        No se encontraron equipos
                      </div>
                    </div>
                    <div class="col-span-2 md:col-span-2 flex items-center gap-3">
                      <label class="flex items-center gap-1 text-xs text-slate-600 font-bold whitespace-nowrap">
                        <input type="checkbox" [(ngModel)]="newPeripheral.es_propio" class="accent-brand"> Propio
                      </label>
                      <label class="flex items-center gap-1 text-xs text-amber-700 font-bold whitespace-nowrap">
                        <input type="checkbox" [(ngModel)]="newPeripheral.es_cambio" class="accent-amber-500"> Es Cambio
                      </label>
                    </div>
                    <div *ngIf="newPeripheral.es_cambio" class="col-span-2 md:col-span-5 relative" (focusout)="onCambioPeriphFocusOut()">
                      <input type="text"
                             [(ngModel)]="searchCambioPeriphText"
                             (focus)="showCambioPorPeriphDropdown.set(true)"
                             (input)="onCambioPeriphQueryChange($event)"
                             class="w-full bg-amber-50 border border-amber-200 text-xs p-2 rounded outline-none focus:border-brand"
                             placeholder="Buscar periférico a reemplazar (Item, Serial...)">
                      
                      <!-- Dropdown List -->
                      <div *ngIf="showCambioPorPeriphDropdown() && filteredCambioPeriphAssets().length > 0"
                           class="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        <div *ngFor="let asset of filteredCambioPeriphAssets()"
                             (mousedown)="selectCambioPeriphAsset(asset)"
                             class="p-2 hover:bg-slate-50 cursor-pointer text-xs flex justify-between items-center border-b border-slate-100 last:border-0">
                          <div class="text-left">
                            <p class="font-bold text-slate-800">{{ asset.marca }} {{ asset.modelo }}</p>
                            <p class="text-[10px] text-slate-500 font-mono">Serial: {{ asset.serial }} | Item: {{ asset.item }}</p>
                          </div>
                          <div class="flex items-center gap-1.5">
                            <span *ngIf="asset.estado" class="text-[9px] px-1.5 py-0.5 rounded font-bold"
                                  [class.bg-emerald-100]="asset.estado === 'DISPONIBLE'"
                                  [class.text-emerald-700]="asset.estado === 'DISPONIBLE'"
                                  [class.bg-blue-100]="asset.estado === 'ENTREGADO'"
                                  [class.text-blue-700]="asset.estado === 'ENTREGADO'"
                                  [class.bg-amber-100]="asset.estado === 'ALISTAMIENTO' || asset.estado === 'RECIBIDO'"
                                  [class.text-amber-700]="asset.estado === 'ALISTAMIENTO' || asset.estado === 'RECIBIDO'"
                                  [class.bg-slate-100]="asset.estado !== 'DISPONIBLE' && asset.estado !== 'ENTREGADO' && asset.estado !== 'ALISTAMIENTO' && asset.estado !== 'RECIBIDO'"
                                  [class.text-slate-600]="asset.estado !== 'DISPONIBLE' && asset.estado !== 'ENTREGADO' && asset.estado !== 'ALISTAMIENTO' && asset.estado !== 'RECIBIDO'">
                              {{ asset.estado }}
                            </span>
                            <span class="text-[10px] bg-slate-100 text-slate-600 px-1 rounded">{{ asset.tipo_producto }}</span>
                          </div>
                        </div>
                      </div>
                      <div *ngIf="showCambioPorPeriphDropdown() && filteredCambioPeriphAssets().length === 0"
                           class="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-3 text-center text-xs text-slate-400 italic">
                        No se encontraron periféricos
                      </div>
                    </div>
                    <div class="col-span-2 md:col-span-5">
                      <input [(ngModel)]="newPeripheral.comentarios" class="w-full bg-slate-50 border border-slate-200 text-xs p-2 rounded outline-none focus:border-brand" placeholder="Comentarios / Observaciones">
                    </div>
                  </div>
                  <div class="flex justify-end mt-2">
                    <button class="bg-slate-800 text-white border-2 border-slate-800 px-5 py-2.5 rounded-lg font-bold text-xs hover:bg-slate-700 hover:border-slate-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center gap-1.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed" (click)="addManualPeripheral()" [disabled]="!newPeripheral.serial || !newPeripheral.tipo_producto || !newPeripheral.marca || !newPeripheral.modelo">
                      <mat-icon class="scale-90">add_circle</mat-icon> Agregar Periférico
                    </button>
                  </div>
                </div>

                <div class="border rounded-xl bg-white overflow-hidden shadow-sm" *ngIf="peripheralsList().length > 0">
                  <table class="w-full text-sm text-left">
                    <thead class="bg-slate-50">
                      <tr class="text-[10px] text-slate-500 uppercase tracking-wider">
                        <th class="px-3 py-2">Item</th>
                        <th class="px-3 py-2">Serial</th>
                        <th class="px-3 py-2">Tipo / Marca / Modelo</th>
                        <th class="px-3 py-2">Asociado a Ítem</th>
                        <th class="px-3 py-2">Obs.</th>
                        <th class="w-20 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      <tr *ngFor="let per of peripheralsList(); let i = index" class="hover:bg-slate-50">
                        <td class="px-3 py-2 font-bold text-slate-400">{{ per.item }}</td>
                        <td class="px-3 py-2 font-mono text-brand">{{ per.serial | uppercase }}</td>
                        <td class="px-3 py-2 text-xs">
                          <span class="font-bold">{{ per.tipo_producto || '-' }}</span><br>
                          {{ per.marca }} {{ per.modelo }}
                        </td>
                        <td class="px-3 py-2 text-xs text-slate-500 font-bold">
                          <span *ngIf="per.equipo_asociado" class="text-brand">Ítem #{{ getAssociatedItemText(per.equipo_asociado) }}</span>
                          <span *ngIf="!per.equipo_asociado && !per.es_cambio">-</span>
                          <span *ngIf="per.es_cambio" class="text-amber-600 bg-amber-50 px-1 rounded font-bold">Reemplaza Ítem: {{ per.cambio_por }}</span>
                          <span *ngIf="per.es_propio" class="ml-2 text-[10px] text-indigo-600 bg-indigo-50 px-1 rounded uppercase tracking-tighter">Propio</span>
                        </td>
                        <td class="px-3 py-2 text-xs italic">{{ per.comentarios || '-' }}</td>
                        <td class="px-3 py-2 text-right">
                          <div class="flex items-center justify-end gap-1">
                            <button (click)="editPeripheral(i)" class="p-1.5 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200" title="Editar"><mat-icon class="scale-90">edit</mat-icon></button>
                            <button (click)="removePeripheral(i)" class="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200" title="Eliminar"><mat-icon class="scale-90">delete_outline</mat-icon></button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <!-- PERIPHERALS SECTION END -->

              <div class="flex justify-between pt-6">
                <button class="bg-white text-[#FF6B00] border-2 border-[#FF6B00] px-6 py-2.5 rounded-xl font-bold hover:bg-orange-50 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center gap-2" (click)="prevStep()">
                  <mat-icon>arrow_back</mat-icon> Atrás
                </button>
                <button class="bg-[#FF6B00] text-white border-2 border-[#FF6B00] px-6 py-2.5 rounded-xl font-bold hover:bg-[#E65A00] hover:border-[#E65A00] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none" [disabled]="equipmentList().length === 0 && peripheralsList().length === 0" (click)="nextStep()">
                  Validar Equipos ({{ equipmentList().length + peripheralsList().length }}) <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </div>

            <!-- Step 4: Signatures -->
             <div *ngIf="step() === 4" class="space-y-8 py-10 max-w-2xl mx-auto">
               <div class="grid grid-cols-2 gap-8">
                 <app-signature-pad label="Entregador" (signatureChange)="entregadorFirma.set($event)"></app-signature-pad>
                 <app-signature-pad [label]="'Receptor (' + authService.currentUser()?.first_name + ')'" (signatureChange)="receptorFirma.set($event)"></app-signature-pad>
               </div>
               <div class="flex gap-5">
                 <button class="bg-white text-[#FF6B00] border-2 border-[#FF6B00] px-6 py-3 rounded-xl font-bold hover:bg-orange-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 flex-1" (click)="prevStep()">
                   <mat-icon>edit</mat-icon> Corregir
                 </button>
                 <button class="bg-[#10B981] text-white border-2 border-[#10B981] px-6 py-3 rounded-xl font-bold hover:bg-[#059669] hover:border-[#059669] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2 flex-1" [disabled]="!entregadorFirma() || (equipmentList().length === 0 && peripheralsList().length === 0) || isSaving()" (click)="finalizar()">
                   <div *ngIf="isSaving()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                   <mat-icon *ngIf="!isSaving()">task_alt</mat-icon>
                   {{ isSaving() ? 'Guardando...' : 'Certificar y Guardar' }}
                 </button>
               </div>
             </div>

          </div>
        </div>
      </div>
    </div>



    <!-- ── MODAL CREAR EQUIPO (ASOCIAR PERIFÉRICO / CAMBIO EQUIPO) ────────── -->
    <div *ngIf="showCreateEquipForm" class="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
        <!-- Header dinámico según modo -->
        <div class="p-6 text-white text-center" style="background: linear-gradient(135deg, #7c3aed, #4f46e5)">
          <div class="w-16 h-16 bg-white/20 rounded-2xl rotate-12 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <mat-icon class="scale-[1.8] -rotate-12">{{ popupMode === 'cambio' ? 'swap_horiz' : 'add_box' }}</mat-icon>
          </div>
          <h3 class="text-xl font-black mb-1">
            {{ popupMode === 'cambio' ? 'Crear Equipo a Reemplazar' : 'Crear Equipo en Recepción' }}
          </h3>
          <p class="text-violet-100 text-sm" *ngIf="popupMode === 'asociar'">
            El equipo asociado al ítem <strong>#{{ pendingPeripheral?.equipo_asociado }}</strong> no existe en inventario. Regístralo aquí para asociar el periférico.
          </p>
          <p class="text-violet-100 text-sm" *ngIf="popupMode === 'cambio'">
            El equipo <strong>"{{ searchCambioText || pendingAssetForCambio?.cambio_por }}"</strong> no existe en inventario. Regístralo como el equipo que será reemplazado.
          </p>
        </div>

        <!-- Aviso de comportamiento especial -->
        <div class="mx-6 mt-5 flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-xl p-3">
          <mat-icon class="text-violet-600 flex-shrink-0 mt-0.5 scale-90">info</mat-icon>
          <div class="text-xs text-violet-800 space-y-1">
            <p class="font-bold" *ngIf="popupMode === 'asociar'">⚡ Registro Directo — Sin Alistamiento</p>
            <p class="font-bold" *ngIf="popupMode === 'cambio'">🔄 Equipo de Cambio — Sin Alistamiento</p>
            <p *ngIf="popupMode === 'asociar'">Este equipo se creará con estado <strong>ENTREGADO</strong> directamente, omitiendo alistamiento. Quedará marcado como <em>"Recepción Directa"</em>.</p>
            <p *ngIf="popupMode === 'cambio'">Este equipo (el que será reemplazado) se registrará con estado <strong>ENTREGADO</strong>. Quedará marcado como <em>"Recepción Directa"</em> para su identificación.</p>
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
                <option value="">Tipo de equipo...</option>
                <option *ngFor="let tipo of filteredPopupEquipoTipos()" [value]="tipo.nombre">{{ tipo.nombre }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Marca *</label>
              <select [(ngModel)]="newEquipForAssociation.marca" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand">
                <option value="">Marca...</option>
                <option *ngFor="let marca of marcas()" [value]="marca">{{ marca }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modelo *</label>
              <input [(ngModel)]="newEquipForAssociation.modelo" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand transition-all" placeholder="Modelo">
            </div>
            <!-- Specs técnicos -->
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Procesador</label>
              <select [(ngModel)]="newEquipForAssociation.procesador" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand">
                <option value="">Procesador...</option>
                <option *ngFor="let p of procesadores()" [value]="p">{{ p }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Memoria RAM</label>
              <select [(ngModel)]="newEquipForAssociation.ram" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand">
                <option value="">RAM...</option>
                <option *ngFor="let r of ramList()" [value]="r">{{ r }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Disco</label>
              <select [(ngModel)]="newEquipForAssociation.disco" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand">
                <option value="">Disco...</option>
                <option *ngFor="let d of discoList()" [value]="d">{{ d }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Disco</label>
              <select [(ngModel)]="newEquipForAssociation.tipo_disco" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand">
                <option value="">Tipo de disco...</option>
                <option *ngFor="let td of tiposDisco()" [value]="td">{{ td }}</option>
              </select>
            </div>
            <!-- Ubicación -->
            <div class="col-span-2 space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ubicación</label>
              <select [(ngModel)]="newEquipForAssociation.ubicacion" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand">
                <option value="">Sin ubicación...</option>
                <option *ngFor="let ub of ubicaciones()" [value]="ub.path">{{ ub.path }}</option>
              </select>
            </div>
            <!-- Anotación -->
            <div class="col-span-2 space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Anotación / Motivo <span class="text-slate-300 normal-case font-normal">(opcional)</span></label>
              <input [(ngModel)]="newEquipForAssociation.anotacion_recepcion" 
                     class="w-full bg-violet-50 border border-violet-200 text-sm p-2.5 rounded-lg outline-none focus:border-violet-400 transition-all" 
                     [placeholder]="popupMode === 'cambio' ? 'Ej: Equipo previo no registrado en sistema...' : 'Ej: Equipo entregado directamente en visita...'">
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button (click)="cancelCreateEquip()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all">
              Cancelar
            </button>
            <button *ngIf="popupMode === 'cambio'" (click)="createEquipAndAssociate(true)" 
                    [disabled]="isCreatingEquip()"
                    class="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              <mat-icon class="scale-90" *ngIf="!isCreatingEquip()">save</mat-icon>
              Terminar Después
            </button>
            <button (click)="createEquipAndAssociate()" 
                    [disabled]="!newEquipForAssociation.serial || !newEquipForAssociation.marca || !newEquipForAssociation.modelo || isCreatingEquip()"
                    style="background: linear-gradient(135deg, #7c3aed, #4f46e5)"
                    class="flex-1 text-white py-3 rounded-xl font-bold shadow-lg shadow-violet-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90">
              <div *ngIf="isCreatingEquip()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <mat-icon class="scale-90" *ngIf="!isCreatingEquip()">{{ popupMode === 'cambio' ? 'swap_horiz' : 'add_box' }}</mat-icon>
              {{ isCreatingEquip() ? 'Guardando...' : (popupMode === 'cambio' ? 'Registrar y Continuar' : 'Crear y Entregar') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── MODAL CREAR PERIFÉRICO NO EXISTENTE (CAMBIO PERIFÉRICO) ────────── -->
    <div *ngIf="showCreatePeriphForm" class="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
        <!-- Header -->
        <div class="p-6 text-white text-center" style="background: linear-gradient(135deg, #0d9488, #059669)">
          <div class="w-16 h-16 bg-white/20 rounded-2xl rotate-12 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <mat-icon class="scale-[1.8] -rotate-12">devices_other</mat-icon>
          </div>
          <h3 class="text-xl font-black mb-1">Crear Periférico a Reemplazar</h3>
          <p class="text-teal-100 text-sm">
            El periférico <strong>"{{ searchCambioPeriphText || pendingAssetForCambio?.cambio_por }}"</strong> no existe en inventario. Regístralo como el periférico que será reemplazado.
          </p>
        </div>

        <!-- Aviso -->
        <div class="mx-6 mt-5 flex items-start gap-3 bg-teal-50 border border-teal-200 rounded-xl p-3">
          <mat-icon class="text-teal-600 flex-shrink-0 mt-0.5 scale-90">info</mat-icon>
          <div class="text-xs text-teal-800 space-y-1">
            <p class="font-bold">🔄 Periférico de Cambio — Sin Alistamiento</p>
            <p>Este periférico (el que será reemplazado) se registrará con estado <strong>ENTREGADO</strong>. Quedará marcado como <em>"Recepción Directa"</em> para su identificación.</p>
          </div>
        </div>

        <div class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nro Ítem</label>
              <input type="number" [(ngModel)]="newPeriphForCreation.item" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-teal-500 transition-all" placeholder="Nro Ítem">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serial *</label>
              <input [(ngModel)]="newPeriphForCreation.serial" style="text-transform: uppercase;" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-teal-500 transition-all" placeholder="Serial del periférico">
            </div>
            <div class="col-span-2 sm:col-span-1 space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Periférico</label>
              <select [(ngModel)]="newPeriphForCreation.tipo_producto" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-teal-500">
                <option value="">Tipo (Mouse, Teclado...)...</option>
                <option *ngFor="let tipo of tiposProductoPerifericoFull()" [value]="tipo.nombre">{{ tipo.nombre }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Marca *</label>
              <select [(ngModel)]="newPeriphForCreation.marca" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-teal-500">
                <option value="">Marca...</option>
                <option *ngFor="let marca of marcas()" [value]="marca">{{ marca }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modelo *</label>
              <input [(ngModel)]="newPeriphForCreation.modelo" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-teal-500 transition-all" placeholder="Modelo">
            </div>
            <!-- Anotación -->
            <div class="col-span-2 space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Anotación / Motivo <span class="text-slate-300 normal-case font-normal">(opcional)</span></label>
              <input [(ngModel)]="newPeriphForCreation.anotacion_recepcion" 
                     class="w-full bg-teal-50 border border-teal-200 text-sm p-2.5 rounded-lg outline-none focus:border-teal-400 transition-all" 
                     placeholder="Ej: Periférico previo no registrado en sistema...">
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button (click)="cancelCreatePeriph()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all">
              Cancelar
            </button>
            <button (click)="createPeriphAndAssociate(true)" 
                    [disabled]="isCreatingEquip()"
                    class="flex-1 bg-teal-900 hover:bg-teal-800 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              <mat-icon class="scale-90" *ngIf="!isCreatingEquip()">save</mat-icon>
              Terminar Después
            </button>
            <button (click)="createPeriphAndAssociate()" 
                    [disabled]="!newPeriphForCreation.serial || !newPeriphForCreation.marca || !newPeriphForCreation.modelo || isCreatingEquip()"
                    style="background: linear-gradient(135deg, #0d9488, #059669)"
                    class="flex-1 text-white py-3 rounded-xl font-bold shadow-lg shadow-teal-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90">
              <div *ngIf="isCreatingEquip()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <mat-icon class="scale-90" *ngIf="!isCreatingEquip()">swap_horiz</mat-icon>
              {{ isCreatingEquip() ? 'Guardando en sistema...' : 'Registrar Periférico y Continuar' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Overlay for OCR -->
    <div *ngIf="isOcrProcessing()" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div class="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
        <div class="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p class="font-semibold text-slate-800">Procesando Acta con AI...</p>
        <p class="text-sm text-slate-500">Extrayendo seriales y modelos...</p>
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

    <!-- Custom Reset Confirmation Modal -->
    <div *ngIf="showResetConfirm()" class="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6 transform animate-in zoom-in-95 duration-300">
        <div class="flex flex-col items-center text-center space-y-4">
          <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
            <mat-icon class="scale-150">warning_amber</mat-icon>
          </div>
          <div class="space-y-2">
            <h3 class="text-xl font-bold text-slate-800">¿Reiniciar Ingreso?</h3>
            <p class="text-sm text-slate-500 font-medium leading-relaxed">
              Esta acción borrará todos los datos capturados hasta el momento, incluyendo fotos, firmas y equipos registrados.
            </p>
          </div>
        </div>
        <div class="flex gap-3">
          <button (click)="showResetConfirm.set(false)" class="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-all">
            Cancelar
          </button>
          <button (click)="executeReset()" class="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 transition-all">
            Sí, Reiniciar
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL CREAR PROVEEDOR ────────── -->
    <div *ngIf="showCreateProveedor()" class="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
        <div class="p-6 text-white text-center" style="background: linear-gradient(135deg, #FF6B00, #E65A00)">
          <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <mat-icon class="scale-125">business</mat-icon>
          </div>
          <h3 class="text-lg font-bold">Crear Nuevo Proveedor</h3>
        </div>
        <div class="p-6 space-y-4">
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nombre del Proveedor *</label>
            <input [(ngModel)]="newProveedorNombre" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand transition-all" placeholder="Nombre Comercial">
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teléfono</label>
            <input [(ngModel)]="newProveedorTelefono" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand transition-all" placeholder="Ej: +57 312 345 6789">
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contacto</label>
            <input [(ngModel)]="newProveedorContacto" class="w-full bg-slate-50 border border-slate-200 text-sm p-2.5 rounded-lg outline-none focus:border-brand transition-all" placeholder="Nombre de contacto principal">
          </div>
          <div class="flex gap-3 pt-2">
            <button (click)="cerrarModalCrearProveedor()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition-all text-sm">
              Cancelar
            </button>
            <button (click)="crearProveedor()" 
                    [disabled]="!newProveedorNombre.trim()"
                    class="flex-1 bg-brand text-white py-2.5 rounded-xl font-bold shadow-lg shadow-orange-200 transition-all text-sm hover:bg-brand-dark disabled:opacity-50">
              Crear Proveedor
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class IngresoComponent implements OnInit {
  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;
  private fb = inject(FormBuilder);
  private storage = inject(StorageService);
  private ocr = inject(OcrService);
  private router = inject(Router);
  private api = inject(ApiService);
  authService = inject(AuthService);

  step = signal(1);
  biometricPhoto = signal('');
  receptorPhoto = signal('');
  equipmentList = signal<Asset[]>([]);
  peripheralsList = signal<Asset[]>([]);
  entregadorFirma = signal('');
  receptorFirma = signal('');
  isOcrProcessing = signal(false);
  isSaving = signal(false);
  isCreatingEquip = signal(false);
  showResetConfirm = signal(false);
  validationError = signal('');
  
  // Proveedores y entregadores signals
  proveedores = signal<any[]>([]);
  showCreateProveedor = signal(false);
  newProveedorNombre = '';
  newProveedorTelefono = '';
  newProveedorContacto = '';
  /** Entregador encontrado en el backend al autocomplete de cédula */
  entregadorEncontrado = signal<any | null>(null);
  
  // ── Search & Dropdown properties for "es_cambio" (equipos) & "equipo_asociado" ──
  showCambioPorDropdown = signal(false);
  searchCambioQuery = signal('');
  searchCambioText = '';

  // ── Search & Dropdown for "es_cambio" (periféricos) ──
  showCambioPorPeriphDropdown = signal(false);
  searchCambioPeriphQuery = signal('');
  searchCambioPeriphText = '';
  /** Flag: cuando el popup de cambio fue abierto desde un periférico (no desde un equipo principal) */
  pendingCambioIsPeripheral = false;

  showAsociarDropdown = signal(false);
  searchAsociarQuery = signal('');
  searchAsociarText = '';
  selectedAsociarAssetObj: any = null;

  filteredCambioAssets = computed(() => {
    const query = this.searchCambioQuery().toLowerCase().trim();
    const tiposFull = this.tiposProductoFull();
    const excludedStates = ['DADO_DE_BAJA', 'DEVUELTO', 'PENDIENTE_DEVOLUCION', 'EN_ESPERA_DEVOLUCION'];
    // Mostrar equipos (no periféricos) que no estén dados de baja ni devueltos
    const assets = this.storage.inventario().filter(a => {
      if (a.estado && excludedStates.includes(a.estado.toUpperCase())) return false;
      const prodType = a.tipo_producto;
      if (!prodType) return false;
      const tipoObj = tiposFull.find(t => t.nombre.toUpperCase() === prodType.toUpperCase());
      return tipoObj ? !tipoObj.es_periferico : true; // si tipo desconocido, incluir por defecto
    });
    if (!query) return assets.slice(0, 10);
    return assets.filter(a =>
      (a.serial?.toLowerCase().includes(query)) ||
      (a.item?.toString().includes(query)) ||
      (a.marca?.toLowerCase().includes(query)) ||
      (a.modelo?.toLowerCase().includes(query)) ||
      (a.tipo_producto?.toLowerCase().includes(query)) ||
      (a.estado?.toLowerCase().includes(query))
    ).slice(0, 30);
  });

  /** Ítems periféricos que no estén dados de baja ni devueltos — para el campo de cambio del formulario de periféricos */
  filteredCambioPeriphAssets = computed(() => {
    const query = this.searchCambioPeriphQuery().toLowerCase().trim();
    const tiposFull = this.tiposProductoFull();
    const excludedStates = ['DADO_DE_BAJA', 'DEVUELTO', 'PENDIENTE_DEVOLUCION', 'EN_ESPERA_DEVOLUCION'];
    // Mostrar periféricos que no estén dados de baja ni devueltos
    const assets = this.storage.inventario().filter(a => {
      if (a.estado && excludedStates.includes(a.estado.toUpperCase())) return false;
      const prodType = a.tipo_producto;
      if (!prodType) return false;
      const tipoObj = tiposFull.find(t => t.nombre.toUpperCase() === prodType.toUpperCase());
      return tipoObj ? tipoObj.es_periferico : false; // si tipo desconocido, excluir
    });
    if (!query) return assets.slice(0, 10);
    return assets.filter(a =>
      (a.serial?.toLowerCase().includes(query)) ||
      (a.item?.toString().includes(query)) ||
      (a.marca?.toLowerCase().includes(query)) ||
      (a.modelo?.toLowerCase().includes(query)) ||
      (a.tipo_producto?.toLowerCase().includes(query)) ||
      (a.estado?.toLowerCase().includes(query))
    ).slice(0, 30);
  });

  /** Tipos de equipo (no periférico) — para popup de crear equipo */
  filteredPopupEquipoTipos = computed(() => {
    return this.tiposProductoFull().filter(t => !t.es_periferico);
  });

  /** Tipos periférico completos — para popup de crear periférico */
  tiposProductoPerifericoFull = computed(() => {
    return this.tiposProductoFull().filter(t => t.es_periferico);
  });

  filteredAsociarAssets = computed(() => {
    const query = this.searchAsociarQuery().toLowerCase().trim();
    const tipos = this.tiposProductoFull();
    const excludedStates = ['DADO_DE_BAJA', 'DEVUELTO', 'PENDIENTE_DEVOLUCION', 'EN_ESPERA_DEVOLUCION'];
    const localAssets = this.equipmentList().map(a => ({
      ...a,
      isLocal: true
    }));
    const dbAssets = this.storage.inventario().map(a => ({
      ...a,
      isLocal: false
    }));
    
    // Filter: only computer equipment (non-peripheral) and NOT DADO_DE_BAJA or DEVUELTO
    const allowedAssets = [...localAssets, ...dbAssets].filter(a => {
      const tipoObj = tipos.find(t => t.nombre.toUpperCase() === a.tipo_producto?.toUpperCase());
      const isNotPeriph = tipoObj ? !tipoObj.es_periferico : true;
      const isNotExcluded = !a.estado || !excludedStates.includes(a.estado.toUpperCase());
      return isNotPeriph && isNotExcluded;
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

  onCambioFocusOut() {
    setTimeout(() => this.showCambioPorDropdown.set(false), 200);
  }

  onCambioPeriphFocusOut() {
    setTimeout(() => this.showCambioPorPeriphDropdown.set(false), 200);
  }

  onAsociarFocusOut() {
    setTimeout(() => this.showAsociarDropdown.set(false), 200);
  }

  onCambioQueryChange(event: any) {
    this.searchCambioQuery.set(event.target.value);
    this.newAsset.cambio_por = event.target.value;
  }

  onCambioPeriphQueryChange(event: any) {
    this.searchCambioPeriphQuery.set(event.target.value);
    this.newPeripheral.cambio_por = event.target.value;
  }

  selectCambioAsset(asset: any) {
    this.newAsset.cambio_por = asset.item ? asset.item.toString() : (asset.serial || '');
    this.searchCambioText = asset.item
      ? `${asset.item} - ${asset.marca} ${asset.modelo} (${asset.serial})`
      : `${asset.marca} ${asset.modelo} (${asset.serial})`;
    this.searchCambioQuery.set('');
    this.showCambioPorDropdown.set(false);
  }

  selectCambioPeriphAsset(asset: any) {
    this.newPeripheral.cambio_por = asset.item ? asset.item.toString() : (asset.serial || '');
    this.searchCambioPeriphText = asset.item
      ? `${asset.item} - ${asset.marca} ${asset.modelo} (${asset.serial})`
      : `${asset.marca} ${asset.modelo} (${asset.serial})`;
    this.searchCambioPeriphQuery.set('');
    this.showCambioPorPeriphDropdown.set(false);

    // Auto-fetch and associate the old peripheral's computer if it exists and is eligible
    if (asset.equipo_asociado) {
      const associatedComp = this.storage.inventario().find(a => 
        a._backendId === asset.equipo_asociado || 
        (a as any).id === asset.equipo_asociado || 
        a.item === asset.equipo_asociado
      );
      if (associatedComp) {
        const tipoObj = this.tiposProductoFull().find(t => t.nombre.toUpperCase() === associatedComp.tipo_producto?.toUpperCase());
        const isNotPeriph = tipoObj ? !tipoObj.es_periferico : true;
        const isNotDecom = associatedComp.estado !== 'DADO_DE_BAJA';
        
        if (isNotPeriph && isNotDecom) {
          this.selectedAsociarAssetObj = associatedComp;
          this.newPeripheral.equipo_asociado = associatedComp._backendId || (associatedComp as any).id || associatedComp.item;
          this.newPeripheral.ubicacion = associatedComp.ubicacion;
          this.searchAsociarText = `${associatedComp.item} - ${associatedComp.marca} ${associatedComp.modelo} (${associatedComp.serial})`;
        }
      }
    }
  }

  onAsociarQueryChange(event: any) {
    this.searchAsociarQuery.set(event.target.value);
    this.newPeripheral.equipo_asociado = event.target.value ? Number(event.target.value) : undefined;
  }

  selectAsociarAsset(asset: any) {
    const tipoObj = this.tiposProductoFull().find(t => t.nombre.toUpperCase() === asset.tipo_producto?.toUpperCase());
    if (tipoObj?.es_periferico) {
      this.validationError.set('Un periférico solo puede asociarse a un equipo de cómputo, no a otro periférico.');
      return;
    }
    if (asset.estado === 'DADO_DE_BAJA') {
      this.validationError.set('No se puede asociar el periférico porque el equipo seleccionado está dado de baja.');
      return;
    }
    if (asset.estado === 'DEVUELTO' || asset.estado === 'PENDIENTE_DEVOLUCION' || asset.estado === 'EN_ESPERA_DEVOLUCION') {
      this.validationError.set(`No se puede asociar el periférico porque el equipo seleccionado está en estado de devolución (${asset.estado}).`);
      return;
    }
    this.selectedAsociarAssetObj = asset;
    this.newPeripheral.equipo_asociado = asset._backendId || asset.id || asset.item;
    this.newPeripheral.ubicacion = asset.ubicacion;
    this.searchAsociarText = `${asset.item} - ${asset.marca} ${asset.modelo} (${asset.serial})`;
    this.searchAsociarQuery.set('');
    this.showAsociarDropdown.set(false);
  }

  pendingPeripheral: Asset | null = null;
  pendingAssetForCambio: Asset | null = null;
  popupMode: 'asociar' | 'cambio' = 'asociar';
  showCreateEquipForm = false;
  newEquipForAssociation: Asset = { item: undefined, serial: '', marca: '', modelo: '', tipo_producto: '', procesador: '', ram: '', disco: '', tipo_disco: '', ubicacion: '', anotacion_recepcion: '' };

  /** Popup separado para crear periférico no existente (cambio de periférico) */
  showCreatePeriphForm = false;
  newPeriphForCreation: Asset = { item: undefined, serial: '', marca: '', modelo: '', tipo_producto: '', ubicacion: '', anotacion_recepcion: '' };
  recepcionFecha = signal(new Date().toLocaleString());

  tiposProductoFull = signal<any[]>([]);
  /** Tipos de producto que NO son periféricos (equipos de cómputo principales) */
  tiposProductoEquipo = signal<string[]>([]);
  /** Tipos de producto que SÍ son periféricos (mouse, teclado, cable, etc.) */
  tiposProductoPeriferico = signal<string[]>([]);
  tiposDisco = signal<string[]>([]);
  procesadores = signal<string[]>([]);
  ramList = signal<string[]>([]);
  discoList = signal<string[]>([]);
  marcas = signal<string[]>([]);
  ubicaciones = signal<any[]>([]);

  ngOnInit() {
    this.storage.syncAllFromApi().then(() => {
      this.cargarProveedores();
    });
  }

  cargarProveedores() {
    const tipos = this.storage.tiposProducto();
    if (tipos && tipos.length > 0) {
      this.tiposProductoFull.set(tipos);
      this.tiposProductoEquipo.set(tipos.filter((r: any) => !r.es_periferico).map((r: any) => r.nombre));
      this.tiposProductoPeriferico.set(tipos.filter((r: any) => r.es_periferico).map((r: any) => r.nombre));
    }
    const tDiscos = this.storage.tiposDisco();
    if (tDiscos && tDiscos.length > 0) this.tiposDisco.set(tDiscos.map((r: any) => r.nombre));

    const marcas = this.storage.marcas();
    if (marcas && marcas.length > 0) this.marcas.set(marcas.map((r: any) => r.nombre));

    this.ubicaciones.set(this.storage.ubicaciones());

    const procs = this.storage.procesadores();
    if (procs && procs.length > 0) this.procesadores.set(procs.map((r: any) => r.nombre));

    const rams = this.storage.ram();
    if (rams && rams.length > 0) this.ramList.set(rams.map((r: any) => r.nombre));

    const discos = this.storage.discos();
    if (discos && discos.length > 0) this.discoList.set(discos.map((r: any) => r.nombre));

    this.proveedores.set(this.storage.proveedores());
  }

  abrirModalCrearProveedor() {
    this.newProveedorNombre = '';
    this.newProveedorTelefono = '';
    this.newProveedorContacto = '';
    this.showCreateProveedor.set(true);
  }

  cerrarModalCrearProveedor() {
    this.showCreateProveedor.set(false);
  }

  crearProveedor() {
    if (!this.newProveedorNombre.trim()) return;
    this.api.createProveedor({
      nombre: this.newProveedorNombre.trim(),
      telefono: this.newProveedorTelefono.trim() || undefined,
      contacto: this.newProveedorContacto.trim() || undefined
    }).subscribe({
      next: (nuevoProv) => {
        this.cargarProveedores();
        this.entregadorForm.patchValue({ proveedor: String(nuevoProv.id) });
        this.showCreateProveedor.set(false);
      },
      error: (err) => {
        this.validationError.set('No se pudo crear el proveedor. Verifique que el nombre no esté duplicado.');
      }
    });
  }

  obtenerProveedorNombreSeleccionado(): string {
    const pId = this.entregadorForm.get('proveedor')?.value;
    if (!pId) return '';
    const prov = this.proveedores().find(p => p.id === Number(pId));
    return prov ? prov.nombre : '';
  }

  entregadorForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    cedula: ['', [Validators.required, Validators.maxLength(10), Validators.pattern('^[0-9]*$')]],
    proveedor: ['', Validators.required]
  });

  private cedulaDebounceTimeout: any = null;

  onCedulaInput(event: any) {
    const input = event.target as HTMLInputElement;
    // Remove non-numeric characters
    input.value = input.value.replace(/[^0-9]/g, '');
    const cedulaValue = input.value;
    this.entregadorForm.patchValue({ cedula: cedulaValue }, { emitEvent: false });
    this.entregadorEncontrado.set(null);

    if (this.cedulaDebounceTimeout) {
      clearTimeout(this.cedulaDebounceTimeout);
    }

    // Autocomplete: si hay ≥5 dígitos buscar en el endpoint de entregadores (debounced)
    if (cedulaValue.length >= 5) {
      this.cedulaDebounceTimeout = setTimeout(() => {
        this.api.getEntregadorByCedula(cedulaValue).subscribe({
          next: (response: any) => {
            const results = Array.isArray(response) ? response : response.results;
            if (results && results.length > 0) {
              const found = results[0] as any;
              this.entregadorEncontrado.set(found);
              
              // Handle if provider is nested object or primitive
              const provId = typeof found.proveedor === 'object' && found.proveedor !== null 
                ? found.proveedor.id 
                : found.proveedor;

              this.entregadorForm.patchValue({
                nombre: found.nombre,
                proveedor: provId != null ? String(provId) : ''
              });
            }
          },
          error: () => { /* Silencioso: no bloquear si falla */ }
        });
      }, 300);
    }
  }

  resetProcess() {
    this.showResetConfirm.set(true);
  }

  executeReset() {
    this.showResetConfirm.set(false);
    this.showCreateEquipForm = false;
    this.showCreatePeriphForm = false;
    this.step.set(1);
    this.biometricPhoto.set('');
    this.receptorPhoto.set('');
    this.equipmentList.set([]);
    this.peripheralsList.set([]);
    this.entregadorFirma.set('');
    this.receptorFirma.set('');
    this.entregadorForm.reset();
    this.searchCambioText = '';
    this.searchCambioQuery.set('');
    this.searchAsociarText = '';
    this.searchAsociarQuery.set('');
    this.searchCambioPeriphText = '';
    this.searchCambioPeriphQuery.set('');
    this.selectedAsociarAssetObj = null;
    this.pendingCambioIsPeripheral = false;
    this.pendingAssetForCambio = null;
    this.pendingPeripheral = null;
    this.newEquipForAssociation = { serial: '', marca: '', modelo: '', tipo_producto: '', procesador: '', ram: '', disco: '', tipo_disco: '', ubicacion: '', anotacion_recepcion: '' };
    this.newPeriphForCreation = { serial: '', marca: '', modelo: '', tipo_producto: '', ubicacion: '', anotacion_recepcion: '' };

    this.newAsset = {
      item: 1,
      tipo_producto: '',
      marca: '',
      modelo: '',
      procesador: '',
      disco: '',
      tipo_disco: '',
      ram: '',
      serial: '',
      es_cambio: false,
      cambio_por: '',
      es_propio: false,
      ubicacion: '',
      comentarios: ''
    };

    this.newPeripheral = {
      item: 1,
      tipo_producto: '',
      marca: '',
      modelo: '',
      serial: '',
      es_propio: false,
      ubicacion: '',
      comentarios: '',
      equipo_asociado: undefined
    };
    this.scrollToTop();
  }

  scrollToTop() {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (this.scrollContainer?.nativeElement) {
        this.scrollContainer.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  }

  nextStep() {
    if (this.step() < 4) {
      this.step.update(s => s + 1);
      this.scrollToTop();
    }
  }

  prevStep() {
    if (this.step() > 1) {
      this.step.update(s => s - 1);
      this.scrollToTop();
    }
  }

  setPhoto(dataUrl: string, type: 'entregador' | 'receptor' = 'entregador') {
    if (type === 'entregador') {
      this.biometricPhoto.set(dataUrl);
    } else {
      this.receptorPhoto.set(dataUrl);
      setTimeout(() => {
        if (this.scrollContainer?.nativeElement) {
          this.scrollContainer.nativeElement.scrollTo({ top: this.scrollContainer.nativeElement.scrollHeight, behavior: 'smooth' });
        }
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }

  newAsset: Asset = {
    item: 1,
    tipo_producto: '',
    marca: '',
    modelo: '',
    procesador: '',
    disco: '',
    tipo_disco: '',
    ram: '',
    serial: '',
    es_cambio: false,
    cambio_por: '',
    es_propio: false,
    ubicacion: '',
    comentarios: ''
  };

  newPeripheral: Asset = {
    item: 1,
    tipo_producto: '',
    marca: '',
    modelo: '',
    serial: '',
    es_cambio: false,
    cambio_por: '',
    es_propio: false,
    ubicacion: '',
    comentarios: '',
    equipo_asociado: undefined
  };

  addManualAsset() {
    if (this.newAsset.serial) {
      this.newAsset.serial = this.newAsset.serial.trim().toUpperCase();
    }
    if (this.newAsset.cambio_por) {
      this.newAsset.cambio_por = this.newAsset.cambio_por.trim().toUpperCase();
    }
    const itemNum = this.newAsset.item ? Number(this.newAsset.item) : null;
    const selectedTipo = this.newAsset.tipo_producto;

    if (itemNum && selectedTipo) {
      const tipoObj = this.tiposProductoFull().find(t => t.nombre === selectedTipo);
      if (tipoObj && tipoObj.item_unico) {
        const inLocalEquip = this.equipmentList().some(item => Number(item.item) === itemNum);
        const inLocalPeriph = this.peripheralsList().some(item => Number(item.item) === itemNum);
        const inDb = this.storage.inventario().some(item => Number(item.item) === itemNum);

        if (inLocalEquip || inLocalPeriph || inDb) {
          this.validationError.set(`El número de ítem '${itemNum}' ya existe en el sistema y debe ser único para la categoría '${selectedTipo}'.`);
          return;
        }
      }
    }

    // ── Validar cambio_por: si el equipo a reemplazar no existe, abrir popup ──
    if (this.newAsset.es_cambio && this.newAsset.cambio_por) {
      const cambioVal = this.newAsset.cambio_por.trim();
      const inInventario = this.storage.inventario().find(a =>
        a.item?.toString() === cambioVal ||
        a.serial?.toLowerCase() === cambioVal.toLowerCase()
      );
      const inLocal = this.equipmentList().find(a =>
        a.item?.toString() === cambioVal ||
        a.serial?.toLowerCase() === cambioVal.toLowerCase()
      );
      const found = inInventario || inLocal;

      if (found) {
        const excludedStates = ['DADO_DE_BAJA', 'DEVUELTO', 'PENDIENTE_DEVOLUCION', 'EN_ESPERA_DEVOLUCION'];
        if (found.estado && excludedStates.includes(found.estado.toUpperCase())) {
          this.validationError.set(
            `El equipo seleccionado para reemplazo ('${found.serial || found.item}') tiene estado '${found.estado}' y no se encuentra disponible para cambio.`
          );
          return;
        }
        // Validar que el equipo encontrado NO sea un periférico
        const tipoObj = this.tiposProductoFull().find(t => t.nombre === (found as any).tipo_producto);
        if (tipoObj?.es_periferico) {
          this.validationError.set(
            `El ítem seleccionado ('${(found as any).tipo_producto}') es un periférico y no puede ser reemplazado por un equipo de cómputo. Los equipos solo pueden reemplazar otros equipos.`
          );
          return;
        }
      } else {
        // El equipo a reemplazar no existe → crear vía popup
        this.pendingAssetForCambio = {
          ...this.newAsset,
          item: this.newAsset.item || (this.equipmentList().length + 1)
        };
        
        const isNumeric = /^\d+$/.test(cambioVal);
        this.newEquipForAssociation = {
          item: isNumeric ? Number(cambioVal) : undefined,
          serial: isNumeric ? '' : cambioVal,
          marca: '',
          modelo: '',
          tipo_producto: '',
          ubicacion: '',
          anotacion_recepcion: ''
        };
        this.popupMode = 'cambio';
        this.showCreateEquipForm = true;
        return;
      }
    }

    this._commitAsset(this.newAsset);
  }

  /** Agrega el equipo principal a la lista y resetea el formulario */
  private _commitAsset(asset: Asset) {
    this.equipmentList.update(list => [...list, {
      ...asset,
      item: asset.item || (list.length + 1)
    }]);

    const nuevoTipo = asset.tipo_producto;
    if (nuevoTipo) {
      // Si el tipo ya existe en los catálogos full, no agregar dinámicamente
      // Solo actualizar los signals de visualización si no está
      const esPerifericoNuevo = this.tiposProductoFull().find(t => t.nombre === nuevoTipo)?.es_periferico ?? false;
      if (esPerifericoNuevo) {
        if (!this.tiposProductoPeriferico().includes(nuevoTipo)) {
          this.tiposProductoPeriferico.update(t => [...t, nuevoTipo]);
        }
      } else {
        if (!this.tiposProductoEquipo().includes(nuevoTipo)) {
          this.tiposProductoEquipo.update(t => [...t, nuevoTipo]);
        }
      }
    }
    const nuevaMarca = asset.marca;
    if (nuevaMarca && !this.marcas().includes(nuevaMarca)) {
      this.marcas.update(m => [...m, nuevaMarca]);
    }
    const nuevoTipoDisco = asset.tipo_disco;
    if (nuevoTipoDisco && !this.tiposDisco().includes(nuevoTipoDisco)) {
      this.tiposDisco.update(m => [...m, nuevoTipoDisco]);
    }
    this._resetAssetForm();
  }

  private _resetAssetForm() {
    this.newAsset = {
      item: this.equipmentList().length + 1,
      tipo_producto: '',
      marca: '',
      modelo: '',
      procesador: '',
      disco: '',
      tipo_disco: '',
      ram: '',
      serial: '',
      es_cambio: false,
      cambio_por: '',
      es_propio: false,
      ubicacion: '',
      comentarios: ''
    };
    this.searchCambioText = '';
    this.searchCambioQuery.set('');
  }

  removeAsset(index: number) {
    this.equipmentList.update(list => list.filter((_, i) => i !== index));
  }

  editAsset(index: number) {
    const assetToEdit = this.equipmentList()[index];
    this.newAsset = { ...assetToEdit };
    if (assetToEdit.es_cambio && assetToEdit.cambio_por) {
      const match = this.storage.inventario().find(a => a.item === Number(assetToEdit.cambio_por));
      if (match) {
        this.searchCambioText = `${match.item} - ${match.marca} ${match.modelo} (${match.serial})`;
      } else {
        this.searchCambioText = assetToEdit.cambio_por.toString();
      }
    } else {
      this.searchCambioText = '';
    }
    this.removeAsset(index);
  }

  addManualPeripheral() {
    if (this.newPeripheral.serial) {
      this.newPeripheral.serial = this.newPeripheral.serial.trim().toUpperCase();
    }
    if (this.newPeripheral.cambio_por) {
      this.newPeripheral.cambio_por = this.newPeripheral.cambio_por.trim().toUpperCase();
    }
    const itemNum = this.newPeripheral.item ? Number(this.newPeripheral.item) : null;
    const selectedTipo = this.newPeripheral.tipo_producto;

    if (itemNum && selectedTipo) {
      const tipoObj = this.tiposProductoFull().find(t => t.nombre === selectedTipo);
      if (tipoObj && tipoObj.item_unico) {
        const inLocalEquip = this.equipmentList().some(item => Number(item.item) === itemNum);
        const inLocalPeriph = this.peripheralsList().some(item => Number(item.item) === itemNum);
        const inDb = this.storage.inventario().some(item => Number(item.item) === itemNum);

        if (inLocalEquip || inLocalPeriph || inDb) {
          this.validationError.set(`El número de ítem '${itemNum}' ya existe en el sistema y debe ser único para la categoría '${selectedTipo}'.`);
          return;
        }
      }
    }

    // ── Validar asociación antes de agregar ──
    const equipAsociado = this.newPeripheral.equipo_asociado ? Number(this.newPeripheral.equipo_asociado) : null;
    if (equipAsociado) {
      const isDbId = this.storage.inventario().some(a => a._backendId === equipAsociado || (a as any).id === equipAsociado);
      
      if (isDbId) {
        const dbAsset = this.storage.inventario().find(a => a._backendId === equipAsociado || (a as any).id === equipAsociado);
        if (dbAsset) {
          const tipoObj = this.tiposProductoFull().find(t => t.nombre.toUpperCase() === dbAsset.tipo_producto?.toUpperCase());
          if (tipoObj?.es_periferico) {
            this.validationError.set('Un periférico solo puede asociarse a un equipo de cómputo, no a otro periférico.');
            return;
          }
          if (dbAsset.estado === 'DADO_DE_BAJA') {
            this.validationError.set('No se puede asociar el periférico porque el equipo seleccionado está dado de baja.');
            return;
          }
          if (dbAsset.estado === 'DEVUELTO' || dbAsset.estado === 'PENDIENTE_DEVOLUCION' || dbAsset.estado === 'EN_ESPERA_DEVOLUCION') {
            this.validationError.set(`No se puede asociar el periférico porque el equipo seleccionado está en estado de devolución (${dbAsset.estado}).`);
            return;
          }
          this.newPeripheral.ubicacion = dbAsset.ubicacion;
        }
      } else {
        if (this.selectedAsociarAssetObj && Number(this.selectedAsociarAssetObj.item) === equipAsociado) {
          const tipoObj = this.tiposProductoFull().find(t => t.nombre.toUpperCase() === this.selectedAsociarAssetObj.tipo_producto?.toUpperCase());
          if (tipoObj?.es_periferico) {
            this.validationError.set('Un periférico solo puede asociarse a un equipo de cómputo, no a otro periférico.');
            return;
          }
          if (this.selectedAsociarAssetObj.estado === 'DADO_DE_BAJA') {
            this.validationError.set('No se puede asociar el periférico porque el equipo seleccionado está dado de baja.');
            return;
          }
          if (this.selectedAsociarAssetObj.estado === 'DEVUELTO' || this.selectedAsociarAssetObj.estado === 'PENDIENTE_DEVOLUCION' || this.selectedAsociarAssetObj.estado === 'EN_ESPERA_DEVOLUCION') {
            this.validationError.set(`No se puede asociar el periférico porque el equipo seleccionado está en estado de devolución (${this.selectedAsociarAssetObj.estado}).`);
            return;
          }
          this.newPeripheral.ubicacion = this.selectedAsociarAssetObj.ubicacion;
          const dbId = this.selectedAsociarAssetObj._backendId || this.selectedAsociarAssetObj.id;
          if (dbId) {
            this.newPeripheral.equipo_asociado = dbId;
          } else {
            this.newPeripheral.equipo_asociado = this.selectedAsociarAssetObj.item;
          }
        } else {
          // Buscar en inventario existente y en la lista local de equipos
          const inInventario = this.storage.inventario().filter(a => a.item === equipAsociado);
          const inLocalEquip = this.equipmentList().filter(a => Number(a.item) === equipAsociado);
          const allMatches = [...inInventario, ...inLocalEquip];

          if (allMatches.length === 0) {
            // No existe → mostrar formulario de creación
            this.pendingPeripheral = { ...this.newPeripheral, item: this.newPeripheral.item || (this.peripheralsList().length + 1) };
            this.newEquipForAssociation = { item: equipAsociado, serial: '', marca: '', modelo: '', tipo_producto: '', ubicacion: '', anotacion_recepcion: '' };
            this.popupMode = 'asociar';
            this.showCreateEquipForm = true;
            return;
          } else {
            const selected = allMatches[0] as any;
            const tipoObj = this.tiposProductoFull().find(t => t.nombre.toUpperCase() === selected.tipo_producto?.toUpperCase());
            if (tipoObj?.es_periferico) {
              this.validationError.set('Un periférico solo puede asociarse a un equipo de cómputo, no a otro periférico.');
              return;
            }
            if (selected.estado === 'DADO_DE_BAJA') {
              this.validationError.set('No se puede asociar el periférico porque el equipo seleccionado está dado de baja.');
              return;
            }
            if (selected.estado === 'DEVUELTO' || selected.estado === 'PENDIENTE_DEVOLUCION' || selected.estado === 'EN_ESPERA_DEVOLUCION') {
              this.validationError.set(`No se puede asociar el periférico porque el equipo seleccionado está en estado de devolución (${selected.estado}).`);
              return;
            }
            this.newPeripheral.ubicacion = selected.ubicacion;
            const dbId = selected._backendId || selected.id;
            if (dbId) {
              this.newPeripheral.equipo_asociado = dbId;
            } else {
              this.newPeripheral.equipo_asociado = selected.item;
            }
          }
        }
      }
    }

    // ── Validar cambio_por del periférico ──
    if (this.newPeripheral.es_cambio && this.newPeripheral.cambio_por) {
      const cambioVal = this.newPeripheral.cambio_por.trim();
      const inInventario = this.storage.inventario().find(a =>
        a.item?.toString() === cambioVal ||
        a.serial?.toLowerCase() === cambioVal.toLowerCase()
      );
      const inLocalPeriph = this.peripheralsList().find(a =>
        a.item?.toString() === cambioVal ||
        a.serial?.toLowerCase() === cambioVal.toLowerCase()
      );
      const inLocalEquip = this.equipmentList().find(a =>
        a.item?.toString() === cambioVal ||
        a.serial?.toLowerCase() === cambioVal.toLowerCase()
      );
      const found = inInventario || inLocalPeriph || inLocalEquip;

      if (found) {
        const excludedStates = ['DADO_DE_BAJA', 'DEVUELTO', 'PENDIENTE_DEVOLUCION', 'EN_ESPERA_DEVOLUCION'];
        if (found.estado && excludedStates.includes(found.estado.toUpperCase())) {
          this.validationError.set(
            `El periférico seleccionado para reemplazo ('${found.serial || found.item}') tiene estado '${found.estado}' y no se encuentra disponible para cambio.`
          );
          return;
        }
        // Validar que el ítem encontrado SÍ sea un periférico
        const tipoObj = this.tiposProductoFull().find(t => t.nombre === (found as any).tipo_producto);
        if (tipoObj && !tipoObj.es_periferico) {
          this.validationError.set(
            `El ítem seleccionado ('${(found as any).tipo_producto}') es un equipo de cómputo y no puede ser reemplazado por un periférico. Los periféricos solo pueden reemplazar otros periféricos.`
          );
          return;
        }
      } else {
        // El periférico a reemplazar no existe → abrir popup específico de periférico
        this.pendingAssetForCambio = {
          ...this.newPeripheral,
          item: this.newPeripheral.item || (this.peripheralsList().length + 1)
        };
        const isNumeric = /^\d+$/.test(cambioVal);
        this.newPeriphForCreation = {
          item: isNumeric ? Number(cambioVal) : undefined,
          serial: isNumeric ? '' : cambioVal,
          marca: '',
          modelo: '',
          tipo_producto: '',
          ubicacion: '',
          anotacion_recepcion: ''
        };
        this.pendingCambioIsPeripheral = true;
        this.showCreatePeriphForm = true;
        return;
      }
    }

    this._commitPeripheral(this.newPeripheral);
  }

  /** Agrega el periférico a la lista y resetea el formulario */
  private _commitPeripheral(peripheral: Asset) {
    this.peripheralsList.update(list => [...list, {
      ...peripheral,
      item: peripheral.item || (list.length + 1)
    }]);

    const nuevoTipo = peripheral.tipo_producto;
    if (nuevoTipo) {
      const esPerifericoNuevo = this.tiposProductoFull().find(t => t.nombre === nuevoTipo)?.es_periferico ?? true;
      if (esPerifericoNuevo) {
        if (!this.tiposProductoPeriferico().includes(nuevoTipo)) {
          this.tiposProductoPeriferico.update(t => [...t, nuevoTipo]);
        }
      } else {
        if (!this.tiposProductoEquipo().includes(nuevoTipo)) {
          this.tiposProductoEquipo.update(t => [...t, nuevoTipo]);
        }
      }
    }
    const nuevaMarca = peripheral.marca;
    if (nuevaMarca && !this.marcas().includes(nuevaMarca)) {
      this.marcas.update(m => [...m, nuevaMarca]);
    }

    this._resetPeripheralForm();
  }

  private _resetPeripheralForm() {
    this.newPeripheral = {
      item: this.peripheralsList().length + 1,
      tipo_producto: '',
      marca: '',
      modelo: '',
      serial: '',
      es_cambio: false,
      cambio_por: '',
      es_propio: false,
      ubicacion: '',
      comentarios: '',
      equipo_asociado: undefined
    };
    this.pendingPeripheral = null;
    this.searchAsociarText = '';
    this.searchAsociarQuery.set('');
    this.selectedAsociarAssetObj = null;
    this.searchCambioPeriphText = '';
    this.searchCambioPeriphQuery.set('');
  }



  // ── Formulario de creación de equipo (usado para asociar periféricos Y para cambios) ──
  // El equipo creado se guarda DIRECTAMENTE en el backend como ENTREGADO,
  // sin pasar por el flujo de ingreso normal (que es solo para equipos nuevos).
  async createEquipAndAssociate(finishLater: boolean = false) {
    if (finishLater) {
      // If saving for later, provide a temporary unique serial if they didn't provide one
      if (!this.newEquipForAssociation.serial || this.newEquipForAssociation.serial.trim() === '') {
        this.newEquipForAssociation.serial = 'POR-DEFINIR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      }
    }

    if (this.newEquipForAssociation.serial) {
      this.newEquipForAssociation.serial = this.newEquipForAssociation.serial.trim().toUpperCase();
    }
    
    if (!finishLater) {
      if (!this.newEquipForAssociation.serial || !this.newEquipForAssociation.marca || !this.newEquipForAssociation.modelo) return;
    }

    // Validar tipo de reemplazo en modo cambio
    if (this.popupMode === 'cambio' && this.pendingAssetForCambio) {
      const replacingTipo = this.pendingAssetForCambio.tipo_producto;
      const replacingTipoObj = this.tiposProductoFull().find(t => t.nombre === replacingTipo);
      const replacedTipo = this.newEquipForAssociation.tipo_producto;
      const replacedTipoObj = this.tiposProductoFull().find(t => t.nombre === replacedTipo);

      if (replacingTipoObj && replacedTipoObj) {
        const replacingIsPeripheral = replacingTipoObj.es_periferico;
        const replacedIsPeripheral = replacedTipoObj.es_periferico;

        if (!replacingIsPeripheral && replacedIsPeripheral) {
          this.validationError.set("Un equipo no puede reemplazar a un periférico.");
          return;
        }
        if (replacingIsPeripheral && !replacedIsPeripheral) {
          this.validationError.set("Un periférico no puede reemplazar a un equipo principal.");
          return;
        }
      }
    }

    const anotacion = this.newEquipForAssociation.anotacion_recepcion ||
      (this.popupMode === 'cambio'
        ? 'Equipo de referencia de cambio — registrado directamente como ENTREGADO'
        : 'Registrado directamente como ENTREGADO — sin pasar por ingreso');

    // Si el valor ingresado es numérico, lo usamos como número de ítem, de lo contrario usamos el asignado
    let itemNumberToUse: number | undefined = undefined;
    if (this.newEquipForAssociation.item) {
      itemNumberToUse = Number(this.newEquipForAssociation.item);
    }

    // Payload para crear el equipo directamente en el backend
    const payload: InventarioItemPayload = {
      item: itemNumberToUse || undefined,
      serial: this.newEquipForAssociation.serial,
      marca: this.newEquipForAssociation.marca || undefined,
      modelo: this.newEquipForAssociation.modelo || 'POR DEFINIR',
      tipo_producto: this.newEquipForAssociation.tipo_producto || undefined,
      procesador: this.newEquipForAssociation.procesador || undefined,
      ram: this.newEquipForAssociation.ram || undefined,
      disco: this.newEquipForAssociation.disco || undefined,
      tipo_disco: this.newEquipForAssociation.tipo_disco || undefined,
      ubicacion: this.newEquipForAssociation.ubicacion || '',
      estado: 'ENTREGADO',
      comentarios: anotacion,
      creado_automaticamente: true
    };

    this.isCreatingEquip.set(true);
    let success = false;

    try {
      const createdItem = await firstValueFrom(this.api.createInventarioItem(payload));
      const backendId: number = (createdItem as any).id;
      const backendItem: number = (createdItem as any).item;

      if (this.popupMode === 'cambio') {
        // Modo cambio: actualizar cambio_por con el ítem real del backend
        if (!this.pendingAssetForCambio) { this.isCreatingEquip.set(false); return; }
        const assetToCommit: Asset = {
          ...this.pendingAssetForCambio,
          cambio_por: backendItem?.toString() || this.pendingAssetForCambio.cambio_por
        };
        if (this.pendingCambioIsPeripheral) {
          this._commitPeripheral(assetToCommit);
        } else {
          this._commitAsset(assetToCommit);
        }
        this.pendingAssetForCambio = null;
        this.pendingCambioIsPeripheral = false;
      } else {
        // Modo asociar: vincular el periférico al ID del backend recién creado
        if (!this.pendingPeripheral) { this.isCreatingEquip.set(false); return; }
        this.pendingPeripheral.equipo_asociado = backendId;
        this.pendingPeripheral.ubicacion = this.newEquipForAssociation.ubicacion;
        this._commitPeripheral(this.pendingPeripheral);
      }

      // Recargar inventario para reflejar el nuevo equipo
      this.storage.loadInventarioFromApi();
      success = true;

    } catch (error: any) {
      this.validationError.set(
        'No se pudo registrar el equipo en el sistema. Verifique que el serial no esté duplicado e intente nuevamente.'
      );
    } finally {
      this.isCreatingEquip.set(false);
    }

    if (success) {
      this.showCreateEquipForm = false;
      this.newEquipForAssociation = { serial: '', marca: '', modelo: '', tipo_producto: '', procesador: '', ram: '', disco: '', tipo_disco: '', ubicacion: '', anotacion_recepcion: '' };
      this.popupMode = 'asociar';
    }
  }

  cancelCreateEquip() {
    this.showCreateEquipForm = false;
    this.newEquipForAssociation = { serial: '', marca: '', modelo: '', tipo_producto: '', procesador: '', ram: '', disco: '', tipo_disco: '', ubicacion: '', anotacion_recepcion: '' };
    this.pendingPeripheral = null;
    this.pendingAssetForCambio = null;
    this.pendingCambioIsPeripheral = false;
    this.popupMode = 'asociar';
  }

  cancelCreatePeriph() {
    this.showCreatePeriphForm = false;
    this.newPeriphForCreation = { serial: '', marca: '', modelo: '', tipo_producto: '', ubicacion: '', anotacion_recepcion: '' };
    this.pendingAssetForCambio = null;
    this.pendingCambioIsPeripheral = false;
  }

  async createPeriphAndAssociate(finishLater: boolean = false) {
    if (finishLater) {
      // If saving for later, provide a temporary unique serial if they didn't provide one
      if (!this.newPeriphForCreation.serial || this.newPeriphForCreation.serial.trim() === '') {
        this.newPeriphForCreation.serial = 'POR-DEFINIR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      }
    }

    if (this.newPeriphForCreation.serial) {
      this.newPeriphForCreation.serial = this.newPeriphForCreation.serial.trim().toUpperCase();
    }
    
    if (!finishLater) {
      if (!this.newPeriphForCreation.serial || !this.newPeriphForCreation.marca || !this.newPeriphForCreation.modelo) return;
    }
    if (!this.pendingAssetForCambio) return;

    const anotacion = this.newPeriphForCreation.anotacion_recepcion ||
      'Periférico de referencia de cambio — registrado directamente como ENTREGADO';

    const payload: InventarioItemPayload = {
      item: this.newPeriphForCreation.item ? Number(this.newPeriphForCreation.item) : undefined,
      serial: this.newPeriphForCreation.serial,
      marca: this.newPeriphForCreation.marca || undefined,
      modelo: this.newPeriphForCreation.modelo || 'POR DEFINIR',
      tipo_producto: this.newPeriphForCreation.tipo_producto || undefined,
      ubicacion: this.newPeriphForCreation.ubicacion || '',
      estado: 'ENTREGADO',
      comentarios: anotacion,
      creado_automaticamente: true
    };

    this.isCreatingEquip.set(true);
    let success = false;

    try {
      const createdItem = await firstValueFrom(this.api.createInventarioItem(payload));
      const backendItem: number = (createdItem as any).item;

      const assetToCommit: Asset = {
        ...this.pendingAssetForCambio,
        cambio_por: backendItem?.toString() || this.pendingAssetForCambio.cambio_por
      };
      this._commitPeripheral(assetToCommit);
      this.pendingAssetForCambio = null;
      this.pendingCambioIsPeripheral = false;

      this.storage.loadInventarioFromApi();
      success = true;
    } catch (error: any) {
      this.validationError.set(
        'No se pudo registrar el periférico en el sistema. Verifique que el serial no esté duplicado e intente nuevamente.'
      );
    } finally {
      this.isCreatingEquip.set(false);
    }

    if (success) {
      this.showCreatePeriphForm = false;
      this.newPeriphForCreation = { serial: '', marca: '', modelo: '', tipo_producto: '', ubicacion: '', anotacion_recepcion: '' };
    }
  }

  removePeripheral(index: number) {
    this.peripheralsList.update(list => list.filter((_, i) => i !== index));
  }

  editPeripheral(index: number) {
    const peripheralToEdit = this.peripheralsList()[index];
    this.newPeripheral = { ...peripheralToEdit };
    // Restaurar campo es_cambio
    if (peripheralToEdit.es_cambio && peripheralToEdit.cambio_por) {
      const match = this.storage.inventario().find(a => a.item === Number(peripheralToEdit.cambio_por));
      if (match) {
        this.searchCambioPeriphText = `${match.item} - ${match.marca} ${match.modelo} (${match.serial})`;
      } else {
        this.searchCambioPeriphText = peripheralToEdit.cambio_por.toString();
      }
    } else {
      this.searchCambioPeriphText = '';
    }
    // Restaurar campo equipo_asociado
    if (peripheralToEdit.equipo_asociado) {
      const dbAsset = this.storage.inventario().find(a => a._backendId === peripheralToEdit.equipo_asociado || (a as any).id === peripheralToEdit.equipo_asociado);
      const localAsset = this.equipmentList().find(a => Number(a.item) === peripheralToEdit.equipo_asociado);
      const found = dbAsset || localAsset;
      if (found) {
        this.searchAsociarText = `${found.item} - ${found.marca} ${found.modelo} (${found.serial})`;
        this.selectedAsociarAssetObj = found;
      } else {
        this.searchAsociarText = peripheralToEdit.equipo_asociado.toString();
        this.selectedAsociarAssetObj = null;
      }
    } else {
      this.searchAsociarText = '';
      this.selectedAsociarAssetObj = null;
    }
    this.removePeripheral(index);
  }

  getAssociatedItemText(associatedValue: number | undefined): string | number {
    if (!associatedValue) return '-';
    // Buscar si corresponde al ID de base de datos de algún equipo en inventario
    const dbAsset = this.storage.inventario().find(a => a._backendId === associatedValue || (a as any).id === associatedValue);
    if (dbAsset) {
      return dbAsset.item || '-';
    }
    // Buscar si es un número de ítem local temporal de la recepción
    const localAsset = this.equipmentList().find(a => Number(a.item) === associatedValue);
    if (localAsset) {
      return localAsset.item || '-';
    }
    return associatedValue;
  }

  async handleOcrUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isOcrProcessing.set(true);
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      const base64 = e.target.result;
      const extracted = await this.ocr.extractAssetsFromImage(base64);
      this.equipmentList.update(list => [...list, ...extracted]);
      this.isOcrProcessing.set(false);
    };
    reader.readAsDataURL(file);
  }

  async finalizar() {
    const formData = this.entregadorForm.value;
    this.isSaving.set(true);

    const todosEquipos = [...this.equipmentList(), ...this.peripheralsList()];
    for (const eq of todosEquipos) {
      const itemNum = eq.item ? Number(eq.item) : null;
      const selectedTipo = eq.tipo_producto;
      if (itemNum && selectedTipo) {
        const tipoObj = this.tiposProductoFull().find(t => t.nombre === selectedTipo);
        if (tipoObj && tipoObj.item_unico) {
          const duplicatesInList = todosEquipos.filter(x => Number(x.item) === itemNum);
          if (duplicatesInList.length > 1) {
            this.validationError.set(`El número de ítem '${itemNum}' está duplicado en la lista actual para la categoría '${selectedTipo}'.`);
            this.isSaving.set(false);
            return;
          }
          const inDb = this.storage.inventario().some(item => Number(item.item) === itemNum);
          if (inDb) {
            this.validationError.set(`El número de ítem '${itemNum}' ya está registrado en la base de datos para la categoría '${selectedTipo}'.`);
            this.isSaving.set(false);
            return;
          }
        }
      }

      // Validar que equipo no reemplace periférico y viceversa
      if (eq.es_cambio && eq.cambio_por) {
        const cambioVal = eq.cambio_por.trim().toUpperCase();
        // Buscar el equipo a reemplazar en inventario o en la misma lista
        const found = this.storage.inventario().find(a =>
          a.item?.toString() === cambioVal ||
          a.serial?.toUpperCase() === cambioVal
        ) || todosEquipos.find(a =>
          a.item?.toString() === cambioVal ||
          a.serial?.toUpperCase() === cambioVal
        );

        if (found) {
          const currentTipo = eq.tipo_producto;
          const currentTipoObj = this.tiposProductoFull().find(t => t.nombre === currentTipo);
          const replacedTipo = (found as any).tipo_producto;
          const replacedTipoObj = this.tiposProductoFull().find(t => t.nombre === replacedTipo);

          if (currentTipoObj && replacedTipoObj) {
            const currentIsPeripheral = currentTipoObj.es_periferico;
            const replacedIsPeripheral = replacedTipoObj.es_periferico;

            if (!currentIsPeripheral && replacedIsPeripheral) {
              this.validationError.set(
                `Error: El equipo con serial '${eq.serial}' no puede reemplazar al periférico con serial '${(found as any).serial || found.item}' (${replacedTipo}).`
              );
              this.isSaving.set(false);
              return;
            }
            if (currentIsPeripheral && !replacedIsPeripheral) {
              this.validationError.set(
                `Error: El periférico con serial '${eq.serial}' no puede reemplazar al equipo principal con serial '${(found as any).serial || found.item}' (${replacedTipo}).`
              );
              this.isSaving.set(false);
              return;
            }
          }
        }
      }
    }

    const provId = formData.proveedor ? Number(formData.proveedor) : undefined;

    const recepcion: Recepcion = {
      id: generateUUID(),
      fecha: new Date().toISOString(),
      // Si ya encontramos el entregador por cédula, usamos su ID directamente
      entregador_id: this.entregadorEncontrado()?.id ?? undefined,
      proveedor: provId,
      entregador: {
        nombre: formData.nombre,
        cedula: formData.cedula,
        empresa: '',  // No se usa: la empresa va en Entregador.proveedor (FK)
        foto: this.biometricPhoto(),
        firma: this.entregadorFirma()
      },
      receptor: {
        nombre: `${this.authService.currentUser()?.first_name || ''} ${this.authService.currentUser()?.last_name || ''}`.trim(),
        firma: this.receptorFirma(),
        foto: this.receptorPhoto()
      },
      equipos: [...this.equipmentList(), ...this.peripheralsList()]
    };

    await this.storage.addRecepcion(recepcion);
    this.isSaving.set(false);
    this.router.navigate(['/dashboard']);
  }
}
