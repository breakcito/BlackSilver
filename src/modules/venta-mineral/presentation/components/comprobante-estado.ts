import { EstadoComprobanteDespacho } from "../../../../shared/enums/venta-mineral/estado-comprobante-despacho";
import type { ComprobanteDespachoItem } from "../../service/venta-mineral.responses";

/**
 * Estado de pago de un comprobante de despacho.
 *
 * Vive fuera de los componentes porque lo consultan dos pantallas distintas:
 * la tarjeta del comprobante (los importes) y la cabecera de la factura de
 * analisis (el boton de pagar). La regla es una sola.
 */

/**
 * Saldo pendiente de un comprobante: lo que falta por pagar.
 *
 * El neto y la detraccion son cuentas distintas (la detraccion se cobra al
 * fisco), asi que se miden por separado.
 */
export const pendientesComprobante = (
  comprobante: ComprobanteDespachoItem,
): { neto: number; detraccion: number } => ({
  neto: Math.max(
    0,
    Number(comprobante.neto_a_pagar) - Number(comprobante.avance_neto),
  ),
  detraccion: Math.max(
    0,
    Number(comprobante.monto_detraccion_soles) -
      Number(comprobante.avance_detraccion),
  ),
});

/**
 * El comprobante tiene saldo pendiente: admite un pago.
 *
 * Es la misma regla que habilita el boton "Pagar": el que la consulta es el
 * que decide si el pago se puede registrar.
 */
export const tieneSaldoPendiente = (comprobante: ComprobanteDespachoItem) => {
  const { neto, detraccion } = pendientesComprobante(comprobante);
  return neto > 0 || detraccion > 0;
};

/** Color del estado del comprobante. */
export const colorEstadoComprobante = (estado: EstadoComprobanteDespacho) => {
  if (estado === EstadoComprobanteDespacho.Pagado) return "green";
  if (estado === EstadoComprobanteDespacho.EnProcesoPago) return "yellow";
  return "gray";
};
