import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  REQ_ActualizarActivo,
  REQ_ActualizarUbicacion,
  REQ_CrearActivo,
} from "./activos.requests";
import type { RES_ActivoFijoResumen } from "./activos.responses";

const path = "/activos-fijos";

export const ActivosService = {
  /**
   * Obtener el listado de activos fijos.
   */
  getActivos: async () => {
    const { data } = await api.get<IRespuesta<RES_ActivoFijoResumen[]>>(path);
    return data;
  },

  /**
   * Crear un nuevo activo fijo.
   * Si se adjuntan evidencias como archivos, se envía como FormData.
   */
  crearActivo: async (payload: REQ_CrearActivo, evidenciasFiles?: File[]) => {
    if (evidenciasFiles && evidenciasFiles.length > 0) {
      const formData = new FormData();
      formData.append("id_producto", String(payload.id_producto));
      if (payload.id_almacen != null)
        formData.append("id_almacen", String(payload.id_almacen));
      if (payload.id_mina != null)
        formData.append("id_mina", String(payload.id_mina));
      if (payload.id_labor != null)
        formData.append("id_labor", String(payload.id_labor));
      if (
        payload.ids_labores_abastecidas &&
        payload.ids_labores_abastecidas.length > 0
      ) {
        formData.append(
          "ids_labores_abastecidas",
          JSON.stringify(payload.ids_labores_abastecidas),
        );
      }
      if (payload.id_marca != null)
        formData.append("id_marca", String(payload.id_marca));
      if (payload.codigo) formData.append("codigo", payload.codigo);
      if (payload.numero_serie)
        formData.append("numero_serie", payload.numero_serie);
      if (payload.modelo) formData.append("modelo", payload.modelo);
      if (payload.yearcito_modelo != null)
        formData.append("yearcito_modelo", String(payload.yearcito_modelo));
      if (payload.descripcion)
        formData.append("descripcion", payload.descripcion);
      if (payload.serie_placa)
        formData.append("serie_placa", payload.serie_placa);
      if (payload.numero_placa)
        formData.append("numero_placa", payload.numero_placa);
      if (payload.especificaciones && payload.especificaciones.length > 0) {
        formData.append(
          "especificaciones",
          JSON.stringify(payload.especificaciones),
        );
      }
      if (payload.fecha_hora_ingreso)
        formData.append("fecha_hora_ingreso", payload.fecha_hora_ingreso);
      if (payload.estado) formData.append("estado", payload.estado);
      if (payload.id_empleado_responsable != null)
        formData.append(
          "id_empleado_responsable",
          String(payload.id_empleado_responsable),
        );
      if (payload.serie_factura_compra)
        formData.append("serie_factura_compra", payload.serie_factura_compra);
      if (payload.numero_factura_compra)
        formData.append(
          "numero_factura_compra",
          payload.numero_factura_compra,
        );
      if (payload.costo_compra != null)
        formData.append("costo_compra", String(payload.costo_compra));

      evidenciasFiles.forEach((file) => {
        formData.append("evidencias[]", file);
      });

      const { data } = await api.post<IRespuesta<RES_ActivoFijoResumen>>(
        path,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return data;
    }

    const { data } = await api.post<IRespuesta<RES_ActivoFijoResumen>>(
      path,
      payload,
    );
    return data;
  },

  /**
   * Actualizar la ubicación de un activo fijo.
   */
  actualizarUbicacion: async (payload: REQ_ActualizarUbicacion) => {
    const { data } = await api.post<IRespuesta<number>>(
      `${path}/ubicacion`,
      payload,
    );
    return data;
  },

  /**
   * Editar un activo fijo existente (metadata + opcional cambio de ubicación).
   */
  actualizarActivo: async (
    id_activo: number,
    payload: REQ_ActualizarActivo,
  ): Promise<IRespuesta<RES_ActivoFijoResumen>> => {
    const { data } = await api.put<IRespuesta<RES_ActivoFijoResumen>>(
      `${path}/${id_activo}`,
      payload,
    );
    return data;
  },

  /**
   * Desactivar (soft delete) un activo fijo. Cambia estado a "Dado de Baja".
   */
  eliminarActivo: async (
    id_activo: number,
  ): Promise<IRespuesta<RES_ActivoFijoResumen>> => {
    const response = await api.delete<IRespuesta<RES_ActivoFijoResumen>>(
      `${path}/${id_activo}`,
    );
    return response.data;
  },

  configurarAlertas: async (payload: {
    id_activo: number;
    intervalo_horas?: number | null;
    intervalo_kilometros?: number | null;
    intervalo_vueltas?: number | null;
  }) => {
    const { data } = await api.post<IRespuesta<null>>(
      `${path}/configurar-alertas`,
      payload,
    );
    return data;
  },

  registrarMantenimiento: async (payload: {
    id_activo: number;
    id_empleado_registro: number;
    tipo_control: "horometro" | "odometro" | "vueltas";
    observacion?: string | null;
    fecha_hora_mantenimiento?: string | null;
  }) => {
    const { data } = await api.post<IRespuesta<null>>(
      `${path}/mantenimiento`,
      payload,
    );
    return data;
  },
};
