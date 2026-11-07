import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type { LoteMineralResumen } from "./lote-mineral.responses";
import type {
  DTO_ActualizarCantidadSacos,
  RegistrarLoteMineralRequest,
} from "./lote-mineral.requests";

class LoteMineralService {
  private readonly PATH = "/lote-mineral";

  public async getLotes(params: { mes?: number; anio?: number } = {}) {
    const searchParams = new URLSearchParams();
    if (params.mes) searchParams.append("mes", params.mes.toString());
    if (params.anio) searchParams.append("anio", params.anio.toString());

    const queryString = searchParams.toString();
    const url = queryString ? `${this.PATH}?${queryString}` : this.PATH;

    const { data } = await api.get<IRespuesta<LoteMineralResumen[]>>(url);
    return data;
  }

  public async registrarLote(request: RegistrarLoteMineralRequest) {
    const { data } = await api.post<IRespuesta<LoteMineralResumen>>(
      this.PATH,
      request,
    );
    return data;
  }

  public async actualizarCantidadSacos(
    id_lote_mineral: number,
    request: DTO_ActualizarCantidadSacos,
  ) {
    const { data } = await api.put<IRespuesta<LoteMineralResumen>>(
      `${this.PATH}/${id_lote_mineral}/cantidad-sacos`,
      request,
    );
    return data;
  }
}

export const loteMineralService = new LoteMineralService();
