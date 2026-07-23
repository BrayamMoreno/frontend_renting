import { Component, ElementRef, ViewChild, Output, EventEmitter, AfterViewInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-camera',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-4">
      <div class="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white flex flex-col items-center justify-center">
        <!-- Video Stream -->
        <video *ngIf="!cameraError()" #video autoplay playsinline (playing)="isLoading.set(false)" class="w-full h-full object-cover" [class.opacity-0]="isLoading()"></video>
        
        <!-- Loading Overlay -->
        <div *ngIf="isLoading() && !cameraError()" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white gap-3 z-10">
          <div class="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs font-bold uppercase tracking-widest text-slate-400">Iniciando Cámara...</p>
        </div>

        <div *ngIf="cameraError()" class="text-white text-center p-6 flex flex-col items-center">
          <mat-icon class="scale-150 mb-4 text-slate-400">no_photography</mat-icon>
          <p class="mb-4">No se pudo acceder a la cámara.</p>
          <button (click)="fileInput.click()" class="bg-brand text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors">
            Subir foto manualmente
          </button>
        </div>

        <div *ngIf="!cameraError() && !isLoading()" class="absolute inset-0 border-[24px] border-black/40 pointer-events-none rounded-full scale-75"></div>
        <div *ngIf="!cameraError() && !isLoading()" class="absolute bottom-6 left-0 right-0 flex justify-center">
          <button (click)="capture()" class="w-16 h-16 bg-white rounded-full border-4 border-slate-300 shadow-xl active:scale-90 transition-transform flex items-center justify-center text-slate-800">
            <mat-icon class="scale-125">photo_camera</mat-icon>
          </button>
        </div>
        
        <input type="file" #fileInput class="hidden" accept="image/*" (change)="handleUpload($event)">
      </div>
      <p class="text-xs text-center text-slate-500 font-medium">Capture o suba la foto identificativa</p>
    </div>
  `
})
export class CameraComponent implements AfterViewInit, OnDestroy {
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
  @Output() photoCaptured = new EventEmitter<string>();
  
  cameraError = signal(false);
  isLoading = signal(true);
  private stream: MediaStream | null = null;

  async ngAfterViewInit() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (this.videoRef) {
        this.videoRef.nativeElement.srcObject = this.stream;
      }
    } catch (e) {
      console.error('Camera Access Error:', e);
      this.cameraError.set(true);
      this.isLoading.set(false);
    }
  }

  capture() {
    if (!this.videoRef) return;
    const video = this.videoRef.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    this.photoCaptured.emit(dataUrl);
  }

  handleUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.photoCaptured.emit(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  ngOnDestroy() {
    this.stream?.getTracks().forEach(track => track.stop());
  }
}
