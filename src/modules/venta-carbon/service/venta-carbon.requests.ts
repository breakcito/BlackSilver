import type { AnalisisGranulometria } from "./venta-carbon.responses";
import type { MedioPagoVentaCarbon } from "../../../shared/enums/venta-carbon/medio-pago-venta-carbon";

/**
 * Carga a despachar.
 *
 * La carga cuelga de un BLENDING: el lote de carbon que sale del almacen.
 * Al elegirlo se autocompletan el porcentaje de ceniza y las toneladas, pero
 * el usuario puede ajustarlas.
 *
 * El vehiculo y la segunda placa se registran en el despacho (ya no hace
 * falta esperarlos para confirmar la llegada). La segunda placa siempre es
 * opcional.
 */
export interface CargaVentaFormItem {
  id_blending_carbon: number;
  cantidad_toneladas: number;
  porcentaje_ceniza: number;
  fecha_hora_salida: string;
  id_vehiculo_carbon: number | null;
  segunda_placa: string | null;
  archivos: File[];
}

export interface CrearVentaCarbonRequest {
  id_empresa: number;
  id_cliente: number;
  id_cliente_destino: number;
  id_almacen_empresa_salida: number;
  id_almacen_cliente_llegada: number;
  porcentaje_igv: number;
  porcentaje_detraccion: number;
  cargas: CargaVentaFormItem[];
}

/**
 * Confirmacion de llegada.
 *
 * El tipo de carbon lo hereda el blending de la carga: no se elige aqui. El
 * vehiculo y la segunda placa son opcionales (se pudieron registrar al
 * despachar).
 */
export interface ConfirmarLlegadaPayload {
  cantidad_toneladas: number;
  fecha_hora_ingreso: string;
  id_vehiculo_carbon: number | null;
  segunda_placa: string | null;
  guia_remitente: string | null;
  guia_transportista: string | null;
  codigo_ticket_balanza: string | null;
  observacion: string | null;
  porcentaje_ceniza: number;
  porcentaje_humedad: number;
  porcentaje_azufre: number;
  porcentaje_pizarra: number;
  analisis_granulometria: AnalisisGranulometria | null;
  fue_aceptado: boolean;
  archivos: File[];
}

/** Precio asignado a una carga dentro de una liquidacion. */
export interface CargaLiquidacionFormItem {
  id_carga_venta_carbon: number;
  precio_base: number;
  descuento: number;
  bono: number;
}

export interface RegistrarLiquidacionPayload {
  id_tipo_carbon: number;
  codigo_orden_compra: string | null;
  numero_reporte: string | null;
  fecha_aprobacion: string | null;
  version: string | null;
  cargas: CargaLiquidacionFormItem[];
  evidencias?: File[];
}

export interface RegistrarComprobantePayload {
  codigo_comprobante: string;
  fecha_emision: string;
  observacion?: string | null;
  evidencias?: File[];
}

export interface RegistrarPagoPayload {
  id_cuenta_bancaria_empresa?: number | null;
  medio_pago: MedioPagoVentaCarbon | string;
  numero_operacion?: string | null;
  fecha_hora_pago: string;
  es_para_detraccion?: boolean;
  monto_pagado: number;
  observacion?: string | null;
  evidencias?: File[];
}
