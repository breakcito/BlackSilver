import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  RES_ResumenEntregasReq,
  RES_Consumo,
} from "./control-consumo.responses";

const path = "/control-consumo";

export const ControlConsumoService = {
  /**
   * Obtener el listado de logs de uso.
   */
  getReporte: async (
    mes: number,
    yearcito: number,
  ) => {
    const { data } = await api.get<IRespuesta<RES_ResumenEntregasReq[]>>(path, {
      params: {
        mes,
        yearcito,
      },
    });
    return data;
  },

  registrarConsumo: async (payload: {
    id_requerimiento_almacen_entrega_detalle: number;
    cantidad_base_consumida: number;
    fecha_hora_consumo: string;
    comentario_consumo?: string | null;
    id_activo_fijo_consumidor?: number | null;
    id_labor_destino?: number | null;
    id_lote_mineral?: number | null;
    para_mantenimiento?: boolean;
    para_produccion?: boolean;
  }) => {
    const { data } = await api.post<IRespuesta<RES_Consumo>>(
      `${path}/consumir`,
      payload,
    );
    return data;
  },

  /**
   * Registrar un consumo DIRECTO (sin requerimiento previo). Usado por:
   * - el modal "Registrar Uso de Combustible" desde la pagina de Consumo.
   * - el modal de Registro de Control por Horometro (por item.consumos[]).
   */
  registrarConsumoDirecto: async (payload: {
    id_activo_fijo_consumidor: number;
    id_producto: number;
    id_almacen: number;
    id_lote_producto: number;
    id_unidad_medida: number;
    cantidad_consumo: number;
    contenido_por_presentacion: number;
    cantidad_base: number;
    uuid_control_uso_activo: string;
    id_lote_mineral?: number | null;
    id_labor_destino?: number | null;
    para_mantenimiento?: boolean;
    para_produccion?: boolean;
    comentario?: string | null;
    estado?: "Consumo Parcial" | "Consumo Total";
  }) => {
    const { data } = await api.post<IRespuesta<RES_Consumo>>(
      `${path}/consumo-directo`,
      payload,
    );
    return data;
  },
};
