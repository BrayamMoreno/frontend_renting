import { Component, input, output, inject, LOCALE_ID, AfterViewInit } from '@angular/core';
import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { MatIconModule } from '@angular/material/icon';
import { Devolucion } from '../../../models/app-state';
import { AuthService } from '../../../services/auth.service';

registerLocaleData(localeEs, 'es');

@Component({
  selector: 'app-acta-devolucion',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  providers: [DatePipe],
  template: `
    <div id="print-area" class="acta-container">
      <!-- Header Table -->
      <table class="header-table">
        <tr>
          <td rowspan="3" class="header-logo-cell">
            <img src="Logo-devolucion.svg" alt="Logo Devolución" class="header-logo">
          </td>
          <td rowspan="3" class="header-title-cell">
            <div class="header-doc-title">ACTA DE DEVOLUCIÓN DE EQUIPOS D47G</div>
            <div class="header-page-number">Página 1 de 1</div>
          </td>
          <td class="header-meta-cell">SI-R-02</td>
        </tr>
        <tr>
          <td class="header-meta-cell">Versión 02</td>
        </tr>
        <tr>
          <td class="header-meta-cell">2017-03-02</td>
        </tr>
      </table>

      <!-- Info -->
      <div class="info-section">
        <p>BOGOTÁ D.C</p>
        <p>{{ todayFormatted }}</p>
      </div>

      <!-- Table -->
      <table class="data-table">
        <thead>
          <tr>
            <th>PLACA</th>
            <th>TIPO</th>
            <th>MARCA</th>
            <th>DISCO</th>
            <th>RAM</th>
            <th>SERIAL</th>
            <th>SEDE</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of devolucion()?.items">
            <td>{{ item.item || 'N/A' }}</td>
            <td>{{ item.tipo_producto || 'N/A' }}</td>
            <td>{{ item.marca }} {{ item.modelo }}</td>
            <td>{{ item.disco }} {{ item.tipo_disco }}</td>
            <td>{{ item.ram }}</td>
            <td>{{ item.serial }}</td>
            <td>{{ item.ubicacion || 'Central' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- General Comments Section -->
      <div class="comments-section" *ngIf="devolucion()?.comentarios">
        <h3>Observaciones Generales de la Devolución:</h3>
        <div class="comment-item" style="font-size: 12px; font-weight: normal; margin-bottom: 10px;">
          {{ devolucion()?.comentarios }}
        </div>
      </div>

      <!-- Comments Section -->
      <div class="comments-section" *ngIf="hasComments()">
        <h3>Observaciones y Estado de Equipos:</h3>
        <div class="comment-item" *ngFor="let item of itemsWithComments()">
          <strong>Item #{{ item.item || item.serial }}:</strong> {{ item.comentario_devolucion }}
        </div>
      </div>

      <!-- Evidence Photos -->
      <div class="photos-section" *ngIf="devolucion()?.foto_receptor || devolucion()?.foto_entregador || devolucion()?.foto_alistador || devolucion()?.foto_persona_devolucion">
        <h3>Evidencia Fotográfica:</h3>
        <div class="photos-grid">
          <div class="photo-box" *ngIf="devolucion()?.foto_persona_devolucion">
            <p>QUIEN ENTREGA (DEVOLUCIÓN):</p>
            <img [src]="devolucion()?.foto_persona_devolucion" alt="Foto Entregador">
          </div>
          <div class="photo-box" *ngIf="devolucion()?.foto_receptor">
            <p>RECEPTOR:</p>
            <img [src]="devolucion()?.foto_receptor" alt="Receptor">
          </div>
          <div class="photo-box" *ngIf="devolucion()?.foto_entregador">
            <p>ENTREGADOR INGRESO:</p>
            <img [src]="devolucion()?.foto_entregador" alt="Entregador">
          </div>
          <div class="photo-box" *ngIf="devolucion()?.foto_alistador">
            <p>ALISTADOR:</p>
            <img [src]="devolucion()?.foto_alistador" alt="Alistador">
          </div>
        </div>
      </div>

      <!-- Footer / Signatures -->
      <div class="signatures">
        <div class="signature-box">
          <p>FIRMA QUIEN ENTREGA (DEVOLUCIÓN):</p>
          <div *ngIf="devolucion()?.firma_persona_devolucion; else lineDeliv" style="height: 80px; display: flex; align-items: flex-end; justify-content: center; border-bottom: 1px solid #000; margin-bottom: 10px;">
            <img [src]="devolucion()?.firma_persona_devolucion" alt="Firma Entregador" style="max-height: 80px; object-fit: contain;">
          </div>
          <ng-template #lineDeliv><div class="line"></div></ng-template>
          <p>NOMBRE: {{ devolucion()?.nombre_persona_devolucion || '___________________________________' }}</p>
          <p>C.C: {{ devolucion()?.cedula_persona_devolucion || '___________________________________' }}</p>
        </div>
        <div class="signature-box">
          <p>FIRMA APROBACIÓN (PERSONAL INTERNO):</p>
          <div *ngIf="devolucion()?.firma_aprobador; else lineAprob" style="height: 80px; display: flex; align-items: flex-end; justify-content: center; border-bottom: 1px solid #000; margin-bottom: 10px;">
            <img [src]="devolucion()?.firma_aprobador" alt="Firma Aprobador" style="max-height: 80px; object-fit: contain;">
          </div>
          <ng-template #lineAprob><div class="line"></div></ng-template>
          <p>NOMBRE: {{ devolucion()?.aprobado_por_nombre || '___________________________________' }}</p>
          <p>ESTADO: {{ devolucion()?.estado }}</p>
        </div>
      </div>
    </div>

    <div class="no-print actions">
      <button *ngIf="!hideDownload()" (click)="downloadAsPdf()" class="download-btn">
        <mat-icon>download</mat-icon>
        Descargar PDF
      </button>
      <button (click)="print()" class="print-btn">
        <mat-icon>print</mat-icon>
        Imprimir Acta
      </button>
      <button (click)="close.emit()" class="close-btn">
        Cerrar
      </button>
    </div>
  `,
  styles: [`
    .acta-container {
      width: 100%;
      max-width: 297mm;
      min-height: 210mm;
      padding: 15mm;
      margin: auto;
      background: white;
      font-family: Arial, sans-serif;
      color: black;
      position: relative;
      box-sizing: border-box;
    }

    /* ── Header Table ── */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .header-table td {
      border: 1px solid black;
      text-align: center;
      vertical-align: middle;
      padding: 6px;
      font-size: 10pt;
    }

    .header-logo-cell {
      width: 20%;
    }

    .header-logo {
      max-height: 45px;
      display: block;
      margin: 0 auto;
    }

    .header-title-cell {
      width: 60%;
      font-weight: bold;
    }

    .header-doc-title {
      font-size: 12pt;
      margin-bottom: 4px;
      text-transform: uppercase;
      color: black;
    }

    .header-page-number {
      font-size: 9pt;
      font-weight: normal;
      color: black;
    }

    .header-meta-cell {
      width: 20%;
      font-size: 8pt;
      text-align: center;
      color: black;
    }

    .info-section {
      margin-bottom: 20px;
      font-size: 14px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    .data-table th, .data-table td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
      font-size: 12px;
    }

    .data-table th {
      background-color: #f2f2f2;
      font-weight: bold;
    }

    .comments-section {
      margin-top: 20px;
      margin-bottom: 20px;
      border-top: 1px dashed #ccc;
      padding-top: 10px;
    }

    .comments-section h3, .photos-section h3 {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .comment-item {
      font-size: 12px;
      margin-bottom: 5px;
      padding-left: 10px;
    }

    .photos-section {
      margin-top: 20px;
      margin-bottom: 30px;
    }

    .photos-grid {
      display: flex;
      gap: 20px;
      justify-content: flex-start;
    }

    .photo-box {
      width: 180px;
      text-align: center;
    }

    .photo-box p {
      font-size: 10px;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .photo-box img {
      width: 100%;
      height: 120px;
      object-fit: cover;
      border: 1px solid #000;
    }

    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
    }

    .signature-box {
      width: 45%;
    }

    .signature-box p {
      font-size: 12px;
      margin: 10px 0;
    }

    .line {
      border-top: 1px solid #000;
      margin-top: 40px;
      margin-bottom: 10px;
    }

    .actions {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
    }

    .print-btn, .close-btn, .download-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      border: none;
      font-size: 14px;
      transition: opacity 0.2s;
    }

    .print-btn, .close-btn, .download-btn:hover {
      opacity: 0.9;
    }

    .download-btn {
      background: #1e293b;
      color: white;
    }

    .print-btn {
      background: #FF6B00;
      color: white;
    }

    .close-btn {
      background: #e2e8f0;
      color: #475569;
    }

    @media print {
      .no-print {
        display: none !important;
      }
    }
  `]
})
export class ActaDevolucionComponent implements AfterViewInit {
  private auth = inject(AuthService);
  private datePipe = inject(DatePipe);

