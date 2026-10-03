/**
 * Estado de un comprobante de compra de carbón (proveedor o transportista).
 *
 * Espejo 1:1 de `App\Shared\Enums\CompraCarbon\EstadoComprobanteCarbon`.
 * Es derivado: el backend lo recalcula en cada pago.
 */
export enum EstadoComprobanteCarbon {
  PendienteDePago = "Pendiente de Pago",
  EnProcesoPago = "En Proceso de Pago",
  Pagado = "Pagado",
}

/**
 * Porcentaje de detracción por defecto del proveedor (SUNAT).
 * Espejo de `CompraCarbonPagosService::DETRACCION_PROVEEDOR_DEFECTO`.
 */
export const DETRACCION_PROVEEDOR_DEFECTO = 10;

/**
 * Porcentaje de detracción por defecto del transportista.
 * Espejo de `CompraCarbonPagosService::DETRACCION_TRANSPORTE_DEFECTO`.
 */
export const DETRACCION_TRANSPORTE_DEFECTO = 4;

/** Tope aceptado por el backend para no dejar el pago en negativo. */
export const DETRACCION_MAXIMA = 30;
