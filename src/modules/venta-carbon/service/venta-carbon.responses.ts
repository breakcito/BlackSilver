import type { IArchivo } from "../../../shared/interfaces/archivo";
import type { EstadoCargaVentaCarbon } from "../../../shared/enums/venta-carbon/estado-carga-venta-carbon";
import type { EstadoVentaCarbon } from "../../../shared/enums/venta-carbon/estado-venta-carbon";
import type { EstadoLiquidacionVentaCarbon } from "../../../shared/enums/venta-carbon/estado-liquidacion-venta-carbon";
import type { EstadoComprobanteVentaCarbon } from "../../../shared/enums/venta-carbon/estado-comprobante-venta-carbon";
import type { MedioPagoVentaCarbon } from "../../../shared/enums/venta-carbon/medio-pago-venta-carbon";

export interface AnalisisGranulometria {
  mayor_a_uno: number | null;
  menor_a_uno: number | null;
  un_medio: number | null;
}

export interface CargaVentaCarbonItem {
  id_carga_venta_carbon: number;
  id_venta_carbon: number;
  id_empleado_registro: number;
  empleado_registro: string;

  /** Datos del despacho. */
  /**
   * Lote de carbon que se despacha. La carga cuelga de un blending: el tipo
   * de carbon y el % de ceniza se heredan de el.
   */
  id_blending_carbon: number | null;
  blending_correlativo: string | null;
  blending_porcentaje_ceniza: number | null;
  blending_stock_actual: number | null;
  id_tipo_carbon: number;
  tipo_carbon: string | null;
  tipo_carbon_codigo: string | null;
  id_vehiculo_carbon: number | null;
  vehiculo_placa: string | null;
  vehiculo_tipo: string | null;
  vehiculo_marca: string | null;
  segunda_placa: string | null;
  fecha_hora_salida: string | null;

  /** Datos de la llegada. */
  cantidad_toneladas: number;
  fecha_hora_ingreso: string | null;
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

  /** Importes: se calculan al armar la liquidación. */
  id_liquidacion_venta_carbon: number | null;
  precio_base: number;
  descuento: number;
  bono: number;
  precio_materia_prima: number;
  subtotal: number;
  monto_igv: number;
  total: number;
  monto_detraccion: number;
  neto_a_pagar: number;

  evidencias: IArchivo[];
  estado: EstadoCargaVentaCarbon;
  created_at: string;
}

export interface PagoVentaCarbonItem {
  id_pago_venta_carbon: number;
  id_empleado_registro: number;
  empleado_registro: string | null;
  id_venta_carbon: number;
  id_comprobante_venta_carbon: number;
  /** Cuenta bancaria de la empresa donde ingresa el dinero. */
  id_cuenta_bancaria_empresa: number | null;
  empresa_numero_cuenta: string | null;
  /** CCI de la cuenta bancaria de la empresa que recibe el pago. */
  empresa_cci: string | null;
  empresa_banco: string | null;
  empresa_banco_abv: string | null;
  medio_pago: MedioPagoVentaCarbon | string;
  numero_operacion: string | null;
  fecha_hora_pago: string;
  es_para_detraccion: boolean;
  monto_pagado: number;
  observacion: string | null;
  evidencias: IArchivo[];
  created_at: string;
}

/**
 * Anticipo del cliente aplicado a un comprobante de venta.
 *
 * Cada fila de `transaccion_anticipo_cliente` es el uso de un anticipo
 * (`anticipo_cliente`) en un comprobante, con el monto que se tomo.
 */
export interface TransaccionAnticipoClienteItem {
  id_transaccion: number;
  id_anticipo_cliente: number;
  id_comprobante_venta_carbon?: number | null;
  monto_retirado: number;
  medio_pago: string;
  numero_operacion: string | null;
  fecha_hora_pago: string | null;
  codigo_comprobante: string | null;
  observacion?: string | null;
}

export interface ComprobanteVentaCarbonItem {
  id_comprobante_venta_carbon: number;
  id_empleado_registro: number;
  empleado_registro: string | null;
  id_venta_carbon: number;
  id_liquidacion_venta_carbon: number;
  codigo_comprobante: string;
  fecha_emision: string;
  observacion: string | null;
  evidencias: IArchivo[];
  subtotal: number;
  /** Suma de los anticipos del cliente aplicados a esta factura. */
  monto_pagado_anticipos: number;
  base_imponible: number;
  monto_igv: number;
  importe_total: number;
  monto_detraccion: number;
  monto_neto: number;
  avance_pago_neto: number;
  avance_pago_detraccion: number;
  estado: EstadoComprobanteVentaCarbon | string;
  created_at: string;
  /** Anticipos del cliente amortizados contra este comprobante. */
  anticipos_aplicados: AnticipoAplicadoComprobante[];
  pagos: PagoVentaCarbonItem[];
  /** Anticipos del cliente aplicados a este comprobante. */
  anticipos_utilizados: TransaccionAnticipoClienteItem[];
}

