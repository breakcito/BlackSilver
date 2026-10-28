import type { RES_CambiosLog } from "../../service/responses/_generic/cambios-log";

/**
 * Un cambio individual, en cualquiera de las dos formas que usan los modulos:
 * la canonica ({campo, valor_anterior, valor_nuevo}) o la de mapa
 * ({campo: {antes, despues}}).
 */
interface CambioCrudo {
  campo_bd?: string | null;
  campo?: string | null;
  valor_anterior?: unknown;
  valor_nuevo?: unknown;
  antes?: unknown;
  despues?: unknown;
}

/**
 * Normaliza una entrada del log al formato que espera la vista.
 *
 * No todos los modulos escriben el log igual: algunos guardan los cambios
 * como mapa {campo: {antes, despues}} y la fecha como `fecha_hora`. Sin
 * normalizar, la vista recibiria un objeto donde espera una lista y
 * `cambios.map` reventaria el render (pantalla en negro).
 */
const normalizarEntrada = (entrada: unknown): RES_CambiosLog => {
  const e = (entrada ?? {}) as Record<string, unknown>;

  let cambiosCrudos: CambioCrudo[] = [];
  if (Array.isArray(e.cambios)) {
    cambiosCrudos = e.cambios as CambioCrudo[];
  } else if (e.cambios && typeof e.cambios === "object") {
    // Formato mapa: {campo: {antes, despues}}
    cambiosCrudos = Object.entries(e.cambios as Record<string, unknown>).map(
      ([campo, valor]) => {
        const v = (valor ?? {}) as Record<string, unknown>;
        return {
          campo_bd: campo,
          campo,
          valor_anterior: v.antes,
          valor_nuevo: v.despues,
        };
      },
    );
  }

  return {
    id_empleado: Number(e.id_empleado ?? 0),
    nombre_empleado: (e.nombre_empleado as string | null) ?? null,
    motivo: (e.motivo as string | null) ?? null,
    update_at: String(e.update_at ?? e.fecha_hora ?? ""),
    cambios: cambiosCrudos.map((c) => ({
      campo_bd: c.campo_bd ?? c.campo ?? null,
      campo: c.campo ?? c.campo_bd ?? null,
      valor_anterior: c.valor_anterior ?? c.antes ?? null,
      valor_nuevo: c.valor_nuevo ?? c.despues ?? null,
    })),
  };
};

/**
 * Parseo defensivo del campo cambios_log que puede llegar como array o JSON string
 * (MySQL via DB::select() lo devuelve como string).
 */
export const parseCambiosLog = (raw: unknown): RES_CambiosLog[] => {
  if (!raw) return [];

  let datos: unknown = raw;
  if (typeof raw === "string") {
    try {
      datos = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(datos)) return [];

  return datos.map(normalizarEntrada);
};
