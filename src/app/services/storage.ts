import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import {
  AppState, Recepcion, InventarioItem, Asset, AssetStatus,
  ChecklistTemplate, Alistamiento, Devolucion, AlertaCritica
} from '../models/app-state';
import { ApiService, RecepcionPayload, InventarioItemPayload } from './api';

const STORAGE_KEY = 'RENTING_MANAGER_STATE';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private platformId = inject(PLATFORM_ID);
  private api = inject(ApiService);

  private initialState: AppState = {
    recepciones: [],
    inventario: {},
    configuracion: {
      checklist_templates: [
        {
          id: 'def-1',
          nombre: 'Alistamiento Básico Laptop',
          preguntas: [
            { id: 'p1', pregunta: '¿Enciende correctamente?', tipo: 'boolean' },
            { id: 'p2', pregunta: 'Estado de pantalla', tipo: 'select', options: ['Sin rayones', 'Rayón leve', 'Manchas', 'Rota'] },
            { id: 'p3', pregunta: 'Teclado funcional', tipo: 'boolean' },
            { id: 'p4', pregunta: 'Observaciones extra', tipo: 'text' }
          ]
        }
      ]
    },
    alistamientos: [],
    devoluciones: [],
    alertas: []
  };

  private stateSignal = signal<AppState>(this.initialState);

  // --- Caché con TTL para evitar re-fetch innecesario al cambiar de módulo ---
  private _lastInventarioLoad = 0;
  private _lastRecepcionesLoad = 0;
  private _lastDevolucionesLoad = 0;
  private _lastAlistamientosLoad = 0;
  private _lastAlertasLoad = 0;
  private readonly CACHE_TTL_MS = 30_000; // 30 segundos

  /** Invalida el caché de inventario para forzar recarga en la próxima navegación. */
  private _invalidateInventarioCache(): void {
    this._lastInventarioLoad = 0;
  }
  /** Invalida el caché de recepciones. */
  private _invalidateRecepcionesCache(): void {
    this._lastRecepcionesLoad = 0;
  }

  // Señal de carga de API
  isLoading = signal(false);
  apiError = signal<string | null>(null);

  // Modal Global de Requerimiento de Backup
  backupRequiredModal = signal<{ visible: boolean; message: string }>({ visible: false, message: '' });

  showBackupRequiredModal(message: string) {
    this.backupRequiredModal.set({ visible: true, message });
  }

  closeBackupRequiredModal() {
    this.backupRequiredModal.set({ visible: false, message: '' });
  }

  private updateState(newState: AppState) {
    this.stateSignal.set(newState);
  }

  // Selectores
  recepciones = computed(() => this.stateSignal().recepciones);
  inventario = computed(() => Object.values(this.stateSignal().inventario));
  templates = computed(() => this.stateSignal().configuracion.checklist_templates);
  alistamientos = computed(() => this.stateSignal().alistamientos);
  devoluciones = computed(() => this.stateSignal().devoluciones);
  alertas = computed(() => this.stateSignal().alertas);
  alertasNoLeidas = computed(() => this.stateSignal().alertas.filter(a => !a.leida));

  /**
   * Carga el inventario desde el backend y sincroniza el estado local.
   * @param forceRefresh Si es true, ignora el caché y siempre recarga desde la API.
   */
  async loadInventarioFromApi(forceRefresh = false): Promise<void> {
    const now = Date.now();
    // Retornar inmediatamente si los datos son frescos (dentro del TTL) y no se fuerza recarga
    if (!forceRefresh && this._lastInventarioLoad > 0 && (now - this._lastInventarioLoad) < this.CACHE_TTL_MS) {
      return;
    }
    this.isLoading.set(true);
    this.apiError.set(null);
    try {
      const items = await firstValueFrom(this.api.getInventario());
      const inventarioMap: Record<string, InventarioItem> = {};
      items.forEach((item: any) => {
        inventarioMap[item.serial] = {
          item: item.item,
          tipo_producto: item.tipo_producto,
          marca: item.marca,
          modelo: item.modelo,
          procesador: item.procesador,
          disco: item.disco,
          tipo_disco: item.tipo_disco,
          ram: item.ram,
          serial: item.serial,
          es_cambio: item.es_cambio,
          cambio_por: item.cambio_por,
          ubicacion: item.ubicacion,
          comentarios: item.comentarios,
          comentario_devolucion: item.comentario_devolucion,
          estado: item.estado as AssetStatus,
          id_recepcion_origen: item.recepcion?.toString() ?? '',
          id_devolucion: item.devolucion,
          fecha_ingreso: item.fecha_ingreso,
          fecha_baja: item.fecha_baja ?? undefined,
          metadata_ocr: item.metadata_ocr,
          tecnico_asignado: item.tecnico_asignado,
          tecnico_asignado_nombre: item.tecnico_asignado_nombre,
          fecha_asignacion_alistamiento: item.fecha_asignacion_alistamiento,
          responsable_devolucion: item.responsable_devolucion,
          es_propio: item.es_propio,
          equipo_asociado: item.equipo_asociado,
          _backendId: item.id,  // guardamos el id para updates
          creado_automaticamente: item.creado_automaticamente ?? false
        };
      });
      const currentState = this.stateSignal();
      this.updateState({ ...currentState, inventario: inventarioMap });
      this._lastInventarioLoad = Date.now();
    } catch (e: any) {
      console.error('Error cargando inventario desde API:', e);
      this.apiError.set('No se pudo conectar con el servidor.');
    } finally {
      this.isLoading.set(false);
      // Cargar datos secundarios en PARALELO (no secuencial) para reducir latencia total
      await Promise.all([
        this.loadDevolucionesFromApi(),
        this.loadAlistamientosFromApi(),
        this.loadAlertasFromApi(),
      ]);
    }
  }

  async loadRecepcionesFromApi(forceRefresh = false): Promise<void> {
    const now = Date.now();
    if (!forceRefresh && this._lastRecepcionesLoad > 0 && (now - this._lastRecepcionesLoad) < this.CACHE_TTL_MS) {
      return;
    }
    try {
      const raw = await firstValueFrom(this.api.getRecepciones());
      // El backend devuelve campos planos (entregador_foto, entregador_nombre, etc.)
      // Los mapeamos al formato anidado que usa el frontend (rec.entregador.foto, etc.)
      const recepciones: Recepcion[] = raw.map((r: any) => ({
        id: r.id.toString(),
        fecha: r.fecha,
        proveedor: r.proveedor,
        proveedor_nombre: r.proveedor_nombre,
        entregador: {
          nombre: r.entregador_nombre ?? '',
          cedula: r.entregador_cedula ?? '',
          empresa: r.entregador_empresa ?? '',
          foto: r.entregador_foto ?? undefined,
          firma: r.entregador_firma ?? undefined,
        },
        receptor: {
          nombre: r.receptor_nombre ?? '',
          foto: r.receptor_foto ?? undefined,
          firma: r.receptor_firma ?? undefined,
        },
        equipos: r.equipos ?? [],
      }));
      const currentState = this.stateSignal();
      this.updateState({ ...currentState, recepciones });
      this._lastRecepcionesLoad = Date.now();
    } catch (e) {
      console.error('Error cargando recepciones:', e);
    }
  }

  async loadDevolucionesFromApi(forceRefresh = false): Promise<void> {
    const now = Date.now();
    if (!forceRefresh && this._lastDevolucionesLoad > 0 && (now - this._lastDevolucionesLoad) < this.CACHE_TTL_MS) {
      return;
    }
    try {
      const devoluciones = await firstValueFrom(this.api.getDevoluciones());
      const currentState = this.stateSignal();
      this.updateState({ ...currentState, devoluciones });
      this._lastDevolucionesLoad = Date.now();
    } catch (e) {
      console.error('Error cargando devoluciones:', e);
    }
  }

  async loadAlistamientosFromApi(forceRefresh = false): Promise<void> {
    const now = Date.now();
    if (!forceRefresh && this._lastAlistamientosLoad > 0 && (now - this._lastAlistamientosLoad) < this.CACHE_TTL_MS) {
      return;
    }
    try {
      const alistamientos = await firstValueFrom(this.api.getAlistamientos());
      const currentState = this.stateSignal();
      this.updateState({ ...currentState, alistamientos });
      this._lastAlistamientosLoad = Date.now();
    } catch (e) {
      console.error('Error cargando alistamientos:', e);
    }
  }

  async loadAlertasFromApi(forceRefresh = false): Promise<void> {
    const now = Date.now();
    if (!forceRefresh && this._lastAlertasLoad > 0 && (now - this._lastAlertasLoad) < this.CACHE_TTL_MS) {
      return;
    }
    try {
      const alertas = await firstValueFrom(this.api.getAlertas());
      const currentState = this.stateSignal();
      this.updateState({ ...currentState, alertas });
      this._lastAlertasLoad = Date.now();
    } catch (e) {
      console.error('Error cargando alertas:', e);
    }
  }

  async marcarAlertaLeida(id: number): Promise<void> {
    await firstValueFrom(this.api.marcarAlertaLeida(id));
    await this.loadAlertasFromApi(true);
  }

  async marcarTodasAlertsLeidas(): Promise<void> {
    await firstValueFrom(this.api.marcarTodasAlertsLeidas());
    await this.loadAlertasFromApi(true);
  }

  /**
   * Guarda una recepción completa: primero crea la Recepcion en el backend,
   * luego registra cada equipo vinculado a ella. Finalmente sincroniza el estado local.
   */
  async addRecepcion(recepcion: Recepcion): Promise<void> {
    this.isLoading.set(true);
    this.apiError.set(null);
    const currentState = this.stateSignal();
    try {
      // ── 1. Crear o actualizar el Entregador normalizado ────────────────
      let entregadorId: number | undefined = recepcion.entregador_id;

      if (!entregadorId && recepcion.entregador.cedula) {
        const entregadorPayload = {
          nombre: recepcion.entregador.nombre,
          cedula: recepcion.entregador.cedula,
          proveedor: recepcion.proveedor ?? null,
          foto: recepcion.entregador.foto,
          firma: recepcion.entregador.firma,
        };

        // Buscar si ya existe por cédula
        const existentes = await firstValueFrom(this.api.getEntregadorByCedula(recepcion.entregador.cedula));
        if (existentes && existentes.length > 0) {
          const existente = existentes[0] as any;
          // Actualizar foto, firma y proveedor al más reciente
          await firstValueFrom(this.api.updateEntregador(existente.id, {
            nombre: entregadorPayload.nombre,
            proveedor: entregadorPayload.proveedor,
            foto: entregadorPayload.foto,
            firma: entregadorPayload.firma,
          }));
          entregadorId = existente.id;
        } else {
          // Crear nuevo entregador
          const creado = await firstValueFrom(this.api.createEntregador(entregadorPayload)) as any;
          entregadorId = creado.id;
        }
      }

      // ── 2. Crear la Recepcion con FK del entregador ────────────────────
      const payload: RecepcionPayload = {
        entregador: entregadorId,
        receptor_nombre: recepcion.receptor.nombre,
        receptor_firma: recepcion.receptor.firma,
        receptor_foto: recepcion.receptor.foto,
        entregador_foto: recepcion.entregador.foto,
        entregador_firma: recepcion.entregador.firma,
      };
      const createdRecepcion = await firstValueFrom(this.api.createRecepcion(payload));
      const recepcionId: number = createdRecepcion.id;

      // 2. Crear cada equipo vinculado a esa recepción (paso 1: enviar sin asociaciones provisionales locales)
      const equipoPromises = recepcion.equipos.map(equipo => {
        // Si equipo_asociado corresponde a un ID real en la base de datos (ya existente), lo enviamos tal cual.
        // Si no, asumimos que es una asociación provisional por número de ítem local y lo dejamos como null para resolverlo después.
        const isDbId = equipo.equipo_asociado ? Object.values(currentState.inventario).some(a => a._backendId === equipo.equipo_asociado) : false;

        const itemPayload: InventarioItemPayload = {
          item: equipo.item,
          tipo_producto: equipo.tipo_producto,
          marca: equipo.marca,
          modelo: equipo.modelo,
          procesador: equipo.procesador,
          disco: equipo.disco,
          tipo_disco: equipo.tipo_disco,
          ram: equipo.ram,
          serial: equipo.serial,
          es_cambio: equipo.es_cambio,
          cambio_por: equipo.cambio_por,
          es_propio: equipo.es_propio,
          ubicacion: equipo.ubicacion,
          comentarios: equipo.comentarios,
          equipo_asociado: isDbId ? equipo.equipo_asociado : undefined,
          estado: 'RECIBIDO',
          recepcion: recepcionId,
        };
        return firstValueFrom(this.api.createInventarioItem(itemPayload));
      });
      const createdEquipos = await Promise.all(equipoPromises);

      // Mapear número de ítem local -> ID de base de datos de los equipos recién creados
      const itemToIdMap = new Map<number, number>();
      createdEquipos.forEach((eq: any) => {
        if (eq.item) {
          itemToIdMap.set(Number(eq.item), eq.id);
        }
      });

      // Paso 2: Para cada equipo que tenía una asociación provisional local por número de ítem,
      // actualizamos el registro en la base de datos con el ID real del equipo principal.
      const resolvedEquiposPromises = createdEquipos.map(async (createdItem: any) => {
        const original = recepcion.equipos.find(e => e.serial === createdItem.serial);
        if (original && original.equipo_asociado) {
          const isDbId = Object.values(currentState.inventario).some(a => a._backendId === original.equipo_asociado);
          if (!isDbId) {
            const realId = itemToIdMap.get(Number(original.equipo_asociado));
            if (realId) {
              const updated = await firstValueFrom(this.api.updateInventarioItem(createdItem.id, { equipo_asociado: realId }));
              return updated;
            }
          }
        }
        return createdItem;
      });

      const finalizedEquipos = await Promise.all(resolvedEquiposPromises);

      // 2.5 Procesar los equipos reemplazados (cambios) — se marcan como EN_ESPERA_DEVOLUCION, sin responsable aún
      const replacementsPromises = recepcion.equipos
        .filter(eq => eq.es_cambio && eq.cambio_por)
        .map(async eq => {
          const itemNumStr = String(eq.cambio_por).trim();
          const itemNum = Number(itemNumStr);
          if (isNaN(itemNum)) return null;

          const oldAsset = Object.values(currentState.inventario).find(a => a.item === itemNum);

          if (oldAsset && oldAsset._backendId) {
            const nuevoEstado = 'EN_ESPERA_DEVOLUCION';
            await firstValueFrom(this.api.updateInventarioItem(oldAsset._backendId, { 
              estado: nuevoEstado
            }));
            return { action: 'updated', serial: oldAsset.serial, estado: nuevoEstado };
          } else {
            const ghostPayload: InventarioItemPayload = {
              item: itemNum,
              serial: `CAMBIO-${itemNumStr}-${Date.now()}`,
              marca: 'NO REGISTRADA',
              modelo: 'NO REGISTRADO',
              estado: 'EN_ESPERA_DEVOLUCION',
              comentarios: `Creado automáticamente por ingreso de equipo de cambio (Reemplazado por ${eq.serial})`
            };
            const createdGhost = await firstValueFrom(this.api.createInventarioItem(ghostPayload));
            return { action: 'created', createdGhost };
          }
        });

      const replacementsResults = await Promise.all(replacementsPromises);

      // 3. Actualizar caché local
      const updatedRecepciones = [...currentState.recepciones, recepcion];
      const updatedInventario = { ...currentState.inventario };
      
      // Guardar en caché los equipos recibidos
      finalizedEquipos.forEach((createdItem: any) => {
        updatedInventario[createdItem.serial] = {
          ...createdItem,
          id_recepcion_origen: recepcionId.toString(),
          _backendId: createdItem.id
        };
      });

      // Guardar en caché los equipos reemplazados actualizados o creados
      replacementsResults.forEach(res => {
        if (!res) return;
        if (res.action === 'updated' && res.serial && updatedInventario[res.serial]) {
          updatedInventario[res.serial] = {
            ...updatedInventario[res.serial],
            estado: (res as any).estado,
            tecnico_asignado: undefined,
            tecnico_asignado_nombre: undefined,
            fecha_asignacion_alistamiento: undefined,
            responsable_devolucion: undefined
          };
        } else if (res.action === 'created' && res.createdGhost) {
          updatedInventario[res.createdGhost.serial] = {
            ...res.createdGhost,
            id_recepcion_origen: '',
            fecha_ingreso: res.createdGhost.fecha_ingreso || new Date().toISOString(),
            _backendId: (res.createdGhost as any).id
          } as any;
        }
      });
      this.updateState({
        ...currentState,
        recepciones: updatedRecepciones,
        inventario: updatedInventario
      });
    } catch (e: any) {
      console.error('Error guardando recepción en API:', e);
      this.apiError.set('Error al guardar en el servidor.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateAssetStatus(serial: string, status: AssetStatus, extraFields: Partial<any> = {}): Promise<void> {
    const currentState = this.stateSignal();
    const asset = currentState.inventario[serial] as any;
    if (!asset) return;

    // Actualizar local primero (optimistic update)
    const updatedInventario = { ...currentState.inventario };
    updatedInventario[serial] = { ...updatedInventario[serial], estado: status, ...extraFields };
    this.updateState({ ...currentState, inventario: updatedInventario });

    // Intentar sincronizar con backend si tenemos el ID
    if (asset._backendId) {
      try {
        const response: any = await firstValueFrom(this.api.updateInventarioItem(asset._backendId, { estado: status, ...extraFields }));
        // Actualizar el estado local con la respuesta real del backend
        // (el backend puede haber asignado campos como fecha_baja automáticamente)
        if (response) {
          const latestState = this.stateSignal();
          const refreshedInventario = { ...latestState.inventario };
          refreshedInventario[serial] = {
            ...refreshedInventario[serial],
            fecha_baja: response.fecha_baja ?? refreshedInventario[serial].fecha_baja,
            fecha_inicio_reemplazo: response.fecha_inicio_reemplazo ?? refreshedInventario[serial].fecha_inicio_reemplazo,
            estado: response.estado ?? status,
          };
          this.updateState({ ...latestState, inventario: refreshedInventario });
        }
      } catch (e) {
        console.error('Error actualizando estado en API:', e);
      }
    }
  }

  async assignAlistamiento(serial: string, tecnicoId: number, tecnicoNombre: string): Promise<void> {
    const currentState = this.stateSignal();
    const asset = currentState.inventario[serial] as any;
    if (!asset || !asset._backendId) return;
    
    this.isLoading.set(true);
    try {
      const fecha = new Date().toISOString();
      await firstValueFrom(this.api.updateInventarioItem(asset._backendId, {
        estado: 'ALISTAMIENTO',
        tecnico_asignado: tecnicoId,
        fecha_asignacion_alistamiento: fecha
      }));
      
      const updatedInventario = { ...currentState.inventario };
      updatedInventario[serial] = { 
        ...updatedInventario[serial], 
        estado: 'ALISTAMIENTO',
        tecnico_asignado: tecnicoId,
        tecnico_asignado_nombre: tecnicoNombre,
        fecha_asignacion_alistamiento: fecha
      };

      // Si el equipo es un cambio, asignar al técnico como responsable de devolver
      // el equipo antiguo que está siendo reemplazado.
      if (asset.es_cambio && asset.cambio_por) {
        const itemNum = Number(String(asset.cambio_por).trim());
        if (!isNaN(itemNum)) {
          const oldAsset = Object.values(currentState.inventario).find(
            (a: any) => a.item === itemNum &&
              (a.estado === 'EN_ESPERA_DEVOLUCION' || a.estado === 'PENDIENTE_DEVOLUCION')
          ) as any;
          if (oldAsset?._backendId) {
            // Actualizar responsable en backend
            await firstValueFrom(this.api.updateInventarioItem(
              oldAsset._backendId,
              { responsable_devolucion: tecnicoNombre }
            ));
            // Actualizar cache local del equipo viejo
            updatedInventario[oldAsset.serial] = {
              ...updatedInventario[oldAsset.serial],
              responsable_devolucion: tecnicoNombre
            };
          }
        }
      }

      this.updateState({ ...currentState, inventario: updatedInventario });
    } catch (e) {
      console.error('Error asignando alistamiento:', e);
      throw e;
    } finally {
      this.isLoading.set(false);
    }
  }

  async addAlistamiento(alistamiento: Alistamiento): Promise<void> {
    this.isLoading.set(true);
    try {
      const currentState = this.stateSignal();
      
      // 1. Persistir el registro de alistamiento en el backend
      const asset = currentState.inventario[alistamiento.serial] as any;
      const alistamientoPayload = {
        inventario_item: alistamiento.inventario_item,
        tecnico: alistamiento.tecnico,
        foto_tecnico: alistamiento.foto_tecnico,
        respuestas: alistamiento.respuestas
      };
      await firstValueFrom(this.api.createAlistamiento(alistamientoPayload));

      // 2. Actualizar estado del activo en el inventario (Backend)
      if (asset?._backendId) {
        await firstValueFrom(this.api.updateInventarioItem(asset._backendId, { estado: 'DISPONIBLE' }));
      }

      // 2.5 Si el equipo alistado es un cambio, poner el equipo viejo en EN_ESPERA_DEVOLUCION
      //     y asignar al alistador como responsable.
      const updatedInventario = { ...currentState.inventario };
      if (asset?.es_cambio && asset?.cambio_por) {
        const itemNumStr = String(asset.cambio_por).trim();
        const itemNum = Number(itemNumStr);
        if (!isNaN(itemNum)) {
          const oldAsset = Object.values(currentState.inventario).find(
            (a: any) => a.item === itemNum
          ) as any;
          if (oldAsset?._backendId) {
            // Actualizar estado y responsable en backend
            await firstValueFrom(this.api.updateInventarioItem(
              oldAsset._backendId,
              { 
                estado: 'EN_ESPERA_DEVOLUCION',
                responsable_devolucion: alistamiento.tecnico_nombre,
                fecha_inicio_reemplazo: new Date().toISOString(),
                equipo_reemplazante_serial: alistamiento.serial
              }
            ));
            // Actualizar cache local del equipo viejo
            updatedInventario[oldAsset.serial] = {
              ...updatedInventario[oldAsset.serial],
              estado: 'EN_ESPERA_DEVOLUCION',
              responsable_devolucion: alistamiento.tecnico_nombre,
              fecha_inicio_reemplazo: new Date().toISOString(),
              equipo_reemplazante_serial: alistamiento.serial
            };
          } else {
            // Crear nuevo registro (ghost) con estado EN_ESPERA_DEVOLUCION y responsable
            const ghostPayload: InventarioItemPayload = {
              item: itemNum,
              serial: `CAMBIO-${itemNumStr}-${Date.now()}`,
              marca: 'NO REGISTRADA',
              modelo: 'NO REGISTRADO',
              estado: 'EN_ESPERA_DEVOLUCION',
              responsable_devolucion: alistamiento.tecnico_nombre,
              fecha_inicio_reemplazo: new Date().toISOString(),
              equipo_reemplazante_serial: alistamiento.serial,
              comentarios: `Creado automáticamente por alistamiento de equipo de cambio (Reemplazado por ${alistamiento.serial})`
            };
            const createdGhost = await firstValueFrom(this.api.createInventarioItem(ghostPayload));
            updatedInventario[createdGhost.serial] = {
              ...createdGhost,
              id_recepcion_origen: '',
              fecha_ingreso: createdGhost.fecha_ingreso || new Date().toISOString(),
              _backendId: createdGhost.id
            } as any;
          }
        }
      }

      // 3. Actualizar estado local del equipo alistado
      const updatedAlistamientos = [...currentState.alistamientos, alistamiento];
      if (updatedInventario[alistamiento.serial]) {
        updatedInventario[alistamiento.serial] = {
          ...updatedInventario[alistamiento.serial],
          estado: 'DISPONIBLE'
        };
      }

      this.updateState({
        ...currentState,
        alistamientos: updatedAlistamientos,
        inventario: updatedInventario
      });

    } catch (e) {
      console.error('Error al guardar el alistamiento:', e);
      throw e; // Propagamos el error para que el componente lo maneje si es necesario
    } finally {
      this.isLoading.set(false);
    }
  }

  // Utilidad para buscar equipos por serial o item (retorna el primero encontrado)
  getAsset(query: string): InventarioItem | undefined {
    const inventario = this.stateSignal().inventario;
    const cleanQuery = query.trim().toUpperCase();
    if (!cleanQuery) return undefined;

    // Buscar coincidencia insensible a mayúsculas/minúsculas en seriales
    const match = Object.values(inventario).find(a => (a.serial || '').toUpperCase() === cleanQuery);
    if (match) {
      return match;
    }
    const itemNum = Number(cleanQuery);
    if (!isNaN(itemNum)) {
      return Object.values(inventario).find(a => a.item === itemNum);
    }
    return undefined;
  }

  // Utilidad para buscar equipos por serial o item y traer relacionados de forma unívoca por ID de base de datos
  getAssets(query: string): InventarioItem[] {
    const inventario = Object.values(this.stateSignal().inventario);
    const resultsMap = new Map<string, InventarioItem>();
    
    // 1. Encontrar coincidencias directas por serial o por número de ítem (mayúsculas y minúsculas unificadas)
    const directMatches: InventarioItem[] = [];
    
    const cleanQuery = query.trim().toUpperCase();
    if (!cleanQuery) return [];

    const exactMatch = inventario.find(a => (a.serial || '').toUpperCase() === cleanQuery);
    if (exactMatch) {
      directMatches.push(exactMatch);
    }
    
    const itemNum = Number(cleanQuery);
    if (!isNaN(itemNum)) {
      const matchesByItem = inventario.filter(a => a.item === itemNum);
      matchesByItem.forEach(m => {
        if (!directMatches.some(dm => dm.serial === m.serial)) {
          directMatches.push(m);
        }
      });
    }

    // 2. Para cada coincidencia directa, buscar sus relacionados usando IDs de registro únicos
    directMatches.forEach(match => {
      resultsMap.set(match.serial, match);

      const matchId = match._backendId || (match as any).id;

      // Buscar periféricos asociados a este activo principal (usando ID de base de datos)
      if (matchId) {
        inventario.forEach(a => {
          if (a.equipo_asociado === matchId) {
            resultsMap.set(a.serial, a);
          }
        });
      }

      // Si este activo es un periférico y está asociado a un equipo principal
      if (match.equipo_asociado) {
        // Encontrar el equipo principal por ID
        const mainEquip = inventario.find(a => a._backendId === match.equipo_asociado || (a as any).id === match.equipo_asociado);
        if (mainEquip) {
          resultsMap.set(mainEquip.serial, mainEquip);
          
          // También encontrar otros periféricos hermanos asociados al mismo equipo principal
          const mainEquipId = mainEquip._backendId || (mainEquip as any).id;
          if (mainEquipId) {
            inventario.forEach(a => {
              if (a.equipo_asociado === mainEquipId) {
                resultsMap.set(a.serial, a);
              }
            });
          }
        }
      }
    });
    
    return Array.from(resultsMap.values());
  }

  async registerDevolucion(
    items: InventarioItem[],
    fotos?: { 
      foto_receptor?: string; 
      foto_entregador?: string; 
      foto_alistador?: string;
      foto_persona_devolucion?: string;
      firma_persona_devolucion?: string;
      nombre_persona_devolucion?: string;
      cedula_persona_devolucion?: string;
      aprobado_por_nombre?: string;
      firma_aprobador?: string;
    },
    comentarios?: string
  ): Promise<Devolucion> {
    this.isLoading.set(true);
    try {
      // 1. Crear la devolución en el backend (con fotos si se proveen)
      const payload: any = { estado: 'PENDIENTE' };
      if (fotos?.foto_receptor)   payload.foto_receptor   = fotos.foto_receptor;
      if (fotos?.foto_entregador) payload.foto_entregador = fotos.foto_entregador;
      if (fotos?.foto_alistador)  payload.foto_alistador  = fotos.foto_alistador;
      if (fotos?.foto_persona_devolucion) payload.foto_persona_devolucion = fotos.foto_persona_devolucion;
      if (fotos?.firma_persona_devolucion) payload.firma_persona_devolucion = fotos.firma_persona_devolucion;
      if (fotos?.nombre_persona_devolucion) payload.nombre_persona_devolucion = fotos.nombre_persona_devolucion;
      if (fotos?.cedula_persona_devolucion) payload.cedula_persona_devolucion = fotos.cedula_persona_devolucion;
      if (fotos?.aprobado_por_nombre) payload.aprobado_por_nombre = fotos.aprobado_por_nombre;
      if (fotos?.firma_aprobador) payload.firma_aprobador = fotos.firma_aprobador;
      if (comentarios)            payload.comentarios     = comentarios;

      let createdDevolucion: any;
      try {
        createdDevolucion = await firstValueFrom(this.api.createDevolucion(payload));
      } catch (e) {
        throw new Error('Error al crear la devolución en el servidor.');
      }

      // 2. Vincular los items a la devolución y actualizar su estado
      try {
        const updatePromises = items.map(item => {
          if (item._backendId) {
            return firstValueFrom(this.api.updateInventarioItem(item._backendId, {
              estado: 'PENDIENTE_DEVOLUCION',
              comentario_devolucion: item.comentario_devolucion,
              devolucion: createdDevolucion.id
            }));
          } else {
            // GHOST ITEM: Crear en backend
            return firstValueFrom(this.api.createInventarioItem({
              serial: item.serial,
              tipo_producto: item.tipo_producto,
              marca: item.marca,
              modelo: item.modelo,
              comentarios: item.comentarios,
              estado: 'PENDIENTE_DEVOLUCION',
              comentario_devolucion: item.comentario_devolucion,
              devolucion: createdDevolucion.id
            }));
          }
        });
        await Promise.all(updatePromises);
      } catch (itemsError: any) {
        // Rollback: delete the created empty devolucion
        if (createdDevolucion?.id) {
          try {
            await firstValueFrom(this.api.deleteDevolucion(createdDevolucion.id));
          } catch (deleteError) {
            console.error('No se pudo eliminar la devolución huérfana:', deleteError);
          }
        }
        throw new Error(`Error al vincular los dispositivos a la devolución. ${itemsError?.message || ''}`);
      }

      // 3. Recargar datos
      await this.loadInventarioFromApi();
      await this.loadDevolucionesFromApi();

      // Buscar la devolución creada en el estado actualizado para devolverla con sus items
      const dev = this.devoluciones().find(d => d.id === createdDevolucion.id);
      
      // Si por alguna razón de sincronización no está en la lista, devolvemos un objeto completo
      if (!dev) {
        return {
          ...createdDevolucion,
          fecha_creacion: new Date().toISOString(),
          items: items,
          ...fotos
        };
      }
      return dev;
    } catch (e) {
      console.error('Error registrando devolución:', e);
      throw e;
    } finally {
      this.isLoading.set(false);
    }
  }


  async approveDevolucion(
    devolucionId: number,
    aprobadoPorNombre: string,
    firmaAprobador: string
  ): Promise<void> {
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.api.updateDevolucion(devolucionId, {
        estado: 'APROBADA',
        aprobado_por_nombre: aprobadoPorNombre,
        firma_aprobador: firmaAprobador
      }));
      await this.loadInventarioFromApi();
      await this.loadDevolucionesFromApi();
    } catch (e) {
      console.error('Error aprobando devolución:', e);
      throw e;
    } finally {
      this.isLoading.set(false);
    }
  }

  async confirmDevolucion(
    devolucionId: number,
    comentario?: string,
    novedades?: { tiene_novedad: boolean; documento_novedad?: string; mensaje_novedad?: string }
  ): Promise<void> {
    this.isLoading.set(true);
    try {
      const payload: any = {
        estado: 'CONFIRMADA',
        fecha_confirmacion: new Date().toISOString(),
        comentario_confirmacion: comentario
      };

      if (novedades) {
        payload.tiene_novedad = novedades.tiene_novedad;
        if (novedades.documento_novedad) payload.documento_novedad = novedades.documento_novedad;
        if (novedades.mensaje_novedad) payload.mensaje_novedad = novedades.mensaje_novedad;
      }

      // 1. Marcar devolución como CONFIRMADA
      await firstValueFrom(this.api.updateDevolucion(devolucionId, payload));

      // El backend debería manejar el cambio de estado de los items, 
      // pero para asegurar consistencia si no hay signals/triggers, lo hacemos aquí o recargamos.
      // En este caso, recargaremos todo.
      
      await this.loadInventarioFromApi(true);
      await this.loadDevolucionesFromApi(true);
    } catch (e) {
      console.error('Error confirmando devolución:', e);
      throw e;
    } finally {
      this.isLoading.set(false);
    }
  }
}
