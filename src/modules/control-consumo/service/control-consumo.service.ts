import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type { TipoTurno } from "../../../shared/enums/_generic/tipo-turno";
import type {
  RES_Consumo,
  RES_GastoExtra,
  RES_ReporteControlConsumo,
} from "./control-consumo.responses";

const path = "/control-consumo";

export const ControlConsumoService = {
  /**
   * Obtener el listado de logs de uso, consumos directos y gastos extra.
   */
  getReporte: async (
    mes: number,
    yearcito: number,
  ) => {
    const { data } = await api.get<IRespuesta<RES_ReporteControlConsumo>>(path, {
      params: {
        mes,
        yearcito,
      },
    });
    return data;
  },

  /**
   * Registrar un consumo asociado a una entrega de requerimiento.
   */
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
    tipo_turno?: TipoTurno | string | null;
  }) => {
    const { data } = await api.post<IRespuesta<RES_Consumo>>(
      `${path}/consumir`,
      payload,
    );
    return data;
  },

  /**
   * Registrar un consumo DIRECTO (sin requerimiento previo).
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
    tipo_turno?: TipoTurno | string | null;
  }) => {
    const { data } = await api.post<IRespuesta<RES_Consumo>>(
      `${path}/consumo-directo`,
      payload,
    );
    return data;
  },

  /**
   * Actualizar el turno (Dia/Noche) de un consumo.
   */
  actualizarTurno: async (id_consumo: number, tipo_turno: TipoTurno | string) => {
    const { data } = await api.patch<IRespuesta<RES_Consumo>>(
      `${path}/${id_consumo}/turno`,
      { tipo_turno },
    );
    return data;
  },

  /**
   * Obtener los gastos extra del periodo.
   */
  getGastosExtra: async (mes: number, yearcito: number) => {
    const { data } = await api.get<IRespuesta<RES_GastoExtra[]>>(
      `${path}/gastos-extra`,
      {
        params: { mes, yearcito },
      },
    );
    return data;
  },

  /**
   * Registrar un gasto extra.
   */
  registrarGastoExtra: async (payload: {
    id_labor: number;
    descripcion: string;
    monto: number;
  }) => {
    const { data } = await api.post<IRespuesta<RES_GastoExtra>>(
      `${path}/gastos-extra`,
      payload,
    );
    return data;
  },
};
