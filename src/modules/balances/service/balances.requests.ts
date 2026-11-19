/**
 * Parametros de consulta del balance.
 *
 * - `fecha_inicio` / `fecha_fin`: periodo actual (obligatorios).
 * - `fecha_inicio_comparativo` / `fecha_fin_comparativo`: periodo con el que
 *   se compara. Si no se envian, el backend compara contra el periodo
 *   inmediatamente anterior de la misma duracion.
 */
export interface REQ_Balance {
  fecha_inicio: string;
  fecha_fin: string;
  fecha_inicio_comparativo?: string;
  fecha_fin_comparativo?: string;
}
