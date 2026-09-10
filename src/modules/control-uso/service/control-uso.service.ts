import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  REQ_CrearMaterial,
  REQ_CrearTarifa,
  REQ_RegistrarUso,
  REQ_RegistrarUsoBulk,
  REQ_RegistrarUsoBulkVueltas,
} from "./control-uso.requests";
import type {
  RES_ControlUsoLog,
  RES_Tarifa,
  RES_TipoMaterial,
  RES_UltimoHorometro,
  RES_UltimoOdometro,
  RES_ReporteMensual,
} from "./control-uso.responses";

const path = "/control-uso";

export const ControlUsoService = {
  /**
   * Obtener el listado de logs de uso con filtros.
   */
  getLogs: async (filters?: {
    tipo_control?: "horometro" | "odometro" | "vueltas";
    mes?: number;
    anio?: number;
  }) => {
    const { data } = await api.get<IRespuesta<RES_ControlUsoLog[]>>(path, {
      params: filters,
    });
    return data;
  },

  /**
   * Obtener la última lectura para un activo específico.
   */
  getUltimoHorometro: async (idActivoFijo: number) => {
    const { data } = await api.get<IRespuesta<RES_UltimoHorometro>>(
      `${path}/ultimo-horometro/${idActivoFijo}`,
    );
    return data;
  },

  getUltimoOdometro: async (idActivoFijo: number) => {
    const { data } = await api.get<IRespuesta<RES_UltimoOdometro>>(
      `${path}/ultimo-odometro/${idActivoFijo}`,
    );
    return data;
  },

  /**
   * Registrar un nuevo log de uso de activo.
   */
  registrarUso: async (payload: REQ_RegistrarUso) => {
    const { data } = await api.post<IRespuesta<RES_ControlUsoLog>>(path, payload);
    return data;
  },

  /**
   * Registrar multiples controles de uso en una sola transaccion (cabecera + items[]).
   */
  registrarUsoBulk: async (payload: REQ_RegistrarUsoBulk) => {
    const { data } = await api.post<IRespuesta<RES_ControlUsoLog[]>>(
      `${path}/bulk`,
      payload,
    );
    return data;
  },

  /**
   * Registrar multiples controles por vueltas en una sola transaccion (cabecera + items[]).
   */
  registrarUsoBulkVueltas: async (payload: REQ_RegistrarUsoBulkVueltas) => {
    const { data } = await api.post<IRespuesta<RES_ControlUsoLog[]>>(
      `${path}/bulk-vueltas`,
      payload,
    );
    return data;
  },

  // Tarifas
  getTarifas: async (idActivoFijo: number) => {
    const { data } = await api.get<IRespuesta<RES_Tarifa[]>>(
      `${path}/tarifas/${idActivoFijo}`,
    );
    return data;
  },

  crearTarifa: async (payload: REQ_CrearTarifa) => {
    const { data } = await api.post<IRespuesta<RES_Tarifa>>(`${path}/tarifas`, payload);
    return data;
  },

  // Materiales
  getMateriales: async () => {
    const { data } = await api.get<IRespuesta<RES_TipoMaterial[]>>(`${path}/materiales`);
    return data;
  },

  crearMaterial: async (payload: REQ_CrearMaterial) => {
    const { data } = await api.post<IRespuesta<RES_TipoMaterial>>(`${path}/materiales`, payload);
    return data;
  },

  // Reporte
  getReporteMensual: async (mes: number, anio: number) => {
    const { data } = await api.get<IRespuesta<RES_ReporteMensual>>(`${path}/reportes/mensual`, {
      params: { mes, anio },
    });
    return data;
  },
};
export default ControlUsoService;
