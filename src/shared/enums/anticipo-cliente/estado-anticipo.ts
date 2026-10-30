/**
 * Estado del anticipo recibido de un cliente de carbon.
 * Espejo 1:1 de `App\Shared\Enums\AnticipoCliente\EstadoAnticipo`.
 */
export const EstadoAnticipo = {
  ConSaldo: "Con Saldo",
  SinSaldo: "Sin Saldo",
  Anulado: "Anulado",
} as const;

export type EstadoAnticipo = (typeof EstadoAnticipo)[keyof typeof EstadoAnticipo];
