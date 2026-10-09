export interface CrearCompraCarbonRequest {
  id_empresa: number;
  id_proveedor: number;
  id_tipo_carbon_prometido: number;
  toneladas_prometidas: number;
  aplica_igv: boolean;
  porcentaje_igv: number;
  precio_unitario_cotizado?: number;
  id_tarifa_carbon?: number | null;
}

export interface CargaFormItem {
  id_tipo_carbon: number;
  id_lugar_extraccion?: number | null;
  tipo_despacho: "Envio" | "Recojo" | string;
  id_almacen_proveedor_recojo?: number | null;
  id_almacen_empresa_llegada?: number | null;
  id_almacen_cliente_llegada?: number | null;
  placa: string;
  fecha_hora_ingreso: string;
  guia_remitente: string;
  guia_transportista?: string | null;
  pagar_flete: boolean;
  id_transportista?: number | null;
  costo_flete_por_tonelada?: number;
  codigo_ticket_balanza: string;
  cantidad: number;
  porcentaje_ceniza?: number;
  porcentaje_humedad?: number;
  precio_unitario: number;
  id_tarifa_carbon?: number | null;
  archivos?: File[];
}

export interface RegistrarComprobanteProveedorPayload {
  codigo_comprobante: string;
  fecha_emision: string;
  observacion?: string | null;
  con_detraccion: boolean;
  porcentaje_detraccion?: number;
  ids_cargas: number[];
  anticipos?: { id_anticipo_proveedor: number; monto_retirado: number }[];
  evidencias?: File[];
}

export interface RegistrarPagoProveedorPayload {
  id_comprobante_compra_carbon?: number | null;
  id_cuenta_bancaria_empresa: number;
  id_cuenta_bancaria_proveedor?: number | null;
  medio_pago: "Transferencia" | "Depósito" | "Efectivo" | string;
  numero_operacion?: string | null;
  fecha_hora_pago: string;
  es_para_detraccion?: boolean;
  monto_pagado: number;
  observacion?: string | null;
  ids_cargas?: number[];
  anticipos?: { id_anticipo_proveedor: number; monto_retirado: number }[];
  evidencias?: File[];
}

export interface RegistrarComprobanteTransportePayload {
  id_transportista: number;
  codigo_comprobante: string;
  fecha_emision: string;
  observacion?: string | null;
  con_detraccion: boolean;
  porcentaje_detraccion?: number;
  ids_cargas: number[];
  evidencias?: File[];
}

export interface RegistrarPagoTransportePayload {
  id_comprobante_transporte_carbon: number;
  id_cuenta_bancaria_empresa: number;
  id_cuenta_bancaria_transportista?: number | null;
  medio_pago: "Transferencia" | "Depósito" | "Efectivo" | string;
  numero_operacion?: string | null;
  fecha_hora_pago: string;
  es_para_detraccion?: boolean;
  monto_pagado: number;
  observacion?: string | null;
  evidencias?: File[];
}
