/**
 * Medio de pago de un anticipo RECIBIDO de un cliente de carbon.
 * Espejo 1:1 de `App\Shared\Enums\AnticipoCliente\MedioPago`.
 */
export const MedioPago = {
  Transferencia: "Transferencia",
  Deposito: "Depósito",
  Efectivo: "Efectivo",
} as const;

export type MedioPago = (typeof MedioPago)[keyof typeof MedioPago];
