/**
 * Convierte un monto numérico a su expresión en letras (español), necesaria
 * para el "importe en letras" de los documentos legales.
 *
 * Ej: 76971.4 -> "SETENTA Y SEIS MIL NOVECIENTOS SETENTA Y UNO CON 40/100"
 */

const UNIDADES = [
  "cero",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
  "veinte",
];

const DECENAS = [
  "",
  "",
  "veinte",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
];

const CENTENAS = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
];

/** 21 - 29: veintiuno ... veintinueve */
const veintisEnTexto = (n: number): string =>
  `veinti${UNIDADES[n - 20]}`;

/** 1 - 99 */
const decenasEnTexto = (n: number): string => {
  if (n < 20) return UNIDADES[n];

  const decena = Math.floor(n / 10);
  const unidad = n % 10;
  if (decena === 2 && unidad > 0) return veintisEnTexto(n);
  return unidad > 0
    ? `${DECENAS[decena]} y ${UNIDADES[unidad]}`
    : DECENAS[decena];
};

/** 1 - 999 */
const centenasEnTexto = (n: number): string => {
  if (n === 0) return "";
  if (n <= 20) return UNIDADES[n];
  if (n < 30) return veintisEnTexto(n);

  const centena = Math.floor(n / 100);
  const resto = n % 100;

  if (centena === 0) return decenasEnTexto(resto);
  return resto === 0
    ? CENTENAS[centena]
    : `${CENTENAS[centena]} y ${decenasEnTexto(resto)}`;
};

/** 1 - 999999 */
const milesEnTexto = (n: number): string => {
  if (n === 0) return "";
  if (n < 1000) return centenasEnTexto(n);
  if (n === 1000) return "mil";

  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  const base = miles === 1 ? "mil" : `${milesEnTexto(miles)} mil`;
  if (resto === 0) return base;
  // Apocope: "mil un", no "mil uno".
  return `${base} ${resto === 1 ? "un" : centenasEnTexto(resto)}`;
};

const enteroEnTexto = (n: number): string => {
  if (n === 0) return "cero";

  const millones = Math.floor(n / 1_000_000);
  const resto = n % 1_000_000;
  const partes: string[] = [];

  if (millones > 0) {
    partes.push(
      millones === 1 ? "un millón" : `${enteroEnTexto(millones)} millones`,
    );
  }
  if (resto > 0) {
    // Apocope solo cuando hay una parte delante: "millón un", no "uno".
    partes.push(
      partes.length > 0 && resto === 1 ? "un" : milesEnTexto(resto),
    );
  }

  return partes.join(" ");
};

/**
 * Importe en letras, en mayúsculas y con el centavo en formato `xx/100`
 * (omiso cuando el monto es exacto). El signo se descarta: la OC imprime
 * magnitudes, no valores negativos.
 */
export const numeroALetras = (monto: number): string => {
  const valor = Number.isFinite(monto) ? Math.abs(monto) : 0;
  const centavos = Math.round(valor * 100);
  const entero = Math.floor(centavos / 100);
  const centavo = centavos % 100;

  const texto = enteroEnTexto(entero);
  const conCentavos = centavo > 0 ? `${texto} con ${centavo}/100` : texto;

  return conCentavos.toUpperCase();
};
