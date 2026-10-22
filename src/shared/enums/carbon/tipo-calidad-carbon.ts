/**
 * Calidades del carbón según su porcentaje de ceniza.
 * Los rangos (inicio/fin) NO son fijos: se configuran en el módulo System
 * y se consultan en la tabla `calidad_carbon` de la API.
 *
 * Los valores deben coincidir con `calidad_carbon.nombre` de la base de datos.
 */
export enum TipoCalidadCarbon {
  Baja = "Baja",
  Intermedia = "Intermedia",
  Alta = "Alta",
}

/**
 * Verifica que un texto arbitrario sea una de las calidades soportadas.
 * Útil cuando el valor viene de un catálogo o de un `Select` (que devuelve
 * `string`), y se necesita narrowing al enum.
 */
export const esTipoCalidadCarbon = (
  valor: string | null | undefined,
): valor is TipoCalidadCarbon =>
  valor != null && (Object.values(TipoCalidadCarbon) as string[]).includes(valor);