export interface LiquidacionVentaCarbonItem {
  id_liquidacion_venta_carbon: number;
  id_venta_carbon: number;
  id_empleado_registro: number;
  empleado_registro: string | null;
  id_empleado_confirmacion: number | null;
  empleado_confirmacion: string | null;
  id_tipo_carbon: number;
  tipo_carbon: string | null;
  tipo_carbon_codigo: string | null;
  /** Código de la orden de compra que da el cliente. */
  codigo_orden_compra: string | null;
  numero_reporte: string | null;
  fecha_aprobacion: string | null;
  version: string | null;
  evidencias: IArchivo[];
  subtotal: number;
  monto_igv: number;
  total: number;
  monto_detraccion: number;
  neto_a_pagar: number;
  esta_confirmado: boolean;
  estado: EstadoLiquidacionVentaCarbon | string;
  fecha_hora_confirmacion: string | null;
  created_at: string;
  /** Cargas que componen la liquidación. */
  cargas: CargaVentaCarbonItem[];
  /** Comprobante emitido por esta liquidación (a lo sumo uno). */
  comprobante: ComprobanteVentaCarbonItem | null;
}

export interface VentaCarbonResumen {
  id_venta_carbon: number;
  correlativo: string;
  numero_correlativo: number;

  id_empresa: number;
  empresa: string;
  empresa_ruc: string | null;

  id_cliente: number;
  cliente: string | null;
  cliente_ruc: string | null;

  id_cliente_destino: number;
  cliente_destino: string | null;
  cliente_destino_ruc: string | null;
  cliente_destino_dni: string | null;

  id_almacen_empresa_salida: number;
  almacen_empresa_salida: string | null;

  id_almacen_cliente_llegada: number;
  almacen_cliente_llegada: string | null;

  id_empleado_registro: number;
  empleado_registro: string | null;
  created_at: string;

  /** Porcentajes de la venta: se aplican a los importes de las liquidaciones. */
  porcentaje_igv: number;
  porcentaje_detraccion: number;

  cantidad_cargas: number;
  cantidad_cargas_confirmadas: number;
  /** Numero de liquidaciones de la venta (contador del listado). */
  cantidad_liquidaciones: number;
  total_toneladas: number;
  total_toneladas_confirmadas: number;
  total_subtotal: number;
  total_total: number;

  estado: EstadoVentaCarbon;
  cargas: CargaVentaCarbonItem[];
  liquidaciones: LiquidacionVentaCarbonItem[];
}

/**
 * Blending que se puede despachar desde un almacen.
 *
 * `disponible` ya descuenta lo que salio y sigue en camino.
 */
export interface BlendingDespachable {
  id_blending_carbon: number;
  correlativo: string;
  id_almacen: number;
  id_tipo_carbon: number;
  tipo_carbon_nombre: string | null;
  tipo_carbon_codigo: string | null;
  porcentaje_ceniza: number;
  stock_actual: number;
  fecha_hora_blending: string;
  /** Toneladas comprometidas en cargas que aun no confirman su llegada. */
  comprometido: number;
  disponible: number;
}

/**
 * Analisis granulometrico de una carga.
 *
 * Viene del JSON de `carga_venta_carbon.analisis_granulometria` y solo se
 * llena cuando el tipo de carbon es "Tipo A".
 */
export interface AnalisisGranulometriaFila {
  mayor_a_uno: number | null;
  menor_a_uno: number | null;
  un_medio: number | null;
}

/**
 * Una fila del reporte "Registro de Ventas".
 *
 * Es una carga de carbon con sus importes, la liquidacion que la respalda y
 * el PRIMER pago que NO es para detraccion (el del neto).
 */
export interface RES_FilaControlVentas {
  id_carga_venta_carbon: number;
  fecha_hora_ingreso: string;
  codigo_ticket_balanza: string | null;
  /** Segunda placa (carreta): solo cuando el vehiculo es Tolva. */
  segunda_placa: string | null;
  guia_remitente: string | null;
  guia_transportista: string | null;
  cantidad_toneladas: number;
  porcentaje_ceniza: number | null;
  porcentaje_humedad: number | null;
  porcentaje_azufre: number | null;
  porcentaje_pizarra: number | null;
  analisis_granulometria: AnalisisGranulometriaFila | null;
  precio_base: number;
  descuento: number;
  bono: number;
  precio_materia_prima: number;
  subtotal: number;
  monto_igv: number;
  total: number;
  neto_a_pagar: number;
  observacion: string | null;
  estado: string;
  tipo_carbon_nombre: string | null;
  tipo_carbon_codigo: string | null;
  /** Primera placa: la del vehiculo con el que salio la carga. */
  placa: string | null;
  almacen_cliente_llegada: string | null;
  /** Cliente destino: a donde llega realmente el carbon. */
  cliente_destino: string | null;
  cliente_destino_ruc: string | null;
  cliente_destino_dni: string | null;
  porcentaje_igv: number;
  porcentaje_detraccion: number;
  /** Empresa que emite la venta: manda el logo del reporte. */
  id_empresa: number;
  /** Orden de compra de la liquidacion de la carga. */
  codigo_orden_compra: string | null;
  /** Numero de reporte (transporte) de la liquidacion de la carga. */
  numero_reporte: string | null;
  /** Comprobante (factura) de la liquidacion de la carga. */
  comprobante_codigo: string | null;
  comprobante_fecha_emision: string | null;
  comprobante_estado: string | null;
  /** Primer pago que NO es para detraccion (el del neto). */
  pago_fecha_hora: string | null;
  pago_numero_operacion: string | null;
  pago_medio: string | null;
  pago_numero_cuenta: string | null;
  pago_banco: string | null;
}

/** Reporte "Registro de Ventas" de un año. */
export interface RES_ReporteControlVentas {
  anio: number;
  cargas: RES_FilaControlVentas[];
}
