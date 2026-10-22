/**
 * Estado de una venta de carbón.
 *
 * Espejo 1:1 de `App\Shared\Enums\VentaCarbon\EstadoVentaCarbon`.
 *
 * Es DERIVADO: la tabla `venta_carbon` no tiene columna `estado`. El backend
 * lo calcula a partir del estado de las cargas de la venta.
 *
 * - SinCargas: la venta se registró sin despachar ninguna carga.
 * - EnCurso: tiene cargas y al menos una todavía no confirmó su llegada.
 * - Completada: todas sus cargas confirmaron su llegada.
 */
export enum EstadoVentaCarbon {
  SinCargas = "Sin Cargas",
  EnCurso = "En Curso",
  Completada = "Completada",
}
