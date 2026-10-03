import type { IArchivo } from "../../../shared/interfaces/archivo";
import type { MedioPago } from "../../../shared/enums/compra-carbon/medio-pago";

export interface CrearCompraCarbonDetalle {
  id_detalle_compra_carbon?: number;
  id_tipo_carbon: number;
  id_transportista?: number | null;
  id_lugar_extraccion?: number | null;
  id_tarifa_carbon?: number | null;
  placa?: string | null;
  guia_remitente?: string | null;
  guia_transportista?: string | null;
  pagar_flete: boolean;
  codigo_ticket_balanza?: string | null;
  cantidad: number;
  porcentaje_ceniza?: number;
  porcentaje_humedad?: number;
  precio_unitario: number;
  costo_flete_por_tonelada?: number;
  evidencias?: IArchivo[] | null;
}

/**
 * Registro preliminar: solo empresa, proveedor y 1 detalle básico con tipo y toneladas.
 */
export interface CrearCompraCarbonPreliminarRequest {
  id_empresa: number;
  id_proveedor: number;
  fecha_hora_ingreso?: string;
  detalles: [
    {
      id_tipo_carbon: number;
      cantidad: number;
      precio_unitario?: number;
    },
  ];
}

/**
 * Confirmación de llegada de carga: completa cabecera y detalles.
 * Los adjuntos NO van aquí: viajan como `evidencias[]` en el multipart y la
 * API genera su metadata al persistirlos.
 */
export interface ConfirmarCompraCarbonRequest {
  id_empresa: number;
  id_proveedor: number;
  tipo_despacho: "envio" | "recojo";
  id_almacen_proveedor?: number | null;
  id_almacen?: number | null;
  id_almacen_cliente?: number | null;
  aplica_igv: boolean;
  porcentaje_igv: number;
  fecha_hora_ingreso: string;
  detalles: CrearCompraCarbonDetalle[];
}

/**
 * Edición de una compra (preliminar o confirmada).
 * Los adjuntos viajan como `evidencias[]` en el multipart.
 */
export interface ActualizarCompraCarbonRequest {
  id_empresa: number;
  id_proveedor: number;
  tipo_despacho?: "envio" | "recojo" | null;
  id_almacen_proveedor?: number | null;
  id_almacen?: number | null;
  id_almacen_cliente?: number | null;
  aplica_igv?: boolean;
  porcentaje_igv?: number;
  fecha_hora_ingreso: string;
  motivo?: string | null;
  detalles: CrearCompraCarbonDetalle[];
}

/**
 * Aprobación de liquidación con anticipos.
 */
export interface AprobarLiquidacionRequest {
  anticipos?: {
    id_anticipo_proveedor: number;
    monto_retirado: number;
  }[];
}

/**
 * Verificación de documentos duplicados.
 */
export interface VerificarDocumentosDuplicadosRequest {
  id_proveedor: number;
  tickets?: string[];
  guias_remitente?: string[];
  guias_transportista?: string[];
  id_compra_carbon?: number | null;
}

// ---------------------------------------------------------------------------
// Comprobantes
// ---------------------------------------------------------------------------

/**
 * Comprobante del proveedor. El `total` NO se envía: el backend lo toma del
 * `total_con_descuento` de la compra. Los adjuntos viajan como `evidencias[]`
 * en el multipart y la API genera su metadata al persistirlos.
 */
export interface RegistrarComprobanteProveedorRequest {
  codigo_comprobante: string;
  fecha_emision: string;
  observacion?: string | null;
  con_detraccion: boolean;
  porcentaje_detraccion: number;
}

/**
 * Comprobante de flete de un transportista. El `total` tampoco se envía: el
 * backend lo calcula sumando el `descuento_flete` de las cargas indicadas.
 */
export interface RegistrarComprobanteTransporteRequest
  extends RegistrarComprobanteProveedorRequest {
  id_transportista: number;
  ids_detalle_carga: number[];
}

// ---------------------------------------------------------------------------
// Pagos
// ---------------------------------------------------------------------------

/**
 * Pago al proveedor. Si la compra aplica IGV queda enlazado a su comprobante;
 * si no, el pago es íntegro y cuelga solo de la compra.
 */
export interface RegistrarPagoProveedorRequest {
  id_cuenta_bancaria_empresa: number;
  id_cuenta_bancaria_proveedor: number;
  medio_pago: MedioPago;
  numero_operacion?: string | null;
  fecha_hora_pago: string;
  es_para_detraccion: boolean;
  monto_pagado: number;
  observacion?: string | null;
}

/** Pago al transportista, siempre contra su comprobante de flete. */
export interface RegistrarPagoTransporteRequest {
  id_comprobante_transporte_carbon: number;
  id_cuenta_bancaria_empresa: number;
  id_cuenta_bancaria_transportista: number;
  medio_pago: MedioPago;
  numero_operacion?: string | null;
  fecha_hora_pago: string;
  es_para_detraccion: boolean;
  monto_pagado: number;
  observacion?: string | null;
}

// Mantener compatibilidad con nombre previo
export type CrearCompraCarbonRequest =
  | CrearCompraCarbonPreliminarRequest
  | ConfirmarCompraCarbonRequest;
