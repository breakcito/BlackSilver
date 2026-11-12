import type { AsumidoPorAnalisis } from "../../../shared/enums/venta-mineral/asumido-por-analisis";
import type { ElementoQuimicoMineral } from "../../../shared/enums/venta-mineral/elemento-quimico-mineral";
import type { EstadoComprobanteDespacho } from "../../../shared/enums/venta-mineral/estado-comprobante-despacho";
import type { EstadoDespachoMineral } from "../../../shared/enums/venta-mineral/estado-despacho-mineral";
import type { EstadoLiquidacionMineral } from "../../../shared/enums/venta-mineral/estado-liquidacion-mineral";
import type { Moneda } from "../../../shared/enums/_generic/moneda";
import type { MedioPagoDespacho } from "../../../shared/enums/venta-mineral/medio-pago-despacho";
import type { TipoGastoDespacho } from "../../../shared/enums/venta-mineral/tipo-gasto-despacho";
import type { IArchivo } from "../../../shared/interfaces/archivo";

/* ------------------------------------------------------------------ */
/* Despachos                                                          */
/* ------------------------------------------------------------------ */

export interface DespachoMineralResumen {
  id_despacho_mineral: number;
  id_lote_mineral: number | null;
  id_molino: number | null;
  id_empleado_registro: number | null;
  fecha_despacho: string | null;
  cantidad_sacos: number;
  observaciones: string | null;
  estado: EstadoDespachoMineral;
  created_at: string | null;

  lote_codigo: string | null;
  lote_cantidad_sacos: number | null;
  id_labor: number | null;
  labor: string | null;
  labor_prefijo: string | null;
  mina: string | null;
  contratista: string | null;

  molino: string | null;
  empleado_registro: string | null;

  cantidad_fletes: number;
  peso_neto_total: number;
  peso_guia_total: number;
  total_gastos: number;

  total_facturado: number;
  total_neto: number;
  total_pagado: number;
  total_detraccion: number;
  /**
   * Parte en DOLARES de los importes del comprobante de flete.
   *
   * Los agregados de arriba estan siempre en soles (la moneda de
   * referencia): un comprobante en dolares nunca se suma en soles.
   */
  total_facturado_dolares: number;
  total_neto_dolares: number;
  total_pagado_dolares: number;

  total_facturado_molienda: number;
  total_neto_molienda: number;
  total_pagado_molienda: number;

  total_facturado_analisis: number;
  total_neto_analisis: number;
  total_pagado_analisis: number;

  total_facturado_liquidacion: number;
  total_neto_liquidacion: number;
  total_pagado_liquidacion: number;
}

export interface GastoDespachoItem {
  id_gasto_despacho: number;
  id_despacho_mineral: number;
  id_empleado_registro: number | null;
  tipo_gasto: TipoGastoDespacho;
  descripcion: string | null;
  monto: number;
  created_at: string | null;
  empleado_registro: string | null;
}

export interface FleteDespachoItem {
  id_flete_despacho: number;
  id_despacho_mineral: number;
  id_transportista_mineral: number | null;
  id_comprobante_flete_despacho: number | null;
  id_empleado_registro: number | null;
  placa: string | null;
  licencia_conductor: string | null;
  guia_remitente: string | null;
  /** 2da guia de remision: se digita al confirmar la llegada al molino. */
  segunda_guia_remitente: string | null;
  peso_guia: number;
  codigo_ticket_balanza: string | null;
  peso_bruto: number;
  tara: number;
  peso_neto: number;
  fecha_hora_pesaje: string | null;
  largo: number;
  ancho: number;
  alto: number;
  evidencias: IArchivo[] | null;
  created_at: string | null;
  transportista: string | null;
  transportista_ruc: string | null;
  empleado_registro: string | null;
}

export interface PagoDespachoItem {
  id_pago: number;
  id_comprobante: number;
  id_cuenta_bancaria_empresa: number | null;
  id_empleado_registro: number | null;
  medio_pago: MedioPagoDespacho;
  numero_operacion: string | null;
  fecha_hora_pago: string | null;
  es_para_detraccion: boolean;
  observacion: string | null;
  evidencias: IArchivo[] | null;
  monto_pagado: number;
  created_at: string | null;
  empleado_registro: string | null;
  empresa_numero_cuenta: string | null;
  empresa_cci: string | null;
  empresa_banco: string | null;
  empresa_banco_abv: string | null;
}

