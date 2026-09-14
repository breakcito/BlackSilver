import type { Premura } from "../../../shared/enums/_generic/premura";
import type { TipoBien } from "../../../shared/enums/_generic/tipo-bien";
import type { TipoTurno } from "../../../shared/enums/_generic/tipo-turno";
import type {
  Estado_Requerimiento,
  Estado_RequerimientoDetalle,
} from "../../../shared/enums/requerimiento-almacen/requerimiento";
import type { IArchivo } from "../../../shared/interfaces/archivo";

/**
 * Representa un requerimiento en el resumen de atención
 */
export interface RES_RequerimientoAlmacen {
  id_requerimiento: number;
  //
  id_almacen_destino: number;
  almacen_destino: string;
  //
  id_empleado_solicitante: number | null;
  id_contratista_solicitante: number | null;
  solicitante: string;
  empleado_registro: string;
  //
  id_labor: number;
  labor: string;
  //
  correlativo: string;
  evidencias: IArchivo[] | null;
  observacion: string | null;
  es_auditable: boolean;
  premura: Premura;
  tipo_turno: TipoTurno | string | null;
  fecha_entrega_requerida: string | null;
  fecha_solicitud: string | null;
  estado: Estado_Requerimiento;
  created_at: string;
  // Insertado por la api
  detalles?: RES_DetalleRequerimiento[];
}

/**
 * Representa un item de detalle de un requerimiento
 */
export interface RES_DetalleRequerimiento {
  id_requerimiento_almacen_detalle: number;
  //
  empleado_atencion: string | null;
  //
  id_producto: number;
  producto: string;
  stock_minimo_base: number;
  es_auditable: boolean;
  tipo_bien: TipoBien;
  //
  id_unidad_medida_base: number;
  unidad_medida_base_abv: string;
  contenido_por_presentacion: number;
  cantidad_solicitada_base: number;
  cantidad_entregada_base: number;
  //
  id_unidad_medida_req: number;
  unidad_medida_req_abv: string;
  cantidad_solicitada: number;
  cantidad_entregada: number;
  //
  porcentaje_progreso: number;
  //
  stock_disponible_base: number;
  //
  comentario: string | null;
  comentario_decision: string | null;
  //
  estado: Estado_RequerimientoDetalle;
  para_mantenimiento?: boolean | number;
  id_activo_fijo_destino?: number | null;
  producto_para_mantenimiento?: boolean | number;
  activo_fijo_destino_correlativo?: string | null;
  activo_fijo_destino_codigo?: string | null;
  // Campos de magnitud por ítem (smart calc con magnitud). Presentes
  // cuando el ítem se registró con cálculo inteligente y unidades
  // universales. `con_magnitud` es 1 en ese caso.
  con_magnitud?: number | boolean;
  cantidad_items?: number | null;
  valor_magnitud?: number | null;
  valor_magnitud_base?: number | null;
}
