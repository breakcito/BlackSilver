export interface DTO_CrearSolicitud {
  id_almacen_solicitante: number;
  premura: string;
  observacion?: string;
  es_auditable: boolean;
  fecha_solicitud: string | null;
  fecha_entrega_requerida: string | null;
  detalles: DTO_SolicitudDetalle[];
}

export interface DTO_SolicitudDetalle {
  id_producto: number;
  id_unidad_medida: number;
  cantidad_solicitada: number;
  contenido_por_presentacion: number;
  comentario?: string;
  /**
   * Campos para cálculo inteligente con magnitud (cuando se registra un
   * item como "N items de X magnitud c/u"). Coinciden 1:1 con las
   * columnas de la BD; si el item usa el modelo clásico quedan en null/0.
   * - `con_magnitud`: 1 si el item se registro con smart calc.
   * - `cantidad_items`: cantidad de items del item (ej. 11 guías).
   * - `valor_magnitud`: magnitud por item en la unidad del detalle
   *   (ej. 70 centímetros).
   * - `valor_magnitud_base`: magnitud por item en la unidad base del
   *   producto (ej. si la unidad del detalle es Centimetro, este es 0.70
   *   metros; si es Metro, es 70 metros).
   */
  con_magnitud?: boolean | number;
  cantidad_items?: number;
  valor_magnitud?: number;
  valor_magnitud_base?: number;
}

export interface DTO_RecibirEntregaItem {
  id_solicitud_reabastecimiento_detalle: number;
  id_entrega_detalle: number | null; // Nuevo: para vincular con el detalle de la entrega
  /** false para activos fijos */
  es_activo_fijo?: boolean;
  /** Poblado solo para activos fijos */
  id_activo_fijo?: number | null;
  /** Opcional: destino del activo recibido */
  id_almacen_destino?: number | null;
  id_mina_destino?: number | null;
  es_nuevo_lote: boolean;
  cantidad_base: number; // Nueva: permite desglosar cantidades
  id_lote_existente?: number | null;
  fecha_vencimiento?: string | null;
  id_unidad_medida?: number | null;
  contenido_por_presentacion?: number | null;
  descripcion?: string | null;
  fecha_ingreso?: string | null;
  max_permitido?: number;
  es_perecible: boolean;
}

export interface DTO_RegistrarRecepcion {
  id_reabastecimiento_entrega: number;
  tipo_entrega: "Solicitud" | "Prestamo";
  con_incidencia: boolean;
  observacion?: string | null;
  fecha_hora_recepcion: string;
  items: DTO_RecibirEntregaItem[];
}
