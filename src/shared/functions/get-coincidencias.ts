/* eslint-disable @typescript-eslint/no-explicit-any */
import Fuse from "fuse.js";
import { Document } from "flexsearch";

// --- INTERFACES Y TIPOS ---

export interface SearchOptions<T> {
  /** Claves a evaluar si la lista es de objetos */
  keys?: Extract<keyof T, string>[];
  /** Activar limpieza de tildes y mayúsculas */
  useNormalization?: boolean;
  /** Sensibilidad de Fuse (0.0 exacto, 1.0 permisivo). Por defecto: 0.4 */
  fuseThreshold?: number;
}

export type MatchSource = "fuse" | "flexsearch";

export interface SearchResult<T> {
  item: T;
  index: number;
  sources: MatchSource[];
}

// Interfaz interna para manejar los datos procesados sin alterar el tipo original
interface ProcessedItem extends Record<string, any> {
  _originalIndex: number;
}

// --- FUNCIONES UTILITARIAS ---

const normalizeText = (text: unknown): string => {
  if (typeof text !== "string") return "";
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// --- FUNCIÓN PRINCIPAL ---

/**
 * Búsqueda unificada utilizando distancia de caracteres (Fuse) y tokens (FlexSearch).
 * Soporta listas de strings o listas de objetos mediante Genéricos <T>.
 */
export const getCoincidencias = <T>(
  list: T[],
  query: string,
  options: SearchOptions<T> = {},
): SearchResult<T>[] => {
  if (!query || list.length === 0) return [];

  const { keys = [], useNormalization = true, fuseThreshold = 0.4 } = options;
  const searchQuery = useNormalization ? normalizeText(query) : query;
  const isPlainList = typeof list[0] === "string";

  // Sin claves explicitas se buscan TODOS los campos de texto del objeto.
  // Fuse y FlexSearch necesitan al menos una clave: sin ella la busqueda no
  // encuentra NADA (ni siquiera lo escrito tal cual).
  const clavesBusqueda: string[] = isPlainList
    ? []
    : keys.length > 0
      ? keys
      : (() => {
          const primero = list[0] as Record<string, unknown>;
          const textos = Object.keys(primero).filter(
            (k) => typeof primero[k] === "string",
          );
          // Si el objeto tiene `label`, ese es el texto que ve el usuario:
          // el `value` (un id) solo generaria ruido.
          return textos.includes("label")
            ? textos.filter((k) => k !== "value")
            : textos;
        })();

  // 1. Preparar datos internamente (preservamos el índice original para mapear luego)
  const processedList: ProcessedItem[] = list.map((item, index) => {
    const processedItem: ProcessedItem = { _originalIndex: index };

    if (isPlainList) {
      processedItem["val"] = item;
      if (useNormalization) {
        processedItem["val_norm"] = normalizeText(item);
      }
    } else {
      Object.assign(processedItem, item);
      if (useNormalization && clavesBusqueda.length > 0) {
        clavesBusqueda.forEach((k) => {
          processedItem[`${k}_norm`] = normalizeText((item as any)[k]);
        });
      }
    }
    return processedItem;
  });

  // Determinar en qué campos buscarán las librerías
  const searchKeys = isPlainList
    ? useNormalization
      ? ["val_norm"]
      : ["val"]
    : useNormalization
      ? clavesBusqueda.map((k) => `${k}_norm`)
      : clavesBusqueda;

  // 2. Ejecutar Fuse.js (Captura errores ortográficos)
  const fuse = new Fuse(processedList, {
    keys: searchKeys,
    threshold: fuseThreshold,
    ignoreLocation: true,
  });

  const fuseResults = fuse
    .search(searchQuery)
    .map((res) => res.item._originalIndex as number);

  // 3. Ejecutar FlexSearch (Captura palabras en desorden)
  const flexIndex = new Document<ProcessedItem>({
    document: {
      id: "_originalIndex",
      index: searchKeys,
    },
    tokenize: "forward",
    context: true,
  });

  processedList.forEach((item) => flexIndex.add(item));

  // FlexSearch devuelve un array por cada "key" buscada, los aplanamos y quitamos duplicados
  const rawFlexResults = flexIndex.search(searchQuery);
  const flexResults = Array.from(
    new Set(rawFlexResults.flatMap((res) => res.result as number[])),
  );

  // 4. Combinar resultados y unificar fuentes (sources)
  const combinedMap = new Map<number, SearchResult<T>>();

  const addResult = (originalIndex: number, source: MatchSource) => {
    if (!combinedMap.has(originalIndex)) {
      combinedMap.set(originalIndex, {
        item: list[originalIndex], // Retorna el objeto estricto original
        index: originalIndex,
        sources: [source],
      });
    } else {
      const existing = combinedMap.get(originalIndex)!;
      if (!existing.sources.includes(source)) {
        existing.sources.push(source);
      }
    }
  };

  fuseResults.forEach((idx) => addResult(idx, "fuse"));
  flexResults.forEach((idx) => addResult(idx, "flexsearch"));

  // 5. FALLBACK: substring normalizado.
  // Guarantee que cualquier query cuyas letras existan (en orden, sin importar
  // tildes/mayúsculas) ENCUENTRE sus matches, incluso cuando Fuse y/o
  // FlexSearch fallen — algo que ocurre con queries muy cortas (1-3 chars)
  // y con Bitap en Fuse 7.3.0.
  if (combinedMap.size === 0 && searchQuery.length >= 1) {
    const matchesBySubstring = (haystack: string): boolean =>
      normalizeText(haystack).includes(searchQuery);

    if (isPlainList) {
      list.forEach((item, idx) => {
        if (matchesBySubstring(String(item))) {
          addResult(idx, "flexsearch");
        }
      });
    } else {
      list.forEach((item, idx) => {
        const obj = item as Record<string, unknown>;
        const isMatch = clavesBusqueda.some((k) => {
          const val = obj[k];
          return typeof val === "string" && matchesBySubstring(val);
        });
        if (isMatch) addResult(idx, "flexsearch");
      });
    }
  }

  return Array.from(combinedMap.values());
};
