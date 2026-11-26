import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type { REQ_Dashboard } from "./dashboard.requests";
import type { RES_Dashboard } from "./dashboard.responses";

const PATH = "/dashboard";

export const DashboardService = {
  /**
   * Obtiene los siete indicadores del dashboard en una sola respuesta.
   *
   * Una unica llamada mantiene los bloques en el mismo snapshot de datos:
   * el balance, el stock y las alertas nunca pueden contradecirse entre si.
   *
   * Cada indicador de flujo lleva su propio periodo: asi el balance puede
   * mirar un mes y los cobros otro, sin pedir los datos dos veces.
   */
  getIndicadores: async (
    req: REQ_Dashboard,
  ): Promise<IRespuesta<RES_Dashboard>> => {
    // Axios serializa un objeto anidado como JSON, pero Laravel espera la
    // notacion de corchetes: `periodo[balance][inicio]`.
    const { data } = await api.get<IRespuesta<RES_Dashboard>>(
      `${PATH}/indicadores`,
      {
        params: {
          "periodo[balance][inicio]": req.balance.fecha_inicio,
          "periodo[balance][fin]": req.balance.fecha_fin,
          "periodo[cobros][inicio]": req.cobros.fecha_inicio,
          "periodo[cobros][fin]": req.cobros.fecha_fin,
          "periodo[costo][inicio]": req.costo.fecha_inicio,
          "periodo[costo][fin]": req.costo.fecha_fin,
          "periodo[compras][inicio]": req.compras.fecha_inicio,
          "periodo[compras][fin]": req.compras.fecha_fin,
        },
      },
    );
    return data;
  },
};

export default DashboardService;
