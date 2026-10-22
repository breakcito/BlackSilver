import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  CargaVentaFormItem,
  ConfirmarLlegadaPayload,
  CrearVentaCarbonRequest,
} from "./venta-carbon.requests";
import type { VentaCarbonResumen } from "./venta-carbon.responses";

const PATH = "/ventas-carbon";

export const VentaCarbonService = {
  getVentas: async (filters?: {
    filtros?: string;
    id_cliente?: number;
    id_cliente_destino?: number;
    id_almacen_empresa_salida?: number;
    mes?: number;
    anio?: number;
  }): Promise<IRespuesta<VentaCarbonResumen[]>> => {
    const { data } = await api.get<IRespuesta<VentaCarbonResumen[]>>(PATH, {
      params: filters,
    });
    return data;
  },

  getVenta: async (
    idVentaCarbon: number,
  ): Promise<IRespuesta<VentaCarbonResumen>> => {
    const { data } = await api.get<IRespuesta<VentaCarbonResumen>>(
      `${PATH}/${idVentaCarbon}`,
    );
    return data;
  },

  /** Registra la venta con sus cargas opcionales (multipart por evidencias). */
  crearVenta: async (
    payload: CrearVentaCarbonRequest,
  ): Promise<IRespuesta<VentaCarbonResumen>> => {
    const formData = new FormData();

    formData.append("id_empresa", String(payload.id_empresa));
    formData.append("id_cliente", String(payload.id_cliente));
    formData.append("id_cliente_destino", String(payload.id_cliente_destino));
    formData.append(
      "id_almacen_empresa_salida",
      String(payload.id_almacen_empresa_salida),
    );
    formData.append(
      "id_almacen_cliente_llegada",
      String(payload.id_almacen_cliente_llegada),
    );

    const cargas = payload.cargas.map((c, i) => {
      if (c.archivos && c.archivos.length > 0) {
        c.archivos.forEach((file) => {
          formData.append(`evidencias_${i}[]`, file);
        });
      }
      return {
        id_tipo_carbon: c.id_tipo_carbon,
        id_vehiculo_carbon: c.id_vehiculo_carbon,
        tipo_vehiculo: c.tipo_vehiculo,
        calidad: c.calidad,
        cantidad_estimada: c.cantidad_estimada,
        segunda_placa: c.segunda_placa,
        fecha_hora_salida: c.fecha_hora_salida,
      };
    });

    formData.append("cargas", JSON.stringify(cargas));

    const { data } = await api.post<IRespuesta<VentaCarbonResumen>>(
      PATH,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  /** Añade cargas (despachos) a una venta ya registrada. */
  registrarCargas: async (
    idVentaCarbon: number,
    cargas: CargaVentaFormItem[],
  ): Promise<IRespuesta<{ ids_cargas: number[]; venta: VentaCarbonResumen }>> => {
    const formData = new FormData();

    const limpias = cargas.map((c, i) => {
      if (c.archivos && c.archivos.length > 0) {
        c.archivos.forEach((file) => {
          formData.append(`evidencias_${i}[]`, file);
        });
      }
      return {
        id_tipo_carbon: c.id_tipo_carbon,
        id_vehiculo_carbon: c.id_vehiculo_carbon,
        tipo_vehiculo: c.tipo_vehiculo,
        calidad: c.calidad,
        cantidad_estimada: c.cantidad_estimada,
        segunda_placa: c.segunda_placa,
        fecha_hora_salida: c.fecha_hora_salida,
      };
    });

    formData.append("cargas", JSON.stringify(limpias));

    const { data } = await api.post<
      IRespuesta<{ ids_cargas: number[]; venta: VentaCarbonResumen }>
    >(`${PATH}/${idVentaCarbon}/cargas`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  /** Confirma la llegada de una carga al almacén del cliente destino. */
  confirmarLlegada: async (
    idVentaCarbon: number,
    idCargaVentaCarbon: number,
    payload: ConfirmarLlegadaPayload,
  ): Promise<IRespuesta<VentaCarbonResumen>> => {
    const formData = new FormData();

    formData.append(
      "id_tipo_carbon_confirmado",
      String(payload.id_tipo_carbon_confirmado),
    );
    formData.append("cantidad_confirmada", String(payload.cantidad_confirmada));
    formData.append("fecha_hora_ingreso", payload.fecha_hora_ingreso);
    formData.append("precio_base", String(payload.precio_base));
    formData.append("descuento", String(payload.descuento));
    formData.append("bono", String(payload.bono));
    formData.append("porcentaje_ceniza", String(payload.porcentaje_ceniza));
    formData.append("porcentaje_humedad", String(payload.porcentaje_humedad));
    formData.append("porcentaje_azufre", String(payload.porcentaje_azufre));
    formData.append("porcentaje_pizarra", String(payload.porcentaje_pizarra));

    if (payload.guia_remitente)
      formData.append("guia_remitente", payload.guia_remitente);
    if (payload.guia_transportista)
      formData.append("guia_transportista", payload.guia_transportista);
    if (payload.codigo_ticket_balanza)
      formData.append("codigo_ticket_balanza", payload.codigo_ticket_balanza);
    if (payload.codigo_reporte)
      formData.append("codigo_reporte", payload.codigo_reporte);
    if (payload.observacion)
      formData.append("observacion", payload.observacion);
    if (payload.codigo_venta) formData.append("codigo_venta", payload.codigo_venta);

    if (payload.analisis_granulometria) {
      formData.append(
        "analisis_granulometria",
        JSON.stringify(payload.analisis_granulometria),
      );
    }

    if (payload.archivos && payload.archivos.length > 0) {
      payload.archivos.forEach((file) => formData.append("evidencias[]", file));
    }

    const { data } = await api.post<IRespuesta<VentaCarbonResumen>>(
      `${PATH}/${idVentaCarbon}/cargas/${idCargaVentaCarbon}/confirmar-llegada`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },
};
