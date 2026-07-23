import { Component, inject, signal, OnInit, PLATFORM_ID, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatIconModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      <!-- Decorative elements -->
      <div class="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div class="absolute -top-24 -left-24 w-96 h-96 bg-brand rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-brand rounded-full blur-3xl"></div>
      </div>

      <div class="max-w-md w-full space-y-8 bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/20 relative z-10">
        
        <!-- Estado: Pendiente de Aprobación -->
        <div *ngIf="showPendingApproval()" class="text-center space-y-6">
          <div class="mx-auto w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center pending-icon">
            <mat-icon class="text-amber-500 !text-4xl !w-10 !h-10">hourglass_top</mat-icon>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-slate-900">Cuenta pendiente</h2>
            <p class="mt-2 text-sm text-slate-500">
              Tu cuenta ha sido registrada con el correo
            </p>
            <p class="mt-1 font-semibold text-brand">{{ pendingEmail() }}</p>
          </div>
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div class="flex items-start gap-3">
              <mat-icon class="text-amber-500 !text-xl flex-shrink-0 mt-0.5">info</mat-icon>
              <p class="text-sm text-amber-800 text-left">
                Un administrador debe aprobar tu cuenta antes de que puedas acceder al sistema. 
                Recibirás acceso una vez aprobado.
              </p>
            </div>
          </div>
          <button 
            (click)="clearPending()" 
            class="w-full py-3 px-4 border border-slate-300 text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200">
            <mat-icon class="!text-lg align-middle mr-1">arrow_back</mat-icon>
            Volver al inicio de sesión
          </button>
        </div>

        <!-- Estado: Login Normal -->
        <div *ngIf="!showPendingApproval()">
          <div class="text-center">
            <img src="Logo.svg" alt="Renting Manager Logo" class="mx-auto h-16 w-auto mb-6">
            <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight">Renting Manager</h2>
            <p class="mt-2 text-sm text-slate-500">Inicia sesión para acceder al sistema</p>
          </div>

          <form class="mt-8 space-y-6" [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            
            <div *ngIf="errorMessage()" class="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-200">
              {{ errorMessage() }}
            </div>

            <div class="space-y-4">
              <div>
                <label for="username" class="sr-only">Usuario</label>
                <input id="username" formControlName="username" type="text" required class="appearance-none rounded-lg relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-brand focus:border-brand focus:z-10 sm:text-sm" placeholder="Nombre de usuario">
              </div>
              <div>
                <label for="password" class="sr-only">Contraseña</label>
                <input id="password" formControlName="password" type="password" required class="appearance-none rounded-lg relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-brand focus:border-brand focus:z-10 sm:text-sm" placeholder="Contraseña">
              </div>
            </div>

            <div>
              <button type="submit" [disabled]="loginForm.invalid || isLoading()" class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-[#FF6B00] hover:bg-[#E65A00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                  <div *ngIf="isLoading()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <mat-icon *ngIf="!isLoading()" class="h-5 w-5 text-orange-200 group-hover:text-white transition-colors">login</mat-icon>
                </span>
                Entrar al Sistema
              </button>
            </div>

          </form>

          <!-- Separador -->
          <div class="relative my-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-200"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-4 bg-white/80 text-slate-400 font-medium">o continúa con</span>
            </div>
          </div>

          <!-- Botón Google Sign-In -->
          <div class="w-full flex justify-center pt-2">
            <button
              type="button"
              id="google-signin-custom-btn"
              (click)="signInWithGoogle()"
              [disabled]="isGoogleLoading()"
              class="google-btn w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span *ngIf="isGoogleLoading()" class="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
              <svg *ngIf="!isGoogleLoading()" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="w-5 h-5 flex-shrink-0">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.8 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8.1 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.9 1.1 8.1 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.3 35.4 26.8 36 24 36c-5.3 0-9.7-3.2-11.3-7.8l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.2 5.2C41.2 36.1 44 30.5 44 24c0-1.3-.1-2.6-.4-3.9z"/>
              </svg>
              <span>{{ isGoogleLoading() ? 'Iniciando sesión...' : 'Continuar con Google' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pending-icon {
      animation: pulse-amber 2s ease-in-out infinite;
    }
    @keyframes pulse-amber {
      0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.3); }
      50% { box-shadow: 0 0 0 12px rgba(245, 158, 11, 0); }
    }
  `]
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);

  loginForm: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  isLoading = signal(false);
  isGoogleLoading = signal(false);
  errorMessage = signal('');
  showPendingApproval = signal(false);
  pendingEmail = signal('');

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initGoogleSignIn();
    }
  }

  private initGoogleSignIn() {
    // Pre-cargar la librería GSI para que esté lista cuando el usuario haga click
    const checkGsi = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts) {
        clearInterval(checkGsi);
        // Solo inicializar la librería, el flujo se lanza con signInWithGoogle()
        google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: (response: any) => {
            this.ngZone.run(() => {
              this.handleGoogleCredential(response.credential);
            });
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      }
    }, 100);
    setTimeout(() => clearInterval(checkGsi), 10000);
  }

  signInWithGoogle() {
    if (typeof google === 'undefined' || !google.accounts) {
      this.errorMessage.set('La librería de Google no está disponible. Recarga la página.');
      return;
    }

    this.isGoogleLoading.set(true);
    this.errorMessage.set('');

    // Timeout de seguridad: si en 3 min no hay respuesta (popup cerrado sin callback), desbloquear
    const safetyTimeout = setTimeout(() => {
      this.ngZone.run(() => this.isGoogleLoading.set(false));
    }, 180_000);

    const resetLoading = () => {
      clearTimeout(safetyTimeout);
      this.isGoogleLoading.set(false);
    };

    // Usar el flujo OAuth2 con prompt=select_account para mostrar SIEMPRE el selector de cuentas
    const client = google.accounts.oauth2.initTokenClient({
      client_id: environment.googleClientId,
      scope: 'openid email profile',
      prompt: 'select_account',

      // error_callback se llama cuando el usuario CIERRA el popup o hay un error de flujo
      error_callback: (err: any) => {
        this.ngZone.run(() => {
          resetLoading();
          // 'popup_closed' y 'popup_failed_to_open' son cierres normales, no mostramos error
          if (err?.type !== 'popup_closed' && err?.type !== 'popup_failed_to_open') {
            this.errorMessage.set('Error al abrir el inicio de sesión de Google. Inténtalo de nuevo.');
          }
        });
      },

      callback: (tokenResponse: any) => {
        if (tokenResponse.error) {
          this.ngZone.run(() => {
            resetLoading();
            if (tokenResponse.error !== 'access_denied') {
              this.errorMessage.set('Error al autenticar con Google. Inténtalo de nuevo.');
            }
          });
          return;
        }

        // Enviamos el access_token al backend para validar con el endpoint userinfo de Google
        this.ngZone.run(() => {
          this.authService.loginWithGoogleAccessToken(tokenResponse.access_token).subscribe({
            next: () => {
              resetLoading();
              this.router.navigate(['/dashboard']);
            },
            error: (err: any) => {
              resetLoading();
              if (err.status === 403 && err.error?.status === 'pending_approval') {
                this.showPendingApproval.set(true);
                this.pendingEmail.set(err.error.email || '');
                this.authService.pendingApproval.set({
                  email: err.error.email,
                  name: err.error.name
                });
              } else if (err.status === 401) {
                this.errorMessage.set('Token de Google inválido. Inténtalo de nuevo.');
              } else {
                this.errorMessage.set(err.error?.error || 'Error al iniciar sesión con Google.');
              }
            }
          });
        });
      }
    });

    client.requestAccessToken();
  }

  private handleGoogleCredential(idToken: string) {
    this.isGoogleLoading.set(true);
    this.errorMessage.set('');

    this.authService.loginWithGoogle(idToken).subscribe({
      next: () => {
        this.isGoogleLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isGoogleLoading.set(false);
        if (err.status === 403 && err.error?.status === 'pending_approval') {
          this.showPendingApproval.set(true);
          this.pendingEmail.set(err.error.email || '');
          this.authService.pendingApproval.set({
            email: err.error.email,
            name: err.error.name
          });
        } else if (err.status === 401) {
          this.errorMessage.set('Token de Google inválido. Inténtalo de nuevo.');
        } else {
          this.errorMessage.set(err.error?.error || 'Error al iniciar sesión con Google.');
        }
      }
    });
  }

  clearPending() {
    this.showPendingApproval.set(false);
    this.pendingEmail.set('');
    this.authService.pendingApproval.set(null);
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Usuario o contraseña incorrectos.');
      }
    });
  }
}
