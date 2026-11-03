/**
 * Calculos de importes de la liquidacion de venta de carbon.
 *
 * El backend los recalcula siempre: estos helpers solo sirven para mostrar
 * los importes en vivo mientras el usuario captura. Deben seguir EXACTAMENTE
 * el mismo criterio que la API, o lo que se ve no es lo que se guarda.
 */

/** Redondeo monetario a 2 decimales. */
export const round2 = (valor: number): number => Math.round(valor * 100) / 100;

/**
 * Redondeo a 6 decimales: es el que usa el backend para el precio de
 * materia prima, asi que el subtotal que se muestra coincide exactamente
 * con el que se guarda.
 */
export const round6 = (valor: number): number => Math.round(valor * 1e6) / 1e6;

/**
 * Redondeo de la detraccion a ENTEROS.
 *
 * Regla de negocio: la detraccion se cobra en soles enteros. Si el total de
 * la liquidacion es 48953 y la detraccion es del 10%, el resultado exacto es
 * 4895.30 pero se cobra 4895. El neto a pagar cambia en centimos.
 */
export const roundDetraccion = (valor: number): number => Math.round(valor);

/** Importes de una carga antes de repartir la detraccion. */
export interface ImportesBaseCarga {
  precio_materia_prima: number;
  subtotal: number;
  monto_igv: number;
  total: number;
}

/** Importes de una carga dentro de una liquidacion. */
export interface ImportesCarga extends ImportesBaseCarga {
  monto_detraccion: number;
  neto_a_pagar: number;
}

/**
 * Importes de una carga dentro de una liquidacion.
 *
 * precio_materia_prima = precio_base - descuento + bono
 * subtotal             = precio_materia_prima * toneladas
 * total                = subtotal + IGV
 *
 * La detraccion NO se calcula aqui: se calcula una sola vez sobre el total de
 * la liquidacion y se reparte entre las cargas (ver `repartirDetraccion`).
 */
export const calcularImportesCarga = (
  precioBase: number,
  descuento: number,
  bono: number,
  toneladas: number,
  porcentajeIgv: number,
): ImportesBaseCarga => {
  const precioMateriaPrima = round6(precioBase - descuento + bono);
  const subtotal = round2(precioMateriaPrima * toneladas);
  const montoIgv =
    porcentajeIgv > 0 ? round2((subtotal * porcentajeIgv) / 100) : 0;
  const total = round2(subtotal + montoIgv);

  return {
    precio_materia_prima: precioMateriaPrima,
    subtotal,
    monto_igv: montoIgv,
    total,
  };
};

/**
 * Reparte un monto entero entre las cargas en funcion del total de cada una.
 *
 * Metodo del residuo mayor: se reparte la parte entera de cada cuota
 * proporcional y los soles que sobran (siempre un numero entero, porque el
 * monto a repartir ya viene redondeado) se entregan a las cargas con mayor
 * parte decimal. Asi la suma de las partes es EXACTAMENTE el monto.
 *
 * Es el mismo criterio que aplica la API.
 *
 * @param totalesPorCarga Total de cada carga, en el mismo orden.
 * @param monto Monto entero a repartir.
 */
export const repartirDetraccion = (
  totalesPorCarga: number[],
  monto: number,
): number[] => {
  const n = totalesPorCarga.length;
  const reparto = new Array<number>(n).fill(0);

  if (n === 0) return reparto;

  const sumaTotal = totalesPorCarga.reduce((acc, t) => acc + t, 0);

  if (monto <= 0 || sumaTotal <= 0) return reparto;

  const fracciones = new Array<number>(n).fill(0);
  let asignado = 0;

  totalesPorCarga.forEach((totalCarga, idx) => {
    const cuota = (totalCarga / sumaTotal) * monto;
    const entero = Math.floor(cuota);
    reparto[idx] = entero;
    fracciones[idx] = cuota - entero;
    asignado += entero;
  });

  // Los soles que sobran van a las cargas con mayor parte decimal. El
  // orden es estable (los empates conservan el orden de entrada), igual que
  // en el backend.
  const orden = fracciones
    .map((fraccion, idx) => ({ fraccion, idx }))
    .sort((a, b) => b.fraccion - a.fraccion);

  let resto = Math.round(monto - asignado);
  let i = 0;

  while (resto > 0 && orden.length > 0) {
    reparto[orden[i % orden.length].idx] += 1;
    resto -= 1;
    i += 1;
  }

  return reparto;
};

export interface ImportesTotales {
  subtotal: number;
  monto_igv: number;
  total: number;
  monto_detraccion: number;
  neto_a_pagar: number;
}

/**
 * Calcula los importes de la liquidacion completa: reparte la detraccion
 * (redondeada a entero) entre las cargas y devuelve los importes de cada una.
 */
export const calcularImportesLiquidacion = (
  importes: ImportesBaseCarga[],
  porcentajeDetraccion: number,
): ImportesCarga[] => {
  const total = round2(importes.reduce((acc, i) => acc + i.total, 0));

  const montoDetraccion =
    porcentajeDetraccion > 0
      ? roundDetraccion((total * porcentajeDetraccion) / 100)
      : 0;

  const reparto = repartirDetraccion(
    importes.map((i) => i.total),
    montoDetraccion,
  );

  return importes.map((i, idx) => {
    const parte = reparto[idx] ?? 0;
    return {
      ...i,
      monto_detraccion: parte,
      neto_a_pagar: round2(i.total - parte),
    };
  });
};

/** Suma los importes de las cargas de una liquidacion. */
export const sumarImportes = (importes: ImportesCarga[]): ImportesTotales => {
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
 * El comprobante COPIA los importes de la liquidacion tal cual: no se
 * recalculan. Asi el comprobante nunca discrepa de la liquidacion que lo
 * respalda.
 */
export const importesDesdeLiquidacion = (liquidacion: {
  subtotal: number | string;
  monto_igv: number | string;
  total: number | string;
  monto_detraccion: number | string;
  neto_a_pagar: number | string;
}): ImportesComprobante => ({
  base_imponible: round2(Math.max(0, Number(liquidacion.subtotal) || 0)),
  monto_igv: round2(Number(liquidacion.monto_igv) || 0),
  importe_total: round2(Number(liquidacion.total) || 0),
  monto_detraccion: round2(Number(liquidacion.monto_detraccion) || 0),
  monto_neto: round2(Number(liquidacion.neto_a_pagar) || 0),
});
