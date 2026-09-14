import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type { IArchivo } from "../../../shared/interfaces/archivo";
import type {
  DTO_AtencionCambiarEstado,
  DTO_RegistrarEntrega,
  DTO_CrearSolicitudLogistica,
  DTO_CrearRequerimiento,
  DTO_EditarRequerimiento,
} from "./atencion.requests";
import type { RES_Trazabilidad } from "../../../service/responses/_generic/trazabilidad";
import type {
  RES_DetalleRequerimiento,
  RES_RequerimientoAlmacen,
} from "../../../service/responses/requerimientos-almacen/requerimiento-almacen";
import type { RES_EntregaRequerimiento } from "../../../service/responses/requerimientos-almacen/requerimiento-almacen-entrega";

const path = "/requerimientos-atencion";

export const AtencionService = {
  registrarRequerimiento: async (dto: DTO_CrearRequerimiento) => {
    const formData = new FormData();
    if (dto.id_empleado_solicitante) {
      formData.append(
        "id_empleado_solicitante",
        String(dto.id_empleado_solicitante),
      );
    }
    if (dto.id_contratista_solicitante) {
      formData.append(
        "id_contratista_solicitante",
        String(dto.id_contratista_solicitante),
      );
    }
    if (dto.id_labor && dto.id_labor > 0) {
      formData.append("id_labor", String(dto.id_labor));
    }
    formData.append("id_almacen_destino", String(dto.id_almacen_destino));
    formData.append("premura", dto.premura);
    if (dto.tipo_turno) {
      formData.append("tipo_turno", dto.tipo_turno);
    }
    formData.append("es_auditable", dto.es_auditable ? "1" : "0");
    if (dto.fecha_entrega_requerida) {
      formData.append("fecha_entrega_requerida", dto.fecha_entrega_requerida);
    }
    if (dto.fecha_solicitud) {
      formData.append("fecha_solicitud", dto.fecha_solicitud);
    }
    if (dto.observacion) {
      formData.append("observacion", dto.observacion);
    }

    dto.detalles.forEach((det, index) => {
      formData.append(
        `detalles[${index}][id_producto]`,
        String(det.id_producto),
      );
      formData.append(
        `detalles[${index}][id_unidad_medida]`,
        String(det.id_unidad_medida),
      );
      formData.append(
        `detalles[${index}][cantidad_solicitada]`,
        String(det.cantidad_solicitada),
      );
      formData.append(
        `detalles[${index}][contenido_por_presentacion]`,
        String(det.contenido_por_presentacion),
      );
      if (det.comentario) {
        formData.append(`detalles[${index}][comentario]`, det.comentario);
      }
      if (det.id_activo_fijo_destino) {
        formData.append(
          `detalles[${index}][id_activo_fijo_destino]`,
          String(det.id_activo_fijo_destino),
        );
      }
      // Campos de cálculo inteligente con magnitud
      if (det.con_magnitud !== undefined) {
        formData.append(
          `detalles[${index}][con_magnitud]`,
          String(det.con_magnitud ? 1 : 0),
        );
      }
      if (det.cantidad_items !== undefined) {
        formData.append(
          `detalles[${index}][cantidad_items]`,
          String(det.cantidad_items),
        );
      }
      if (det.valor_magnitud !== undefined) {
        formData.append(
          `detalles[${index}][valor_magnitud]`,
          String(det.valor_magnitud),
        );
      }
      if (det.valor_magnitud_base !== undefined) {
        formData.append(
          `detalles[${index}][valor_magnitud_base]`,
          String(det.valor_magnitud_base),
        );
      }
    });

    if (dto.evidencias) {
      dto.evidencias.forEach((file) => formData.append("evidencias[]", file));
    }

    const res = await api.post<IRespuesta<RES_RequerimientoAlmacen>>(
      path,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data;
  },

  cambiarEstadoDetalle: async (dto: DTO_AtencionCambiarEstado) => {
    const res = await api.put<IRespuesta<null>>(
      `${path}/save-decision-detalle`,
      dto,
    );
    return res.data;
  },

  obtenerDetallesRequerimiento: async (idRequerimiento: number) => {
    const res = await api.get<IRespuesta<RES_DetalleRequerimiento[]>>(
      `${path}/detalles-by-requerimiento`,
      {
        params: { id_requerimiento: idRequerimiento },
      },
    );
    return res.data;
  },

  registrarEntrega: async (dto: DTO_RegistrarEntrega) => {
    if (dto.evidencias && dto.evidencias.length > 0) {
      const formData = new FormData();
      formData.append("id_requerimiento", dto.id_requerimiento.toString());
      if (dto.id_empleado_recibe) {
        formData.append("id_empleado_recibe", dto.id_empleado_recibe.toString());
      }
      if (dto.id_contratista_recibe) {
        formData.append("id_contratista_recibe", dto.id_contratista_recibe.toString());
      }
      formData.append("fecha_entrega", dto.fecha_entrega);
      if (dto.observacion) formData.append("observacion", dto.observacion);

      dto.evidencias.forEach((file) => {
        formData.append("evidencias[]", file);
      });

      // Laravel expects details as a nested array/object structure in FormData
      dto.detalles.forEach((detalle, index) => {
        Object.entries(detalle).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            const strVal =
              typeof value === "boolean"
                ? value
                  ? "1"
                  : "0"
                : value.toString();
            formData.append(`detalles[${index}][${key}]`, strVal);
          }
        });
      });

      const res = await api.post<IRespuesta<null>>(
        `${path}/save-entrega`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return res.data;
    }

    const res = await api.post<IRespuesta<null>>(`${path}/save-entrega`, dto);
    return res.data;
  },

  obtenerHistorialEntregas: async (idRequerimiento: number) => {
    const res = await api.get<IRespuesta<RES_EntregaRequerimiento[]>>(
      `${path}/entregas`,
      {
        params: { id_requerimiento: idRequerimiento },
      },
    );
    return res.data;
  },

  obtenerTrazabilidad: async (idDetalle: number) => {
    const res = await api.get<IRespuesta<RES_Trazabilidad[]>>(
      `${path}/trazabilidad`,
      {
        params: { id_requerimiento_almacen_detalle: idDetalle },
      },
    );
    return res.data;
  },

  obtenerRequerimientos: async (
    idAlmacen: string,
    mes: string,
    yearcito: string,
  ) => {
    const res = await api.get<IRespuesta<RES_RequerimientoAlmacen[]>>(
      `${path}/requerimientos`,
      {
        params: { id_almacen: idAlmacen, mes, yearcito },
      },
    );
    return res.data;
  },

  registrarSolicitudLogistica: async (dto: DTO_CrearSolicitudLogistica) => {
    const res = await api.post<IRespuesta<null>>(
      `${path}/save-solicitud-logistica`,
      dto,
    );
    return res.data;
  },

  subirEvidencias: async (idRequerimiento: number, evidencias: File[]) => {
    const formData = new FormData();
    formData.append("id_requerimiento", String(idRequerimiento));
    evidencias.forEach((file) => formData.append("evidencias[]", file));

    const res = await api.post<IRespuesta<IArchivo[]>>(
      `${path}/evidencias`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data;
  },

  editarRequerimiento: async (
    idRequerimiento: number,
    dto: DTO_EditarRequerimiento,
  ) => {
    const formData = new FormData();

    if (dto.id_empleado_solicitante !== undefined) {
      formData.append(
        "id_empleado_solicitante",
        dto.id_empleado_solicitante === null
          ? ""
          : String(dto.id_empleado_solicitante),
      );
    }
    if (dto.id_contratista_solicitante !== undefined) {
      formData.append(
        "id_contratista_solicitante",
        dto.id_contratista_solicitante === null
          ? ""
          : String(dto.id_contratista_solicitante),
      );
    }
    if (dto.id_labor !== undefined) {
      formData.append(
        "id_labor",
        dto.id_labor === null ? "" : String(dto.id_labor),
      );
    }
    if (dto.premura !== undefined) {
      formData.append("premura", dto.premura);
    }
    if (dto.tipo_turno !== undefined) {
      formData.append(
        "tipo_turno",
        dto.tipo_turno === null ? "" : dto.tipo_turno,
      );
    }
    if (dto.fecha_entrega_requerida !== undefined) {
      formData.append("fecha_entrega_requerida", dto.fecha_entrega_requerida);
    }
    if (dto.fecha_solicitud !== undefined) {
      formData.append("fecha_solicitud", dto.fecha_solicitud);
    }
    if (dto.observacion !== undefined) {
      formData.append("observacion", dto.observacion);
    }
    if (dto.es_auditable !== undefined) {
      formData.append("es_auditable", dto.es_auditable ? "1" : "0");
    }

    (dto.detalles_editar ?? []).forEach((det, index) => {
      formData.append(
        `detalles_editar[${index}][id_requerimiento_almacen_detalle]`,
        String(det.id_requerimiento_almacen_detalle),
      );
      if (det.id_unidad_medida !== undefined) {
        formData.append(
          `detalles_editar[${index}][id_unidad_medida]`,
          String(det.id_unidad_medida),
        );
      }
      if (det.cantidad_solicitada !== undefined) {
        formData.append(
          `detalles_editar[${index}][cantidad_solicitada]`,
          String(det.cantidad_solicitada),
        );
      }
      if (det.contenido_por_presentacion !== undefined) {
        formData.append(
          `detalles_editar[${index}][contenido_por_presentacion]`,
          String(det.contenido_por_presentacion),
        );
      }
      if (det.comentario !== undefined) {
        formData.append(
          `detalles_editar[${index}][comentario]`,
          det.comentario ?? "",
        );
      }
      if (det.para_mantenimiento !== undefined) {
        formData.append(
          `detalles_editar[${index}][para_mantenimiento]`,
          det.para_mantenimiento ? "1" : "0",
        );
      }
      if (det.id_activo_fijo_destino !== undefined) {
        formData.append(
          `detalles_editar[${index}][id_activo_fijo_destino]`,
          det.id_activo_fijo_destino === null
            ? ""
            : String(det.id_activo_fijo_destino),
        );
      }
      if (det.con_magnitud !== undefined) {
        formData.append(
          `detalles_editar[${index}][con_magnitud]`,
          String(det.con_magnitud ? 1 : 0),
        );
      }
      if (det.cantidad_items !== undefined) {
        formData.append(
          `detalles_editar[${index}][cantidad_items]`,
          String(det.cantidad_items),
        );
      }
      if (det.valor_magnitud !== undefined) {
        formData.append(
          `detalles_editar[${index}][valor_magnitud]`,
          String(det.valor_magnitud),
        );
      }
      if (det.valor_magnitud_base !== undefined) {
        formData.append(
          `detalles_editar[${index}][valor_magnitud_base]`,
          String(det.valor_magnitud_base),
        );
      }
    });

    (dto.detalles_eliminar ?? []).forEach((idDetalle) => {
      formData.append(`detalles_eliminar[]`, String(idDetalle));
    });

    (dto.detalles_crear ?? []).forEach((det, index) => {
      formData.append(
        `detalles_crear[${index}][id_producto]`,
        String(det.id_producto),
      );
      formData.append(
        `detalles_crear[${index}][id_unidad_medida]`,
        String(det.id_unidad_medida),
      );
      formData.append(
        `detalles_crear[${index}][cantidad_solicitada]`,
        String(det.cantidad_solicitada),
      );
      formData.append(
        `detalles_crear[${index}][contenido_por_presentacion]`,
        String(det.contenido_por_presentacion),
      );
      if (det.comentario) {
        formData.append(`detalles_crear[${index}][comentario]`, det.comentario);
      }
      if (det.id_activo_fijo_destino) {
        formData.append(
          `detalles_crear[${index}][id_activo_fijo_destino]`,
          String(det.id_activo_fijo_destino),
        );
      }
      if (det.con_magnitud !== undefined) {
        formData.append(
          `detalles_crear[${index}][con_magnitud]`,
          String(det.con_magnitud ? 1 : 0),
        );
      }
      if (det.cantidad_items !== undefined) {
        formData.append(
          `detalles_crear[${index}][cantidad_items]`,
          String(det.cantidad_items),
        );
      }
      if (det.valor_magnitud !== undefined) {
        formData.append(
          `detalles_crear[${index}][valor_magnitud]`,
          String(det.valor_magnitud),
        );
      }
      if (det.valor_magnitud_base !== undefined) {
        formData.append(
          `detalles_crear[${index}][valor_magnitud_base]`,
          String(det.valor_magnitud_base),
        );
      }
    });

    (dto.evidencias_nuevas ?? []).forEach((file) =>
      formData.append("evidencias_nuevas[]", file),
    );

    const res = await api.put<IRespuesta<RES_RequerimientoAlmacen>>(
      `${path}/${idRequerimiento}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data;
  },

  /**
   * Anula un requerimiento (cambia su estado a "Anulado").
   * El backend rechaza si el requerimiento ya tiene entregas iniciadas.
   */
  anularRequerimiento: async (idRequerimiento: number) => {
    const res = await api.post<IRespuesta<null>>(
      `${path}/${idRequerimiento}/anular`,
    );
    return res.data;
  },
};
