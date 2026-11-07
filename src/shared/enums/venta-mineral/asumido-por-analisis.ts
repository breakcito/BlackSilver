/**
 * Quién asume el costo de un análisis de laboratorio.
 *
 * Espejo 1:1 de `App\Shared\Enums\VentaMineral\AsumidoPorAnalisis`.
 */
export enum AsumidoPorAnalisis {
  Propio = "Propio",
  Cliente = "Cliente",
}

/** Solo los análisis propios entran al comprobante de análisis. */
export const ANALISIS_ES_FACTURABLE = (
  asumidoPor: AsumidoPorAnalisis | string | null | undefined,
): boolean => asumidoPor === AsumidoPorAnalisis.Propio;
