import type { EstadoBase } from "../../../shared/enums/_generic/estado-base";
import type { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";
import type { IArchivo } from "../../../shared/interfaces/archivo";
import type { RES_CambiosLog } from "../../../service/responses/_generic/cambios-log";

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
