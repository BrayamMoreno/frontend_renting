import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { InventarioItem, Recepcion } from '../models/app-state';

// Tipos que mapean directamente a los modelos del backend Django
export interface RecepcionPayload {
  entregador?: number;         // ID del Entregador normalizado (campo preferido)
  entregador_nombre?: string;  // Legacy fallback
  entregador_cedula?: string;  // Legacy fallback
  entregador_empresa?: string; // Legacy fallback
  entregador_foto?: string;
  entregador_firma?: string;
  receptor_nombre: string;
  receptor_firma?: string;
  receptor_foto?: string;
  proveedor?: number;          // Legacy: usado si no se envía entregador ID
}

export interface EntregadorPayload {
  id?: number;
  nombre: string;
  cedula: string;
  proveedor?: number | null;
  foto?: string;
  firma?: string;
}

export interface ProveedorPayload {
  id?: number;
  nombre: string;
  telefono?: string;
  contacto?: string;
}

export interface InventarioItemPayload {
  item?: number;
  tipo_producto?: string;
  marca?: string;
  modelo?: string;
  procesador?: string;
  disco?: string;
  tipo_disco?: string;
  ram?: string;
  serial: string;
  es_cambio?: boolean;
  cambio_por?: string;
  ubicacion?: string;
  comentarios?: string;
  comentario_devolucion?: string;
  estado?: string;
  recepcion?: number;
  devolucion?: number;
  metadata_ocr?: any;
  tecnico_asignado?: number;
  fecha_asignacion_alistamiento?: string;
  responsable_devolucion?: string;
  solicitante_cambio?: string;
  es_propio?: boolean;
  equipo_asociado?: number;
  id?: number;
  fecha_inicio_reemplazo?: string;
  equipo_reemplazante_serial?: string;
  fecha_ingreso?: string;
  creado_automaticamente?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ── Recepciones ──────────────────────────────────────────────────────────
  getRecepciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/recepciones/`);
  }

  createRecepcion(payload: RecepcionPayload): Observable<any> {
    return this.http.post<any>(`${this.base}/recepciones/`, payload);
  }

  // ── Proveedores ──────────────────────────────────────────────────────────
  getProveedores(): Observable<ProveedorPayload[]> {
    return this.http.get<ProveedorPayload[]>(`${this.base}/proveedores/`);
  }

  createProveedor(payload: ProveedorPayload): Observable<ProveedorPayload> {
    return this.http.post<ProveedorPayload>(`${this.base}/proveedores/`, payload);
  }

  updateProveedor(id: number, payload: Partial<ProveedorPayload>): Observable<ProveedorPayload> {
    return this.http.patch<ProveedorPayload>(`${this.base}/proveedores/${id}/`, payload);
  }

  deleteProveedor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/proveedores/${id}/`);
  }

  // ── Entregadores ─────────────────────────────────────────────────────────
  getEntregadores(): Observable<EntregadorPayload[]> {
    return this.http.get<EntregadorPayload[]>(`${this.base}/entregadores/`);
  }

  getEntregadorByCedula(cedula: string): Observable<EntregadorPayload[]> {
    return this.http.get<EntregadorPayload[]>(`${this.base}/entregadores/?cedula=${encodeURIComponent(cedula)}`);
  }

  createEntregador(payload: EntregadorPayload): Observable<EntregadorPayload> {
    return this.http.post<EntregadorPayload>(`${this.base}/entregadores/`, payload);
  }

  updateEntregador(id: number, payload: Partial<EntregadorPayload>): Observable<EntregadorPayload> {
    return this.http.patch<EntregadorPayload>(`${this.base}/entregadores/${id}/`, payload);
  }

  // ── Inventario ───────────────────────────────────────────────────────────
  getInventario(): Observable<InventarioItemPayload[]> {
    return this.http.get<InventarioItemPayload[]>(`${this.base}/inventario/`);
  }

  createInventarioItem(payload: InventarioItemPayload): Observable<InventarioItemPayload> {
    return this.http.post<InventarioItemPayload>(`${this.base}/inventario/`, payload);
  }

  updateInventarioItem(id: number, payload: Partial<InventarioItemPayload>): Observable<InventarioItemPayload> {
    return this.http.patch<InventarioItemPayload>(`${this.base}/inventario/${id}/`, payload);
  }

  deleteInventarioItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/inventario/${id}/`);
  }

  getHistorialItem(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/inventario/${id}/historial/`);
  }

  completarEquipoAutomatico(id: number, payload: Partial<InventarioItemPayload>): Observable<InventarioItemPayload> {
    return this.http.patch<InventarioItemPayload>(`${this.base}/inventario/${id}/completar/`, payload);
  }

  // ── Catálogos (Marcas y Tipos) ──────────────────────────────────────────
  getMarcas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/marcas/`);
  }
  createMarca(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/marcas/`, payload);
  }
  deleteMarca(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/marcas/${id}/`);
  }

  getTiposProducto(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/tipos-producto/`);
  }
  createTipoProducto(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/tipos-producto/`, payload);
  }
  deleteTipoProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/tipos-producto/${id}/`);
  }
  updateTipoProducto(id: number, payload: any): Observable<any> {
    return this.http.patch<any>(`${this.base}/tipos-producto/${id}/`, payload);
  }

  getTiposDisco(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/tipos-disco/`);
  }
  createTipoDisco(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/tipos-disco/`, payload);
  }
  deleteTipoDisco(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/tipos-disco/${id}/`);
  }
  updateTipoDisco(id: number, payload: any): Observable<any> {
    return this.http.patch<any>(`${this.base}/tipos-disco/${id}/`, payload);
  }

  getProcesadores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/procesadores/`);
  }
  createProcesador(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/procesadores/`, payload);
  }
  deleteProcesador(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/procesadores/${id}/`);
  }

  getRam(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/ram/`);
  }
  createRam(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/ram/`, payload);
  }
  deleteRam(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/ram/${id}/`);
  }

  getDiscos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/discos/`);
  }
  createDisco(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/discos/`, payload);
  }
  deleteDisco(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/discos/${id}/`);
  }


  getUbicaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/ubicaciones/`);
  }
  createUbicacion(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/ubicaciones/`, payload);
  }
  deleteUbicacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/ubicaciones/${id}/`);
  }

  getPuntosAlistamiento(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/puntos-alistamiento/`);
  }
  createPuntoAlistamiento(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/puntos-alistamiento/`, payload);
  }
  updatePuntoAlistamiento(id: number, payload: any): Observable<any> {
    return this.http.patch<any>(`${this.base}/puntos-alistamiento/${id}/`, payload);
  }
  deletePuntoAlistamiento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/puntos-alistamiento/${id}/`);
  }

  // ── Devoluciones ────────────────────────────────────────────────────────
  getDevoluciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/devoluciones/`);
  }

  createDevolucion(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/devoluciones/`, payload);
  }

  updateDevolucion(id: number, payload: any): Observable<any> {
    return this.http.patch<any>(`${this.base}/devoluciones/${id}/`, payload);
  }

  deleteDevolucion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/devoluciones/${id}/`);
  }

  // ── Roles y Permisos ──────────────────────────────────────────────────
  getRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/roles/`);
  }

  createRol(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/roles/`, payload);
  }

  updateRol(id: number, payload: any): Observable<any> {
    return this.http.patch<any>(`${this.base}/roles/${id}/`, payload);
  }

  deleteRol(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/roles/${id}/`);
  }

  getPermisos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/permisos/`);
  }

  getAlistamientos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/alistamientos/`);
  }

  createAlistamiento(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/alistamientos/`, payload);
  }

  // ── Alertas Críticas ──────────────────────────────────────────────────
  getAlertas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/alertas/`);
  }

  getAlertasNoLeidas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/alertas/no-leidas/`);
  }

  marcarAlertaLeida(id: number): Observable<any> {
    return this.http.patch<any>(`${this.base}/alertas/${id}/marcar-leida/`, {});
  }

  marcarTodasAlertsLeidas(): Observable<any> {
    return this.http.patch<any>(`${this.base}/alertas/marcar-todas-leidas/`, {});
  }

  verificarAlertas(): Observable<any> {
    return this.http.post<any>(`${this.base}/inventario/verificar-alertas/`, {});
  }

  // ── Equipos en Espera de Devolución ──────────────────────────────────
  getEnEsperaDevolucion(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/inventario/en-espera-devolucion/`);
  }

  // ── Estadísticas por persona ──────────────────────────────────────────
  getUserPending(startDate?: string, endDate?: string): Observable<any[]> {
    let params: any = {};
    if (startDate) params['start_date'] = startDate;
    if (endDate) params['end_date'] = endDate;
    return this.http.get<any[]>(`${this.base}/user-pending/`, { params });
  }

  // ── Configuración de Correos de Baja por Categoría ────────────────────────
  getConfiguracionesEmailBaja(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/configuraciones-email-baja/`);
  }
  createConfiguracionEmailBaja(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/configuraciones-email-baja/`, payload);
  }
  updateConfiguracionEmailBaja(id: number, payload: any): Observable<any> {
    return this.http.patch<any>(`${this.base}/configuraciones-email-baja/${id}/`, payload);
  }
  deleteConfiguracionEmailBaja(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/configuraciones-email-baja/${id}/`);
  }

  // ── Gestor de Backups Condicionales y Manuales ─────────────────────────────
  getBackups(): Observable<{ backups: any[]; hay_cambios_pendientes: boolean; ultimo_cambio: any }> {
    return this.http.get<any>(`${this.base}/backups/`);
  }

  generarBackup(modo: 'condicional' | 'manual' = 'condicional'): Observable<any> {
    return this.http.post<any>(`${this.base}/backups/generar/`, { modo });
  }

  descargarBackupUrl(filename: string): string {
    return `${this.base}/backups/descargar/?filename=${encodeURIComponent(filename)}`;
  }

  eliminarBackup(filename: string): Observable<any> {
    return this.http.delete<any>(`${this.base}/backups/eliminar/?filename=${encodeURIComponent(filename)}`);
  }
}


