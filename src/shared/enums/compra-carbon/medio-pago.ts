/**
 * Medio de pago de los pagos de compra de carbón (proveedor y transportista).
 *
 * Espejo 1:1 de `App\Shared\Enums\CompraCarbon\MedioPago`.
 */
export enum MedioPago {
  Transferencia = "Transferencia",
  Deposito = "Depósito",
  Efectivo = "Efectivo",
}

/**
 * Transferencia y Depósito se concilian contra una entidad financiera, así que
 * exigen número de operación. Efectivo no.
 */
export const MEDIO_PAGO_EXIGE_OPERACION = (
  medio: MedioPago | string | null,
): boolean => medio !== MedioPago.Efectivo;
