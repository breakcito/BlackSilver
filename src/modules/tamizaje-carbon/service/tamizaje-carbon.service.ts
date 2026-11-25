import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type { IArchivo } from "../../../shared/interfaces/archivo";
import type { TipoOperacionGrupoGastos } from "../../../shared/enums/carbon/tipo-operacion-grupo-gastos";
import type { MedioPagoGastoProduccion } from "../../../shared/enums/carbon/medio-pago-gasto-produccion";
import type {
  ActualizarBlendingRequest,
  ActualizarStockManualRequest,
  ActualizarZarandeoRequest,
  BlendingDetallePayload,
  CrearGrupoGastosRequest,
  RegistrarBlendingRequest,
  RegistrarGastoZarandeoPayload,
  RegistrarZarandeoRequest,
} from "./tamizaje-carbon.requests";
import type {
  BlendingCarbonItem,
  GastoZarandeoItem,
  GrupoCargasItem,
  GrupoGastosItem,
  RES_GastoProduccionExport,
  StockCarbonItem,
  ZarandeoCarbonItem,
} from "./tamizaje-carbon.responses";

const PATH = "/tamizaje-carbon";

export const TamizajeCarbonService = {
  getStocks: async (filters?: {
    id_almacen?: number;
    id_tipo_carbon?: number;
    calidad?: string;
    filtros?: string;
  }): Promise<IRespuesta<StockCarbonItem[]>> => {
    const { data } = await api.get<IRespuesta<StockCarbonItem[]>>(
      `${PATH}/stocks`,
      { params: filters },
    );
    return data;
  },

  actualizarStock: async (
    idStockCarbon: number,
    payload: ActualizarStockManualRequest,
  ): Promise<IRespuesta<null>> => {
    const { data } = await api.put<IRespuesta<null>>(
      `${PATH}/stocks/${idStockCarbon}`,
      payload,
    );
    return data;
  },

  getZarandeos: async (filters?: {
    id_almacen?: number;
    mes?: number;
    anio?: number;
    filtros?: string;
  }): Promise<IRespuesta<ZarandeoCarbonItem[]>> => {
    const { data } = await api.get<IRespuesta<ZarandeoCarbonItem[]>>(PATH, {
      params: filters,
    });
    return data;
  },

  /**
   * Grupos de cargas pendientes de zarandeo (por almacen, tipo de carbon y calidad).
   * Cada grupo se zarea completo.
   */
  getGruposCargas: async (filters?: {
    id_almacen?: number;
    id_tipo_carbon?: number;
  }): Promise<IRespuesta<GrupoCargasItem[]>> => {
    const { data } = await api.get<IRespuesta<GrupoCargasItem[]>>(
      `${PATH}/grupos-cargas`,
      { params: filters },
    );
    return data;
  },

  registrarZarandeo: async (
    payload: RegistrarZarandeoRequest,
  ): Promise<IRespuesta<ZarandeoCarbonItem>> => {
    const formData = new FormData();

    if (payload.id_almacen)
      formData.append("id_almacen", String(payload.id_almacen));
    formData.append("id_tipo_carbon", String(payload.id_tipo_carbon));
    formData.append("calidad", payload.calidad);
    if (payload.id_cargas && payload.id_cargas.length > 0) {
      formData.append("id_cargas", JSON.stringify(payload.id_cargas));
    }
    formData.append("cantidad_zarandeada", String(payload.cantidad_zarandeada));
    formData.append("es_rezarandeo", payload.es_rezarandeo ? "1" : "0");
    formData.append("fecha_hora_zarandeo", payload.fecha_hora_zarandeo);
    formData.append("variantes", JSON.stringify(payload.variantes));

    if (payload.evidencias && payload.evidencias.length > 0) {
      payload.evidencias.forEach((f) => formData.append("evidencias[]", f));
    }

    const { data } = await api.post<IRespuesta<ZarandeoCarbonItem>>(
      PATH,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  /**
   * Edita un zarandeo: el backend revierte el movimiento de stock anterior y
   * vuelve a aplicarlo con los valores nuevos.
   */
  actualizarZarandeo: async (
    idZarandeoCarbon: number,
    payload: ActualizarZarandeoRequest,
  ): Promise<IRespuesta<ZarandeoCarbonItem>> => {
    const { data } = await api.put<IRespuesta<ZarandeoCarbonItem>>(
      `${PATH}/${idZarandeoCarbon}`,
      {
        id_tipo_carbon: payload.id_tipo_carbon,
        calidad: payload.calidad,
        cantidad_zarandeada: payload.cantidad_zarandeada,
        fecha_hora_zarandeo: payload.fecha_hora_zarandeo,
        variantes: payload.variantes,
      },
    );
    return data;
  },

  /**
   * Listado de gastos de produccion del periodo (zarandeo o blending).
   *
   * Es el listado que se muestra arriba en el panel de cada operacion.
   */
  /**
   * Grupos de gastos de un tipo de operacion con sus totales.
   */
  getGruposGastos: async (filters: {
    tipo: TipoOperacionGrupoGastos;
  }): Promise<IRespuesta<GrupoGastosItem[]>> => {
    const { data } = await api.get<IRespuesta<GrupoGastosItem[]>>(
      `${PATH}/grupos-gastos`,
      { params: filters },
    );
    return data;
  },

  getGastosGrupo: async (
    idGrupoGastos: number,
  ): Promise<IRespuesta<GastoZarandeoItem[]>> => {
    const { data } = await api.get<IRespuesta<GastoZarandeoItem[]>>(
      `${PATH}/gastos/grupo/${idGrupoGastos}`,
    );
    return data;
  },

  /**
   * Crea un grupo de gastos y le asigna las operaciones indicadas.
   */
  crearGrupoGastos: async (
    payload: CrearGrupoGastosRequest,
  ): Promise<IRespuesta<number>> => {
    const { data } = await api.post<IRespuesta<number>>(
      `${PATH}/grupos-gastos`,
      {
        tipo: payload.tipo,
        ids_miembros: payload.ids_miembros,
      },
    );
    return data;
  },

  /**
   * Lista los blendings (filtrable por mes, almacen y tipo de carbon).
   */
  getBlendings: async (filters?: {
    id_almacen?: number;
    id_tipo_carbon?: number;
    mes?: number;
    anio?: number;
    filtros?: string;
  }): Promise<IRespuesta<BlendingCarbonItem[]>> => {
    const { data } = await api.get<IRespuesta<BlendingCarbonItem[]>>(
      `${PATH}/blendings`,
      { params: filters },
    );
    return data;
  },

  /**
   * Registra un blending: toma stock de las calidades indicadas.
   */
  registrarBlending: async (
    payload: RegistrarBlendingRequest,
  ): Promise<IRespuesta<BlendingCarbonItem>> => {
    const formData = new FormData();

    if (payload.id_almacen)
      formData.append("id_almacen", String(payload.id_almacen));
    formData.append("id_empleado_supervisor", String(payload.id_empleado_supervisor));
    formData.append("id_tipo_carbon", String(payload.id_tipo_carbon));
    formData.append("porcentaje_ceniza", String(payload.porcentaje_ceniza));
    formData.append("fecha_hora_blending", payload.fecha_hora_blending);
    formData.append("detalles", JSON.stringify(payload.detalles));

    if (payload.evidencias && payload.evidencias.length > 0) {
      payload.evidencias.forEach((f) => formData.append("evidencias[]", f));
    }

    const { data } = await api.post<IRespuesta<BlendingCarbonItem>>(
      `${PATH}/blendings`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  /**
   * Actualiza un blending y recalcula el stock que toma.
   */
  actualizarBlending: async (
    idBlendingCarbon: number,
    payload: ActualizarBlendingRequest,
  ): Promise<IRespuesta<BlendingCarbonItem>> => {
    const formData = new FormData();

    if (payload.id_almacen)
      formData.append("id_almacen", String(payload.id_almacen));
    formData.append("id_empleado_supervisor", String(payload.id_empleado_supervisor));
    formData.append("id_tipo_carbon", String(payload.id_tipo_carbon));
    formData.append("porcentaje_ceniza", String(payload.porcentaje_ceniza));
    formData.append("fecha_hora_blending", payload.fecha_hora_blending);
    formData.append("detalles", JSON.stringify(payload.detalles));

    if (payload.evidencias && payload.evidencias.length > 0) {
      payload.evidencias.forEach((f) => formData.append("evidencias[]", f));
    }

    const { data } = await api.put<IRespuesta<BlendingCarbonItem>>(
      `${PATH}/blendings/${idBlendingCarbon}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  /**
   * Agrega mas stock tomado a un blending ya registrado.
   */
  agregarStockBlending: async (
    idBlendingCarbon: number,
    detalles: BlendingDetallePayload[],
  ): Promise<IRespuesta<BlendingCarbonItem>> => {
    const formData = new FormData();
    formData.append("detalles", JSON.stringify(detalles));

    const { data } = await api.post<IRespuesta<BlendingCarbonItem>>(
      `${PATH}/blendings/${idBlendingCarbon}/detalles`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  /**
   * Agrega archivos a las evidencias de un blending ya registrado y devuelve
   * la lista completa (las previas + las nuevas).
   */
  subirEvidenciasBlending: async (
    idBlendingCarbon: number,
    archivos: File[],
  ): Promise<IRespuesta<IArchivo[]>> => {
    const formData = new FormData();
    archivos.forEach((file) => formData.append("evidencias[]", file));

    const { data } = await api.post<IRespuesta<IArchivo[]>>(
      `${PATH}/blendings/${idBlendingCarbon}/evidencias`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  /**
   * Elimina una evidencia del blending (archivo fisico + registro).
   */
  eliminarEvidenciaBlending: async (
    idBlendingCarbon: number,
    pathRelativo: string,
  ): Promise<IRespuesta<IArchivo[]>> => {
    const { data } = await api.delete<IRespuesta<IArchivo[]>>(
      `${PATH}/blendings/${idBlendingCarbon}/evidencias`,
      {
        data: {
          path_relativo: pathRelativo,
        },
      },
    );
    return data;
  },

  /**
   * Sube archivos como evidencias del zarandeo y devuelve la lista completa
   * de evidencias (las previas + las nuevas).
   */
  subirEvidencias: async (
    idZarandeoCarbon: number,
    archivos: File[],
  ): Promise<IRespuesta<IArchivo[]>> => {
    const formData = new FormData();
    formData.append("id_zarandeo_carbon", String(idZarandeoCarbon));
    archivos.forEach((file) => formData.append("evidencias[]", file));

    const { data } = await api.post<IRespuesta<IArchivo[]>>(
      `${PATH}/evidencias`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  /**
   * Elimina una evidencia del zarandeo (archivo físico + registro).
   */
  eliminarEvidencia: async (
    idZarandeoCarbon: number,
    pathRelativo: string,
  ): Promise<IRespuesta<IArchivo[]>> => {
    const { data } = await api.delete<IRespuesta<IArchivo[]>>(
      `${PATH}/evidencias`,
      {
        data: {
          id_zarandeo_carbon: idZarandeoCarbon,
          path_relativo: pathRelativo,
        },
      },
    );
    return data;
  },

  registrarGasto: async (
    payload: RegistrarGastoZarandeoPayload,
  ): Promise<IRespuesta<GastoZarandeoItem>> => {
    const { data } = await api.post<IRespuesta<GastoZarandeoItem>>(
      `${PATH}/gastos`,
      {
        id_grupo_gastos: payload.id_grupo_gastos,
        gasto: payload.gasto,
        otro_gasto: payload.otro_gasto ?? null,
        id_proveedor: payload.id_proveedor ?? null,
        descripcion: payload.descripcion ?? null,
        fecha: payload.fecha,
        numero_reporte: payload.numero_reporte ?? null,
        cantidad: payload.cantidad,
        precio_unitario: payload.precio_unitario,
      },
    );
    return data;
  },

  /**
   * Gastos de produccion listos para exportar, por rango de fechas.
   *
   * El rango se aplica sobre la fecha inicio del destino (zarandeo o
   * blending). `tipo` acota a una sola vista ("blending" o "zarandeo").
   */
  getGastosExportarRango: async (
    fechaInicio: string,
    fechaFin: string,
    tipo: "blending" | "zarandeo",
  ): Promise<IRespuesta<RES_GastoProduccionExport[]>> => {
    const { data } = await api.get<IRespuesta<RES_GastoProduccionExport[]>>(
      `${PATH}/gastos/exportar/rango`,
      { params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin, tipo } },
    );
    return data;
  },

  /**
   * Gastos de produccion de un grupo, listos para exportar.
   */
  getGastosExportarGrupo: async (
    idGrupoGastos: number,
  ): Promise<IRespuesta<RES_GastoProduccionExport[]>> => {
    const { data } = await api.get<IRespuesta<RES_GastoProduccionExport[]>>(
      `${PATH}/gastos/exportar/grupo/${idGrupoGastos}`,
    );
    return data;
  },

  /**
   * Confirma el pago de un gasto de produccion.
   *
   * La fecha de pago puede ser retroactiva. El medio de pago es obligatorio.
   */
  confirmarPagoGasto: async (
    idGasto: number,
    fechaPago: string,
    medioPago: MedioPagoGastoProduccion,
  ): Promise<IRespuesta<GastoZarandeoItem>> => {
    const { data } = await api.post<IRespuesta<GastoZarandeoItem>>(
      `${PATH}/gastos/${idGasto}/pagar`,
      { fecha_pago: fechaPago, medio_pago: medioPago },
    );
    return data;
  },
};
