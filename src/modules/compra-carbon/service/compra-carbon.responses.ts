import type { IArchivo } from "../../../shared/interfaces/archivo";
import type { RES_CambiosLog } from "../../../service/responses/_generic/cambios-log";

export interface CompraCarbonResumen {
  id_compra_carbon: number;
  id_empresa: number;
  empresa: string;
  empresa_ruc?: string;
  id_proveedor: number;
  proveedor: string;
  proveedor_tipo_entidad: string;
  proveedor_ruc: string | null;
  proveedor_dni: string | null;
  proveedor_direccion?: string | null;
  id_tipo_carbon_prometido: number;
  tipo_carbon_prometido: string | null;
  tipo_carbon_prometido_codigo: string | null;
  id_tarifa_carbon: number | null;
  id_cuenta_proveedor: number | null;
  proveedor_cuenta_moneda?: string | null;
  proveedor_cuenta_numero?: string | null;
  proveedor_cuenta_cci?: string | null;
  proveedor_cuenta_banco?: string | null;
  proveedor_cuenta_banco_abv?: string | null;
  correlativo: string;
  numero_correlativo: number;
  aplica_igv: boolean | number;
  porcentaje_igv: number;
  /** Detracción SUNAT sobre el carbón: 10% si aplica IGV, 0 si no. */
  porcentaje_detraccion: number;
  /** IGV del flete: 18% siempre. */
  porcentaje_igv_flete: number;
  /** Detracción SUNAT sobre el flete: 4% siempre. */
  porcentaje_detraccion_flete: number;
  toneladas_prometidas: number;
  precio_unitario_cotizado: number;
  /** precio_unitario_cotizado * toneladas_prometidas */
  subtotal_cotizado: number;
  /** 18% del subtotal si aplica IGV, 0 si no. */
  monto_igv_cotizado: number;
  /** subtotal_cotizado + monto_igv_cotizado */
  total_cotizado: number;
  /** total_cotizado * porcentaje_detraccion */
  monto_detraccion_cotizado: number;
  /** total_cotizado - monto_detraccion_cotizado */
  neto_a_pagar_cotizado: number;
  id_empleado_registro: number;
  empleado_registro: string;
  id_empleado_cierre?: number | null;
  empleado_cierre?: string | null;
  id_empleado_anula?: number | null;
  empleado_anula?: string | null;
  fecha_hora_cierre?: string | null;
  fecha_hora_anulacion?: string | null;
  created_at: string;
  estado: string;
  cantidad_cargas: number;
  /** Cargas de la compra cuyo flete paga la empresa. */
  cantidad_cargas_con_flete: number;
  total_toneladas_reales: number;
  ficha_tecnica: string[];
  /** Suma del subtotal de las cargas (carbón sin flete). */
  total_real_subtotal: number;
  /** Suma del neto_a_pagar de las cargas. */
  total_real_neto: number;
  /** Suma del flete_neto_a_pagar de las cargas. */
  total_real_flete_neto: number;
  log_cambios?: RES_CambiosLog[] | null;
}

