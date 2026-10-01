import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  DTO_CrearSolicitud,
  DTO_EditarSolicitud,
  DTO_RegistrarRecepcion,
} from "./reabastecimiento.requests";
import type { RES_TicketLote } from "../../../service/responses/lote-producto";
import type {
  RES_Solicitud,
  RES_SolicitudDetalle,
} from "../../../service/responses/solicitudes-reabastecimiento/solicitud";
import type { RES_Trazabilidad } from "../../../service/responses/_generic/trazabilidad";
import type { RES_HistorialEntregas } from "./reabastecimiento.responses";
import type { RES_PrestamoEntrega } from "../../../service/responses/prestamos/prestamo-entrega";
import type { RES_SolicitudRecepcion } from "../../../service/responses/solicitudes-reabastecimiento/solicitud-entrega-recepcion";

const path = "/solicitudes-reabastecimiento";

export const ReabastecimientoService = {
  listar: async (filters: {
    id_almacen_solicitante?: number;
    mes: string;
    yearcito: string;
  }) => {
    const res = await api.get<IRespuesta<RES_Solicitud[]>>(path, {
      params: filters,
    });
    return res.data;
  },

  crear: async (dto: DTO_CrearSolicitud) => {
    const res = await api.post<IRespuesta<RES_Solicitud>>(path, dto);
    return res.data;
  },

  /**
   * Edita cabecera + detalles de una solicitud. Solo valido mientras al
   * menos un detalle no tenga entregas iniciadas (validacion replicada en
   * backend, pero el front la respeta via `puedeEditar`).
   */
  editar: async (id: number, dto: DTO_EditarSolicitud) => {
    const res = await api.put<IRespuesta<RES_Solicitud>>(`${path}/${id}`, dto);
    return res.data;
  },

  obtenerDetalles: async (idSolicitud: number) => {
    const res = await api.get<IRespuesta<RES_SolicitudDetalle[]>>(
      `${path}/detalles-solicitud`,
      {
        params: { id_solicitud_reabastecimiento: idSolicitud },
      },
    );
    return res.data;
  },

  obtenerTrazabilidad: async (idDetalle: number) => {
    const res = await api.get<IRespuesta<RES_Trazabilidad[]>>(
      `${path}/trazabilidad-detalle`,
      {
        params: { id_solicitud_detalle: idDetalle },
      },
    );
    return res.data;
  },

  obtenerHistorialEntregas: async (idSolicitud: number) => {
    const res = await api.get<IRespuesta<RES_HistorialEntregas>>(
      `${path}/entregas`,
      {
        params: { id_solicitud_reabastecimiento: idSolicitud },
      },
    );
    return res.data;
  },

  obtenerEntregasPrestamo: async (idSolicitud: number) => {
    const res = await api.get<IRespuesta<RES_PrestamoEntrega[]>>(
      "/prestamos-atencion/entregas-solicitud",
      {
        params: { id_solicitud: idSolicitud },
      },
    );
    return res.data;
  },

  /**
   * Registrar una recepción de stock para una entrega de LOGÍSTICA
   */
  registrarRecepcionLogistica: async (
    id_empleado_registro: number,
    recepcion: DTO_RegistrarRecepcion,
    evidencias: File[],
  ) => {
    const formData = new FormData();
    formData.append("id_empleado_registro", id_empleado_registro.toString());
    formData.append("recepcion", JSON.stringify(recepcion));

    evidencias.forEach((file) => {
      formData.append("evidencias[]", file);
    });

    const res = await api.post<IRespuesta<RES_TicketLote[]>>(
      `${path}/recepciones/registrar-recepcion-logistica`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  },

  /**
   * Registrar una recepción de stock para una entrega de PRÉSTAMO
   */
  registrarRecepcionPrestamo: async (
    id_empleado_registro: number,
    recepcion: DTO_RegistrarRecepcion,
    evidencias: File[],
  ) => {
    const formData = new FormData();
    formData.append("id_empleado_registro", id_empleado_registro.toString());
    formData.append("recepcion", JSON.stringify(recepcion));

    evidencias.forEach((file) => {
      formData.append("evidencias[]", file);
    });

    const res = await api.post<IRespuesta<RES_TicketLote[]>>(
      `${path}/recepciones/registrar-recepcion-prestamo`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  },

  getHistorialRecepcionesEntrega: async (
    idEntrega: number,
    tipoEntrega: string = "Solicitud",
  ) => {
    const res = await api.get<IRespuesta<RES_SolicitudRecepcion[]>>(
      `${path}/recepciones/historial`,
      {
        params: {
          id_reabastecimiento_entrega: idEntrega,
          tipo_entrega: tipoEntrega,
        },
      },
    );
    return res.data;
  },
};
