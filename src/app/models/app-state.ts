export type AssetStatus = 'RECIBIDO' | 'ALISTAMIENTO' | 'DISPONIBLE' | 'ENTREGADO' | 'EN_ESPERA_DEVOLUCION' | 'PENDIENTE_DEVOLUCION' | 'DEVUELTO' | 'ALMACENADO' | 'DADO_DE_BAJA';

export interface Asset {
  item?: number;
  tipo_producto?: string;
  marca: string;
  modelo: string;
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
  estado?: AssetStatus;
  equipo_asociado?: number;
  es_propio?: boolean;
  // Flag para equipos creados directamente en recepción (sin alistamiento)
  ingresado_en_recepcion?: boolean;
  anotacion_recepcion?: string;
}

export interface Proveedor {
  id?: number;
  nombre: string;
  nit?: string;
  contacto?: string;
}

/** Entregador normalizado tal como lo devuelve el backend */
export interface EntregadorBackend {
  id: number;
  nombre: string;
  cedula: string;
  proveedor: number | null;
  proveedor_nombre?: string | null;
  foto?: string;
  firma?: string;
}

export interface Entregador {
  nombre: string;
  cedula: string;
  empresa: string;
  foto?: string; // base64
  firma?: string; // base64
}

export interface Receptor {
  nombre: string;
  firma?: string; // vbase64
  foto?: string;
}

export interface Recepcion {
  id: string;
  fecha: string;
  entregador: Entregador;
  receptor: Receptor;
  equipos: Asset[];
  /** ID del Entregador normalizado en el backend */
  entregador_id?: number;
  proveedor?: number;        // ID del proveedor (para compatibilidad)
  proveedor_nombre?: string; // nombre del proveedor (para display)
}

export interface InventarioItem extends Asset {
  estado: AssetStatus;
  id_recepcion_origen: string;
  id_devolucion?: number;
  fecha_ingreso: string;
  metadata_ocr?: any;
  _backendId?: number;
  fecha_inicio_reemplazo?: string;
  equipo_reemplazante_serial?: string;
  tecnico_asignado?: number;
  tecnico_asignado_nombre?: string;
  fecha_asignacion_alistamiento?: string;
  responsable_devolucion?: string;
  solicitante_cambio?: string;
  fecha_baja?: string; // Fecha en que el equipo fue dado de baja (confirmado por proveedor)
  creado_automaticamente?: boolean; // Equipo creado automáticamente durante ingreso, datos pendientes de completar
}

export interface ChecklistTemplate {
  id: string;
  nombre: string;
  preguntas: ChecklistPregunta[];
}

export interface ChecklistPregunta {
  id: string;
  pregunta: string;
  tipo: 'boolean' | 'select' | 'text';
  options?: string[];
}

export interface Alistamiento {
  id: string;
  serial: string;
  inventario_item: number;
  tecnico: number;
  fecha: string;
  foto_tecnico: string;
  respuestas: Record<string, any>;
  tecnico_nombre: string;
}

export interface Devolucion {
  id: number;
  fecha_creacion: string;
  fecha_confirmacion?: string;
  confirmado_por?: number;
  confirmado_por_nombre?: string;
  estado: 'PENDIENTE' | 'APROBADA' | 'CONFIRMADA';
  comentarios?: string;
  items: InventarioItem[];
  foto_receptor?: string;
  foto_entregador?: string;
  foto_alistador?: string;
  comentario_confirmacion?: string;
  tiene_novedad?: boolean;
  documento_novedad?: string;
  mensaje_novedad?: string;
  
  // Nuevos campos del flujo de devoluciones
  foto_persona_devolucion?: string;
  firma_persona_devolucion?: string;
  nombre_persona_devolucion?: string;
  cedula_persona_devolucion?: string;
  aprobado_por_nombre?: string;
  firma_aprobador?: string;
}

export interface AlertaCritica {
  id: number;
  tipo: string;
  mensaje: string;
  serial_equipo: string;
  dias_transcurridos: number;
  fecha_creacion: string;
  leida: boolean;
  fecha_lectura?: string;
}

export interface AppState {
  recepciones: Recepcion[];
  inventario: Record<string, InventarioItem>;
  configuracion: {
    checklist_templates: ChecklistTemplate[];
  };
  alistamientos: Alistamiento[];
  devoluciones: Devolucion[];
  alertas: AlertaCritica[];
}