export interface CargaCompraCarbonItem {
  id_carga_compra_carbon: number;
  id_compra_carbon: number;
  id_empleado_registro: number;
  empleado_registro: string;
  id_tipo_carbon: number;
  tipo_carbon_nombre: string;
  tipo_carbon_codigo: string | null;
  id_lugar_extraccion: number | null;
  lugar_extraccion_nombre: string | null;
  lugar_extraccion_direccion: string | null;
  id_almacen_proveedor_recojo: number | null;
  almacen_proveedor_direccion: string | null;
  id_almacen_empresa_llegada: number | null;
  almacen_empresa_nombre: string | null;
  id_almacen_cliente_llegada: number | null;
  almacen_cliente_direccion: string | null;
  cliente_destino: string | null;
  id_tarifa_carbon: number | null;
  tarifa_inicio_ceniza: number | null;
  tarifa_fin_ceniza: number | null;
  tarifa_precio_unitario: number | null;
  id_transportista: number | null;
  transportista_razon_social: string | null;
  transportista_ruc: string | null;
  transportista_dni: string | null;
  id_comprobante_transporte_carbon: number | null;
  comprobante_transporte_codigo: string | null;
  comprobante_transporte_fecha_emision: string | null;
  id_comprobante_compra_carbon: number | null;
  comprobante_compra_codigo: string | null;
  id_pago_compra_carbon: number | null;
  pago_directo_numero_operacion: string | null;
  tipo_despacho: string;
  placa: string;
  fecha_hora_ingreso: string;
  guia_remitente: string;
  guia_transportista: string | null;
  pagar_flete: boolean;
  codigo_ticket_balanza: string;
  cantidad: number;
  porcentaje_ceniza: number;
  /** Calidad deducida del % de ceniza: Baja | Intermedia | Alta. */
  calidad: string | null;
  porcentaje_humedad: number;
  precio_unitario: number;
  costo_flete_por_tonelada: number;
  // COSTOS DEL CARBON
  /** precio_unitario - costo_flete_por_tonelada */
  precio_materia_prima: number;
  /** precio_materia_prima * cantidad */
  subtotal: number;
  /** subtotal * porcentaje_igv de la compra */
  monto_igv: number;
  /** subtotal + monto_igv */
  total: number;
  /** total * porcentaje_detraccion de la compra */
  monto_detraccion: number;
  /** total - monto_detraccion */
  neto_a_pagar: number;
  // COSTOS DE TRANSPORTE
  /** cantidad * costo_flete_por_tonelada */
  flete_subtotal: number;
  /** flete_subtotal * porcentaje_igv_flete de la compra */
  flete_igv: number;
  /** flete_subtotal + flete_igv */
  flete_total: number;
  /** flete_total * porcentaje_detraccion_flete de la compra */
  flete_monto_detraccion: number;
  /** flete_total - flete_monto_detraccion */
  flete_neto_a_pagar: number;
  evidencias: IArchivo[];
  log_cambios?: RES_CambiosLog[] | null;
  created_at: string;
  estado: string;
}

export interface TransaccionAnticipoItem {
  id_transaccion: number;
  id_anticipo_proveedor: number;
  id_comprobante_compra_carbon?: number | null;
  id_pago_compra_carbon?: number | null;
  monto_retirado: number;
  medio_pago: string;
  numero_operacion: string | null;
  fecha_hora_pago: string | null;
  codigo_comprobante: string | null;
  observacion?: string | null;
}

export interface PagoCompraItem {
  id_pago_compra_carbon: number;
  id_compra_carbon: number;
  id_comprobante_compra_carbon: number | null;
  id_cuenta_bancaria_empresa: number;
  empresa_banco: string | null;
  empresa_numero_cuenta: string | null;
  id_cuenta_bancaria_proveedor: number | null;
  proveedor_banco: string | null;
  proveedor_numero_cuenta: string | null;
  id_empleado_registro: number;
  empleado_registro: string;
  medio_pago: string;
  numero_operacion: string | null;
  fecha_hora_pago: string;
  es_para_detraccion: boolean;
  observacion: string | null;
  evidencias: IArchivo[];
  monto_pagado: number;
  created_at: string;
  anticipos_aplicados?: TransaccionAnticipoItem[];
}

