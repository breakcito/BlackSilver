import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  ActualizarDespachoRequest,
  RegistrarAnalisisRequest,
  RegistrarBalanzaRequest,
  RegistrarComprobanteRequest,
  RegistrarDespachoRequest,
  RegistrarFleteRequest,
  RegistrarGastoRequest,
  RegistrarLiquidacionRequest,
  RegistrarPagoRequest,
  TipoComprobanteDespacho,
} from "./venta-mineral.requests";
import type {
  CatalogoMineral,
  ComprobanteDespachoItem,
  DespachoMineralDetalle,
  DespachoMineralResumen,
  GastoDespachoItem,
  FleteDespachoItem,
  LoteMineralDespachable,
  AnalisisLaboratorioItem,
  LiquidacionMineralItem,
} from "./venta-mineral.responses";

const PATH = "/venta-mineral";

/**
 * Adjunta a un FormData los campos simples de un comprobante.
 */
const appendComprobanteComunes = (
  formData: FormData,
  payload: RegistrarComprobanteRequest,
) => {
  formData.append("codigo_comprobante", payload.codigo_comprobante);
  formData.append("fecha_emision", payload.fecha_emision);
  formData.append("con_detraccion", payload.con_detraccion ? "1" : "0");
  formData.append(
    "porcentaje_detraccion",
    String(payload.porcentaje_detraccion ?? 0),
  );
  formData.append("porcentaje_igv", String(payload.porcentaje_igv ?? 0));

  if (payload.id_transportista_mineral)
    formData.append(
      "id_transportista_mineral",
      String(payload.id_transportista_mineral),
    );
  if (payload.toneladas_cobradas !== undefined)
    formData.append(
      "toneladas_cobradas",
      String(payload.toneladas_cobradas),
    );
  if (payload.precio_por_tonelada !== undefined)
    formData.append(
      "precio_por_tonelada",
      String(payload.precio_por_tonelada),
    );
  if (payload.monto !== undefined)
    formData.append("monto", String(payload.monto));
  if (payload.id_liquidacion_mineral)
    formData.append(
      "id_liquidacion_mineral",
      String(payload.id_liquidacion_mineral),
    );

  (payload.id_fletes ?? []).forEach((id) =>
    formData.append("id_fletes[]", String(id)),
  );
  (payload.id_analisis ?? []).forEach((id) =>
    formData.append("id_analisis[]", String(id)),
  );

  (payload.evidencias ?? []).forEach((file) =>
    formData.append("evidencias[]", file),
  );
};

