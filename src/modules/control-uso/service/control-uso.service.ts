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

  /**
   * Anula un control de uso (soft-delete).
   * El backend:
   * 1. Marca `control_uso_activo.estado = 'Anulado'`.
   * 2. Para cada consumo asociado (es_consumo_directo = true), reingresa
   *    stock al `lote_producto` y registra el movimiento en kardex.
   * 3. Elimina fisicamente los consumos asociados.
   *
   * Devuelve el control_uso_activo actualizado o un error.
   */
  anularControlUso: async (idControlUso: number) => {
    const { data } = await api.post<IRespuesta<RES_ControlUsoLog>>(
      `${path}/anular/${idControlUso}`,
    );
    return data;
  },

  /**
   * Actualiza un control de uso individual (no masivo). El backend recalcula
   * `total_horas` y `costo_total` segun los campos modificados. Los consumos
   * no se ven afectados por esta operacion; si necesitas ajustar consumos,
   * primero anula este control y registra uno nuevo.
   *
   * Solo se puede editar si `estado != 'Anulado'`.
   */
  actualizarControlUso: async (
    idControlUso: number,
    payload: Record<string, unknown>,
  ) => {
    const { data } = await api.put<IRespuesta<RES_ControlUsoLog>>(
      `${path}/actualizar/${idControlUso}`,
      payload,
    );
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
