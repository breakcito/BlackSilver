import type {
  BalanceAmbito,
  BalanceMoneda,
  BalancePeriodo,
  BalanceTipo,
} from "../../../shared/enums/balances/balances";

/**
 * Un movimiento economico del balance.
 *
 * Es la misma forma para el periodo actual y para el de comparacion: lo
 * que los distingue es el campo `periodo`.
 */
export interface RES_MovimientoBalance {
  /** Clave unica del registro de origen (ej. "VENTA_MINERAL-12"). */
  id_origen: string;
  /** Familia economica del movimiento (ver `BalanceOrigen`). */
  origen: string;
  ambito: BalanceAmbito;
  tipo: BalanceTipo;
  /** Fecha del movimiento (YYYY-MM-DD). */
  fecha: string;
  /** Texto principal del movimiento. */
  descripcion: string;
  /** Codigo del registro que lo origina (correlativo, comprobante, etc). */
  referencia: string | null;
  /** Contexto adicional (producto, activo, molino, transportista, etc). */
  detalle: string | null;
  id_almacen: number | null;
  id_cliente: number | null;
  id_proveedor: number | null;
  id_empleado: number | null;
  /** Moneda ORIGINAL del movimiento. Los dolares no se suman con los soles. */
  moneda: BalanceMoneda;
  /** Monto en la moneda original del movimiento. */
  monto: number;
  /** Tipo de cambio que aplica el propio comprobante. */
  tipo_cambio: number;
  periodo: BalancePeriodo;
}

/**
 * Descripcion de un origen, con su ambito, su tipo y su etiqueta legible.
 */
export interface RES_OrigenBalance {
  value: string;
  label: string;
  ambito: BalanceAmbito;
  tipo: BalanceTipo;
}

/**
 * Periodo (actual o de comparacion).
 */
export interface RES_PeriodoBalance {
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
}

/**
 * Catalogos que el API envia para que el front no duplique las etiquetas.
 */
export interface RES_CatalogosBalance {
  origenes: RES_OrigenBalance[];
  monedas: BalanceMoneda[];
  ambitos: BalanceAmbito[];
  tipos: BalanceTipo[];
}

/**
 * Respuesta completa del balance.
 *
 * El API NO devuelve totales: entrega los movimientos de ambos periodos y
 * el front los resume. Asi los indicadores, el grafico y la tabla salen
 * siempre de la misma fuente y los filtros recalculan al instante.
 */
export interface RES_Balance {
  periodo: RES_PeriodoBalance;
  comparativo: RES_PeriodoBalance;
  catalogos: RES_CatalogosBalance;
  movimientos: RES_MovimientoBalance[];
}
