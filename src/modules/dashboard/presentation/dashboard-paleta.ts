/**
 * Paleta semantica del dashboard.
 *
 * El dashboard usa una sola escala de color para que los siete indicadores
 * se lean como una sola pantalla y no como siete widgets distintos:
 *
 * - `teal`   verde: lo que sale bien. Ingresos, mineral, resultado positivo.
 * - `red`    rojo: lo que sale mal. Egresos, vencido, sin stock, resultado negativo.
 * - `yellow` ambar: la atencion del momento. Critico, proximo a caer.
 * - `indigo` azul: lo informativo y la accion del usuario.
 * - `violet` morado: el ambito carbon (contrasta con el teal del mineral).
 * - `pink`   rosa: la cartera por cobrar.
 * - `gray`   neutro: contexto sin juicio (comparativos, estados inactivos).
 *
 * Los nombres de chip son de la paleta de Mantine v8 (`violet`, no `purple`).
 * Los de texto y relleno son de Tailwind.
 */

export interface ITonoDashboard {
  /** Color de Mantine para `Badge` y `color`. */
  chip: "teal" | "red" | "yellow" | "indigo" | "violet" | "pink" | "gray";
  /** Clase de Tailwind para el texto. */
  texto: string;
  /** Clase de Tailwind para un punto solido. */
  punto: string;
  /** Clase de Tailwind para una barra con relleno translucido. */
  barra: string;
  /** Clase de Tailwind para el fondo suave del chip. */
  suave: string;
}

const tono = (
  chip: ITonoDashboard["chip"],
  color: string,
): ITonoDashboard => ({
  chip,
  texto: `text-${color}-300`,
  punto: `bg-${color}-500`,
  barra: `bg-${color}-500/70`,
  suave: `bg-${color}-500/10`,
});

export const TONOS = {
  teal: tono("teal", "teal"),
  red: tono("red", "red"),
  yellow: tono("yellow", "yellow"),
  indigo: tono("indigo", "indigo"),
  violet: tono("violet", "violet"),
  pink: tono("pink", "pink"),
  gray: tono("gray", "zinc"),
} satisfies Record<string, ITonoDashboard>;

/** Ingresos, resultado positivo, mineral. */
export const TONO_INGRESO = TONOS.teal;
/** Egresos y resultado negativo. */
export const TONO_EGRESO = TONOS.red;
/** Atencion del momento: critico, por vencer. */
export const TONO_ATENCION = TONOS.yellow;
/** Informativo y accionables. */
export const TONO_PRIMARIO = TONOS.indigo;
/** Ambito carbon. */
export const TONO_CARBON = TONOS.violet;
/** Cartera por cobrar. */
export const TONO_ROSA = TONOS.pink;
/** Contexto sin juicio. */
export const TONO_NEUTRO = TONOS.gray;

/**
 * Tono de un item de stock critico.
 *
 * "Sin stock" es el peor estado posible (rojo); "Critico" es atencion pero
 * todavia hay cobertura (ambar).
 */
export const tonoStock = (estado: string): ITonoDashboard =>
  estado === "Sin stock" ? TONOS.red : TONOS.yellow;

/**
 * Tono de una alerta de mantenimiento.
 *
 * "Vencido" ya supero el umbral (rojo), "Critico" esta a punto (ambar) y
 * "Proximo" todavia tiene margen (azul informativo). Una dimension que esta
 * en "OK" es neutra: no compite visualmente con la que si aprieta.
 */
export const tonoMantenimiento = (nivel: string): ITonoDashboard => {
  if (nivel === "Vencido") return TONOS.red;
  if (nivel === "Crítico") return TONOS.yellow;
  if (nivel === "Próximo") return TONOS.indigo;
  return TONOS.gray;
};

/**
 * Tono de un comprobante pendiente de cobro.
 */
export const tonoCobro = (estado: string): ITonoDashboard => {
  if (estado === "En proceso de Pago") return TONOS.indigo;
  return TONOS.yellow;
};

/**
 * Tono de un item de orden de compra segun su estado de recepcion.
 */
export const tonoRecepcion = (estado: string): ITonoDashboard => {
  if (estado === "Recepción Completa") return TONOS.teal;
  if (estado === "En Recepción") return TONOS.indigo;
  return TONOS.yellow;
};

/**
 * Tono de un estado del embudo logistico.
 */
export const tonoEtapa = (etapa: string): ITonoDashboard => {
  if (etapa === "Esperando Aprobación") return TONOS.yellow;
  if (etapa === "Consultando a Logística") return TONOS.indigo;
  if (etapa === "Aprobado por Logística") return TONOS.teal;
  if (etapa === "Solicitando Préstamo") return TONOS.violet;
  if (etapa === "En Despacho") return TONOS.pink;
  return TONOS.gray;
};
