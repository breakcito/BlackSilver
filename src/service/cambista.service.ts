import { api } from "./_api";
import type { IRespuesta } from "../shared/interfaces/_response";

/**
 * Cambista entregado por `GET /api/cambistas`.
 * Solo dos campos en la BD (`id`, `nombre`).
 */
export interface RES_Cambista {
  id_cambista: number;
  nombre: string;
}

const path = "/cambistas";

export const CambistaService = {
  /**
   * Lista todos los cambistas ordenados por nombre ascendente.
   * Pensado para alimentar un `<Select>` con busqueda; pasa por la
   * libreria de coincidencias en el consumidor si se quiere fuzzy match.
   */
  listar: async (): Promise<IRespuesta<RES_Cambista[]>> => {
    const { data } = await api.get<IRespuesta<RES_Cambista[]>>(path);
    return data;
  },

  /**
   * Crea un cambista. El back exige `nombre` obligatorio (1..128 chars).
   * Devuelve la fila creada (`id_cambista` + `nombre`) lista para
   * auto-seleccionarse en el `<Select>` del modal.
   */
  crear: async (
    nombre: string,
  ): Promise<IRespuesta<RES_Cambista>> => {
    const { data } = await api.post<IRespuesta<RES_Cambista>>(`${path}`, {
      nombre,
    });
    return data;
  },
};
