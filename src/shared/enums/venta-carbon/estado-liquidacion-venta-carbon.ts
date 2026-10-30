/**
 * Estado de una liquidación de venta de carbón.
 *
 * Espejo 1:1 de `App\Shared\Enums\VentaCarbon\EstadoLiquidacionVentaCarbon`.
 *
 * - Registrada: se creó la liquidación con sus cargas y precios; todavía se
 *   puede editar.
 * - Confirmada: el cliente aprobó la liquidación; ya se puede registrar su
 *   comprobante.
 */
export enum EstadoLiquidacionVentaCarbon {
  Registrada = "Registrada",
  Confirmada = "Confirmada",
}
