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
  /** Cargas del grupo elegidas. Vacio = rezarandeo sobre el stock existente. */
  id_cargas?: number[];
  cantidad_zarandeada: number;
  es_rezarandeo: boolean;
  fecha_hora_zarandeo: string;
  variantes: RegistrarZarandeoVariantePayload[];
  evidencias?: File[];
}

/**
 * Fila de stock que toma un blending.
 *
 * `cantidad_tomada` es referencial: el usuario puede pedir mas de lo que hay
 * y el sistema lo permite (el stock queda en 0).
 */
export interface BlendingDetallePayload {
  id_stock_carbon: number;
  cantidad_tomada: number;
}

export interface RegistrarBlendingRequest {
  /** Almacen del blending. Si no se envia se elige el de carbon por defecto. */
  id_almacen?: number;
  id_empleado_supervisor: number;
  id_tipo_carbon: number;
  /** Porcentaje de ceniza del lote: lo digita el usuario. */
  porcentaje_ceniza: number;
  fecha_hora_blending: string;
  detalles: BlendingDetallePayload[];
  evidencias?: File[];
}

export type ActualizarBlendingRequest = RegistrarBlendingRequest;

/**
 * Gasto de produccion: apunta a un zarandeo O a un blending (solo uno).
 */
export interface RegistrarGastoZarandeoPayload {
  id_zarandeo_carbon?: number;
  id_blending_carbon?: number;
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
