import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, take } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.authChecked).pipe(
    filter(checked => checked === true),
    take(1),
    map(() => {
      const user = authService.currentUser();
      const token = authService.getToken();

      if (token && user) {
        router.navigate(['/dashboard']);
        return false;
      }

      return true;
    })
  );
};
