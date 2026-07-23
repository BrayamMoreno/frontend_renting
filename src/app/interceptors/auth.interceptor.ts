import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const storage = inject(StorageService);
  const router = inject(Router);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/login')) {
        authService.logout();
      }

      // Interceptar bloqueo por ausencia de Backup Diario al intentar modificar Usuarios, Roles o Catálogos
      if (
        error.status === 403 &&
        (error.error?.code === 'BACKUP_REQUIRED_TODAY' ||
          (typeof error.error?.detail === 'string' && error.error.detail.toLowerCase().includes('backup')))
      ) {
        const message = error.error?.detail || 
          'Acción bloqueada: Para modificar datos de la configuración del sistema (Usuarios, Roles o Catálogos), se requiere haber realizado una copia de seguridad para el día de hoy.';
        
        // Disparar Modal Pop-up en la interfaz del aplicativo
        storage.showBackupRequiredModal(message);
      }

      return throwError(() => error);
    })
  );
};