  devolucion = input<Devolucion | null>(null);
  close = output<void>();
  autoPrint = input<boolean>(false);
  autoDownload = input<boolean>(false);
  hideDownload = input<boolean>(false);

  today = new Date();

  ngAfterViewInit() {
    if (this.autoPrint()) {
      setTimeout(() => {
        this.print();
        this.close.emit();
      }, 500);
    } else if (this.autoDownload()) {
      setTimeout(() => {
        this.downloadAsPdf();
        // No cerramos: el usuario puede cerrar el modal manualmente
      }, 500);
    }
  }

  /** Fecha formateada en español, ej: 09 de mayo del 2026 */
  get todayFormatted(): string {
    return this.datePipe.transform(this.today, "dd 'de' MMMM 'del' yyyy", undefined, 'es') ?? '';
  }

  currentUserName(): string {
    const u = this.auth.currentUser();
    if (!u) return '___________________________________';
    const full = [u.first_name, u.last_name].filter(Boolean).join(' ');
    return full || u.username;
  }

  hasComments(): boolean {
    return this.devolucion()?.items.some(i => !!i.comentario_devolucion) || false;
  }

  itemsWithComments() {
    return this.devolucion()?.items.filter(i => !!i.comentario_devolucion) || [];
  }

  private buildPrintHTML(printContent: HTMLElement): string {
    const loteId = this.devolucion()?.id ?? 'N/A';
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${window.location.origin}/">
          <title>Acta de Devolución - Lote #${loteId}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 0; margin: 0; color: black; background: white; }
            .acta-container { width: 100%; max-width: 297mm; margin: 0 auto; padding: 15mm; box-sizing: border-box; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .header-table td { border: 1px solid black; text-align: center; vertical-align: middle; padding: 6px; font-size: 10pt; }
            .header-logo-cell { width: 20%; }
            .header-logo { max-height: 45px; display: block; margin: 0 auto; }
            .header-title-cell { width: 60%; font-weight: bold; }
            .header-doc-title { font-size: 12pt; margin-bottom: 4px; text-transform: uppercase; color: black; }
            .header-page-number { font-size: 9pt; font-weight: normal; color: black; }
            .header-meta-cell { width: 20%; font-size: 8pt; text-align: center; color: black; }
            .info-section { margin-bottom: 20px; font-size: 14px; }
            .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .data-table th, .data-table td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
            .data-table th { background-color: #f2f2f2; font-weight: bold; }
            .comments-section { margin-top: 15px; margin-bottom: 15px; border-top: 1px dashed #ccc; padding-top: 10px; }
            .comments-section h3, .photos-section h3 { font-size: 14px; font-weight: bold; margin-bottom: 10px; }
            .comment-item { font-size: 12px; margin-bottom: 5px; padding-left: 10px; }
            .photos-section { margin-top: 15px; margin-bottom: 20px; }
            .photos-grid { display: flex; gap: 20px; justify-content: flex-start; }
            .photo-box { width: 180px; text-align: center; }
            .photo-box p { font-size: 10px; font-weight: bold; margin-bottom: 5px; margin-top: 0; }
            .photo-box img { width: 100%; height: 120px; object-fit: cover; border: 1px solid #000; }
            .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
            .signature-box { width: 45%; }
            .signature-box p { font-size: 12px; margin: 10px 0; }
            .line { border-top: 1px solid #000; margin-top: 40px; margin-bottom: 10px; }
            .no-print { display: none !important; }
            @media print {
              @page { size: landscape; margin: 10mm; }
              body { padding: 0; }
              .acta-container { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `;
  }

  private openPrintIframe(html: string, onReady?: (iframeWindow: Window) => void) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.style.zIndex = '-1000';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      if (!iframe.contentWindow) return;

      const cleanup = () => {
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 1000);
      };

      iframe.contentWindow.onafterprint = cleanup;
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 60000);

      if (onReady) onReady(iframe.contentWindow);
    }, 500);
  }

  print() {
    const printContent = document.getElementById('print-area');
    if (!printContent) return;
    const html = this.buildPrintHTML(printContent);
    this.openPrintIframe(html, (win) => {
      win.focus();
      win.print();
    });
  }

  private loadHtml2Pdf(): Promise<any> {
    if (typeof window === 'undefined') return Promise.reject('Not in browser');
    if ((window as any).html2pdf) {
      return Promise.resolve((window as any).html2pdf);
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve((window as any).html2pdf);
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  }

  async downloadAsPdf() {
    const printContent = document.getElementById('print-area');
    if (!printContent) return;
    const loteId = this.devolucion()?.id ?? 'lote';
    
    try {
      const html2pdf = await this.loadHtml2Pdf();
      
      // Clone the content to apply explicit print dimensions (width: 297mm)
      const clone = printContent.cloneNode(true) as HTMLElement;
      clone.style.width = '297mm';
      clone.style.maxWidth = 'none';
      clone.style.margin = '0';
      clone.style.position = 'absolute';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      document.body.appendChild(clone);
      
      const opt = {
        margin:       0,
        filename:     `Acta_Devolucion_Lote_${loteId}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      
      await html2pdf().from(clone).set(opt).save();
      document.body.removeChild(clone);
    } catch (error) {
      console.error('Error generating PDF with html2pdf:', error);
      const html = this.buildPrintHTML(printContent);
      this.openPrintIframe(html, (win) => {
        win.document.title = `Acta_Devolucion_Lote_${loteId}`;
        win.focus();
        win.print();
      });
    }
  }
}
