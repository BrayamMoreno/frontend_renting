import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, take } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Convertimos la señal authChecked a un Observable para esperar a que sea true
  return toObservable(authService.authChecked).pipe(
    filter(checked => checked === true), // Solo continuamos cuando ya se ha verificado el token
    take(1), // Nos aseguramos de completar el observable
    map(() => {
      const user = authService.currentUser();
      const token = authService.getToken();

      if (token && user) {
        // Si es administrador (por rol o por flags de Django), tiene acceso total
        if (authService.isAdmin()) {
          return true;
        }

        const requiredRole = route.data['role'];
        const requiredPermission = route.data['permission'];
        
        // Si no hay rol ni permiso requerido, cualquier usuario autenticado pasa
        if (!requiredRole && !requiredPermission) {
          return true;
        }

        // Prioridad al permiso si existe
        if (requiredPermission) {
          if (Array.isArray(requiredPermission)) {
            if (requiredPermission.some(p => authService.hasPermission(p))) {
              return true;
            }
          } else {
            if (authService.hasPermission(requiredPermission)) {
              return true;
            }
          }
        } else if (requiredRole) {
          // Si hay un rol requerido, verificamos que el usuario lo tenga
          if (user.role === requiredRole) {
            return true;
          }
        }


        // Si no tiene el permiso/rol y no es admin, redirigir al perfil (ruta segura)
        router.navigate(['/profile']);
        return false;
      }

      // Si no hay token o no hay usuario tras la verificación, al login
      router.navigate(['/login']);
      return false;
    })
  );
};
