import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  CrearTipoCarbonRequest,
  ActualizarTipoCarbonRequest,
  SetVariantesRequest,
} from "./tipo-carbon.requests";
import type {
  RES_TipoCarbon,
  RES_VarianteCarbon,
} from "./tipo-carbon.responses";

const path = "/tipo-carbon";

export const TipoCarbonService = {
  getTipos: async (filters?: {
    para_compra?: boolean;
    id_proveedor?: number;
    id_proveedor_carbon?: number;
  }): Promise<IRespuesta<RES_TipoCarbon[]>> => {
    const provId = filters?.id_proveedor ?? filters?.id_proveedor_carbon;
    const params = filters
      ? {
          ...(filters.para_compra !== undefined && {
            para_compra: filters.para_compra ? 1 : 0,
          }),
          ...(provId !== undefined && {
            id_proveedor: provId,
          }),
        }
      : undefined;

    const { data } = await api.get<IRespuesta<RES_TipoCarbon[]>>(`${path}`, {
      params,
    });
    return data;
  },

  crearTipo: async (
    payload: CrearTipoCarbonRequest,
  ): Promise<IRespuesta<RES_TipoCarbon>> => {
    const { data } = await api.post<IRespuesta<RES_TipoCarbon>>(
      `${path}`,
      payload,
    );
    return data;
  },

  actualizarTipo: async (
    idTipoCarbon: number,
    payload: ActualizarTipoCarbonRequest,
  ): Promise<IRespuesta<RES_TipoCarbon>> => {
    const { data } = await api.put<IRespuesta<RES_TipoCarbon>>(
      `${path}/${idTipoCarbon}`,
      payload,
    );
    return data;
  },

  eliminarTipo: async (idTipoCarbon: number): Promise<IRespuesta<null>> => {
    const { data } = await api.delete<IRespuesta<null>>(
      `${path}/${idTipoCarbon}`,
    );
    return data;
  },

  getVariantes: async (
    idTipoCarbon: number,
  ): Promise<IRespuesta<RES_VarianteCarbon[]>> => {
    const { data } = await api.get<IRespuesta<RES_VarianteCarbon[]>>(
      `${path}/${idTipoCarbon}/variantes`,
    );
    return data;
  },

  getVariantesOpciones: async (
    idTipoCarbon: number,
  ): Promise<IRespuesta<RES_TipoCarbon[]>> => {
    const { data } = await api.get<IRespuesta<RES_TipoCarbon[]>>(
      `${path}/${idTipoCarbon}/variantes-opciones`,
    );
    return data;
  },

  setVariantes: async (
    idTipoCarbon: number,
    payload: SetVariantesRequest,
  ): Promise<IRespuesta<RES_VarianteCarbon[]>> => {
    const { data } = await api.put<IRespuesta<RES_VarianteCarbon[]>>(
      `${path}/${idTipoCarbon}/variantes`,
      payload,
    );
    return data;
  },
};
