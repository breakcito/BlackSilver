import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  DTO_RegistrarComparativo,
  DTO_ActualizarCotizacion,
} from "./cotizaciones.requests";
import type { RES_Comparativo } from "../../../service/responses/cotizaciones/cotizacion";
import type {
  RES_OrdenCompra,
  RES_OrdenCompraDetalle,
} from "../../../service/responses/ordenes-compra/orden-compra";

export const CotizacionesService = {
  /**
   * Obtener comparativos agrupados con cotizaciones y detalles
   */
  get_cotizaciones: async (
    mes?: number,
    year?: number,
  ): Promise<IRespuesta<RES_Comparativo[]>> => {
    const params: Record<string, number> = {};
    if (mes !== undefined) params.mes = mes;
    if (year !== undefined) params.year = year;
    const { data } = await api.get<IRespuesta<RES_Comparativo[]>>(
      "/cotizaciones",
      { params },
    );
    return data;
  },

  /**
   * Registrar un comparativo masivo con sus cotizaciones.
   * El response tiene el mismo formato que el listado (RES_Comparativo[]).
   */
  registrar_comparativo: async (
    dto: DTO_RegistrarComparativo,
  ): Promise<IRespuesta<RES_Comparativo[]>> => {
    const { data } = await api.post<IRespuesta<RES_Comparativo[]>>(
      "/cotizaciones/registrar",
      dto,
    );
    return data;
  },

  /**
   * Actualizar una cotización individual.
   * El response tiene el mismo formato que el listado (RES_Comparativo[]).
   */
  actualizar_cotizacion: async (
    id_cotizacion: number,
    dto: DTO_ActualizarCotizacion,
  ): Promise<IRespuesta<RES_Comparativo[]>> => {
    const { data } = await api.put<IRespuesta<RES_Comparativo[]>>(
      `/cotizaciones/${id_cotizacion}`,
      dto,
    );
    return data;
  },

  /**
   * Aprobar una cotización específica con selección parcial de productos
   */
  aprobar_cotizacion: async (
    id_cotizacion: number,
    payload: {
      id_empresa_compradora: number;
      detalles_aprobados: {
        id: number;
        precio_confirmado: number;
        comentario?: string;
      }[];
      tipo_cambio_aplicado?: number;
      observacion?: string;
    },
  ): Promise<IRespuesta<{ id_orden_compra: number; correlativo: string }>> => {
    // Retorna un objeto con id_orden_compra y correlativo de la OC generada
    const { data } = await api.post<
      IRespuesta<{ id_orden_compra: number; correlativo: string }>
    >(`/cotizaciones/${id_cotizacion}/aprobar`, payload);
    return data;
  },

  /**
   * Obtener una orden de compra generada desde cotizaciones con sus detalles
   */
  get_orden_compra: async (
    id_orden_compra: number,
  ): Promise<
    IRespuesta<RES_OrdenCompra & { detalles: RES_OrdenCompraDetalle[] }>
  > => {
    const { data } = await api.get<
      IRespuesta<RES_OrdenCompra & { detalles: RES_OrdenCompraDetalle[] }>
    >(`/cotizaciones/ordenes-compra/${id_orden_compra}`);
    return data;
  },
};
