import type { EstadoBase } from "../../../shared/enums/_generic/estado-base";
import type { EstadoVencimientoProducto } from "../../../shared/enums/_generic/estado-vencimiento-producto";
import type { RES_CambiosLog } from "../../../service/responses/_generic/cambios-log";

export interface RES_Lote {
  id_lote: number;
  id_producto: number;
  id_almacen: number;
  id_unidad_medida: number;
  producto: string;
  unidad_medida_base_abv: string;
  categoria: string | null;
  unidad_medida_abv: string;
  descripcion: string | null;
  correlativo: string;
  numero_correlativo: number;
  correlativo_auditoria: string | null;
  numero_correlativo_auditoria: number | null;
  stock_actual: number;
  contenido_por_presentacion: number;
  stock_actual_base: number;
  fecha_hora_ingreso: string;
  fecha_vencimiento: string | null;
  estado: EstadoBase;
  es_perecible: boolean;
  es_auditable: boolean;
  stock_minimo_base: number;
  dias_espera_vencimiento: number | null;
  dias_para_vencer: number | null;
  estado_vencimiento: EstadoVencimientoProducto;
  // Costo y Origen de Compra
  costo_por_unidad: number | null;
  serie_factura_compra: string | null;
  numero_factura_compra: string | null;
  // Snapshot original del lote (sin coalesce con OC); la union con la OC
  // se aplica en serie_factura_compra/numero_factura_compra para vistas.
  serie_factura_lote: string | null;
  numero_factura_lote: string | null;
  id_orden_compra: number | null;
  id_orden_compra_comprobante: number | null;
  id_orden_compra_detalle: number | null;
  // Trazabilidad de cambios (edicion/soft-delete)
  cambios_log: RES_CambiosLog[] | null;
}
