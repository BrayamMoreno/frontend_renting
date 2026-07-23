import { Component, input, output, inject, AfterViewInit } from '@angular/core';
import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth.service';

registerLocaleData(localeEs, 'es');

export interface ActaEntregaData {
  asset: {
    item?: number;
    tipo_producto?: string;
    marca: string;
    modelo: string;
    procesador?: string;
    disco?: string;
    tipo_disco?: string;
    ram?: string;
    serial: string;
    serial2?: string;
    ubicacion?: string;
    estado?: string;
  };
  peripherals?: {
    item?: number;
    tipo_producto?: string;
    marca: string;
    modelo: string;
    serial: string;
    estado?: string;
  }[];
  nombre: string;
  cedula: string;
  empresa: string;
  tecnicoNombre?: string;
  checklistData?: Record<string, { nombre: string; valor: string; observacion?: string }>;
  observaciones?: string;
  notaEntrega?: string;
}

@Component({
  selector: 'app-acta-entrega',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  providers: [DatePipe],
  template: `
    <div id="print-area-entrega" class="acta-docx-container">
      <!-- ========== PAGE 1 ========== -->
      <div class="docx-page">
        <!-- Header Table -->
        <table class="header-table">
          <tr>
            <td rowspan="3" class="header-logo-cell">
              <img src="Logo-devolucion.svg" alt="Logo" class="header-logo">
            </td>
            <td rowspan="3" class="header-title-cell">
              <div class="header-doc-title">ACTA DE ENTREGA DE EQUIPOS</div>
              <div class="header-page-number">página 1 de 3</div>
            </td>
            <td class="header-meta-cell">SI-R-01</td>
          </tr>
          <tr>
            <td class="header-meta-cell">Versión 02</td>
          </tr>
          <tr>
            <td class="header-meta-cell">2017-03-02</td>
          </tr>
        </table>

        <h1 class="acta-title">ACTA DE ENTREGA DE EQUIPO DE TECNOLOGÍA</h1>

        <p class="acta-body">
          En Bogotá D.C., a los <span class="data-value">{{ todayFormatted }}</span>
          en las instalaciones de la empresa <span class="data-value">{{ data()?.empresa }}</span>,
          se reunieron el señor MILTON CESAR POSADA MELO identificado con la cédula de ciudadanía
          No. 79.545.274 expedida en Bogotá D. C., actuando en la calidad de Representante legal
          de la sociedad BOGOTÁ. y el(a) señor(a) <strong class="data-value">{{ data()?.nombre }}</strong>
          identificado(a) con la cédula de ciudadanía No <strong class="data-value">{{ data()?.cedula }}</strong>
          en calidad de TRABAJADOR(A) de la empresa <span class="data-value">{{ data()?.empresa }}</span>.
          Para realizar el siguiente acuerdo de entrega:
        </p>

        <h2 class="clause-title">PRIMERO.</h2>
        <p class="acta-body-spaced">
          La empresa <span class="data-value">{{ data()?.empresa }}</span>, hace entrega al(a)
          TRABAJADOR(A) de los siguientes elementos, los cuales se encuentran en buen estado:
        </p>

        <!-- Equipment Table -->
        <table class="equipment-table">
          <thead>
            <tr>
              <th>ELEMENTO</th>
              <th>CANTIDAD</th>
              <th>MARCA</th>
              <th>SERIAL 1</th>
              <th>SERIAL 2</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="data()?.asset as asset">
              <td>{{ asset.tipo_producto || 'Equipo de cómputo' }}</td>
              <td class="center">1</td>
              <td class="center">{{ asset.marca }} {{ asset.modelo }}</td>
              <td class="center">{{ asset.serial }}</td>
              <td class="center">{{ asset.item || '' }}</td>
              <td class="center">Bueno</td>
            </tr>
            <tr *ngFor="let per of data()?.peripherals">
              <td>{{ per.tipo_producto || 'Periférico' }}</td>
              <td class="center">1</td>
              <td class="center">{{ per.marca }} {{ per.modelo }}</td>
              <td class="center">{{ per.serial }}</td>
              <td class="center">{{ per.item || '' }}</td>
              <td class="center">Bueno</td>
            </tr>
          </tbody>
        </table>

        <!-- Nota de entrega -->
        <div *ngIf="data()?.notaEntrega" style="margin: 10pt 0 10pt 8pt; border: 1pt solid black; padding: 8pt; font-size: 11pt; line-height: 1.3;">
          <div style="font-weight: bold; margin-bottom: 4pt; text-transform: uppercase; font-size: 9pt; color: #444; border-bottom: 1px solid #ccc; padding-bottom: 2pt;">Nota de entrega</div>
          <div style="white-space: pre-wrap; color: black;">{{ data()?.notaEntrega }}</div>
        </div>

        <h2 class="clause-title">SEGUNDO.</h2>
        <p class="acta-body">
          El(a) TRABAJADOR(A) acepta que recibe en excelentes condiciones el equipo y los accesorios
          relacionados en el numeral primero de la presente acta, los cuales se obliga a utilizar
          bajo las siguientes condiciones: a) El(a) TRABAJADOR(A) lo utilizará única y exclusivamente
          bajo su propia responsabilidad, asumiendo los costos y cualquier anomalía que se derive de
          su uso inapropiado; b) Devolverlos a la empresa <span class="data-value">{{ data()?.empresa }}</span>.
          una vez finalice el contrato de trabajo, por cualquier causa, en idénticas condiciones como
          lo recibió salvo su deterioro natural por uso; c) El(a) TRABAJADOR(A) autoriza a la empresa
          <span class="data-value">{{ data()?.empresa }}</span>. a descontar del valor de su salario,
          o de su liquidación final de prestaciones sociales y acreencias laborales que le correspondan
          por Ley, todo costo de reparación o reposición por uso inapropiado que se efectúe en el
          referenciado equipo.
        </p>

        <h2 class="clause-title">TERCERO.</h2>
        <p class="acta-body">
          En el eventual caso que se produzca la pérdida del equipo o los accesorios que le han sido
          entregados al(a) TRABAJADOR(A), éste(a) se compromete a notificarlo inmediatamente a la
          empresa <span class="data-value">{{ data()?.empresa }}</span>, y a colocar igualmente la
          denuncia por pérdida o hurto ante las autoridades correspondientes.
        </p>
      </div>

      <!-- ========== PAGE 2 ========== -->
      <div class="docx-page">
        <!-- Header Table -->
        <table class="header-table">
          <tr>
            <td rowspan="3" class="header-logo-cell">
              <img src="Logo-devolucion.svg" alt="Logo" class="header-logo">
            </td>
            <td rowspan="3" class="header-title-cell">
              <div class="header-doc-title">ACTA DE ENTREGA DE EQUIPOS</div>
              <div class="header-page-number">página 2 de 3</div>
            </td>
            <td class="header-meta-cell">SI-R-01</td>
          </tr>
          <tr>
            <td class="header-meta-cell">Versión 02</td>
          </tr>
          <tr>
            <td class="header-meta-cell">2017-03-02</td>
          </tr>
        </table>

        <h2 class="clause-title">CUARTO.</h2>
        <p class="acta-body">
          En el evento en que deba efectuarse la reposición del equipo, por pérdida o daño, la empresa
          <span class="data-value">{{ data()?.empresa }}</span>. asumirá el cincuenta por ciento (50%)
          del costo únicamente por la primera vez siempre y cuando se encuentre suficientemente
          acreditada la ocurrencia de un evento de fuerza mayor o caso fortuito ajeno al(a)
          TRABAJADOR(A) (hurto), correspondiendo al(a) TRABAJADOR(A) asumir el cincuenta por ciento
          (50%) restante para lo cual se compromete a suscribir la respectiva autorización de descuento
          a fin de que el costo sea deducido de su salario. Por las oportunidades subsiguientes en que
          deba hacerse la reposición de los equipos el(a) TRABAJADOR(A) asumirá la totalidad de los
          costos generados por ésta y en todo caso, para proceder a la reposición, el(a) TRABAJADOR(A)
          allegará a la empresa <span class="data-value">{{ data()?.empresa }}</span>. el formato
          establecido para el efecto, debidamente diligenciado, al tiempo que se compromete a suscribir
          la autorización de descuento correspondiente por el costo total de la reposición del equipo.
        </p>

        <h2 class="clause-title">QUINTO.</h2>
        <p class="acta-body">
          Todo costo ocasionado por causa del cambio del equipo cuando, a consideración de la empresa
          <span class="data-value">{{ data()?.empresa }}</span>. exista la necesidad de actualizar el
          software o las características técnicas del equipo entregado, será asumido en su totalidad
          por el EMPLEADOR.
        </p>

        <h2 class="clause-title">SEXTO.</h2>
        <p class="acta-body">
          El(a) TRABAJADOR(A) se compromete a utilizar el equipo de manera correcta, respetando las
          directrices y políticas que la empresa <span class="data-value">{{ data()?.empresa }}</span>.
          le señale.
        </p>

        <h2 class="clause-title">SÉPTIMO.</h2>
        <p class="acta-body">
          LAS PARTES aclaran que el equipo suministrado al(a) TRABAJADOR(A) por parte de la empresa
          <span class="data-value">{{ data()?.empresa }}</span>. tiene como finalidad facilitar la
          ejecución de las labores que conciernen al(a) TRABAJADOR(A), atendiendo a la necesidad de
          establecer un canal de comunicación permanente con la empresa y con los clientes que le son
          asignados.
        </p>
      </div>

      <!-- ========== PAGE 3 ========== -->
      <div class="docx-page">
        <!-- Header Table -->
        <table class="header-table">
          <tr>
            <td rowspan="3" class="header-logo-cell">
              <img src="Logo-devolucion.svg" alt="Logo" class="header-logo">
            </td>
            <td rowspan="3" class="header-title-cell">
              <div class="header-doc-title">ACTA DE ENTREGA DE EQUIPOS</div>
              <div class="header-page-number">página 3 de 3</div>
            </td>
            <td class="header-meta-cell">SI-R-01</td>
          </tr>
          <tr>
            <td class="header-meta-cell">Versión 02</td>
          </tr>
          <tr>
            <td class="header-meta-cell">2017-03-02</td>
          </tr>
        </table>

        <h2 class="clause-title">OCTAVO. DISPOSICIONES LEGALES:</h2>
        <p class="acta-body">
          Conforme a lo establecido por el código sustantivo del trabajo, lo relacionado en el presente
          formato está sujeto lo establecido en el artículo 150 de la misma norma, en el caso que se
          presente perdida del elemento confiado al trabajador y luego que se demuestre que actuó con
          mala fe, ánimo de dañarlo o por fuera de los protocolos encomendados y socializados, con la
          firma de este documento EL TRABAJADOR ENTREGA LA AUTORIZACIÓN ESPECIAL de que habla el
          artículo 151 del Código Sustantivo del Trabajo para generar descuento por nómina.
        </p>

        <p class="acta-body" style="margin-top: 15px;">
          En caso de pérdida si el elemento fue sacado de las instalaciones de la empresa, EL
          TRABAJADOR correrá con los gastos de reposición del equipo.
        </p>

        <h2 class="clause-title">NOVENO:</h2>
        <p class="acta-body">
          Queda prohibido que EL TRABAJADOR saque de las instalaciones de la empresa el equipo
          encomendado, en caso de requerirlo así, deberá tener autorización escrita del jefe encargado.
        </p>

        <p class="acta-body" style="margin-top: 20px;">
          En fe de todo lo anterior y como constancia de la presente acta se firma por quienes en ella
          intervinieron.
        </p>

        <!-- Signatures -->
        <div class="signatures-docx">
          <div class="sig-col">
            <p class="sig-header"><strong>Por la EMPRESA</strong></p>
            <div class="sig-line"></div>
            <p>C. C. Nº _______________</p>
            <p>Representante Legal</p>
          </div>
          <div class="sig-col">
            <p class="sig-header"><strong>Por el(a) TRABAJADOR(A)</strong></p>
            <div class="sig-line"></div>
            <p><strong>{{ data()?.nombre }}</strong></p>
            <p><strong>{{ data()?.cedula }}</strong></p>
          </div>
        </div>
      </div>
    </div>

    <div class="no-print actions">
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
    /* ── General Document Styling (mimics Word .docx) ── */
    .acta-docx-container {
      width: 100%;
      max-width: 595pt;
      margin: 0 auto;
      background: white;
      font-family: Arial, sans-serif;
      color: black;
      font-size: 12pt;
      line-height: 1.22;
      box-sizing: border-box;
    }

    .docx-page {
      padding: 25pt 22pt 33pt 23pt;
      page-break-after: always;
      position: relative;
    }

    .docx-page:last-child {
      page-break-after: auto;
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

    /* ── Title ── */
    .acta-title {
      text-align: center;
      font-size: 15pt;
      font-weight: bold;
      margin: 5pt 79pt 0 79pt;
    }

    /* ── Body Text ── */
    .acta-body {
      text-align: justify;
      font-size: 12pt;
      line-height: 1.6;
      margin: 8pt 18pt 0 8pt;
      color: black;
    }

    .acta-body-spaced {
      text-align: justify;
      font-size: 12pt;
      line-height: 1.8;
      margin: 3pt 40pt 0 8pt;
      color: black;
    }

    .page-footer {
      text-align: center;
      font-size: 9pt;
      color: black;
      margin-top: 30pt;
      border-top: 1px solid black;
      padding-top: 5pt;
    }

    /* ── Data Values (replacements for {{...}}) ── */
    .data-value {
      /* intentionally no special styling – blends with text like in the original .docx */
    }

    /* ── Clause Titles ── */
    .clause-title {
      font-size: 15pt;
      font-weight: bold;
      margin: 20pt 0 0 8pt;
    }

    /* ── Equipment Table ── */
    .equipment-table {
      border-collapse: collapse;
      margin: 10pt 0 10pt 8pt;
      width: calc(100% - 16pt);
    }

    .equipment-table th,
    .equipment-table td {
      border: 1pt solid black;
      padding: 4pt 5pt;
      font-size: 8pt;
      text-align: center;
      vertical-align: top;
    }

    .equipment-table th {
      font-weight: bold;
      font-size: 8pt;
    }

    .equipment-table td {
      font-size: 12pt;
      min-height: 32pt;
    }

    /* ── Signature Block ── */
    .signatures-docx {
      display: flex;
      justify-content: space-between;
      margin-top: 60pt;
      padding: 0 8pt;
    }

    .sig-col {
      width: 45%;
    }

    .sig-header {
      font-size: 13pt;
      margin-bottom: 0;
    }

    .sig-line {
      border-top: 1pt solid black;
      margin-top: 50pt;
      margin-bottom: 10pt;
    }

    .sig-col p {
      font-size: 13pt;
      margin: 4pt 0;
    }

    /* ── Action Buttons (no-print) ── */
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

    .print-btn:hover, .close-btn:hover, .download-btn:hover {
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
      @page {
        size: A4 portrait;
        margin: 0;
      }
      .acta-docx-container {
        margin: 0;
      }
    }
  `]
})
export class ActaEntregaComponent implements AfterViewInit {
  private auth = inject(AuthService);
  private datePipe = inject(DatePipe);

