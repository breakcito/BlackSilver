/**
 * Rango de fechas de un indicador de flujo (YYYY-MM-DD).
 */
export interface RangoFechasDashboard {
  fecha_inicio: string;
  fecha_fin: string;
}

/**
 * Parametros que pide el dashboard.
 *
 * Cada indicador con fecha tiene su propio periodo: el balance puede mirar
 * un mes y las compras otro. Los indicadores de ESTADO (stock critico,
 * mantenimiento y pendientes de atencion) no llevan periodo, porque son una
 * foto del ahora.
 */
export interface REQ_Dashboard {
  balance: RangoFechasDashboard;
  cobros: RangoFechasDashboard;
  costo: RangoFechasDashboard;
  compras: RangoFechasDashboard;
}
