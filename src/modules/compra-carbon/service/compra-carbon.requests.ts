import type { IArchivo } from "../../../shared/interfaces/archivo";

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
  evidencias?: IArchivo[] | null;
  detalles: CrearCompraCarbonDetalle[];
}

/**
 * Edición de una compra (preliminar o confirmada).
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
  evidencias?: IArchivo[] | null;
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

// Mantener compatibilidad con nombre previo
export type CrearCompraCarbonRequest =
  | CrearCompraCarbonPreliminarRequest
  | ConfirmarCompraCarbonRequest;
