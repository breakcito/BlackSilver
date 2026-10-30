/**
 * Estado de un comprobante de venta de carbón.
 *
 * Espejo 1:1 de `App\Shared\Enums\VentaCarbon\EstadoComprobanteVentaCarbon`.
 * Es derivado: el backend lo recalcula en cada pago.
 */
export enum EstadoComprobanteVentaCarbon {
  PendienteDePago = "Pendiente de Pago",
  EnProcesoPago = "En Proceso de Pago",
  Pagado = "Pagado",
}
