import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type { IArchivo } from "../../../shared/interfaces/archivo";
import type {
  ActualizarCompraCarbonRequest,
  AprobarLiquidacionRequest,
  ConfirmarCompraCarbonRequest,
  CrearCompraCarbonPreliminarRequest,
  CrearCompraCarbonRequest,
  VerificarDocumentosDuplicadosRequest,
} from "./compra-carbon.requests";
import type {
  CompraCarbonDetalleResponse,
  CompraCarbonResumen,
  DocumentoDuplicadoItem,
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
};
