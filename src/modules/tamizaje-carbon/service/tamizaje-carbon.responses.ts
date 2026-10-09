export interface StockCarbonLogEntry {
  fecha_hora: string;
  id_empleado: number;
  empleado: string;
  stock_anterior: number;
  stock_nuevo: number;
  motivo?: string | null;
}

export interface StockCarbonItem {
  id_stock_carbon: number;
  id_almacen: number;
  almacen_nombre: string;
  id_tipo_carbon: number;
  tipo_carbon_nombre: string;
  tipo_carbon_codigo?: string;
  stock_actual: number;
  cambios_log?: StockCarbonLogEntry[] | null;
}

export interface VarianteTamizajeItem {
  id_variante_tamizaje_carbon: number;
  id_tamizaje_carbon: number;
  id_tipo_variante: number;
  tipo_variante_nombre: string;
  tipo_variante_codigo?: string;
  cantidad_extraida: number;
  cambios_log?: unknown[] | null;
}

export interface TamizajeCarbonItem {
  id_tamizaje_carbon: number;
  id_almacen: number;
  almacen_nombre: string;
  id_empleado_registro: number;
  empleado_registro: string;
  id_empleado_supervisor?: number | null;
  empleado_supervisor?: string | null;
  id_tipo_carbon: number;
  tipo_carbon_nombre: string;
  tipo_carbon_codigo?: string;
  id_carga_compra_carbon?: number | null;
  carga_ticket_balanza?: string | null;
  carga_placa?: string | null;
  compra_correlativo?: string | null;
  cantidad_tamizada: number;
  cantidad_extraida: number;
  es_retamizaje: boolean;
  fecha_hora_tamizaje: string;
  evidencias?: Array<{ url: string; nombre_original?: string; extension?: string }> | null;
  created_at?: string;
  variantes?: VarianteTamizajeItem[];
}
