import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { of, firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'TECNICO' | 'BODEGA' | 'PROVEEDOR' | 'PERSONALIZADO';
  permisos: string[];
  is_staff?: boolean;
  is_superuser?: boolean;
  is_approved?: boolean;
  avatar_url?: string;
  is_google_user?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private base = environment.apiUrl + '/auth';

  currentUser = signal<User | null>(null);
  authChecked = signal<boolean>(false);
  pendingApproval = signal<{email: string; name: string} | null>(null);

  hasRole(role: string): boolean {
    return this.currentUser()?.role === role;
  }

  hasPermission(perm: string): boolean {
    const user = this.currentUser();
    if (user?.role === 'ADMIN' || user?.is_superuser) return true;
    return user?.permisos?.includes(perm) || false;
  }


  isAdmin(): boolean {
    const user = this.currentUser();
    return user?.role === 'ADMIN' || user?.is_superuser === true || user?.is_staff === true;
  }

  // Se llamará desde APP_INITIALIZER
  async initAuth(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      this.authChecked.set(true);
      return;
    }

    const token = sessionStorage.getItem('access_token');
    const refresh = sessionStorage.getItem('refresh_token');

    if (!token) {
      this.authChecked.set(true);
      return;
    }

    try {
      // Intentar cargar usuario
      const user = await firstValueFrom(this.http.get<User>(`${this.base}/me/`));
      this.currentUser.set(user);
    } catch (error) {
      // Si falla (token expirado), intentar refrescar
      if (refresh) {
        try {
          const res = await firstValueFrom(this.http.post<any>(`${this.base}/refresh/`, { refresh }));
          sessionStorage.setItem('access_token', res.access);
          const user = await firstValueFrom(this.http.get<User>(`${this.base}/me/`));
          this.currentUser.set(user);
        } catch (refreshError) {
          this.logout();
        }
      } else {
        this.logout();
      }
    } finally {
      this.authChecked.set(true);
    }
  }

  login(credentials: any) {
    return this.http.post<any>(`${this.base}/login/`, credentials).pipe(
      tap(res => {
        if (isPlatformBrowser(this.platformId)) {
          sessionStorage.setItem('access_token', res.access);
          sessionStorage.setItem('refresh_token', res.refresh);
        }
      }),
      // Encadenamos la carga del usuario para que el login no termine hasta que el usuario esté listo
      switchMap(() => this.fetchCurrentUser())
    );
  }

  loginWithGoogle(idToken: string) {
    return this.http.post<any>(`${this.base}/google/`, { id_token: idToken }).pipe(
      tap(res => {
        if (isPlatformBrowser(this.platformId)) {
          sessionStorage.setItem('access_token', res.access);
          sessionStorage.setItem('refresh_token', res.refresh);
        }
        this.pendingApproval.set(null);
      }),
      switchMap(() => this.fetchCurrentUser())
    );
  }

  // Flujo OAuth2: recibe access_token (de google.accounts.oauth2.initTokenClient)
  loginWithGoogleAccessToken(accessToken: string) {
    return this.http.post<any>(`${this.base}/google/`, { access_token: accessToken }).pipe(
      tap(res => {
        if (isPlatformBrowser(this.platformId)) {
          sessionStorage.setItem('access_token', res.access);
          sessionStorage.setItem('refresh_token', res.refresh);
        }
        this.pendingApproval.set(null);
      }),
      switchMap(() => this.fetchCurrentUser())
    );
  }

  fetchCurrentUser() {
    return this.http.get<User>(`${this.base}/me/`).pipe(
      tap(user => this.currentUser.set(user))
    );
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
    }
    this.currentUser.set(null);
    this.pendingApproval.set(null);
    this.router.navigate(['/login']);
  }

  updateProfile(data: any) {
    return this.http.patch<User>(`${this.base}/me/`, data).pipe(
      tap(user => this.currentUser.set(user))
    );
  }

  changePassword(passwords: any) {
    return this.http.post<any>(`${this.base}/change-password/`, passwords);
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/users/`);
  }

  createUser(userData: any) {
    return this.http.post<User>(`${this.base}/users/create/`, userData);
  }

  updateUser(id: number, userData: any) {
    return this.http.patch<User>(`${this.base}/users/${id}/`, userData);
  }

  deleteUser(id: number) {
    return this.http.delete(`${this.base}/users/${id}/`);
  }

  approveUser(id: number) {
    return this.http.patch<User>(`${this.base}/users/${id}/approve/`, {});
  }

  getToken() {
    if (isPlatformBrowser(this.platformId)) {
      return sessionStorage.getItem('access_token');
    }
    return null;
  }
}
