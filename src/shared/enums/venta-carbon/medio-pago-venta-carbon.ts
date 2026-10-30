/**
 * Medio de pago de los pagos de venta de carbón.
 *
 * Espejo 1:1 de `App\Shared\Enums\VentaCarbon\MedioPagoVentaCarbon`.
 */
export enum MedioPagoVentaCarbon {
  Transferencia = "Transferencia",
  Deposito = "Depósito",
  Efectivo = "Efectivo",
}

/**
 * Transferencia y Depósito se concilian contra una entidad financiera, así que
 * exigen número de operación. Efectivo no.
 */
export const MEDIO_PAGO_VENTA_EXIGE_OPERACION = (
  medio: MedioPagoVentaCarbon | string | null | undefined,
): boolean => medio !== MedioPagoVentaCarbon.Efectivo;
