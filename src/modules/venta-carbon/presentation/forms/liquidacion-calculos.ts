/**
 * Calculos de importes de la liquidacion de venta de carbon.
 *
 * El backend los recalcula siempre: estos helpers solo sirven para mostrar
 * los importes en vivo mientras el usuario captura.
 */

/** Redondeo monetario a 2 decimales. */
export const round2 = (valor: number): number => Math.round(valor * 100) / 100;

export interface ImportesCarga {
  precio_materia_prima: number;
  subtotal: number;
  monto_igv: number;
  total: number;
  monto_detraccion: number;
  neto_a_pagar: number;
}

/**
 * Importes de una carga dentro de una liquidacion.
 *
 * precio_materia_prima = precio_base - descuento + bono
 * subtotal             = precio_materia_prima * toneladas
 * total                = subtotal + IGV
 * neto_a_pagar         = total - detraccion
 */
export const calcularImportesCarga = (
  precioBase: number,
  descuento: number,
  bono: number,
  toneladas: number,
  porcentajeIgv: number,
  porcentajeDetraccion: number,
): ImportesCarga => {
  const precioMateriaPrima = round2(precioBase - descuento + bono);
  const subtotal = round2(precioMateriaPrima * toneladas);
  const montoIgv =
    porcentajeIgv > 0 ? round2((subtotal * porcentajeIgv) / 100) : 0;
  const total = round2(subtotal + montoIgv);
  const montoDetraccion =
    porcentajeDetraccion > 0
      ? round2((total * porcentajeDetraccion) / 100)
      : 0;
  const netoAPagar = round2(total - montoDetraccion);

  return {
    precio_materia_prima: precioMateriaPrima,
    subtotal,
    monto_igv: montoIgv,
    total,
    monto_detraccion: montoDetraccion,
    neto_a_pagar: netoAPagar,
  };
};

export interface ImportesTotales {
  subtotal: number;
  monto_igv: number;
  total: number;
  monto_detraccion: number;
  neto_a_pagar: number;
}

/** Suma los importes de las cargas de una liquidacion. */
export const sumarImportes = (
  importes: ImportesCarga[],
): ImportesTotales => {
  const totales = importes.reduce(
    (acc, i) => ({
      subtotal: acc.subtotal + i.subtotal,
      monto_igv: acc.monto_igv + i.monto_igv,
      total: acc.total + i.total,
      monto_detraccion: acc.monto_detraccion + i.monto_detraccion,
      neto_a_pagar: acc.neto_a_pagar + i.neto_a_pagar,
    }),
    {
      subtotal: 0,
      monto_igv: 0,
      total: 0,
      monto_detraccion: 0,
      neto_a_pagar: 0,
    },
  );

  return {
    subtotal: round2(totales.subtotal),
    monto_igv: round2(totales.monto_igv),
    total: round2(totales.total),
    monto_detraccion: round2(totales.monto_detraccion),
    neto_a_pagar: round2(totales.neto_a_pagar),
  };
};

export interface ImportesComprobante {
  base_imponible: number;
  monto_igv: number;
  importe_total: number;
  monto_detraccion: number;
  monto_neto: number;
}

/**
 * Importes del comprobante de una liquidacion.
 *
 * El subtotal es el de la liquidacion y por ahora no se aplican anticipos,
 * asi que la base imponible es igual al subtotal.
 */
export const calcularImportesComprobante = (
  subtotal: number,
  porcentajeIgv: number,
  porcentajeDetraccion: number,
): ImportesComprobante => {
  const baseImponible = round2(Math.max(0, subtotal));
  const montoIgv =
    porcentajeIgv > 0 ? round2((baseImponible * porcentajeIgv) / 100) : 0;
  const importeTotal = round2(baseImponible + montoIgv);
  const montoDetraccion =
    porcentajeDetraccion > 0
      ? round2((importeTotal * porcentajeDetraccion) / 100)
      : 0;
  const montoNeto = round2(importeTotal - montoDetraccion);

  return {
    base_imponible: baseImponible,
    monto_igv: montoIgv,
    importe_total: importeTotal,
    monto_detraccion: montoDetraccion,
    monto_neto: montoNeto,
  };
};