export interface ComprobanteCompraCarbonItem {
  id_comprobante_compra_carbon: number;
  id_empleado_registro: number;
  empleado_registro: string;
  id_compra_carbon: number;
  codigo_comprobante: string;
  fecha_emision: string;
  observacion: string | null;
  evidencias: IArchivo[];
  /** Suma del subtotal de las cargas amparadas. */
  subtotal: number;
  /** Suma de los anticipos amortizados contra este comprobante. */
  monto_pagado_anticipos: number;
  /** subtotal - monto_pagado_anticipos */
  base_imponible: number;
  /** base_imponible * porcentaje_igv de la compra */
  monto_igv: number;
  /** base_imponible + monto_igv */
  importe_total: number;
  /** importe_total * porcentaje_detraccion de la compra */
  monto_detraccion: number;
  /** importe_total - monto_detraccion */
  monto_neto: number;
  avance_pago_detraccion: number;
  avance_pago_neto: number;
  created_at: string;
  estado: string;
  pagos: PagoCompraItem[];
  anticipos_aplicados: TransaccionAnticipoItem[];
}

export interface PagoTransporteItem {
  id_pago_transporte_carbon: number;
  id_compra_carbon: number;
  id_comprobante_transporte_carbon: number;
  id_cuenta_bancaria_empresa: number;
  empresa_banco: string | null;
  empresa_numero_cuenta: string | null;
  id_cuenta_bancaria_transportista: number | null;
  transportista_banco: string | null;
  transportista_numero_cuenta: string | null;
  id_empleado_registro: number;
  empleado_registro: string;
  medio_pago: string;
  numero_operacion: string | null;
  fecha_hora_pago: string;
  es_para_detraccion: boolean;
  observacion: string | null;
  evidencias: IArchivo[];
  monto_pagado: number;
  created_at: string;
}

export interface ComprobanteTransporteItem {
  id_comprobante_transporte_carbon: number;
  id_compra_carbon: number;
  id_empleado_registro: number;
  empleado_registro: string;
  id_transportista: number;
  transportista_razon_social: string;
  codigo_comprobante: string;
  fecha_emision: string;
  observacion: string | null;
  evidencias: IArchivo[];
  /** Suma del flete_subtotal de las cargas amparadas. */
  subtotal: number;
  /** subtotal * porcentaje_igv_flete de la compra */
  monto_igv: number;
  /** subtotal + monto_igv */
  importe_total: number;
  /** importe_total * porcentaje_detraccion_flete de la compra */
  monto_detraccion: number;
  /** importe_total - monto_detraccion */
  monto_neto: number;
  avance_pago_detraccion: number;
  avance_pago_neto: number;
  created_at: string;
  estado: string;
  pagos: PagoTransporteItem[];
}

/**
 * Transportista con flete en la compra, con la primera cuenta bancaria en
 * soles que no es de detracción (la que recibe el pago del flete).
 */
export interface TransportistaFlete {
  id_transportista: number;
  razon_social: string;
  ruc: string | null;
  dni: string | null;
  numero_cuenta: string | null;
  cci: string | null;
  banco: string | null;
}

export interface CompraCarbonDetalleResponse {
  cabecera: CompraCarbonResumen;
  cargas: CargaCompraCarbonItem[];
  comprobantes_proveedor: ComprobanteCompraCarbonItem[];
  pagos_directos: PagoCompraItem[];
  comprobantes_transporte: ComprobanteTransporteItem[];
  anticipos_utilizados: TransaccionAnticipoItem[];
  transportistas_flete: TransportistaFlete[];
}

export interface RespuestaRegistrarComprobanteProveedor {
  id_comprobante_compra_carbon: number;
  comprobante: ComprobanteCompraCarbonItem;
  ids_cargas: number[];
}

export interface RespuestaRegistrarPagoProveedor {
  id_pago_compra_carbon: number;
  pago: PagoCompraItem;
  comprobante: ComprobanteCompraCarbonItem | null;
  ids_cargas_pagadas: number[];
}

export interface RespuestaRegistrarComprobanteTransporte {
  id_comprobante_transporte_carbon: number;
  comprobante: ComprobanteTransporteItem;
  ids_cargas: number[];
}

export interface RespuestaRegistrarPagoTransporte {
  id_pago_transporte_carbon: number;
  pago: PagoTransporteItem;
  comprobante: ComprobanteTransporteItem;
}
