import type { MetodoPago } from "../../../shared/enums/_generic/metodo-pago";
import type { Periodo } from "../../../shared/enums/_generic/periodo";
import type { TipoDespachoCompra } from "../../../shared/enums/_generic/tipo-despacho-compra";
import type { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";
import type { TipoBien } from "../../../shared/enums/_generic/tipo-bien";
import type {
  Estado_Cotizacion,
  Estado_Cotizacion_Detalle,
} from "../../../shared/enums/cotizacion/cotizacion";
import type { IArchivo } from "../../../shared/interfaces/archivo";

export interface RES_EmpresaCotizacion {
  id_cotizacion: number;
  id_empresa: number;
  razon_social: string;
  url_logo: string | null;
}

export interface RES_CotizacionDetalle {
  id_cotizacion_detalle: number;
  id_comparativo_detalle: number;
  id_cotizacion: number;
  // Almacén y despacho
  id_almacen_recepcionista: number;
  almacen_recepcionista: string;
  para_un_almacen_principal: boolean;
  id_mina_destino: number | null;
  mina_destino: string | null;
  //
  tipo_despacho: TipoDespachoCompra;
  lugar_recojo: string | null;
  // Tiempo de entrega
  tiempo_entrega: number;
  tiempo_entrega_periodo: Periodo;
  tiempo_entrega_dias: number;
  // Producto
  id_producto: number;
  producto: string;
  tipo_bien: TipoBien;
  es_auditable: boolean;
  es_perecible: boolean;
  // Unidad de medida (cotización)
  id_unidad_medida_ctz: number;
  unidad_medida_ctz: string;
  unidad_medida_ctz_abv: string;
  // Unidad de medida base del producto
  id_unidad_medida_base: number;
  unidad_medida_base: string;
  unidad_medida_base_abv: string;
  // Cantidades y precios
  cantidad: number;
  contenido_por_presentacion: number;
  cantidad_base: number;
  //
  precio_unitario: number;
  precio_unitario_base: number;
  //
  comentario: string | null;
  estado: Estado_Cotizacion_Detalle;
  // Vinculacion con el detalle de la solicitud de reabastecimiento que origino
  // este item de cotizacion (NULL cuando la cotizacion no vino de una).
  id_solicitud_reabastecimiento_detalle: number | null;
}

export interface RES_Cotizacion {
  id_cotizacion: number;
  id_comparativo: number;
  id_orden_compra: number | null;
  // Proveedor
  id_proveedor: number;
  proveedor: string;
  tipo_entidad_proveedor: TipoEntidad;
  documento_proveedor: string;
  // Correlativo
  correlativo: string;
  // Datos financieros
  observacion: string | null;
  fecha_hora_cotizacion: string;
  //
  metodo_pago: MetodoPago;
  fecha_vencimiento_pago: string | null;
  moneda: string;
  tipo_cambio_venta_referencial: number | null;
  es_auditable: boolean;
  //
  costo_flete: number;
  otros_gastos: number;
  //
  total_antes_igv: number;
  incluye_igv: boolean;
  porcentaje_igv: number;
  monto_igv: number;
  total_despues_igv: number;
  //
  evidencias: IArchivo[] | null;
  //
  id_empleado_registro: number;
  // Vinculacion con la solicitud de reabastecimiento que origino esta
  // cotizacion (NULL = cotizacion creada sin venir de una solicitud).
  id_solicitud_reabastecimiento: number | null;
  empleado_registro: string | null;
  cargo_empleado_registro: string | null;
  //
  created_at: string;
  estado: Estado_Cotizacion;
  // Insertados por la api
  empresas: RES_EmpresaCotizacion[];
  detalles: RES_CotizacionDetalle[];
}

export interface RES_Comparativo {
  id_comparativo: number;
  numero_correlativo: number;
  created_at: string;
  /**
   * Correlativos UNICOS de las solicitudes de reabastecimiento que
   * originaron las cotizaciones de este comparativo, concatenados con ", ".
   * NULL cuando el comparativo no se genero desde una solicitud.
   * Ej: "SCR-26-00005, SCR-26-00003".
   */
  solicitudes_origen_correlativos: string | null;
  cotizaciones: RES_Cotizacion[];
}
