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
   */
  getIndicadores: async (
    req: REQ_Dashboard,
  ): Promise<IRespuesta<RES_Dashboard>> => {
    const { data } = await api.get<IRespuesta<RES_Dashboard>>(
      `${PATH}/indicadores`,
      { params: req },
    );
    return data;
  },
};

export default DashboardService;
