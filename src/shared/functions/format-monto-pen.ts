/**
 * Formatea un monto en soles (PEN) con el formato canonico del proyecto:
 * "S/ 1,234.56" (espacio entre "S/" y el numero, separador de miles,
 * siempre 2 decimales). Centralizado aqui para que el listado de
 * proveedores y el modal de anticipos no se desincronicen.
 *
 * Tolera number, string numerico ("25.00") y null/undefined. Necesario
 * porque el backend PHP devuelve las columnas DECIMAL como string via
 * PDO por defecto (ej. "25.00" en vez de 25.00); sin el parseFloat el
 * typeof filter descartaba el valor y mostraba S/ 0.00.
 */
export const formatMontoPEN = (n: number | string | null | undefined): string => {
  const parsed = typeof n === "number" ? n : parseFloat(n ?? "");
  const v = Number.isFinite(parsed) ? parsed : 0;
  return `S/ ${v.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};