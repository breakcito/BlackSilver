/**
 * Lee una columna JSON que puede llegar como texto (driver que no parsea solo)
 * o ya como objeto/array (driver que si lo parsea), sin romper el render si el
 * contenido esta corrupto o es null.
 *
 * Pensado para columnas tipo TEXT que guardan JSON (otros_gastos, evidencias,
 * etc.): un `JSON.parse` directolanza y tumba la grilla completa.
 */
export function parseJsonSeguro<T>(valor: unknown): T | null {
  if (valor === null || valor === undefined || valor === "") return null;

  if (typeof valor === "string") {
    try {
      return JSON.parse(valor) as T;
    } catch {
      return null;
    }
  }

  return valor as T;
}

/**
 * Igual que `parseJsonSeguro` pero garantiza un array. Si el JSON es un objeto
 * o viene roto, devuelve `[]` para que el consumidor pueda mapear sin guards.
 */
export function parseJsonSeguroArray<T>(valor: unknown): T[] {
  const parsed = parseJsonSeguro<T | T[]>(valor);
  if (Array.isArray(parsed)) return parsed;
  return [];
}