export const VentaMineralService = {
  /* ---------------- Despachos ---------------- */

  getDespachos: async (filters?: {
    mes?: number;
    anio?: number;
    estado?: string;
    id_lote_mineral?: number;
  }): Promise<IRespuesta<DespachoMineralResumen[]>> => {
    const { data } = await api.get<IRespuesta<DespachoMineralResumen[]>>(
      `${PATH}/despachos`,
      { params: filters },
    );
    return data;
  },

  getDespacho: async (
    idDespacho: number,
  ): Promise<IRespuesta<DespachoMineralDetalle>> => {
    const { data } = await api.get<IRespuesta<DespachoMineralDetalle>>(
      `${PATH}/despachos/${idDespacho}`,
    );
    return data;
  },

  getLotesDespachables: async (): Promise<
    IRespuesta<LoteMineralDespachable[]>
  > => {
    const { data } = await api.get<IRespuesta<LoteMineralDespachable[]>>(
      `${PATH}/lotes-despachables`,
    );
    return data;
  },

  /**
   * Registra el despacho con su flete y los gastos iniciales.
   *
   * Es multipart porque el flete puede llevar evidencias. Los datos del
   * flete viajan como `flete[...]` y los gastos como `gastos[0][...]`.
   */
  registrarDespacho: async (
    payload: RegistrarDespachoRequest,
    evidencias?: File[],
  ): Promise<IRespuesta<DespachoMineralResumen>> => {
    const formData = new FormData();

    formData.append("id_lote_mineral", String(payload.id_lote_mineral));
    formData.append("id_molino", String(payload.id_molino));
    formData.append("fecha_despacho", payload.fecha_despacho);
    formData.append("cantidad_sacos", String(payload.cantidad_sacos));
    if (payload.observaciones)
      formData.append("observaciones", payload.observaciones);

    formData.append(
      "flete[id_transportista_mineral]",
      String(payload.flete.id_transportista_mineral),
    );
    if (payload.flete.placa) formData.append("flete[placa]", payload.flete.placa);
    if (payload.flete.licencia_conductor)
      formData.append(
        "flete[licencia_conductor]",
        payload.flete.licencia_conductor,
      );
    if (payload.flete.guia_remitente)
      formData.append("flete[guia_remitente]", payload.flete.guia_remitente);
    formData.append("flete[peso_guia]", String(payload.flete.peso_guia));
    if (payload.flete.largo !== undefined && payload.flete.largo !== null)
      formData.append("flete[largo]", String(payload.flete.largo));
    if (payload.flete.ancho !== undefined && payload.flete.ancho !== null)
      formData.append("flete[ancho]", String(payload.flete.ancho));
    if (payload.flete.alto !== undefined && payload.flete.alto !== null)
      formData.append("flete[alto]", String(payload.flete.alto));

    (payload.gastos ?? []).forEach((gasto, i) => {
      formData.append(`gastos[${i}][tipo_gasto]`, gasto.tipo_gasto);
      if (gasto.descripcion)
        formData.append(`gastos[${i}][descripcion]`, gasto.descripcion);
      formData.append(`gastos[${i}][monto]`, String(gasto.monto));
    });

    (evidencias ?? []).forEach((file) =>
      formData.append("evidencias[]", file),
    );

    const { data } = await api.post<IRespuesta<DespachoMineralResumen>>(
      `${PATH}/despachos`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  actualizarDespacho: async (
    idDespacho: number,
    payload: ActualizarDespachoRequest,
  ): Promise<IRespuesta<DespachoMineralResumen>> => {
    const { data } = await api.put<IRespuesta<DespachoMineralResumen>>(
      `${PATH}/despachos/${idDespacho}`,
      payload,
    );
    return data;
  },

  eliminarDespacho: async (
    idDespacho: number,
  ): Promise<IRespuesta<null>> => {
    const { data } = await api.delete<IRespuesta<null>>(
      `${PATH}/despachos/${idDespacho}`,
    );
    return data;
  },

  /* ---------------- Gastos ---------------- */

  registrarGasto: async (
    idDespacho: number,
    payload: RegistrarGastoRequest,
  ): Promise<IRespuesta<GastoDespachoItem>> => {
    const { data } = await api.post<IRespuesta<GastoDespachoItem>>(
      `${PATH}/despachos/${idDespacho}/gastos`,
      payload,
    );
    return data;
  },

  actualizarGasto: async (
    idGasto: number,
    payload: RegistrarGastoRequest,
  ): Promise<IRespuesta<GastoDespachoItem>> => {
    const { data } = await api.put<IRespuesta<GastoDespachoItem>>(
      `${PATH}/gastos/${idGasto}`,
      payload,
    );
    return data;
  },

  eliminarGasto: async (idGasto: number): Promise<IRespuesta<null>> => {
    const { data } = await api.delete<IRespuesta<null>>(`${PATH}/gastos/${idGasto}`);
    return data;
  },

  /* ---------------- Fletes ---------------- */

  registrarFlete: async (
    idDespacho: number,
    payload: RegistrarFleteRequest,
  ): Promise<IRespuesta<FleteDespachoItem>> => {
    const formData = new FormData();
    formData.append(
      "id_transportista_mineral",
      String(payload.id_transportista_mineral),
    );
    if (payload.placa) formData.append("placa", payload.placa);
    if (payload.licencia_conductor)
      formData.append("licencia_conductor", payload.licencia_conductor);
    if (payload.guia_remitente)
      formData.append("guia_remitente", payload.guia_remitente);
    formData.append("peso_guia", String(payload.peso_guia));
    if (payload.largo !== undefined && payload.largo !== null)
      formData.append("largo", String(payload.largo));
    if (payload.ancho !== undefined && payload.ancho !== null)
      formData.append("ancho", String(payload.ancho));
    if (payload.alto !== undefined && payload.alto !== null)
      formData.append("alto", String(payload.alto));

    (payload.evidencias ?? []).forEach((file) =>
      formData.append("evidencias[]", file),
    );

    const { data } = await api.post<IRespuesta<FleteDespachoItem>>(
      `${PATH}/despachos/${idDespacho}/fletes`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  /**
   * Registra el peso de balanza de un flete.
   *
   * Va aparte del alta del flete: los datos de balanza llegan cuando el
   * vehiculo ya esta en el molino y se pesa.
   */
  registrarBalanza: async (
    idFlete: number,
    payload: RegistrarBalanzaRequest,
  ): Promise<IRespuesta<FleteDespachoItem>> => {
    const formData = new FormData();
    formData.append("codigo_ticket_balanza", payload.codigo_ticket_balanza);
    if (payload.segunda_guia_remitente)
      formData.append("segunda_guia_remitente", payload.segunda_guia_remitente);
    formData.append("peso_bruto", String(payload.peso_bruto));
    formData.append("tara", String(payload.tara));
    formData.append("fecha_hora_pesaje", payload.fecha_hora_pesaje);

    (payload.evidencias ?? []).forEach((file) =>
      formData.append("evidencias[]", file),
    );

    const { data } = await api.post<IRespuesta<FleteDespachoItem>>(
      `${PATH}/fletes/${idFlete}/balanza`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  actualizarFlete: async (
    idFlete: number,
    payload: RegistrarFleteRequest,
  ): Promise<IRespuesta<FleteDespachoItem>> => {
    const formData = new FormData();
    formData.append(
      "id_transportista_mineral",
      String(payload.id_transportista_mineral),
    );
    if (payload.placa) formData.append("placa", payload.placa);
    if (payload.licencia_conductor)
      formData.append("licencia_conductor", payload.licencia_conductor);
    if (payload.guia_remitente)
      formData.append("guia_remitente", payload.guia_remitente);
    formData.append("peso_guia", String(payload.peso_guia));
    if (payload.largo !== undefined && payload.largo !== null)
      formData.append("largo", String(payload.largo));
    if (payload.ancho !== undefined && payload.ancho !== null)
      formData.append("ancho", String(payload.ancho));
    if (payload.alto !== undefined && payload.alto !== null)
      formData.append("alto", String(payload.alto));

    (payload.evidencias ?? []).forEach((file) =>
      formData.append("evidencias[]", file),
    );

    const { data } = await api.put<IRespuesta<FleteDespachoItem>>(
      `${PATH}/fletes/${idFlete}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  eliminarFlete: async (idFlete: number): Promise<IRespuesta<null>> => {
    const { data } = await api.delete<IRespuesta<null>>(
      `${PATH}/fletes/${idFlete}`,
    );
    return data;
  },

  /* ---------------- Analisis ---------------- */

  registrarAnalisis: async (
    idDespacho: number,
    payload: RegistrarAnalisisRequest,
  ): Promise<IRespuesta<AnalisisLaboratorioItem>> => {
    const formData = new FormData();
    formData.append("id_laboratorio", String(payload.id_laboratorio));
    if (payload.id_cliente)
      formData.append("id_cliente", String(payload.id_cliente));
    formData.append("asumido_por", payload.asumido_por);
    if (payload.codigo_laboratorio)
      formData.append("codigo_laboratorio", payload.codigo_laboratorio);
    if (payload.codigo_cliente)
      formData.append("codigo_cliente", payload.codigo_cliente);
    if (payload.fecha_analisis)
      formData.append("fecha_analisis", payload.fecha_analisis);
    formData.append(
      "porcentaje_humedad",
      String(payload.porcentaje_humedad ?? 0),
    );
    formData.append("ley_oro", String(payload.ley_oro ?? 0));
    formData.append("ley_plata", String(payload.ley_plata ?? 0));
    formData.append("ley_cobre", String(payload.ley_cobre ?? 0));
    formData.append("ley_zinc", String(payload.ley_zinc ?? 0));
    formData.append("ley_arsenico", String(payload.ley_arsenico ?? 0));
    formData.append("costo_servicio", String(payload.costo_servicio ?? 0));

    (payload.evidencias ?? []).forEach((file) =>
      formData.append("evidencias[]", file),
    );

    const { data } = await api.post<IRespuesta<AnalisisLaboratorioItem>>(
      `${PATH}/despachos/${idDespacho}/analisis`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  actualizarAnalisis: async (
    idAnalisis: number,
    payload: RegistrarAnalisisRequest,
  ): Promise<IRespuesta<AnalisisLaboratorioItem>> => {
    const formData = new FormData();
    formData.append("id_laboratorio", String(payload.id_laboratorio));
    if (payload.id_cliente)
      formData.append("id_cliente", String(payload.id_cliente));
    formData.append("asumido_por", payload.asumido_por);
    if (payload.codigo_laboratorio)
      formData.append("codigo_laboratorio", payload.codigo_laboratorio);
    if (payload.codigo_cliente)
      formData.append("codigo_cliente", payload.codigo_cliente);
    if (payload.fecha_analisis)
      formData.append("fecha_analisis", payload.fecha_analisis);
    formData.append(
      "porcentaje_humedad",
      String(payload.porcentaje_humedad ?? 0),
    );
    formData.append("ley_oro", String(payload.ley_oro ?? 0));
    formData.append("ley_plata", String(payload.ley_plata ?? 0));
    formData.append("ley_cobre", String(payload.ley_cobre ?? 0));
    formData.append("ley_zinc", String(payload.ley_zinc ?? 0));
    formData.append("ley_arsenico", String(payload.ley_arsenico ?? 0));
    formData.append("costo_servicio", String(payload.costo_servicio ?? 0));

    (payload.evidencias ?? []).forEach((file) =>
      formData.append("evidencias[]", file),
    );

    const { data } = await api.put<IRespuesta<AnalisisLaboratorioItem>>(
      `${PATH}/analisis/${idAnalisis}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  eliminarAnalisis: async (idAnalisis: number): Promise<IRespuesta<null>> => {
    const { data } = await api.delete<IRespuesta<null>>(
      `${PATH}/analisis/${idAnalisis}`,
    );
    return data;
  },

  /* ---------------- Liquidaciones ---------------- */

  registrarLiquidacion: async (
    idDespacho: number,
    payload: RegistrarLiquidacionRequest,
  ): Promise<IRespuesta<LiquidacionMineralItem>> => {
    const { data } = await api.post<IRespuesta<LiquidacionMineralItem>>(
      `${PATH}/despachos/${idDespacho}/liquidaciones`,
      payload,
    );
    return data;
  },

  actualizarLiquidacion: async (
    idLiquidacion: number,
    payload: RegistrarLiquidacionRequest,
  ): Promise<IRespuesta<LiquidacionMineralItem>> => {
    const { data } = await api.put<IRespuesta<LiquidacionMineralItem>>(
      `${PATH}/liquidaciones/${idLiquidacion}`,
      payload,
    );
    return data;
  },

  eliminarLiquidacion: async (
    idLiquidacion: number,
  ): Promise<IRespuesta<null>> => {
    const { data } = await api.delete<IRespuesta<null>>(
      `${PATH}/liquidaciones/${idLiquidacion}`,
    );
    return data;
  },

  /* ---------------- Comprobantes ---------------- */

  registrarComprobante: async (
    tipo: TipoComprobanteDespacho,
    idDespacho: number,
    payload: RegistrarComprobanteRequest,
  ): Promise<IRespuesta<ComprobanteDespachoItem>> => {
    const formData = new FormData();
    appendComprobanteComunes(formData, payload);

    const { data } = await api.post<IRespuesta<ComprobanteDespachoItem>>(
      `${PATH}/despachos/${idDespacho}/comprobantes-${tipo}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  actualizarComprobante: async (
    tipo: TipoComprobanteDespacho,
    idComprobante: number,
    payload: RegistrarComprobanteRequest,
  ): Promise<IRespuesta<ComprobanteDespachoItem>> => {
    const formData = new FormData();
    appendComprobanteComunes(formData, payload);

    const { data } = await api.put<IRespuesta<ComprobanteDespachoItem>>(
      `${PATH}/comprobantes-${tipo}/${idComprobante}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  eliminarComprobante: async (
    tipo: TipoComprobanteDespacho,
    idComprobante: number,
  ): Promise<IRespuesta<null>> => {
    const { data } = await api.delete<IRespuesta<null>>(
      `${PATH}/comprobantes-${tipo}/${idComprobante}`,
    );
    return data;
  },

  registrarPago: async (
    tipo: TipoComprobanteDespacho,
    idComprobante: number,
    payload: RegistrarPagoRequest,
  ): Promise<IRespuesta<ComprobanteDespachoItem>> => {
    const formData = new FormData();
    formData.append("medio_pago", payload.medio_pago);
    formData.append("fecha_hora_pago", payload.fecha_hora_pago);
    formData.append("monto_pagado", String(payload.monto_pagado));
    formData.append(
      "es_para_detraccion",
      payload.es_para_detraccion ? "1" : "0",
    );
    if (payload.numero_operacion)
      formData.append("numero_operacion", payload.numero_operacion);
    if (payload.id_cuenta_bancaria_empresa)
      formData.append(
        "id_cuenta_bancaria_empresa",
        String(payload.id_cuenta_bancaria_empresa),
      );
    if (payload.observacion)
      formData.append("observacion", payload.observacion);

    (payload.evidencias ?? []).forEach((file) =>
      formData.append("evidencias[]", file),
    );

    const { data } = await api.post<IRespuesta<ComprobanteDespachoItem>>(
      `${PATH}/comprobantes-${tipo}/${idComprobante}/pagos`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  /* ---------------- Catalogos ---------------- */

  getMolinos: async (): Promise<IRespuesta<CatalogoMineral[]>> => {
    const { data } = await api.get<IRespuesta<CatalogoMineral[]>>(
      `${PATH}/catalogos/molinos`,
    );
    return data;
  },

  crearMolino: async (payload: {
    razon_social: string;
    ruc?: string | null;
  }): Promise<IRespuesta<CatalogoMineral>> => {
    const { data } = await api.post<IRespuesta<CatalogoMineral>>(
      `${PATH}/catalogos/molinos`,
      payload,
    );
    return data;
  },

  getTransportistas: async (): Promise<IRespuesta<CatalogoMineral[]>> => {
    const { data } = await api.get<IRespuesta<CatalogoMineral[]>>(
      `${PATH}/catalogos/transportistas`,
    );
    return data;
  },

  crearTransportista: async (payload: {
    razon_social: string;
    ruc?: string | null;
  }): Promise<IRespuesta<CatalogoMineral>> => {
    const { data } = await api.post<IRespuesta<CatalogoMineral>>(
      `${PATH}/catalogos/transportistas`,
      payload,
    );
    return data;
  },

  getLaboratorios: async (): Promise<IRespuesta<CatalogoMineral[]>> => {
    const { data } = await api.get<IRespuesta<CatalogoMineral[]>>(
      `${PATH}/catalogos/laboratorios`,
    );
    return data;
  },

  crearLaboratorio: async (payload: {
    razon_social: string;
    ruc?: string | null;
  }): Promise<IRespuesta<CatalogoMineral>> => {
    const { data } = await api.post<IRespuesta<CatalogoMineral>>(
      `${PATH}/catalogos/laboratorios`,
      payload,
    );
    return data;
  },
};
