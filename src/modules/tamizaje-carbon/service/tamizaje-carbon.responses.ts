import type { RES_CambiosLog } from "../../../service/responses/_generic/cambios-log";
import type { IArchivo } from "../../../shared/interfaces/archivo";
import type { TipoCalidadCarbon } from "../../../shared/enums/carbon/tipo-calidad-carbon";
import type { TipoGastoZarandeo } from "../../../shared/enums/carbon/tipo-gasto-zarandeo";

export interface StockCarbonItem {
  id_stock_carbon: number;
  id_almacen: number;
  almacen_nombre: string;
  id_tipo_carbon: number;
  tipo_carbon_nombre: string;
  tipo_carbon_codigo?: string | null;
  tipo_carbon_para_compra: boolean | number;
  /** El stock se lleva por (tipo de carbon, calidad). */
  calidad: TipoCalidadCarbon | null;
  stock_actual: number;
  cambios_log?: RES_CambiosLog[] | null;
}

export interface VarianteZarandeoItem {
  id_variante_zarandeo_carbon: number;
  id_zarandeo_carbon: number;
  id_tipo_variante: number;
  tipo_variante_nombre: string;
  tipo_variante_codigo?: string | null;
  /** % de extraccion aplicado en este zarandeo. */
  porcentaje_extraccion: number;
  cantidad_extraida: number;
  cambios_log?: RES_CambiosLog[] | null;
}

export interface CargaZarandeoItem {
  id_carga_compra_carbon: number;
  codigo_ticket_balanza?: string | null;
  placa?: string | null;
  cantidad: number;
  porcentaje_ceniza: number;
  calidad: string | null;
  fecha_hora_ingreso: string;
  compra_correlativo?: string | null;
}

export interface ZarandeoCarbonItem {
  id_zarandeo_carbon: number;
  id_almacen: number;
  almacen_nombre: string;
  id_empleado_registro: number;
  empleado_registro: string;
  id_empleado_supervisor?: number | null;
  empleado_supervisor?: string | null;
  id_tipo_carbon: number;
  tipo_carbon_nombre: string;
  tipo_carbon_codigo?: string | null;
  calidad: TipoCalidadCarbon | null;
  cantidad_zarandeada: number;
  cantidad_extraida: number;
  es_rezarandeo: boolean;
  fecha_hora_zarandeo: string;
  cantidad_cargas: number;
  total_cargas_cantidad: number;
  /** Cantidad de gastos de producción registrados en el zarandeo. */
  gastos_cantidad: number;
  /** Suma de los totales de los gastos de producción del zarandeo. */
  gastos_total: number | string;
  evidencias?: IArchivo[] | null;
  created_at?: string;
  variantes?: VarianteZarandeoItem[];
  cargas?: CargaZarandeoItem[];
}

export interface GrupoCargasItem {
  id_almacen: number;
  almacen_nombre: string | null;
  id_tipo_carbon: number;
  tipo_carbon_nombre: string;
  tipo_carbon_codigo?: string | null;
  calidad: TipoCalidadCarbon | null;
  cantidad_cargas: number;
  cantidad_total: number;
  cargas: CargaZarandeoItem[];
}

export interface GastoZarandeoItem {
  id_gasto_produccion_carbon: number;
  id_zarandeo_carbon: number | null;
  id_blending_carbon: number | null;
  id_empleado_registro: number;
  empleado_registro: string;
  id_proveedor?: number | null;
  proveedor_razon_social?: string | null;
  gasto: TipoGastoZarandeo;
  otro_gasto?: string | null;
  descripcion?: string | null;
  fecha: string;
  numero_reporte?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  cantidad: number;
  precio_unitario: number;
  total: number;
  created_at?: string;
}

/**
 * Fila de stock de la que un blending toma carbon.
 *
 * Apunta a una fila de `stock_carbon`: el stock se lleva por
 * (almacen, tipo de carbon, calidad).
 */
export interface BlendingDetalleItem {
  id_detalle_blending_carbon: number;
  id_blending_carbon: number;
  id_stock_carbon: number;
  /** Calidad de la que se toma el carbon (Baja, Intermedia o Alta). */
  calidad: string | null;
  /** Stock que quedo en esa fila despues del blending. */
  stock_actual: number;
  id_tipo_carbon: number | null;
  tipo_carbon_nombre: string | null;
  tipo_carbon_codigo?: string | null;
  /** Toneladas que el blending toma de esa calidad. */
  cantidad_tomada: number;
}

export interface BlendingCarbonItem {
  id_blending_carbon: number;
  correlativo: string;
  numero_correlativo: number;
  id_almacen: number;
  almacen_nombre: string | null;
  id_tipo_carbon: number;
  tipo_carbon_nombre: string | null;
  tipo_carbon_codigo?: string | null;
  id_empleado_registro: number;
  empleado_registro: string | null;
  id_empleado_supervisor: number | null;
  empleado_supervisor: string | null;
  /** Porcentaje de ceniza del lote mezclado. */
  porcentaje_ceniza: number;
  /** Toneladas disponibles de este blending. */
  stock_actual: number;
  fecha_hora_blending: string;
  evidencias?: IArchivo[] | null;
  estado: string;
  created_at: string;
  /** Cantidad de filas de stock que compone el blending. */
  cantidad_detalles: number;
  /** Cantidad de gastos de produccion registrados en el blending. */
  gastos_cantidad: number;
  /** Suma de los totales de los gastos de produccion del blending. */
  gastos_total: number | string;
  detalles: BlendingDetalleItem[];
}
