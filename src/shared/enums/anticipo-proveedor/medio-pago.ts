/**
 * Medio de pago de un anticipo a proveedor (modulo carbon).
 * Espejo 1:1 de `App\Shared\Enums\AnticipoProveedor\MedioPago`.
 */
export const MedioPago = {
  Transferencia: "Transferencia",
  Deposito: "Depósito",
  Efectivo: "Efectivo",
} as const;

export type MedioPago = (typeof MedioPago)[keyof typeof MedioPago];
