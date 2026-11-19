import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type { REQ_Balance } from "./balances.requests";
import type { RES_Balance } from "./balances.responses";

const PATH = "/balances";

export const BalancesService = {
  /** Obtiene el balance (ingresos y egresos) de un periodo y su comparativo. */
  getBalance: async (req: REQ_Balance): Promise<IRespuesta<RES_Balance>> => {
    const { data } = await api.get<IRespuesta<RES_Balance>>(PATH, {
      params: req,
    });
    return data;
  },
};

export default BalancesService;
