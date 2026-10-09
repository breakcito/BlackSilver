import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  CrearCompraCarbonRequest,
  CargaFormItem,
  RegistrarComprobanteProveedorPayload,
  RegistrarPagoProveedorPayload,
  RegistrarComprobanteTransportePayload,
  RegistrarPagoTransportePayload,
} from "./compra-carbon.requests";
import type {
  CompraCarbonResumen,
  CompraCarbonDetalleResponse,
  RespuestaRegistrarComprobanteProveedor,
  RespuestaRegistrarPagoProveedor,
  RespuestaRegistrarComprobanteTransporte,
  RespuestaRegistrarPagoTransporte,
} from "./compra-carbon.responses";

const PATH = "/compras-carbon";

export const CompraCarbonService = {
  getCompras: async (filters?: {
    filtros?: string;
    id_empresa?: number;
    id_proveedor?: number;
    mes?: number;
    anio?: number;
  }): Promise<IRespuesta<CompraCarbonResumen[]>> => {
    const { data } = await api.get<IRespuesta<CompraCarbonResumen[]>>(PATH, {
      params: filters,
    });
    return data;
  },

  getCompraConDetalles: async (
    idCompraCarbon: number,
  ): Promise<IRespuesta<CompraCarbonDetalleResponse>> => {
    const { data } = await api.get<IRespuesta<CompraCarbonDetalleResponse>>(
      `${PATH}/${idCompraCarbon}`,
    );
    return data;
  },

  crearCompra: async (
    payload: CrearCompraCarbonRequest,
  ): Promise<IRespuesta<CompraCarbonResumen>> => {
    const { data } = await api.post<IRespuesta<CompraCarbonResumen>>(
      PATH,
      payload,
    );
    return data;
  },

  registrarCargas: async (
    idCompraCarbon: number,
    cargas: CargaFormItem[],
  ): Promise<IRespuesta<{ ids_cargas: number[] }>> => {
    const formData = new FormData();

    const cargasLimpias = cargas.map((c, i) => {
      if (c.archivos && c.archivos.length > 0) {
        c.archivos.forEach((file) => {
          formData.append(`evidencias_${i}[]`, file);
        });
      }
      const { archivos, ...resto } = c;
      return resto;
    });

    formData.append("cargas", JSON.stringify(cargasLimpias));

    const { data } = await api.post<IRespuesta<{ ids_cargas: number[] }>>(
      `${PATH}/${idCompraCarbon}/cargas`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return data;
  },

  cerrarCompra: async (idCompraCarbon: number): Promise<IRespuesta<null>> => {
    const { data } = await api.post<IRespuesta<null>>(
      `${PATH}/${idCompraCarbon}/cerrar`,
    );
    return data;
  },

  anularCompra: async (idCompraCarbon: number): Promise<IRespuesta<null>> => {
    const { data } = await api.post<IRespuesta<null>>(
      `${PATH}/${idCompraCarbon}/anular`,
    );
    return data;
  },

  registrarComprobanteProveedor: async (
    idCompraCarbon: number,
    payload: RegistrarComprobanteProveedorPayload,
  ): Promise<IRespuesta<RespuestaRegistrarComprobanteProveedor>> => {
    const formData = new FormData();
    formData.append("codigo_comprobante", payload.codigo_comprobante);
    formData.append("fecha_emision", payload.fecha_emision);
    if (payload.observacion) formData.append("observacion", payload.observacion);
    formData.append("con_detraccion", payload.con_detraccion ? "1" : "0");
    if (payload.porcentaje_detraccion !== undefined) {
      formData.append("porcentaje_detraccion", String(payload.porcentaje_detraccion));
    }
    formData.append("ids_cargas", JSON.stringify(payload.ids_cargas));
    if (payload.anticipos && payload.anticipos.length > 0) {
      formData.append("anticipos", JSON.stringify(payload.anticipos));
    }
    if (payload.evidencias && payload.evidencias.length > 0) {
      payload.evidencias.forEach((f) => formData.append("evidencias[]", f));
    }

    const { data } = await api.post<IRespuesta<RespuestaRegistrarComprobanteProveedor>>(
      `${PATH}/${idCompraCarbon}/comprobantes-proveedor`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  registrarPagoProveedor: async (
    idCompraCarbon: number,
    payload: RegistrarPagoProveedorPayload,
  ): Promise<IRespuesta<RespuestaRegistrarPagoProveedor>> => {
    const formData = new FormData();
    if (payload.id_comprobante_compra_carbon) {
      formData.append("id_comprobante_compra_carbon", String(payload.id_comprobante_compra_carbon));
    }
    formData.append("id_cuenta_bancaria_empresa", String(payload.id_cuenta_bancaria_empresa));
    if (payload.id_cuenta_bancaria_proveedor) {
      formData.append("id_cuenta_bancaria_proveedor", String(payload.id_cuenta_bancaria_proveedor));
    }
    formData.append("medio_pago", payload.medio_pago);
    if (payload.numero_operacion) formData.append("numero_operacion", payload.numero_operacion);
    formData.append("fecha_hora_pago", payload.fecha_hora_pago);
    formData.append("es_para_detraccion", payload.es_para_detraccion ? "1" : "0");
    formData.append("monto_pagado", String(payload.monto_pagado));
    if (payload.observacion) formData.append("observacion", payload.observacion);
    if (payload.ids_cargas && payload.ids_cargas.length > 0) {
      formData.append("ids_cargas", JSON.stringify(payload.ids_cargas));
    }
    if (payload.anticipos && payload.anticipos.length > 0) {
      formData.append("anticipos", JSON.stringify(payload.anticipos));
    }
    if (payload.evidencias && payload.evidencias.length > 0) {
      payload.evidencias.forEach((f) => formData.append("evidencias[]", f));
    }

    const { data } = await api.post<IRespuesta<RespuestaRegistrarPagoProveedor>>(
      `${PATH}/${idCompraCarbon}/pagos-proveedor`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  registrarComprobanteTransporte: async (
    idCompraCarbon: number,
    payload: RegistrarComprobanteTransportePayload,
  ): Promise<IRespuesta<RespuestaRegistrarComprobanteTransporte>> => {
    const formData = new FormData();
    formData.append("id_transportista", String(payload.id_transportista));
    formData.append("codigo_comprobante", payload.codigo_comprobante);
    formData.append("fecha_emision", payload.fecha_emision);
    if (payload.observacion) formData.append("observacion", payload.observacion);
    formData.append("con_detraccion", payload.con_detraccion ? "1" : "0");
    if (payload.porcentaje_detraccion !== undefined) {
      formData.append("porcentaje_detraccion", String(payload.porcentaje_detraccion));
    }
    formData.append("ids_cargas", JSON.stringify(payload.ids_cargas));
    if (payload.evidencias && payload.evidencias.length > 0) {
      payload.evidencias.forEach((f) => formData.append("evidencias[]", f));
    }

    const { data } = await api.post<IRespuesta<RespuestaRegistrarComprobanteTransporte>>(
      `${PATH}/${idCompraCarbon}/comprobantes-transporte`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  registrarPagoTransporte: async (
    idCompraCarbon: number,
    payload: RegistrarPagoTransportePayload,
  ): Promise<IRespuesta<RespuestaRegistrarPagoTransporte>> => {
    const formData = new FormData();
    formData.append("id_comprobante_transporte_carbon", String(payload.id_comprobante_transporte_carbon));
    formData.append("id_cuenta_bancaria_empresa", String(payload.id_cuenta_bancaria_empresa));
    if (payload.id_cuenta_bancaria_transportista) {
      formData.append("id_cuenta_bancaria_transportista", String(payload.id_cuenta_bancaria_transportista));
    }
    formData.append("medio_pago", payload.medio_pago);
    if (payload.numero_operacion) formData.append("numero_operacion", payload.numero_operacion);
    formData.append("fecha_hora_pago", payload.fecha_hora_pago);
    formData.append("es_para_detraccion", payload.es_para_detraccion ? "1" : "0");
    formData.append("monto_pagado", String(payload.monto_pagado));
    if (payload.observacion) formData.append("observacion", payload.observacion);
    if (payload.evidencias && payload.evidencias.length > 0) {
      payload.evidencias.forEach((f) => formData.append("evidencias[]", f));
    }

    const { data } = await api.post<IRespuesta<RespuestaRegistrarPagoTransporte>>(
      `${PATH}/${idCompraCarbon}/pagos-transporte`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },
};
