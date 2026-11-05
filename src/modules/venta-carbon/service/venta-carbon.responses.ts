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
 * Anticipo del cliente amortizado contra un comprobante.
 *
 * Es el asiento que queda en `transaccion_anticipo_cliente`: dice de que
 * anticipo se desconto el monto y con que respaldo se recibio.
 */
export interface AnticipoAplicadoComprobante {
  id_transaccion: number;
  id_anticipo: number;
  monto_retirado: number;
  medio_pago: string | null;
  numero_operacion: string | null;
  fecha_hora_pago: string | null;
  codigo_comprobante: string | null;
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
