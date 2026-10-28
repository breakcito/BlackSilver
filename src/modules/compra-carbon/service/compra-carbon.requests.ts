export interface CrearCompraCarbonRequest {
  id_empresa: number;
  id_proveedor: number;
  id_tipo_carbon_prometido: number;
  toneladas_prometidas: number;
  aplica_igv: boolean;
  porcentaje_igv: number;
  /** Detracción SUNAT sobre el carbón: 10% si aplica IGV, 0 si no. */
  porcentaje_detraccion?: number;
  precio_unitario_cotizado?: number;
  id_tarifa_carbon?: number | null;
  id_cuenta_proveedor?: number | null;
}

/**
 * Edita la cabecera de una compra existente. Solo aplica si NO esta Pagado,
 * Cerrado ni Anulado (lo valida el backend). Campos son todos opcionales:
 * solo se envian los que se quieren cambiar.
 */
export interface ActualizarCompraCarbonRequest {
  id_empresa?: number;
  id_proveedor?: number;
  id_tipo_carbon_prometido?: number;
  id_tarifa_carbon?: number | null;
  id_cuenta_proveedor?: number | null;
  aplica_igv?: boolean;
  porcentaje_igv?: number;
  toneladas_prometidas?: number;
  precio_unitario_cotizado?: number;
}

/**
 * Edita una carga individual. Solo aplica si la carga NO esta Anulada,
 * NO tiene comprobante/pago asignado y la cabecera NO esta Pagado/Cerrado/Anulado.
 */
export interface ActualizarCargaRequest {
  id_tipo_carbon?: number;
  id_lugar_extraccion?: number | null;
  id_almacen_proveedor_recojo?: number | null;
  id_almacen_empresa_llegada?: number | null;
  id_almacen_cliente_llegada?: number | null;
  id_tarifa_carbon?: number | null;
  id_transportista?: number | null;
  tipo_despacho?: "Envio" | "Recojo" | string;
  placa?: string;
  fecha_hora_ingreso?: string;
  guia_remitente?: string;
  guia_transportista?: string | null;
  pagar_flete?: boolean;
  codigo_ticket_balanza?: string;
  cantidad?: number;
  porcentaje_ceniza?: number;
  porcentaje_humedad?: number;
  precio_unitario?: number;
  costo_flete_por_tonelada?: number;
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
  ids_cargas: number[];
  anticipos?: { id_anticipo_proveedor: number; monto_retirado: number }[];
  evidencias?: File[];
}

export interface RegistrarPagoProveedorPayload {
  id_comprobante_compra_carbon?: number | null;
  /**
   * Requerido solo en pagos bancarios (Transferencia / Depósito).
   * En Efectivo se omite (no sale dinero de ninguna cuenta).
   */
  id_cuenta_bancaria_empresa?: number | null;
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
  ids_cargas: number[];
  evidencias?: File[];
}

export interface RegistrarPagoTransportePayload {
  id_comprobante_transporte_carbon: number;
  /**
   * Requerido solo en pagos bancarios (Transferencia / Depósito).
   * En Efectivo se omite (no sale dinero de ninguna cuenta).
   */
  id_cuenta_bancaria_empresa?: number | null;
  id_cuenta_bancaria_transportista?: number | null;
  medio_pago: "Transferencia" | "Depósito" | "Efectivo" | string;
  numero_operacion?: string | null;
  fecha_hora_pago: string;
  es_para_detraccion?: boolean;
  monto_pagado: number;
  observacion?: string | null;
  evidencias?: File[];
}
