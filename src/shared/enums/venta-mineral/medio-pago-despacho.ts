/**
 * Medio de pago de los pagos de los comprobantes de despacho.
 *
 * Espejo 1:1 de `App\Shared\Enums\VentaMineral\MedioPagoDespacho`.
 */
export enum MedioPagoDespacho {
  Transferencia = "Transferencia",
  Deposito = "Depósito",
  Efectivo = "Efectivo",
}

/**
 * Transferencia y Depósito se concilian contra una entidad financiera, así que
 * exigen número de operación. Efectivo no.
 */
export const MEDIO_PAGO_DESPACHO_EXIGE_OPERACION = (
  medio: MedioPagoDespacho | string | null | undefined,
): boolean => medio !== MedioPagoDespacho.Efectivo;
