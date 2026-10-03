import type { EstadoBase } from "../../../shared/enums/_generic/estado-base";
import type { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";
import type { IArchivo } from "../../../shared/interfaces/archivo";
import type { RES_CambiosLog } from "../../../service/responses/_generic/cambios-log";
import type { EstadoComprobanteCarbon } from "../../../shared/enums/compra-carbon/estado-comprobante-carbon";
import type { MedioPago } from "../../../shared/enums/compra-carbon/medio-pago";
import type { TipoComprobante } from "../../../shared/enums/_generic/tipo-comprobante";

export interface CompraCarbonResumen {
  id_compra_carbon: number;
  id_empresa: number;
  empresa: string;
  id_proveedor: number;
  proveedor: string;
  proveedor_tipo_entidad: TipoEntidad | string;
  proveedor_ruc: string | null;
  proveedor_dni: string | null;
  tipo_despacho?: string | null;
  id_almacen: number | null;
  almacen: string | null;
  id_almacen_cliente?: number | null;
  almacen_cliente_direccion?: string | null;
  cliente_destino?: string | null;
  id_almacen_proveedor?: number | null;
  almacen_proveedor_direccion?: string | null;
  id_empleado_registro: number;
  empleado_registro: string;
  id_empleado_confirma: number | null;
  empleado_aprueba: string | null;
  id_empleado_aprueba_liquidacion?: number | null;
  empleado_aprueba_liquidacion?: string | null;
  id_empleado_anula?: number | null;
  empleado_anula?: string | null;
  aplica_igv: boolean;
  porcentaje_igv: number;
  correlativo: string;
  numero_correlativo: number;
  fecha_hora_ingreso: string;
  fecha_hora_confirmacion: string | null;
  fecha_hora_aprobacion_liquidacion?: string | null;
  fecha_hora_anulacion?: string | null;
  total_antes_descuento: number;
  monto_igv: number;
  descuento_flete: number;
  total_con_descuento: number;
  /** Suma de los anticipos ya consumidos al aprobar la liquidación. */
  monto_pagado_anticipos?: number;
  /** Avance de lo pagado al proveedor con pagos de tipo neto. */
  avance_pago_neto?: number;
  /** Avance de lo pagado a los transportistas con pagos de tipo neto. */
  avance_pago_flete?: number;
  created_at: string;
  estado: EstadoBase | string | null;
  cantidad_items: number;
  evidencias: IArchivo[];
  log_cambios?: RES_CambiosLog[] | null;
}

export interface CompraCarbonDetalleItem {
  id_detalle_compra_carbon: number;
  id_tipo_carbon: number;
  tipo_carbon_nombre: string;
  tipo_carbon_codigo: string | null;
  tipo_carbon_ficha_tecnica?: string[] | null;
  id_transportista: number | null;
  transportista_razon_social: string | null;
  transportista_tipo_entidad: TipoEntidad | string | null;
  id_lugar_extraccion: number | null;
  lugar_id_departamento: number | null;
  lugar_departamento: string | null;
  lugar_id_provincia: number | null;
  lugar_provincia: string | null;
  lugar_id_distrito: number | null;
  lugar_distrito: string | null;
  lugar_direccion: string | null;
  id_tarifa_carbon: number | null;
  tarifa_inicio_ceniza: number | null;
  tarifa_fin_ceniza: number | null;
  tarifa_precio_unitario: number | null;
  placa: string | null;
  guia_remitente: string | null;
  guia_transportista: string | null;
  pagar_flete: boolean;
  codigo_ticket_balanza: string | null;
  cantidad: number;
  porcentaje_ceniza: number;
  porcentaje_humedad: number;
  precio_unitario: number;
  costo_flete_por_tonelada: number;
  subtotal_antes_descuento: number;
  descuento_flete: number;
  subtotal_con_descuento: number;
  evidencias: IArchivo[];
  log_cambios?: RES_CambiosLog[] | null;
}

export interface CompraCarbonAnticipoUtilizado {
  id_transaccion_anticipo: number;
  id_anticipo_proveedor: number;
  id_compra_carbon: number;
  monto_retirado: number;
  medio_pago: string;
  fecha_hora_pago: string | null;
  numero_operacion: string | null;
  saldo_inicial: number;
  saldo_actual: number;
  cuenta_bancaria_empresa_numero?: string | null;
}

export interface DocumentoDuplicadoItem {
  id_detalle_compra_carbon: number;
  codigo_ticket_balanza: string | null;
  guia_remitente: string | null;
  guia_transportista: string | null;
  id_compra_carbon: number;
  correlativo: string;
  fecha_hora_ingreso: string;
}

// ---------------------------------------------------------------------------
// Comprobantes y pagos
// ---------------------------------------------------------------------------

/** Campos comunes entre el comprobante del proveedor y el de flete. */
export interface ComprobanteCarbonBase {
  id_compra_carbon: number;
  id_empleado_registro: number;
  empleado_registro: string;
  codigo_comprobante: TipoComprobante | string;
  fecha_emision: string;
  observacion: string | null;
  evidencias: IArchivo[];
  /** Monto total del comprobante. Lo define el backend, nunca el cliente. */
  total: number;
  con_detraccion: boolean;
  porcentaje_detraccion: number;
  monto_detraccion: number;
  /** `total - monto_detraccion`: lo que se paga a la cuenta del tercero. */
  total_neto: number;
  /** Suma de los pagos marcados como detracción. */
  avance_pago_detraccion: number;
  /** Suma de los pagos marcados como detracción, recalculada en la consulta. */
  avance_pago_detraccion_total: number;
  /** Suma de los pagos no-detracción. */
  avance_pago_neto: number;
  created_at: string;
  estado: EstadoComprobanteCarbon | string;
  pagos?: PagoCompraCarbonResponse[];
}

/** Comprobante que entrega el proveedor por la compra (solo si aplica IGV). */
export interface ComprobanteCompraCarbonResponse extends ComprobanteCarbonBase {
  id_comprobante_compra_carbon: number;
}

/** Carga (detalle de la compra) que compone un comprobante de flete. */
export interface CargaComprobanteFlete {
  id_detalle_compra_carbon: number;
  id_tipo_carbon: number;
  tipo_carbon_nombre: string;
  placa: string | null;
  guia_remitente: string | null;
  guia_transportista: string | null;
  codigo_ticket_balanza: string | null;
  cantidad: number;
  costo_flete_por_tonelada: number;
  descuento_flete: number;
}

/** Comprobante que entrega un transportista por el flete de sus cargas. */
export interface ComprobanteTransporteCarbonResponse extends ComprobanteCarbonBase {
  id_comprobante_transporte_carbon: number;
  id_transportista: number;
  transportista_razon_social: string;
  transportista_tipo_entidad: TipoEntidad | string;
  porcentaje_detraccion_defecto: number;
  cargas?: CargaComprobanteFlete[];
  pagos?: PagoTransporteCarbonResponse[];
}

/**
 * Grupo de cargas con pago de flete de un mismo transportista.
 * Cada grupo se convierte en un comprobante.
 */
export interface GrupoFleteTransportista {
  id_transportista: number;
  transportista_razon_social: string;
  transportista_tipo_entidad: TipoEntidad | string;
  cantidad_cargas: number;
  cantidad_tm: number;
  /** Suma del `descuento_flete` de las cargas del grupo. */
  total: number;
  ids_detalles: number[];
  id_comprobante_transporte_carbon: number | null;
  estado: EstadoComprobanteCarbon | string | null;
  porcentaje_detraccion_defecto: number;
}

/** Campos comunes entre el pago al proveedor y el pago al transportista. */
export interface PagoCarbonBase {
  id_pago: number;
  id_compra_carbon: number;
  id_comprobante: number | null;
  id_cuenta_bancaria_empresa: number;
  banco_empresa: string | null;
  banco_empresa_abv: string | null;
  cuenta_empresa_numero: string | null;
  id_cuenta_bancaria_destino: number;
  banco_destino: string | null;
  banco_destino_abv: string | null;
  cuenta_destino_numero: string | null;
  id_empleado_registro: number;
  empleado_registro: string;
  medio_pago: MedioPago | string | null;
  numero_operacion: string | null;
  fecha_hora_pago: string;
  es_para_detraccion: boolean;
  observacion: string | null;
  evidencias: IArchivo[];
  monto_pagado: number;
  created_at: string;
}

export type PagoCompraCarbonResponse = PagoCarbonBase;

export type PagoTransporteCarbonResponse = PagoCarbonBase;

/** Saldos acumulados de la cabecera, para el resumen del modal de pagos. */
export interface SaldosPagosCompra {
  aplica_igv: boolean;
  total_con_descuento: number;
  monto_pagado_anticipos: number;
  avance_pago_neto: number;
  descuento_flete: number;
  avance_pago_flete: number;
}

/** Historial completo de pagos de una compra. */
export interface PagosCompraCarbonResponse {
  compras: SaldosPagosCompra;
  grupos_flete: GrupoFleteTransportista[];
  comprobantes: (
    | ComprobanteCompraCarbonResponse
    | ComprobanteTransporteCarbonResponse
  )[];
  pagos_proveedor: PagoCompraCarbonResponse[];
  pagos_transporte: PagoTransporteCarbonResponse[];
}

/**
 * Respuesta completa de una compra: cabecera + detalles + anticipos utilizados.
 */
export interface CompraCarbonDetalleResponse {
  cabecera: CompraCarbonCabeceraDetalle;
  detalles: CompraCarbonDetalleItem[];
  anticipos_utilizados?: CompraCarbonAnticipoUtilizado[];
}

export interface CompraCarbonCabeceraDetalle extends Omit<
  CompraCarbonResumen,
  | "id_empleado_registro"
  | "id_empleado_confirma"
  | "numero_correlativo"
  | "created_at"
  | "estado"
  | "cantidad_items"
  | "proveedor_tipo_entidad"
  | "proveedor_ruc"
  | "proveedor_dni"
  | "aplica_igv"
  | "porcentaje_igv"
> {
  id_empleado_registro: number;
  empleado_registro: string;
  id_empleado_confirma: number | null;
  empleado_aprueba: string | null;
  id_empleado_aprueba_liquidacion?: number | null;
  empleado_aprueba_liquidacion?: string | null;
  id_empleado_anula?: number | null;
  empleado_anula?: string | null;
  numero_correlativo: number;
  created_at: string;
  estado: EstadoBase | string | null;
  proveedor_tipo_entidad: TipoEntidad | string;
  proveedor_ruc: string | null;
  proveedor_dni: string | null;
  aplica_igv: boolean;
  porcentaje_igv: number;
  almacen_id_departamento?: number | null;
  almacen_id_provincia?: number | null;
  almacen_id_distrito?: number | null;
  almacen_direccion?: string | null;
  evidencias: IArchivo[];
  log_cambios?: RES_CambiosLog[] | null;
}
