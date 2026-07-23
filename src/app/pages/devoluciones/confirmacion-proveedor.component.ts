import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage';
import { ActaDevolucionComponent } from '../../components/reports/acta-devolucion/acta-devolucion';

@Component({
  selector: 'app-confirmacion-proveedor',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, FormsModule, ActaDevolucionComponent],
  template: `
    <!-- Modales fuera del contenedor animado para evitar problemas con position: fixed y CSS transforms -->
    <!-- ── MODAL DE CONFIRMACIÓN CUSTOM PREMIUM ────────── -->
    <div *ngIf="confirmingDevId() !== null" 
         class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" (click)="cancelConfirm()"></div>
      
      <div class="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        <!-- Header Modal con gradiente moderno -->
        <div class="bg-gradient-to-r from-[#FF6B00] to-orange-500 p-8 text-white text-center flex-shrink-0 relative">
          <div class="w-16 h-16 bg-white/20 rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <mat-icon class="scale-[1.8] -rotate-12">assignment_turned_in</mat-icon>
          </div>
          <h3 class="text-2xl font-black mb-1">Confirmar Recepción</h3>
          <p class="text-orange-100 text-xs">Lote #{{ confirmingDevId() }}</p>
        </div>

        <!-- Formulario del Modal -->
        <div class="p-8 space-y-6 overflow-y-auto flex-1">
          
          <!-- Comentario de Origen (Visualización destacada) -->
          <div *ngIf="getConfirmingDev()?.comentarios" 
               class="bg-amber-50/50 border border-amber-200/70 text-slate-700 text-xs rounded-2xl p-4 italic flex items-start gap-2.5">
            <mat-icon class="text-amber-500 scale-75 mt-0.5 flex-shrink-0">info</mat-icon>
            <div>
              <strong class="text-amber-800 font-bold block mb-0.5 uppercase tracking-wide text-[9px]">Motivo de la Devolución de Origen:</strong>
              "{{ getConfirmingDev()?.comentarios }}"
            </div>
          </div>

          <!-- Selector de Tipo de Recepción con tarjetas interactivas -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Todo Conforme -->
            <button (click)="tipoConfirmacion.set('TODO_BIEN')"
                    type="button"
                    class="flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all text-center group outline-none"
                    [class.border-emerald-500]="tipoConfirmacion() === 'TODO_BIEN'"
                    [class.bg-emerald-50/20]="tipoConfirmacion() === 'TODO_BIEN'"
                    [class.border-slate-100]="tipoConfirmacion() !== 'TODO_BIEN'"
                    [class.hover:border-slate-200]="tipoConfirmacion() !== 'TODO_BIEN'">
              <div class="w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
                   [class.bg-emerald-500]="tipoConfirmacion() === 'TODO_BIEN'"
                   [class.text-white]="tipoConfirmacion() === 'TODO_BIEN'"
                   [class.bg-slate-50]="tipoConfirmacion() !== 'TODO_BIEN'"
                   [class.text-slate-400]="tipoConfirmacion() !== 'TODO_BIEN'">
                <mat-icon class="scale-90">check_circle</mat-icon>
              </div>
              <div>
                <p class="text-xs font-bold" [class.text-emerald-800]="tipoConfirmacion() === 'TODO_BIEN'" [class.text-slate-700]="tipoConfirmacion() !== 'TODO_BIEN'">Todo Conforme</p>
                <p class="text-[9px] text-slate-400 mt-0.5">En perfecto estado</p>
              </div>
            </button>

            <!-- Con Novedades -->
            <button (click)="tipoConfirmacion.set('CON_NOVEDAD')"
                    type="button"
                    class="flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all text-center group outline-none"
                    [class.border-red-500]="tipoConfirmacion() === 'CON_NOVEDAD'"
                    [class.bg-red-50/20]="tipoConfirmacion() === 'CON_NOVEDAD'"
                    [class.border-slate-100]="tipoConfirmacion() !== 'CON_NOVEDAD'"
                    [class.hover:border-slate-200]="tipoConfirmacion() !== 'CON_NOVEDAD'">
              <div class="w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
                   [class.bg-red-500]="tipoConfirmacion() === 'CON_NOVEDAD'"
                   [class.text-white]="tipoConfirmacion() === 'CON_NOVEDAD'"
                   [class.bg-slate-50]="tipoConfirmacion() !== 'CON_NOVEDAD'"
                   [class.text-slate-400]="tipoConfirmacion() !== 'CON_NOVEDAD'">
                <mat-icon class="scale-90">warning</mat-icon>
              </div>
              <div>
                <p class="text-xs font-bold" [class.text-red-800]="tipoConfirmacion() === 'CON_NOVEDAD'" [class.text-slate-700]="tipoConfirmacion() !== 'CON_NOVEDAD'">Con Novedades</p>
                <p class="text-[9px] text-slate-400 mt-0.5">Equipos rotos o fallas</p>
              </div>
            </button>
          </div>

          <!-- Campos específicos de Novedades -->
          <div *ngIf="tipoConfirmacion() === 'CON_NOVEDAD'" class="space-y-4 animate-in fade-in duration-300">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Detalle de la Novedad *</label>
              <textarea [(ngModel)]="mensajeNovedad" 
                        rows="6" 
                        class="w-full px-4 py-3 bg-red-50/10 border border-red-200 rounded-2xl outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all text-sm text-slate-700 font-medium"
                        placeholder="Especifica claramente cuál es la novedad (ej: pantalla rota, carcasa quebrada, etc.)..."></textarea>
            </div>

            <!-- Input Dropzone de documento interactivo -->
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Documento / Evidencia de Novedad *</label>
              <div class="relative group">
                <!-- Sin archivo cargado -->
                <div *ngIf="!documentoNovedad()" 
                     class="border-2 border-dashed border-red-200 rounded-3xl p-6 text-center bg-red-50/5 hover:bg-red-50/10 hover:border-red-400 transition-all flex flex-col items-center justify-center">
                  <input type="file" id="doc-novedad-file" class="hidden" accept="image/*,application/pdf" (change)="capturarDocumento($event)">
                  <label for="doc-novedad-file" class="cursor-pointer w-full flex flex-col items-center">
                    <div class="w-10 h-10 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-2.5">
                      <mat-icon>cloud_upload</mat-icon>
                    </div>
                    <p class="text-xs font-bold text-slate-700 mb-0.5">Haz clic para adjuntar archivo</p>
                    <p class="text-[9px] text-slate-400">Imágenes (PNG, JPG) o PDF hasta 5MB</p>
                  </label>
                </div>
                <!-- Archivo cargado -->
                <div *ngIf="documentoNovedad() as doc" 
                     class="border border-emerald-200 bg-emerald-50/10 rounded-3xl p-3 flex items-center justify-between gap-3 animate-in zoom-in-95 duration-200">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-white rounded-xl border flex items-center justify-center text-emerald-500 shadow-sm overflow-hidden flex-shrink-0">
                      <img *ngIf="doc.startsWith('data:image/'); else pdfIcon" [src]="doc" class="w-full h-full object-cover">
                      <ng-template #pdfIcon>
                        <mat-icon class="scale-110">insert_drive_file</mat-icon>
                      </ng-template>
                    </div>
                    <div>
                      <p class="text-xs font-bold text-slate-800">Archivo Adjunto</p>
                      <p class="text-[9px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-0.5">
                        <mat-icon class="scale-50 w-3 h-3 flex items-center justify-center">check_circle</mat-icon> Evidencia lista
                      </p>
                    </div>
                  </div>
                  <button (click)="documentoNovedad.set('')" 
                          class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" 
                          title="Eliminar evidencia">
                    <mat-icon class="scale-90">delete</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Comentarios Adicionales -->
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Observaciones Proveedor (Opcional)</label>
            <textarea [(ngModel)]="confirmComment" 
                      rows="5" 
                      class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#FF6B00] focus:ring-4 focus:ring-brand/10 transition-all text-sm text-slate-700"
                      placeholder="Escribe comentarios o aclaraciones adicionales..."></textarea>
          </div>
        </div>

        <!-- Botones de Acción (Fijos en el footer del modal) -->
        <div class="p-8 border-t border-slate-100 bg-slate-50 flex-shrink-0 flex flex-col gap-3">
          <!-- Descarga y visualización del Acta antes de confirmar -->
          <div class="flex gap-2">
            <button (click)="viewingActa.set(getConfirmingDev())" 
                    class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 outline-none border border-slate-200">
              <mat-icon class="scale-90">visibility</mat-icon>
              Ver Acta
            </button>
            <button (click)="downloadActa(getConfirmingDev())" 
                    class="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 outline-none">
              <mat-icon class="scale-90">download</mat-icon>
              Descargar PDF
            </button>
          </div>
          <button (click)="executeConfirmation()" 
                  [disabled]="!isValid()"
                  class="w-full bg-[#FF6B00] hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 outline-none">
            <mat-icon>verified</mat-icon>
            Confirmar Recepción de Lote
          </button>
          <button (click)="cancelConfirm()" 
                  class="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-4 rounded-2xl font-bold transition-all outline-none">
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Notificación de Éxito con opción de descargar acta -->
    <div *ngIf="showSuccess()" 
         class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
      <div class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
        <mat-icon class="scale-75">check</mat-icon>
      </div>
      <div>
        <p class="text-sm font-bold">Lote #{{ lastConfirmedDev()?.id }} Confirmado</p>
        <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">El inventario ha sido actualizado</p>
      </div>
      <button (click)="viewingActa.set(lastConfirmedDev())"
              class="ml-2 flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap flex-shrink-0">
        <mat-icon class="scale-75">download</mat-icon>
        Descargar Acta
      </button>
    </div>

    <!-- ── MODAL DEL ACTA OFICIAL (OTRO LUGAR) ────────── -->
    <div *ngIf="viewingActa() as dev" 
         class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white rounded-[2rem] shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto relative animate-in zoom-in-95 duration-300">
         <app-acta-devolucion [devolucion]="dev" (close)="viewingActa.set(null)"></app-acta-devolucion>
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

    <!-- Contenido Principal Animado -->
    <div class="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500 pb-16">
      <!-- Encabezado de la Página -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-3xl font-black tracking-tight text-slate-800">Confirmación de Devoluciones</h2>
          <p class="text-slate-500 mt-1">Portal de proveedor para certificar y verificar el estado de los equipos retornados.</p>
        </div>
      </div>

      <!-- Tarjeta Principal de Devoluciones Pendientes -->
      <div class="bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100 p-8 space-y-8">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 class="text-xl font-bold text-slate-800">Lotes Pendientes de Validación</h3>
            <p class="text-xs text-slate-400 font-medium">Revisa el contenido físico de los lotes antes de incorporarlos a tu custodia.</p>
          </div>
          <div class="flex items-center gap-2 text-brand bg-orange-50 border border-orange-100 px-4 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider">
            <mat-icon class="scale-75">pending_actions</mat-icon>
            {{ pendingDevoluciones().length }} Lotes Pendientes
          </div>
        </div>

        <div class="space-y-8">
          <!-- Bucle de Lotes -->
          <div *ngFor="let dev of pendingDevoluciones()" 
               class="border border-slate-100 rounded-[2rem] p-6 hover:shadow-2xl hover:border-brand/20 transition-all bg-white relative overflow-hidden group shadow-md shadow-slate-50">
             
             <!-- Línea de acento color gradiente lateral -->
             <div class="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-[#FF6B00] to-orange-400"></div>

             <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div class="flex items-center gap-4">
                   <div class="w-12 h-12 rounded-2xl bg-orange-50 text-brand flex items-center justify-center shadow-inner">
                      <mat-icon class="scale-110">inventory_2</mat-icon>
                   </div>
                   <div>
                      <p class="text-[10px] font-black text-brand uppercase tracking-widest">Lote de Recepción</p>
                      <h4 class="text-lg font-black text-slate-800">Lote #{{ dev.id }}</h4>
                      <p class="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                        <mat-icon class="scale-[0.6] w-3.5 h-3.5 flex items-center justify-center text-slate-300">schedule</mat-icon> 
                        {{ dev.fecha_creacion | date:'medium' }}
                      </p>
                   </div>
                </div>
                
                <div class="flex items-center gap-3 ml-auto">
                   <button (click)="viewingActa.set(dev)" 
                           class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2"
                           title="Ver e imprimir el acta">
                      <mat-icon class="scale-90">visibility</mat-icon>
                      Ver Acta
                   </button>
                   <button (click)="downloadActa(dev)" 
                           class="bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2"
                           title="Descargar acta en PDF">
                      <mat-icon class="scale-90">download</mat-icon>
                      Descargar Acta
                   </button>
                   <button (click)="confirmReturn(dev.id)" 
                           class="bg-[#FF6B00] hover:bg-orange-600 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2">
                      <mat-icon class="scale-90">verified</mat-icon>
                      Confirmar Recepción
                   </button>
                </div>
             </div>
             
             <!-- Comentario general de la devolución -->
             <div *ngIf="dev.comentarios" class="bg-amber-50/40 border border-amber-100/60 text-slate-700 text-xs rounded-2xl p-4 mb-5 italic flex items-start gap-2.5">
                <mat-icon class="text-amber-500 scale-75 mt-0.5 flex-shrink-0">info</mat-icon>
                <div>
                   <strong class="text-amber-800 font-black block mb-0.5 uppercase tracking-wide text-[9px]">Comentarios Generales del Lote:</strong> 
                   "{{ dev.comentarios }}"
                </div>
             </div>
             
             <!-- Grilla de equipos en lugar de tabla antigua -->
             <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Equipos Incluidos ({{ dev.items.length }})</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div *ngFor="let item of dev.items" 
                        class="bg-slate-50 hover:bg-slate-100/60 border border-slate-100 rounded-2xl p-4 transition-colors flex items-center justify-between gap-4">
                      <div class="flex items-center gap-3">
                         <div class="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200/50 flex items-center justify-center text-slate-400">
                            <mat-icon class="scale-90">computer</mat-icon>
                         </div>
                         <div>
                            <p class="font-bold text-slate-800 text-sm leading-tight">{{ item.marca }} {{ item.modelo }}</p>
                            <p class="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{{ item.tipo_producto || 'Equipo' }}</p>
                            <p class="font-mono text-xs text-[#FF6B00] font-black mt-1 bg-orange-50 px-2 py-0.5 rounded-lg w-fit">{{ item.serial }}</p>
                         </div>
                      </div>
                      <div *ngIf="item.comentario_devolucion" class="max-w-[180px] text-right">
                         <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Reporte Técnico</p>
                         <p class="text-xs text-slate-500 italic truncate" [title]="item.comentario_devolucion">"{{ item.comentario_devolucion }}"</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="pendingDevoluciones().length === 0" 
               class="py-16 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/20">
             <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
               <mat-icon class="scale-125">assignment_turned_in</mat-icon>
             </div>
             <p class="text-lg font-bold text-slate-700">No hay lotes pendientes</p>
             <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Todos los lotes de devolución se encuentran confirmados y en custodia.</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ConfirmacionProveedorComponent implements OnInit {
  private storage = inject(StorageService);

  pendingDevoluciones = computed(() => 
    this.storage.devoluciones().filter(d => d.estado === 'APROBADA')
  );

  confirmingDevId = signal<number | null>(null);
  confirmComment = '';
  showSuccess = signal(false);
  
  // Visualización de Acta
  viewingActa = signal<any | null>(null);

  // Descarga directa de Acta (sin modal visible)
  downloadingActa = signal<any | null>(null);

  // Último lote confirmado (para descargar acta)
  lastConfirmedDev = signal<any | null>(null);

  // Estados de Novedades
  tipoConfirmacion = signal<'TODO_BIEN' | 'CON_NOVEDAD'>('TODO_BIEN');
  mensajeNovedad = '';
  documentoNovedad = signal<string>('');

  ngOnInit() {
    this.storage.loadDevolucionesFromApi();
  }

  getConfirmingDev() {
    const id = this.confirmingDevId();
    if (id === null) return null;
    return this.storage.devoluciones().find(d => d.id === id) || null;
  }

  confirmReturn(id: number) {
    this.confirmingDevId.set(id);
    this.confirmComment = '';
    this.tipoConfirmacion.set('TODO_BIEN');
    this.mensajeNovedad = '';
    this.documentoNovedad.set('');
  }

  cancelConfirm() {
    this.confirmingDevId.set(null);
    this.confirmComment = '';
    this.tipoConfirmacion.set('TODO_BIEN');
    this.mensajeNovedad = '';
    this.documentoNovedad.set('');
  }

  capturarDocumento(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => { 
      this.documentoNovedad.set(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  isValid(): boolean {
    if (this.tipoConfirmacion() === 'TODO_BIEN') {
      return true;
    }
    // Si es con novedades, requiere mensaje y documento
    return !!this.mensajeNovedad.trim() && !!this.documentoNovedad();
  }

  async executeConfirmation() {
    const id = this.confirmingDevId();
    if (id === null || !this.isValid()) return;

    // Guardar referencia del lote antes de confirmar (para ofrecer descarga del acta)
    const devParaActa = this.getConfirmingDev();

    const novedades = this.tipoConfirmacion() === 'CON_NOVEDAD' ? {
      tiene_novedad: true,
      mensaje_novedad: this.mensajeNovedad,
      documento_novedad: this.documentoNovedad()
    } : {
      tiene_novedad: false
    };

    await this.storage.confirmDevolucion(id, this.confirmComment, novedades);
    this.lastConfirmedDev.set(devParaActa);
    this.cancelConfirm();
    this.showSuccess.set(true);
    setTimeout(() => this.showSuccess.set(false), 6000);
  }

  /**
   * Descarga el acta de devolución de un lote directamente como PDF
   * sin abrir el visor del acta en pantalla.
   */
  downloadActa(dev: any) {
    if (!dev) return;
    this.downloadingActa.set(dev);
    // El componente app-acta-devolucion con autoDownload=true dispara
    // downloadAsPdf() automáticamente al renderizarse.
    // Limpiamos después de 3 segundos para dar tiempo al iframe de generar el PDF.
    setTimeout(() => this.downloadingActa.set(null), 3000);
  }
}
