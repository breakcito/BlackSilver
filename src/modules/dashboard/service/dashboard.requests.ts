/**
 * Parametros que pide el dashboard.
 *
 * El periodo solo afecta a los indicadores de FLUJO (balance, cobros y costo
 * de mantenimiento). Los indicadores de ESTADO (stock critico, mantenimiento
 * proximo y pendientes de atencion) son una foto del ahora: por eso el
 * backend no los filtra por periodo y aqui tampoco se les manda.
 */
export interface REQ_Dashboard {
  /** Fecha inicial del periodo (YYYY-MM-DD). */
  fecha_inicio: string;
  /** Fecha final del periodo (YYYY-MM-DD). */
  fecha_fin: string;
  /** Limita los indicadores a un almacen. */
  id_almacen?: number | null;
}
