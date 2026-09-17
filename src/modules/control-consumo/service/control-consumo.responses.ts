import type { TipoBien } from "../../../shared/enums/_generic/tipo-bien";
import type { Estado_ConsumoDetalleEntregaReq } from "../../../shared/enums/requerimiento-almacen/requerimiento-entrega";

/**
 * Origen del costo unitario resuelto para un detalle / consumo.
 * Determina de dónde salió el valor numérico que se muestra como "costo unitario base".
 */
export type OrigenCostoUnitario =
  | "snapshot_detalle"
  | "lote_promedio"
  | "lote_compra"
  | "oc_detalle"
  | "sin_costo";

/**
 * Representa el detalle individual de un consumo registrado para una entrega de requerimiento.
 */
export interface RES_Consumo {
  /** ID único del registro de consumo */
  id_consumo: number;
  /** ID de la entrega del requerimiento (detalle) asociada */
  id_requerimiento_almacen_entrega_detalle: number;
  /** ID del requerimiento padre */
  id_requerimiento_almacen?: number;
  /** Correlativo del requerimiento padre */
  correlativo_requerimiento?: string | number;
  /** ID del activo fijo que consume lo entregado */
  id_activo_fijo_consumidor: number | null;
  /** Correlativo del activo fijo consumidor */
  correlativo_activo_fijo_consumidor?: string | null;
  /** Nombre del producto del activo fijo consumidor (JOIN con la tabla
      de activos). Es lo que el front debe mostrar como nombre legible
      en lugar del correlativo (ej: "electrobomba sumergible"). */
  producto_activo_fijo_consumidor?: string | null;
  /** Modelo del activo fijo consumidor */
  modelo_activo_fijo_consumidor?: string | null;
  /** Costo de compra del activo fijo consumidor */
  costo_compra_activo_fijo_consumidor?: number | null;
  /** ID de la marca del activo fijo consumidor */
  id_marca_activo_fijo_consumidor?: number | null;
  /** Nombre de la marca del activo fijo consumidor */
  marca_activo_fijo_consumidor?: string | null;
  /** ID de la labor de destino principal */
  id_labor_destino: number | null;
  /** Nombre de la labor de destino del consumo */
  labor?: string | null;
  /** ID del empleado que registró el consumo */
  id_empleado_registro: number;
  /** Nombre completo del empleado que registró el consumo */
  empleado_registro: string;
  /** ID del cargo del empleado que registró el consumo */
  id_cargo_registro?: number | null;
  /** Nombre del cargo del empleado que registró el consumo */
  cargo_registro?: string | null;
  /** Cantidad consumida medida en la Unidad de Medida Base */
  cantidad_base_consumida: number;
  /** Fecha y hora en la que se realizó el consumo físico */
  fecha_hora_consumo: string;
  /** Comentario o justificación del consumo registrado */
  comentario_consumo: string | null;
  /** Fecha y hora de creación del registro en el sistema */
  created_at: string;
  /** Estado del consumo (Consumo Parcial o Consumo Total) */
  estado: Estado_ConsumoDetalleEntregaReq;
  /** Código del lote de mineral destino del consumo */
  codigo_lote_mineral?: string | null;
  /** ID de la mina del lote mineral destino */
  id_mina_lote_mineral?: number | null;
  /** Nombre de la mina del lote mineral destino */
  mina_lote_mineral?: string | null;
  /** ID de la labor del lote mineral destino */
  id_labor_lote_mineral?: number | null;
  /** Nombre de la labor del lote mineral destino */
  labor_lote_mineral?: string | null;
  /** Costo unitario base resuelto (snapshot del detalle con fallback a lote / OC) */
  costo_unitario_base?: number;
  /** Origen del costo unitario */
  origen_costo_unitario?: OrigenCostoUnitario;
  /** Costo total del consumo = cantidad_base_consumida * costo_unitario_base */
  costo_total_consumo?: number;
  /** Indica si el consumo es para mantenimiento */
  para_mantenimiento?: boolean | number;
  /** Indica si el consumo es para producción */
  para_produccion?: boolean | number;
  /** ID del lote de mineral */
  id_lote_mineral?: number | null;
}

/**
 * Representa un registro de todas las entregas realizadas en los requerimientos de almacen
 */
export interface RES_ResumenEntregasReq {
  /** ID único del detalle de la entrega */
  id_entrega_requerimiento_detalle: number;
  /** ID único del requerimiento de almacén */
  id_requerimiento_almacen: number;
  /** Código correlativo/número de requerimiento */
  correlativo_requerimiento: string | number;
  /** Fecha de creación del requerimiento */
  fecha_requerimiento: string;
  /** Indica si el requerimiento es auditable por el sistema */
  es_auditable: boolean | number;
  /** ID del contratista o empleado solicitante */
  id_empleado_solicitante: number;
  id_contratista_solicitante: number;
  /** Nombre del contratista o empleado solicitante */
  solicitante: string;
  /** ID del cargo del solicitante */
  id_cargo_solicitante?: number | null;
  /** Cargo del solicitante */
  cargo_solicitante?: string | null;
  /** ID de la empresa del solicitante */
  id_empresa_solicitante?: number | null;
  /** ID de la mina asignada al solicitante (referencial) */
  id_mina_solicitante?: number | null;
  /** ID de la mina de destino */
  id_mina: number;
  /** Nombre de la mina de destino */
  mina: string;
  /** Nombre de la labor destino del requerimiento (puede venir null) */
  labor?: string | null;
  /** ID del almacén que atendió la entrega */
  id_almacen_destino: number;
  /** Nombre del almacén de destino */
  almacen_destino: string;

