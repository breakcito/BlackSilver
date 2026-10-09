export interface ActualizarStockManualRequest {
  stock_actual: number;
  motivo?: string;
}

export interface RegistrarTamizajeVariantePayload {
  id_tipo_variante: number;
  cantidad_extraida: number;
}

export interface RegistrarTamizajeRequest {
  id_almacen?: number;
  id_tipo_carbon: number;
  id_empleado_supervisor?: number;
  id_carga_compra_carbon?: number;
  cantidad_tamizada: number;
  es_retamizaje: boolean;
  fecha_hora_tamizaje: string;
  variantes: RegistrarTamizajeVariantePayload[];
  evidencias?: File[];
}
