import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type { IArchivo } from "../../../shared/interfaces/archivo";
import type {
  ActualizarCompraCarbonRequest,
  AprobarLiquidacionRequest,
  ConfirmarCompraCarbonRequest,
  CrearCompraCarbonPreliminarRequest,
  CrearCompraCarbonRequest,
  RegistrarComprobanteProveedorRequest,
  RegistrarComprobanteTransporteRequest,
  RegistrarPagoProveedorRequest,
  RegistrarPagoTransporteRequest,
  VerificarDocumentosDuplicadosRequest,
} from "./compra-carbon.requests";
import type {
  ComprobanteCompraCarbonResponse,
  ComprobanteTransporteCarbonResponse,
  CompraCarbonDetalleResponse,
  CompraCarbonResumen,
  DocumentoDuplicadoItem,
  GrupoFleteTransportista,
  PagosCompraCarbonResponse,
} from "./compra-carbon.responses";

const path = "/compras-carbon";

export const CompraCarbonService = {
  getCompras: async (filtros?: {
    filtros?: string;
    id_empresa?: number;
    id_proveedor?: number;
    mes?: number;
    anio?: number;
  }): Promise<IRespuesta<CompraCarbonResumen[]>> => {
    const { data } = await api.get<IRespuesta<CompraCarbonResumen[]>>(path, {
      params: filtros,
    });
    return data;
  },

  getCompraConDetalles: async (
    idCompraCarbon: number,
  ): Promise<IRespuesta<CompraCarbonDetalleResponse>> => {
    const { data } = await api.get<IRespuesta<CompraCarbonDetalleResponse>>(
      `${path}/${idCompraCarbon}`,
    );
    return data;
  },

  /**
   * Obtiene los tipos de carbón ofrecidos por un proveedor.
   */
  getTiposPorProveedor: async (
    idProveedor: number,
  ): Promise<IRespuesta<{ id_tipo_carbon: number; nombre: string; codigo: string | null; para_compra: boolean }[]>> => {
    const { data } = await api.get<
      IRespuesta<{ id_tipo_carbon: number; nombre: string; codigo: string | null; para_compra: boolean }[]>
    >(`/tipo-carbon`, {
      params: { id_proveedor: idProveedor, para_compra: 1 },
    });
    return data;
  },

  /**
   * Registro preliminar de la compra de carbón.
   */
  crearPreliminar: async (
    payload: CrearCompraCarbonPreliminarRequest,
  ): Promise<IRespuesta<CompraCarbonDetalleResponse>> => {
    const { data } = await api.post<IRespuesta<CompraCarbonDetalleResponse>>(
      path,
      payload,
    );
    return data;
  },

  /**
   * Arma el multipart de confirmar/editar. `detalles` viaja como JSON string
   * y los booleanos como "1"/"0": en multipart todo llega como texto, y un
   * `false` en PHP seria truthy.
   */
  buildFormCompraCarbon: (
    payload: ActualizarCompraCarbonRequest,
    archivos: File[] = [],
  ): FormData => {
    const { detalles, aplica_igv, motivo, ...cabecera } = payload;
    const form = new FormData();

    Object.entries(cabecera).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      form.append(key, String(value));
    });

    form.append("aplica_igv", aplica_igv ? "1" : "0");
    form.append("detalles", JSON.stringify(detalles ?? []));
    if (motivo) form.append("motivo", motivo);

    archivos.forEach((file) => form.append("evidencias[]", file));

    return form;
  },

  /**
   * Confirmación de llegada de carga. Los adjuntos viajan en el mismo request:
   * la API los persiste con su ArchivoHelper y devuelve el `evidencias` final.
   */
  confirmar: async (
    idCompraCarbon: number,
    payload: ConfirmarCompraCarbonRequest,
    archivos: File[] = [],
  ): Promise<IRespuesta<CompraCarbonDetalleResponse>> => {
    const { data } = await api.post<IRespuesta<CompraCarbonDetalleResponse>>(
      `${path}/${idCompraCarbon}/confirmar`,
      CompraCarbonService.buildFormCompraCarbon(payload, archivos),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  /**
   * Actualización / edición de una compra (con log_cambios).
   */
  actualizar: async (
    idCompraCarbon: number,
    payload: ActualizarCompraCarbonRequest,
    archivos: File[] = [],
  ): Promise<IRespuesta<CompraCarbonDetalleResponse>> => {
    const { data } = await api.post<IRespuesta<CompraCarbonDetalleResponse>>(
      `${path}/${idCompraCarbon}`,
      CompraCarbonService.buildFormCompraCarbon(payload, archivos),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  /**
   * Aprobación de la liquidación de la orden de compra con anticipos.
   */
  aprobarLiquidacion: async (
    idCompraCarbon: number,
    payload?: AprobarLiquidacionRequest,
  ): Promise<IRespuesta<CompraCarbonDetalleResponse>> => {
    const { data } = await api.post<IRespuesta<CompraCarbonDetalleResponse>>(
      `${path}/${idCompraCarbon}/aprobar-liquidacion`,
      payload ?? {},
    );
    return data;
  },

  /**
   * Alias histórico para aprobar.
   */
  aprobar: async (
    idCompraCarbon: number,
  ): Promise<IRespuesta<CompraCarbonDetalleResponse>> => {
    const { data } = await api.post<IRespuesta<CompraCarbonDetalleResponse>>(
      `${path}/${idCompraCarbon}/aprobar`,
    );
    return data;
  },

  /**
   * Reemplaza las evidencias de la compra (JSON en backend).
   */
  setEvidenciasAprobacion: async (
    idCompraCarbon: number,
    evidencias: IArchivo[],
  ): Promise<IRespuesta<CompraCarbonDetalleResponse>> => {
    const { data } = await api.post<IRespuesta<CompraCarbonDetalleResponse>>(
      `${path}/${idCompraCarbon}/evidencias`,
      { evidencias },
    );
    return data;
  },

  /**
   * Anula una compra de carbón.
   */
  anular: async (
    idCompraCarbon: number,
  ): Promise<IRespuesta<CompraCarbonDetalleResponse>> => {
    const { data } = await api.post<IRespuesta<CompraCarbonDetalleResponse>>(
      `${path}/${idCompraCarbon}/anular`,
    );
    return data;
  },

  /**
   * Verifica documentos duplicados (ticket, guías) en compras anteriores del proveedor.
   */
  verificarDocumentosDuplicados: async (
    payload: VerificarDocumentosDuplicadosRequest,
  ): Promise<IRespuesta<DocumentoDuplicadoItem[]>> => {
    const { data } = await api.post<IRespuesta<DocumentoDuplicadoItem[]>>(
      `${path}/verificar-documentos`,
      payload,
    );
    return data;
  },

  /**
   * Método compatible con interfaz anterior para crear compra.
   */
  crearCompra: async (
    payload: CrearCompraCarbonRequest,
  ): Promise<IRespuesta<CompraCarbonDetalleResponse>> => {
    const { data } = await api.post<IRespuesta<CompraCarbonDetalleResponse>>(
      path,
      payload,
    );
    return data;
  },

  // =========================================================================
  // Comprobantes
  // =========================================================================

  getComprobanteProveedor: async (
    idCompraCarbon: number,
  ): Promise<IRespuesta<ComprobanteCompraCarbonResponse | null>> => {
    const { data } = await api.get<
      IRespuesta<ComprobanteCompraCarbonResponse | null>
    >(`${path}/${idCompraCarbon}/comprobante-proveedor`);
    return data;
  },

  registrarComprobanteProveedor: async (
    idCompraCarbon: number,
    payload: RegistrarComprobanteProveedorRequest,
    archivos: File[] = [],
  ): Promise<IRespuesta<ComprobanteCompraCarbonResponse>> => {
    const { data } = await api.post<
      IRespuesta<ComprobanteCompraCarbonResponse>
    >(
      `${path}/${idCompraCarbon}/comprobante-proveedor`,
      CompraCarbonService.buildFormEvidencias(payload, archivos),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  getGruposFlete: async (
    idCompraCarbon: number,
  ): Promise<IRespuesta<GrupoFleteTransportista[]>> => {
    const { data } = await api.get<IRespuesta<GrupoFleteTransportista[]>>(
      `${path}/${idCompraCarbon}/grupos-flete`,
    );
    return data;
  },

  getComprobanteTransporte: async (
    idCompraCarbon: number,
    idComprobante: number,
  ): Promise<IRespuesta<ComprobanteTransporteCarbonResponse>> => {
    const { data } = await api.get<
      IRespuesta<ComprobanteTransporteCarbonResponse>
    >(
      `${path}/${idCompraCarbon}/comprobantes-transporte/${idComprobante}`,
    );
    return data;
  },

  registrarComprobanteTransporte: async (
    idCompraCarbon: number,
    payload: RegistrarComprobanteTransporteRequest,
    archivos: File[] = [],
  ): Promise<IRespuesta<ComprobanteTransporteCarbonResponse>> => {
    const form = CompraCarbonService.buildFormEvidencias(payload, archivos);
    form.append("ids_detalle_carga", JSON.stringify(payload.ids_detalle_carga));

    const { data } = await api.post<
      IRespuesta<ComprobanteTransporteCarbonResponse>
    >(
      `${path}/${idCompraCarbon}/comprobantes-transporte`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  // =========================================================================
  // Pagos
  // =========================================================================

  getPagos: async (
    idCompraCarbon: number,
  ): Promise<IRespuesta<PagosCompraCarbonResponse>> => {
    const { data } = await api.get<IRespuesta<PagosCompraCarbonResponse>>(
      `${path}/${idCompraCarbon}/pagos`,
    );
    return data;
  },

  registrarPagoProveedor: async (
    idCompraCarbon: number,
    payload: RegistrarPagoProveedorRequest,
    archivos: File[] = [],
  ): Promise<IRespuesta<PagosCompraCarbonResponse>> => {
    const { data } = await api.post<IRespuesta<PagosCompraCarbonResponse>>(
      `${path}/${idCompraCarbon}/pagos-proveedor`,
      CompraCarbonService.buildFormEvidencias(payload, archivos),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  registrarPagoTransporte: async (
    idCompraCarbon: number,
    payload: RegistrarPagoTransporteRequest,
    archivos: File[] = [],
  ): Promise<IRespuesta<PagosCompraCarbonResponse>> => {
    const { data } = await api.post<IRespuesta<PagosCompraCarbonResponse>>(
      `${path}/${idCompraCarbon}/pagos-transporte`,
      CompraCarbonService.buildFormEvidencias(payload, archivos),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  /**
   * Arma un multipart genérico de comprobantes y pagos.
   *
   * Los booleanos viajan como "1"/"0" porque en multipart todo llega como
   * texto y un `false` en PHP seria truthy. Los archivos van como
   * `evidencias[]`: la API los persiste con su ArchivoHelper y devuelve la
   * metadata final, nunca se acepta una URL inventada por el cliente.
   */
  buildFormEvidencias: (
    payload: object,
    archivos: File[] = [],
  ): FormData => {
    const form = new FormData();

    Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (typeof value === "boolean") {
        form.append(key, value ? "1" : "0");
        return;
      }
      form.append(key, String(value));
    });

    archivos.forEach((file) => form.append("evidencias[]", file));

    return form;
  },
};
