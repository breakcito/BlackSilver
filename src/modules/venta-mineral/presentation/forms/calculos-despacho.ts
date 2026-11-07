/**
 * Calculos del modulo de venta de mineral.
 *
 * El backend los recalcula siempre: estos helpers solo sirven para mostrar
 * los importes en vivo mientras el usuario captura. Deben seguir EXACTAMENTE
 * el mismo criterio que el API (`App\Shared\Helpers\CalculosDespacho`), o lo
 * que se ve no es lo que se guarda.
 *
 * ARITMETICA EN CENTIMOS
 *
 * Todos los importes se calculan sobre CENTIMOS ENTEROS, nunca sobre
 * doubles con decimales intermedios. Motivo: `456140.75 * 0.18` y
 * `456140.75 * 18 / 100` dan resultados distintos en IEEE-754 (82105.33 vs
 * 82105.34) y PHP y JavaScript no coinciden en el desempate. Con centimos
 * enteros, ambos lenguajes dan SIEMPRE el mismo numero.
 *
 * REGLA DE NEGOCIO (detraccion): la detraccion se cobra en soles enteros. Si
 * el total es 48953 y la detraccion es del 10%, el resultado exacto es
 * 4895.30 pero se cobra 4895. El neto a pagar cambia en centimos: esa
 * diferencia ES la regla.
 */

/** Porcentaje de IGV por defecto (Peru). */
export const IGV_POR_DEFECTO = 18;

/** Porcentaje de detraccion por defecto del comprobante de flete. */
export const DETRACCION_FLETE_POR_DEFECTO = 4;

/** Porcentaje de detraccion por defecto del resto de comprobantes. */
export const DETRACCION_ESTANDAR_POR_DEFECTO = 12;

/** Kilogramos por saco de mineral. */
export const KILOGRAMOS_POR_SACO = 50;

/** Redondeo monetario a 2 decimales. */
export const round2 = (valor: number): number => Math.round(valor * 100) / 100;

/** Redondeo de la detraccion a ENTEROS. */
export const roundDetraccion = (valor: number): number => Math.round(valor);

/** Convierte un monto en soles a CENTIMOS enteros. */
export const aCentavos = (valor: number): number => Math.round(valor * 100);

/** Convierte un porcentaje a CENTESIMOS enteros (18% -> 1800). */
export const porcentajeACentesimos = (porcentaje: number): number =>
  Math.round(porcentaje * 100);

/**
 * IGV en soles, calculado sobre centimos enteros.
 *
 * igvCentavos = round(subtotalCentavos * pctCentavos / 10000)
 */
export const calcularIgv = (
  subtotal: number,
  porcentajeIgv: number,
): number => {
  if (porcentajeIgv <= 0) return 0;

  const centavos = aCentavos(subtotal);
  const pctCentavos = porcentajeACentesimos(porcentajeIgv);

  const igvCentavos = Math.round((centavos * pctCentavos) / 10000);

  return igvCentavos / 100;
};

/**
 * Monto de la detraccion en soles ENTEROS.
 *
 * det = round(totalCentavos * pctCentavos / 1000000)
 */
export const montoDetraccion = (
  total: number,
  porcentaje: number,
): number => {
  if (porcentaje <= 0) return 0;

  const centavos = aCentavos(total);
  const pctCentavos = porcentajeACentesimos(porcentaje);

  return Math.round((centavos * pctCentavos) / 1000000);
};

/** Neto a pagar: el total menos la detraccion ya redondeada. */
export const netoAPagar = (total: number, detraccion: number): number =>
  round2(total - detraccion);

export interface ImportesComprobante {
  subtotal: number;
  igv: number;
  total: number;
  monto_detraccion: number;
  neto_a_pagar: number;
}

/**
 * Cascada de importes de un comprobante de despacho.
 *
 * subtotal -> igv -> total -> detraccion (entera) -> neto a pagar.
 */
export const calcularImportes = (
  subtotal: number,
  porcentajeIgv: number,
  porcentajeDetraccion: number,
): ImportesComprobante => {
  const sub = round2(subtotal);
  const igv = calcularIgv(sub, porcentajeIgv);
  const total = round2(sub + igv);
  const detraccion = montoDetraccion(total, porcentajeDetraccion);

  return {
    subtotal: sub,
    igv,
    total,
    monto_detraccion: detraccion,
    neto_a_pagar: netoAPagar(total, detraccion),
  };
};