  data = input<ActaEntregaData | null>(null);
  close = output<void>();
  autoPrint = input<boolean>(false);
  autoDownload = input<boolean>(false);

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
      }, 500);
    }
  }

  /** Fecha formateada en español, ej: 12 de julio del 2026 */
  get todayFormatted(): string {
    return this.datePipe.transform(this.today, "dd 'de' MMMM 'del' yyyy", undefined, 'es') ?? '';
  }

  currentUserName(): string {
    const u = this.auth.currentUser();
    if (!u) return '___________________________________';
    const full = [u.first_name, u.last_name].filter(Boolean).join(' ');
    return full || u.username;
  }

  hasChecklist(): boolean {
    const ck = this.data()?.checklistData;
    return !!ck && Object.keys(ck).length > 0;
  }

  checklistEntries(): { nombre: string; valor: string; observacion?: string }[] {
    const ck = this.data()?.checklistData;
    if (!ck) return [];
    return Object.values(ck);
  }

  private buildPrintHTML(printContent: HTMLElement): string {
    const serial = this.data()?.asset?.serial ?? 'N/A';
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${window.location.origin}/">
          <title>Acta de Entrega - ${serial}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 0;
              margin: 0;
              color: black;
              background: white;
            }
            .acta-docx-container {
              width: 100%;
              max-width: 595pt;
              margin: 0 auto;
              font-family: Arial, sans-serif;
              color: black;
              font-size: 12pt;
              line-height: 1.22;
            }
            .docx-page {
              padding: 25pt 22pt 33pt 23pt;
              page-break-after: always;
            }
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
            .docx-page:last-child {
              page-break-after: auto;
            }
            .acta-title {
              text-align: center;
              font-size: 15pt;
              font-weight: bold;
              margin: 5pt 79pt 0 79pt;
            }
            .acta-body {
              text-align: justify;
              font-size: 12pt;
              line-height: 1.6;
              margin: 8pt 18pt 0 8pt;
            }
            .acta-body-spaced {
              text-align: justify;
              font-size: 12pt;
              line-height: 1.8;
              margin: 3pt 40pt 0 8pt;
            }
            .page-footer {
              text-align: center;
              font-size: 9pt;
              color: black;
              margin-top: 30pt;
              border-top: 1px solid black;
              padding-top: 5pt;
            }
            .clause-title {
              font-size: 15pt;
              font-weight: bold;
              margin: 20pt 0 0 8pt;
            }
            .equipment-table {
              border-collapse: collapse;
              margin: 10pt 0 10pt 8pt;
              width: calc(100% - 16pt);
            }
            .equipment-table th, .equipment-table td {
              border: 1pt solid black;
              padding: 4pt 5pt;
              text-align: center;
              vertical-align: top;
            }
            .equipment-table th { font-size: 8pt; font-weight: bold; }
            .equipment-table td { font-size: 12pt; min-height: 32pt; }
            .signatures-docx {
              display: flex;
              justify-content: space-between;
              margin-top: 60pt;
              padding: 0 8pt;
            }
            .sig-col { width: 45%; }
            .sig-header { font-size: 13pt; margin-bottom: 0; }
            .sig-line { border-top: 1pt solid black; margin-top: 50pt; margin-bottom: 10pt; }
            .sig-col p { font-size: 13pt; margin: 4pt 0; }
            .no-print { display: none !important; }
            @media print {
              @page { size: A4 portrait; margin: 0; }
              body { padding: 0; margin: 0; }
              .docx-page { padding: 20pt 22pt 20pt 23pt; }
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
    const printContent = document.getElementById('print-area-entrega');
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
    const printContent = document.getElementById('print-area-entrega');
    if (!printContent) return;
    const serial = this.data()?.asset?.serial ?? 'equipo';
    
    try {
      const html2pdf = await this.loadHtml2Pdf();
      
      // Clone the content to apply explicit print dimensions (width: 595pt)
      const clone = printContent.cloneNode(true) as HTMLElement;
      clone.style.width = '595pt';
      clone.style.maxWidth = 'none';
      clone.style.margin = '0';
      clone.style.position = 'absolute';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      document.body.appendChild(clone);
      
      const opt = {
        margin:       0,
        filename:     `Acta_Entrega_${serial}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'pt', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
      };
      
      await html2pdf().from(clone).set(opt).save();
      document.body.removeChild(clone);
    } catch (error) {
      console.error('Error generating PDF with html2pdf:', error);
      const html = this.buildPrintHTML(printContent);
      this.openPrintIframe(html, (win) => {
        win.document.title = `Acta_Entrega_${serial}`;
        win.focus();
        win.print();
      });
    }
  }
}
