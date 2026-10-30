import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  CargaLiquidacionFormItem,
  CargaVentaFormItem,
  ConfirmarLlegadaPayload,
  CrearVentaCarbonRequest,
  RegistrarComprobantePayload,
  RegistrarLiquidacionPayload,
  RegistrarPagoPayload,
} from "./venta-carbon.requests";
import type {
  LiquidacionVentaCarbonItem,
  StockDisponibleCarbon,
  VentaCarbonResumen,
} from "./venta-carbon.responses";

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

  /**
   * Stock realmente despachable de un almacen: ya descuenta las cargas que
   * salieron y siguen pendientes de confirmar.
   */
  getStockDisponible: async (
    idAlmacen: number,
  ): Promise<IRespuesta<StockDisponibleCarbon[]>> => {
    const { data } = await api.get<IRespuesta<StockDisponibleCarbon[]>>(
      `${PATH}/stock-disponible`,
      { params: { id_almacen: idAlmacen } },
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
    formData.append("porcentaje_igv", String(payload.porcentaje_igv));
    formData.append(
      "porcentaje_detraccion",
      String(payload.porcentaje_detraccion),
    );

    const cargas = payload.cargas.map((c, i) => {
      if (c.archivos && c.archivos.length > 0) {
        c.archivos.forEach((file) => {
          formData.append(`evidencias_${i}[]`, file);
        });
      }
      return {
        id_tipo_carbon: c.id_tipo_carbon,
        calidad: c.calidad,
        cantidad_toneladas: c.cantidad_toneladas,
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
  ): Promise<
    IRespuesta<{ ids_cargas: number[]; venta: VentaCarbonResumen }>
  > => {
    const formData = new FormData();

    const limpias = cargas.map((c, i) => {
      if (c.archivos && c.archivos.length > 0) {
        c.archivos.forEach((file) => {
          formData.append(`evidencias_${i}[]`, file);
        });
      }
      return {
        id_tipo_carbon: c.id_tipo_carbon,
        calidad: c.calidad,
        cantidad_toneladas: c.cantidad_toneladas,
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

    formData.append("id_tipo_carbon", String(payload.id_tipo_carbon));
    formData.append("calidad", String(payload.calidad));
    formData.append("cantidad_toneladas", String(payload.cantidad_toneladas));
    formData.append("fecha_hora_ingreso", payload.fecha_hora_ingreso);
    formData.append(
      "id_vehiculo_carbon",
      String(payload.id_vehiculo_carbon),
    );
    formData.append("porcentaje_ceniza", String(payload.porcentaje_ceniza));
    formData.append("porcentaje_humedad", String(payload.porcentaje_humedad));
    formData.append("porcentaje_azufre", String(payload.porcentaje_azufre));
    formData.append("porcentaje_pizarra", String(payload.porcentaje_pizarra));
    formData.append("fue_aceptado", payload.fue_aceptado ? "1" : "0");

    if (payload.segunda_placa)
      formData.append("segunda_placa", payload.segunda_placa);
    if (payload.guia_remitente)
      formData.append("guia_remitente", payload.guia_remitente);
    if (payload.guia_transportista)
      formData.append("guia_transportista", payload.guia_transportista);
    if (payload.codigo_ticket_balanza)
      formData.append("codigo_ticket_balanza", payload.codigo_ticket_balanza);
    if (payload.observacion)
      formData.append("observacion", payload.observacion);

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

  /** Registra la liquidación de un tipo de carbón con sus precios. */
  registrarLiquidacion: async (
    idVentaCarbon: number,
    payload: RegistrarLiquidacionPayload,
  ): Promise<IRespuesta<Record<number, LiquidacionVentaCarbonItem[]>>> => {
    const formData = new FormData();

    formData.append("id_tipo_carbon", String(payload.id_tipo_carbon));
    if (payload.codigo_orden_compra)
      formData.append("codigo_orden_compra", payload.codigo_orden_compra);
    if (payload.numero_reporte)
      formData.append("numero_reporte", payload.numero_reporte);
    if (payload.fecha_aprobacion)
      formData.append("fecha_aprobacion", payload.fecha_aprobacion);
    if (payload.version) formData.append("version", payload.version);

    formData.append("cargas", JSON.stringify(payload.cargas));

    if (payload.evidencias && payload.evidencias.length > 0) {
      payload.evidencias.forEach((file) => formData.append("evidencias[]", file));
    }

    const { data } = await api.post<
      IRespuesta<Record<number, LiquidacionVentaCarbonItem[]>>
    >(`${PATH}/${idVentaCarbon}/liquidaciones`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  /** Actualiza la liquidación y recalcula sus importes. */
  actualizarLiquidacion: async (
    idVentaCarbon: number,
    idLiquidacion: number,
    payload: RegistrarLiquidacionPayload,
  ): Promise<IRespuesta<Record<number, LiquidacionVentaCarbonItem[]>>> => {
    const formData = new FormData();

    formData.append("id_tipo_carbon", String(payload.id_tipo_carbon));
    if (payload.codigo_orden_compra)
      formData.append("codigo_orden_compra", payload.codigo_orden_compra);
    if (payload.numero_reporte)
      formData.append("numero_reporte", payload.numero_reporte);
    if (payload.fecha_aprobacion)
      formData.append("fecha_aprobacion", payload.fecha_aprobacion);
    if (payload.version) formData.append("version", payload.version);

    formData.append("cargas", JSON.stringify(payload.cargas));

    if (payload.evidencias && payload.evidencias.length > 0) {
      payload.evidencias.forEach((file) => formData.append("evidencias[]", file));
    }

    const { data } = await api.put<
      IRespuesta<Record<number, LiquidacionVentaCarbonItem[]>>
    >(`${PATH}/${idVentaCarbon}/liquidaciones/${idLiquidacion}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  /** Confirma la liquidación: habilita el registro de su comprobante. */
  confirmarLiquidacion: async (
    idVentaCarbon: number,
    idLiquidacion: number,
  ): Promise<IRespuesta<Record<number, LiquidacionVentaCarbonItem[]>>> => {
    const { data } = await api.post<
      IRespuesta<Record<number, LiquidacionVentaCarbonItem[]>>
    >(`${PATH}/${idVentaCarbon}/liquidaciones/${idLiquidacion}/confirmar`);
    return data;
  },

  /** Registra el comprobante de una liquidación confirmada. */
  registrarComprobante: async (
    idVentaCarbon: number,
    idLiquidacion: number,
    payload: RegistrarComprobantePayload,
  ): Promise<IRespuesta<Record<number, LiquidacionVentaCarbonItem[]>>> => {
    const formData = new FormData();

    formData.append("codigo_comprobante", payload.codigo_comprobante);
    formData.append("fecha_emision", payload.fecha_emision);
    if (payload.observacion)
      formData.append("observacion", payload.observacion);

    if (payload.evidencias && payload.evidencias.length > 0) {
      payload.evidencias.forEach((file) => formData.append("evidencias[]", file));
    }

    const { data } = await api.post<
      IRespuesta<Record<number, LiquidacionVentaCarbonItem[]>>
    >(
      `${PATH}/${idVentaCarbon}/liquidaciones/${idLiquidacion}/comprobantes`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  /** Registra un pago del cliente sobre el comprobante de una liquidación. */
  registrarPago: async (
    idVentaCarbon: number,
    idComprobante: number,
    payload: RegistrarPagoPayload,
  ): Promise<IRespuesta<Record<number, LiquidacionVentaCarbonItem[]>>> => {
    const formData = new FormData();

    formData.append("medio_pago", String(payload.medio_pago));
    formData.append("fecha_hora_pago", payload.fecha_hora_pago);
    formData.append("monto_pagado", String(payload.monto_pagado));
    formData.append(
      "es_para_detraccion",
      payload.es_para_detraccion ? "1" : "0",
    );

    if (payload.id_cuenta_bancaria_empresa)
      formData.append(
        "id_cuenta_bancaria_empresa",
        String(payload.id_cuenta_bancaria_empresa),
      );
    if (payload.numero_operacion)
      formData.append("numero_operacion", payload.numero_operacion);
    if (payload.observacion)
      formData.append("observacion", payload.observacion);

    if (payload.evidencias && payload.evidencias.length > 0) {
      payload.evidencias.forEach((file) => formData.append("evidencias[]", file));
    }

    const { data } = await api.post<
      IRespuesta<Record<number, LiquidacionVentaCarbonItem[]>>
    >(
      `${PATH}/${idVentaCarbon}/comprobantes/${idComprobante}/pagos`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },
};

/** Reexporta el tipo de carga de la liquidacion para las vistas. */
export type { CargaLiquidacionFormItem };
