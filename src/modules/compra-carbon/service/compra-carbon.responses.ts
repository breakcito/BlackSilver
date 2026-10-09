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
  correlativo: string;
  numero_correlativo: number;
  aplica_igv: boolean | number;
  porcentaje_igv: number;
  toneladas_prometidas: number;
  precio_unitario_cotizado: number;
  total_cotizado: number;
  monto_igv_cotizado: number;
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
  cantidad_items?: number;
  total_toneladas_reales: number;
  ficha_tecnica: string[];
  total_real_con_descuento: number;
  evidencias?: IArchivo[];
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
  id_comprobante_transporte_carbon: number | null;
  comprobante_transporte_codigo: string | null;
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
  porcentaje_humedad: number;
  precio_unitario: number;
  costo_flete_por_tonelada: number;
  subtotal_antes_descuento: number;
  descuento_flete: number;
  subtotal_con_descuento: number;
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
  total: number;
  con_detraccion: boolean;
  porcentaje_detraccion: number;
  monto_detraccion: number;
  total_sin_detraccion: number;
  monto_pagado_anticipos: number;
  total_neto: number;
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
  total: number;
  con_detraccion: boolean;
  porcentaje_detraccion: number;
  monto_detraccion: number;
  total_neto: number;
  avance_pago_detraccion: number;
  avance_pago_neto: number;
  created_at: string;
  estado: string;
  pagos: PagoTransporteItem[];
}

export interface CompraCarbonDetalleResponse {
  cabecera: CompraCarbonResumen;
  cargas: CargaCompraCarbonItem[];
  comprobantes_proveedor: ComprobanteCompraCarbonItem[];
  pagos_directos: PagoCompraItem[];
  comprobantes_transporte: ComprobanteTransporteItem[];
  anticipos_utilizados: TransaccionAnticipoItem[];
}
