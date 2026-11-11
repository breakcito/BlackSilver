/**
 * Tipos de carbón principales.
 *
 * Son los dos tipos que se usan a diario (CISCO y TIPO A): se muestran
 * PRIMERO en los selectores de tipo de carbón, con una estrella para que
 * se distinguan de un vistazo, y resaltados en ambar.
 *
 * La tabla `tipo_carbon` no tiene una columna que los marque, asi que se
 * reconocen por su nombre (o por su codigo): ver `rangoTipoCarbonPrincipal`.
 */

/** Orden de los principales: Cisco, luego Tipo A. */
const ORDEN_CISCO = 0;
const ORDEN_TIPO_A = 1;
/** Todo lo demas. */
const ORDEN_OTROS = 2;

/**
 * Normaliza un texto para comparar: sin tildes, en mayusculas y sin
 * espacios de mas.
 */
const normalizar = (texto: string | null | undefined): string =>
  (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

/**
 * Rango de un tipo de carbón: 0 = Cisco, 1 = Tipo A, 2 = los demas.
 *
 * Se reconoce por el nombre o por el codigo del tipo.
 */
export const rangoTipoCarbonPrincipal = (
  nombre: string | null | undefined,
  codigo?: string | null,
): number => {
  const n = normalizar(nombre);
  const c = normalizar(codigo);

  if (n.includes("CISCO") || c.includes("CISCO")) return ORDEN_CISCO;

  if (/^TIPO\s*A(\s|$)/.test(n) || /^TIPO\s*A(\s|$)/.test(c)) {
    return ORDEN_TIPO_A;
  }

  return ORDEN_OTROS;
};

/** El tipo de carbón es principal (Cisco o Tipo A). */
export const esTipoCarbonPrincipal = (
  nombre: string | null | undefined,
  codigo?: string | null,
): boolean => rangoTipoCarbonPrincipal(nombre, codigo) !== ORDEN_OTROS;

/**
 * Ordena los tipos de carbón: primero los principales (Cisco, Tipo A) y
 * despues el resto, alfabeticamente.
 */
export const ordenarTiposCarbonPrincipales = <
  T extends { nombre: string; codigo?: string | null },
>(
  tipos: T[],
): T[] =>
  [...tipos].sort((a, b) => {
    const ra = rangoTipoCarbonPrincipal(a.nombre, a.codigo);
    const rb = rangoTipoCarbonPrincipal(b.nombre, b.codigo);
    if (ra !== rb) return ra - rb;
    return a.nombre.localeCompare(b.nombre);
  });
