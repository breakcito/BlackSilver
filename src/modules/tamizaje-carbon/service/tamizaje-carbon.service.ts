import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  ActualizarStockManualRequest,
  RegistrarTamizajeRequest,
} from "./tamizaje-carbon.requests";
import type {
  StockCarbonItem,
  TamizajeCarbonItem,
} from "./tamizaje-carbon.responses";

const PATH = "/tamizaje-carbon";

export const TamizajeCarbonService = {
  getStocks: async (filters?: {
    id_almacen?: number;
    id_tipo_carbon?: number;
    filtros?: string;
  }): Promise<IRespuesta<StockCarbonItem[]>> => {
    const { data } = await api.get<IRespuesta<StockCarbonItem[]>>(
      `${PATH}/stocks`,
      { params: filters },
    );
    return data;
  },

  actualizarStock: async (
    idStockCarbon: number,
    payload: ActualizarStockManualRequest,
  ): Promise<IRespuesta<null>> => {
    const { data } = await api.put<IRespuesta<null>>(
      `${PATH}/stocks/${idStockCarbon}`,
      payload,
    );
    return data;
  },

  getTamizajes: async (filters?: {
    id_almacen?: number;
    mes?: number;
    anio?: number;
    filtros?: string;
  }): Promise<IRespuesta<TamizajeCarbonItem[]>> => {
    const { data } = await api.get<IRespuesta<TamizajeCarbonItem[]>>(PATH, {
      params: filters,
    });
    return data;
  },

  registrarTamizaje: async (
    payload: RegistrarTamizajeRequest,
  ): Promise<IRespuesta<{ id_tamizaje_carbon: number }>> => {
    const formData = new FormData();

    if (payload.id_almacen) formData.append("id_almacen", String(payload.id_almacen));
    formData.append("id_tipo_carbon", String(payload.id_tipo_carbon));
    if (payload.id_empleado_supervisor) {
      formData.append("id_empleado_supervisor", String(payload.id_empleado_supervisor));
    }
    if (payload.id_carga_compra_carbon) {
      formData.append("id_carga_compra_carbon", String(payload.id_carga_compra_carbon));
    }
    formData.append("cantidad_tamizada", String(payload.cantidad_tamizada));
    formData.append("es_retamizaje", payload.es_retamizaje ? "1" : "0");
    formData.append("fecha_hora_tamizaje", payload.fecha_hora_tamizaje);
    formData.append("variantes", JSON.stringify(payload.variantes));

    if (payload.evidencias && payload.evidencias.length > 0) {
      payload.evidencias.forEach((f) => formData.append("evidencias[]", f));
    }

    const { data } = await api.post<IRespuesta<{ id_tamizaje_carbon: number }>>(
      PATH,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },
};
