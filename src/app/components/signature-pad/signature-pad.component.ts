import { Component, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter, input } from '@angular/core';

@Component({
  selector: 'app-signature-pad',
  standalone: true,
  template: `
    <div class="space-y-2">
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-widest">{{ label() }}</p>
      <canvas #sigCanvas 
              class="w-full h-40 touch-none shadow-inner"
              (mousedown)="startDrawing($event)"
              (mousemove)="draw($event)"
              (mouseup)="stopDrawing()"
              (mouseleave)="stopDrawing()"
              (touchstart)="startDrawingTouch($event)"
              (touchmove)="drawTouch($event)"
              (touchend)="stopDrawing()">
      </canvas>
      <div class="flex justify-end">
        <button type="button" (click)="clear()" class="text-xs text-red-500 hover:underline font-medium">Borrar firma</button>
      </div>
    </div>
  `
})
export class SignaturePadComponent implements AfterViewInit {
  label = input<string>('Firma');
  @ViewChild('sigCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;

  @Output() signatureChange = new EventEmitter<string>();

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    // Ajustar tamaño del buffer al tamaño visual
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    this.ctx = canvas.getContext('2d')!;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#000';
  }

  startDrawing(event: MouseEvent) {
    this.isDrawing = true;
    this.ctx.beginPath();
    this.ctx.moveTo(event.offsetX, event.offsetY);
  }

  draw(event: MouseEvent) {
    if (!this.isDrawing) return;
    this.ctx.lineTo(event.offsetX, event.offsetY);
    this.ctx.stroke();
  }

  startDrawingTouch(event: TouchEvent) {
    event.preventDefault();
    this.isDrawing = true;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const touch = event.touches[0];
    this.ctx.beginPath();
    this.ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  }

  drawTouch(event: TouchEvent) {
    event.preventDefault();
    if (!this.isDrawing) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const touch = event.touches[0];
    this.ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    this.ctx.stroke();
  }

  stopDrawing() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.signatureChange.emit(this.canvasRef.nativeElement.toDataURL());
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    this.signatureChange.emit('');
  }
}
