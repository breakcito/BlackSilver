/**
 * Clases de estilo compartidas por los formularios de comprobantes y pagos.
 *
 * Dark premium: fondo translucido, borde sutil, foco claro y transicion
 * suave. Es identico al que ya usa el resto del modulo para que los forms
 * convivan en el mismo modal sin saltos visuales.
 */
export const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
  dropdown:
    "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
  option:
    "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
  label: "text-zinc-300 mb-1.5 font-semibold tracking-tight",
};

/**
 * Formato monetario en soles.
 *
 * Los DECIMAL de MySQL llegan como string en la respuesta JSON, asi que el
 * casteo a Number es obligatorio: sin el, `Number.isFinite("14970.80")` es
 * false y todos los montos se muestran en 0.00.
 */
export const formatPEN = (n: number | string | null | undefined): string =>
  `S/ ${formatNumberLocal(n)}`;

/**
 * Redondeo a 2 decimales evitando el arrastre binario de JS
 * (0.1 + 0.2 !== 0.3). Todo monto que se muestra al usuario pasa por aquí.
 */
export const round2 = (n: number | string | null | undefined): number => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round((v + Number.EPSILON) * 100) / 100 : 0;
};

const formatNumberLocal = (n: number | string | null | undefined): string => {
  const v = Number(n);
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(v) ? v : 0);
};
