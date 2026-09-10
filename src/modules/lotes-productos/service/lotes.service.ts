import type { RES_TicketLote } from "../../../service/responses/lote-producto";
import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  DTO_ActualizarLote,
  DTO_AjustarStock,
  DTO_CrearLote,
} from "./lotes.requests";
import type { RES_Lote } from "./lotes.responses";
import dayjs from "dayjs";

export class LotesService {
  private static PATH = "/lotes-productos";

  /**
   * Obtener resumen de lotes por almacén.
   */
  static async listarResumenLotes(idAlmacen: number) {
    const response = await api.get<IRespuesta<RES_Lote[]>>(`/lotes-productos`, {
      params: { id_almacen: idAlmacen },
    });
    return response.data;
  }

  /**
   * Crear nuevo lote.
   */
  static async crear(dto: DTO_CrearLote) {
    // Formatear fechas para el backend
    const payload = {
      ...dto,
      fecha_hora_ingreso: dayjs(dto.fecha_hora_ingreso).format(
        "YYYY-MM-DD HH:mm:ss",
      ),
      fecha_vencimiento: dto.fecha_vencimiento
        ? dayjs(dto.fecha_vencimiento).format("YYYY-MM-DD")
        : null,
    };

    const response = await api.post<IRespuesta<RES_Lote>>(
      `${this.PATH}`,
      payload,
    );
    return response.data;
  }

  /**
   * Actualizar campos administrativos de un lote.
   * El backend calcula el diff y lo apendea a cambios_log.
   * El estado NO se envía: lo gestiona eliminar_lote (soft-delete).
   */
  static async actualizar(idLote: number, dto: DTO_ActualizarLote) {
    const payload = {
      descripcion: dto.descripcion ?? "",
      serie_factura_compra: dto.serie_factura_compra ?? "",
      numero_factura_compra: dto.numero_factura_compra ?? "",
      fecha_hora_ingreso: dto.fecha_hora_ingreso
        ? dayjs(dto.fecha_hora_ingreso).format("YYYY-MM-DD HH:mm:ss")
        : null,
    };

    const response = await api.put<IRespuesta<RES_Lote>>(
      `${this.PATH}/${idLote}`,
      payload,
    );
    return response.data;
  }

  /**
   * Desactivar (soft delete) un lote. Cambia estado a Inactivo.
   */
  static async eliminar(idLote: number) {
    const response = await api.delete<IRespuesta<RES_Lote>>(
      `${this.PATH}/${idLote}`,
    );
    return response.data;
  }

  /**
   * Ajustar stock de un lote.
   */
  static async ajustarStock(dto: DTO_AjustarStock) {
    const response = await api.post<IRespuesta<RES_Lote>>(
      `${this.PATH}/ajustar-stock`,
      dto,
    );
    return response.data;
  }

  /**
   * Obtener información de lotes para impresión de tickets.
   */
  static async getTicketsInfo(ids: number[]) {
    const response = await api.get<IRespuesta<RES_TicketLote[]>>(
      `${this.PATH}/tickets`,
      {
        params: { ids: ids.join(",") },
      },
    );
    return response.data;
  }
}