export interface ComprobanteDespachoItem {
  id_comprobante: number;
  id_despacho_mineral: number;
  id_empleado_registro: number | null;
  codigo_comprobante: string | null;
  fecha_emision: string | null;
  con_detraccion: boolean;
  porcentaje_detraccion: number;
  porcentaje_igv: number;
  subtotal: number;
  igv: number;
  total: number;
  monto_detraccion: number;
  /** Detraccion en soles: siempre se guarda, sea cual sea la moneda. */
  monto_detraccion_soles: number;
  neto_a_pagar: number;
  avance_detraccion: number;
  avance_neto: number;
  evidencias: IArchivo[] | null;
  created_at: string | null;
  estado: EstadoComprobanteDespacho;
  empleado_registro: string | null;
  /** Solo en el comprobante de flete. */
  id_transportista_mineral: number | null;
  toneladas_cobradas: number | null;
  precio_por_tonelada: number | null;
  transportista: string | null;
  /** Moneda del comprobante de flete (solo el flete la define). */
  moneda?: Moneda | null;
  /** Tipo de cambio a soles: 1 cuando la moneda es Soles. */
  tipo_cambio?: number | null;
  /** Solo en el comprobante de liquidación. */
  id_liquidacion_mineral: number | null;
  codigo_liquidacion: string | null;
  cliente: string | null;
  /** `true` cuando el comprobante ya tiene pagos: los importes no se editan. */
  importes_bloqueados?: boolean;
  pagos: PagoDespachoItem[];
  /** Fletes que factura el comprobante de flete. */
  fletes?: FleteDespachoItem[];
  /** Análisis que factura el comprobante de análisis. */
  analisis?: AnalisisLaboratorioItem[];
}

export interface AnalisisLaboratorioItem {
  id_analisis_laboratorio: number;
  id_lote_mineral: number | null;
  id_despacho_mineral: number | null;
  id_comprobante_analisis_despacho: number | null;
  id_laboratorio: number | null;
  id_cliente: number | null;
  id_empleado_registro: number | null;
  asumido_por: AsumidoPorAnalisis;
  codigo_laboratorio: string | null;
  codigo_cliente: string | null;
  fecha_analisis: string | null;
  evidencias: IArchivo[] | null;
  porcentaje_humedad: number;
  ley_oro: number;
  ley_plata: number;
  ley_cobre: number;
  ley_zinc: number;
  ley_arsenico: number;
  ley_hierro: number;
  ley_plomo: number;
  costo_servicio: number;
  created_at: string | null;
  laboratorio: string | null;
  laboratorio_ruc: string | null;
  cliente: string | null;
  empleado_registro: string | null;
}

export interface LiquidacionMineralItem {
  id_liquidacion_mineral: number;
  id_despacho_mineral: number | null;
  id_cliente: number | null;
  id_empleado_registro: number | null;
  codigo_liquidacion: string | null;
  elemento_quimico: ElementoQuimicoMineral;
  fecha_liquidacion: string | null;
  peso_humedo: number;
  tara: number;
  porcentaje_humedad: number;
  peso_seco: number;
  merma: number;
  peso_neto: number;
  ley_elemento: number;
  porcentaje_recuperacion: number;
  /** Total de deducciones de la liquidacion (S/ USD). */
  total_deducciones: number;
  valor_por_tonelada: number;
  porcentaje_igv: number;
  porcentaje_detraccion: number;
  subtotal: number;
  igv: number;
  total: number;
  detraccion: number;
  neto: number;
  observaciones: string | null;
  created_at: string | null;
  estado: EstadoLiquidacionMineral;
  cliente: string | null;
  empleado_registro: string | null;
}

export interface DespachoMineralDetalle extends DespachoMineralResumen {
  gastos: GastoDespachoItem[];
  fletes: FleteDespachoItem[];
  comprobantes_flete: ComprobanteDespachoItem[];
  comprobantes_molienda: ComprobanteDespachoItem[];
  comprobantes_analisis: ComprobanteDespachoItem[];
  comprobantes_liquidacion: ComprobanteDespachoItem[];
  analisis: AnalisisLaboratorioItem[];
  liquidaciones: LiquidacionMineralItem[];
}

/* ------------------------------------------------------------------ */
/* Catalogos                                                          */
/* ------------------------------------------------------------------ */

export interface CatalogoMineral {
  id: number;
  ruc: string | null;
  razon_social: string;
}

export interface LoteMineralDespachable {
  id_lote_mineral: number;
  codigo: string | null;
  cantidad_sacos: number;
  fecha_inicio_produccion: string | null;
  id_labor: number | null;
  labor: string | null;
  labor_prefijo: string | null;
  mina: string | null;
  contratista: string | null;
  created_at: string | null;
}
