import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  ActualizarStockManualRequest,
  RegistrarGastoZarandeoPayload,
  RegistrarZarandeoRequest,
} from "./tamizaje-carbon.requests";
import type {
  GastoZarandeoItem,
  GrupoCargasItem,
  StockCarbonItem,
  ZarandeoCarbonItem,
} from "./tamizaje-carbon.responses";

const PATH = "/tamizaje-carbon";

export const TamizajeCarbonService = {
  getStocks: async (filters?: {
    id_almacen?: number;
    id_tipo_carbon?: number;
    calidad?: string;
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

  getZarandeos: async (filters?: {
    id_almacen?: number;
    mes?: number;
    anio?: number;
    filtros?: string;
  }): Promise<IRespuesta<ZarandeoCarbonItem[]>> => {
    const { data } = await api.get<IRespuesta<ZarandeoCarbonItem[]>>(PATH, {
      params: filters,
    });
    return data;
  },

  /**
   * Grupos de cargas pendientes de zarandeo (por almacen, tipo de carbon y calidad).
   * Cada grupo se zarea completo.
   */
  getGruposCargas: async (filters?: {
    id_almacen?: number;
    id_tipo_carbon?: number;
  }): Promise<IRespuesta<GrupoCargasItem[]>> => {
    const { data } = await api.get<IRespuesta<GrupoCargasItem[]>>(
      `${PATH}/grupos-cargas`,
      { params: filters },
    );
    return data;
  },

  registrarZarandeo: async (
    payload: RegistrarZarandeoRequest,
  ): Promise<IRespuesta<ZarandeoCarbonItem>> => {
    const formData = new FormData();

    if (payload.id_almacen)
      formData.append("id_almacen", String(payload.id_almacen));
    formData.append("id_tipo_carbon", String(payload.id_tipo_carbon));
    formData.append("calidad", payload.calidad);
    if (payload.id_empleado_supervisor) {
      formData.append(
        "id_empleado_supervisor",
        String(payload.id_empleado_supervisor),
      );
    }
    if (payload.id_cargas && payload.id_cargas.length > 0) {
      formData.append("id_cargas", JSON.stringify(payload.id_cargas));
    }
    formData.append("cantidad_zarandeada", String(payload.cantidad_zarandeada));
    formData.append("es_rezarandeo", payload.es_rezarandeo ? "1" : "0");
    formData.append("fecha_hora_zarandeo", payload.fecha_hora_zarandeo);
    formData.append("variantes", JSON.stringify(payload.variantes));

    if (payload.evidencias && payload.evidencias.length > 0) {
      payload.evidencias.forEach((f) => formData.append("evidencias[]", f));
    }

    const { data } = await api.post<IRespuesta<ZarandeoCarbonItem>>(
      PATH,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  getGastos: async (
    idZarandeoCarbon: number,
  ): Promise<IRespuesta<GastoZarandeoItem[]>> => {
    const { data } = await api.get<IRespuesta<GastoZarandeoItem[]>>(
      `${PATH}/gastos/${idZarandeoCarbon}`,
    );
    return data;
  },

  registrarGasto: async (
    payload: RegistrarGastoZarandeoPayload,
  ): Promise<IRespuesta<GastoZarandeoItem>> => {
    const { data } = await api.post<IRespuesta<GastoZarandeoItem>>(
      `${PATH}/gastos`,
      {
        id_zarandeo_carbon: payload.id_zarandeo_carbon,
        gasto: payload.gasto,
        otro_gasto: payload.otro_gasto ?? null,
        id_proveedor: payload.id_proveedor ?? null,
        descripcion: payload.descripcion ?? null,
        fecha: payload.fecha,
        numero_reporte: payload.numero_reporte ?? null,
        hora_inicio: payload.hora_inicio ?? null,
        hora_fin: payload.hora_fin ?? null,
        cantidad: payload.cantidad ?? 0,
        precio_unitario: payload.precio_unitario,
      },
    );
    return data;
  },
};
