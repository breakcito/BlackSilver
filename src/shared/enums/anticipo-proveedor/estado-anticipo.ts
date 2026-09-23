/**
 * Estado del anticipo de un proveedor (modulo carbon).
 * Espejo 1:1 de `App\Shared\Enums\AnticipoProveedor\EstadoAnticipo`.
 */
export const EstadoAnticipo = {
  ConSaldo: "Con Saldo",
  SinSaldo: "Sin Saldo",
  Anulado: "Anulado",
} as const;

export type EstadoAnticipo = (typeof EstadoAnticipo)[keyof typeof EstadoAnticipo];
