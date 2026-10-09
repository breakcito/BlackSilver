import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type { MovimientoKardexCarbonItem } from "./kardex-carbon.responses";

const PATH = "/kardex-carbon";

export const KardexCarbonService = {
  getMovimientos: async (filters?: {
    id_almacen?: number;
    id_tipo_carbon?: number;
    mes?: number;
    anio?: number;
    filtros?: string;
  }): Promise<IRespuesta<MovimientoKardexCarbonItem[]>> => {
    const { data } = await api.get<IRespuesta<MovimientoKardexCarbonItem[]>>(
      PATH,
      { params: filters },
    );
    return data;
  },
};