/**
 * Subtotal de un comprobante de flete: toneladas x precio por tonelada.
 *
 * El producto se redondea en CENTIMOS. Las toneladas tienen 3 decimales y el
 * precio 2: el producto se calcula sobre micro-toneladas y centimos
 * enteros, sin decimales intermedios.
 */
export const subtotalFlete = (
  toneladas: number,
  precioPorTonelada: number,
): number => {
  const toneladasMicros = Math.round((Number(toneladas) || 0) * 1e6);
  const precioCentavos = aCentavos(Number(precioPorTonelada) || 0);

  const centavos = Math.round((toneladasMicros * precioCentavos) / 1e6);

  return centavos / 100;
};

/**
 * Peso de la guia remitente en TONELADAS, a partir de los sacos.
 *
 * Referencia de la operacion: (sacos x 50 kg) / 1000.
 */
export const pesoGuiaToneladas = (cantidadSacos: number): number =>
  round2((cantidadSacos * KILOGRAMOS_POR_SACO) / 1000);

/**
 * Codigo del cliente de un analisis PROPIO.
 *
 * Lo compone la empresa: nombre de la labor del lote despachado mas la
 * cantidad de sacos despachados. Ej. GENESIS-465.
 */
export const codigoClienteAnalisisPropio = (
  nombreLabor: string | null | undefined,
  cantidadSacos: number,
): string => {
  const labor = (nombreLabor ?? "").trim().toUpperCase();

  if (labor === "") return "";

  return `${labor}-${cantidadSacos}`;
};

export interface ImportesLiquidacion {
  peso_seco: number;
  peso_neto: number;
  total_deducciones: number;
  subtotal: number;
  igv: number;
  total: number;
  detraccion: number;
  neto: number;
}

/**
 * Importes de una liquidacion de mineral.
 *
 * peso_seco (TMS) = peso humedo - humedad - tara
 * peso_neto        = peso seco - merma
 * subtotal         = (peso neto x valor por tonelada) - deducciones
 * detraccion       = round(total x %detraccion)   <- ENTEROS
 */
export const calcularImportesLiquidacion = (params: {
  peso_humedo: number;
  tara: number;
  porcentaje_humedad: number;
  merma: number;
  maquila: number;
  penalidad: number;
  valor_por_tonelada: number;
  porcentaje_igv: number;
  porcentaje_detraccion: number;
}): ImportesLiquidacion => {
  const pesoHumedo = Number(params.peso_humedo) || 0;
  const tara = Number(params.tara) || 0;
  const humedad = Number(params.porcentaje_humedad) || 0;
  const merma = Number(params.merma) || 0;

  // Los pesos se manejan en MILESIMAS de tonelada: es la precision con la
  // que se capturan y evita los decimales intermedios.
  const pesoHumedoMil = Math.round(pesoHumedo * 1000);
  const pctHumedadMil = Math.round(humedad * 100);
  const humedadMil = Math.round((pesoHumedoMil * pctHumedadMil) / 10000);
  const taraMil = Math.round(tara * 1000);

  const pesoSecoMil = Math.max(0, pesoHumedoMil - humedadMil - taraMil);
  const pesoSeco = pesoSecoMil / 1000;

  const mermaMil = Math.round(merma * 1000);
  const pesoNetoMil = Math.max(0, pesoSecoMil - mermaMil);
  const pesoNeto = pesoNetoMil / 1000;

  const maquilaCentavos = aCentavos(Number(params.maquila) || 0);
  const penalidadCentavos = aCentavos(Number(params.penalidad) || 0);
  const totalDeducciones = (maquilaCentavos + penalidadCentavos) / 100;

  const valorPorTonelada = Number(params.valor_por_tonelada) || 0;

  // El producto del peso por el valor se redondea en CENTIMOS: el peso en
  // milesimas de tonelada y el valor en centimos.
  const valorCentavos = aCentavos(valorPorTonelada);
  const productoCentavos = Math.round((pesoNetoMil * valorCentavos) / 1000);

  const subtotalCentavos = Math.max(
    0,
    productoCentavos - maquilaCentavos - penalidadCentavos,
  );
  const subtotal = subtotalCentavos / 100;

  const igv = calcularIgv(subtotal, Number(params.porcentaje_igv) || 0);
  const total = round2(subtotal + igv);
  const detraccion = montoDetraccion(total, params.porcentaje_detraccion);

  return {
    peso_seco: pesoSeco,
    peso_neto: pesoNeto,
    total_deducciones: totalDeducciones,
    subtotal,
    igv,
    total,
    detraccion,
    neto: netoAPagar(total, detraccion),
  };
};
