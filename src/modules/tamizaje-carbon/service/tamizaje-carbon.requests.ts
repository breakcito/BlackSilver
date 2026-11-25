import type { TipoGastoZarandeo } from "../../../shared/enums/carbon/tipo-gasto-zarandeo";
import type { TipoOperacionGrupoGastos } from "../../../shared/enums/carbon/tipo-operacion-grupo-gastos";

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
 * Edita un zarandeo existente.
 *
 * El backend revierte el movimiento de stock anterior y vuelve a aplicarlo
 * con estos valores, asi que el stock queda recalculado.
 */
export interface ActualizarZarandeoRequest {
  id_tipo_carbon: number;
  calidad: string;
  cantidad_zarandeada: number;
  fecha_hora_zarandeo: string;
  variantes: RegistrarZarandeoVariantePayload[];
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
 * Gasto de produccion: se cuelga de un GRUPO de gastos (que reune varios
 * zarandeos o varios blendings de una misma operacion).
 */
export interface RegistrarGastoZarandeoPayload {
  id_grupo_gastos: number;
  gasto: TipoGastoZarandeo;
  otro_gasto?: string | null;
  id_proveedor?: number | null;
  descripcion?: string | null;
  fecha: string;
  numero_reporte?: string | null;
  /** Cantidad: horas (pala/lanza) o unidades del gasto. */
  cantidad: number;
  precio_unitario: number;
}

/**
 * Crea un grupo de gastos y le asigna las operaciones indicadas.
 *
 * El grupo no lleva fecha ni descripcion: el periodo y la composicion los
 * define el conjunto de operaciones que se agrupan.
 */
export interface CrearGrupoGastosRequest {
  /** 'zarandeo' | 'blending' */
  tipo: TipoOperacionGrupoGastos;
  ids_miembros: number[];
}
