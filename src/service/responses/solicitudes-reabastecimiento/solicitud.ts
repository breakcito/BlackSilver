import type { Premura } from "../../../shared/enums/_generic/premura";
import type { TipoBien } from "../../../shared/enums/_generic/tipo-bien";
import type {
  Estado_Solicitud,
  Estado_SolicitudDetalle,
} from "../../../shared/enums/solicitud-reabastecimiento/solicitud";

export interface RES_Solicitud {
  id_solicitud: number;
  correlativo: string;
  //
  id_almacen_solicitante: number;
  almacen_solicitante: string;
  //
  id_empleado_solicitante: number;
  solicitado_por: string;
  //
  id_requerimiento_almacen: number | null;
  correlativo_requerimiento: string | null;
  //
  observacion: string | null;
  premura: Premura;
  fecha_solicitud: string | null;
  fecha_entrega_requerida: string | null;
  //
  es_auditable: boolean;
  //
  created_at: string;
  estado: Estado_Solicitud;
}

export interface RES_SolicitudDetalle {
  id_solicitud_detalle: number;
  empleado_atencion: string | null;
  //
  id_producto: number;
  producto: string;
  es_auditable: boolean;
  stock_minimo_base: number;
  tipo_bien: TipoBien;
  //
  id_unidad_medida_base: number;
  unidad_medida_base_abv: string;
  cantidad_solicitada_base: number;
  cantidad_entregada_base: number;
  //
  contenido_por_presentacion: number;
  //
  id_unidad_medida_sol: number;
  unidad_medida_sol_abv: string;
  cantidad_solicitada: number;
  cantidad_entregada: number;
  //
  cantidad_prestada_total_base: number;
  //
  porcentaje_progreso: number;
  stock_disponible_base: number;
  //
  comentario: string | null;
  comentario_decision: string | null;
  //
  estado: Estado_SolicitudDetalle;
  //
  // Campos de magnitud por item (smart calc). Solo tienen valor cuando
  // el item se registro con el modelo "N items de X magnitud c/u".
  con_magnitud?: number | boolean;
  cantidad_items?: number | null;
  valor_magnitud?: number | null;
  valor_magnitud_base?: number | null;
}
