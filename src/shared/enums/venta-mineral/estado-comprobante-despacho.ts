/**
 * Estados de un comprobante de despacho.
 *
 * Espejo 1:1 de `App\Shared\Enums\VentaMineral\EstadoComprobanteDespacho`.
 */
export enum EstadoComprobanteDespacho {
  PendienteDePago = "Pendiente de Pago",
  EnProcesoPago = "En proceso de Pago",
  Pagado = "Pagado",
}