  // Producto
  /** ID del producto */
  id_producto: number;
  /** Nombre del producto entregado */
  producto: string;
  /** ID de la categoría del producto */
  id_categoria?: number | null;
  /** Nombre de la categoría del producto */
  categoria?: string | null;
  /** ID de la unidad de medida base del producto */
  id_unidad_medida_base: number;
  /** Nombre de la unidad de medida base */
  unidad_medida_base: string;
  /** Abreviatura de la unidad de medida base */
  unidad_medida_base_abv: string;
  /** Moneda en la que se expresan los costos del producto (Soles / Dolares) */
  moneda?: string | null;
  /** ID de la unidad de medida utilizada en el requerimiento */
  id_unidad_medida_req: number;
  /** Nombre de la unidad de medida del requerimiento */
  unidad_medida_req: string;
  /** Abreviatura de la unidad de medida del requerimiento */
  unidad_medida_req_abv: string;
  /** Cantidad total solicitada en la Unidad de Medida Base */
  es_consumible: boolean;
  tipo_bien: TipoBien;
  cantidad_solicitada_base: number;
  /** Cantidad solicitada en la unidad original del requerimiento */
  cantidad_solicitada: number;

  // Entrega (cabecera)
  /** ID de la cabecera de la entrega realizada */
  id_requerimiento_almacen_entrega: number;
  /** Correlativo de la entrega */
  correlativo_entrega?: string | number | null;
  /** Fecha y hora del registro de la entrega */
  fecha_hora_entrega: string;
  /** ID del empleado que realizó la entrega */
  id_empleado_entrega?: number | null;
  /** Nombre del empleado que realizó la entrega */
  empleado_entrega?: string | null;
  /** ID del empleado que recibió la entrega */
  id_empleado_recibe?: number | null;
  /** Nombre del empleado que recibió la entrega */
  empleado_recibe?: string | null;

  // Cantidades
  /** Cantidad total entregada en la Unidad de Medida Base */
  cantidad_entregada_base: number;
  /** Cantidad entregada en la unidad original del requerimiento */
  cantidad_entregada_req: number;
  /** Cantidad total consumida acumulada hasta el momento en la Unidad de Medida Base */
  cantidad_consumida_base: number;
  /**
   * Estado de consumo calculado dinámicamente en el cliente.
   * (Nota: No es retornado por la API, es calculado a nivel del cliente en base a cantidades)
   */
  estado_consumo?: "Sin Consumir" | "Consumo Parcial" | "Total";

  // Destino original de la entrega
  para_mantenimiento?: boolean | number;
  para_produccion?: boolean | number;
  id_activo_fijo_destino?: number | null;
  id_lote_mineral?: number | null;
  correlativo_activo_fijo_destino?: string | null;
  codigo_lote_mineral_destino?: string | null;
  id_mina_lote_destino?: number | null;
  mina_lote_destino?: string | null;
  id_labor_lote_destino?: number | null;
  labor_lote_destino?: string | null;
  producto_para_mantenimiento?: boolean | number;

  // Lote del que provino la entrega
  id_lote_producto?: number | null;
  correlativo_lote_producto?: string | null;
  descripcion_lote_producto?: string | null;
  serie_factura_compra?: string | null;
  numero_factura_compra?: string | null;
  fecha_ingreso_lote?: string | null;

  // Activo fijo entregado (cuando la entrega es de un activo)
  id_activo_fijo?: number | null;
  correlativo_activo_fijo_entrega?: string | null;
  modelo_activo_fijo_entrega?: string | null;
  costo_compra_activo_fijo_entrega?: number | null;
  id_marca_activo_fijo_entrega?: number | null;
  marca_activo_fijo_entrega?: string | null;

  // Costos
  /** Snapshot del costo promedio base al momento de la entrega */
  costo_snapshot_detalle?: number;
  /** Costo real por unidad de lote al momento de la entrega */
  costo_unidad_lote_detalle?: number;
  /** Subtotal del detalle de la entrega (cantidad_base * costo_snapshot) */
  subtotal_detalle?: number;
  /** Costo promedio base del lote del que provino la entrega */
  costo_promedio_lote?: number;
  /** Costo por unidad del lote del que provino la entrega */
  costo_por_unidad_lote?: number;
  /** Precio unitario base de la OC detalle del lote del que provino la entrega */
  precio_unitario_base_oc?: number;
  /** Costo unitario base resuelto según regla de prioridad */
  costo_unitario_base?: number;
  /** Origen del costo unitario resuelto */
  origen_costo_unitario?: OrigenCostoUnitario;

  /** Historial cronológico de consumos individuales realizados sobre este detalle de entrega */
  consumos: RES_Consumo[];
}
