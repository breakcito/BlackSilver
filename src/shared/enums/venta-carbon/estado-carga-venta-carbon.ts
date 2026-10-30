/**
 * Estados de una carga de venta de carbón.
 *
 * Espejo 1:1 de `App\Shared\Enums\VentaCarbon\EstadoCargaVentaCarbon`.
 *
 * - EnCamino: la carga fue despachada (salió del almacén de la empresa) y
 *   todavía no se confirmó su llegada.
 * - LlegadaConfirmada: el cliente recibió la carga y quedó registrado el
 *   análisis, el peso confirmado y el precio.
 */
export enum EstadoCargaVentaCarbon {
  EnCamino = "En Camino",
  LlegadaConfirmada = "Llegada Confirmada",
  EnLiquidacion = "En Liquidación",
}
