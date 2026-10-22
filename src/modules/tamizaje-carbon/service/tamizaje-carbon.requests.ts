import type { TipoGastoZarandeo } from "../../../shared/enums/carbon/tipo-gasto-zarandeo";

export interface ActualizarStockManualRequest {
  stock_actual: number;
  motivo?: string;
}

export interface RegistrarZarandeoVariantePayload {
  id_tipo_variante: number;
  porcentaje_extraccion: number;
}

export interface RegistrarZarandeoRequest {
  id_almacen?: number;
  id_tipo_carbon: number;
  /** Calidad del carbón a zarandear: define el stock (tipo, calidad) afectado. */
  calidad: string;
  id_empleado_supervisor?: number;
  /** Cargas del grupo elegidas. Vacio = rezarandeo sobre el stock existente. */
  id_cargas?: number[];
  cantidad_zarandeada: number;
  es_rezarandeo: boolean;
  fecha_hora_zarandeo: string;
  variantes: RegistrarZarandeoVariantePayload[];
  evidencias?: File[];
}

export interface RegistrarGastoZarandeoPayload {
  id_zarandeo_carbon: number;
  gasto: TipoGastoZarandeo;
  otro_gasto?: string | null;
  id_proveedor?: number | null;
  descripcion?: string | null;
  fecha: string;
  numero_reporte?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  cantidad?: number;
  precio_unitario: number;
}
