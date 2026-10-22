import type { RES_CambiosLog } from "../../../service/responses/_generic/cambios-log";
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
  evidencias?: Array<{
    url: string;
    nombre_original?: string;
    extension?: string;
  }> | null;
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
  id_zarandeo_carbon: number;
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
