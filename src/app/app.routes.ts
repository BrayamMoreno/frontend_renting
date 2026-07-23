import {Routes} from '@angular/router';
import {authGuard} from './guards/auth.guard';
import {noAuthGuard} from './guards/no-auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { 
    path: 'login', 
    canActivate: [noAuthGuard],
    loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent) 
  },
  { 
    path: 'dashboard', 
    canActivate: [authGuard],
    data: { permission: 'ver_dashboard' },
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) 
  },
  { 
    path: 'ingreso', 
    canActivate: [authGuard],
    data: { permission: 'gestionar_inventario' },
    loadComponent: () => import('./pages/ingreso/ingreso.component').then(m => m.IngresoComponent) 
  },
  { 
    path: 'historial-entregas', 
    canActivate: [authGuard],
    data: { permission: 'ver_inventario' },
    loadComponent: () => import('./pages/ingreso/historial-entregas.component').then(m => m.HistorialEntregasComponent) 
  },
  { 
    path: 'inventario', 
    canActivate: [authGuard],
    data: { permission: 'ver_inventario' },
    loadComponent: () => import('./pages/inventario/inventario.component').then(m => m.InventarioComponent) 
  },
  { 
    path: 'bajas', 
    canActivate: [authGuard],
    data: { permission: 'ver_inventario' },
    loadComponent: () => import('./pages/inventario/bajas.component').then(m => m.BajasComponent) 
  },
  { 
    path: 'alistamiento', 
    canActivate: [authGuard],
    data: { permission: 'gestionar_inventario' },
    loadComponent: () => import('./pages/alistamiento/alistamiento.component').then(m => m.AlistamientoComponent) 
  },
  { 
    path: 'devoluciones', 
    canActivate: [authGuard],
    data: { permission: ['generar_devolucion', 'aprobar_devolucion'] },
    loadComponent: () => import('./pages/devoluciones/devoluciones.component').then(m => m.DevolucionesComponent) 
  },
  { 
    path: 'confirmacion-proveedor', 
    canActivate: [authGuard],
    data: { permission: 'confirmar_devolucion' },
    loadComponent: () => import('./pages/devoluciones/confirmacion-proveedor.component').then(m => m.ConfirmacionProveedorComponent) 
  },
  { 
    path: 'historial-devoluciones', 
    canActivate: [authGuard],
    data: { permission: 'ver_inventario' },
    loadComponent: () => import('./pages/devoluciones/historial-devoluciones.component').then(m => m.HistorialDevolucionesComponent) 
  },
  { 
    path: 'pendientes-devolucion', 
    canActivate: [authGuard],
    data: { permission: 'aprobar_devolucion' },
    loadComponent: () => import('./pages/devoluciones/pendientes-devolucion.component').then(m => m.PendientesDevolucionComponent) 
  },
  { 
    path: 'generar-acta', 
    canActivate: [authGuard],
    data: { permission: 'gestionar_inventario' },
    loadComponent: () => import('./pages/acta-entrega-manual/acta-entrega-manual').then(m => m.ActaEntregaManualComponent) 
  },
  { 
    path: 'profile', 
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent) 
  },
  { 
    path: 'catalogos', 
    canActivate: [authGuard],
    data: { permission: 'gestionar_catalogos' },
    loadComponent: () => import('./pages/catalogos/catalogos.component').then(m => m.CatalogosComponent) 
  },
  { 
    path: 'users', 
    canActivate: [authGuard],
    data: { permission: 'gestionar_usuarios' },
    loadComponent: () => import('./pages/users/users').then(m => m.UsersComponent) 
  },
  { 
    path: 'roles', 
    canActivate: [authGuard],
    data: { permission: 'gestionar_usuarios' },
    loadComponent: () => import('./pages/users/roles.component').then(m => m.RolesComponent) 
  },
  { 
    path: 'backups', 
    canActivate: [authGuard],
    data: { permission: 'gestionar_usuarios' },
    loadComponent: () => import('./pages/backups/backups.component').then(m => m.BackupsComponent) 
  },
];
